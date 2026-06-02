import { Redis } from 'ioredis';
import { logger } from '../observability/logger';
import { config } from '../../config/env.config';

/**
 * Singleton Redis connection manager with Graceful Degradation logic.
 * 
 * If Redis fails:
 * - Websockets will fallback to single-node (or degrade gracefully)
 * - BullMQ will pause and retry
 * - Cache lookups will fail open (fallback to DB)
 */

export const redisClient = new Redis(config.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: true,
  retryStrategy(times) {
    // Exponential backoff with a cap of 10 seconds
    const delay = Math.min(times * 50, 10000);
    logger.warn({ attempt: times, delayMs: delay }, 'Reconnecting to Redis...');
    return delay;
  },
});

export const redisSubClient = redisClient.duplicate(); // Needed for Socket.io adapter / PubSub

redisClient.on('connect', () => logger.info('✅ Redis Connected'));
redisClient.on('error', (err) => logger.error({ err }, '❌ Redis Connection Error'));
redisClient.on('ready', () => logger.info('✅ Redis Ready for operations'));

// Graceful Degradation check
export const isRedisHealthy = (): boolean => {
  return redisClient.status === 'ready';
};
