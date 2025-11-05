-- Test Financial Data for Development
-- Creates realistic financial data for testing the solvency dashboard

-- ============================================================================
-- SETUP: Get a test venture ID to work with
-- ============================================================================

DO $$
DECLARE
    test_venture_id UUID;
    freelancer_venture_id UUID;
    creative_venture_id UUID;
    stream_id_1 UUID;
    stream_id_2 UUID;
    stream_id_3 UUID;
    stream_id_4 UUID;
    stream_id_5 UUID;
    stream_id_6 UUID;
BEGIN
    -- Create test ventures if they don't exist
    INSERT INTO ventures (
        id, name, description, venture_type, primary_billing_owner, billing_tier, max_members
    ) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'Liberation Web Collective', 
        'A sovereign circle focused on web development for social justice organizations',
        'sovereign_circle',
        'dev-user-1',
        'liberation',
        50
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'Sarah''s Design Studio',
        'Freelance graphic design and branding services',
        'solo',
        'dev-user-2', 
        'professional',
        1
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'Pixel Art Emporium',
        'Digital art and print-on-demand business',
        'solo',
        'dev-user-3',
        'professional', 
        1
    )
    ON CONFLICT (id) DO NOTHING;

    -- Set our test venture IDs
    test_venture_id := '550e8400-e29b-41d4-a716-446655440001';
    freelancer_venture_id := '550e8400-e29b-41d4-a716-446655440002';
    creative_venture_id := '550e8400-e29b-41d4-a716-446655440003';

-- ============================================================================
-- REVENUE STREAMS
-- ============================================================================

    -- Liberation Web Collective Revenue Streams
    INSERT INTO revenue_streams (id, venture_id, stream_name, platform, stream_type, description) VALUES
    (gen_random_uuid(), test_venture_id, 'Client Web Development', 'manual', 'variable', 'Custom website builds for nonprofits'),
    (gen_random_uuid(), test_venture_id, 'Mutual Aid Platform Donations', 'stripe', 'variable', 'Community donations through our platform'),
    (gen_random_uuid(), test_venture_id, 'Workshop Teaching', 'manual', 'one_time', 'Web development workshops and training');

    -- Freelancer Revenue Streams  
    INSERT INTO revenue_streams (id, venture_id, stream_name, platform, stream_type, description) VALUES
    (gen_random_uuid(), freelancer_venture_id, 'Logo Design Projects', 'upwork', 'one_time', 'Logo and branding projects via Upwork'),
    (gen_random_uuid(), freelancer_venture_id, 'Retainer Clients', 'stripe', 'recurring', 'Monthly retainer for ongoing design work'),
    (gen_random_uuid(), freelancer_venture_id, 'Direct Client Work', 'manual', 'one_time', 'Direct client projects outside platforms');

    -- Creative Artist Revenue Streams
    INSERT INTO revenue_streams (id, venture_id, stream_name, platform, stream_type, description) VALUES
    (gen_random_uuid(), creative_venture_id, 'Etsy Art Prints', 'etsy', 'variable', 'Original art prints and digital downloads'),
    (gen_random_uuid(), creative_venture_id, 'Redbubble POD', 'redbubble', 'variable', 'Print-on-demand merchandise'),
    (gen_random_uuid(), creative_venture_id, 'Commission Work', 'paypal', 'one_time', 'Custom digital art commissions');

