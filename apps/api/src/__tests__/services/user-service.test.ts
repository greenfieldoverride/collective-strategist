import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { UserService, CreateUserRequest, LoginRequest, UpdateUserRequest, ChangePasswordRequest, UserPreferences, ConsultantPreferences } from '../../services/user-service';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

const mockedBcrypt = jest.mocked(bcrypt);

describe('UserService', () => {
  let userService: UserService;
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.MockedFunction<any>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock database pool
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    userService = new UserService(mockPool);
  });

  describe('createUser', () => {
    const validCreateRequest: CreateUserRequest = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      name: 'Test User',
      tier: 'individual_pro'
    };

    it('should create a new user successfully', async () => {
      // Mock bcrypt.hash
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      
      // Mock database responses
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ // Insert new user
          rows: [{
            id: 'user-id-123',
            email: 'test@example.com',
            tier: 'individual_pro',
            name: 'Test User',
            is_verified_sovereign_circle: false,
            email_verified: false,
            preferred_language: 'en',
            onboarding_completed: false,
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Log user activity

      const result = await userService.createUser(validCreateRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.user.email).toBe('test@example.com');
      expect(result.data!.user.tier).toBe('individual_pro');
      expect(result.data!.emailVerificationToken).toBeDefined();
      
      // Verify bcrypt was called
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 12);
      
      // Verify database queries
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should throw error if user already exists', async () => {
      // Mock existing user found
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 'existing-user-id' }] 
      });

      await expect(userService.createUser(validCreateRequest))
        .rejects.toThrow('User with this email already exists');
    });

    it('should default to individual_pro tier', async () => {
      const requestWithoutTier = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-id-123',
            email: 'test@example.com',
            tier: 'individual_pro',
            name: null,
            is_verified_sovereign_circle: false,
            email_verified: false,
            preferred_language: 'en',
            onboarding_completed: false,
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Log user activity

      const result = await userService.createUser(requestWithoutTier);

      expect(result.success).toBe(true);
      expect(result.data!.user.tier).toBe('individual_pro');
    });
  });

  describe('loginUser', () => {
    const validLoginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser'
    };

    const mockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      tier: 'individual_pro',
      greenfield_override_id: null,
      name: 'Test User',
      bio: null,
      pronouns: null,
      location: null,
      website_url: null,
      profile_image_url: null,
      is_verified_sovereign_circle: false,
      email_verified: true,
      login_attempts: 0,
      locked_until: null,
      preferred_language: 'en',
      onboarding_completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    it('should login successfully with valid credentials', async () => {
      // Mock bcrypt.compare
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      // Mock database responses
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }) // Reset login attempts
        .mockResolvedValueOnce({ rows: [] }) // Create session
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.loginUser(validLoginRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.user.email).toBe('test@example.com');
      expect(result.data!.sessionToken).toBeDefined();
      
      // Verify password comparison
      expect(bcrypt.compare).toHaveBeenCalledWith('SecurePassword123!', 'hashed-password');
    });

    it('should fail with invalid email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(userService.loginUser(validLoginRequest))
        .rejects.toThrow('Invalid email or password');
    });

    it('should fail with invalid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }); // Handle failed login

      await expect(userService.loginUser(validLoginRequest))
        .rejects.toThrow('Invalid email or password');
    });

    it('should fail if account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        locked_until: new Date(Date.now() + 60000) // Locked for 1 minute
      };

      mockQuery.mockResolvedValueOnce({ rows: [lockedUser] });

      await expect(userService.loginUser(validLoginRequest))
        .rejects.toThrow('Account is temporarily locked');
    });

    it('should fail if email is not verified (non-sovereign circle)', async () => {
      const unverifiedUser = {
        ...mockUser,
        email_verified: false,
        tier: 'individual_pro'
      };

      mockQuery.mockResolvedValueOnce({ rows: [unverifiedUser] });

      await expect(userService.loginUser(validLoginRequest))
        .rejects.toThrow('Please verify your email address');
    });

    it('should allow unverified sovereign circle members to login', async () => {
      const sovereignUser = {
        ...mockUser,
        email_verified: false,
        tier: 'sovereign_circle'
      };

      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockQuery
        .mockResolvedValueOnce({ rows: [sovereignUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await userService.loginUser(validLoginRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('updateUser', () => {
    const userId = 'user-id-123';
    const updateRequest: UpdateUserRequest = {
      name: 'Updated Name',
      bio: 'Updated bio with liberation focus',
      pronouns: 'they/them',
      location: 'Distributed',
      websiteUrl: 'https://liberation.example.com',
      preferredLanguage: 'en'
    };

    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        tier: 'individual_pro',
        name: 'Updated Name',
        bio: 'Updated bio with liberation focus',
        pronouns: 'they/them',
        location: 'Distributed',
        website_url: 'https://liberation.example.com',
        email_verified: true,
        preferred_language: 'en',
        onboarding_completed: false,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] }) // Update query
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.updateUser(userId, updateRequest);

      expect(result.success).toBe(true);
      expect(result.data!.user.name).toBe('Updated Name');
      expect(result.data!.user.pronouns).toBe('they/them');
      expect(result.data!.user.location).toBe('Distributed');
    });

    it('should fail if no updates provided', async () => {
      await expect(userService.updateUser(userId, {}))
        .rejects.toThrow('No updates provided');
    });

    it('should fail if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(userService.updateUser(userId, updateRequest))
        .rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    const userId = 'user-id-123';
    const changePasswordRequest: ChangePasswordRequest = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456'
    };

    it('should change password successfully', async () => {
      const mockUser = {
        password_hash: 'old-hashed-password',
        email: 'test@example.com',
        is_active: true
      };

      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password' as never);

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get current user
        .mockResolvedValueOnce({ rows: [] }) // Update password
        .mockResolvedValueOnce({ rows: [] }) // Log activity
        .mockResolvedValueOnce({ rows: [] }); // Revoke sessions

      const result = await userService.changePassword(userId, changePasswordRequest);

      expect(result.success).toBe(true);
      expect(result.data!.message).toContain('Password changed successfully');
      
      // Verify password operations
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword123', 'old-hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
    });

    it('should fail with incorrect current password', async () => {
      const mockUser = {
        password_hash: 'old-hashed-password',
        email: 'test@example.com',
        is_active: true
      };

      mockedBcrypt.compare.mockResolvedValue(false as never);
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      await expect(userService.changePassword(userId, changePasswordRequest))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should fail if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(userService.changePassword(userId, changePasswordRequest))
        .rejects.toThrow('User not found');
    });
  });

  describe('getUserBySession', () => {
    const sessionToken = 'valid-session-token';

    it('should return user for valid session', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        tier: 'individual_pro',
        greenfield_override_id: null,
        name: 'Test User',
        bio: null,
        pronouns: null,
        location: null,
        website_url: null,
        profile_image_url: null,
        is_verified_sovereign_circle: false,
        email_verified: true,
        preferred_language: 'en',
        onboarding_completed: false,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: new Date(),
        is_active: true,
        last_active_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user by session
        .mockResolvedValueOnce({ rows: [] }); // Update session activity

      const result = await userService.getUserBySession(sessionToken);

      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
      expect(result!.isActive).toBe(true);
    });

    it('should return null for invalid session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await userService.getUserBySession('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('Data Retention Policy', () => {
    it('should return correct retention policy', () => {
      const policy = userService.getDataRetentionPolicy();

      expect(policy.retentionPeriodDays).toBe(90);
      expect(policy.gracePeriodDays).toBe(30);
      expect(policy.notificationDays).toEqual([30, 14, 7, 1]);
    });
  });

  describe('deactivateAccountWithRetention', () => {
    const userId = 'user-id-123';

    it('should deactivate account with retention policy', async () => {
      // Mock successful deactivation
      mockQuery
        .mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] }) // Deactivate account
        .mockResolvedValueOnce({ rows: [] }) // Revoke sessions
        .mockResolvedValueOnce({ rows: [] }) // Log deactivation
        .mockResolvedValueOnce({ rows: [] }); // Log retention policy

      const result = await userService.deactivateAccountWithRetention(userId, 'Testing retention');

      expect(result.success).toBe(true);
      expect(result.data!.message).toContain('90 days');
      expect(result.data!.retentionInfo).toBeDefined();
      expect(result.data!.retentionInfo.retentionPeriodDays).toBe(90);
      expect(result.data!.retentionInfo.gracePeriodDays).toBe(30);
    });
  });

  describe('getUserPreferences', () => {
    const userId = 'user-id-123';

    it('should return user preferences when they exist', async () => {
      const mockPrefs = {
        briefing_frequency: 'weekly',
        preferred_ai_provider: 'anthropic',
        notification_preferences: { push: true, email: false, websocket: true },
        timezone: 'America/New_York'
      };

      const mockConsultantPrefs = {
        default_session_type: 'strategic_planning',
        auto_save_conversations: true,
        export_format_preference: 'markdown',
        ui_theme: 'dark',
        notification_preferences: { weeklySummary: true, conversationShared: false, newRecommendations: true }
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockPrefs] })
        .mockResolvedValueOnce({ rows: [mockConsultantPrefs] });

      const result = await userService.getUserPreferences(userId);

      expect(result.success).toBe(true);
      expect(result.data!.preferences.briefingFrequency).toBe('weekly');
      expect(result.data!.consultantPreferences.uiTheme).toBe('dark');
    });

    it('should return default preferences when none exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await userService.getUserPreferences(userId);

      expect(result.success).toBe(true);
      expect(result.data!.preferences.briefingFrequency).toBe('monthly');
      expect(result.data!.consultantPreferences.uiTheme).toBe('light');
    });
  });

  describe('updateUserPreferences', () => {
    const userId = 'user-id-123';
    const preferences: UserPreferences = {
      briefingFrequency: 'weekly',
      preferredAiProvider: 'anthropic',
      notificationPreferences: { push: true, email: false, websocket: true },
      timezone: 'America/New_York'
    };

    it('should create new preferences if none exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check if exists
        .mockResolvedValueOnce({ rows: [] }) // Insert new
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.updateUserPreferences(userId, preferences);

      expect(result.success).toBe(true);
      expect(result.data!.preferences).toEqual(preferences);
    });

    it('should update existing preferences', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'pref-id' }] }) // Preferences exist
        .mockResolvedValueOnce({ rows: [] }) // Update
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.updateUserPreferences(userId, preferences);

      expect(result.success).toBe(true);
    });
  });

  describe('updateConsultantPreferences', () => {
    const userId = 'user-id-123';
    const preferences: ConsultantPreferences = {
      defaultSessionType: 'strategic_planning',
      autoSaveConversations: true,
      exportFormatPreference: 'markdown',
      uiTheme: 'dark',
      notificationPreferences: { weeklySummary: true, conversationShared: false, newRecommendations: true }
    };

    it('should create new consultant preferences if none exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check if exists
        .mockResolvedValueOnce({ rows: [] }) // Insert new
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.updateConsultantPreferences(userId, preferences);

      expect(result.success).toBe(true);
      expect(result.data!.consultantPreferences).toEqual(preferences);
    });

    it('should update existing consultant preferences', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'pref-id' }] }) // Preferences exist
        .mockResolvedValueOnce({ rows: [] }) // Update
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.updateConsultantPreferences(userId, preferences);

      expect(result.success).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    const validToken = 'valid-verification-token';

    it('should verify email successfully with valid token', async () => {
      mockQuery
        .mockResolvedValueOnce({ // Update user
          rows: [{
            id: 'user-id-123',
            email: 'test@example.com',
            tier: 'individual_pro',
            name: 'Test User',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date()
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.verifyEmail(validToken);

      expect(result.success).toBe(true);
      expect(result.data!.user.emailVerified).toBe(true);
      expect(result.data!.user.email).toBe('test@example.com');
    });

    it('should fail with invalid or expired token', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No matching token

      await expect(userService.verifyEmail('invalid-token'))
        .rejects.toThrow('Invalid or expired verification token');
    });
  });

  describe('logoutUser', () => {
    const sessionToken = 'valid-session-token';

    it('should logout user successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-id-123' }] }) // Revoke session
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.logoutUser(sessionToken);

      expect(result.success).toBe(true);
      expect(result.data!.message).toBe('Logged out successfully');
    });

    it('should handle logout even if session not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No session found
        .mockResolvedValueOnce({ rows: [] }); // Log activity still called

      const result = await userService.logoutUser('invalid-token');

      expect(result.success).toBe(true);
      expect(result.data!.message).toBe('Logged out successfully');
    });
  });

  describe('updateProfileImage', () => {
    const userId = 'user-id-123';
    const imageUrl = 'https://example.com/image.jpg';

    it('should update profile image successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ profile_image_url: imageUrl }] }) // Update image
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.updateProfileImage(userId, imageUrl);

      expect(result.success).toBe(true);
      expect(result.data!.user.profileImageUrl).toBe(imageUrl);
    });

    it('should fail if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(userService.updateProfileImage(userId, imageUrl))
        .rejects.toThrow('User not found');
    });
  });

  describe('exportUserData', () => {
    const userId = 'user-id-123';

    it('should export user data in JSON format', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        tier: 'individual_pro',
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }) // Get conversations
        .mockResolvedValueOnce({ rows: [] }) // Get messages
        .mockResolvedValueOnce({ rows: [] }) // Get activity log
        .mockResolvedValueOnce({ rows: [] }) // Get usage metrics
        .mockResolvedValueOnce({ rows: [] }) // Get deactivation activity
        .mockResolvedValueOnce({ rows: [] }); // Log export activity

      // Mock getUserPreferences
      const mockPreferencesResult = { 
        success: true, 
        data: { 
          preferences: { briefingFrequency: 'monthly' }, 
          consultantPreferences: { uiTheme: 'light' } 
        } 
      };
      jest.spyOn(userService, 'getUserPreferences').mockResolvedValue(mockPreferencesResult as any);

      const result = await userService.exportUserData(userId, 'json');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('exportedAt');
      expect(result.data).toHaveProperty('retentionInfo');
    });

    it('should export user data in CSV format', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        tier: 'individual_pro',
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }) // Get conversations
        .mockResolvedValueOnce({ rows: [] }) // Get messages
        .mockResolvedValueOnce({ rows: [] }) // Get activity log
        .mockResolvedValueOnce({ rows: [] }) // Get usage metrics
        .mockResolvedValueOnce({ rows: [] }) // Get deactivation activity
        .mockResolvedValueOnce({ rows: [] }); // Log export activity

      // Mock getUserPreferences
      const mockPreferencesResult = { 
        success: true, 
        data: { 
          preferences: { briefingFrequency: 'monthly' }, 
          consultantPreferences: { uiTheme: 'light' } 
        } 
      };
      jest.spyOn(userService, 'getUserPreferences').mockResolvedValue(mockPreferencesResult as any);

      const result = await userService.exportUserData(userId, 'csv');

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('USER_PROFILE');
      expect(result.data).toContain('test@example.com');
    });

    it('should fail if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(userService.exportUserData(userId))
        .rejects.toThrow('User not found');
    });
  });

  describe('reactivateAccount', () => {
    const userId = 'user-id-123';

    it('should reactivate account successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] }) // Reactivate account
        .mockResolvedValueOnce({ rows: [] }); // Log activity

      const result = await userService.reactivateAccount(userId);

      expect(result.success).toBe(true);
      expect(result.data!.message).toContain('reactivated successfully');
    });

    it('should fail if user not found or already active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(userService.reactivateAccount(userId))
        .rejects.toThrow('User not found or already active');
    });
  });

  describe('trackUsage', () => {
    const userId = 'user-id-123';

    it('should track usage metrics without throwing errors', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Insert/update usage metric

      // Should not throw an error
      await expect(userService.trackUsage(userId, 'ai_queries')).resolves.toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error')); // Simulate error

      // Should not throw an error even if database fails
      await expect(userService.trackUsage(userId, 'ventures_created')).resolves.toBeUndefined();
    });
  });

  describe('getAccountsApproachingDeletion', () => {
    it('should return accounts approaching deletion', async () => {
      const mockAccounts = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          deactivated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockAccounts });

      const result = await userService.getAccountsApproachingDeletion(7);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('user1@example.com');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await userService.getAccountsApproachingDeletion(1);

      expect(result).toEqual([]);
    });
  });
});