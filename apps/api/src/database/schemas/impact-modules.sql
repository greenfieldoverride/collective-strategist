-- Dynamic Impact Modules Schema
-- Allows ventures to create custom impact measurement modules

-- Custom Impact Modules
CREATE TABLE IF NOT EXISTS impact_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL, -- URL-friendly identifier
    icon VARCHAR(50), -- Emoji or icon identifier
    description TEXT,
    color VARCHAR(7), -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_system_module BOOLEAN DEFAULT false, -- For pre-built modules
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(venture_id, slug),
    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Custom Metrics within Modules
CREATE TABLE IF NOT EXISTS impact_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES impact_modules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    metric_type VARCHAR(50) NOT NULL, -- 'number', 'currency', 'percentage', 'count', 'text'
    unit VARCHAR(20), -- 'people', 'dollars', 'events', 'stars', etc.
    icon VARCHAR(50),
    context TEXT, -- Liberation-focused explanation
    calculation_method TEXT, -- How this metric is calculated
    target_value DECIMAL(15,2), -- Optional target/goal
    target_period VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(module_id, slug),
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('number', 'currency', 'percentage', 'count', 'text', 'rating'))
);

-- Metric Values (Time Series Data)
CREATE TABLE IF NOT EXISTS impact_metric_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES impact_metrics(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
    value_numeric DECIMAL(15,4), -- For numeric values
    value_text TEXT, -- For text values
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    period_start DATE, -- For aggregated periods
    period_end DATE,
    data_source VARCHAR(100), -- 'integration', 'manual', 'calculated'
    metadata JSONB, -- Additional context/breakdown
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT value_required CHECK (
        (value_numeric IS NOT NULL AND value_text IS NULL) OR
        (value_numeric IS NULL AND value_text IS NOT NULL)
    )
);

-- Integration to Module Mapping
CREATE TABLE IF NOT EXISTS module_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES impact_modules(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    widget_title VARCHAR(255),
    widget_config JSONB, -- Platform-specific configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(module_id, platform)
);

-- Reports Configuration
CREATE TABLE IF NOT EXISTS impact_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'dashboard', 'export', 'scheduled'
    schedule_frequency VARCHAR(20), -- 'weekly', 'monthly', 'quarterly'
    recipients TEXT[], -- Email addresses for scheduled reports
    module_ids UUID[], -- Which modules to include
    date_range_type VARCHAR(20), -- 'last_month', 'last_quarter', 'custom', 'ytd'
    custom_start_date DATE,
    custom_end_date DATE,
    format VARCHAR(20), -- 'pdf', 'csv', 'json', 'dashboard'
    is_active BOOLEAN DEFAULT true,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_report_type CHECK (report_type IN ('dashboard', 'export', 'scheduled')),
    CONSTRAINT valid_schedule CHECK (
        (report_type = 'scheduled' AND schedule_frequency IS NOT NULL) OR
        (report_type != 'scheduled')
    )
);

-- Calculated Metrics (Formulas)
CREATE TABLE IF NOT EXISTS calculated_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES impact_metrics(id) ON DELETE CASCADE,
    formula TEXT NOT NULL, -- SQL-like formula or expression
    dependent_metric_ids UUID[], -- Metrics this calculation depends on
    calculation_frequency VARCHAR(20) DEFAULT 'daily', -- How often to recalculate
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_impact_modules_venture_active ON impact_modules(venture_id, is_active);
CREATE INDEX idx_impact_metrics_module_active ON impact_metrics(module_id, is_active);
CREATE INDEX idx_metric_values_metric_time ON impact_metric_values(metric_id, recorded_at DESC);
CREATE INDEX idx_metric_values_period ON impact_metric_values(period_start, period_end);
CREATE INDEX idx_module_integrations_platform ON module_integrations(platform, is_active);

-- Insert default system modules (liberation-focused)
INSERT INTO impact_modules (venture_id, name, slug, icon, description, color, sort_order, is_system_module, is_active) 
SELECT 
    v.id as venture_id,
    module_data.name,
    module_data.slug,
    module_data.icon,
    module_data.description,
    module_data.color,
    module_data.sort_order,
    true as is_system_module,
    true as is_active
FROM ventures v,
(VALUES 
    ('Community Resilience', 'community', '🌿', 'Building strong, interdependent communities that support each other', '#10b981', 1),
    ('Knowledge Liberation', 'knowledge', '🧠', 'Sharing knowledge freely and building collective intelligence', '#3b82f6', 2),
    ('Cultural Impact', 'cultural', '🎨', 'Creating and preserving culture that reflects our values', '#8b5cf6', 3),
    ('Movement Growth', 'movement', '🚀', 'Growing the liberation movement and inspiring others', '#f59e0b', 4),
    ('Personal Sovereignty', 'sovereignty', '✊', 'Achieving independence from oppressive systems', '#ef4444', 5)
) AS module_data(name, slug, icon, description, color, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM impact_modules im 
    WHERE im.venture_id = v.id 
    AND im.slug = module_data.slug 
    AND im.is_system_module = true
);