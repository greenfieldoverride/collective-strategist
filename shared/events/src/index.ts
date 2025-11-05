import { z } from 'zod';
import { ulid } from 'ulid';

// Base Event Schema
export const BaseEventSchema = z.object({
  id: z.string(),
  stream: z.string(),
  type: z.string(),
  version: z.number().default(1),
  timestamp: z.date(),
  correlation_id: z.string().optional(),
  user_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

// Stream Names
export const STREAMS = {
  USER: 'user.events',
  CONTENT: 'content.events',
  CONTEXTUAL: 'contextual.events',
  MARKET: 'market.events',
  AI: 'ai.events',
  NOTIFICATION: 'notification.events',
  SYSTEM: 'system.events',
} as const;

export type StreamName = typeof STREAMS[keyof typeof STREAMS];

// User Events
export const UserRegisteredEventSchema = BaseEventSchema.extend({
  type: z.literal('user.registered'),
  stream: z.literal(STREAMS.USER),
  data: z.object({
    user_id: z.string().uuid(),
    email: z.string().email(),
    tier: z.enum(['sovereign_circle', 'individual_pro']),
    referral_source: z.string().optional(),
  }),
});

export const UserLoginEventSchema = BaseEventSchema.extend({
  type: z.literal('user.login'),
  stream: z.literal(STREAMS.USER),
  data: z.object({
    user_id: z.string().uuid(),
    ip_address: z.string(),
    user_agent: z.string(),
    success: z.boolean(),
  }),
});

export const UserPreferencesUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('user.preferences.updated'),
  stream: z.literal(STREAMS.USER),
  data: z.object({
    user_id: z.string().uuid(),
    changed_fields: z.array(z.string()),
    old_values: z.record(z.any()),
    new_values: z.record(z.any()),
  }),
});

// Contextual Events
export const FileUploadedEventSchema = BaseEventSchema.extend({
  type: z.literal('file.uploaded'),
  stream: z.literal(STREAMS.CONTEXTUAL),
  data: z.object({
    file_id: z.string().uuid(),
    user_id: z.string().uuid(),
    contextual_core_id: z.string().uuid(),
    filename: z.string(),
    file_size: z.number(),
    mime_type: z.string(),
    is_browser_viewable: z.boolean(),
  }),
});

export const FileProcessingStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('file.processing.started'),
  stream: z.literal(STREAMS.CONTEXTUAL),
  data: z.object({
    file_id: z.string().uuid(),
    processing_type: z.enum(['text_extraction', 'embedding_generation', 'metadata_analysis']),
    estimated_duration_ms: z.number(),
  }),
});

export const FileProcessingCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('file.processing.completed'),
  stream: z.literal(STREAMS.CONTEXTUAL),
  data: z.object({
    file_id: z.string().uuid(),
    processing_type: z.string(),
    processing_time_ms: z.number(),
    extracted_text_length: z.number().optional(),
    embedding_model_used: z.string().optional(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
});

export const EmbeddingGenerationRequestedEventSchema = BaseEventSchema.extend({
  type: z.literal('embedding.generation.requested'),
  stream: z.literal(STREAMS.CONTEXTUAL),
  data: z.object({
    text_content: z.string(),
    content_hash: z.string(),
    user_id: z.string().uuid(),
    contextual_core_id: z.string().uuid(),
    preferred_model: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']),
  }),
});

export const EmbeddingGenerationCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('embedding.generation.completed'),
  stream: z.literal(STREAMS.CONTEXTUAL),
  data: z.object({
    embedding_id: z.string().uuid(),
    content_hash: z.string(),
    model_id: z.string().uuid(),
    dimensions: z.number(),
    generation_time_ms: z.number(),
    cost_usd: z.number(),
    quality_score: z.number().optional(),
  }),
});

// AI Events
export const AIContentGenerationRequestedEventSchema = BaseEventSchema.extend({
  type: z.literal('ai.content.generation.requested'),
  stream: z.literal(STREAMS.AI),
  data: z.object({
    request_id: z.string().uuid(),
    user_id: z.string().uuid(),
    contextual_core_id: z.string().uuid(),
    content_type: z.enum(['social_post', 'blog_article', 'marketing_copy', 'email']),
    prompt_template: z.string(),
    ai_provider: z.string(),
    max_tokens: z.number(),
  }),
});

export const AIContentGenerationCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('ai.content.generation.completed'),
  stream: z.literal(STREAMS.AI),
  data: z.object({
    request_id: z.string().uuid(),
    content_draft_id: z.string().uuid(),
    generated_content: z.string(),
    ai_provider: z.string(),
    model_used: z.string(),
    tokens_used: z.number(),
    generation_time_ms: z.number(),
    cost_usd: z.number(),
  }),
});

export const AIConsultationRequestedEventSchema = BaseEventSchema.extend({
  type: z.literal('ai.consultation.requested'),
  stream: z.literal(STREAMS.AI),
  data: z.object({
    session_id: z.string().uuid(),
    user_id: z.string().uuid(),
    contextual_core_id: z.string().uuid(),
    query: z.string(),
    session_type: z.enum(['strategic_advice', 'trend_analysis', 'goal_planning']),
  }),
});

