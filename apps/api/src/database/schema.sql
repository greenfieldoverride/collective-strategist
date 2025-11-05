-- Conversation History Schema for AI Consultant
-- This file contains the database schema for storing AI consultant conversations

-- Conversations table - stores conversation sessions
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    contextual_core_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table - stores individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'ai')),
    content TEXT NOT NULL,
    query_text TEXT, -- Original query for AI messages
    confidence_score DECIMAL(3,2), -- AI confidence score (0.00-1.00)
    processing_time_ms INTEGER, -- Time taken to generate AI response
    ai_provider VARCHAR(50), -- e.g., 'anthropic', 'openai'
    ai_model VARCHAR(100), -- e.g., 'claude-3-haiku-20240307'
    token_usage JSONB, -- Token usage information
    metadata JSONB, -- Additional message metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    position_in_conversation INTEGER NOT NULL -- Order within conversation
);

-- Message recommendations - AI-generated recommendations for each message
CREATE TABLE IF NOT EXISTS message_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    recommendation_text TEXT NOT NULL,
    recommendation_type VARCHAR(50), -- e.g., 'strategic', 'tactical', 'next_steps'
    priority INTEGER DEFAULT 1, -- 1 = highest priority
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message attachments - files or data attached to messages
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    attachment_type VARCHAR(50) NOT NULL, -- e.g., 'market_data', 'document', 'image'
    filename VARCHAR(255),
    file_size INTEGER,
    file_path TEXT,
    metadata JSONB, -- File-specific metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversation tags - for categorizing and searching conversations
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_color VARCHAR(20) DEFAULT '#3b82f6', -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, tag_name)
);

-- Conversation shares - for sharing conversations with others
CREATE TABLE IF NOT EXISTS conversation_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    shared_by_user_id VARCHAR(255) NOT NULL,
    shared_with_email VARCHAR(255),
    share_token VARCHAR(255) UNIQUE NOT NULL, -- Public share token
    permission_level VARCHAR(20) DEFAULT 'read' CHECK (permission_level IN ('read', 'comment', 'edit')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences for AI consultant
CREATE TABLE IF NOT EXISTS user_consultant_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    default_session_type VARCHAR(50) DEFAULT 'strategic_advice',
    auto_save_conversations BOOLEAN DEFAULT true,
    export_format_preference VARCHAR(20) DEFAULT 'markdown' CHECK (export_format_preference IN ('markdown', 'pdf', 'json', 'html')),
    ui_theme VARCHAR(20) DEFAULT 'light' CHECK (ui_theme IN ('light', 'dark', 'auto')),
    notification_preferences JSONB DEFAULT '{"new_recommendations": true, "conversation_shared": true, "weekly_summary": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_type ON conversations(session_type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_position ON messages(conversation_id, position_in_conversation);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

CREATE INDEX IF NOT EXISTS idx_message_recommendations_message_id ON message_recommendations(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_name ON conversation_tags(tag_name);

CREATE INDEX IF NOT EXISTS idx_conversation_shares_token ON conversation_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_conversation_id ON conversation_shares(conversation_id);

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_consultant_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation stats
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations 
        SET 
            total_messages = total_messages + 1,
            last_activity_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET 
            total_messages = total_messages - 1,
            last_activity_at = CURRENT_TIMESTAMP
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_stats_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();