import { eventBus, INTERNAL_EVENTS } from './internal.emitter';
import { operationalQueue } from '../../jobs/queues.config';
import { logger } from '../../infrastructure/observability/logger';

export const startEventBridge = () => {
  // Listen to post updates and throttle/dedupe SLA risk evaluations
  eventBus.subscribe(INTERNAL_EVENTS.POST_UPDATED, async (payload: any) => {
    try {
      // JobId based on postId to deduplicate rapid back-to-back updates
      // This throttles SLA update storms in BullMQ.
      await operationalQueue.add('score-sla', {
        postId: payload.postId
      }, {
        jobId: `sla-check-${payload.postId}`,
        delay: 5000 // Throttled 5-second debounce. BullMQ drops it if a delayed job with same ID exists.
      });
    } catch (err) {
      logger.error({ err }, 'Failed to bridge POST_UPDATED to operational queue');
    }
  });

  // Example: bridging POST_CREATED to recommend assignment or generate initial summary, etc.
};
