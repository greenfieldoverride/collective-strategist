-- Enhanced User Management Migration
-- Adds comprehensive user management features including real auth, sessions, billing

-- Enhanced Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;

-- User Usage Tracking (for tier enforcement)
CREATE TABLE IF NOT EXISTS user_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'ai_queries', 'ventures_created', 'members_invited'
    count INTEGER DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, metric_type, period_start)
);

-- User Sessions (for better security)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT FALSE
);

-- User Activity Log (for security and analytics)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'venture_created', 'member_invited', etc.
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LemonSqueezy subscription tracking
CREATE TABLE IF NOT EXISTS venture_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    lemonsqueezy_subscription_id VARCHAR(255) UNIQUE,
    lemonsqueezy_customer_id VARCHAR(255),
    billing_tier VARCHAR(50) NOT NULL CHECK (billing_tier IN ('liberation', 'collective_basic', 'collective_pro', 'collective_scale')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venture_id)
);

-- LemonSqueezy webhook events log
CREATE TABLE IF NOT EXISTS lemonsqueezy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    subscription_id VARCHAR(255),
    customer_id VARCHAR(255),
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- E-commerce platform connections
CREATE TABLE IF NOT EXISTS ecommerce_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('etsy', 'shopify', 'gumroad', 'kofi', 'square', 'bigcartel')),
    platform_store_id VARCHAR(255), -- Store/shop identifier on platform
    platform_store_name VARCHAR(255),
    auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'webhook')),
    credentials_encrypted TEXT, -- Encrypted API keys/tokens
    webhook_url TEXT, -- For platforms that use webhooks
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(20) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venture_id, platform, platform_store_id)
);

-- E-commerce transactions (extending our financial transactions)
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS ecommerce_platform VARCHAR(50);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS product_id VARCHAR(255);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS product_name VARCHAR(500);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS tax_breakdown JSONB;

-- E-commerce analytics cache
CREATE TABLE IF NOT EXISTS ecommerce_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'daily_sales', 'top_products', 'customer_retention'
    time_period DATE NOT NULL,
    metric_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venture_id, platform, metric_type, time_period)
);

-- Update billing tiers to reflect new LemonSqueezy structure
ALTER TABLE ventures DROP CONSTRAINT IF EXISTS ventures_billing_tier_check;
ALTER TABLE ventures ADD CONSTRAINT ventures_billing_tier_check 
    CHECK (billing_tier IN ('liberation', 'collective_basic', 'collective_pro', 'collective_scale'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_usage_metrics_user_period ON user_usage_metrics(user_id, metric_type, period_start);

CREATE INDEX IF NOT EXISTS idx_venture_subscriptions_venture_id ON venture_subscriptions(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_subscriptions_lemonsqueezy_id ON venture_subscriptions(lemonsqueezy_subscription_id);
CREATE INDEX IF NOT EXISTS idx_venture_subscriptions_status ON venture_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_lemonsqueezy_events_event_id ON lemonsqueezy_events(event_id);
CREATE INDEX IF NOT EXISTS idx_lemonsqueezy_events_processed ON lemonsqueezy_events(processed);

CREATE INDEX IF NOT EXISTS idx_ecommerce_integrations_venture_platform ON ecommerce_integrations(venture_id, platform);
CREATE INDEX IF NOT EXISTS idx_ecommerce_analytics_venture_platform ON ecommerce_analytics(venture_id, platform, time_period);

-- Triggers for timestamp updates
CREATE TRIGGER update_venture_subscriptions_updated_at 
    BEFORE UPDATE ON venture_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ecommerce_integrations_updated_at 
    BEFORE UPDATE ON ecommerce_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log significant user actions
    IF TG_OP = 'UPDATE' THEN
        IF OLD.last_login_at IS DISTINCT FROM NEW.last_login_at THEN
            INSERT INTO user_activity_log (user_id, action, details)
            VALUES (NEW.id, 'login', jsonb_build_object('login_time', NEW.last_login_at));
        END IF;
        
        IF OLD.email_verified IS DISTINCT FROM NEW.email_verified AND NEW.email_verified = TRUE THEN
            INSERT INTO user_activity_log (user_id, action, details)
            VALUES (NEW.id, 'email_verified', jsonb_build_object('verified_at', NOW()));
        END IF;
        
        IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
            INSERT INTO user_activity_log (user_id, action, details)
            VALUES (NEW.id, 'password_changed', jsonb_build_object('changed_at', NOW()));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_user_activity_trigger
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- Function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
END;
$$ language 'plpgsql';

-- Function to enforce user tier limits
CREATE OR REPLACE FUNCTION check_user_tier_limits()
RETURNS TRIGGER AS $$
DECLARE
    user_tier_value VARCHAR(50);
    venture_count INTEGER;
    max_ventures INTEGER;
BEGIN
    -- Get user's tier from their primary venture or default to individual_pro
    SELECT u.tier INTO user_tier_value
    FROM users u 
    WHERE u.id = NEW.primary_billing_owner::UUID;
    
    -- Count current ventures for this user
    SELECT COUNT(*) INTO venture_count
    FROM ventures v
    WHERE v.primary_billing_owner = NEW.primary_billing_owner;
    
    -- Set venture limits based on tier
    CASE user_tier_value
        WHEN 'sovereign_circle' THEN max_ventures := 50;
        WHEN 'individual_pro' THEN max_ventures := 3;
        ELSE max_ventures := 1;
    END CASE;
    
    -- Check if user is within limits (allow liberation tier unlimited)
    IF NEW.billing_tier != 'liberation' AND venture_count >= max_ventures THEN
        RAISE EXCEPTION 'User tier % allows maximum % ventures. Upgrade tier to create more ventures.', 
            user_tier_value, max_ventures;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_venture_tier_limits
    BEFORE INSERT ON ventures
    FOR EACH ROW EXECUTE FUNCTION check_user_tier_limits();