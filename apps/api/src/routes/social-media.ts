import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { checkVentureAccess, requireVenturePermissions, PermissionSets } from '../middleware/authorization';
import { 
  socialMediaClient, 
  SocialMediaAccount, 
  SocialPostRequest, 
  MarketDataRequest, 
  SocialAnalyticsRequest 
} from '../services/social-media-client';
import { StrategistResponse } from '../types/collective-strategist';

// Validation schemas
const connectAccountSchema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'tiktok', 'facebook']),
  authCode: z.string().min(1),
  redirectUri: z.string().url()
});

const publishPostSchema = z.object({
  accountId: z.string().uuid(),
  ventureId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    altText: z.string().optional()
  })).optional(),
  scheduledFor: z.string().datetime().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional()
});

const marketDataSchema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'tiktok']),
  keywords: z.array(z.string().min(1)).min(1).max(10),
  timeRange: z.enum(['day', 'week', 'month', 'quarter']).optional().default('week'),
  metrics: z.array(z.enum(['mentions', 'sentiment', 'engagement', 'reach', 'trends'])).optional()
});

const analyticsSchema = z.object({
  accountId: z.string().uuid(),
  timeRange: z.enum(['day', 'week', 'month', 'quarter']).optional().default('week'),
  metrics: z.array(z.string()).optional()
});

