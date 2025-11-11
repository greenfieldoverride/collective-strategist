/// <reference path="../types/fastify.d.ts" />
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { User, StrategistResponse } from '../types/collective-strategist';
import { db } from '../database/connection';
import { UserService, CreateUserRequest, ChangePasswordRequest } from '../services/user-service';

// Create pool directly with correct environment variables
let userService: UserService;

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  tier: z.enum(['sovereign_circle', 'individual_pro']).optional().default('individual_pro'),
  greenfieldOverrideId: z.string().uuid().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  pronouns: z.string().optional(),
  location: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  preferredLanguage: z.string().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

const userPreferencesSchema = z.object({
  briefingFrequency: z.enum(['weekly', 'monthly']).optional(),
  preferredAiProvider: z.string().optional(),
  notificationPreferences: z.object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    websocket: z.boolean().optional()
  }).optional(),
  timezone: z.string().optional()
});

const consultantPreferencesSchema = z.object({
  defaultSessionType: z.string().optional(),
  autoSaveConversations: z.boolean().optional(),
  exportFormatPreference: z.enum(['markdown', 'pdf', 'json', 'html']).optional(),
  uiTheme: z.enum(['light', 'dark', 'auto']).optional(),
  notificationPreferences: z.object({
    weeklySummary: z.boolean().optional(),
    conversationShared: z.boolean().optional(),
    newRecommendations: z.boolean().optional()
  }).optional()
});

