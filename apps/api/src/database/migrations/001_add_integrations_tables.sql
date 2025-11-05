-- Add integration tables for payment platform connections
-- Migration: 001_add_integrations_tables.sql

-- Create financial_integrations table
CREATE TABLE IF NOT EXISTS financial_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    integration_name VARCHAR(255) NOT NULL,
    credentials_encrypted TEXT NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'active',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one integration per platform per venture
    UNIQUE(venture_id, platform)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_integrations_venture_id ON financial_integrations(venture_id);
CREATE INDEX IF NOT EXISTS idx_financial_integrations_platform ON financial_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_financial_integrations_status ON financial_integrations(sync_status);
CREATE INDEX IF NOT EXISTS idx_financial_integrations_active ON financial_integrations(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_integrations_updated_at
    BEFORE UPDATE ON financial_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add integration_platform and integration_external_id to financial_transactions if they don't exist
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS integration_platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS integration_external_id VARCHAR(255);

-- Create index for integration lookups
CREATE INDEX IF NOT EXISTS idx_financial_transactions_integration 
ON financial_transactions(integration_platform, integration_external_id);

-- Add unique constraint to prevent duplicate external transactions
ALTER TABLE financial_transactions 
ADD CONSTRAINT IF NOT EXISTS unique_integration_transaction 
UNIQUE(venture_id, integration_platform, integration_external_id);

-- Insert initial platform data for reference (optional)
INSERT INTO financial_integrations (venture_id, platform, integration_name, credentials_encrypted, sync_status, is_active) 
VALUES 
    ('demo-venture', 'stripe', 'Demo Stripe Integration', 'demo_encrypted_credentials', 'inactive', false),
    ('demo-venture', 'paypal', 'Demo PayPal Integration', 'demo_encrypted_credentials', 'inactive', false)
ON CONFLICT (venture_id, platform) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE financial_integrations IS 'Stores payment platform integration configurations and credentials';
COMMENT ON COLUMN financial_integrations.venture_id IS 'References the venture this integration belongs to';
COMMENT ON COLUMN financial_integrations.platform IS 'Payment platform identifier (stripe, paypal, venmo, wise, square)';
COMMENT ON COLUMN financial_integrations.credentials_encrypted IS 'AES-256-GCM encrypted API credentials';
COMMENT ON COLUMN financial_integrations.sync_status IS 'Integration sync status (active, inactive, error)';
COMMENT ON COLUMN financial_integrations.settings IS 'Platform-specific settings and configuration';

COMMENT ON COLUMN financial_transactions.integration_platform IS 'Source payment platform for this transaction';
COMMENT ON COLUMN financial_transactions.integration_external_id IS 'External platform transaction ID';