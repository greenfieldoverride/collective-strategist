import { z } from 'zod';

// User and Authentication Types
export const UserTierSchema = z.enum(['sovereign_circle', 'individual_pro']);
export type UserTier = z.infer<typeof UserTierSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  tier: UserTierSchema,
  greenfield_override_id: z.string().uuid().optional(),
  is_verified_sovereign_circle: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  last_login_at: z.date().optional(),
  is_active: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

// AI Provider Types
export const AIProviderNameSchema = z.enum(['openai', 'anthropic', 'google', 'default']);
export type AIProviderName = z.infer<typeof AIProviderNameSchema>;

export const AIProviderConfigSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider_name: AIProviderNameSchema,
  api_key_encrypted: z.string().optional(),
  is_active: z.boolean(),
  rate_limit_per_day: z.number().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

// AI Provider Interface for abstraction layer
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

// Contextual Core Types
export const AssetTypeSchema = z.enum(['brand_asset', 'marketing_material', 'product_info', 'writing_sample', 'competitor_analysis']);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const ContextualCoreSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  business_type: z.string().optional(),
  target_audience: z.string().optional(),
  brand_voice: z.string().optional(),
  core_values: z.array(z.string()),
  primary_goals: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date(),
});
export type ContextualCore = z.infer<typeof ContextualCoreSchema>;

export const ContextualAssetSchema = z.object({
  id: z.string().uuid(),
  contextual_core_id: z.string().uuid(),
  asset_type: AssetTypeSchema,
  filename: z.string(),
  file_path: z.string(),
  file_size_bytes: z.number().optional(),
  mime_type: z.string().optional(),
  vector_embedding: z.array(z.number()).optional(),
  extracted_text: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date(),
});
export type ContextualAsset = z.infer<typeof ContextualAssetSchema>;

// Market Monitor Types
export const DataSourceSchema = z.enum(['twitter', 'linkedin', 'instagram', 'tiktok', 'google_trends', 'reddit']);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const DataTypeSchema = z.enum(['engagement', 'trend', 'competitor_activity', 'keyword_performance']);
export type DataType = z.infer<typeof DataTypeSchema>;

export const MarketDataSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  data_source: DataSourceSchema,
  data_type: DataTypeSchema,
  content: z.record(z.any()),
  collected_at: z.date(),
  processed_at: z.date().optional(),
  created_at: z.date(),
});
export type MarketData = z.infer<typeof MarketDataSchema>;

// Content Generation Types
export const ContentTypeSchema = z.enum(['social_post', 'blog_article', 'marketing_copy', 'email']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentDraftSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  contextual_core_id: z.string().uuid(),
  content_type: ContentTypeSchema,
  platform: z.string().optional(),
  title: z.string().optional(),
  content: z.string(),
  ai_provider_used: z.string().optional(),
  generation_metadata: z.record(z.any()).optional(),
  is_published: z.boolean(),
  published_at: z.date().optional(),
  created_at: z.date(),
});
export type ContentDraft = z.infer<typeof ContentDraftSchema>;

// Business Consultant Types
export const SessionTypeSchema = z.enum(['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']);
export type SessionType = z.infer<typeof SessionTypeSchema>;

export const ConsultantSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  contextual_core_id: z.string().uuid(),
  session_type: SessionTypeSchema,
  query: z.string(),
  response: z.string(),
  ai_provider_used: z.string().optional(),
  market_data_referenced: z.array(z.string().uuid()),
  confidence_score: z.number().min(0).max(1).optional(),
  session_metadata: z.record(z.any()).optional(),
  created_at: z.date(),
});
export type ConsultantSession = z.infer<typeof ConsultantSessionSchema>;

// Strategist's Briefing Types
export const BriefingPeriodSchema = z.enum(['weekly', 'monthly']);
export type BriefingPeriod = z.infer<typeof BriefingPeriodSchema>;

export const StrategistBriefingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  contextual_core_id: z.string().uuid(),
  briefing_period: BriefingPeriodSchema,
  period_start_date: z.date(),
  period_end_date: z.date(),
  what_worked: z.string().optional(),
  emerging_opportunities: z.string().optional(),
  strategic_recommendations: z.string().optional(),
  key_metrics: z.record(z.any()).optional(),
  ai_provider_used: z.string().optional(),
  generation_metadata: z.record(z.any()).optional(),
  is_sent: z.boolean(),
  sent_at: z.date().optional(),
  created_at: z.date(),
});
export type StrategistBriefing = z.infer<typeof StrategistBriefingSchema>;

// User Preferences Types
export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  briefing_frequency: BriefingPeriodSchema,
  preferred_ai_provider: z.string(),
  notification_preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    websocket: z.boolean(),
  }),
  timezone: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// API Response Types
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

// Error Types
export class CollectiveStrategistError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'CollectiveStrategistError';
  }
}

export class AIProviderError extends CollectiveStrategistError {
  constructor(message: string, public provider: AIProviderName, context?: Record<string, any>) {
    super(message, 'AI_PROVIDER_ERROR', 502, { provider, ...context });
    this.name = 'AIProviderError';
  }
}