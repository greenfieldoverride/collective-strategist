"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_SCHEMAS = exports.SystemPerformanceDegradedEventSchema = exports.SystemErrorCriticalEventSchema = exports.SystemServiceHealthEventSchema = exports.BriefingGenerationScheduledEventSchema = exports.NotificationDeliveredEventSchema = exports.NotificationSendRequestedEventSchema = exports.MarketTrendDetectedEventSchema = exports.MarketDataCollectedEventSchema = exports.MarketDataCollectionStartedEventSchema = exports.AIConsultationCompletedEventSchema = exports.AIConsultationRequestedEventSchema = exports.AIContentGenerationCompletedEventSchema = exports.AIContentGenerationRequestedEventSchema = exports.EmbeddingGenerationCompletedEventSchema = exports.EmbeddingGenerationRequestedEventSchema = exports.FileProcessingCompletedEventSchema = exports.FileProcessingStartedEventSchema = exports.FileUploadedEventSchema = exports.UserPreferencesUpdatedEventSchema = exports.UserLoginEventSchema = exports.UserRegisteredEventSchema = exports.STREAMS = exports.BaseEventSchema = void 0;
exports.createEvent = createEvent;
exports.createUserRegisteredEvent = createUserRegisteredEvent;
exports.createFileUploadedEvent = createFileUploadedEvent;
exports.createEmbeddingGenerationRequestedEvent = createEmbeddingGenerationRequestedEvent;
exports.createAIContentGenerationRequestedEvent = createAIContentGenerationRequestedEvent;
const zod_1 = require("zod");
const ulid_1 = require("ulid");
// Base Event Schema
exports.BaseEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    stream: zod_1.z.string(),
    type: zod_1.z.string(),
    version: zod_1.z.number().default(1),
    timestamp: zod_1.z.date(),
    correlation_id: zod_1.z.string().optional(),
    user_id: zod_1.z.string().uuid().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Stream Names
