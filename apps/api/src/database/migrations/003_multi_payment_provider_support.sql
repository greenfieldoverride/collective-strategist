-- Migration: Multi-Payment Provider Support
-- Purpose: Support multiple payment providers following Stripe's acquisition of LemonSqueezy
-- Author: Liberation Technology Team
-- Date: 2025-10-21

-- Add payment provider support to venture subscriptions
ALTER TABLE venture_subscriptions 
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'lemonsqueezy' 
CHECK (payment_provider IN ('lemonsqueezy', 'stripe', 'paddle', 'direct'));

-- Add external subscription ID column for provider flexibility
ALTER TABLE venture_subscriptions 
ADD COLUMN IF NOT EXISTS external_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_customer_id VARCHAR(255);

-- Update existing subscriptions to use new columns
UPDATE venture_subscriptions 
SET external_subscription_id = lemonsqueezy_subscription_id,
    external_customer_id = lemonsqueezy_customer_id,
    payment_provider = 'lemonsqueezy'
WHERE lemonsqueezy_subscription_id IS NOT NULL;

-- Generic webhook events table for all payment providers
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    subscription_id VARCHAR(255),
    customer_id VARCHAR(255),
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, event_id)
);

-- Liberation-focused payment options table
CREATE TABLE IF NOT EXISTS liberation_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('crypto', 'direct_transfer', 'cooperative_exchange', 'mutual_aid')),
    method_details JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment provider configuration for ventures
CREATE TABLE IF NOT EXISTS venture_payment_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    preferred_provider VARCHAR(50) NOT NULL,
    backup_provider VARCHAR(50),
    liberation_payment_enabled BOOLEAN DEFAULT FALSE,
    provider_configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venture_id)
);

-- Migration log for tracking provider changes
CREATE TABLE IF NOT EXISTS payment_provider_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    from_provider VARCHAR(50),
    to_provider VARCHAR(50) NOT NULL,
    migration_reason TEXT,
    migration_status VARCHAR(20) DEFAULT 'pending' CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed')),
    migration_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_venture_subscriptions_provider ON venture_subscriptions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_venture_subscriptions_external_id ON venture_subscriptions(external_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider ON payment_webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_processed ON payment_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_liberation_payment_methods_venture ON liberation_payment_methods(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_payment_preferences_venture ON venture_payment_preferences(venture_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_migrations_venture ON payment_provider_migrations(venture_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_migrations_status ON payment_provider_migrations(migration_status);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_liberation_payment_methods_updated_at 
    BEFORE UPDATE ON liberation_payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venture_payment_preferences_updated_at 
    BEFORE UPDATE ON venture_payment_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle payment provider migration
CREATE OR REPLACE FUNCTION migrate_payment_provider(
    p_venture_id UUID,
    p_from_provider VARCHAR(50),
    p_to_provider VARCHAR(50),
    p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    migration_id UUID;
BEGIN
    -- Insert migration record
    INSERT INTO payment_provider_migrations (
        venture_id, 
        from_provider, 
        to_provider, 
        migration_reason,
        migration_status
    ) VALUES (
        p_venture_id, 
        p_from_provider, 
        p_to_provider, 
        p_reason,
        'pending'
    ) RETURNING id INTO migration_id;
    
    -- Log the migration request
    INSERT INTO user_activity_log (user_id, action, details) 
    SELECT u.id, 'payment_provider_migration_requested', 
           jsonb_build_object(
               'migration_id', migration_id,
               'from_provider', p_from_provider,
               'to_provider', p_to_provider,
               'reason', p_reason
           )
    FROM users u 
    JOIN ventures v ON v.steward_id = u.id 
    WHERE v.id = p_venture_id;
    
    RETURN migration_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check venture liberation status
CREATE OR REPLACE FUNCTION is_liberation_venture(p_venture_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ventures v
        JOIN users u ON v.steward_id = u.id
        WHERE v.id = p_venture_id 
        AND (
            u.tier = 'sovereign_circle' 
            OR u.is_verified_sovereign_circle = true
            OR v.name ILIKE '%liberation%'
            OR v.name ILIKE '%collective%'
            OR v.name ILIKE '%cooperative%'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default payment preferences for existing ventures
INSERT INTO venture_payment_preferences (venture_id, preferred_provider, backup_provider, liberation_payment_enabled)
SELECT 
    v.id,
    'lemonsqueezy' as preferred_provider,
    'paddle' as backup_provider,
    is_liberation_venture(v.id) as liberation_payment_enabled
FROM ventures v
WHERE NOT EXISTS (
    SELECT 1 FROM venture_payment_preferences vpp 
    WHERE vpp.venture_id = v.id
);

-- Add helpful comments
COMMENT ON TABLE payment_webhook_events IS 'Generic webhook events from all payment providers';
COMMENT ON TABLE liberation_payment_methods IS 'Alternative payment methods for liberation-focused ventures';
COMMENT ON TABLE venture_payment_preferences IS 'Payment provider preferences per venture';
COMMENT ON TABLE payment_provider_migrations IS 'Log of payment provider migration activities';

COMMENT ON COLUMN venture_subscriptions.payment_provider IS 'Current payment provider: lemonsqueezy, stripe, paddle, or direct';
COMMENT ON COLUMN venture_subscriptions.external_subscription_id IS 'Provider-specific subscription ID';
COMMENT ON COLUMN venture_subscriptions.external_customer_id IS 'Provider-specific customer ID';

-- Liberation-focused documentation
COMMENT ON FUNCTION is_liberation_venture IS 'Determines if a venture qualifies for liberation-focused payment options';
COMMENT ON FUNCTION migrate_payment_provider IS 'Initiates payment provider migration process for a venture';