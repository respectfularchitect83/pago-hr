import { Counter, Histogram } from 'prom-client';
import { register } from './metrics';

// Request counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status']
});

// Response time histogram
export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

// Error counter
export const errorCounter = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type']
});

// Active users gauge (implement in authentication system)
export const activeUsersGauge = new Counter({
  name: 'active_users',
  help: 'Number of active users'
});

// Register metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationMs);
register.registerMetric(errorCounter);
register.registerMetric(activeUsersGauge);