-- The Collective Strategist Database Schema
-- Core tables for users, authentication, and the Contextual Core system

-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    tier VARCHAR(20) NOT NULL DEFAULT 'individual_pro' CHECK (tier IN ('sovereign_circle', 'individual_pro')),
    greenfield_override_id UUID,
    is_verified_sovereign_circle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- AI Provider configurations (BYOK support)
CREATE TABLE user_ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL CHECK (provider_name IN ('openai', 'anthropic', 'google', 'default')),
    api_key_encrypted TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_per_day INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider_name)
);

-- Contextual Core - Brand and business context storage
CREATE TABLE contextual_cores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    business_type VARCHAR(100),
    target_audience TEXT,
    brand_voice TEXT,
    core_values TEXT[],
    primary_goals TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets uploaded to the Contextual Core (stored references, actual files in object storage)
CREATE TABLE contextual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contextual_core_id UUID NOT NULL REFERENCES contextual_cores(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('brand_asset', 'marketing_material', 'product_info', 'writing_sample', 'competitor_analysis')),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    extracted_text TEXT,
    is_browser_viewable BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    version INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market monitoring data
CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_source VARCHAR(50) NOT NULL CHECK (data_source IN ('twitter', 'linkedin', 'instagram', 'tiktok', 'google_trends', 'reddit')),
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('engagement', 'trend', 'competitor_activity', 'keyword_performance')),
    content JSONB NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated content drafts
CREATE TABLE content_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contextual_core_id UUID NOT NULL REFERENCES contextual_cores(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('social_post', 'blog_article', 'marketing_copy', 'email')),
    platform VARCHAR(50),
    title VARCHAR(500),
    content TEXT NOT NULL,
    ai_provider_used VARCHAR(50),
    generation_metadata JSONB,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Business Consultant interactions and advice
CREATE TABLE consultant_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contextual_core_id UUID NOT NULL REFERENCES contextual_cores(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis')),
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    ai_provider_used VARCHAR(50),
    market_data_referenced UUID[] DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    session_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- The Strategist's Briefing - Periodic business reviews
CREATE TABLE strategist_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contextual_core_id UUID NOT NULL REFERENCES contextual_cores(id) ON DELETE CASCADE,
    briefing_period VARCHAR(20) NOT NULL CHECK (briefing_period IN ('weekly', 'monthly')),
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    what_worked TEXT,
    emerging_opportunities TEXT,
    strategic_recommendations TEXT,
    key_metrics JSONB,
    ai_provider_used VARCHAR(50),
    generation_metadata JSONB,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    briefing_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (briefing_frequency IN ('weekly', 'monthly')),
    preferred_ai_provider VARCHAR(50) DEFAULT 'default',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "websocket": true}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_contextual_assets_core_id ON contextual_assets(contextual_core_id);
CREATE INDEX idx_contextual_assets_type ON contextual_assets(asset_type);
CREATE INDEX idx_market_data_user_source ON market_data(user_id, data_source);
CREATE INDEX idx_market_data_collected_at ON market_data(collected_at);
CREATE INDEX idx_content_drafts_user_id ON content_drafts(user_id);
CREATE INDEX idx_consultant_sessions_user_id ON consultant_sessions(user_id);
CREATE INDEX idx_strategist_briefings_user_period ON strategist_briefings(user_id, period_start_date);

-- Embedding system indexes
CREATE INDEX idx_embeddings_content_hash ON embeddings(content_hash);
CREATE INDEX idx_embeddings_model_dimensions ON embeddings(model_id, actual_dimensions);
CREATE INDEX idx_asset_embeddings_asset_primary ON asset_embeddings(asset_id, is_primary);
CREATE INDEX idx_similarity_cache_query_model ON similarity_cache(query_hash, model_id);
CREATE INDEX idx_performance_model_time ON embedding_performance_metrics(model_id, recorded_at);

-- Vector similarity search index (for pgvector)
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- OPTIMAL LONG-TERM EMBEDDING ARCHITECTURE

