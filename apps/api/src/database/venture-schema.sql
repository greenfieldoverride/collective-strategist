-- Venture-Based Team System Schema
-- Replaces business-centric model with liberation-friendly venture framework
-- Supports sovereign circles, cooperatives, and traditional professional models

-- Ventures table - the core entity that replaces "business"
CREATE TABLE IF NOT EXISTS ventures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    venture_type VARCHAR(50) NOT NULL CHECK (venture_type IN ('sovereign_circle', 'professional', 'cooperative', 'solo')),
    
    -- Billing & Ownership
    primary_billing_owner VARCHAR(255) NOT NULL, -- User ID who handles billing
    billing_tier VARCHAR(50) DEFAULT 'professional' CHECK (billing_tier IN ('liberation', 'professional')),
    max_members INTEGER DEFAULT 1,
    
    -- Liberation-specific
    is_greenfield_affiliate BOOLEAN DEFAULT false,
    sovereign_circle_id VARCHAR(255), -- Link to Greenfield Override circles
    solidarity_network_id VARCHAR(255), -- Mutual aid connections
    
    -- Optional cost-sharing (UI features only, not billing)
    cost_sharing_enabled BOOLEAN DEFAULT false,
    cost_sharing_method VARCHAR(50) CHECK (cost_sharing_method IN ('equal', 'contribution_based', 'custom')),
    cost_sharing_notes TEXT,
    
    -- Core values and goals (moved from contextual_core)
    core_values TEXT[], -- Array of strings
    primary_goals TEXT[], -- Array of strings
    venture_voice TEXT, -- How the venture communicates
    target_audience TEXT,
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Venture members - many-to-many relationship between users and ventures
CREATE TABLE IF NOT EXISTS venture_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'co_owner', 'contributor', 'collaborator', 'observer')),
    permissions TEXT[] DEFAULT '{}', -- Array of permission strings
    
    -- Member-specific settings
    notification_preferences JSONB DEFAULT '{"new_conversations": true, "member_changes": true, "billing_updates": false}',
    cost_share_percentage DECIMAL(5,2), -- For cooperative cost sharing (0.00-100.00)
    
    -- Timestamps and invitation tracking
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invited_by VARCHAR(255), -- User ID who invited this member
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, venture_id)
);

-- Venture invitations - for managing team invites
CREATE TABLE IF NOT EXISTS venture_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_by VARCHAR(255) NOT NULL, -- User ID
    role VARCHAR(50) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Update conversations table to reference ventures instead of contextual cores
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS venture_id UUID REFERENCES ventures(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS legacy_contextual_core_id UUID; -- For migration

-- Venture assets - replaces contextual assets with venture scope
CREATE TABLE IF NOT EXISTS venture_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    extracted_text TEXT,
    
    -- Access control
    uploaded_by VARCHAR(255) NOT NULL, -- User ID
    is_shared_with_team BOOLEAN DEFAULT true,
    access_permissions TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Venture billing history - track subscription changes
CREATE TABLE IF NOT EXISTS venture_billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    billing_tier VARCHAR(50) NOT NULL,
    billing_amount DECIMAL(10,2),
    billing_period_start DATE,
    billing_period_end DATE,
    
    -- Cost sharing info (for transparency)
    cost_sharing_breakdown JSONB, -- Member contributions if applicable
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Solidarity networks - mutual aid and resource sharing between ventures
CREATE TABLE IF NOT EXISTS solidarity_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    network_type VARCHAR(50) DEFAULT 'mutual_aid' CHECK (network_type IN ('mutual_aid', 'resource_sharing', 'collaboration')),
    
    -- Network governance
    governance_model VARCHAR(50) DEFAULT 'consensus' CHECK (governance_model IN ('consensus', 'democratic', 'rotating_leadership')),
    max_ventures INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Network memberships - ventures participating in solidarity networks
CREATE TABLE IF NOT EXISTS network_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    network_id UUID NOT NULL REFERENCES solidarity_networks(id) ON DELETE CASCADE,
    
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'coordinator', 'founder')),
    contribution_type VARCHAR(100), -- What this venture contributes
    resource_needs TEXT[], -- What this venture needs from network
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(venture_id, network_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ventures_billing_owner ON ventures(primary_billing_owner);
CREATE INDEX IF NOT EXISTS idx_ventures_type ON ventures(venture_type);
CREATE INDEX IF NOT EXISTS idx_ventures_status ON ventures(status);
CREATE INDEX IF NOT EXISTS idx_ventures_updated_at ON ventures(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_venture_members_user_id ON venture_members(user_id);
CREATE INDEX IF NOT EXISTS idx_venture_members_venture_id ON venture_members(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_members_role ON venture_members(role);

CREATE INDEX IF NOT EXISTS idx_venture_invitations_email ON venture_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_venture_invitations_token ON venture_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_venture_invitations_status ON venture_invitations(status);

CREATE INDEX IF NOT EXISTS idx_conversations_venture_id ON conversations(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_assets_venture_id ON venture_assets(venture_id);

-- Triggers for timestamp updates
CREATE OR REPLACE FUNCTION update_venture_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ventures 
    SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.venture_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_venture_activity_on_conversation
    AFTER INSERT ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_venture_activity();

CREATE TRIGGER update_venture_activity_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_venture_activity();

-- Function to automatically set billing tier for sovereign circles
CREATE OR REPLACE FUNCTION set_liberation_billing()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.venture_type = 'sovereign_circle' OR NEW.is_greenfield_affiliate = true THEN
        NEW.billing_tier = 'liberation';
        NEW.max_members = 50; -- Generous limit for liberation tier
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_set_liberation_billing
    BEFORE INSERT OR UPDATE ON ventures
    FOR EACH ROW EXECUTE FUNCTION set_liberation_billing();

-- Function to ensure billing owner is a venture member
CREATE OR REPLACE FUNCTION ensure_billing_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM venture_members 
        WHERE venture_id = NEW.id AND user_id = NEW.primary_billing_owner
    ) THEN
        INSERT INTO venture_members (user_id, venture_id, role, permissions)
        VALUES (NEW.primary_billing_owner, NEW.id, 'owner', 
                ARRAY['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'admin_all']);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_billing_owner_is_member
    AFTER INSERT ON ventures
    FOR EACH ROW EXECUTE FUNCTION ensure_billing_owner_membership();