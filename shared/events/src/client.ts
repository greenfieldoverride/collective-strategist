import { createClient, RedisClientType } from 'redis';
import { 
  CollectiveStrategistEvent, 
  StreamName, 
  EventType, 
  createEvent,
  createUserRegisteredEvent,
  createFileUploadedEvent,
  createEmbeddingGenerationRequestedEvent,
  createAIContentGenerationRequestedEvent,
  STREAMS 
} from './index';
import { ulid } from 'ulid';

export interface EventClientConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export class EventClient {
  private client: RedisClientType;
  private isConnected = false;

  constructor(config: EventClientConfig) {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db || 0,
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async publish<T extends CollectiveStrategistEvent>(event: T): Promise<string> {
    this.ensureConnected();
    
    const fields = {
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

    return await this.client.xAdd(event.stream, '*', fields);
  }

  // Convenience methods for common events

  async publishUserRegistered(data: {
    user_id: string;
    email: string;
    tier: 'sovereign_circle' | 'individual_pro';
    referral_source?: string;
    correlation_id?: string;
  }): Promise<string> {
    const event = createUserRegisteredEvent(data);
    return this.publish(event);
  }

  async publishFileUploaded(data: {
    file_id: string;
    user_id: string;
    contextual_core_id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    is_browser_viewable: boolean;
    correlation_id?: string;
  }): Promise<string> {
    const event = createFileUploadedEvent(data);
    return this.publish(event);
  }

  async publishFileProcessingStarted(data: {
    file_id: string;
    processing_type: 'text_extraction' | 'embedding_generation' | 'metadata_analysis';
    estimated_duration_ms: number;
    user_id?: string;
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.CONTEXTUAL,
      type: 'file.processing.started' as const,
      version: 1,
      user_id: data.user_id,
      correlation_id: data.correlation_id,
      data: {
        file_id: data.file_id,
        processing_type: data.processing_type,
        estimated_duration_ms: data.estimated_duration_ms,
      },
    });
    return this.publish(event);
  }

  async publishFileProcessingCompleted(data: {
    file_id: string;
    processing_type: string;
    processing_time_ms: number;
    extracted_text_length?: number;
    embedding_model_used?: string;
    success: boolean;
    error?: string;
    user_id?: string;
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.CONTEXTUAL,
      type: 'file.processing.completed' as const,
      version: 1,
      user_id: data.user_id,
      correlation_id: data.correlation_id,
      data: {
        file_id: data.file_id,
        processing_type: data.processing_type,
        processing_time_ms: data.processing_time_ms,
        extracted_text_length: data.extracted_text_length,
        embedding_model_used: data.embedding_model_used,
        success: data.success,
        error: data.error,
      },
    });
    return this.publish(event);
  }

  async publishEmbeddingGenerationRequested(data: {
    text_content: string;
    content_hash: string;
    user_id: string;
    contextual_core_id: string;
    preferred_model?: string;
    priority: 'low' | 'normal' | 'high';
    correlation_id?: string;
  }): Promise<string> {
    const event = createEmbeddingGenerationRequestedEvent(data);
    return this.publish(event);
  }

