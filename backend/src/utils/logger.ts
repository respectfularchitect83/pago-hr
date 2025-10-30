import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

// Initialize Better Stack (Logtail) logging
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN || 'default_token');

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console logging for all environments (Vercel compatible)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Better Stack (Logtail) transport for cloud logging
    new LogtailTransport(logtail)
  ]
});

// Add request context
export const requestLogger = (req: any, res: any, next: any) => {
  req.logger = logger.child({
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
};

export default logger;