export async function authRoutes(fastify: FastifyInstance) {
  // Use shared database connection for DRY principle - same connection as all other routes
  const userService = new UserService(db.poolInstance);
  // User registration
  fastify.post('/auth/register', {
    schema: {
      description: 'Register a new user account',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          tier: { 
            type: 'string', 
            enum: ['sovereign_circle', 'individual_pro'],
            default: 'individual_pro'
          },
          greenfieldOverrideId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    tier: { type: 'string' },
                    createdAt: { type: 'string' }
                  }
                },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { email: string; password: string; name?: string; tier?: string; greenfieldOverrideId?: string } }>, reply: FastifyReply) => {
    try {
      const validation = registerSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validation.error.issues
          }
        });
      }

      const result = await userService.createUser(validation.data as CreateUserRequest);
      
      if (!result.data) {
        throw new Error('User creation failed');
      }
      
      // For now, we'll create a JWT session token instead of the email verification flow
      // TODO: Implement email verification in production
      const sessionToken = fastify.jwt.sign({ 
        id: result.data.user.id, 
        email: result.data.user.email, 
        tier: result.data.user.tier 
      });

      return reply.status(201).send({
        success: true,
        data: {
          user: result.data.user,
          token: sessionToken
        },
        meta: result.meta
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create user account'
        }
      });
    }
  });

  // User login
  fastify.post('/auth/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    tier: { type: 'string' }
                  }
                },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = loginSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validation.error.issues
          }
        });
      }

      const { email, password } = validation.data;

      // Get client info for security logging
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      // Use UserService to authenticate
      const result = await userService.loginUser({
        email,
        password,
        ipAddress,
        userAgent
      });

      if (!result.data) {
        throw new Error('Login failed - no user data returned');
      }

      // UserService returns a session token, but we also need a JWT for the frontend
      const jwtToken = fastify.jwt.sign({ 
        id: result.data.user.id, 
        email: result.data.user.email, 
        tier: result.data.user.tier,
        sessionToken: result.data.sessionToken
      });

      const response: StrategistResponse<{ user: Omit<User, 'passwordHash'>; token: string }> = {
        success: true,
        data: {
          user: result.data.user,
          token: jwtToken
        },
        meta: result.meta
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Failed to authenticate user'
        }
      });
    }
  });

  // Get current user info
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current authenticated user information',
      tags: ['Authentication'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                tier: { type: 'string' },
                isVerifiedSovereignCircle: { type: 'boolean' },
                createdAt: { type: 'string' },
                lastLoginAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      
      // Extract session token from JWT payload
      const sessionToken = tokenData.sessionToken;
      
      if (!sessionToken) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_SESSION',
            message: 'No session token found'
          }
        });
      }

      // Fetch full user info using session token
      const user = await userService.getUserBySession(sessionToken);
      
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired or is invalid'
          }
        });
      }
      
      const response: StrategistResponse<Omit<User, 'passwordHash'>> = {
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'USER_FETCH_ERROR',
          message: 'Failed to fetch user information'
        }
      });
    }
  });

  // Get user profile (more detailed than /auth/me)
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get detailed user profile information',
      tags: ['Profile'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                tier: { type: 'string' },
                name: { type: 'string' },
                bio: { type: 'string' },
                pronouns: { type: 'string' },
                location: { type: 'string' },
                websiteUrl: { type: 'string' },
                profileImageUrl: { type: 'string' },
                isVerifiedSovereignCircle: { type: 'boolean' },
                emailVerified: { type: 'boolean' },
                preferredLanguage: { type: 'string' },
                onboardingCompleted: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                lastLoginAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const sessionToken = tokenData.sessionToken;
      
      if (!sessionToken) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_SESSION',
            message: 'No session token found'
          }
        });
      }

      const user = await userService.getUserBySession(sessionToken);
      
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired or is invalid'
          }
        });
      }
      
      const response: StrategistResponse<Omit<User, 'passwordHash'>> = {
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PROFILE_FETCH_ERROR',
          message: 'Failed to fetch profile information'
        }
      });
    }
  });

  // Update user profile
  fastify.put('/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update user profile information',
      tags: ['Profile'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          bio: { type: 'string' },
          pronouns: { type: 'string' },
          location: { type: 'string' },
          websiteUrl: { type: 'string', format: 'uri' },
          preferredLanguage: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    tier: { type: 'string' },
                    name: { type: 'string' },
                    bio: { type: 'string' },
                    pronouns: { type: 'string' },
                    location: { type: 'string' },
                    websiteUrl: { type: 'string' },
                    preferredLanguage: { type: 'string' },
                    updatedAt: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { name?: string; bio?: string; pronouns?: string; location?: string; websiteUrl?: string; preferredLanguage?: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const validation = updateProfileSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid profile data',
            details: validation.error.issues
          }
        });
      }

      const result = await userService.updateUser(userId, validation.data);
      
      if (!result.data) {
        throw new Error('Profile update failed');
      }

      return reply.send({
        success: true,
        data: {
          user: result.data.user
        },
        meta: result.meta
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PROFILE_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update profile'
        }
      });
    }
  });

  // Upload profile image
  fastify.post('/profile/image', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Upload user profile image',
      tags: ['Profile'],
      security: [{ Bearer: [] }],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    profileImageUrl: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      // Get the uploaded file
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded'
          }
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
          }
        });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const buffer = await data.toBuffer();
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 5MB'
          }
        });
      }

      // For now, we'll create a placeholder URL
      // In production, you would upload to a cloud storage service like S3, Cloudinary, etc.
      const timestamp = Date.now();
      const extension = data.mimetype.split('/')[1];
      const filename = `profile_${userId}_${timestamp}.${extension}`;
      const imageUrl = `/uploads/profile-images/${filename}`;

      // TODO: Actually save the file to storage
      // For now, we'll just update the database with the placeholder URL
      
      const result = await userService.updateProfileImage(userId, imageUrl);
      
      return reply.send({
        success: true,
        data: result.data,
        meta: {
          ...result.meta,
          fileInfo: {
            originalFilename: data.filename,
            mimetype: data.mimetype,
            size: buffer.length
          }
        }
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'IMAGE_UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload profile image'
        }
      });
    }
  });

  // Change password
  fastify.put('/auth/change-password', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Change user password',
      tags: ['Authentication'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { currentPassword: string; newPassword: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const validation = changePasswordSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid password data',
            details: validation.error.issues
          }
        });
      }

      const result = await userService.changePassword(userId, validation.data as ChangePasswordRequest);
      
      return reply.send({
        success: true,
        data: result.data,
        meta: result.meta
      });

    } catch (error) {
      console.error(error);
      
      // Handle specific error types
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      const statusCode = errorMessage.includes('Current password is incorrect') ? 400 : 500;
      
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: statusCode === 400 ? 'INVALID_CURRENT_PASSWORD' : 'PASSWORD_CHANGE_ERROR',
          message: errorMessage
        }
      });
    }
  });

  // Get user settings/preferences
  fastify.get('/settings', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get user preferences and settings',
      tags: ['Settings'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                preferences: { type: 'object' },
                consultantPreferences: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const result = await userService.getUserPreferences(userId);
      
      return reply.send({
        success: true,
        data: result.data,
        meta: result.meta
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SETTINGS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch settings'
        }
      });
    }
  });

  // Update user preferences
  fastify.put('/settings/preferences', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update user preferences',
      tags: ['Settings'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        properties: {
          briefingFrequency: { type: 'string', enum: ['weekly', 'monthly'] },
          preferredAiProvider: { type: 'string' },
          notificationPreferences: {
            type: 'object',
            properties: {
              push: { type: 'boolean' },
              email: { type: 'boolean' },
              websocket: { type: 'boolean' }
            }
          },
          timezone: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                preferences: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const validation = userPreferencesSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid preferences data',
            details: validation.error.issues
          }
        });
      }

      const result = await userService.updateUserPreferences(userId, validation.data);
      
      return reply.send({
        success: true,
        data: result.data,
        meta: result.meta
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PREFERENCES_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update preferences'
        }
      });
    }
  });

  // Update consultant preferences
  fastify.put('/settings/consultant', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update AI consultant preferences',
      tags: ['Settings'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        properties: {
          defaultSessionType: { type: 'string' },
          autoSaveConversations: { type: 'boolean' },
          exportFormatPreference: { type: 'string', enum: ['markdown', 'pdf', 'json', 'html'] },
          uiTheme: { type: 'string', enum: ['light', 'dark', 'auto'] },
          notificationPreferences: {
            type: 'object',
            properties: {
              weeklySummary: { type: 'boolean' },
              conversationShared: { type: 'boolean' },
              newRecommendations: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                consultantPreferences: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const validation = consultantPreferencesSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid consultant preferences data',
            details: validation.error.issues
          }
        });
      }

      const result = await userService.updateConsultantPreferences(userId, validation.data);
      
      return reply.send({
        success: true,
        data: result.data,
        meta: result.meta
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONSULTANT_PREFERENCES_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update consultant preferences'
        }
      });
    }
  });

  // Export user data (GDPR compliance)
  fastify.get('/account/export', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Export all user data (GDPR compliance)',
      tags: ['Data Management'],
      security: [{ Bearer: [] }],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv'], default: 'json' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { format?: 'json' | 'csv' } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const format = request.query.format || 'json';
      const result = await userService.exportUserData(userId, format);
      
      if (format === 'csv') {
        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="user_data_export_${userId}_${new Date().toISOString().split('T')[0]}.csv"`)
          .send(result.data);
      }

      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="user_data_export_${userId}_${new Date().toISOString().split('T')[0]}.json"`)
        .send({
          success: true,
          data: result.data,
          meta: result.meta
        });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DATA_EXPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to export user data'
        }
      });
    }
  });

  // Get data retention policy info
  fastify.get('/account/retention-policy', {
    schema: {
      description: 'Get data retention policy information',
      tags: ['Data Management'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                retentionPeriodDays: { type: 'number' },
                gracePeriodDays: { type: 'number' },
                notificationDays: { type: 'array', items: { type: 'number' } },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const policy = userService.getDataRetentionPolicy();
      
      return reply.send({
        success: true,
        data: {
          ...policy,
          description: `When you deactivate your account, your data will be retained for ${policy.retentionPeriodDays} days. During the first ${policy.gracePeriodDays} days, you can reactivate your account without any data loss. After the full retention period, all your data will be permanently deleted. We will notify you at ${policy.notificationDays.join(', ')} days before final deletion.`
        }
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'POLICY_FETCH_ERROR',
          message: 'Failed to fetch retention policy'
        }
      });
    }
  });

  // Deactivate account with retention policy
  fastify.delete('/account', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Deactivate user account (soft delete)',
      tags: ['Account Management'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { reason?: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const tokenData = (request as any).user;
      const userId = tokenData.id;
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User ID not found in token'
          }
        });
      }

      const result = await userService.deactivateAccountWithRetention(userId, request.body?.reason);
      
      return reply.send({
        success: true,
        data: result.data,
        meta: result.meta
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to deactivate account'
        }
      });
    }
  });

  // Logout (optional - JWT is stateless)
  fastify.post('/auth/logout', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Logout user (invalidate token)',
      tags: ['Authentication'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Since JWT is stateless, logout is mainly client-side
    // In a production app, you might maintain a blacklist of invalid tokens
    return {
      success: true,
      message: 'Logged out successfully'
    };
  });
}