  async publishEmbeddingGenerationCompleted(data: {
    embedding_id: string;
    content_hash: string;
    model_id: string;
    dimensions: number;
    generation_time_ms: number;
    cost_usd: number;
    quality_score?: number;
    user_id?: string;
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.CONTEXTUAL,
      type: 'embedding.generation.completed' as const,
      version: 1,
      user_id: data.user_id,
      correlation_id: data.correlation_id,
      data: {
        embedding_id: data.embedding_id,
        content_hash: data.content_hash,
        model_id: data.model_id,
        dimensions: data.dimensions,
        generation_time_ms: data.generation_time_ms,
        cost_usd: data.cost_usd,
        quality_score: data.quality_score,
      },
    });
    return this.publish(event);
  }

  async publishAIContentGenerationRequested(data: {
    request_id: string;
    user_id: string;
    contextual_core_id: string;
    content_type: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
    prompt_template: string;
    ai_provider: string;
    max_tokens: number;
    correlation_id?: string;
  }): Promise<string> {
    const event = createAIContentGenerationRequestedEvent(data);
    return this.publish(event);
  }

  async publishAIContentGenerationCompleted(data: {
    request_id: string;
    content_draft_id: string;
    generated_content: string;
    ai_provider: string;
    model_used: string;
    tokens_used: number;
    generation_time_ms: number;
    cost_usd: number;
    user_id?: string;
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.AI,
      type: 'ai.content.generation.completed' as const,
      version: 1,
      user_id: data.user_id,
      correlation_id: data.correlation_id,
      data: {
        request_id: data.request_id,
        content_draft_id: data.content_draft_id,
        generated_content: data.generated_content,
        ai_provider: data.ai_provider,
        model_used: data.model_used,
        tokens_used: data.tokens_used,
        generation_time_ms: data.generation_time_ms,
        cost_usd: data.cost_usd,
      },
    });
    return this.publish(event);
  }

  async publishNotificationRequested(data: {
    user_id: string;
    notification_type: 'briefing_ready' | 'system_alert' | 'content_suggestion';
    channels: ('email' | 'push' | 'websocket')[];
    message: {
      title: string;
      body: string;
      action_url?: string;
    };
    priority: 'low' | 'normal' | 'high' | 'critical';
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.NOTIFICATION,
      type: 'notification.send.requested' as const,
      version: 1,
      user_id: data.user_id,
      correlation_id: data.correlation_id,
      data: {
        user_id: data.user_id,
        notification_type: data.notification_type,
        channels: data.channels,
        message: data.message,
        priority: data.priority,
      },
    });
    return this.publish(event);
  }

  async publishSystemError(data: {
    service_name: string;
    error_type: string;
    error_message: string;
    stack_trace: string;
    user_id?: string;
    request_id?: string;
    requires_immediate_attention: boolean;
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.SYSTEM,
      type: 'system.error.critical' as const,
      version: 1,
      user_id: data.user_id,
      correlation_id: data.correlation_id,
      data: {
        service_name: data.service_name,
        error_type: data.error_type,
        error_message: data.error_message,
        stack_trace: data.stack_trace,
        user_id: data.user_id,
        request_id: data.request_id,
        requires_immediate_attention: data.requires_immediate_attention,
      },
    });
    return this.publish(event);
  }

  async publishServiceHealth(data: {
    service_name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    response_time_ms: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
    error_rate: number;
    correlation_id?: string;
  }): Promise<string> {
    const event = createEvent({
      stream: STREAMS.SYSTEM,
      type: 'system.service.health' as const,
      version: 1,
      correlation_id: data.correlation_id,
      data: {
        service_name: data.service_name,
        status: data.status,
        response_time_ms: data.response_time_ms,
        memory_usage_mb: data.memory_usage_mb,
        cpu_usage_percent: data.cpu_usage_percent,
        error_rate: data.error_rate,
      },
    });
    return this.publish(event);
  }

  // Utility methods
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

      const consumerGroup = `wait-${ulid()}`;
      const consumerName = `waiter-${ulid()}`;

      // This is a simplified version - in practice, you'd want to use the full EventBus
      const pollForEvent = async () => {
        try {
          const messages = await this.client.xReadGroup(
            consumerGroup,
            consumerName,
            [{ key: stream, id: '>' }],
            { COUNT: 1, BLOCK: 1000 }
          );

          if (messages && messages.length > 0) {
            for (const streamMessages of messages) {
              for (const message of streamMessages.messages) {
                const fields = message.message;
                if (fields.type === eventType && fields.correlation_id === correlationId) {
                  clearTimeout(timeout);
                  
                  const event = {
                    id: fields.id,
                    stream: fields.stream as StreamName,
                    type: fields.type,
                    version: parseInt(fields.version),
                    timestamp: new Date(fields.timestamp),
                    correlation_id: fields.correlation_id || undefined,
                    user_id: fields.user_id || undefined,
                    data: JSON.parse(fields.data),
                    metadata: JSON.parse(fields.metadata || '{}'),
                  } as T;

                  resolve(event);
                  return;
                }
              }
            }
          }

          // Continue polling
          setImmediate(pollForEvent);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      // Create consumer group and start polling
      this.client.xGroupCreate(stream, consumerGroup, '0', { MKSTREAM: true })
        .then(() => pollForEvent())
        .catch(() => pollForEvent()); // Group might already exist
    });
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('EventClient is not connected. Call connect() first.');
    }
  }
}