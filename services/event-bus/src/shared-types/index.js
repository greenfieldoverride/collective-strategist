"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProviderError = exports.CollectiveStrategistError = exports.UserPreferencesSchema = exports.StrategistBriefingSchema = exports.BriefingPeriodSchema = exports.ConsultantSessionSchema = exports.SessionTypeSchema = exports.ContentDraftSchema = exports.ContentTypeSchema = exports.MarketDataSchema = exports.DataTypeSchema = exports.DataSourceSchema = exports.ContextualAssetSchema = exports.ContextualCoreSchema = exports.AssetTypeSchema = exports.AIProviderConfigSchema = exports.AIProviderNameSchema = exports.UserSchema = exports.UserTierSchema = void 0;
const zod_1 = require("zod");
// User and Authentication Types
exports.UserTierSchema = zod_1.z.enum(['sovereign_circle', 'individual_pro']);
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    tier: exports.UserTierSchema,
    greenfield_override_id: zod_1.z.string().uuid().optional(),
    is_verified_sovereign_circle: zod_1.z.boolean(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
    last_login_at: zod_1.z.date().optional(),
    is_active: zod_1.z.boolean(),
});
// AI Provider Types
exports.AIProviderNameSchema = zod_1.z.enum(['openai', 'anthropic', 'google', 'default']);
exports.AIProviderConfigSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    provider_name: exports.AIProviderNameSchema,
    api_key_encrypted: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean(),
    rate_limit_per_day: zod_1.z.number().optional(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
});
// Contextual Core Types
exports.AssetTypeSchema = zod_1.z.enum(['brand_asset', 'marketing_material', 'product_info', 'writing_sample', 'competitor_analysis']);
exports.ContextualCoreSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    business_type: zod_1.z.string().optional(),
    target_audience: zod_1.z.string().optional(),
    brand_voice: zod_1.z.string().optional(),
    core_values: zod_1.z.array(zod_1.z.string()),
    primary_goals: zod_1.z.array(zod_1.z.string()),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
});
exports.ContextualAssetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    contextual_core_id: zod_1.z.string().uuid(),
    asset_type: exports.AssetTypeSchema,
    filename: zod_1.z.string(),
    file_path: zod_1.z.string(),
    file_size_bytes: zod_1.z.number().optional(),
    mime_type: zod_1.z.string().optional(),
    vector_embedding: zod_1.z.array(zod_1.z.number()).optional(),
    extracted_text: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    created_at: zod_1.z.date(),
});
// Market Monitor Types
exports.DataSourceSchema = zod_1.z.enum(['twitter', 'linkedin', 'instagram', 'tiktok', 'google_trends', 'reddit']);
exports.DataTypeSchema = zod_1.z.enum(['engagement', 'trend', 'competitor_activity', 'keyword_performance']);
exports.MarketDataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    data_source: exports.DataSourceSchema,
    data_type: exports.DataTypeSchema,
    content: zod_1.z.record(zod_1.z.any()),
    collected_at: zod_1.z.date(),
    processed_at: zod_1.z.date().optional(),
    created_at: zod_1.z.date(),
});
// Content Generation Types
exports.ContentTypeSchema = zod_1.z.enum(['social_post', 'blog_article', 'marketing_copy', 'email']);
exports.ContentDraftSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    contextual_core_id: zod_1.z.string().uuid(),
    content_type: exports.ContentTypeSchema,
    platform: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    content: zod_1.z.string(),
    ai_provider_used: zod_1.z.string().optional(),
    generation_metadata: zod_1.z.record(zod_1.z.any()).optional(),
    is_published: zod_1.z.boolean(),
    published_at: zod_1.z.date().optional(),
    created_at: zod_1.z.date(),
});
// Business Consultant Types
exports.SessionTypeSchema = zod_1.z.enum(['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']);
exports.ConsultantSessionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    contextual_core_id: zod_1.z.string().uuid(),
    session_type: exports.SessionTypeSchema,
    query: zod_1.z.string(),
    response: zod_1.z.string(),
    ai_provider_used: zod_1.z.string().optional(),
    market_data_referenced: zod_1.z.array(zod_1.z.string().uuid()),
    confidence_score: zod_1.z.number().min(0).max(1).optional(),
    session_metadata: zod_1.z.record(zod_1.z.any()).optional(),
    created_at: zod_1.z.date(),
});
// Strategist's Briefing Types
exports.BriefingPeriodSchema = zod_1.z.enum(['weekly', 'monthly']);
exports.StrategistBriefingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    contextual_core_id: zod_1.z.string().uuid(),
    briefing_period: exports.BriefingPeriodSchema,
    period_start_date: zod_1.z.date(),
    period_end_date: zod_1.z.date(),
    what_worked: zod_1.z.string().optional(),
    emerging_opportunities: zod_1.z.string().optional(),
    strategic_recommendations: zod_1.z.string().optional(),
    key_metrics: zod_1.z.record(zod_1.z.any()).optional(),
    ai_provider_used: zod_1.z.string().optional(),
    generation_metadata: zod_1.z.record(zod_1.z.any()).optional(),
    is_sent: zod_1.z.boolean(),
    sent_at: zod_1.z.date().optional(),
    created_at: zod_1.z.date(),
});
// User Preferences Types
exports.UserPreferencesSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    briefing_frequency: exports.BriefingPeriodSchema,
    preferred_ai_provider: zod_1.z.string(),
    notification_preferences: zod_1.z.object({
        email: zod_1.z.boolean(),
        push: zod_1.z.boolean(),
        websocket: zod_1.z.boolean(),
    }),
    timezone: zod_1.z.string(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
});
// Error Types
class CollectiveStrategistError extends Error {
    constructor(message, code, statusCode = 500, context) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.name = 'CollectiveStrategistError';
    }
}
exports.CollectiveStrategistError = CollectiveStrategistError;
class AIProviderError extends CollectiveStrategistError {
    constructor(message, provider, context) {
        super(message, 'AI_PROVIDER_ERROR', 502, { provider, ...context });
        this.provider = provider;
        this.name = 'AIProviderError';
    }
}
exports.AIProviderError = AIProviderError;
//# sourceMappingURL=index.js.map