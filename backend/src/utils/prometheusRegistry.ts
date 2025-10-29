import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Enable the default metrics
promClient.collectDefaultMetrics({ register });

export { register };