import { EventEmitter } from 'events';
import { IEventBus } from './event-bus.interface';
import { logger } from '../../infrastructure/observability/logger';

export const INTERNAL_EVENTS = {
  POST_UPDATED: 'post:updated',
  NOTIFICATION_CREATED: 'notification:created',
  // Phase 6A: Intelligence Events
  WORKFLOW_RISK_DETECTED: 'workflow:riskDetected',
  ASSIGNMENT_RECOMMENDED: 'assignment:recommended',
  ANOMALY_DETECTED: 'anomaly:detected',
} as const;

/**
 * Local implementation of the IEventBus.
 * Used for development or single-node deployments.
 */
class NodeEventEmitterAdapter implements IEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Increase limit for intelligence and metric listeners
    this.emitter.setMaxListeners(20);
  }

  emit(event: string, payload: any): void {
    logger.debug({ event, payload: !!payload }, 'Emitting internal event');
    this.emitter.emit(event, payload);
  }

  subscribe(event: string, handler: (payload: any) => void): void {
    this.emitter.on(event, handler);
  }

  unsubscribe(event: string, handler: (payload: any) => void): void {
    this.emitter.off(event, handler);
  }
}

// Export a singleton adapter instance adhering to the IEventBus interface.
export const eventBus: IEventBus = new NodeEventEmitterAdapter();
