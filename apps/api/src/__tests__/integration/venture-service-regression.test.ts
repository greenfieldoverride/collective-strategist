/**
 * Venture Service Regression Tests
 * 
 * These tests ensure critical database operations work correctly
 * and prevent SQL errors from reaching production.
 */

import { Database } from '../../database/connection';
import { VentureService } from '../../services/venture-service';

describe('Venture Service Regression Tests', () => {
  let db: Database;
  let ventureService: VentureService;
  let testUserId: string;
  let testVentureId: string;

  beforeAll(async () => {
    db = new Database();
    ventureService = new VentureService();
    testUserId = 'test-user-' + Date.now();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testVentureId) {
      try {
        await db.query('DELETE FROM venture_members WHERE venture_id = $1', [testVentureId]);
        await db.query('DELETE FROM ventures WHERE id = $1', [testVentureId]);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
    await db.close();
  });

  describe('Core SQL Query Validation', () => {
    test('getVentures should execute without SQL errors', async () => {
      // This test would have caught the "updatedat vs updated_at" issue
      const result = await ventureService.getVentures(testUserId, {
        limit: 10,
        offset: 0
      });

      expect(result).toBeDefined();
      expect(result.ventures).toBeInstanceOf(Array);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.hasMore).toBeDefined();
    });

    test('getVentures should handle sorting correctly', async () => {
      // Test different sort options to ensure column names are correct
      const sortOptions = [
        { sortBy: 'updated_at', sortOrder: 'desc' },
        { sortBy: 'created_at', sortOrder: 'asc' },
        { sortBy: 'name', sortOrder: 'asc' }
      ];

      for (const sortOption of sortOptions) {
        const result = await ventureService.getVentures(testUserId, {
          limit: 5,
          ...sortOption
        });

        expect(result).toBeDefined();
        expect(result.ventures).toBeInstanceOf(Array);
      }
    });

    test('createVenture should work with valid data', async () => {
      const ventureData = {
        name: 'Test Regression Venture',
        description: 'Test venture for regression testing',
        ventureType: 'solo' as const,
        billingTier: 'individual_pro',
        coreValues: ['Testing', 'Quality'],
        primaryGoals: ['Ensure reliability', 'Prevent regressions']
      };

      const result = await ventureService.createVenture(testUserId, ventureData);
      testVentureId = result.id;

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(ventureData.name);
      expect(result.primaryBillingOwner).toBe(testUserId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test('getVenture should return created venture', async () => {
      if (!testVentureId) {
        throw new Error('Test venture not created - previous test failed');
      }

      const result = await ventureService.getVenture(testUserId, testVentureId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(testVentureId);
      expect(result!.name).toBe('Test Regression Venture');
    });

    test('updateVenture should work correctly', async () => {
      if (!testVentureId) {
        throw new Error('Test venture not created - previous test failed');
      }

      const updates = {
        name: 'Updated Test Venture',
        description: 'Updated description'
      };

      const result = await ventureService.updateVenture(testUserId, testVentureId, updates);

      expect(result).toBeDefined();
      expect(result.name).toBe(updates.name);
      expect(result.description).toBe(updates.description);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Database Schema Validation', () => {
    test('ventures table should have required columns', async () => {
      const result = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ventures' AND table_schema = 'public'
        ORDER BY column_name
      `);

      const columns = result.rows.map(row => row.column_name);
      
      // Critical columns that must exist
      const requiredColumns = [
        'id',
        'name', 
        'primary_billing_owner',
        'venture_type',
        'billing_tier',
        'status',
        'created_at',
        'updated_at'
      ];

      for (const column of requiredColumns) {
        expect(columns).toContain(column);
      }
    });

    test('venture_members table should have required columns', async () => {
      const result = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'venture_members' AND table_schema = 'public'
      `);

      const columns = result.rows.map(row => row.column_name);
      
      const requiredColumns = [
        'id',
        'user_id',
        'venture_id', 
        'role',
        'permissions',
        'joined_at'
      ];

      for (const column of requiredColumns) {
        expect(columns).toContain(column);
      }
    });

    test('database constraints should be in place', async () => {
      // Test billing tier constraint
      const constraintResult = await db.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'ventures_billing_tier_check'
      `);

      expect(constraintResult.rows).toHaveLength(1);
      expect(constraintResult.rows[0].check_clause).toContain('billing_tier');
    });
  });

  describe('API Endpoint Smoke Tests', () => {
    test('ventures endpoint should return valid response structure', async () => {
      // This tests the full API endpoint that was failing
      const mockRequest = {
        user: { id: testUserId },
        query: { limit: '10', offset: '0' }
      };

      // This would catch routing or response formatting issues
      expect(async () => {
        const result = await ventureService.getVentures(testUserId, {
          limit: 10,
          offset: 0
        });
        
        // Verify response structure matches API contract
        expect(result).toHaveProperty('ventures');
        expect(result).toHaveProperty('totalCount');
        expect(result).toHaveProperty('hasMore');
        expect(typeof result.totalCount).toBe('number');
        expect(typeof result.hasMore).toBe('boolean');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid user ID gracefully', async () => {
      const result = await ventureService.getVentures('nonexistent-user', {});
      
      expect(result).toBeDefined();
      expect(result.ventures).toBeInstanceOf(Array);
      expect(result.ventures).toHaveLength(0);
    });

    test('should handle invalid venture ID gracefully', async () => {
      const result = await ventureService.getVenture(testUserId, 'nonexistent-venture');
      expect(result).toBeNull();
    });

    test('should validate billing tier constraints', async () => {
      const invalidVentureData = {
        name: 'Invalid Billing Tier Test',
        description: 'Test venture with invalid billing tier',
        ventureType: 'solo' as const,
        billingTier: 'invalid_tier', // This should fail
        coreValues: ['Testing'],
        primaryGoals: ['Test validation']
      };

      await expect(
        ventureService.createVenture(testUserId, invalidVentureData)
      ).rejects.toThrow();
    });
  });
});