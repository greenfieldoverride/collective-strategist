-- Financial Integrations System Migration
-- Creates all tables needed for the financial integrations system

-- Financial Integrations table
CREATE TABLE IF NOT EXISTS financial_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    credentials JSONB,
    settings JSONB DEFAULT '{}',
    sync_enabled BOOLEAN DEFAULT true,
    webhooks_enabled BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venture_id, platform)
);

-- Financial Transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES financial_integrations(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    transaction_type VARCHAR(50) NOT NULL, -- 'payment', 'refund', 'payout', 'fee', 'transfer'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'cancelled'
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Events table (if not exists from previous migration)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    event_type VARCHAR(50) DEFAULT 'meeting',
    location VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration Sync History table
CREATE TABLE IF NOT EXISTS integration_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES financial_integrations(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'webhook'
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    transactions_added INTEGER DEFAULT 0,
    transactions_updated INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for financial_integrations
CREATE INDEX IF NOT EXISTS idx_financial_integrations_venture_id ON financial_integrations(venture_id);
CREATE INDEX IF NOT EXISTS idx_financial_integrations_platform ON financial_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_financial_integrations_status ON financial_integrations(status);

-- Create indexes for financial_transactions
CREATE INDEX IF NOT EXISTS idx_financial_transactions_venture_id ON financial_transactions(venture_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_integration_id ON financial_transactions(integration_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_external_id ON financial_transactions(external_id);

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_venture_id ON calendar_events(venture_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);

-- Create indexes for integration_sync_history
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_integration_id ON integration_sync_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_status ON integration_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_started_at ON integration_sync_history(started_at DESC);

-- Add constraints
ALTER TABLE financial_integrations 
ADD CONSTRAINT IF NOT EXISTS financial_integrations_status_check 
CHECK (status IN ('active', 'inactive', 'error'));

ALTER TABLE financial_integrations 
ADD CONSTRAINT IF NOT EXISTS financial_integrations_platform_check 
CHECK (platform IN ('stripe', 'paypal', 'venmo', 'wise', 'square', 'lemonsqueezy'));

ALTER TABLE financial_transactions 
ADD CONSTRAINT IF NOT EXISTS financial_transactions_type_check 
CHECK (transaction_type IN ('payment', 'refund', 'payout', 'fee', 'transfer', 'subscription'));

ALTER TABLE financial_transactions 
ADD CONSTRAINT IF NOT EXISTS financial_transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_financial_integrations ON financial_integrations;
CREATE TRIGGER set_timestamp_financial_integrations
    BEFORE UPDATE ON financial_integrations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_financial_transactions ON financial_transactions;
CREATE TRIGGER set_timestamp_financial_transactions
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_calendar_events ON calendar_events;
CREATE TRIGGER set_timestamp_calendar_events
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();