-- Embedding model registry
CREATE TABLE embedding_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'local', 'openai', 'cohere', 'custom'
    version VARCHAR(50) NOT NULL,
    dimensions INTEGER NOT NULL,
    max_tokens INTEGER,
    cost_per_1k_tokens DECIMAL(10,6) DEFAULT 0.0,
    privacy_level INTEGER CHECK (privacy_level BETWEEN 1 AND 10),
    quality_score DECIMAL(3,2), -- Benchmark score
    speed_ms_per_1k_tokens INTEGER,
    memory_requirements_mb INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User embedding preferences
CREATE TABLE user_embedding_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_model_id UUID REFERENCES embedding_models(id),
    fallback_model_id UUID REFERENCES embedding_models(id),
    max_monthly_cost DECIMAL(10,2) DEFAULT 0.0,
    privacy_threshold INTEGER DEFAULT 8, -- Minimum privacy level
    quality_threshold DECIMAL(3,2) DEFAULT 0.7,
    auto_upgrade_models BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Comprehensive embeddings storage
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of original text
    text_content TEXT NOT NULL,
    model_id UUID NOT NULL REFERENCES embedding_models(id),
    embedding VECTOR(4096), -- Max dimension for future-proofing
    actual_dimensions INTEGER NOT NULL,
    generation_time_ms INTEGER,
    cost_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0.0,
    quality_metrics JSONB, -- Confidence scores, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- For cache management
    
    -- Indexes
    UNIQUE(content_hash, model_id) -- Prevent duplicate embeddings
);

-- Asset embeddings mapping (many-to-many)
CREATE TABLE asset_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES contextual_assets(id) ON DELETE CASCADE,
    embedding_id UUID NOT NULL REFERENCES embeddings(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    chunk_index INTEGER DEFAULT 0, -- For multi-chunk documents
    chunk_text TEXT, -- Original text chunk
    relevance_score DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(asset_id, embedding_id, chunk_index)
);

-- Embedding performance tracking
CREATE TABLE embedding_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES embedding_models(id),
    user_id UUID REFERENCES users(id),
    operation_type VARCHAR(50) NOT NULL, -- 'generation', 'search', 'similarity'
    input_tokens INTEGER,
    processing_time_ms INTEGER,
    memory_used_mb INTEGER,
    cost_usd DECIMAL(10,6),
    quality_score DECIMAL(3,2),
    error_rate DECIMAL(3,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Similarity search cache
CREATE TABLE similarity_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    model_id UUID NOT NULL REFERENCES embedding_models(id),
    search_params JSONB NOT NULL, -- threshold, limit, filters
    results JSONB NOT NULL, -- Cached similarity results
    hit_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    
    UNIQUE(query_hash, model_id)
);

-- Embedding quality feedback
CREATE TABLE embedding_quality_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    embedding_id UUID NOT NULL REFERENCES embeddings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    feedback_type VARCHAR(50) NOT NULL, -- 'similarity_rating', 'relevance_score'
    rating DECIMAL(3,2) NOT NULL CHECK (rating BETWEEN 0 AND 1),
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model performance benchmarks
CREATE TABLE model_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES embedding_models(id),
    benchmark_name VARCHAR(100) NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    dataset_name VARCHAR(100),
    benchmark_date DATE NOT NULL,
    metadata JSONB,
    
    UNIQUE(model_id, benchmark_name, benchmark_date)
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_ai_providers_updated_at BEFORE UPDATE ON user_ai_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contextual_cores_updated_at BEFORE UPDATE ON contextual_cores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_embedding_preferences_updated_at BEFORE UPDATE ON user_embedding_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default embedding models
INSERT INTO embedding_models (name, provider, version, dimensions, cost_per_1k_tokens, privacy_level, quality_score, speed_ms_per_1k_tokens, memory_requirements_mb, metadata) VALUES
('all-mpnet-base-v2', 'local', '2.2.2', 768, 0.0, 10, 0.85, 50, 420, '{"description": "High-quality sentence transformer, privacy-first default"}'),
('all-MiniLM-L6-v2', 'local', '2.2.2', 384, 0.0, 10, 0.75, 25, 80, '{"description": "Fast and lightweight sentence transformer"}'),
('text-embedding-3-small', 'openai', '3', 1536, 0.02, 2, 0.95, 100, 0, '{"description": "OpenAI high-quality embeddings, requires API key"}'),
('text-embedding-3-large', 'openai', '3', 3072, 0.13, 2, 0.98, 150, 0, '{"description": "OpenAI premium embeddings, highest quality"}');