/**
 * Distributed Event Bus Abstraction.
 * 
 * Crucial scaling strategy:
 * As we introduce workers, queues, and multiple Node processes, in-memory 
 * EventEmitters become a bottleneck (events fired on Node 1 aren't seen by Node 2).
 * 
 * This interface allows us to seamlessly swap out the local Node EventEmitter
 * for a distributed message broker (Redis Streams, RabbitMQ, Kafka) later 
 * without rewriting business logic.
 */
export interface IEventBus {
  emit(event: string, payload: any): void;
  subscribe(event: string, handler: (payload: any) => void): void;
  unsubscribe(event: string, handler: (payload: any) => void): void;
}
