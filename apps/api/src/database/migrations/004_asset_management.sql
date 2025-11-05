-- Asset Management System with Tag-based Organization
-- Migration: 004_asset_management

-- Create asset storage table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(100) NOT NULL, -- 'image', 'video', 'document', 'audio', 'font', 'logo', etc.
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL, -- Size in bytes
    file_path TEXT NOT NULL, -- Local file path or URL
    alt_text TEXT, -- For images
    dimensions JSONB, -- For images/videos: {"width": 1920, "height": 1080}
    metadata JSONB, -- Additional metadata like EXIF, duration, etc.
    upload_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'ai_generated', 'import', etc.
    is_brand_asset BOOLEAN DEFAULT false, -- True for brand logos, colors, fonts
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'deleted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- User who uploaded
    
    -- Indexes for performance
    INDEX idx_assets_venture_id (venture_id),
    INDEX idx_assets_file_type (file_type),
    INDEX idx_assets_is_brand_asset (is_brand_asset),
    INDEX idx_assets_status (status),
    INDEX idx_assets_created_at (created_at)
);

-- Create tags table for flexible organization (not folder-based)
CREATE TABLE IF NOT EXISTS asset_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color for UI display
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique tag names per venture
    UNIQUE(venture_id, name),
    INDEX idx_asset_tags_venture_id (venture_id)
);

-- Create asset-tag relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS asset_tag_relationships (
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES asset_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (asset_id, tag_id),
    INDEX idx_asset_tag_rel_asset_id (asset_id),
    INDEX idx_asset_tag_rel_tag_id (tag_id)
);

-- Create brand identity storage table
CREATE TABLE IF NOT EXISTS brand_identity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    element_type VARCHAR(50) NOT NULL, -- 'primary_color', 'secondary_color', 'accent_color', 'primary_font', 'secondary_font', 'logo_primary', 'logo_secondary', etc.
    element_value TEXT NOT NULL, -- Color hex, font name, asset ID, etc.
    element_metadata JSONB, -- Additional data like font weights, color usage guidelines, etc.
    display_name VARCHAR(100), -- Human-readable name
    guidelines TEXT, -- Usage guidelines for this brand element
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique element types per venture (e.g., only one primary color)
    UNIQUE(venture_id, element_type),
    INDEX idx_brand_identity_venture_id (venture_id),
    INDEX idx_brand_identity_element_type (element_type)
);

-- Create asset usage tracking table (for analytics)
CREATE TABLE IF NOT EXISTS asset_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    used_in_type VARCHAR(50) NOT NULL, -- 'content_draft', 'social_post', 'email', 'website', etc.
    used_in_id VARCHAR(255), -- ID of the content where it was used
    usage_context JSONB, -- Additional context about how it was used
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_asset_usage_asset_id (asset_id),
    INDEX idx_asset_usage_used_in_type (used_in_type),
    INDEX idx_asset_usage_used_at (used_at)
);

-- Insert some default brand identity types for new ventures
-- Note: This will need to be run as part of venture creation
INSERT INTO brand_identity (venture_id, element_type, element_value, display_name, guidelines) 
SELECT 
    v.id,
    unnest(ARRAY['primary_color', 'secondary_color', 'accent_color', 'primary_font', 'heading_font']),
    unnest(ARRAY['#3B82F6', '#64748B', '#EF4444', 'Inter', 'Inter']),
    unnest(ARRAY['Primary Color', 'Secondary Color', 'Accent Color', 'Body Font', 'Heading Font']),
    unnest(ARRAY[
        'Main brand color for primary buttons and key elements',
        'Supporting color for backgrounds and secondary elements', 
        'Highlight color for calls-to-action and important information',
        'Main font for body text and general content',
        'Font for headings and titles'
    ])
FROM ventures v
WHERE NOT EXISTS (
    SELECT 1 FROM brand_identity bi WHERE bi.venture_id = v.id
);

-- Create some default tags for content organization
INSERT INTO asset_tags (venture_id, name, color, description)
SELECT 
    v.id,
    unnest(ARRAY['Logo', 'Social Media', 'Marketing', 'Brand Assets', 'Photos', 'Graphics', 'Documents']),
    unnest(ARRAY['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#64748B']),
    unnest(ARRAY[
        'Brand logos and mark variations',
        'Assets optimized for social media platforms',
        'Marketing and promotional materials',
        'Core brand identity elements',
        'Photography and images',
        'Illustrations and graphic elements',
        'PDFs, presentations, and text documents'
    ])
FROM ventures v
WHERE NOT EXISTS (
    SELECT 1 FROM asset_tags at WHERE at.venture_id = v.id
);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at 
    BEFORE UPDATE ON assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_identity_updated_at 
    BEFORE UPDATE ON brand_identity 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();