import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserSession, UserActivityLog, UserUsageMetrics, StrategistResponse } from '../types/collective-strategist';

export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  tier?: 'sovereign_circle' | 'individual_pro';
  greenfieldOverrideId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateUserRequest {
  name?: string;
  bio?: string;
  pronouns?: string;
  location?: string;
  websiteUrl?: string;
  preferredLanguage?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserPreferences {
  briefingFrequency?: 'weekly' | 'monthly';
  preferredAiProvider?: string;
  notificationPreferences?: {
    push?: boolean;
    email?: boolean;
    websocket?: boolean;
  };
  timezone?: string;
}

export interface ConsultantPreferences {
  defaultSessionType?: string;
  autoSaveConversations?: boolean;
  exportFormatPreference?: 'markdown' | 'pdf' | 'json' | 'html';
  uiTheme?: 'light' | 'dark' | 'auto';
  notificationPreferences?: {
    weeklySummary?: boolean;
    conversationShared?: boolean;
    newRecommendations?: boolean;
  };
}

export interface DataRetentionPolicy {
  retentionPeriodDays: number;
  gracePeriodDays: number;
  notificationDays: number[];
}

export interface UserDataExport {
  user: Omit<User, 'passwordHash'>;
  preferences: UserPreferences;
  consultantPreferences: ConsultantPreferences;
  conversations: any[];
  messages: any[];
  activityLog: any[];
  usageMetrics: any[];
  exportedAt: string;
  retentionInfo: {
    deactivatedAt?: string;
    finalDeletionDate?: string;
    policy: DataRetentionPolicy;
  };
}

export class UserService {
  constructor(private db: Pool) {}

  // User registration with email verification
  async createUser(request: CreateUserRequest): Promise<StrategistResponse<{ user: Omit<User, 'passwordHash'>; emailVerificationToken: string }>> {
    const startTime = Date.now();
    
    try {
      // Check if user already exists
      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE email = $1',
        [request.email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(request.password, 12);
      
      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const result = await this.db.query(`
        INSERT INTO users (
          email, password_hash, tier, greenfield_override_id, 
          name, email_verification_token, email_verification_expires_at,
          is_verified_sovereign_circle, email_verified, login_attempts,
          preferred_language, onboarding_completed, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, email, tier, greenfield_override_id, name, 
                  is_verified_sovereign_circle, email_verified, preferred_language,
                  onboarding_completed, created_at, updated_at, is_active
      `, [
        request.email.toLowerCase(),
        passwordHash,
        request.tier || 'individual_pro',
        request.greenfieldOverrideId,
        request.name,
        emailVerificationToken,
        emailVerificationExpiresAt,
        request.tier === 'sovereign_circle',
        false, // email not verified yet
        0, // login attempts
        'en', // default language
        false, // onboarding not completed
        true // is active
      ]);

      const user = result.rows[0];

      // Log user registration
      await this.logUserActivity(user.id, 'user_registered', {
        tier: user.tier,
        registrationMethod: 'email'
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            tier: user.tier,
            greenfieldOverrideId: user.greenfield_override_id,
            name: user.name,
            isVerifiedSovereignCircle: user.is_verified_sovereign_circle,
            emailVerified: user.email_verified,
            preferredLanguage: user.preferred_language,
            onboardingCompleted: user.onboarding_completed,
            loginAttempts: 0,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            isActive: user.is_active
          },
          emailVerificationToken
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('User creation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create user');
    }
  }

  // User login with security measures
  async loginUser(request: LoginRequest): Promise<StrategistResponse<{ user: Omit<User, 'passwordHash'>; sessionToken: string }>> {
    const startTime = Date.now();
    
    try {
      // Get user with security info
      const result = await this.db.query(`
        SELECT id, email, password_hash, tier, greenfield_override_id, name,
               bio, pronouns, location, website_url, profile_image_url,
               is_verified_sovereign_circle, email_verified, 
               login_attempts, locked_until, preferred_language, onboarding_completed,
               created_at, updated_at, is_active
        FROM users 
        WHERE email = $1 AND is_active = true
      `, [request.email.toLowerCase()]);

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      // Check if email is verified (except for sovereign circles during initial setup)
      if (!user.email_verified && user.tier !== 'sovereign_circle') {
        throw new Error('Please verify your email address before logging in');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(request.password, user.password_hash);
      
      if (!passwordValid) {
        // Increment login attempts
        await this.handleFailedLogin(user.id, user.login_attempts);
        throw new Error('Invalid email or password');
      }

      // Reset login attempts on successful login
      await this.db.query(`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, last_login_at = NOW()
        WHERE id = $1
      `, [user.id]);

      // Create user session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.db.query(`
        INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.id, sessionToken, request.ipAddress, request.userAgent, expiresAt]);

      // Log successful login
      await this.logUserActivity(user.id, 'login', {
        ipAddress: request.ipAddress,
        userAgent: request.userAgent
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            tier: user.tier,
            greenfieldOverrideId: user.greenfield_override_id,
            name: user.name,
            bio: user.bio,
            pronouns: user.pronouns,
            location: user.location,
            websiteUrl: user.website_url,
            profileImageUrl: user.profile_image_url,
            isVerifiedSovereignCircle: user.is_verified_sovereign_circle,
            emailVerified: user.email_verified,
            preferredLanguage: user.preferred_language,
            onboardingCompleted: user.onboarding_completed,
            loginAttempts: 0,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            isActive: user.is_active
          },
          sessionToken
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  // Verify email address
  async verifyEmail(token: string): Promise<StrategistResponse<{ user: Omit<User, 'passwordHash'> }>> {
    const startTime = Date.now();
    
    try {
      const result = await this.db.query(`
        UPDATE users 
        SET email_verified = true, 
            email_verification_token = NULL,
            email_verification_expires_at = NULL,
            updated_at = NOW()
        WHERE email_verification_token = $1 
        AND email_verification_expires_at > NOW()
        AND is_active = true
        RETURNING id, email, tier, name, email_verified, created_at, updated_at
      `, [token]);

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired verification token');
      }

      const user = result.rows[0];

      // Log email verification
      await this.logUserActivity(user.id, 'email_verified', {
        verifiedAt: new Date()
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            tier: user.tier,
            name: user.name,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            isActive: true,
            isVerifiedSovereignCircle: user.tier === 'sovereign_circle',
            loginAttempts: 0,
            preferredLanguage: 'en',
            onboardingCompleted: false
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Email verification error:', error);
      throw new Error(error instanceof Error ? error.message : 'Email verification failed');
    }
  }

  // Get user by session token
  async getUserBySession(sessionToken: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const result = await this.db.query(`
        SELECT u.id, u.email, u.tier, u.greenfield_override_id, u.name,
               u.bio, u.pronouns, u.location, u.website_url, u.profile_image_url,
               u.is_verified_sovereign_circle, u.email_verified, 
               u.preferred_language, u.onboarding_completed,
               u.created_at, u.updated_at, u.last_login_at, u.is_active,
               s.last_active_at
        FROM users u
        JOIN user_sessions s ON u.id = s.user_id
        WHERE s.session_token = $1 
        AND s.expires_at > NOW() 
        AND s.is_revoked = false
        AND u.is_active = true
      `, [sessionToken]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];

      // Update session last active time
      await this.db.query(`
        UPDATE user_sessions 
        SET last_active_at = NOW()
        WHERE session_token = $1
      `, [sessionToken]);

      return {
        id: user.id,
        email: user.email,
        tier: user.tier,
        greenfieldOverrideId: user.greenfield_override_id,
        name: user.name,
        bio: user.bio,
        pronouns: user.pronouns,
        location: user.location,
        websiteUrl: user.website_url,
        profileImageUrl: user.profile_image_url,
        isVerifiedSovereignCircle: user.is_verified_sovereign_circle,
        emailVerified: user.email_verified,
        preferredLanguage: user.preferred_language,
        onboardingCompleted: user.onboarding_completed,
        loginAttempts: 0,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at,
        isActive: user.is_active
      };

    } catch (error) {
      console.error('Get user by session error:', error);
      return null;
    }
  }

  // Update user profile
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<StrategistResponse<{ user: Omit<User, 'passwordHash'> }>> {
    const startTime = Date.now();
    
    try {
      const setClause = [];
      const values = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        setClause.push(`name = $${paramCount}`);
        values.push(updates.name);
        paramCount++;
      }

      if (updates.bio !== undefined) {
        setClause.push(`bio = $${paramCount}`);
        values.push(updates.bio);
        paramCount++;
      }

      if (updates.pronouns !== undefined) {
        setClause.push(`pronouns = $${paramCount}`);
        values.push(updates.pronouns);
        paramCount++;
      }

      if (updates.location !== undefined) {
        setClause.push(`location = $${paramCount}`);
        values.push(updates.location);
        paramCount++;
      }

      if (updates.websiteUrl !== undefined) {
        setClause.push(`website_url = $${paramCount}`);
        values.push(updates.websiteUrl);
        paramCount++;
      }

      if (updates.preferredLanguage !== undefined) {
        setClause.push(`preferred_language = $${paramCount}`);
        values.push(updates.preferredLanguage);
        paramCount++;
      }

      if (setClause.length === 0) {
        throw new Error('No updates provided');
      }

      setClause.push(`updated_at = NOW()`);
      values.push(userId);

      const result = await this.db.query(`
        UPDATE users 
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING id, email, tier, name, bio, pronouns, location, website_url,
                  email_verified, preferred_language, onboarding_completed,
                  created_at, updated_at, is_active
      `, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Log profile update
      await this.logUserActivity(userId, 'profile_updated', {
        updatedFields: Object.keys(updates)
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            tier: user.tier,
            name: user.name,
            bio: user.bio,
            pronouns: user.pronouns,
            location: user.location,
            websiteUrl: user.website_url,
            emailVerified: user.email_verified,
            preferredLanguage: user.preferred_language,
            onboardingCompleted: user.onboarding_completed,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            isActive: user.is_active,
            isVerifiedSovereignCircle: user.tier === 'sovereign_circle',
            loginAttempts: 0
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Update user error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update user');
    }
  }

  // Change user password
  async changePassword(userId: string, request: ChangePasswordRequest): Promise<StrategistResponse<{ message: string }>> {
    const startTime = Date.now();
    
    try {
      // Get current user data to verify current password
      const userResult = await this.db.query(`
        SELECT password_hash, email, is_active 
        FROM users 
        WHERE id = $1 AND is_active = true
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Verify current password
      const passwordValid = await bcrypt.compare(request.currentPassword, user.password_hash);
      if (!passwordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(request.newPassword, 12);

      // Update password
      await this.db.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [newPasswordHash, userId]);

      // Log password change
      await this.logUserActivity(userId, 'password_changed', {
        changedAt: new Date()
      });

      // Revoke all existing sessions for security
      await this.db.query(`
        UPDATE user_sessions 
        SET is_revoked = true
        WHERE user_id = $1 AND is_revoked = false
      `, [userId]);

      return {
        success: true,
        data: {
          message: 'Password changed successfully. Please log in again.'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Change password error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to change password');
    }
  }

  // Get user preferences
  async getUserPreferences(userId: string): Promise<StrategistResponse<{ preferences: UserPreferences; consultantPreferences: ConsultantPreferences }>> {
    const startTime = Date.now();
    
    try {
      // Get general user preferences
      const prefsResult = await this.db.query(`
        SELECT briefing_frequency, preferred_ai_provider, notification_preferences, timezone
        FROM user_preferences 
        WHERE user_id = $1
      `, [userId]);

      // Get consultant preferences
      const consultantResult = await this.db.query(`
        SELECT default_session_type, auto_save_conversations, export_format_preference, 
               ui_theme, notification_preferences
        FROM user_consultant_preferences 
        WHERE user_id = $1
      `, [userId]);

      const preferences: UserPreferences = prefsResult.rows.length > 0 ? {
        briefingFrequency: prefsResult.rows[0].briefing_frequency,
        preferredAiProvider: prefsResult.rows[0].preferred_ai_provider,
        notificationPreferences: prefsResult.rows[0].notification_preferences,
        timezone: prefsResult.rows[0].timezone
      } : {
        briefingFrequency: 'monthly',
        preferredAiProvider: 'default',
        notificationPreferences: { push: true, email: true, websocket: true },
        timezone: 'UTC'
      };

      const consultantPreferences: ConsultantPreferences = consultantResult.rows.length > 0 ? {
        defaultSessionType: consultantResult.rows[0].default_session_type,
        autoSaveConversations: consultantResult.rows[0].auto_save_conversations,
        exportFormatPreference: consultantResult.rows[0].export_format_preference,
        uiTheme: consultantResult.rows[0].ui_theme,
        notificationPreferences: consultantResult.rows[0].notification_preferences
      } : {
        defaultSessionType: 'strategic_advice',
        autoSaveConversations: true,
        exportFormatPreference: 'markdown',
        uiTheme: 'light',
        notificationPreferences: { weeklySummary: false, conversationShared: true, newRecommendations: true }
      };

      return {
        success: true,
        data: {
          preferences,
          consultantPreferences
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Get preferences error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get user preferences');
    }
  }

  // Update user preferences
  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<StrategistResponse<{ preferences: UserPreferences }>> {
    const startTime = Date.now();
    
    try {
      // Check if preferences exist
      const existsResult = await this.db.query(`
        SELECT id FROM user_preferences WHERE user_id = $1
      `, [userId]);

      if (existsResult.rows.length === 0) {
        // Create new preferences
        await this.db.query(`
          INSERT INTO user_preferences (user_id, briefing_frequency, preferred_ai_provider, notification_preferences, timezone)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          userId,
          preferences.briefingFrequency || 'monthly',
          preferences.preferredAiProvider || 'default',
          JSON.stringify(preferences.notificationPreferences || { push: true, email: true, websocket: true }),
          preferences.timezone || 'UTC'
        ]);
      } else {
        // Update existing preferences
        const setClause = [];
        const values = [];
        let paramCount = 1;

        if (preferences.briefingFrequency !== undefined) {
          setClause.push(`briefing_frequency = $${paramCount}`);
          values.push(preferences.briefingFrequency);
          paramCount++;
        }

        if (preferences.preferredAiProvider !== undefined) {
          setClause.push(`preferred_ai_provider = $${paramCount}`);
          values.push(preferences.preferredAiProvider);
          paramCount++;
        }

        if (preferences.notificationPreferences !== undefined) {
          setClause.push(`notification_preferences = $${paramCount}`);
          values.push(JSON.stringify(preferences.notificationPreferences));
          paramCount++;
        }

        if (preferences.timezone !== undefined) {
          setClause.push(`timezone = $${paramCount}`);
          values.push(preferences.timezone);
          paramCount++;
        }

        if (setClause.length > 0) {
          setClause.push(`updated_at = NOW()`);
          values.push(userId);

          await this.db.query(`
            UPDATE user_preferences 
            SET ${setClause.join(', ')}
            WHERE user_id = $${paramCount}
          `, values);
        }
      }

      // Log preferences update
      await this.logUserActivity(userId, 'preferences_updated', {
        updatedFields: Object.keys(preferences)
      });

      return {
        success: true,
        data: { preferences },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Update preferences error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update user preferences');
    }
  }

  // Update consultant preferences
  async updateConsultantPreferences(userId: string, preferences: ConsultantPreferences): Promise<StrategistResponse<{ consultantPreferences: ConsultantPreferences }>> {
    const startTime = Date.now();
    
    try {
      // Check if preferences exist
      const existsResult = await this.db.query(`
        SELECT id FROM user_consultant_preferences WHERE user_id = $1
      `, [userId]);

      if (existsResult.rows.length === 0) {
        // Create new consultant preferences
        await this.db.query(`
          INSERT INTO user_consultant_preferences (user_id, default_session_type, auto_save_conversations, export_format_preference, ui_theme, notification_preferences)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          preferences.defaultSessionType || 'strategic_advice',
          preferences.autoSaveConversations !== undefined ? preferences.autoSaveConversations : true,
          preferences.exportFormatPreference || 'markdown',
          preferences.uiTheme || 'light',
          JSON.stringify(preferences.notificationPreferences || { weeklySummary: false, conversationShared: true, newRecommendations: true })
        ]);
      } else {
        // Update existing preferences
        const setClause = [];
        const values = [];
        let paramCount = 1;

        if (preferences.defaultSessionType !== undefined) {
          setClause.push(`default_session_type = $${paramCount}`);
          values.push(preferences.defaultSessionType);
          paramCount++;
        }

        if (preferences.autoSaveConversations !== undefined) {
          setClause.push(`auto_save_conversations = $${paramCount}`);
          values.push(preferences.autoSaveConversations);
          paramCount++;
        }

        if (preferences.exportFormatPreference !== undefined) {
          setClause.push(`export_format_preference = $${paramCount}`);
          values.push(preferences.exportFormatPreference);
          paramCount++;
        }

        if (preferences.uiTheme !== undefined) {
          setClause.push(`ui_theme = $${paramCount}`);
          values.push(preferences.uiTheme);
          paramCount++;
        }

        if (preferences.notificationPreferences !== undefined) {
          setClause.push(`notification_preferences = $${paramCount}`);
          values.push(JSON.stringify(preferences.notificationPreferences));
          paramCount++;
        }

        if (setClause.length > 0) {
          setClause.push(`updated_at = NOW()`);
          values.push(userId);

          await this.db.query(`
            UPDATE user_consultant_preferences 
            SET ${setClause.join(', ')}
            WHERE user_id = $${paramCount}
          `, values);
        }
      }

      // Log consultant preferences update
      await this.logUserActivity(userId, 'consultant_preferences_updated', {
        updatedFields: Object.keys(preferences)
      });

      return {
        success: true,
        data: { consultantPreferences: preferences },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Update consultant preferences error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update consultant preferences');
    }
  }

  // Update profile image
  async updateProfileImage(userId: string, imageUrl: string): Promise<StrategistResponse<{ user: { profileImageUrl: string } }>> {
    const startTime = Date.now();
    
    try {
      const result = await this.db.query(`
        UPDATE users 
        SET profile_image_url = $1, updated_at = NOW()
        WHERE id = $2 AND is_active = true
        RETURNING profile_image_url
      `, [imageUrl, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Log profile image update
      await this.logUserActivity(userId, 'profile_image_updated', {
        imageUrl: imageUrl
      });

      return {
        success: true,
        data: {
          user: {
            profileImageUrl: result.rows[0].profile_image_url
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Update profile image error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update profile image');
    }
  }

  // Deactivate user account (soft delete)
  async deactivateAccount(userId: string, reason?: string): Promise<StrategistResponse<{ message: string }>> {
    const startTime = Date.now();
    
    try {
      // Update user account to inactive
      const result = await this.db.query(`
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING email
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found or already deactivated');
      }

      // Revoke all user sessions
      await this.db.query(`
        UPDATE user_sessions 
        SET is_revoked = true
        WHERE user_id = $1 AND is_revoked = false
      `, [userId]);

      // Log account deactivation
      await this.logUserActivity(userId, 'account_deactivated', {
        reason: reason || 'User requested',
        deactivatedAt: new Date()
      });

      return {
        success: true,
        data: {
          message: 'Account has been deactivated successfully'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Deactivate account error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to deactivate account');
    }
  }

  // Reactivate user account
  async reactivateAccount(userId: string): Promise<StrategistResponse<{ message: string }>> {
    const startTime = Date.now();
    
    try {
      // Update user account to active
      const result = await this.db.query(`
        UPDATE users 
        SET is_active = true, updated_at = NOW()
        WHERE id = $1 AND is_active = false
        RETURNING email
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found or already active');
      }

      // Log account reactivation
      await this.logUserActivity(userId, 'account_reactivated', {
        reactivatedAt: new Date()
      });

      return {
        success: true,
        data: {
          message: 'Account has been reactivated successfully'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Reactivate account error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to reactivate account');
    }
  }

  // Get data retention policy
  getDataRetentionPolicy(): DataRetentionPolicy {
    return {
      retentionPeriodDays: 90, // 90 days retention after deactivation
      gracePeriodDays: 30, // 30 days grace period to reactivate
      notificationDays: [30, 14, 7, 1] // Notify at 30, 14, 7, and 1 days before deletion
    };
  }

  // Export all user data (GDPR compliance)
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<StrategistResponse<UserDataExport | string>> {
    const startTime = Date.now();
    
    try {
      // Get user basic info
      const userResult = await this.db.query(`
        SELECT id, email, tier, greenfield_override_id, name, bio, pronouns, 
               location, website_url, profile_image_url, is_verified_sovereign_circle,
               email_verified, preferred_language, onboarding_completed,
               created_at, updated_at, last_login_at, is_active
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get user preferences
      const preferencesResult = await this.getUserPreferences(userId);

      // Get conversations
      const conversationsResult = await this.db.query(`
        SELECT id, title, session_type, status, total_messages, created_at, updated_at
        FROM conversations 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      // Get messages
      const messagesResult = await this.db.query(`
        SELECT m.id, m.conversation_id, m.content, m.message_type, m.ai_provider, 
               m.ai_model, m.position_in_conversation, m.created_at,
               c.title as conversation_title
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = $1
        ORDER BY m.created_at DESC
        LIMIT 1000
      `, [userId]);

      // Get activity log
      const activityResult = await this.db.query(`
        SELECT action, details, ip_address, user_agent, created_at
        FROM user_activity_log 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1000
      `, [userId]);

      // Get usage metrics
      const usageResult = await this.db.query(`
        SELECT metric_type, count, period_start, period_end, created_at
        FROM user_usage_metrics 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1000
      `, [userId]);

      // Calculate retention info
      const policy = this.getDataRetentionPolicy();
      const retentionInfo: any = { policy };
      
      if (!user.is_active) {
        const deactivatedActivity = await this.db.query(`
          SELECT created_at 
          FROM user_activity_log 
          WHERE user_id = $1 AND action = 'account_deactivated'
          ORDER BY created_at DESC 
          LIMIT 1
        `, [userId]);
        
        if (deactivatedActivity.rows.length > 0) {
          const deactivatedAt = new Date(deactivatedActivity.rows[0].created_at);
          const finalDeletionDate = new Date(deactivatedAt.getTime() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
          
          retentionInfo.deactivatedAt = deactivatedAt.toISOString();
          retentionInfo.finalDeletionDate = finalDeletionDate.toISOString();
        }
      }

      const exportData: UserDataExport = {
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          greenfieldOverrideId: user.greenfield_override_id,
          name: user.name,
          bio: user.bio,
          pronouns: user.pronouns,
          location: user.location,
          websiteUrl: user.website_url,
          profileImageUrl: user.profile_image_url,
          isVerifiedSovereignCircle: user.is_verified_sovereign_circle,
          emailVerified: user.email_verified,
          preferredLanguage: user.preferred_language,
          onboardingCompleted: user.onboarding_completed,
          loginAttempts: 0,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_login_at,
          isActive: user.is_active
        },
        preferences: preferencesResult.data?.preferences || {},
        consultantPreferences: preferencesResult.data?.consultantPreferences || {},
        conversations: conversationsResult.rows,
        messages: messagesResult.rows,
        activityLog: activityResult.rows,
        usageMetrics: usageResult.rows,
        exportedAt: new Date().toISOString(),
        retentionInfo
      };

      // Log data export
      await this.logUserActivity(userId, 'data_exported', {
        format,
        exportedAt: new Date(),
        recordCount: {
          conversations: conversationsResult.rows.length,
          messages: messagesResult.rows.length,
          activityLogs: activityResult.rows.length,
          usageMetrics: usageResult.rows.length
        }
      });

      if (format === 'csv') {
        // Convert to CSV format (simplified)
        const csvData = this.convertToCSV(exportData);
        return {
          success: true,
          data: csvData,
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }

      return {
        success: true,
        data: exportData,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Export user data error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to export user data');
    }
  }

  // Convert data to CSV format (simplified)
  private convertToCSV(data: UserDataExport): string {
    const lines = [];
    
    // User info section
    lines.push('USER_PROFILE');
    lines.push('Field,Value');
    lines.push(`Email,${data.user.email}`);
    lines.push(`Name,${data.user.name || ''}`);
    lines.push(`Tier,${data.user.tier}`);
    lines.push(`Location,${data.user.location || ''}`);
    lines.push(`Bio,${data.user.bio || ''}`);
    lines.push(`Pronouns,${data.user.pronouns || ''}`);
    lines.push(`Created At,${data.user.createdAt}`);
    lines.push('');
    
    // Conversations section
    lines.push('CONVERSATIONS');
    lines.push('ID,Title,Session Type,Status,Messages,Created At,Updated At');
    data.conversations.forEach(conv => {
      lines.push(`${conv.id},${conv.title || ''},${conv.session_type},${conv.status},${conv.total_messages},${conv.created_at},${conv.updated_at}`);
    });
    lines.push('');
    
    // Messages section (limited to first 100 for CSV)
    lines.push('MESSAGES (First 100)');
    lines.push('ID,Conversation Title,Message Type,AI Provider,Content Preview,Created At');
    data.messages.slice(0, 100).forEach(msg => {
      const contentPreview = (msg.content || '').substring(0, 100).replace(/,/g, ';').replace(/\n/g, ' ');
      lines.push(`${msg.id},${msg.conversation_title || ''},${msg.message_type},${msg.ai_provider || ''},${contentPreview},${msg.created_at}`);
    });
    
    return lines.join('\n');
  }

  // Update deactivation to respect retention policy
  async deactivateAccountWithRetention(userId: string, reason?: string): Promise<StrategistResponse<{ message: string; retentionInfo: any }>> {
    const startTime = Date.now();
    
    try {
      // First deactivate the account
      const deactivationResult = await this.deactivateAccount(userId, reason);
      
      if (!deactivationResult.success) {
        throw new Error('Failed to deactivate account');
      }

      // Calculate retention dates
      const policy = this.getDataRetentionPolicy();
      const now = new Date();
      const finalDeletionDate = new Date(now.getTime() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
      const gracePeriodEnd = new Date(now.getTime() + policy.gracePeriodDays * 24 * 60 * 60 * 1000);

      // Log retention policy application
      await this.logUserActivity(userId, 'retention_policy_applied', {
        deactivatedAt: now,
        finalDeletionDate,
        gracePeriodEnd,
        policy,
        reason: reason || 'User requested'
      });

      const retentionInfo = {
        deactivatedAt: now.toISOString(),
        finalDeletionDate: finalDeletionDate.toISOString(),
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        gracePeriodDays: policy.gracePeriodDays,
        retentionPeriodDays: policy.retentionPeriodDays,
        notificationSchedule: policy.notificationDays.map(days => {
          const notifyDate = new Date(finalDeletionDate.getTime() - days * 24 * 60 * 60 * 1000);
          return {
            daysBeforeDeletion: days,
            notificationDate: notifyDate.toISOString()
          };
        })
      };

      return {
        success: true,
        data: {
          message: `Account deactivated. Your data will be retained for ${policy.retentionPeriodDays} days (until ${finalDeletionDate.toLocaleDateString()}). You can reactivate your account within ${policy.gracePeriodDays} days without data loss.`,
          retentionInfo
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Deactivate with retention error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to deactivate account with retention policy');
    }
  }

  // Check accounts approaching deletion (for notifications)
  async getAccountsApproachingDeletion(daysBeforeDeletion: number): Promise<any[]> {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBeforeDeletion);
      
      const policy = this.getDataRetentionPolicy();
      const deactivationCutoff = new Date();
      deactivationCutoff.setDate(deactivationCutoff.getDate() - (policy.retentionPeriodDays - daysBeforeDeletion));

      const result = await this.db.query(`
        SELECT u.id, u.email, u.name, ual.created_at as deactivated_at
        FROM users u
        JOIN user_activity_log ual ON u.id = ual.user_id
        WHERE u.is_active = false 
        AND ual.action = 'account_deactivated'
        AND ual.created_at::date = $1::date
        ORDER BY ual.created_at DESC
      `, [deactivationCutoff.toISOString().split('T')[0]]);

      return result.rows;

    } catch (error) {
      console.error('Get accounts approaching deletion error:', error);
      return [];
    }
  }

  // Logout user (revoke session)
  async logoutUser(sessionToken: string): Promise<StrategistResponse<{ message: string }>> {
    const startTime = Date.now();
    
    try {
      const result = await this.db.query(`
        UPDATE user_sessions 
        SET is_revoked = true
        WHERE session_token = $1
        RETURNING user_id
      `, [sessionToken]);

      if (result.rows.length > 0) {
        await this.logUserActivity(result.rows[0].user_id, 'logout', {
          sessionToken: sessionToken.substring(0, 8) + '...' // Log partial token for security
        });
      }

      return {
        success: true,
        data: {
          message: 'Logged out successfully'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  // Handle failed login attempts
  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;
    let lockedUntil = null;

    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await this.db.query(`
      UPDATE users 
      SET login_attempts = $1, locked_until = $2
      WHERE id = $3
    `, [newAttempts, lockedUntil, userId]);

    // Log failed login attempt
    await this.logUserActivity(userId, 'login_failed', {
      attempts: newAttempts,
      lockedUntil
    });
  }

  // Log user activity
  private async logUserActivity(userId: string, action: string, details?: Record<string, any>): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO user_activity_log (user_id, action, details)
        VALUES ($1, $2, $3)
      `, [userId, action, details ? JSON.stringify(details) : null]);
    } catch (error) {
      console.error('Failed to log user activity:', error);
      // Don't throw here - logging failure shouldn't break the main operation
    }
  }

  // Track usage metrics
  async trackUsage(userId: string, metricType: 'ai_queries' | 'ventures_created' | 'members_invited' | 'integrations_connected'): Promise<void> {
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1); // First day of month
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month

      await this.db.query(`
        INSERT INTO user_usage_metrics (user_id, metric_type, count, period_start, period_end)
        VALUES ($1, $2, 1, $3, $4)
        ON CONFLICT (user_id, metric_type, period_start) 
        DO UPDATE SET count = user_usage_metrics.count + 1
      `, [userId, metricType, periodStart, periodEnd]);
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - usage tracking failure shouldn't break the main operation
    }
  }
}