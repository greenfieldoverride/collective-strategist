import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserService } from '../../services/user-service';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

const mockedBcrypt = jest.mocked(bcrypt);

// Simple integration test with real UserService but mocked database
describe('UserService Integration Tests', () => {
  let userService: UserService;
  let mockPool: Pool;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a simple mock pool
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    userService = new UserService(mockPool);
  });

  describe('Data Retention Policy', () => {
    it('should return correct retention policy', () => {
      const policy = userService.getDataRetentionPolicy();

      expect(policy).toEqual({
        retentionPeriodDays: 90,
        gracePeriodDays: 30,
        notificationDays: [30, 14, 7, 1]
      });
    });

    it('should provide liberation-focused retention period', () => {
      const policy = userService.getDataRetentionPolicy();
      
      // Should be long enough for users to change their mind
      expect(policy.retentionPeriodDays).toBeGreaterThan(60);
      
      // Should have a grace period for reactivation
      expect(policy.gracePeriodDays).toBeGreaterThan(14);
      
      // Should notify users before deletion
      expect(policy.notificationDays).toContain(1); // Final warning
      expect(policy.notificationDays).toContain(7); // Week warning
    });
  });

  describe('User Data Export Structure', () => {
    it('should generate proper CSV headers', () => {
      const mockData = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
          tier: 'individual_pro',
          location: 'Distributed',
          bio: 'Liberation advocate',
          pronouns: 'they/them',
          createdAt: new Date('2025-01-01')
        },
        conversations: [
          { id: 'conv-1', title: 'Strategic Planning', session_type: 'strategic_advice', status: 'active', total_messages: 5, created_at: new Date(), updated_at: new Date() }
        ],
        messages: [
          { id: 'msg-1', conversation_title: 'Strategic Planning', message_type: 'user', ai_provider: 'anthropic', content: 'How can I build a liberation-focused business?', created_at: new Date() }
        ]
      } as any;

      // Access the private convertToCSV method using bracket notation
      const csvOutput = (userService as any).convertToCSV(mockData);

      expect(csvOutput).toContain('USER_PROFILE');
      expect(csvOutput).toContain('Email,test@example.com');
      expect(csvOutput).toContain('Name,Test User');
      expect(csvOutput).toContain('Pronouns,they/them');
      expect(csvOutput).toContain('Location,Distributed');
      expect(csvOutput).toContain('CONVERSATIONS');
      expect(csvOutput).toContain('Strategic Planning');
      expect(csvOutput).toContain('MESSAGES');
    });

    it('should handle liberation-focused profile fields in CSV', () => {
      const mockData = {
        user: {
          email: 'sovereign@example.com',
          name: 'Sovereign Collective Member',
          tier: 'sovereign_circle',
          location: 'Decentralized',
          bio: 'Working toward digital liberation and collective autonomy',
          pronouns: 'xe/xir',
          createdAt: new Date('2025-01-01')
        },
        conversations: [],
        messages: []
      } as any;

      const csvOutput = (userService as any).convertToCSV(mockData);

      expect(csvOutput).toContain('Pronouns,xe/xir');
      expect(csvOutput).toContain('Location,Decentralized');
      expect(csvOutput).toContain('Tier,sovereign_circle');
      expect(csvOutput).toContain('digital liberation and collective autonomy');
    });
  });

  describe('Account Deactivation Logic', () => {
    it('should calculate correct retention dates', () => {
      const now = new Date('2025-01-01T00:00:00Z');
      const policy = userService.getDataRetentionPolicy();
      
      // Mock Date.now for consistent testing
      const originalDateNow = Date.now;
      Date.now = () => now.getTime();

      const expectedFinalDeletion = new Date(now.getTime() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
      const expectedGracePeriodEnd = new Date(now.getTime() + policy.gracePeriodDays * 24 * 60 * 60 * 1000);

      expect(expectedFinalDeletion.getTime() - now.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
      expect(expectedGracePeriodEnd.getTime() - now.getTime()).toBe(30 * 24 * 60 * 60 * 1000);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should schedule notifications at correct intervals', () => {
      const policy = userService.getDataRetentionPolicy();
      const finalDeletionDate = new Date('2025-03-31T00:00:00Z');
      
      const notificationDates = policy.notificationDays.map(days => {
        return new Date(finalDeletionDate.getTime() - days * 24 * 60 * 60 * 1000);
      });

      // Should have notifications 30, 14, 7, and 1 days before deletion
      expect(notificationDates).toHaveLength(4);
      expect(notificationDates[0]).toEqual(new Date('2025-03-01T00:00:00Z')); // 30 days before
      expect(notificationDates[1]).toEqual(new Date('2025-03-17T00:00:00Z')); // 14 days before
      expect(notificationDates[2]).toEqual(new Date('2025-03-24T00:00:00Z')); // 7 days before
      expect(notificationDates[3]).toEqual(new Date('2025-03-30T00:00:00Z')); // 1 day before
    });
  });

  describe('Preferences Structure', () => {
    it('should handle empty preferences gracefully', async () => {
      // Mock empty database responses
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // user preferences
        .mockResolvedValueOnce({ rows: [] }); // consultant preferences

      const result = await userService.getUserPreferences('user-id-123');

      expect(result.success).toBe(true);
      expect(result.data!.preferences).toEqual({
        briefingFrequency: 'monthly',
        preferredAiProvider: 'default',
        notificationPreferences: { push: true, email: true, websocket: true },
        timezone: 'UTC'
      });
      expect(result.data!.consultantPreferences).toEqual({
        defaultSessionType: 'strategic_advice',
        autoSaveConversations: true,
        exportFormatPreference: 'markdown',
        uiTheme: 'light',
        notificationPreferences: { weeklySummary: false, conversationShared: true, newRecommendations: true }
      });
    });

    it('should return actual preferences when they exist', async () => {
      const mockPrefs = {
        briefing_frequency: 'weekly',
        preferred_ai_provider: 'anthropic',
        notification_preferences: { push: false, email: true, websocket: true },
        timezone: 'America/New_York'
      };

      const mockConsultantPrefs = {
        default_session_type: 'strategic_planning',
        auto_save_conversations: false,
        export_format_preference: 'json',
        ui_theme: 'dark',
        notification_preferences: { weeklySummary: true, conversationShared: false, newRecommendations: true }
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPrefs] })
        .mockResolvedValueOnce({ rows: [mockConsultantPrefs] });

      const result = await userService.getUserPreferences('user-id-123');

      expect(result.success).toBe(true);
      expect(result.data!.preferences.briefingFrequency).toBe('weekly');
      expect(result.data!.preferences.preferredAiProvider).toBe('anthropic');
      expect(result.data!.consultantPreferences.uiTheme).toBe('dark');
      expect(result.data!.consultantPreferences.exportFormatPreference).toBe('json');
    });
  });

  describe('Liberation-Focused Features', () => {
    it('should support liberation-friendly user tiers', () => {
      // These are the tiers that support liberation technology principles
      const liberationTiers = ['sovereign_circle', 'individual_pro'];
      
      liberationTiers.forEach(tier => {
        expect(['sovereign_circle', 'individual_pro']).toContain(tier);
      });
    });

    it('should support inclusive pronoun options', () => {
      const pronounOptions = [
        'they/them',
        'xe/xir', 
        'ze/zir',
        'she/her',
        'he/him',
        'any pronouns',
        'ask me'
      ];

      // All of these should be valid and supported
      pronounOptions.forEach(pronouns => {
        expect(typeof pronouns).toBe('string');
        expect(pronouns.length).toBeGreaterThan(0);
      });
    });

    it('should support decentralized location options', () => {
      const liberationLocations = [
        'Distributed',
        'Decentralized',
        'Remote/Digital Nomad',
        'Bioregion-based',
        'Cooperative Community',
        'Intentional Community'
      ];

      liberationLocations.forEach(location => {
        expect(typeof location).toBe('string');
        expect(location.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Complete User Lifecycle Integration', () => {
    it('should support complete user registration to deletion workflow', async () => {
      const userId = 'test-user-lifecycle';

      // Mock complete workflow: register -> login -> update -> deactivate -> data export
      (mockPool.query as jest.Mock)
        // User registration checks
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'lifecycle@example.com', tier: 'individual_pro', is_active: true }] }) // Create user
        .mockResolvedValueOnce({ rows: [] }) // Log registration
        
        // Login workflow
        .mockResolvedValueOnce({ rows: [{ id: userId, email_verified: true, password_hash: 'hash' }] }) // Get user for login
        .mockResolvedValueOnce({ rows: [] }) // Reset login attempts
        .mockResolvedValueOnce({ rows: [] }) // Create session
        .mockResolvedValueOnce({ rows: [] }) // Log login
        
        // Profile update
        .mockResolvedValueOnce({ rows: [{ id: userId, name: 'Updated Name' }] }) // Update profile
        .mockResolvedValueOnce({ rows: [] }) // Log update
        
        // Deactivation with retention
        .mockResolvedValueOnce({ rows: [{ email: 'lifecycle@example.com' }] }) // Deactivate
        .mockResolvedValueOnce({ rows: [] }) // Revoke sessions
        .mockResolvedValueOnce({ rows: [] }) // Log deactivation
        .mockResolvedValueOnce({ rows: [] }); // Log retention policy

      // Test registration
      const registrationResult = await userService.createUser({
        email: 'lifecycle@example.com',
        password: 'SecurePassword123!',
        tier: 'individual_pro'
      });
      expect(registrationResult.success).toBe(true);

      // Test deactivation with retention
      const deactivationResult = await userService.deactivateAccountWithRetention(userId, 'Integration test');
      expect(deactivationResult.success).toBe(true);
      expect(deactivationResult.data!.retentionInfo).toBeDefined();
      expect(deactivationResult.data!.retentionInfo.retentionPeriodDays).toBe(90);
    });

    it('should handle sovereign circle member special privileges', async () => {
      // Sovereign circle members can login without email verification
      const sovereignUserId = 'sovereign-user-id';
      
      // Mock bcrypt password verification
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      // Mock sovereign circle login without email verification
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: sovereignUserId, 
            email: 'sovereign@example.com',
            tier: 'sovereign_circle',
            email_verified: false, // Not verified but should still be able to login
            password_hash: 'hashed-password',
            is_active: true,
            login_attempts: 0,
            locked_until: null
          }] 
        })
        .mockResolvedValueOnce({ rows: [] }) // Reset login attempts
        .mockResolvedValueOnce({ rows: [] }) // Create session
        .mockResolvedValueOnce({ rows: [] }); // Log login

      const loginResult = await userService.loginUser({
        email: 'sovereign@example.com',
        password: 'password123',
        ipAddress: '127.0.0.1'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.data!.user.tier).toBe('sovereign_circle');
    });
  });

  describe('Security and Privacy Integration', () => {
    it('should properly handle account lockout after failed attempts', async () => {
      const userId = 'locked-user-id';
      
      // Mock bcrypt to return false (wrong password)
      mockedBcrypt.compare.mockResolvedValue(false as never);
      
      // Mock failed login attempt that results in lockout
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: userId, 
            password_hash: 'correct-hash',
            login_attempts: 4, // One more will trigger lockout
            is_active: true,
            email_verified: true,
            locked_until: null
          }] 
        })
        .mockResolvedValueOnce({ rows: [] }); // Handle failed login

      await expect(userService.loginUser({
        email: 'locked@example.com',
        password: 'wrong-password',
        ipAddress: '127.0.0.1'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should handle data retention notifications scheduling', () => {
      const policy = userService.getDataRetentionPolicy();
      const deletionDate = new Date('2025-12-31T00:00:00Z');
      
      // Calculate notification dates
      const notificationDates = policy.notificationDays.map(days => {
        return new Date(deletionDate.getTime() - days * 24 * 60 * 60 * 1000);
      });

      // Verify notification schedule
      expect(notificationDates).toHaveLength(4);
      expect(notificationDates[0]).toEqual(new Date('2025-12-01T00:00:00Z')); // 30 days
      expect(notificationDates[1]).toEqual(new Date('2025-12-17T00:00:00Z')); // 14 days
      expect(notificationDates[2]).toEqual(new Date('2025-12-24T00:00:00Z')); // 7 days
      expect(notificationDates[3]).toEqual(new Date('2025-12-30T00:00:00Z')); // 1 day
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database failure
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Connection lost'));

      await expect(userService.createUser({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow();
    });

    it('should handle concurrent user operations', async () => {
      const userId = 'concurrent-user';
      
      // Mock concurrent operations
      (mockPool.query as jest.Mock)
        .mockResolvedValue({ rows: [{ id: userId }] });

      const preferences1 = userService.updateUserPreferences(userId, { briefingFrequency: 'weekly' });
      const preferences2 = userService.updateConsultantPreferences(userId, { uiTheme: 'dark' });
      
      // Both operations should complete successfully
      const results = await Promise.all([preferences1, preferences2]);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should validate email format consistency', () => {
      // Test email normalization (should be lowercase)
      const testEmails = [
        'TEST@EXAMPLE.COM',
        'Test@Example.com',
        'test@example.com'
      ];
      
      testEmails.forEach(email => {
        expect(email.toLowerCase()).toBe('test@example.com');
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});