export async function socialMediaRoutes(fastify: FastifyInstance) {
  // Connect social media account
  fastify.post('/social-media/connect', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Connect a social media account',
      tags: ['Social Media'],
      body: {
        type: 'object',
        required: ['platform', 'authCode', 'redirectUri'],
        properties: {
          platform: { 
            type: 'string', 
            enum: ['twitter', 'linkedin', 'instagram', 'tiktok', 'facebook'] 
          },
          authCode: { type: 'string', minLength: 1 },
          redirectUri: { type: 'string', format: 'uri' }
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
                id: { type: 'string' },
                platform: { type: 'string' },
                accountName: { type: 'string' },
                isActive: { type: 'boolean' },
                permissions: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = connectAccountSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const { platform, authCode, redirectUri } = validation.data;
      const userId = (request as any).user?.id;

      const account = await socialMediaClient.connectAccount({
        userId,
        platform,
        authCode,
        redirectUri
      });

      // TODO: Save account to database
      
      const response: StrategistResponse<{
        id: string;
        platform: string;
        accountName: string;
        isActive: boolean;
        permissions: string[];
      }> = {
        success: true,
        data: {
          id: account.id,
          platform: account.platform,
          accountName: account.accountName,
          isActive: account.isActive,
          permissions: account.permissions
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message || 'Failed to connect social media account'
        }
      });
    }
  });

  // Get connected social media accounts
  fastify.get('/social-media/accounts', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get connected social media accounts',
      tags: ['Social Media'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accounts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      platform: { type: 'string' },
                      accountName: { type: 'string' },
                      isActive: { type: 'boolean' },
                      permissions: { type: 'array', items: { type: 'string' } },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
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
      const userId = (request as any).user?.id;
      
      // TODO: Fetch user's connected accounts from database
      const accounts: SocialMediaAccount[] = []; // Replace with actual DB query
      
      const response: StrategistResponse<{ accounts: SocialMediaAccount[] }> = {
        success: true,
        data: { accounts },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ACCOUNTS_FETCH_ERROR',
          message: 'Failed to fetch social media accounts'
        }
      });
    }
  });

  // Publish content to social media
  fastify.post('/social-media/publish', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Publish content to social media platform',
      tags: ['Social Media'],
        body: {
          type: 'object',
          required: ['accountId', 'ventureId', 'content'],
          properties: {
            accountId: { type: 'string', format: 'uuid' },
            ventureId: { type: 'string', format: 'uuid' },
            content: { type: 'string', minLength: 1, maxLength: 4000 },
          media: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['image', 'video'] },
                url: { type: 'string', format: 'uri' },
                altText: { type: 'string' }
              }
            }
          },
          scheduledFor: { type: 'string', format: 'date-time' },
          hashtags: { type: 'array', items: { type: 'string' } },
          mentions: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = publishPostSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const { accountId, ventureId, content, media, scheduledFor, hashtags, mentions } = validation.data;
      const userId = (request as any).user?.id;

      // Verify user has permission to create content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        ventureId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to publish social media content for this venture'
          }
        });
      }

      // TODO: Fetch account from database and verify ownership
      // Mock account for now - replace with actual DB query
      const account: SocialMediaAccount = {
        id: accountId,
        userId: userId,
        platform: 'twitter' as const,
        accountId: 'mock-account-id',
        accountName: 'Mock Account',
        accessToken: 'mock-token',
        isActive: true,
        permissions: ['read', 'write'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // In production, verify account exists and user owns it
      // if (!account) {
      //   return reply.status(404).send({
      //     success: false,
      //     error: {
      //       code: 'ACCOUNT_NOT_FOUND',
      //       message: 'Social media account not found'
      //     }
      //   });
      // }

      // Verify user owns this social media account  
      if (account.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You do not own this social media account.'
          }
        });
      }

      const post: SocialPostRequest = {
        platform: account.platform,
        content,
        media,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        hashtags,
        mentions
      };

      const result = await socialMediaClient.publishPost(account, post);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'PUBLISH_ERROR',
            message: result.error || 'Failed to publish post'
          }
        });
      }

      // TODO: Save published post record to database

      const response: StrategistResponse<{
        postId?: string;
        url?: string;
        scheduledFor?: Date;
        published: boolean;
      }> = {
        success: true,
        data: {
          postId: result.postId,
          url: result.url,
          scheduledFor: result.scheduledFor,
          published: !result.scheduledFor
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PUBLISH_ERROR',
          message: error.message || 'Failed to publish content'
        }
      });
    }
  });

  // Get market data from social platforms
  fastify.post('/social-media/market-data', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get market data from social media platforms',
      tags: ['Social Media'],
      body: {
        type: 'object',
        required: ['platform', 'keywords'],
        properties: {
          platform: { 
            type: 'string', 
            enum: ['twitter', 'linkedin', 'instagram', 'tiktok'] 
          },
          keywords: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
            maxItems: 10
          },
          timeRange: { 
            type: 'string', 
            enum: ['day', 'week', 'month', 'quarter'],
            default: 'week'
          },
          metrics: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['mentions', 'sentiment', 'engagement', 'reach', 'trends']
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = marketDataSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const marketDataRequest: MarketDataRequest = validation.data;
      const marketData = await socialMediaClient.getMarketData(marketDataRequest);

      const response: StrategistResponse<typeof marketData> = {
        success: true,
        data: marketData,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MARKET_DATA_ERROR',
          message: error.message || 'Failed to fetch market data'
        }
      });
    }
  });

  // Get analytics for connected social media account
  fastify.get('/social-media/analytics/:accountId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get analytics for a connected social media account',
      tags: ['Social Media'],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          timeRange: { 
            type: 'string', 
            enum: ['day', 'week', 'month', 'quarter'],
            default: 'week'
          },
          metrics: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { accountId: string };
    Querystring: { timeRange?: string; metrics?: string[] }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { accountId } = request.params;
      const { timeRange = 'week', metrics } = request.query;
      const userId = (request as any).user?.id;

      // TODO: Fetch account from database and verify ownership
      // Mock account for now - replace with actual DB query
      const account: SocialMediaAccount = {
        id: accountId,
        userId: userId,
        platform: 'twitter' as const,
        accountId: 'mock-account-id',
        accountName: 'Mock Account',
        accessToken: 'mock-token',
        isActive: true,
        permissions: ['read', 'write'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // In production, verify account exists
      // if (!account) {
      //   return reply.status(404).send({
      //     success: false,
      //     error: {
      //       code: 'ACCOUNT_NOT_FOUND',
      //       message: 'Social media account not found'
      //     }
      //   });
      // }

      const analyticsRequest: SocialAnalyticsRequest = {
        platform: account.platform,
        accountId,
        timeRange: timeRange as any,
        metrics
      };

      const analytics = await socialMediaClient.getAnalytics(account, analyticsRequest);

      const response: StrategistResponse<typeof analytics> = {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to fetch analytics'
        }
      });
    }
  });

  // Disconnect social media account
  fastify.delete('/social-media/accounts/:accountId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Disconnect a social media account',
      tags: ['Social Media'],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { accountId } = request.params;
      const userId = (request as any).user?.id;

      // TODO: Remove account from database
      
      const response: StrategistResponse<{ disconnected: boolean }> = {
        success: true,
        data: { disconnected: true },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DISCONNECT_ERROR',
          message: 'Failed to disconnect social media account'
        }
      });
    }
  });

  // Validate social media account connection
  fastify.post('/social-media/accounts/:accountId/validate', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Validate social media account connection',
      tags: ['Social Media'],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { accountId } = request.params;
      const userId = (request as any).user?.id;

      // TODO: Fetch account from database and verify ownership
      // Mock account for now - replace with actual DB query
      const account: SocialMediaAccount = {
        id: accountId,
        userId: userId,
        platform: 'twitter' as const,
        accountId: 'mock-account-id',
        accountName: 'Mock Account',
        accessToken: 'mock-token',
        isActive: true,
        permissions: ['read', 'write'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // In production, verify account exists
      // if (!account) {
      //   return reply.status(404).send({
      //     success: false,
      //     error: {
      //       code: 'ACCOUNT_NOT_FOUND',
      //       message: 'Social media account not found'
      //     }
      //   });
      // }

      const isValid = await socialMediaClient.validateAccount(account);
      
      if (!isValid) {
        // TODO: Mark account as inactive in database
      }

      const response: StrategistResponse<{ 
        valid: boolean; 
        needsReconnection: boolean;
      }> = {
        success: true,
        data: { 
          valid: isValid,
          needsReconnection: !isValid 
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate social media account'
        }
      });
    }
  });
}