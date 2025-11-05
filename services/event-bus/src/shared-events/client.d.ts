import { CollectiveStrategistEvent, StreamName, EventType } from './index';
export interface EventClientConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
}
export declare class EventClient {
    private client;
    private isConnected;
    constructor(config: EventClientConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    publish<T extends CollectiveStrategistEvent>(event: T): Promise<string>;
    publishUserRegistered(data: {
        user_id: string;
        email: string;
        tier: 'sovereign_circle' | 'individual_pro';
        referral_source?: string;
        correlation_id?: string;
    }): Promise<string>;
    publishFileUploaded(data: {
        file_id: string;
        user_id: string;
        contextual_core_id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        is_browser_viewable: boolean;
        correlation_id?: string;
    }): Promise<string>;
    publishFileProcessingStarted(data: {
        file_id: string;
        processing_type: 'text_extraction' | 'embedding_generation' | 'metadata_analysis';
        estimated_duration_ms: number;
        user_id?: string;
        correlation_id?: string;
    }): Promise<string>;
    publishFileProcessingCompleted(data: {
        file_id: string;
        processing_type: string;
        processing_time_ms: number;
        extracted_text_length?: number;
        embedding_model_used?: string;
        success: boolean;
        error?: string;
        user_id?: string;
        correlation_id?: string;
    }): Promise<string>;
    publishEmbeddingGenerationRequested(data: {
        text_content: string;
        content_hash: string;
        user_id: string;
        contextual_core_id: string;
        preferred_model?: string;
        priority: 'low' | 'normal' | 'high';
        correlation_id?: string;
    }): Promise<string>;
    publishEmbeddingGenerationCompleted(data: {
        embedding_id: string;
        content_hash: string;
        model_id: string;
        dimensions: number;
        generation_time_ms: number;
        cost_usd: number;
        quality_score?: number;
        user_id?: string;
        correlation_id?: string;
    }): Promise<string>;
    publishAIContentGenerationRequested(data: {
        request_id: string;
        user_id: string;
        contextual_core_id: string;
        content_type: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
        prompt_template: string;
        ai_provider: string;
        max_tokens: number;
        correlation_id?: string;
    }): Promise<string>;
    publishAIContentGenerationCompleted(data: {
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
    }): Promise<string>;
    publishNotificationRequested(data: {
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
    }): Promise<string>;
    publishSystemError(data: {
        service_name: string;
        error_type: string;
        error_message: string;
        stack_trace: string;
        user_id?: string;
        request_id?: string;
        requires_immediate_attention: boolean;
        correlation_id?: string;
    }): Promise<string>;
    publishServiceHealth(data: {
        service_name: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        response_time_ms: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        error_rate: number;
        correlation_id?: string;
    }): Promise<string>;
    waitForEvent<T extends CollectiveStrategistEvent>(stream: StreamName, eventType: EventType, correlationId: string, timeoutMs?: number): Promise<T>;
    private ensureConnected;
}
//# sourceMappingURL=client.d.ts.map