import { z } from 'zod';
export declare const UserTierSchema: z.ZodEnum<["sovereign_circle", "individual_pro"]>;
export type UserTier = z.infer<typeof UserTierSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    tier: z.ZodEnum<["sovereign_circle", "individual_pro"]>;
    greenfield_override_id: z.ZodOptional<z.ZodString>;
    is_verified_sovereign_circle: z.ZodBoolean;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
    last_login_at: z.ZodOptional<z.ZodDate>;
    is_active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    tier: "sovereign_circle" | "individual_pro";
    is_verified_sovereign_circle: boolean;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    greenfield_override_id?: string | undefined;
    last_login_at?: Date | undefined;
}, {
    id: string;
    email: string;
    tier: "sovereign_circle" | "individual_pro";
    is_verified_sovereign_circle: boolean;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    greenfield_override_id?: string | undefined;
    last_login_at?: Date | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const AIProviderNameSchema: z.ZodEnum<["openai", "anthropic", "google", "default"]>;
export type AIProviderName = z.infer<typeof AIProviderNameSchema>;
export declare const AIProviderConfigSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    provider_name: z.ZodEnum<["openai", "anthropic", "google", "default"]>;
    api_key_encrypted: z.ZodOptional<z.ZodString>;
    is_active: z.ZodBoolean;
    rate_limit_per_day: z.ZodOptional<z.ZodNumber>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    user_id: string;
    provider_name: "openai" | "anthropic" | "google" | "default";
    api_key_encrypted?: string | undefined;
    rate_limit_per_day?: number | undefined;
}, {
    id: string;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    user_id: string;
    provider_name: "openai" | "anthropic" | "google" | "default";
    api_key_encrypted?: string | undefined;
    rate_limit_per_day?: number | undefined;
}>;
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;
export interface AIProvider {
    name: AIProviderName;
    generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse>;
    generateEmbedding(text: string): Promise<number[]>;
    isHealthy(): Promise<boolean>;
}
export interface AIGenerationOptions {
    max_tokens?: number;
    temperature?: number;
    model?: string;
    system_prompt?: string;
}
export interface AIResponse {
    content: string;
    provider: AIProviderName;
    model_used: string;
    tokens_used: number;
    generation_time_ms: number;
    metadata?: Record<string, any>;
}
export declare const AssetTypeSchema: z.ZodEnum<["brand_asset", "marketing_material", "product_info", "writing_sample", "competitor_analysis"]>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export declare const ContextualCoreSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    business_type: z.ZodOptional<z.ZodString>;
    target_audience: z.ZodOptional<z.ZodString>;
    brand_voice: z.ZodOptional<z.ZodString>;
    core_values: z.ZodArray<z.ZodString, "many">;
    primary_goals: z.ZodArray<z.ZodString, "many">;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    name: string;
    core_values: string[];
    primary_goals: string[];
    description?: string | undefined;
    business_type?: string | undefined;
    target_audience?: string | undefined;
    brand_voice?: string | undefined;
}, {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    name: string;
    core_values: string[];
    primary_goals: string[];
    description?: string | undefined;
    business_type?: string | undefined;
    target_audience?: string | undefined;
    brand_voice?: string | undefined;
}>;
export type ContextualCore = z.infer<typeof ContextualCoreSchema>;
export declare const ContextualAssetSchema: z.ZodObject<{
    id: z.ZodString;
    contextual_core_id: z.ZodString;
    asset_type: z.ZodEnum<["brand_asset", "marketing_material", "product_info", "writing_sample", "competitor_analysis"]>;
    filename: z.ZodString;
    file_path: z.ZodString;
    file_size_bytes: z.ZodOptional<z.ZodNumber>;
    mime_type: z.ZodOptional<z.ZodString>;
    vector_embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    extracted_text: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    contextual_core_id: string;
    asset_type: "brand_asset" | "marketing_material" | "product_info" | "writing_sample" | "competitor_analysis";
    filename: string;
    file_path: string;
    file_size_bytes?: number | undefined;
    mime_type?: string | undefined;
    vector_embedding?: number[] | undefined;
    extracted_text?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    created_at: Date;
    contextual_core_id: string;
    asset_type: "brand_asset" | "marketing_material" | "product_info" | "writing_sample" | "competitor_analysis";
    filename: string;
    file_path: string;
    file_size_bytes?: number | undefined;
    mime_type?: string | undefined;
    vector_embedding?: number[] | undefined;
    extracted_text?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type ContextualAsset = z.infer<typeof ContextualAssetSchema>;
export declare const DataSourceSchema: z.ZodEnum<["twitter", "linkedin", "instagram", "tiktok", "google_trends", "reddit"]>;
export type DataSource = z.infer<typeof DataSourceSchema>;
export declare const DataTypeSchema: z.ZodEnum<["engagement", "trend", "competitor_activity", "keyword_performance"]>;
export type DataType = z.infer<typeof DataTypeSchema>;
export declare const MarketDataSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    data_source: z.ZodEnum<["twitter", "linkedin", "instagram", "tiktok", "google_trends", "reddit"]>;
    data_type: z.ZodEnum<["engagement", "trend", "competitor_activity", "keyword_performance"]>;
    content: z.ZodRecord<z.ZodString, z.ZodAny>;
    collected_at: z.ZodDate;
    processed_at: z.ZodOptional<z.ZodDate>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    user_id: string;
    data_source: "twitter" | "linkedin" | "instagram" | "tiktok" | "google_trends" | "reddit";
    data_type: "engagement" | "trend" | "competitor_activity" | "keyword_performance";
    content: Record<string, any>;
    collected_at: Date;
    processed_at?: Date | undefined;
}, {
    id: string;
    created_at: Date;
    user_id: string;
    data_source: "twitter" | "linkedin" | "instagram" | "tiktok" | "google_trends" | "reddit";
    data_type: "engagement" | "trend" | "competitor_activity" | "keyword_performance";
    content: Record<string, any>;
    collected_at: Date;
    processed_at?: Date | undefined;
}>;
export type MarketData = z.infer<typeof MarketDataSchema>;
export declare const ContentTypeSchema: z.ZodEnum<["social_post", "blog_article", "marketing_copy", "email"]>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export declare const ContentDraftSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    contextual_core_id: z.ZodString;
    content_type: z.ZodEnum<["social_post", "blog_article", "marketing_copy", "email"]>;
    platform: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    ai_provider_used: z.ZodOptional<z.ZodString>;
    generation_metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    is_published: z.ZodBoolean;
    published_at: z.ZodOptional<z.ZodDate>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    user_id: string;
    contextual_core_id: string;
    content: string;
    content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
    is_published: boolean;
    platform?: string | undefined;
    title?: string | undefined;
    ai_provider_used?: string | undefined;
    generation_metadata?: Record<string, any> | undefined;
    published_at?: Date | undefined;
}, {
    id: string;
    created_at: Date;
    user_id: string;
    contextual_core_id: string;
    content: string;
    content_type: "email" | "social_post" | "blog_article" | "marketing_copy";
    is_published: boolean;
    platform?: string | undefined;
    title?: string | undefined;
    ai_provider_used?: string | undefined;
    generation_metadata?: Record<string, any> | undefined;
    published_at?: Date | undefined;
}>;
export type ContentDraft = z.infer<typeof ContentDraftSchema>;
export declare const SessionTypeSchema: z.ZodEnum<["strategic_advice", "trend_analysis", "goal_planning", "market_analysis"]>;
export type SessionType = z.infer<typeof SessionTypeSchema>;
export declare const ConsultantSessionSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    contextual_core_id: z.ZodString;
    session_type: z.ZodEnum<["strategic_advice", "trend_analysis", "goal_planning", "market_analysis"]>;
    query: z.ZodString;
    response: z.ZodString;
    ai_provider_used: z.ZodOptional<z.ZodString>;
    market_data_referenced: z.ZodArray<z.ZodString, "many">;
    confidence_score: z.ZodOptional<z.ZodNumber>;
    session_metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    user_id: string;
    contextual_core_id: string;
    session_type: "strategic_advice" | "trend_analysis" | "goal_planning" | "market_analysis";
    query: string;
    response: string;
    market_data_referenced: string[];
    ai_provider_used?: string | undefined;
    confidence_score?: number | undefined;
    session_metadata?: Record<string, any> | undefined;
}, {
    id: string;
    created_at: Date;
    user_id: string;
    contextual_core_id: string;
    session_type: "strategic_advice" | "trend_analysis" | "goal_planning" | "market_analysis";
    query: string;
    response: string;
    market_data_referenced: string[];
    ai_provider_used?: string | undefined;
    confidence_score?: number | undefined;
    session_metadata?: Record<string, any> | undefined;
}>;
export type ConsultantSession = z.infer<typeof ConsultantSessionSchema>;
export declare const BriefingPeriodSchema: z.ZodEnum<["weekly", "monthly"]>;
export type BriefingPeriod = z.infer<typeof BriefingPeriodSchema>;
export declare const StrategistBriefingSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    contextual_core_id: z.ZodString;
    briefing_period: z.ZodEnum<["weekly", "monthly"]>;
    period_start_date: z.ZodDate;
    period_end_date: z.ZodDate;
    what_worked: z.ZodOptional<z.ZodString>;
    emerging_opportunities: z.ZodOptional<z.ZodString>;
    strategic_recommendations: z.ZodOptional<z.ZodString>;
    key_metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    ai_provider_used: z.ZodOptional<z.ZodString>;
    generation_metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    is_sent: z.ZodBoolean;
    sent_at: z.ZodOptional<z.ZodDate>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    user_id: string;
    contextual_core_id: string;
    briefing_period: "weekly" | "monthly";
    period_start_date: Date;
    period_end_date: Date;
    is_sent: boolean;
    ai_provider_used?: string | undefined;
    generation_metadata?: Record<string, any> | undefined;
    what_worked?: string | undefined;
    emerging_opportunities?: string | undefined;
    strategic_recommendations?: string | undefined;
    key_metrics?: Record<string, any> | undefined;
    sent_at?: Date | undefined;
}, {
    id: string;
    created_at: Date;
    user_id: string;
    contextual_core_id: string;
    briefing_period: "weekly" | "monthly";
    period_start_date: Date;
    period_end_date: Date;
    is_sent: boolean;
    ai_provider_used?: string | undefined;
    generation_metadata?: Record<string, any> | undefined;
    what_worked?: string | undefined;
    emerging_opportunities?: string | undefined;
    strategic_recommendations?: string | undefined;
    key_metrics?: Record<string, any> | undefined;
    sent_at?: Date | undefined;
}>;
export type StrategistBriefing = z.infer<typeof StrategistBriefingSchema>;
export declare const UserPreferencesSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    briefing_frequency: z.ZodEnum<["weekly", "monthly"]>;
    preferred_ai_provider: z.ZodString;
    notification_preferences: z.ZodObject<{
        email: z.ZodBoolean;
        push: z.ZodBoolean;
        websocket: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        push: boolean;
        email: boolean;
        websocket: boolean;
    }, {
        push: boolean;
        email: boolean;
        websocket: boolean;
    }>;
    timezone: z.ZodString;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    briefing_frequency: "weekly" | "monthly";
    preferred_ai_provider: string;
    notification_preferences: {
        push: boolean;
        email: boolean;
        websocket: boolean;
    };
    timezone: string;
}, {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    briefing_frequency: "weekly" | "monthly";
    preferred_ai_provider: string;
    notification_preferences: {
        push: boolean;
        email: boolean;
        websocket: boolean;
    };
    timezone: string;
}>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    metadata?: Record<string, any>;
}
export interface PaginatedResponse<T> extends APIResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}
export declare class CollectiveStrategistError extends Error {
    code: string;
    statusCode: number;
    context?: Record<string, any> | undefined;
    constructor(message: string, code: string, statusCode?: number, context?: Record<string, any> | undefined);
}
export declare class AIProviderError extends CollectiveStrategistError {
    provider: AIProviderName;
    constructor(message: string, provider: AIProviderName, context?: Record<string, any>);
}
//# sourceMappingURL=index.d.ts.map