-- ============================================================================
-- FINANCIAL TRANSACTIONS - LIBERATION WEB COLLECTIVE
-- ============================================================================

    -- Get revenue stream IDs for the collective
    SELECT id INTO stream_id_1 FROM revenue_streams WHERE venture_id = test_venture_id AND stream_name = 'Client Web Development';
    SELECT id INTO stream_id_2 FROM revenue_streams WHERE venture_id = test_venture_id AND stream_name = 'Mutual Aid Platform Donations';
    SELECT id INTO stream_id_3 FROM revenue_streams WHERE venture_id = test_venture_id AND stream_name = 'Workshop Teaching';

    -- October 2024 Transactions
    INSERT INTO financial_transactions (
        venture_id, revenue_stream_id, transaction_type, category, amount, description, 
        platform, client_name, transaction_date, payment_method, fees_amount
    ) VALUES
    -- Income transactions
    (test_venture_id, stream_id_1, 'income', 'client_payment', 2500.00, 'Website for Food Justice Coalition', 'manual', 'Food Justice Coalition', '2024-10-01', 'bank_transfer', 0),
    (test_venture_id, stream_id_2, 'income', 'donation', 150.00, 'Monthly community supporter', 'stripe', 'Anonymous Supporter', '2024-10-03', 'credit_card', 4.50),
    (test_venture_id, stream_id_1, 'income', 'client_payment', 1800.00, 'Site maintenance for Tenants Union', 'manual', 'Metro Tenants Union', '2024-10-05', 'check', 0),
    (test_venture_id, stream_id_2, 'income', 'donation', 75.00, 'Workshop attendee tip', 'stripe', 'Workshop Participant', '2024-10-08', 'credit_card', 2.25),
    (test_venture_id, stream_id_3, 'income', 'workshop_fee', 400.00, 'Web Dev Basics Workshop', 'manual', 'Community Center', '2024-10-10', 'cash', 0),
    (test_venture_id, stream_id_1, 'income', 'client_payment', 3200.00, 'E-commerce site for Worker Coop', 'manual', 'Solidarity Printing Coop', '2024-10-15', 'bank_transfer', 0),
    (test_venture_id, stream_id_2, 'income', 'donation', 200.00, 'Large supporter contribution', 'stripe', 'Liberation Tech Fund', '2024-10-20', 'credit_card', 6.00),
    (test_venture_id, stream_id_3, 'income', 'workshop_fee', 600.00, 'Advanced Workshop Series', 'manual', 'Tech for Good Bootcamp', '2024-10-22', 'bank_transfer', 0),
    
    -- Expense transactions
    (test_venture_id, NULL, 'expense', 'hosting', 89.99, 'Monthly server costs', 'stripe', 'DigitalOcean', '2024-10-01', 'credit_card', 0),
    (test_venture_id, NULL, 'expense', 'tools', 29.99, 'Design software subscription', 'stripe', 'Adobe', '2024-10-01', 'credit_card', 0),
    (test_venture_id, NULL, 'expense', 'workspace', 150.00, 'Co-working space membership', 'manual', 'Cooperative Workspace', '2024-10-05', 'bank_transfer', 0),
    (test_venture_id, NULL, 'expense', 'marketing', 45.00, 'Workshop promotion materials', 'manual', 'Local Print Shop', '2024-10-08', 'cash', 0),
    (test_venture_id, NULL, 'expense', 'professional_development', 99.00, 'Online course for team skill building', 'stripe', 'Frontend Masters', '2024-10-12', 'credit_card', 0);

