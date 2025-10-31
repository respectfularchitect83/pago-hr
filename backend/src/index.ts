import * as Sentry from '@sentry/node';
// import { expressIntegration } from '@sentry/node';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { connectDB } from './config/db';
import logger, { requestLogger } from './utils/logger';
import { register } from './utils/prometheusRegistry';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import payslipRoutes from './routes/payslips';
import leaveRoutes from './routes/leave';
import companyRoutes from './routes/company';
import messageRoutes from './routes/messages';
import tenantRoutes from './routes/tenants';
import userRoutes from './routes/users';
import { tenantResolver } from './middleware/tenant';
import ensureLatestSchema from './db/ensureLatestSchema';

// Load environment variables
config();


const app = express();


// CORS setup for deployed frontend (fixes preflight and uses env var)
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Explicitly handle preflight OPTIONS requests for all routes (Express 5 fix)
app.options('/', cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
  // ProfilingIntegration removed for now
  // expressIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
// Sentry request and tracing handlers are not available in this SDK version; use error handler if needed
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '10mb' }));
app.use(requestLogger);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/tenants', tenantRoutes);
app.use('/api', tenantResolver);

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/messages', messageRoutes);
// Add Sentry error handler if needed, or use expressErrorHandler/setupExpressErrorHandler if available
// If you want to capture errors, use:
// import { expressErrorHandler } from '@sentry/node';
// app.use(expressErrorHandler());
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', { error: err, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});
async function startServer() {
  try {
    await connectDB();
    await ensureLatestSchema();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();