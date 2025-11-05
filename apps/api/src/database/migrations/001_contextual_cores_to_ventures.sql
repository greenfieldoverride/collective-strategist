-- Migration: Contextual Cores to Ventures
-- This migration script handles the transition from contextual cores to ventures
-- It preserves all existing data while migrating to the new venture-based structure

-- ============================================================================
-- STEP 1: CREATE CONTEXTUAL CORES TABLE (if it doesn't exist)
-- ============================================================================

-- Create contextual_cores table based on the existing TypeScript interface
CREATE TABLE IF NOT EXISTS contextual_cores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    business_type VARCHAR(255),
    target_audience TEXT,
    brand_voice TEXT,
    core_values TEXT[] DEFAULT '{}',
    primary_goals TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contextual_cores_user_id ON contextual_cores(user_id);
CREATE INDEX IF NOT EXISTS idx_contextual_cores_name ON contextual_cores(name);

-- ============================================================================
-- STEP 2: MIGRATION FUNCTION - CONTEXTUAL CORES TO VENTURES
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_contextual_cores_to_ventures()
RETURNS TABLE (
    migrated_count INTEGER,
    failed_count INTEGER,
    migration_log TEXT[]
) AS $$
DECLARE
    core_record RECORD;
    new_venture_id UUID;
    venture_type VARCHAR(50);
    billing_tier VARCHAR(50);
    max_members INTEGER;
    log_messages TEXT[] := '{}';
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
BEGIN
    -- Log start of migration
    log_messages := array_append(log_messages, 'Starting migration of contextual cores to ventures at ' || CURRENT_TIMESTAMP);
    
    -- Loop through all contextual cores
    FOR core_record IN 
        SELECT * FROM contextual_cores 
        WHERE id NOT IN (
            SELECT legacy_contextual_core_id 
            FROM conversations 
            WHERE legacy_contextual_core_id IS NOT NULL
        )
    LOOP
        BEGIN
            -- Generate new venture ID
            new_venture_id := gen_random_uuid();
            
            -- Determine venture type based on business_type
            venture_type := CASE 
                WHEN core_record.business_type ILIKE '%cooperative%' THEN 'cooperative'
                WHEN core_record.business_type ILIKE '%collective%' THEN 'sovereign_circle'
                WHEN core_record.business_type ILIKE '%solo%' OR core_record.business_type ILIKE '%individual%' THEN 'solo'
                ELSE 'professional'
            END;
            
            -- Determine billing tier and max members
            IF venture_type = 'sovereign_circle' THEN
                billing_tier := 'liberation';
                max_members := 50;
            ELSIF venture_type = 'cooperative' THEN
                billing_tier := 'professional';
                max_members := 10;
            ELSIF venture_type = 'solo' THEN
                billing_tier := 'professional';
                max_members := 1;
            ELSE
                billing_tier := 'professional';
                max_members := 5;
            END IF;
            
            -- Insert into ventures table
            INSERT INTO ventures (
                id,
                name,
                description,
                venture_type,
                primary_billing_owner,
                billing_tier,
                max_members,
                is_greenfield_affiliate,
                core_values,
                primary_goals,
                venture_voice,
                target_audience,
                status,
                created_at,
                updated_at,
                last_activity_at
            ) VALUES (
                new_venture_id,
                core_record.name,
                core_record.description,
                venture_type,
                core_record.user_id,
                billing_tier,
                max_members,
                false, -- Default to false, can be updated manually if needed
                COALESCE(core_record.core_values, '{}'),
                COALESCE(core_record.primary_goals, '{}'),
                core_record.brand_voice,
                core_record.target_audience,
                'active',
                core_record.created_at,
                core_record.updated_at,
                COALESCE(core_record.updated_at, core_record.created_at)
            );
            
            -- The venture member will be automatically created by the trigger
            
            -- Update conversations to reference the new venture
            UPDATE conversations 
            SET 
                venture_id = new_venture_id,
                legacy_contextual_core_id = contextual_core_id
            WHERE contextual_core_id = core_record.id;
            
            -- Log successful migration
            log_messages := array_append(log_messages, 
                'Migrated contextual core "' || core_record.name || '" (' || core_record.id || ') to venture (' || new_venture_id || ') with type: ' || venture_type
            );
            
            success_count := success_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log the error and continue with next record
            log_messages := array_append(log_messages, 
                'FAILED to migrate contextual core "' || core_record.name || '" (' || core_record.id || '): ' || SQLERRM
            );
            fail_count := fail_count + 1;
        END;
    END LOOP;
    
    -- Log completion
    log_messages := array_append(log_messages, 
        'Migration completed at ' || CURRENT_TIMESTAMP || '. Migrated: ' || success_count || ', Failed: ' || fail_count
    );
    
    RETURN QUERY SELECT success_count, fail_count, log_messages;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: ROLLBACK FUNCTION (for testing and emergency use)
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_venture_migration()
RETURNS TABLE (
    restored_count INTEGER,
    rollback_log TEXT[]
) AS $$
DECLARE
    log_messages TEXT[] := '{}';
    restored_count INTEGER := 0;
BEGIN
    -- Log start of rollback
    log_messages := array_append(log_messages, 'Starting rollback of venture migration at ' || CURRENT_TIMESTAMP);
    
    -- Restore conversations to use contextual_core_id
    UPDATE conversations 
    SET 
        contextual_core_id = legacy_contextual_core_id,
        venture_id = NULL
    WHERE legacy_contextual_core_id IS NOT NULL;
    
    GET DIAGNOSTICS restored_count = ROW_COUNT;
    
    log_messages := array_append(log_messages, 'Restored ' || restored_count || ' conversations to use contextual_core_id');
    
    -- Note: We don't delete ventures or venture_members as they might have new data
    -- This is intentionally a partial rollback for safety
    
    log_messages := array_append(log_messages, 
        'Rollback completed at ' || CURRENT_TIMESTAMP || '. Note: Ventures and members were preserved for safety.'
    );
    
    RETURN QUERY SELECT restored_count, log_messages;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: MIGRATION VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_migration()
RETURNS TABLE (
    validation_status TEXT,
    contextual_cores_count INTEGER,
    ventures_count INTEGER,
    conversations_with_ventures INTEGER,
    conversations_with_legacy INTEGER,
    orphaned_conversations INTEGER,
    validation_details TEXT[]
) AS $$
DECLARE
    cc_count INTEGER;
    v_count INTEGER;
    conv_venture_count INTEGER;
    conv_legacy_count INTEGER;
    orphaned_count INTEGER;
    details TEXT[] := '{}';
    status TEXT := 'PASSED';
BEGIN
    -- Count contextual cores
    SELECT COUNT(*) INTO cc_count FROM contextual_cores;
    
    -- Count ventures
    SELECT COUNT(*) INTO v_count FROM ventures;
    
    -- Count conversations with venture_id
    SELECT COUNT(*) INTO conv_venture_count 
    FROM conversations 
    WHERE venture_id IS NOT NULL;
    
    -- Count conversations with legacy contextual_core_id
    SELECT COUNT(*) INTO conv_legacy_count 
    FROM conversations 
    WHERE legacy_contextual_core_id IS NOT NULL;
    
    -- Count orphaned conversations (have contextual_core_id but no venture_id or legacy_contextual_core_id)
    SELECT COUNT(*) INTO orphaned_count 
    FROM conversations 
    WHERE contextual_core_id IS NOT NULL 
    AND venture_id IS NULL 
    AND legacy_contextual_core_id IS NULL;
    
    -- Validation checks
    IF orphaned_count > 0 THEN
        status := 'WARNING';
        details := array_append(details, orphaned_count || ' conversations are orphaned (not migrated)');
    END IF;
    
    IF conv_legacy_count = 0 AND cc_count > 0 THEN
        status := 'WARNING';
        details := array_append(details, 'No legacy references found but contextual cores exist');
    END IF;
    
    -- Add informational details
    details := array_append(details, 'Contextual cores found: ' || cc_count);
    details := array_append(details, 'Ventures created: ' || v_count);
    details := array_append(details, 'Conversations linked to ventures: ' || conv_venture_count);
    details := array_append(details, 'Conversations with legacy references: ' || conv_legacy_count);
    
    RETURN QUERY SELECT status, cc_count, v_count, conv_venture_count, conv_legacy_count, orphaned_count, details;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: SAMPLE DATA FOR TESTING (if needed)
-- ============================================================================

-- Insert sample contextual cores for testing (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM contextual_cores LIMIT 1) THEN
        -- Insert sample data for testing
        INSERT INTO contextual_cores (id, user_id, name, description, business_type, core_values, primary_goals) VALUES
        ('11111111-1111-1111-1111-111111111111', 'user-1', 'Liberation Collective', 'A community mutual aid organization', 'collective', 
         ARRAY['mutual aid', 'community care'], ARRAY['support neighbors', 'build solidarity']),
        ('22222222-2222-2222-2222-222222222222', 'user-2', 'Tech Startup', 'A professional software company', 'startup',
         ARRAY['innovation', 'growth'], ARRAY['build product', 'scale team']),
        ('33333333-3333-3333-3333-333333333333', 'user-3', 'Freelance Designer', 'Solo design practice', 'solo',
         ARRAY['creativity', 'quality'], ARRAY['grow client base', 'improve skills']);
         
        -- Insert sample conversations
        INSERT INTO conversations (id, user_id, contextual_core_id, title, session_type) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user-1', '11111111-1111-1111-1111-111111111111', 'Community Organizing Strategy', 'strategic_advice'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-2', '22222222-2222-2222-2222-222222222222', 'Product Market Fit', 'market_analysis'),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user-3', '33333333-3333-3333-3333-333333333333', 'Client Acquisition', 'goal_planning');
    END IF;
END $$;

-- ============================================================================
-- MIGRATION EXECUTION INSTRUCTIONS
-- ============================================================================

-- To run the migration:
-- SELECT * FROM migrate_contextual_cores_to_ventures();

-- To validate the migration:
-- SELECT * FROM validate_migration();

-- To rollback (emergency only):
-- SELECT * FROM rollback_venture_migration();

-- After successful migration and validation, you can optionally:
-- 1. Keep contextual_cores table for historical reference
-- 2. Or drop it if you're confident in the migration:
--    DROP TABLE contextual_cores CASCADE;