-- ============================================================================
-- FINANCIAL TRANSACTIONS - FREELANCER (SARAH'S DESIGN STUDIO)
-- ============================================================================

    -- Get revenue stream IDs for freelancer
    SELECT id INTO stream_id_4 FROM revenue_streams WHERE venture_id = freelancer_venture_id AND stream_name = 'Logo Design Projects';
    SELECT id INTO stream_id_5 FROM revenue_streams WHERE venture_id = freelancer_venture_id AND stream_name = 'Retainer Clients';
    SELECT id INTO stream_id_6 FROM revenue_streams WHERE venture_id = freelancer_venture_id AND stream_name = 'Direct Client Work';

    -- October 2024 Transactions
    INSERT INTO financial_transactions (
        venture_id, revenue_stream_id, transaction_type, category, amount, description, 
        platform, client_name, transaction_date, payment_method, fees_amount
    ) VALUES
    -- Income transactions
    (freelancer_venture_id, stream_id_4, 'income', 'project_payment', 750.00, 'Logo design for tech startup', 'upwork', 'TechFlow Startup', '2024-10-02', 'platform_transfer', 37.50),
    (freelancer_venture_id, stream_id_5, 'income', 'retainer_payment', 1200.00, 'Monthly retainer - October', 'stripe', 'GreenLeaf Consulting', '2024-10-01', 'credit_card', 36.00),
    (freelancer_venture_id, stream_id_6, 'income', 'project_payment', 2200.00, 'Complete brand package', 'manual', 'Local Restaurant', '2024-10-07', 'bank_transfer', 0),
    (freelancer_venture_id, stream_id_4, 'income', 'project_payment', 550.00, 'Business card design', 'upwork', 'Law Firm LLC', '2024-10-12', 'platform_transfer', 27.50),
    (freelancer_venture_id, stream_id_6, 'income', 'project_payment', 1500.00, 'Website design mockups', 'manual', 'Nonprofit Arts Org', '2024-10-18', 'check', 0),
    (freelancer_venture_id, stream_id_5, 'income', 'retainer_payment', 800.00, 'Additional retainer work', 'stripe', 'GreenLeaf Consulting', '2024-10-25', 'credit_card', 24.00),
    
    -- Expense transactions
    (freelancer_venture_id, NULL, 'expense', 'tools', 52.99, 'Adobe Creative Suite', 'stripe', 'Adobe', '2024-10-01', 'credit_card', 0),
    (freelancer_venture_id, NULL, 'expense', 'marketing', 89.00, 'Portfolio website hosting', 'stripe', 'Squarespace', '2024-10-05', 'credit_card', 0),
    (freelancer_venture_id, NULL, 'expense', 'office_supplies', 34.99, 'Design materials and prints', 'manual', 'Art Supply Store', '2024-10-10', 'cash', 0),
    (freelancer_venture_id, NULL, 'expense', 'professional_development', 149.00, 'Design conference ticket', 'stripe', 'DesignCon', '2024-10-15', 'credit_card', 0);

-- ============================================================================
-- FINANCIAL TRANSACTIONS - CREATIVE ARTIST (PIXEL ART EMPORIUM)
-- ============================================================================

    -- Creative artist has different patterns - lots of small transactions
    INSERT INTO financial_transactions (
        venture_id, revenue_stream_id, transaction_type, category, amount, description, 
        platform, client_name, transaction_date, payment_method, fees_amount
    ) VALUES
    -- Etsy sales (multiple small transactions)
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 25.00, 'Digital cat illustration', 'etsy', 'EtsyBuyer1', '2024-10-01', 'platform_transfer', 1.75),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 45.00, 'Custom pet portrait', 'etsy', 'EtsyBuyer2', '2024-10-01', 'platform_transfer', 3.15),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 15.00, 'Pixel art print', 'etsy', 'EtsyBuyer3', '2024-10-02', 'platform_transfer', 1.05),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 35.00, 'Logo design template', 'etsy', 'EtsyBuyer4', '2024-10-03', 'platform_transfer', 2.45),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 28.00, 'Sticker pack design', 'etsy', 'EtsyBuyer5', '2024-10-04', 'platform_transfer', 1.96),
    
    -- Redbubble royalties (smaller amounts)
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'redbubble'), 'income', 'royalty', 12.50, 'T-shirt design royalty', 'redbubble', 'Redbubble', '2024-10-01', 'platform_transfer', 0),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'redbubble'), 'income', 'royalty', 8.75, 'Sticker design royalty', 'redbubble', 'Redbubble', '2024-10-03', 'platform_transfer', 0),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'redbubble'), 'income', 'royalty', 15.20, 'Phone case design royalty', 'redbubble', 'Redbubble', '2024-10-05', 'platform_transfer', 0),
    
    -- Commission work (larger payments)
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'paypal'), 'income', 'commission', 120.00, 'Custom character design', 'paypal', 'Gaming Client', '2024-10-08', 'platform_transfer', 3.60),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'paypal'), 'income', 'commission', 200.00, 'Book cover illustration', 'paypal', 'Indie Author', '2024-10-15', 'platform_transfer', 6.00),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'paypal'), 'income', 'commission', 85.00, 'Social media graphics package', 'paypal', 'Small Business', '2024-10-22', 'platform_transfer', 2.55),
    
    -- More Etsy sales throughout the month
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 22.00, 'Digital pattern bundle', 'etsy', 'EtsyBuyer6', '2024-10-10', 'platform_transfer', 1.54),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 50.00, 'Wedding invitation template', 'etsy', 'EtsyBuyer7', '2024-10-12', 'platform_transfer', 3.50),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 30.00, 'Icon set download', 'etsy', 'EtsyBuyer8', '2024-10-18', 'platform_transfer', 2.10),
    (creative_venture_id, (SELECT id FROM revenue_streams WHERE venture_id = creative_venture_id AND platform = 'etsy'), 'income', 'product_sale', 18.00, 'Coloring page bundle', 'etsy', 'EtsyBuyer9', '2024-10-20', 'platform_transfer', 1.26),
    
    -- Expenses
    (creative_venture_id, NULL, 'expense', 'tools', 19.99, 'Procreate app subscription', 'stripe', 'Apple App Store', '2024-10-01', 'credit_card', 0),
    (creative_venture_id, NULL, 'expense', 'marketing', 25.00, 'Instagram ad promotion', 'stripe', 'Meta', '2024-10-05', 'credit_card', 0),
    (creative_venture_id, NULL, 'expense', 'materials', 67.50, 'Art supplies for reference work', 'manual', 'Art Store', '2024-10-12', 'cash', 0),
    (creative_venture_id, NULL, 'expense', 'professional_development', 39.99, 'Online art course', 'stripe', 'Skillshare', '2024-10-18', 'credit_card', 0);

