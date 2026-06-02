import pino from 'pino';
import { config } from '../../config/env.config';

/**
 * High-performance structured JSON logger for distributed observability.
 * Prepares the application for OpenTelemetry / Datadog / ELK ingestion.
 */
export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: config.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
});
