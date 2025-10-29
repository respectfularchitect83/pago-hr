import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { connectDB } from './src/config/db';
import logger, { requestLogger } from './src/utils/logger';
import { register } from './src/utils/prometheusRegistry';
import authRoutes from './src/routes/auth';
import employeeRoutes from './src/routes/employees';
import payslipRoutes from './src/routes/payslips';
import leaveRoutes from './src/routes/leave';
import userRoutes from './src/routes/users';

config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

app.use(express.json());
app.use(requestLogger);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/leave', leaveRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', { error: err, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
