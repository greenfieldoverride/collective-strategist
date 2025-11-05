import { z } from 'zod';
export declare const BaseEventSchema: z.ZodObject<{
    id: z.ZodString;
    stream: z.ZodString;
    type: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: string;
    type: string;
    version: number;
    timestamp: Date;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: string;
    type: string;
    timestamp: Date;
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export declare const STREAMS: {
    readonly USER: "user.events";
    readonly CONTENT: "content.events";
    readonly CONTEXTUAL: "contextual.events";
    readonly MARKET: "market.events";
    readonly AI: "ai.events";
    readonly NOTIFICATION: "notification.events";
    readonly SYSTEM: "system.events";
};
export type StreamName = typeof STREAMS[keyof typeof STREAMS];
export declare const UserRegisteredEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"user.registered">;
    stream: z.ZodLiteral<"user.events">;
    data: z.ZodObject<{
        user_id: z.ZodString;
        email: z.ZodString;
        tier: z.ZodEnum<["sovereign_circle", "individual_pro"]>;
        referral_source: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        email: string;
        tier: "sovereign_circle" | "individual_pro";
        referral_source?: string | undefined;
    }, {
        user_id: string;
        email: string;
        tier: "sovereign_circle" | "individual_pro";
        referral_source?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "user.events";
    type: "user.registered";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        email: string;
        tier: "sovereign_circle" | "individual_pro";
        referral_source?: string | undefined;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "user.events";
    type: "user.registered";
    timestamp: Date;
    data: {
        user_id: string;
        email: string;
        tier: "sovereign_circle" | "individual_pro";
        referral_source?: string | undefined;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const UserLoginEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"user.login">;
    stream: z.ZodLiteral<"user.events">;
    data: z.ZodObject<{
        user_id: z.ZodString;
        ip_address: z.ZodString;
        user_agent: z.ZodString;
        success: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        ip_address: string;
        user_agent: string;
        success: boolean;
    }, {
        user_id: string;
        ip_address: string;
        user_agent: string;
        success: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "user.events";
    type: "user.login";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        ip_address: string;
        user_agent: string;
        success: boolean;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "user.events";
    type: "user.login";
    timestamp: Date;
    data: {
        user_id: string;
        ip_address: string;
        user_agent: string;
        success: boolean;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const UserPreferencesUpdatedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"user.preferences.updated">;
    stream: z.ZodLiteral<"user.events">;
    data: z.ZodObject<{
        user_id: z.ZodString;
        changed_fields: z.ZodArray<z.ZodString, "many">;
        old_values: z.ZodRecord<z.ZodString, z.ZodAny>;
        new_values: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        changed_fields: string[];
        old_values: Record<string, any>;
        new_values: Record<string, any>;
    }, {
        user_id: string;
        changed_fields: string[];
        old_values: Record<string, any>;
        new_values: Record<string, any>;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "user.events";
    type: "user.preferences.updated";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        changed_fields: string[];
        old_values: Record<string, any>;
        new_values: Record<string, any>;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "user.events";
    type: "user.preferences.updated";
    timestamp: Date;
    data: {
        user_id: string;
        changed_fields: string[];
        old_values: Record<string, any>;
        new_values: Record<string, any>;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const FileUploadedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"file.uploaded">;
    stream: z.ZodLiteral<"contextual.events">;
    data: z.ZodObject<{
        file_id: z.ZodString;
        user_id: z.ZodString;
        contextual_core_id: z.ZodString;
        filename: z.ZodString;
        file_size: z.ZodNumber;
        mime_type: z.ZodString;
        is_browser_viewable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        file_id: string;
        contextual_core_id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        is_browser_viewable: boolean;
    }, {
        user_id: string;
        file_id: string;
        contextual_core_id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        is_browser_viewable: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "contextual.events";
    type: "file.uploaded";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        file_id: string;
        contextual_core_id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        is_browser_viewable: boolean;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "contextual.events";
    type: "file.uploaded";
    timestamp: Date;
    data: {
        user_id: string;
        file_id: string;
        contextual_core_id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        is_browser_viewable: boolean;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const FileProcessingStartedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"file.processing.started">;
    stream: z.ZodLiteral<"contextual.events">;
    data: z.ZodObject<{
        file_id: z.ZodString;
        processing_type: z.ZodEnum<["text_extraction", "embedding_generation", "metadata_analysis"]>;
        estimated_duration_ms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        file_id: string;
        processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
        estimated_duration_ms: number;
    }, {
        file_id: string;
        processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
        estimated_duration_ms: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "contextual.events";
    type: "file.processing.started";
    version: number;
    timestamp: Date;
    data: {
        file_id: string;
        processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
        estimated_duration_ms: number;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "contextual.events";
    type: "file.processing.started";
    timestamp: Date;
    data: {
        file_id: string;
        processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
        estimated_duration_ms: number;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const FileProcessingCompletedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"file.processing.completed">;
    stream: z.ZodLiteral<"contextual.events">;
    data: z.ZodObject<{
        file_id: z.ZodString;
        processing_type: z.ZodString;
        processing_time_ms: z.ZodNumber;
        extracted_text_length: z.ZodOptional<z.ZodNumber>;
        embedding_model_used: z.ZodOptional<z.ZodString>;
        success: z.ZodBoolean;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        file_id: string;
        processing_type: string;
        processing_time_ms: number;
        extracted_text_length?: number | undefined;
        embedding_model_used?: string | undefined;
        error?: string | undefined;
    }, {
        success: boolean;
        file_id: string;
        processing_type: string;
        processing_time_ms: number;
        extracted_text_length?: number | undefined;
        embedding_model_used?: string | undefined;
        error?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "contextual.events";
    type: "file.processing.completed";
    version: number;
    timestamp: Date;
    data: {
        success: boolean;
        file_id: string;
        processing_type: string;
        processing_time_ms: number;
        extracted_text_length?: number | undefined;
        embedding_model_used?: string | undefined;
        error?: string | undefined;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "contextual.events";
    type: "file.processing.completed";
    timestamp: Date;
    data: {
        success: boolean;
        file_id: string;
        processing_type: string;
        processing_time_ms: number;
        extracted_text_length?: number | undefined;
        embedding_model_used?: string | undefined;
        error?: string | undefined;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const EmbeddingGenerationRequestedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"embedding.generation.requested">;
    stream: z.ZodLiteral<"contextual.events">;
    data: z.ZodObject<{
        text_content: z.ZodString;
        content_hash: z.ZodString;
        user_id: z.ZodString;
        contextual_core_id: z.ZodString;
        preferred_model: z.ZodOptional<z.ZodString>;
        priority: z.ZodEnum<["low", "normal", "high"]>;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        contextual_core_id: string;
        text_content: string;
        content_hash: string;
        priority: "low" | "normal" | "high";
        preferred_model?: string | undefined;
    }, {
        user_id: string;
        contextual_core_id: string;
        text_content: string;
        content_hash: string;
        priority: "low" | "normal" | "high";
        preferred_model?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "contextual.events";
    type: "embedding.generation.requested";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        text_content: string;
        content_hash: string;
        priority: "low" | "normal" | "high";
        preferred_model?: string | undefined;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "contextual.events";
    type: "embedding.generation.requested";
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        text_content: string;
        content_hash: string;
        priority: "low" | "normal" | "high";
        preferred_model?: string | undefined;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const EmbeddingGenerationCompletedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"embedding.generation.completed">;
    stream: z.ZodLiteral<"contextual.events">;
    data: z.ZodObject<{
        embedding_id: z.ZodString;
        content_hash: z.ZodString;
        model_id: z.ZodString;
        dimensions: z.ZodNumber;
        generation_time_ms: z.ZodNumber;
        cost_usd: z.ZodNumber;
        quality_score: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        content_hash: string;
        embedding_id: string;
        model_id: string;
        dimensions: number;
        generation_time_ms: number;
        cost_usd: number;
        quality_score?: number | undefined;
    }, {
        content_hash: string;
        embedding_id: string;
        model_id: string;
        dimensions: number;
        generation_time_ms: number;
        cost_usd: number;
        quality_score?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "contextual.events";
    type: "embedding.generation.completed";
    version: number;
    timestamp: Date;
    data: {
        content_hash: string;
        embedding_id: string;
        model_id: string;
        dimensions: number;
        generation_time_ms: number;
        cost_usd: number;
        quality_score?: number | undefined;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "contextual.events";
    type: "embedding.generation.completed";
    timestamp: Date;
    data: {
        content_hash: string;
        embedding_id: string;
        model_id: string;
        dimensions: number;
        generation_time_ms: number;
        cost_usd: number;
        quality_score?: number | undefined;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const AIContentGenerationRequestedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"ai.content.generation.requested">;
    stream: z.ZodLiteral<"ai.events">;
    data: z.ZodObject<{
        request_id: z.ZodString;
        user_id: z.ZodString;
        contextual_core_id: z.ZodString;
        content_type: z.ZodEnum<["social_post", "blog_article", "marketing_copy", "email"]>;
        prompt_template: z.ZodString;
        ai_provider: z.ZodString;
        max_tokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        contextual_core_id: string;
        request_id: string;
        content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
        prompt_template: string;
        ai_provider: string;
        max_tokens: number;
    }, {
        user_id: string;
        contextual_core_id: string;
        request_id: string;
        content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
        prompt_template: string;
        ai_provider: string;
        max_tokens: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "ai.events";
    type: "ai.content.generation.requested";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        request_id: string;
        content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
        prompt_template: string;
        ai_provider: string;
        max_tokens: number;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "ai.events";
    type: "ai.content.generation.requested";
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        request_id: string;
        content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
        prompt_template: string;
        ai_provider: string;
        max_tokens: number;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const AIContentGenerationCompletedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"ai.content.generation.completed">;
    stream: z.ZodLiteral<"ai.events">;
    data: z.ZodObject<{
        request_id: z.ZodString;
        content_draft_id: z.ZodString;
        generated_content: z.ZodString;
        ai_provider: z.ZodString;
        model_used: z.ZodString;
        tokens_used: z.ZodNumber;
        generation_time_ms: z.ZodNumber;
        cost_usd: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        generation_time_ms: number;
        cost_usd: number;
        request_id: string;
        ai_provider: string;
        content_draft_id: string;
        generated_content: string;
        model_used: string;
        tokens_used: number;
    }, {
        generation_time_ms: number;
        cost_usd: number;
        request_id: string;
        ai_provider: string;
        content_draft_id: string;
        generated_content: string;
        model_used: string;
        tokens_used: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "ai.events";
    type: "ai.content.generation.completed";
    version: number;
    timestamp: Date;
    data: {
        generation_time_ms: number;
        cost_usd: number;
        request_id: string;
        ai_provider: string;
        content_draft_id: string;
        generated_content: string;
        model_used: string;
        tokens_used: number;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "ai.events";
    type: "ai.content.generation.completed";
    timestamp: Date;
    data: {
        generation_time_ms: number;
        cost_usd: number;
        request_id: string;
        ai_provider: string;
        content_draft_id: string;
        generated_content: string;
        model_used: string;
        tokens_used: number;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const AIConsultationRequestedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"ai.consultation.requested">;
    stream: z.ZodLiteral<"ai.events">;
    data: z.ZodObject<{
        session_id: z.ZodString;
        user_id: z.ZodString;
        contextual_core_id: z.ZodString;
        query: z.ZodString;
        session_type: z.ZodEnum<["strategic_advice", "trend_analysis", "goal_planning"]>;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        contextual_core_id: string;
        session_id: string;
        query: string;
        session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
    }, {
        user_id: string;
        contextual_core_id: string;
        session_id: string;
        query: string;
        session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "ai.events";
    type: "ai.consultation.requested";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        session_id: string;
        query: string;
        session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "ai.events";
    type: "ai.consultation.requested";
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        session_id: string;
        query: string;
        session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const AIConsultationCompletedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"ai.consultation.completed">;
    stream: z.ZodLiteral<"ai.events">;
    data: z.ZodObject<{
        session_id: z.ZodString;
        response: z.ZodString;
        confidence_score: z.ZodNumber;
        market_data_referenced: z.ZodArray<z.ZodString, "many">;
        ai_provider: z.ZodString;
        tokens_used: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ai_provider: string;
        tokens_used: number;
        session_id: string;
        response: string;
        confidence_score: number;
        market_data_referenced: string[];
    }, {
        ai_provider: string;
        tokens_used: number;
        session_id: string;
        response: string;
        confidence_score: number;
        market_data_referenced: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "ai.events";
    type: "ai.consultation.completed";
    version: number;
    timestamp: Date;
    data: {
        ai_provider: string;
        tokens_used: number;
        session_id: string;
        response: string;
        confidence_score: number;
        market_data_referenced: string[];
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "ai.events";
    type: "ai.consultation.completed";
    timestamp: Date;
    data: {
        ai_provider: string;
        tokens_used: number;
        session_id: string;
        response: string;
        confidence_score: number;
        market_data_referenced: string[];
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const MarketDataCollectionStartedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"market.data.collection.started">;
    stream: z.ZodLiteral<"market.events">;
    data: z.ZodObject<{
        collection_id: z.ZodString;
        data_source: z.ZodEnum<["reddit", "google_trends", "rss_feeds"]>;
        keywords: z.ZodArray<z.ZodString, "many">;
        user_ids: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        collection_id: string;
        data_source: "reddit" | "google_trends" | "rss_feeds";
        keywords: string[];
        user_ids: string[];
    }, {
        collection_id: string;
        data_source: "reddit" | "google_trends" | "rss_feeds";
        keywords: string[];
        user_ids: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "market.events";
    type: "market.data.collection.started";
    version: number;
    timestamp: Date;
    data: {
        collection_id: string;
        data_source: "reddit" | "google_trends" | "rss_feeds";
        keywords: string[];
        user_ids: string[];
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "market.events";
    type: "market.data.collection.started";
    timestamp: Date;
    data: {
        collection_id: string;
        data_source: "reddit" | "google_trends" | "rss_feeds";
        keywords: string[];
        user_ids: string[];
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const MarketDataCollectedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"market.data.collected">;
    stream: z.ZodLiteral<"market.events">;
    data: z.ZodObject<{
        collection_id: z.ZodString;
        data_source: z.ZodString;
        data_type: z.ZodEnum<["engagement", "trend", "competitor_activity"]>;
        records_collected: z.ZodNumber;
        collection_time_ms: z.ZodNumber;
        data_quality_score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        collection_id: string;
        data_source: string;
        data_type: "engagement" | "trend" | "competitor_activity";
        records_collected: number;
        collection_time_ms: number;
        data_quality_score: number;
    }, {
        collection_id: string;
        data_source: string;
        data_type: "engagement" | "trend" | "competitor_activity";
        records_collected: number;
        collection_time_ms: number;
        data_quality_score: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "market.events";
    type: "market.data.collected";
    version: number;
    timestamp: Date;
    data: {
        collection_id: string;
        data_source: string;
        data_type: "engagement" | "trend" | "competitor_activity";
        records_collected: number;
        collection_time_ms: number;
        data_quality_score: number;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "market.events";
    type: "market.data.collected";
    timestamp: Date;
    data: {
        collection_id: string;
        data_source: string;
        data_type: "engagement" | "trend" | "competitor_activity";
        records_collected: number;
        collection_time_ms: number;
        data_quality_score: number;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const MarketTrendDetectedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"market.trend.detected">;
    stream: z.ZodLiteral<"market.events">;
    data: z.ZodObject<{
        trend_id: z.ZodString;
        trend_type: z.ZodEnum<["rising", "declining", "stable"]>;
        keywords: z.ZodArray<z.ZodString, "many">;
        confidence_score: z.ZodNumber;
        affected_users: z.ZodArray<z.ZodString, "many">;
        trend_data: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        confidence_score: number;
        keywords: string[];
        trend_id: string;
        trend_type: "rising" | "declining" | "stable";
        affected_users: string[];
        trend_data: Record<string, any>;
    }, {
        confidence_score: number;
        keywords: string[];
        trend_id: string;
        trend_type: "rising" | "declining" | "stable";
        affected_users: string[];
        trend_data: Record<string, any>;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "market.events";
    type: "market.trend.detected";
    version: number;
    timestamp: Date;
    data: {
        confidence_score: number;
        keywords: string[];
        trend_id: string;
        trend_type: "rising" | "declining" | "stable";
        affected_users: string[];
        trend_data: Record<string, any>;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "market.events";
    type: "market.trend.detected";
    timestamp: Date;
    data: {
        confidence_score: number;
        keywords: string[];
        trend_id: string;
        trend_type: "rising" | "declining" | "stable";
        affected_users: string[];
        trend_data: Record<string, any>;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const NotificationSendRequestedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"notification.send.requested">;
    stream: z.ZodLiteral<"notification.events">;
    data: z.ZodObject<{
        user_id: z.ZodString;
        notification_type: z.ZodEnum<["briefing_ready", "system_alert", "content_suggestion"]>;
        channels: z.ZodArray<z.ZodEnum<["email", "push", "websocket"]>, "many">;
        message: z.ZodObject<{
            title: z.ZodString;
            body: z.ZodString;
            action_url: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            body: string;
            action_url?: string | undefined;
        }, {
            title: string;
            body: string;
            action_url?: string | undefined;
        }>;
        priority: z.ZodEnum<["low", "normal", "high", "critical"]>;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        message: {
            title: string;
            body: string;
            action_url?: string | undefined;
        };
        priority: "low" | "normal" | "high" | "critical";
        notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
        channels: ("push" | "email" | "websocket")[];
    }, {
        user_id: string;
        message: {
            title: string;
            body: string;
            action_url?: string | undefined;
        };
        priority: "low" | "normal" | "high" | "critical";
        notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
        channels: ("push" | "email" | "websocket")[];
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "notification.events";
    type: "notification.send.requested";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        message: {
            title: string;
            body: string;
            action_url?: string | undefined;
        };
        priority: "low" | "normal" | "high" | "critical";
        notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
        channels: ("push" | "email" | "websocket")[];
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "notification.events";
    type: "notification.send.requested";
    timestamp: Date;
    data: {
        user_id: string;
        message: {
            title: string;
            body: string;
            action_url?: string | undefined;
        };
        priority: "low" | "normal" | "high" | "critical";
        notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
        channels: ("push" | "email" | "websocket")[];
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const NotificationDeliveredEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"notification.delivered">;
    stream: z.ZodLiteral<"notification.events">;
    data: z.ZodObject<{
        notification_id: z.ZodString;
        user_id: z.ZodString;
        channel: z.ZodString;
        delivery_time_ms: z.ZodNumber;
        success: z.ZodBoolean;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        success: boolean;
        notification_id: string;
        channel: string;
        delivery_time_ms: number;
        error?: string | undefined;
    }, {
        user_id: string;
        success: boolean;
        notification_id: string;
        channel: string;
        delivery_time_ms: number;
        error?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "notification.events";
    type: "notification.delivered";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        success: boolean;
        notification_id: string;
        channel: string;
        delivery_time_ms: number;
        error?: string | undefined;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "notification.events";
    type: "notification.delivered";
    timestamp: Date;
    data: {
        user_id: string;
        success: boolean;
        notification_id: string;
        channel: string;
        delivery_time_ms: number;
        error?: string | undefined;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const BriefingGenerationScheduledEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"briefing.generation.scheduled">;
    stream: z.ZodLiteral<"notification.events">;
    data: z.ZodObject<{
        user_id: z.ZodString;
        contextual_core_id: z.ZodString;
        briefing_period: z.ZodEnum<["weekly", "monthly"]>;
        scheduled_time: z.ZodDate;
        period_start: z.ZodDate;
        period_end: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
        contextual_core_id: string;
        briefing_period: "weekly" | "monthly";
        scheduled_time: Date;
        period_start: Date;
        period_end: Date;
    }, {
        user_id: string;
        contextual_core_id: string;
        briefing_period: "weekly" | "monthly";
        scheduled_time: Date;
        period_start: Date;
        period_end: Date;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "notification.events";
    type: "briefing.generation.scheduled";
    version: number;
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        briefing_period: "weekly" | "monthly";
        scheduled_time: Date;
        period_start: Date;
        period_end: Date;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "notification.events";
    type: "briefing.generation.scheduled";
    timestamp: Date;
    data: {
        user_id: string;
        contextual_core_id: string;
        briefing_period: "weekly" | "monthly";
        scheduled_time: Date;
        period_start: Date;
        period_end: Date;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const SystemServiceHealthEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"system.service.health">;
    stream: z.ZodLiteral<"system.events">;
    data: z.ZodObject<{
        service_name: z.ZodString;
        status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
        response_time_ms: z.ZodNumber;
        memory_usage_mb: z.ZodNumber;
        cpu_usage_percent: z.ZodNumber;
        error_rate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: "healthy" | "degraded" | "unhealthy";
        service_name: string;
        response_time_ms: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        error_rate: number;
    }, {
        status: "healthy" | "degraded" | "unhealthy";
        service_name: string;
        response_time_ms: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        error_rate: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "system.events";
    type: "system.service.health";
    version: number;
    timestamp: Date;
    data: {
        status: "healthy" | "degraded" | "unhealthy";
        service_name: string;
        response_time_ms: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        error_rate: number;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "system.events";
    type: "system.service.health";
    timestamp: Date;
    data: {
        status: "healthy" | "degraded" | "unhealthy";
        service_name: string;
        response_time_ms: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        error_rate: number;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const SystemErrorCriticalEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"system.error.critical">;
    stream: z.ZodLiteral<"system.events">;
    data: z.ZodObject<{
        service_name: z.ZodString;
        error_type: z.ZodString;
        error_message: z.ZodString;
        stack_trace: z.ZodString;
        user_id: z.ZodOptional<z.ZodString>;
        request_id: z.ZodOptional<z.ZodString>;
        requires_immediate_attention: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        service_name: string;
        error_type: string;
        error_message: string;
        stack_trace: string;
        requires_immediate_attention: boolean;
        user_id?: string | undefined;
        request_id?: string | undefined;
    }, {
        service_name: string;
        error_type: string;
        error_message: string;
        stack_trace: string;
        requires_immediate_attention: boolean;
        user_id?: string | undefined;
        request_id?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "system.events";
    type: "system.error.critical";
    version: number;
    timestamp: Date;
    data: {
        service_name: string;
        error_type: string;
        error_message: string;
        stack_trace: string;
        requires_immediate_attention: boolean;
        user_id?: string | undefined;
        request_id?: string | undefined;
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "system.events";
    type: "system.error.critical";
    timestamp: Date;
    data: {
        service_name: string;
        error_type: string;
        error_message: string;
        stack_trace: string;
        requires_immediate_attention: boolean;
        user_id?: string | undefined;
        request_id?: string | undefined;
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const SystemPerformanceDegradedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    correlation_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"system.performance.degraded">;
    stream: z.ZodLiteral<"system.events">;
    data: z.ZodObject<{
        metric_name: z.ZodString;
        current_value: z.ZodNumber;
        threshold_value: z.ZodNumber;
        affected_services: z.ZodArray<z.ZodString, "many">;
        suggested_actions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        metric_name: string;
        current_value: number;
        threshold_value: number;
        affected_services: string[];
        suggested_actions: string[];
    }, {
        metric_name: string;
        current_value: number;
        threshold_value: number;
        affected_services: string[];
        suggested_actions: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    stream: "system.events";
    type: "system.performance.degraded";
    version: number;
    timestamp: Date;
    data: {
        metric_name: string;
        current_value: number;
        threshold_value: number;
        affected_services: string[];
        suggested_actions: string[];
    };
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    stream: "system.events";
    type: "system.performance.degraded";
    timestamp: Date;
    data: {
        metric_name: string;
        current_value: number;
        threshold_value: number;
        affected_services: string[];
        suggested_actions: string[];
    };
    version?: number | undefined;
    correlation_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type CollectiveStrategistEvent = z.infer<typeof UserRegisteredEventSchema> | z.infer<typeof UserLoginEventSchema> | z.infer<typeof UserPreferencesUpdatedEventSchema> | z.infer<typeof FileUploadedEventSchema> | z.infer<typeof FileProcessingStartedEventSchema> | z.infer<typeof FileProcessingCompletedEventSchema> | z.infer<typeof EmbeddingGenerationRequestedEventSchema> | z.infer<typeof EmbeddingGenerationCompletedEventSchema> | z.infer<typeof AIContentGenerationRequestedEventSchema> | z.infer<typeof AIContentGenerationCompletedEventSchema> | z.infer<typeof AIConsultationRequestedEventSchema> | z.infer<typeof AIConsultationCompletedEventSchema> | z.infer<typeof MarketDataCollectionStartedEventSchema> | z.infer<typeof MarketDataCollectedEventSchema> | z.infer<typeof MarketTrendDetectedEventSchema> | z.infer<typeof NotificationSendRequestedEventSchema> | z.infer<typeof NotificationDeliveredEventSchema> | z.infer<typeof BriefingGenerationScheduledEventSchema> | z.infer<typeof SystemServiceHealthEventSchema> | z.infer<typeof SystemErrorCriticalEventSchema> | z.infer<typeof SystemPerformanceDegradedEventSchema>;
export declare function createEvent<T extends CollectiveStrategistEvent>(eventData: Omit<T, 'id' | 'timestamp'> & {
    correlation_id?: string;
}): T;
export declare function createUserRegisteredEvent(data: {
    user_id: string;
    email: string;
    tier: 'sovereign_circle' | 'individual_pro';
    referral_source?: string;
    correlation_id?: string;
    user_id_context?: string;
}): CollectiveStrategistEvent;
export declare function createFileUploadedEvent(data: {
    file_id: string;
    user_id: string;
    contextual_core_id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    is_browser_viewable: boolean;
    correlation_id?: string;
}): CollectiveStrategistEvent;
export declare function createEmbeddingGenerationRequestedEvent(data: {
    text_content: string;
    content_hash: string;
    user_id: string;
    contextual_core_id: string;
    preferred_model?: string;
    priority: 'low' | 'normal' | 'high';
    correlation_id?: string;
}): CollectiveStrategistEvent;
export declare function createAIContentGenerationRequestedEvent(data: {
    request_id: string;
    user_id: string;
    contextual_core_id: string;
    content_type: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
    prompt_template: string;
    ai_provider: string;
    max_tokens: number;
    correlation_id?: string;
}): CollectiveStrategistEvent;
export declare const EVENT_SCHEMAS: {
    readonly 'user.registered': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"user.registered">;
        stream: z.ZodLiteral<"user.events">;
        data: z.ZodObject<{
            user_id: z.ZodString;
            email: z.ZodString;
            tier: z.ZodEnum<["sovereign_circle", "individual_pro"]>;
            referral_source: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            email: string;
            tier: "sovereign_circle" | "individual_pro";
            referral_source?: string | undefined;
        }, {
            user_id: string;
            email: string;
            tier: "sovereign_circle" | "individual_pro";
            referral_source?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "user.events";
        type: "user.registered";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            email: string;
            tier: "sovereign_circle" | "individual_pro";
            referral_source?: string | undefined;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "user.events";
        type: "user.registered";
        timestamp: Date;
        data: {
            user_id: string;
            email: string;
            tier: "sovereign_circle" | "individual_pro";
            referral_source?: string | undefined;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'user.login': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"user.login">;
        stream: z.ZodLiteral<"user.events">;
        data: z.ZodObject<{
            user_id: z.ZodString;
            ip_address: z.ZodString;
            user_agent: z.ZodString;
            success: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            ip_address: string;
            user_agent: string;
            success: boolean;
        }, {
            user_id: string;
            ip_address: string;
            user_agent: string;
            success: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "user.events";
        type: "user.login";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            ip_address: string;
            user_agent: string;
            success: boolean;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "user.events";
        type: "user.login";
        timestamp: Date;
        data: {
            user_id: string;
            ip_address: string;
            user_agent: string;
            success: boolean;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'user.preferences.updated': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"user.preferences.updated">;
        stream: z.ZodLiteral<"user.events">;
        data: z.ZodObject<{
            user_id: z.ZodString;
            changed_fields: z.ZodArray<z.ZodString, "many">;
            old_values: z.ZodRecord<z.ZodString, z.ZodAny>;
            new_values: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            changed_fields: string[];
            old_values: Record<string, any>;
            new_values: Record<string, any>;
        }, {
            user_id: string;
            changed_fields: string[];
            old_values: Record<string, any>;
            new_values: Record<string, any>;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "user.events";
        type: "user.preferences.updated";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            changed_fields: string[];
            old_values: Record<string, any>;
            new_values: Record<string, any>;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "user.events";
        type: "user.preferences.updated";
        timestamp: Date;
        data: {
            user_id: string;
            changed_fields: string[];
            old_values: Record<string, any>;
            new_values: Record<string, any>;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'file.uploaded': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"file.uploaded">;
        stream: z.ZodLiteral<"contextual.events">;
        data: z.ZodObject<{
            file_id: z.ZodString;
            user_id: z.ZodString;
            contextual_core_id: z.ZodString;
            filename: z.ZodString;
            file_size: z.ZodNumber;
            mime_type: z.ZodString;
            is_browser_viewable: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            file_id: string;
            contextual_core_id: string;
            filename: string;
            file_size: number;
            mime_type: string;
            is_browser_viewable: boolean;
        }, {
            user_id: string;
            file_id: string;
            contextual_core_id: string;
            filename: string;
            file_size: number;
            mime_type: string;
            is_browser_viewable: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "contextual.events";
        type: "file.uploaded";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            file_id: string;
            contextual_core_id: string;
            filename: string;
            file_size: number;
            mime_type: string;
            is_browser_viewable: boolean;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "contextual.events";
        type: "file.uploaded";
        timestamp: Date;
        data: {
            user_id: string;
            file_id: string;
            contextual_core_id: string;
            filename: string;
            file_size: number;
            mime_type: string;
            is_browser_viewable: boolean;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'file.processing.started': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"file.processing.started">;
        stream: z.ZodLiteral<"contextual.events">;
        data: z.ZodObject<{
            file_id: z.ZodString;
            processing_type: z.ZodEnum<["text_extraction", "embedding_generation", "metadata_analysis"]>;
            estimated_duration_ms: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            file_id: string;
            processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
            estimated_duration_ms: number;
        }, {
            file_id: string;
            processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
            estimated_duration_ms: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "contextual.events";
        type: "file.processing.started";
        version: number;
        timestamp: Date;
        data: {
            file_id: string;
            processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
            estimated_duration_ms: number;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "contextual.events";
        type: "file.processing.started";
        timestamp: Date;
        data: {
            file_id: string;
            processing_type: "text_extraction" | "embedding_generation" | "metadata_analysis";
            estimated_duration_ms: number;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'file.processing.completed': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"file.processing.completed">;
        stream: z.ZodLiteral<"contextual.events">;
        data: z.ZodObject<{
            file_id: z.ZodString;
            processing_type: z.ZodString;
            processing_time_ms: z.ZodNumber;
            extracted_text_length: z.ZodOptional<z.ZodNumber>;
            embedding_model_used: z.ZodOptional<z.ZodString>;
            success: z.ZodBoolean;
            error: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            success: boolean;
            file_id: string;
            processing_type: string;
            processing_time_ms: number;
            extracted_text_length?: number | undefined;
            embedding_model_used?: string | undefined;
            error?: string | undefined;
        }, {
            success: boolean;
            file_id: string;
            processing_type: string;
            processing_time_ms: number;
            extracted_text_length?: number | undefined;
            embedding_model_used?: string | undefined;
            error?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "contextual.events";
        type: "file.processing.completed";
        version: number;
        timestamp: Date;
        data: {
            success: boolean;
            file_id: string;
            processing_type: string;
            processing_time_ms: number;
            extracted_text_length?: number | undefined;
            embedding_model_used?: string | undefined;
            error?: string | undefined;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "contextual.events";
        type: "file.processing.completed";
        timestamp: Date;
        data: {
            success: boolean;
            file_id: string;
            processing_type: string;
            processing_time_ms: number;
            extracted_text_length?: number | undefined;
            embedding_model_used?: string | undefined;
            error?: string | undefined;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'embedding.generation.requested': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"embedding.generation.requested">;
        stream: z.ZodLiteral<"contextual.events">;
        data: z.ZodObject<{
            text_content: z.ZodString;
            content_hash: z.ZodString;
            user_id: z.ZodString;
            contextual_core_id: z.ZodString;
            preferred_model: z.ZodOptional<z.ZodString>;
            priority: z.ZodEnum<["low", "normal", "high"]>;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            contextual_core_id: string;
            text_content: string;
            content_hash: string;
            priority: "low" | "normal" | "high";
            preferred_model?: string | undefined;
        }, {
            user_id: string;
            contextual_core_id: string;
            text_content: string;
            content_hash: string;
            priority: "low" | "normal" | "high";
            preferred_model?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "contextual.events";
        type: "embedding.generation.requested";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            text_content: string;
            content_hash: string;
            priority: "low" | "normal" | "high";
            preferred_model?: string | undefined;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "contextual.events";
        type: "embedding.generation.requested";
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            text_content: string;
            content_hash: string;
            priority: "low" | "normal" | "high";
            preferred_model?: string | undefined;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'embedding.generation.completed': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"embedding.generation.completed">;
        stream: z.ZodLiteral<"contextual.events">;
        data: z.ZodObject<{
            embedding_id: z.ZodString;
            content_hash: z.ZodString;
            model_id: z.ZodString;
            dimensions: z.ZodNumber;
            generation_time_ms: z.ZodNumber;
            cost_usd: z.ZodNumber;
            quality_score: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            content_hash: string;
            embedding_id: string;
            model_id: string;
            dimensions: number;
            generation_time_ms: number;
            cost_usd: number;
            quality_score?: number | undefined;
        }, {
            content_hash: string;
            embedding_id: string;
            model_id: string;
            dimensions: number;
            generation_time_ms: number;
            cost_usd: number;
            quality_score?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "contextual.events";
        type: "embedding.generation.completed";
        version: number;
        timestamp: Date;
        data: {
            content_hash: string;
            embedding_id: string;
            model_id: string;
            dimensions: number;
            generation_time_ms: number;
            cost_usd: number;
            quality_score?: number | undefined;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "contextual.events";
        type: "embedding.generation.completed";
        timestamp: Date;
        data: {
            content_hash: string;
            embedding_id: string;
            model_id: string;
            dimensions: number;
            generation_time_ms: number;
            cost_usd: number;
            quality_score?: number | undefined;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'ai.content.generation.requested': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"ai.content.generation.requested">;
        stream: z.ZodLiteral<"ai.events">;
        data: z.ZodObject<{
            request_id: z.ZodString;
            user_id: z.ZodString;
            contextual_core_id: z.ZodString;
            content_type: z.ZodEnum<["social_post", "blog_article", "marketing_copy", "email"]>;
            prompt_template: z.ZodString;
            ai_provider: z.ZodString;
            max_tokens: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            contextual_core_id: string;
            request_id: string;
            content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
            prompt_template: string;
            ai_provider: string;
            max_tokens: number;
        }, {
            user_id: string;
            contextual_core_id: string;
            request_id: string;
            content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
            prompt_template: string;
            ai_provider: string;
            max_tokens: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "ai.events";
        type: "ai.content.generation.requested";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            request_id: string;
            content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
            prompt_template: string;
            ai_provider: string;
            max_tokens: number;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "ai.events";
        type: "ai.content.generation.requested";
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            request_id: string;
            content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
            prompt_template: string;
            ai_provider: string;
            max_tokens: number;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'ai.content.generation.completed': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"ai.content.generation.completed">;
        stream: z.ZodLiteral<"ai.events">;
        data: z.ZodObject<{
            request_id: z.ZodString;
            content_draft_id: z.ZodString;
            generated_content: z.ZodString;
            ai_provider: z.ZodString;
            model_used: z.ZodString;
            tokens_used: z.ZodNumber;
            generation_time_ms: z.ZodNumber;
            cost_usd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            generation_time_ms: number;
            cost_usd: number;
            request_id: string;
            ai_provider: string;
            content_draft_id: string;
            generated_content: string;
            model_used: string;
            tokens_used: number;
        }, {
            generation_time_ms: number;
            cost_usd: number;
            request_id: string;
            ai_provider: string;
            content_draft_id: string;
            generated_content: string;
            model_used: string;
            tokens_used: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "ai.events";
        type: "ai.content.generation.completed";
        version: number;
        timestamp: Date;
        data: {
            generation_time_ms: number;
            cost_usd: number;
            request_id: string;
            ai_provider: string;
            content_draft_id: string;
            generated_content: string;
            model_used: string;
            tokens_used: number;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "ai.events";
        type: "ai.content.generation.completed";
        timestamp: Date;
        data: {
            generation_time_ms: number;
            cost_usd: number;
            request_id: string;
            ai_provider: string;
            content_draft_id: string;
            generated_content: string;
            model_used: string;
            tokens_used: number;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'ai.consultation.requested': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"ai.consultation.requested">;
        stream: z.ZodLiteral<"ai.events">;
        data: z.ZodObject<{
            session_id: z.ZodString;
            user_id: z.ZodString;
            contextual_core_id: z.ZodString;
            query: z.ZodString;
            session_type: z.ZodEnum<["strategic_advice", "trend_analysis", "goal_planning"]>;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            contextual_core_id: string;
            session_id: string;
            query: string;
            session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
        }, {
            user_id: string;
            contextual_core_id: string;
            session_id: string;
            query: string;
            session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "ai.events";
        type: "ai.consultation.requested";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            session_id: string;
            query: string;
            session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "ai.events";
        type: "ai.consultation.requested";
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            session_id: string;
            query: string;
            session_type: "strategic_advice" | "trend_analysis" | "goal_planning";
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'ai.consultation.completed': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"ai.consultation.completed">;
        stream: z.ZodLiteral<"ai.events">;
        data: z.ZodObject<{
            session_id: z.ZodString;
            response: z.ZodString;
            confidence_score: z.ZodNumber;
            market_data_referenced: z.ZodArray<z.ZodString, "many">;
            ai_provider: z.ZodString;
            tokens_used: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            ai_provider: string;
            tokens_used: number;
            session_id: string;
            response: string;
            confidence_score: number;
            market_data_referenced: string[];
        }, {
            ai_provider: string;
            tokens_used: number;
            session_id: string;
            response: string;
            confidence_score: number;
            market_data_referenced: string[];
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "ai.events";
        type: "ai.consultation.completed";
        version: number;
        timestamp: Date;
        data: {
            ai_provider: string;
            tokens_used: number;
            session_id: string;
            response: string;
            confidence_score: number;
            market_data_referenced: string[];
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "ai.events";
        type: "ai.consultation.completed";
        timestamp: Date;
        data: {
            ai_provider: string;
            tokens_used: number;
            session_id: string;
            response: string;
            confidence_score: number;
            market_data_referenced: string[];
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'market.data.collection.started': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"market.data.collection.started">;
        stream: z.ZodLiteral<"market.events">;
        data: z.ZodObject<{
            collection_id: z.ZodString;
            data_source: z.ZodEnum<["reddit", "google_trends", "rss_feeds"]>;
            keywords: z.ZodArray<z.ZodString, "many">;
            user_ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            collection_id: string;
            data_source: "reddit" | "google_trends" | "rss_feeds";
            keywords: string[];
            user_ids: string[];
        }, {
            collection_id: string;
            data_source: "reddit" | "google_trends" | "rss_feeds";
            keywords: string[];
            user_ids: string[];
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "market.events";
        type: "market.data.collection.started";
        version: number;
        timestamp: Date;
        data: {
            collection_id: string;
            data_source: "reddit" | "google_trends" | "rss_feeds";
            keywords: string[];
            user_ids: string[];
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "market.events";
        type: "market.data.collection.started";
        timestamp: Date;
        data: {
            collection_id: string;
            data_source: "reddit" | "google_trends" | "rss_feeds";
            keywords: string[];
            user_ids: string[];
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'market.data.collected': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"market.data.collected">;
        stream: z.ZodLiteral<"market.events">;
        data: z.ZodObject<{
            collection_id: z.ZodString;
            data_source: z.ZodString;
            data_type: z.ZodEnum<["engagement", "trend", "competitor_activity"]>;
            records_collected: z.ZodNumber;
            collection_time_ms: z.ZodNumber;
            data_quality_score: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            collection_id: string;
            data_source: string;
            data_type: "engagement" | "trend" | "competitor_activity";
            records_collected: number;
            collection_time_ms: number;
            data_quality_score: number;
        }, {
            collection_id: string;
            data_source: string;
            data_type: "engagement" | "trend" | "competitor_activity";
            records_collected: number;
            collection_time_ms: number;
            data_quality_score: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "market.events";
        type: "market.data.collected";
        version: number;
        timestamp: Date;
        data: {
            collection_id: string;
            data_source: string;
            data_type: "engagement" | "trend" | "competitor_activity";
            records_collected: number;
            collection_time_ms: number;
            data_quality_score: number;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "market.events";
        type: "market.data.collected";
        timestamp: Date;
        data: {
            collection_id: string;
            data_source: string;
            data_type: "engagement" | "trend" | "competitor_activity";
            records_collected: number;
            collection_time_ms: number;
            data_quality_score: number;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'market.trend.detected': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"market.trend.detected">;
        stream: z.ZodLiteral<"market.events">;
        data: z.ZodObject<{
            trend_id: z.ZodString;
            trend_type: z.ZodEnum<["rising", "declining", "stable"]>;
            keywords: z.ZodArray<z.ZodString, "many">;
            confidence_score: z.ZodNumber;
            affected_users: z.ZodArray<z.ZodString, "many">;
            trend_data: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            confidence_score: number;
            keywords: string[];
            trend_id: string;
            trend_type: "rising" | "declining" | "stable";
            affected_users: string[];
            trend_data: Record<string, any>;
        }, {
            confidence_score: number;
            keywords: string[];
            trend_id: string;
            trend_type: "rising" | "declining" | "stable";
            affected_users: string[];
            trend_data: Record<string, any>;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "market.events";
        type: "market.trend.detected";
        version: number;
        timestamp: Date;
        data: {
            confidence_score: number;
            keywords: string[];
            trend_id: string;
            trend_type: "rising" | "declining" | "stable";
            affected_users: string[];
            trend_data: Record<string, any>;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "market.events";
        type: "market.trend.detected";
        timestamp: Date;
        data: {
            confidence_score: number;
            keywords: string[];
            trend_id: string;
            trend_type: "rising" | "declining" | "stable";
            affected_users: string[];
            trend_data: Record<string, any>;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'notification.send.requested': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"notification.send.requested">;
        stream: z.ZodLiteral<"notification.events">;
        data: z.ZodObject<{
            user_id: z.ZodString;
            notification_type: z.ZodEnum<["briefing_ready", "system_alert", "content_suggestion"]>;
            channels: z.ZodArray<z.ZodEnum<["email", "push", "websocket"]>, "many">;
            message: z.ZodObject<{
                title: z.ZodString;
                body: z.ZodString;
                action_url: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                body: string;
                action_url?: string | undefined;
            }, {
                title: string;
                body: string;
                action_url?: string | undefined;
            }>;
            priority: z.ZodEnum<["low", "normal", "high", "critical"]>;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            message: {
                title: string;
                body: string;
                action_url?: string | undefined;
            };
            priority: "low" | "normal" | "high" | "critical";
            notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
            channels: ("push" | "email" | "websocket")[];
        }, {
            user_id: string;
            message: {
                title: string;
                body: string;
                action_url?: string | undefined;
            };
            priority: "low" | "normal" | "high" | "critical";
            notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
            channels: ("push" | "email" | "websocket")[];
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "notification.events";
        type: "notification.send.requested";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            message: {
                title: string;
                body: string;
                action_url?: string | undefined;
            };
            priority: "low" | "normal" | "high" | "critical";
            notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
            channels: ("push" | "email" | "websocket")[];
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "notification.events";
        type: "notification.send.requested";
        timestamp: Date;
        data: {
            user_id: string;
            message: {
                title: string;
                body: string;
                action_url?: string | undefined;
            };
            priority: "low" | "normal" | "high" | "critical";
            notification_type: "briefing_ready" | "system_alert" | "content_suggestion";
            channels: ("push" | "email" | "websocket")[];
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'notification.delivered': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"notification.delivered">;
        stream: z.ZodLiteral<"notification.events">;
        data: z.ZodObject<{
            notification_id: z.ZodString;
            user_id: z.ZodString;
            channel: z.ZodString;
            delivery_time_ms: z.ZodNumber;
            success: z.ZodBoolean;
            error: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            success: boolean;
            notification_id: string;
            channel: string;
            delivery_time_ms: number;
            error?: string | undefined;
        }, {
            user_id: string;
            success: boolean;
            notification_id: string;
            channel: string;
            delivery_time_ms: number;
            error?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "notification.events";
        type: "notification.delivered";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            success: boolean;
            notification_id: string;
            channel: string;
            delivery_time_ms: number;
            error?: string | undefined;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "notification.events";
        type: "notification.delivered";
        timestamp: Date;
        data: {
            user_id: string;
            success: boolean;
            notification_id: string;
            channel: string;
            delivery_time_ms: number;
            error?: string | undefined;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'briefing.generation.scheduled': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"briefing.generation.scheduled">;
        stream: z.ZodLiteral<"notification.events">;
        data: z.ZodObject<{
            user_id: z.ZodString;
            contextual_core_id: z.ZodString;
            briefing_period: z.ZodEnum<["weekly", "monthly"]>;
            scheduled_time: z.ZodDate;
            period_start: z.ZodDate;
            period_end: z.ZodDate;
        }, "strip", z.ZodTypeAny, {
            user_id: string;
            contextual_core_id: string;
            briefing_period: "weekly" | "monthly";
            scheduled_time: Date;
            period_start: Date;
            period_end: Date;
        }, {
            user_id: string;
            contextual_core_id: string;
            briefing_period: "weekly" | "monthly";
            scheduled_time: Date;
            period_start: Date;
            period_end: Date;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "notification.events";
        type: "briefing.generation.scheduled";
        version: number;
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            briefing_period: "weekly" | "monthly";
            scheduled_time: Date;
            period_start: Date;
            period_end: Date;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "notification.events";
        type: "briefing.generation.scheduled";
        timestamp: Date;
        data: {
            user_id: string;
            contextual_core_id: string;
            briefing_period: "weekly" | "monthly";
            scheduled_time: Date;
            period_start: Date;
            period_end: Date;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'system.service.health': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"system.service.health">;
        stream: z.ZodLiteral<"system.events">;
        data: z.ZodObject<{
            service_name: z.ZodString;
            status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
            response_time_ms: z.ZodNumber;
            memory_usage_mb: z.ZodNumber;
            cpu_usage_percent: z.ZodNumber;
            error_rate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            status: "healthy" | "degraded" | "unhealthy";
            service_name: string;
            response_time_ms: number;
            memory_usage_mb: number;
            cpu_usage_percent: number;
            error_rate: number;
        }, {
            status: "healthy" | "degraded" | "unhealthy";
            service_name: string;
            response_time_ms: number;
            memory_usage_mb: number;
            cpu_usage_percent: number;
            error_rate: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "system.events";
        type: "system.service.health";
        version: number;
        timestamp: Date;
        data: {
            status: "healthy" | "degraded" | "unhealthy";
            service_name: string;
            response_time_ms: number;
            memory_usage_mb: number;
            cpu_usage_percent: number;
            error_rate: number;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "system.events";
        type: "system.service.health";
        timestamp: Date;
        data: {
            status: "healthy" | "degraded" | "unhealthy";
            service_name: string;
            response_time_ms: number;
            memory_usage_mb: number;
            cpu_usage_percent: number;
            error_rate: number;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'system.error.critical': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"system.error.critical">;
        stream: z.ZodLiteral<"system.events">;
        data: z.ZodObject<{
            service_name: z.ZodString;
            error_type: z.ZodString;
            error_message: z.ZodString;
            stack_trace: z.ZodString;
            user_id: z.ZodOptional<z.ZodString>;
            request_id: z.ZodOptional<z.ZodString>;
            requires_immediate_attention: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            service_name: string;
            error_type: string;
            error_message: string;
            stack_trace: string;
            requires_immediate_attention: boolean;
            user_id?: string | undefined;
            request_id?: string | undefined;
        }, {
            service_name: string;
            error_type: string;
            error_message: string;
            stack_trace: string;
            requires_immediate_attention: boolean;
            user_id?: string | undefined;
            request_id?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "system.events";
        type: "system.error.critical";
        version: number;
        timestamp: Date;
        data: {
            service_name: string;
            error_type: string;
            error_message: string;
            stack_trace: string;
            requires_immediate_attention: boolean;
            user_id?: string | undefined;
            request_id?: string | undefined;
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "system.events";
        type: "system.error.critical";
        timestamp: Date;
        data: {
            service_name: string;
            error_type: string;
            error_message: string;
            stack_trace: string;
            requires_immediate_attention: boolean;
            user_id?: string | undefined;
            request_id?: string | undefined;
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    readonly 'system.performance.degraded': z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodDate;
        correlation_id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    } & {
        type: z.ZodLiteral<"system.performance.degraded">;
        stream: z.ZodLiteral<"system.events">;
        data: z.ZodObject<{
            metric_name: z.ZodString;
            current_value: z.ZodNumber;
            threshold_value: z.ZodNumber;
            affected_services: z.ZodArray<z.ZodString, "many">;
            suggested_actions: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            metric_name: string;
            current_value: number;
            threshold_value: number;
            affected_services: string[];
            suggested_actions: string[];
        }, {
            metric_name: string;
            current_value: number;
            threshold_value: number;
            affected_services: string[];
            suggested_actions: string[];
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        stream: "system.events";
        type: "system.performance.degraded";
        version: number;
        timestamp: Date;
        data: {
            metric_name: string;
            current_value: number;
            threshold_value: number;
            affected_services: string[];
            suggested_actions: string[];
        };
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        stream: "system.events";
        type: "system.performance.degraded";
        timestamp: Date;
        data: {
            metric_name: string;
            current_value: number;
            threshold_value: number;
            affected_services: string[];
            suggested_actions: string[];
        };
        version?: number | undefined;
        correlation_id?: string | undefined;
        user_id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
};
export type EventType = keyof typeof EVENT_SCHEMAS;
//# sourceMappingURL=index.d.ts.map