export const AIConsultationCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('ai.consultation.completed'),
  stream: z.literal(STREAMS.AI),
  data: z.object({
    session_id: z.string().uuid(),
    response: z.string(),
    confidence_score: z.number(),
    market_data_referenced: z.array(z.string().uuid()),
    ai_provider: z.string(),
    tokens_used: z.number(),
  }),
});

// Market Events
export const MarketDataCollectionStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('market.data.collection.started'),
  stream: z.literal(STREAMS.MARKET),
  data: z.object({
    collection_id: z.string().uuid(),
    data_source: z.enum(['reddit', 'google_trends', 'rss_feeds']),
    keywords: z.array(z.string()),
    user_ids: z.array(z.string().uuid()),
  }),
});

export const MarketDataCollectedEventSchema = BaseEventSchema.extend({
  type: z.literal('market.data.collected'),
  stream: z.literal(STREAMS.MARKET),
  data: z.object({
    collection_id: z.string().uuid(),
    data_source: z.string(),
    data_type: z.enum(['engagement', 'trend', 'competitor_activity']),
    records_collected: z.number(),
    collection_time_ms: z.number(),
    data_quality_score: z.number(),
  }),
});

export const MarketTrendDetectedEventSchema = BaseEventSchema.extend({
  type: z.literal('market.trend.detected'),
  stream: z.literal(STREAMS.MARKET),
  data: z.object({
    trend_id: z.string().uuid(),
    trend_type: z.enum(['rising', 'declining', 'stable']),
    keywords: z.array(z.string()),
    confidence_score: z.number(),
    affected_users: z.array(z.string().uuid()),
    trend_data: z.record(z.any()),
  }),
});

// Notification Events
export const NotificationSendRequestedEventSchema = BaseEventSchema.extend({
  type: z.literal('notification.send.requested'),
  stream: z.literal(STREAMS.NOTIFICATION),
  data: z.object({
    user_id: z.string().uuid(),
    notification_type: z.enum(['briefing_ready', 'system_alert', 'content_suggestion']),
    channels: z.array(z.enum(['email', 'push', 'websocket'])),
    message: z.object({
      title: z.string(),
      body: z.string(),
      action_url: z.string().optional(),
    }),
    priority: z.enum(['low', 'normal', 'high', 'critical']),
  }),
});

