import { createClient, RedisClientType } from 'redis';
import { CollectiveStrategistEvent, StreamName, EventType, EVENT_SCHEMAS, BaseEvent } from '../shared-events/index';
import { ulid } from 'ulid';
import pino from 'pino';

export interface EventBusConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  streams: {
    maxRetries: number;
    retryDelayMs: number;
    maxLength: number;
    trimStrategy: 'MAXLEN' | 'MINID';
  };
  consumers: {
    groupPrefix: string;
    blockTimeMs: number;
    claimIdleTimeMs: number;
  };
}

export interface EventPublishOptions {
  maxLength?: number;
  trimStrategy?: 'MAXLEN' | 'MINID';
}

export interface EventSubscriptionOptions {
  consumerGroup: string;
  consumerName: string;
  blockTimeMs?: number;
  count?: number;
  startId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

export class EventBus {
  private client: RedisClientType;
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private logger: pino.Logger;
  private config: EventBusConfig;
  private isConnected = false;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private consumerGroups = new Map<string, Set<string>>();

  constructor(config: EventBusConfig) {
    this.config = config;
    this.logger = pino({ name: 'event-bus' });
    
    const redisConfig = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db || 0,
    };

    this.client = createClient(redisConfig);
    this.publisher = createClient(redisConfig);
    this.subscriber = createClient(redisConfig);
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect(),
      ]);
      
      this.isConnected = true;
      this.logger.info('Event bus connected to Redis');
      
      // Initialize default consumer groups
      await this.initializeConsumerGroups();
      
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await Promise.all([
        this.client.disconnect(),
        this.publisher.disconnect(),
        this.subscriber.disconnect(),
      ]);
      
      this.isConnected = false;
      this.logger.info('Event bus disconnected from Redis');
    }
  }

  async publish<T extends CollectiveStrategistEvent>(
    event: T,
    options: EventPublishOptions = {}
  ): Promise<string> {
    this.ensureConnected();
    
    try {
      // Validate event against schema
      const schema = EVENT_SCHEMAS[event.type as EventType];
      if (!schema) {
        throw new Error(`Unknown event type: ${event.type}`);
      }
      
      const validatedEvent = schema.parse(event);
      
      // Prepare Redis fields
      const fields = this.eventToRedisFields(validatedEvent);
      
      // Publish to stream
      const messageId = await this.publisher.xAdd(
        event.stream,
        '*',
        fields as any,
        {
          MAXLEN: options.maxLength || this.config.streams.maxLength,
        }
      );
      
      this.logger.info(`Published event ${event.type} to ${event.stream}`, {
        eventId: event.id,
        messageId,
        correlationId: event.correlation_id,
      });
      
      return messageId;
      
    } catch (error) {
      this.logger.error('Failed to publish event', {
        eventType: event.type,
        stream: event.stream,
        error,
      });
      throw error;
    }
  }

  async subscribe<T extends CollectiveStrategistEvent>(
    stream: StreamName,
    eventType: EventType | EventType[],
    handler: EventHandler<T>,
    options: EventSubscriptionOptions
  ): Promise<void> {
    this.ensureConnected();
    
    try {
      // Create consumer group if it doesn't exist
      await this.ensureConsumerGroup(stream, options.consumerGroup);
      
      // Register handler
      const handlerKey = `${stream}:${Array.isArray(eventType) ? eventType.join(',') : eventType}`;
      if (!this.eventHandlers.has(handlerKey)) {
        this.eventHandlers.set(handlerKey, new Set());
      }
      this.eventHandlers.get(handlerKey)!.add(handler as EventHandler);
      
      // Start consuming
      this.startConsumer(stream, eventType, options);
      
    } catch (error) {
      this.logger.error('Failed to subscribe to events', {
        stream,
        eventType,
        error,
      });
      throw error;
    }
  }

  async waitForEvent<T extends CollectiveStrategistEvent>(
    stream: StreamName,
    eventType: EventType,
    correlationId: string,
    timeoutMs: number = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for event ${eventType} with correlation ID ${correlationId}`));
      }, timeoutMs);

      const handler: EventHandler<T> = async (event: T) => {
        if (event.correlation_id === correlationId) {
          clearTimeout(timeout);
          resolve(event);
          return true; // Remove handler after processing
        }
        return false; // Keep handler for other events
      };

      this.subscribe(stream, eventType, handler, {
        consumerGroup: `wait-${ulid()}`,
        consumerName: `waiter-${ulid()}`,
      }).catch(reject);
    });
  }

  async republishDeadLetters(
    stream: StreamName,
    consumerGroup: string,
    maxAge: number = 3600000 // 1 hour
  ): Promise<number> {
    this.ensureConnected();
    
    try {
      // Get pending messages older than maxAge
      const pendingInfo = await this.client.xPending(stream, consumerGroup);
      
      let republishedCount = 0;
      
      if (!pendingInfo || !Array.isArray(pendingInfo)) {
        return 0;
      }
      
      for (const pending of pendingInfo as any[]) {
        try {
          // For now, skip dead letter republishing - would need more complex Redis API handling
          // This is a placeholder for future implementation
          republishedCount = 0;
        } catch (error) {
          this.logger.error('Failed to republish dead letter', {
            stream,
            messageId: pending.id,
            error,
          });
        }
      }
      
      this.logger.info(`Republished ${republishedCount} dead letters from ${stream}`);
      return republishedCount;
      
    } catch (error) {
      this.logger.error('Failed to republish dead letters', { stream, consumerGroup, error });
      throw error;
    }
  }

  async getStreamInfo(stream: StreamName): Promise<any> {
    this.ensureConnected();
    return this.client.xInfoStream(stream);
  }

  async getConsumerGroupInfo(stream: StreamName): Promise<any> {
    this.ensureConnected();
    return this.client.xInfoGroups(stream);
  }

  private async initializeConsumerGroups(): Promise<void> {
    const streams = [
      'user.events',
      'content.events', 
      'contextual.events',
      'market.events',
      'ai.events',
      'notification.events',
      'system.events',
    ];
    
    for (const stream of streams) {
      await this.ensureConsumerGroup(stream, `${this.config.consumers.groupPrefix}-${stream}`);
    }
  }

  private async ensureConsumerGroup(stream: StreamName, groupName: string): Promise<void> {
    try {
      await this.client.xGroupCreate(stream, groupName, '0', { MKSTREAM: true });
      this.logger.debug(`Created consumer group ${groupName} for stream ${stream}`);
    } catch (error: any) {
      if (error.message?.includes('BUSYGROUP')) {
        // Group already exists, this is fine
        this.logger.debug(`Consumer group ${groupName} already exists for stream ${stream}`);
      } else {
        throw error;
      }
    }
  }

  private async startConsumer(
    stream: StreamName,
    eventType: EventType | EventType[],
    options: EventSubscriptionOptions
  ): Promise<void> {
    const { consumerGroup, consumerName, blockTimeMs = 1000, count = 10 } = options;
    
    // Start consuming in background
    setImmediate(async () => {
      while (this.isConnected) {
        try {
          const messages = await this.subscriber.xReadGroup(
            consumerGroup,
            consumerName,
            [{ key: stream, id: '>' }],
            { COUNT: count, BLOCK: blockTimeMs }
          );
          
          if (messages && messages.length > 0) {
            for (const streamMessages of messages) {
              for (const message of streamMessages.messages) {
                await this.processMessage(stream, eventType, message, consumerGroup);
              }
            }
          }
        } catch (error) {
          this.logger.error('Error reading from stream', { stream, consumerGroup, error });
          // Brief pause before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    });
  }

  private async processMessage(
    stream: StreamName,
    eventType: EventType | EventType[],
    message: any,
    consumerGroup: string
  ): Promise<void> {
    try {
      // Convert Redis message to event
      const event = this.redisFieldsToEvent(message.message);
      
      // Check if this is the event type we're looking for
      const targetTypes = Array.isArray(eventType) ? eventType : [eventType];
      if (!targetTypes.includes(event.type as EventType)) {
        await this.client.xAck(stream, consumerGroup, message.id);
        return;
      }
      
      // Find and execute handlers
      const handlerKey = `${stream}:${Array.isArray(eventType) ? eventType.join(',') : eventType}`;
      const handlers = this.eventHandlers.get(handlerKey);
      
      if (handlers && handlers.size > 0) {
        for (const handler of handlers) {
          try {
            const shouldRemove = await handler(event as any);
            if (shouldRemove) {
              handlers.delete(handler);
            }
          } catch (error) {
            this.logger.error('Handler error', {
              stream,
              eventType: event.type,
              messageId: message.id,
              error,
            });
          }
        }
      }
      
      // Acknowledge message
      await this.client.xAck(stream, consumerGroup, message.id);
      
    } catch (error) {
      this.logger.error('Failed to process message', {
        stream,
        messageId: message.id,
        error,
      });
      // Don't acknowledge failed messages - they'll be retried
    }
  }

  private eventToRedisFields(event: CollectiveStrategistEvent): Record<string, string> {
    return {
      id: event.id,
      stream: event.stream,
      type: event.type,
      version: event.version.toString(),
      timestamp: event.timestamp.toISOString(),
      correlation_id: event.correlation_id || '',
      user_id: event.user_id || '',
      data: JSON.stringify(event.data),
      metadata: JSON.stringify(event.metadata || {}),
    };
  }

  private redisFieldsToEvent(fields: Record<string, string>): CollectiveStrategistEvent {
    return {
      id: fields.id,
      stream: fields.stream as StreamName,
      type: fields.type,
      version: parseInt(fields.version),
      timestamp: new Date(fields.timestamp),
      correlation_id: fields.correlation_id || undefined,
      user_id: fields.user_id || undefined,
      data: JSON.parse(fields.data),
      metadata: JSON.parse(fields.metadata || '{}'),
    } as CollectiveStrategistEvent;
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Event bus is not connected. Call connect() first.');
    }
  }
}

export type EventHandler<T extends CollectiveStrategistEvent = CollectiveStrategistEvent> = (
  event: T
) => Promise<boolean | void>; // Return true to remove handler, false/void to keep it