-- Billing and subscription management tables for LemonSqueezy integration
-- Designed to work with the BillingService

-- Billing customers - maps users to external payment provider customers
CREATE TABLE billing_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_customer_id VARCHAR(255) NOT NULL, -- LemonSqueezy customer ID
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id),
    UNIQUE(external_customer_id)
);

-- Billing subscriptions - tracks user subscriptions
CREATE TABLE billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_subscription_id VARCHAR(255) NOT NULL, -- LemonSqueezy subscription ID
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'paused', 'past_due', 'expired')),
    plan_name VARCHAR(100) NOT NULL, -- 'pro', 'enterprise', etc.
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    interval_type VARCHAR(10) NOT NULL CHECK (interval_type IN ('month', 'year')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(external_subscription_id)
);

-- Billing events - webhook event log for debugging and auditing
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_subscription_id VARCHAR(255), -- Can be null for non-subscription events
    external_customer_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL, -- 'subscription.created', 'payment.succeeded', etc.
    event_data JSONB NOT NULL, -- Full webhook payload
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for event processing
    INDEX idx_billing_events_processed (processed, created_at),
    INDEX idx_billing_events_type (event_type),
    INDEX idx_billing_events_subscription (external_subscription_id)
);

-- Billing invoices - payment history
CREATE TABLE billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_invoice_id VARCHAR(255) NOT NULL, -- LemonSqueezy invoice ID
    external_subscription_id VARCHAR(255), -- Can be null for one-time payments
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    invoice_url TEXT, -- Link to invoice PDF
    payment_method VARCHAR(50), -- 'card', 'paypal', etc.
    billing_reason VARCHAR(100), -- 'subscription_create', 'subscription_cycle', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(external_invoice_id),
    INDEX idx_billing_invoices_user (user_id, created_at),
    INDEX idx_billing_invoices_subscription (external_subscription_id),
    INDEX idx_billing_invoices_status (status)
);

-- User billing settings and preferences
CREATE TABLE user_billing_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_receipts BOOLEAN DEFAULT TRUE,
    email_payment_failed BOOLEAN DEFAULT TRUE,
    email_subscription_changes BOOLEAN DEFAULT TRUE,
    default_payment_method VARCHAR(50),
    billing_address JSONB, -- Store billing address
    tax_id VARCHAR(100), -- For business customers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- User activity log extensions for billing events
-- (extends existing user_activity_log concept)
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'subscription_created', 'payment_failed', 'plan_upgraded', etc.
    details JSONB, -- Additional event data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_user_activity_log_user (user_id, created_at),
    INDEX idx_user_activity_log_action (action)
);

-- User usage metrics for subscription limits
CREATE TABLE user_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'ai_queries', 'ventures_created', 'members_invited', 'integrations_connected'
    count INTEGER NOT NULL DEFAULT 1,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, metric_type, period_start),
    INDEX idx_user_usage_metrics_user_period (user_id, period_start),
    INDEX idx_user_usage_metrics_type (metric_type)
);

-- Apply update triggers to billing tables
CREATE TRIGGER update_billing_customers_updated_at 
    BEFORE UPDATE ON billing_customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_subscriptions_updated_at 
    BEFORE UPDATE ON billing_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_billing_preferences_updated_at 
    BEFORE UPDATE ON user_billing_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add billing-related columns to users table (if not already present)
-- These are for quick subscription status checks without joins
DO $$ 
BEGIN
    -- Add subscription status to users table for quick access
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'none' 
            CHECK (subscription_status IN ('none', 'active', 'cancelled', 'past_due'));
    END IF;
    
    -- Add subscription tier for easy plan-based access control
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subscription_plan') THEN
        ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(50);
    END IF;
    
    -- Add trial end date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Function to sync user subscription status from billing_subscriptions
CREATE OR REPLACE FUNCTION sync_user_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update users table with latest subscription info
    UPDATE users 
    SET 
        subscription_status = NEW.status,
        subscription_plan = NEW.plan_name,
        trial_ends_at = NEW.trial_ends_at,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically sync user subscription status
CREATE TRIGGER sync_user_subscription_status_trigger
    AFTER INSERT OR UPDATE ON billing_subscriptions
    FOR EACH ROW EXECUTE FUNCTION sync_user_subscription_status();

-- Add indexes for billing performance
CREATE INDEX idx_billing_customers_user_id ON billing_customers(user_id);
CREATE INDEX idx_billing_customers_external_id ON billing_customers(external_customer_id);
CREATE INDEX idx_billing_subscriptions_user_id ON billing_subscriptions(user_id);
CREATE INDEX idx_billing_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX idx_billing_subscriptions_external_id ON billing_subscriptions(external_subscription_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status) WHERE subscription_status != 'none';

-- Sample data for development (optional)
-- This can be used for testing the billing system
-- 
-- INSERT INTO billing_customers (user_id, external_customer_id, email, name) 
-- SELECT id, 'cust_test_' || id, email, name 
-- FROM users 
-- WHERE tier = 'sovereign_circle' 
-- LIMIT 3;

COMMENT ON TABLE billing_customers IS 'Maps users to external payment provider customers (LemonSqueezy)';
COMMENT ON TABLE billing_subscriptions IS 'Tracks user subscriptions and their status';
COMMENT ON TABLE billing_events IS 'Log of webhook events from LemonSqueezy for debugging';
COMMENT ON TABLE billing_invoices IS 'Payment history and invoice records';
COMMENT ON TABLE user_billing_preferences IS 'User preferences for billing notifications and settings';
COMMENT ON TABLE user_activity_log IS 'Extended user activity log including billing events';
COMMENT ON TABLE user_usage_metrics IS 'Track usage metrics for subscription limits';

COMMENT ON COLUMN users.subscription_status IS 'Cached subscription status for quick access';
COMMENT ON COLUMN users.subscription_plan IS 'Current subscription plan name';
COMMENT ON COLUMN users.trial_ends_at IS 'When the user trial period ends';