-- ============================================================================
-- FINANCIAL GOALS
-- ============================================================================

    -- Set some realistic financial goals for each venture
    INSERT INTO financial_goals (venture_id, goal_type, target_amount, goal_name, description, target_date) VALUES
    (test_venture_id, 'monthly_revenue', 5000.00, 'Sustainable Monthly Income', 'Reach $5000/month to cover collective expenses and fair compensation', '2024-12-31'),
    (test_venture_id, 'savings_target', 10000.00, 'Emergency Fund', 'Build 3-month operating expense cushion', '2025-06-30'),
    
    (freelancer_venture_id, 'monthly_revenue', 8000.00, 'Professional Income Goal', 'Consistent $8000/month to match corporate salary', '2024-12-31'),
    (freelancer_venture_id, 'savings_target', 15000.00, 'Business Expansion Fund', 'Save for additional tools and marketing', '2025-03-31'),
    
    (creative_venture_id, 'monthly_revenue', 2000.00, 'Art Income Milestone', 'Reach $2000/month from art sales', '2025-01-31'),
    (creative_venture_id, 'savings_target', 5000.00, 'Equipment Upgrade Fund', 'Save for better art equipment and software', '2025-05-31');

-- ============================================================================
-- FINANCIAL INTEGRATIONS (Mock entries)
-- ============================================================================

    INSERT INTO financial_integrations (venture_id, platform, integration_name, sync_status, last_sync_at) VALUES
    (test_venture_id, 'stripe', 'Stripe Donations Integration', 'active', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    (freelancer_venture_id, 'stripe', 'Stripe Client Payments', 'active', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    (freelancer_venture_id, 'upwork', 'Upwork Project Tracking', 'active', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    (creative_venture_id, 'etsy', 'Etsy Shop Analytics', 'active', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
    (creative_venture_id, 'paypal', 'PayPal Commission Payments', 'active', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    (creative_venture_id, 'redbubble', 'Redbubble Royalty Tracking', 'active', CURRENT_TIMESTAMP - INTERVAL '12 hours');

    RAISE NOTICE 'Test financial data created successfully!';
    RAISE NOTICE 'Created data for ventures:';
    RAISE NOTICE '- Liberation Web Collective (ID: %)', test_venture_id;
    RAISE NOTICE '- Sarahs Design Studio (ID: %)', freelancer_venture_id;
    RAISE NOTICE '- Pixel Art Emporium (ID: %)', creative_venture_id;

END $$;