export const NotificationDeliveredEventSchema = BaseEventSchema.extend({
  type: z.literal('notification.delivered'),
  stream: z.literal(STREAMS.NOTIFICATION),
  data: z.object({
    notification_id: z.string().uuid(),
    user_id: z.string().uuid(),
    channel: z.string(),
    delivery_time_ms: z.number(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
});

export const BriefingGenerationScheduledEventSchema = BaseEventSchema.extend({
  type: z.literal('briefing.generation.scheduled'),
  stream: z.literal(STREAMS.NOTIFICATION),
  data: z.object({
    user_id: z.string().uuid(),
    contextual_core_id: z.string().uuid(),
    briefing_period: z.enum(['weekly', 'monthly']),
    scheduled_time: z.date(),
    period_start: z.date(),
    period_end: z.date(),
  }),
});

// System Events
export const SystemServiceHealthEventSchema = BaseEventSchema.extend({
  type: z.literal('system.service.health'),
  stream: z.literal(STREAMS.SYSTEM),
  data: z.object({
    service_name: z.string(),
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    response_time_ms: z.number(),
    memory_usage_mb: z.number(),
    cpu_usage_percent: z.number(),
    error_rate: z.number(),
  }),
});

export const SystemErrorCriticalEventSchema = BaseEventSchema.extend({
  type: z.literal('system.error.critical'),
  stream: z.literal(STREAMS.SYSTEM),
  data: z.object({
    service_name: z.string(),
    error_type: z.string(),
    error_message: z.string(),
    stack_trace: z.string(),
    user_id: z.string().uuid().optional(),
    request_id: z.string().optional(),
    requires_immediate_attention: z.boolean(),
  }),
});

export const SystemPerformanceDegradedEventSchema = BaseEventSchema.extend({
  type: z.literal('system.performance.degraded'),
  stream: z.literal(STREAMS.SYSTEM),
  data: z.object({
    metric_name: z.string(),
    current_value: z.number(),
    threshold_value: z.number(),
    affected_services: z.array(z.string()),
    suggested_actions: z.array(z.string()),
  }),
});

// Event Type Union
export type CollectiveStrategistEvent = 
  | z.infer<typeof UserRegisteredEventSchema>
  | z.infer<typeof UserLoginEventSchema>
  | z.infer<typeof UserPreferencesUpdatedEventSchema>
  | z.infer<typeof FileUploadedEventSchema>
  | z.infer<typeof FileProcessingStartedEventSchema>
  | z.infer<typeof FileProcessingCompletedEventSchema>
  | z.infer<typeof EmbeddingGenerationRequestedEventSchema>
  | z.infer<typeof EmbeddingGenerationCompletedEventSchema>
  | z.infer<typeof AIContentGenerationRequestedEventSchema>
  | z.infer<typeof AIContentGenerationCompletedEventSchema>
  | z.infer<typeof AIConsultationRequestedEventSchema>
  | z.infer<typeof AIConsultationCompletedEventSchema>
  | z.infer<typeof MarketDataCollectionStartedEventSchema>
  | z.infer<typeof MarketDataCollectedEventSchema>
  | z.infer<typeof MarketTrendDetectedEventSchema>
  | z.infer<typeof NotificationSendRequestedEventSchema>
  | z.infer<typeof NotificationDeliveredEventSchema>
  | z.infer<typeof BriefingGenerationScheduledEventSchema>
  | z.infer<typeof SystemServiceHealthEventSchema>
  | z.infer<typeof SystemErrorCriticalEventSchema>
  | z.infer<typeof SystemPerformanceDegradedEventSchema>;

// Event Factory Functions
export function createEvent<T extends CollectiveStrategistEvent>(
  eventData: Omit<T, 'id' | 'timestamp'> & { correlation_id?: string }
): T {
  return {
    id: ulid(),
    timestamp: new Date(),
    ...eventData,
  } as T;
}

export function createUserRegisteredEvent(data: {
  user_id: string;
  email: string;
  tier: 'sovereign_circle' | 'individual_pro';
  referral_source?: string;
  correlation_id?: string;
  user_id_context?: string;
}) {
  return createEvent({
    stream: STREAMS.USER,
    type: 'user.registered' as const,
    version: 1,
    user_id: data.user_id_context,
    correlation_id: data.correlation_id,
    data: {
      user_id: data.user_id,
      email: data.email,
      tier: data.tier,
      referral_source: data.referral_source,
    },
  });
}

export function createFileUploadedEvent(data: {
  file_id: string;
  user_id: string;
  contextual_core_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  is_browser_viewable: boolean;
  correlation_id?: string;
}) {
  return createEvent({
    stream: STREAMS.CONTEXTUAL,
    type: 'file.uploaded' as const,
    version: 1,
    user_id: data.user_id,
    correlation_id: data.correlation_id,
    data,
  });
}

export function createEmbeddingGenerationRequestedEvent(data: {
  text_content: string;
  content_hash: string;
  user_id: string;
  contextual_core_id: string;
  preferred_model?: string;
  priority: 'low' | 'normal' | 'high';
  correlation_id?: string;
}) {
  return createEvent({
    stream: STREAMS.CONTEXTUAL,
    type: 'embedding.generation.requested' as const,
    version: 1,
    user_id: data.user_id,
    correlation_id: data.correlation_id,
    data,
  });
}

export function createAIContentGenerationRequestedEvent(data: {
  request_id: string;
  user_id: string;
  contextual_core_id: string;
  content_type: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
  prompt_template: string;
  ai_provider: string;
  max_tokens: number;
  correlation_id?: string;
}) {
  return createEvent({
    stream: STREAMS.AI,
    type: 'ai.content.generation.requested' as const,
    version: 1,
    user_id: data.user_id,
    correlation_id: data.correlation_id,
    data,
  });
}

// Event Schema Registry
export const EVENT_SCHEMAS = {
  'user.registered': UserRegisteredEventSchema,
  'user.login': UserLoginEventSchema,
  'user.preferences.updated': UserPreferencesUpdatedEventSchema,
  'file.uploaded': FileUploadedEventSchema,
  'file.processing.started': FileProcessingStartedEventSchema,
  'file.processing.completed': FileProcessingCompletedEventSchema,
  'embedding.generation.requested': EmbeddingGenerationRequestedEventSchema,
  'embedding.generation.completed': EmbeddingGenerationCompletedEventSchema,
  'ai.content.generation.requested': AIContentGenerationRequestedEventSchema,
  'ai.content.generation.completed': AIContentGenerationCompletedEventSchema,
  'ai.consultation.requested': AIConsultationRequestedEventSchema,
  'ai.consultation.completed': AIConsultationCompletedEventSchema,
  'market.data.collection.started': MarketDataCollectionStartedEventSchema,
  'market.data.collected': MarketDataCollectedEventSchema,
  'market.trend.detected': MarketTrendDetectedEventSchema,
  'notification.send.requested': NotificationSendRequestedEventSchema,
  'notification.delivered': NotificationDeliveredEventSchema,
  'briefing.generation.scheduled': BriefingGenerationScheduledEventSchema,
  'system.service.health': SystemServiceHealthEventSchema,
  'system.error.critical': SystemErrorCriticalEventSchema,
  'system.performance.degraded': SystemPerformanceDegradedEventSchema,
} as const;

export type EventType = keyof typeof EVENT_SCHEMAS;