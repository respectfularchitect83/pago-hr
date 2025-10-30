import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

// Initialize Better Stack (Logtail) logging only when token is provided
const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
const logtail = logtailToken ? new Logtail(logtailToken) : null;

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
    // Better Stack (Logtail) transport for cloud logging (enabled only if token is set)
    ...(logtail ? [new LogtailTransport(logtail)] : [])
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