-- Financial Metrics Schema for Solvency Dashboard
-- Tracks revenue streams, payments, and financial health metrics

-- ============================================================================
-- REVENUE STREAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    stream_name VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL, -- 'stripe', 'etsy', 'paypal', 'manual', etc.
    stream_type VARCHAR(50) NOT NULL, -- 'recurring', 'one_time', 'variable'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FINANCIAL TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    revenue_stream_id UUID REFERENCES revenue_streams(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'income', 'expense'
    category VARCHAR(100), -- 'client_payment', 'platform_fees', 'materials', 'marketing', etc.
    amount DECIMAL(12,2) NOT NULL, -- Amount in cents to avoid floating point issues
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    external_transaction_id VARCHAR(255), -- ID from payment processor
    platform VARCHAR(100), -- Source platform
    client_name VARCHAR(255),
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(100), -- 'credit_card', 'bank_transfer', 'paypal', etc.
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
    fees_amount DECIMAL(12,2) DEFAULT 0, -- Platform/processing fees
    net_amount DECIMAL(12,2), -- Amount after fees
    tags TEXT[], -- Flexible tagging system
    metadata JSONB, -- Store platform-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FINANCIAL GOALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- 'monthly_revenue', 'savings_target', 'debt_reduction'
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    target_date DATE,
    goal_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FINANCIAL INTEGRATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL, -- 'stripe', 'etsy', 'paypal', etc.
    integration_name VARCHAR(255) NOT NULL,
    credentials_encrypted TEXT, -- Encrypted API keys/tokens
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'active', 'error', 'expired'
    error_message TEXT,
    settings JSONB, -- Platform-specific settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MONTHLY FINANCIAL SUMMARIES (Materialized for Performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_financial_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    total_income DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    net_income DECIMAL(12,2) DEFAULT 0,
    platform_fees DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    client_count INTEGER DEFAULT 0,
    avg_transaction_size DECIMAL(12,2) DEFAULT 0,
    largest_transaction DECIMAL(12,2) DEFAULT 0,
    revenue_streams_active INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venture_id, year, month)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Revenue Streams
CREATE INDEX IF NOT EXISTS idx_revenue_streams_venture_id ON revenue_streams(venture_id);
CREATE INDEX IF NOT EXISTS idx_revenue_streams_platform ON revenue_streams(platform);
CREATE INDEX IF NOT EXISTS idx_revenue_streams_active ON revenue_streams(is_active);

-- Financial Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_venture_id ON financial_transactions(venture_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_platform ON financial_transactions(platform);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_revenue_stream ON financial_transactions(revenue_stream_id);

-- Financial Goals
CREATE INDEX IF NOT EXISTS idx_financial_goals_venture_id ON financial_goals(venture_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_active ON financial_goals(is_active);

-- Financial Integrations
CREATE INDEX IF NOT EXISTS idx_integrations_venture_id ON financial_integrations(venture_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON financial_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON financial_integrations(is_active);

-- Monthly Summaries
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_venture_id ON monthly_financial_summaries(venture_id);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_date ON monthly_financial_summaries(year, month);

-- ============================================================================
-- TRIGGERS FOR AUTOMATED CALCULATIONS
-- ============================================================================

-- Function to calculate net amount after fees
CREATE OR REPLACE FUNCTION calculate_net_amount() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.net_amount = NEW.amount - COALESCE(NEW.fees_amount, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate net amount
DROP TRIGGER IF EXISTS trigger_calculate_net_amount ON financial_transactions;
CREATE TRIGGER trigger_calculate_net_amount
    BEFORE INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_net_amount();

-- Function to update monthly summaries
CREATE OR REPLACE FUNCTION update_monthly_summary() 
RETURNS TRIGGER AS $$
DECLARE
    summary_year INTEGER;
    summary_month INTEGER;
BEGIN
    -- Extract year and month from transaction date
    summary_year = EXTRACT(YEAR FROM NEW.transaction_date);
    summary_month = EXTRACT(MONTH FROM NEW.transaction_date);
    
    -- Insert or update monthly summary
    INSERT INTO monthly_financial_summaries (
        venture_id, year, month,
        total_income, total_expenses, net_income, platform_fees, transaction_count
    )
    SELECT 
        NEW.venture_id,
        summary_year,
        summary_month,
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN net_amount ELSE -net_amount END), 0),
        COALESCE(SUM(fees_amount), 0),
        COUNT(*)
    FROM financial_transactions
    WHERE venture_id = NEW.venture_id 
    AND EXTRACT(YEAR FROM transaction_date) = summary_year
    AND EXTRACT(MONTH FROM transaction_date) = summary_month
    AND status = 'completed'
    ON CONFLICT (venture_id, year, month) 
    DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        net_income = EXCLUDED.net_income,
        platform_fees = EXCLUDED.platform_fees,
        transaction_count = EXCLUDED.transaction_count,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update monthly summaries on transaction changes
DROP TRIGGER IF EXISTS trigger_update_monthly_summary ON financial_transactions;
CREATE TRIGGER trigger_update_monthly_summary
    AFTER INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_monthly_summary();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Current month financial overview
CREATE OR REPLACE VIEW current_month_financial_overview AS
SELECT 
    venture_id,
    SUM(CASE WHEN transaction_type = 'income' THEN net_amount ELSE 0 END) as monthly_income,
    SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as monthly_expenses,
    SUM(CASE WHEN transaction_type = 'income' THEN net_amount ELSE -amount END) as monthly_net,
    COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income_transactions,
    COUNT(DISTINCT client_name) as unique_clients,
    AVG(CASE WHEN transaction_type = 'income' THEN amount END) as avg_income_size
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
AND status = 'completed'
GROUP BY venture_id;

-- Revenue stream performance
CREATE OR REPLACE VIEW revenue_stream_performance AS
SELECT 
    rs.venture_id,
    rs.id as revenue_stream_id,
    rs.stream_name,
    rs.platform,
    COUNT(ft.id) as transaction_count,
    SUM(ft.amount) as total_revenue,
    SUM(ft.net_amount) as net_revenue,
    SUM(ft.fees_amount) as total_fees,
    AVG(ft.amount) as avg_transaction_size,
    MAX(ft.transaction_date) as last_transaction_date
FROM revenue_streams rs
LEFT JOIN financial_transactions ft ON rs.id = ft.revenue_stream_id 
    AND ft.transaction_type = 'income' 
    AND ft.status = 'completed'
WHERE rs.is_active = true
GROUP BY rs.venture_id, rs.id, rs.stream_name, rs.platform;

-- ============================================================================
-- HELPER FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function to get financial health score (0-100)
CREATE OR REPLACE FUNCTION get_financial_health_score(p_venture_id UUID)
RETURNS INTEGER AS $$
DECLARE
    health_score INTEGER := 0;
    monthly_income DECIMAL;
    income_consistency DECIMAL;
    expense_ratio DECIMAL;
BEGIN
    -- Get current month income
    SELECT monthly_income INTO monthly_income
    FROM current_month_financial_overview
    WHERE venture_id = p_venture_id;
    
    -- Base score on income level (0-40 points)
    IF monthly_income >= 5000 THEN health_score := health_score + 40;
    ELSIF monthly_income >= 2000 THEN health_score := health_score + 30;
    ELSIF monthly_income >= 1000 THEN health_score := health_score + 20;
    ELSIF monthly_income >= 500 THEN health_score := health_score + 10;
    END IF;
    
    -- Add more sophisticated scoring logic here...
    -- For now, return a simple score
    RETURN GREATEST(0, LEAST(100, health_score + 60)); -- Ensure 0-100 range
END;
$$ LANGUAGE plpgsql;