exports.STREAMS = {
    USER: 'user.events',
    CONTENT: 'content.events',
    CONTEXTUAL: 'contextual.events',
    MARKET: 'market.events',
    AI: 'ai.events',
    NOTIFICATION: 'notification.events',
    SYSTEM: 'system.events',
};
// User Events
exports.UserRegisteredEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('user.registered'),
    stream: zod_1.z.literal(exports.STREAMS.USER),
    data: zod_1.z.object({
        user_id: zod_1.z.string().uuid(),
        email: zod_1.z.string().email(),
        tier: zod_1.z.enum(['sovereign_circle', 'individual_pro']),
        referral_source: zod_1.z.string().optional(),
    }),
});
exports.UserLoginEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('user.login'),
    stream: zod_1.z.literal(exports.STREAMS.USER),
    data: zod_1.z.object({
        user_id: zod_1.z.string().uuid(),
        ip_address: zod_1.z.string(),
        user_agent: zod_1.z.string(),
        success: zod_1.z.boolean(),
    }),
});
exports.UserPreferencesUpdatedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('user.preferences.updated'),
    stream: zod_1.z.literal(exports.STREAMS.USER),
    data: zod_1.z.object({
        user_id: zod_1.z.string().uuid(),
        changed_fields: zod_1.z.array(zod_1.z.string()),
        old_values: zod_1.z.record(zod_1.z.any()),
        new_values: zod_1.z.record(zod_1.z.any()),
    }),
});
// Contextual Events
exports.FileUploadedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('file.uploaded'),
    stream: zod_1.z.literal(exports.STREAMS.CONTEXTUAL),
    data: zod_1.z.object({
        file_id: zod_1.z.string().uuid(),
        user_id: zod_1.z.string().uuid(),
        contextual_core_id: zod_1.z.string().uuid(),
        filename: zod_1.z.string(),
        file_size: zod_1.z.number(),
        mime_type: zod_1.z.string(),
        is_browser_viewable: zod_1.z.boolean(),
    }),
});
exports.FileProcessingStartedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('file.processing.started'),
    stream: zod_1.z.literal(exports.STREAMS.CONTEXTUAL),
    data: zod_1.z.object({
        file_id: zod_1.z.string().uuid(),
        processing_type: zod_1.z.enum(['text_extraction', 'embedding_generation', 'metadata_analysis']),
        estimated_duration_ms: zod_1.z.number(),
    }),
});
exports.FileProcessingCompletedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('file.processing.completed'),
    stream: zod_1.z.literal(exports.STREAMS.CONTEXTUAL),
    data: zod_1.z.object({
        file_id: zod_1.z.string().uuid(),
        processing_type: zod_1.z.string(),
        processing_time_ms: zod_1.z.number(),
        extracted_text_length: zod_1.z.number().optional(),
        embedding_model_used: zod_1.z.string().optional(),
        success: zod_1.z.boolean(),
        error: zod_1.z.string().optional(),
    }),
});
exports.EmbeddingGenerationRequestedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('embedding.generation.requested'),
    stream: zod_1.z.literal(exports.STREAMS.CONTEXTUAL),
    data: zod_1.z.object({
        text_content: zod_1.z.string(),
        content_hash: zod_1.z.string(),
        user_id: zod_1.z.string().uuid(),
        contextual_core_id: zod_1.z.string().uuid(),
        preferred_model: zod_1.z.string().optional(),
        priority: zod_1.z.enum(['low', 'normal', 'high']),
    }),
});
exports.EmbeddingGenerationCompletedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('embedding.generation.completed'),
    stream: zod_1.z.literal(exports.STREAMS.CONTEXTUAL),
    data: zod_1.z.object({
        embedding_id: zod_1.z.string().uuid(),
        content_hash: zod_1.z.string(),
        model_id: zod_1.z.string().uuid(),
        dimensions: zod_1.z.number(),
        generation_time_ms: zod_1.z.number(),
        cost_usd: zod_1.z.number(),
        quality_score: zod_1.z.number().optional(),
    }),
});
// AI Events
exports.AIContentGenerationRequestedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('ai.content.generation.requested'),
    stream: zod_1.z.literal(exports.STREAMS.AI),
    data: zod_1.z.object({
        request_id: zod_1.z.string().uuid(),
        user_id: zod_1.z.string().uuid(),
        contextual_core_id: zod_1.z.string().uuid(),
        content_type: zod_1.z.enum(['social_post', 'blog_article', 'marketing_copy', 'email']),
        prompt_template: zod_1.z.string(),
        ai_provider: zod_1.z.string(),
        max_tokens: zod_1.z.number(),
    }),
});
exports.AIContentGenerationCompletedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('ai.content.generation.completed'),
    stream: zod_1.z.literal(exports.STREAMS.AI),
    data: zod_1.z.object({
        request_id: zod_1.z.string().uuid(),
        content_draft_id: zod_1.z.string().uuid(),
        generated_content: zod_1.z.string(),
        ai_provider: zod_1.z.string(),
        model_used: zod_1.z.string(),
        tokens_used: zod_1.z.number(),
        generation_time_ms: zod_1.z.number(),
        cost_usd: zod_1.z.number(),
    }),
});
exports.AIConsultationRequestedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('ai.consultation.requested'),
    stream: zod_1.z.literal(exports.STREAMS.AI),
    data: zod_1.z.object({
        session_id: zod_1.z.string().uuid(),
        user_id: zod_1.z.string().uuid(),
        contextual_core_id: zod_1.z.string().uuid(),
        query: zod_1.z.string(),
        session_type: zod_1.z.enum(['strategic_advice', 'trend_analysis', 'goal_planning']),
    }),
});
exports.AIConsultationCompletedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('ai.consultation.completed'),
    stream: zod_1.z.literal(exports.STREAMS.AI),
    data: zod_1.z.object({
        session_id: zod_1.z.string().uuid(),
        response: zod_1.z.string(),
        confidence_score: zod_1.z.number(),
        market_data_referenced: zod_1.z.array(zod_1.z.string().uuid()),
        ai_provider: zod_1.z.string(),
        tokens_used: zod_1.z.number(),
    }),
});
// Market Events
exports.MarketDataCollectionStartedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('market.data.collection.started'),
    stream: zod_1.z.literal(exports.STREAMS.MARKET),
    data: zod_1.z.object({
        collection_id: zod_1.z.string().uuid(),
        data_source: zod_1.z.enum(['reddit', 'google_trends', 'rss_feeds']),
        keywords: zod_1.z.array(zod_1.z.string()),
        user_ids: zod_1.z.array(zod_1.z.string().uuid()),
    }),
});
exports.MarketDataCollectedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('market.data.collected'),
    stream: zod_1.z.literal(exports.STREAMS.MARKET),
    data: zod_1.z.object({
        collection_id: zod_1.z.string().uuid(),
        data_source: zod_1.z.string(),
        data_type: zod_1.z.enum(['engagement', 'trend', 'competitor_activity']),
        records_collected: zod_1.z.number(),
        collection_time_ms: zod_1.z.number(),
        data_quality_score: zod_1.z.number(),
    }),
});
exports.MarketTrendDetectedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('market.trend.detected'),
    stream: zod_1.z.literal(exports.STREAMS.MARKET),
    data: zod_1.z.object({
        trend_id: zod_1.z.string().uuid(),
        trend_type: zod_1.z.enum(['rising', 'declining', 'stable']),
        keywords: zod_1.z.array(zod_1.z.string()),
        confidence_score: zod_1.z.number(),
        affected_users: zod_1.z.array(zod_1.z.string().uuid()),
        trend_data: zod_1.z.record(zod_1.z.any()),
    }),
});
// Notification Events
exports.NotificationSendRequestedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('notification.send.requested'),
    stream: zod_1.z.literal(exports.STREAMS.NOTIFICATION),
    data: zod_1.z.object({
        user_id: zod_1.z.string().uuid(),
        notification_type: zod_1.z.enum(['briefing_ready', 'system_alert', 'content_suggestion']),
        channels: zod_1.z.array(zod_1.z.enum(['email', 'push', 'websocket'])),
        message: zod_1.z.object({
            title: zod_1.z.string(),
            body: zod_1.z.string(),
            action_url: zod_1.z.string().optional(),
        }),
        priority: zod_1.z.enum(['low', 'normal', 'high', 'critical']),
    }),
});
exports.NotificationDeliveredEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('notification.delivered'),
    stream: zod_1.z.literal(exports.STREAMS.NOTIFICATION),
    data: zod_1.z.object({
        notification_id: zod_1.z.string().uuid(),
        user_id: zod_1.z.string().uuid(),
        channel: zod_1.z.string(),
        delivery_time_ms: zod_1.z.number(),
        success: zod_1.z.boolean(),
        error: zod_1.z.string().optional(),
    }),
});
exports.BriefingGenerationScheduledEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('briefing.generation.scheduled'),
    stream: zod_1.z.literal(exports.STREAMS.NOTIFICATION),
    data: zod_1.z.object({
        user_id: zod_1.z.string().uuid(),
        contextual_core_id: zod_1.z.string().uuid(),
        briefing_period: zod_1.z.enum(['weekly', 'monthly']),
        scheduled_time: zod_1.z.date(),
        period_start: zod_1.z.date(),
        period_end: zod_1.z.date(),
    }),
});
// System Events
exports.SystemServiceHealthEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('system.service.health'),
    stream: zod_1.z.literal(exports.STREAMS.SYSTEM),
    data: zod_1.z.object({
        service_name: zod_1.z.string(),
        status: zod_1.z.enum(['healthy', 'degraded', 'unhealthy']),
        response_time_ms: zod_1.z.number(),
        memory_usage_mb: zod_1.z.number(),
        cpu_usage_percent: zod_1.z.number(),
        error_rate: zod_1.z.number(),
    }),
});
exports.SystemErrorCriticalEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('system.error.critical'),
    stream: zod_1.z.literal(exports.STREAMS.SYSTEM),
    data: zod_1.z.object({
        service_name: zod_1.z.string(),
        error_type: zod_1.z.string(),
        error_message: zod_1.z.string(),
        stack_trace: zod_1.z.string(),
        user_id: zod_1.z.string().uuid().optional(),
        request_id: zod_1.z.string().optional(),
        requires_immediate_attention: zod_1.z.boolean(),
    }),
});
exports.SystemPerformanceDegradedEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('system.performance.degraded'),
    stream: zod_1.z.literal(exports.STREAMS.SYSTEM),
    data: zod_1.z.object({
        metric_name: zod_1.z.string(),
        current_value: zod_1.z.number(),
        threshold_value: zod_1.z.number(),
        affected_services: zod_1.z.array(zod_1.z.string()),
        suggested_actions: zod_1.z.array(zod_1.z.string()),
    }),
});
// Event Factory Functions
function createEvent(eventData) {
    return {
        id: (0, ulid_1.ulid)(),
        timestamp: new Date(),
        ...eventData,
    };
}
function createUserRegisteredEvent(data) {
    return createEvent({
        stream: exports.STREAMS.USER,
        type: 'user.registered',
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
function createFileUploadedEvent(data) {
    return createEvent({
        stream: exports.STREAMS.CONTEXTUAL,
        type: 'file.uploaded',
        version: 1,
        user_id: data.user_id,
        correlation_id: data.correlation_id,
        data,
    });
}
function createEmbeddingGenerationRequestedEvent(data) {
    return createEvent({
        stream: exports.STREAMS.CONTEXTUAL,
        type: 'embedding.generation.requested',
        version: 1,
        user_id: data.user_id,
        correlation_id: data.correlation_id,
        data,
    });
}
function createAIContentGenerationRequestedEvent(data) {
    return createEvent({
        stream: exports.STREAMS.AI,
        type: 'ai.content.generation.requested',
        version: 1,
        user_id: data.user_id,
        correlation_id: data.correlation_id,
        data,
    });
}
// Event Schema Registry
exports.EVENT_SCHEMAS = {
    'user.registered': exports.UserRegisteredEventSchema,
    'user.login': exports.UserLoginEventSchema,
    'user.preferences.updated': exports.UserPreferencesUpdatedEventSchema,
    'file.uploaded': exports.FileUploadedEventSchema,
    'file.processing.started': exports.FileProcessingStartedEventSchema,
    'file.processing.completed': exports.FileProcessingCompletedEventSchema,
    'embedding.generation.requested': exports.EmbeddingGenerationRequestedEventSchema,
    'embedding.generation.completed': exports.EmbeddingGenerationCompletedEventSchema,
    'ai.content.generation.requested': exports.AIContentGenerationRequestedEventSchema,
    'ai.content.generation.completed': exports.AIContentGenerationCompletedEventSchema,
    'ai.consultation.requested': exports.AIConsultationRequestedEventSchema,
    'ai.consultation.completed': exports.AIConsultationCompletedEventSchema,
    'market.data.collection.started': exports.MarketDataCollectionStartedEventSchema,
    'market.data.collected': exports.MarketDataCollectedEventSchema,
    'market.trend.detected': exports.MarketTrendDetectedEventSchema,
    'notification.send.requested': exports.NotificationSendRequestedEventSchema,
    'notification.delivered': exports.NotificationDeliveredEventSchema,
    'briefing.generation.scheduled': exports.BriefingGenerationScheduledEventSchema,
    'system.service.health': exports.SystemServiceHealthEventSchema,
    'system.error.critical': exports.SystemErrorCriticalEventSchema,
    'system.performance.degraded': exports.SystemPerformanceDegradedEventSchema,
};
//# sourceMappingURL=index.js.map