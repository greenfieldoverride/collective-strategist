import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { VentureService } from '../services/venture-service';
// import { MockVentureService } from '../services/mock-venture-service';
import { 
  CreateVentureRequest,
  UpdateVentureRequest,
  GetVenturesRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  VentureStatsResponse,
  AcceptInvitationRequest,
  StrategistResponse
} from '../types/collective-strategist';
import { db } from '../database/connection';
import { cacheService, CacheService, CacheKeys } from '../services/cache-service';

// Validation schemas
const createVentureSchema = z.object({
  name: z.string().min(1).max(255),
  ventureType: z.enum(['sovereign_circle', 'professional', 'cooperative', 'solo']),
  isGreenfieldAffiliate: z.boolean().optional(),
  sovereignCircleId: z.string().optional(),
  coreValues: z.array(z.string()).optional(),
  primaryGoals: z.array(z.string()).optional(),
  ventureVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  costSharingEnabled: z.boolean().optional(),
  costSharingMethod: z.enum(['equal', 'contribution_based', 'custom']).optional()
});

const updateVentureSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  coreValues: z.array(z.string()).optional(),
  primaryGoals: z.array(z.string()).optional(),
  ventureVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  costSharingEnabled: z.boolean().optional(),
  costSharingMethod: z.enum(['equal', 'contribution_based', 'custom']).optional(),
  costSharingNotes: z.string().optional(),
  status: z.enum(['active', 'archived', 'suspended']).optional()
});

const getVenturesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
  ventureType: z.enum(['sovereign_circle', 'professional', 'cooperative', 'solo']).optional(),
  status: z.enum(['active', 'archived', 'suspended']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastActivityAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeMembers: z.coerce.boolean().optional()
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['co_owner', 'contributor', 'collaborator', 'observer']),
  permissions: z.array(z.enum(['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'])).optional(),
  costSharePercentage: z.number().min(0).max(100).optional(),
  personalMessage: z.string().max(500).optional()
});

export async function ventureRoutes(fastify: FastifyInstance) {
  const ventureService = new VentureService(db);

  // Create a new venture
  fastify.post('/ventures', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['name', 'ventureType'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          ventureType: { 
            type: 'string', 
            enum: ['sovereign_circle', 'professional', 'cooperative', 'solo'] 
          },
          isGreenfieldAffiliate: { type: 'boolean' },
          sovereignCircleId: { type: 'string' },
          coreValues: { type: 'array', items: { type: 'string' } },
          primaryGoals: { type: 'array', items: { type: 'string' } },
          ventureVoice: { type: 'string' },
          targetAudience: { type: 'string' },
          costSharingEnabled: { type: 'boolean' },
          costSharingMethod: { type: 'string', enum: ['equal', 'contribution_based', 'custom'] }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateVentureRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = createVentureSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid venture data',
            details: validation.error.issues
          }
        });
      }

      const userId = (request as any).user?.id;
      const venture = await ventureService.createVenture(userId, validation.data as CreateVentureRequest);

      const response: StrategistResponse<typeof venture> = {
        success: true,
        data: venture,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.status(201).send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'VENTURE_CREATE_ERROR',
          message: 'Failed to create venture'
        }
      });
    }
  });

  // Get ventures for the authenticated user
  fastify.get('/ventures', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          ventureType: { 
            type: 'string',
            enum: ['sovereign_circle', 'professional', 'cooperative', 'solo']
          },
          status: { type: 'string', enum: ['active', 'archived', 'suspended'] },
          search: { type: 'string' },
          sortBy: { 
            type: 'string',
            enum: ['createdAt', 'updatedAt', 'lastActivityAt', 'name'],
            default: 'updatedAt'
          },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          includeMembers: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetVenturesRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = getVenturesSchema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.issues
          }
        });
      }

      const userId = (request as any).user?.id;
      
      // Check cache first
      const cacheKey = CacheService.generateKey(CacheKeys.VENTURE, userId, 'list');
      const cachedVentures = await cacheService.get(cacheKey);
      
      if (cachedVentures) {
        console.log('Cache hit for user ventures:', userId);
        return {
          success: true,
          data: cachedVentures,
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }
      
      // TEMPORARY: Mock data for MVP testing (replace with real DB when ready)
      const mockVentures = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Liberation Collective',
          ventureType: 'cooperative',
          primaryBillingOwner: userId,
          billingTier: 'liberation',
          maxMembers: 50,
          status: 'active',
          isGreenfieldAffiliate: true,
          sovereignCircleId: 'sovereign-circle-1',
          coreValues: [
            'Community sovereignty',
            'Open source technology',
            'Economic justice',
            'Mutual aid'
          ],
          primaryGoals: [
            'Build liberation-focused software tools',
            'Support local community resilience',
            'Create sustainable funding models',
            'Share knowledge freely'
          ],
          ventureVoice: 'Collaborative, empowering, and focused on systemic change.',
          targetAudience: 'Activists, technologists, and community organizers working toward liberation',
          costSharingEnabled: true,
          costSharingMethod: 'contribution_based',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-12-01'),
          lastActivityAt: new Date('2024-12-01')
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Creative Commons Studio',
          ventureType: 'professional',
          primaryBillingOwner: userId,
          billingTier: 'professional',
          maxMembers: 12,
          status: 'active',
          isGreenfieldAffiliate: false,
          coreValues: [
            'Artistic freedom',
            'Cultural preservation',
            'Anti-capitalist creativity',
            'Community storytelling'
          ],
          primaryGoals: [
            'Create independent media content',
            'Support marginalized artists',
            'Build sustainable creative economy',
            'Preserve cultural knowledge'
          ],
          ventureVoice: 'Creative, inclusive, and culturally rooted.',
          targetAudience: 'Artists, cultural workers, and communities seeking authentic representation',
          costSharingEnabled: true,
          costSharingMethod: 'equal',
          createdAt: new Date('2024-03-10'),
          updatedAt: new Date('2024-11-28'),
          lastActivityAt: new Date('2024-11-28')
        }
      ];
      
      const result = {
        ventures: mockVentures,
        totalCount: mockVentures.length,
        hasMore: false
      };
      
      // const result = await ventureService.getVentures(userId, validation.data);

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, result, CacheService.TTL.FIVE_MINUTES);
      console.log('Cached user ventures:', userId);

      const response: StrategistResponse<typeof result> = {
        success: true,
        data: result,
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
          code: 'VENTURES_FETCH_ERROR',
          message: 'Failed to fetch ventures'
        }
      });
    }
  });

  // Get a specific venture
  fastify.get('/ventures/:ventureId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { ventureId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      const userId = (request as any).user?.id;
      
      // Check cache first
      const cacheKey = CacheService.generateKey(CacheKeys.VENTURE, ventureId);
      const cachedVenture = await cacheService.get(cacheKey);
      
      if (cachedVenture) {
        console.log('Cache hit for venture:', ventureId);
        return {
          success: true,
          data: { venture: cachedVenture },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }
      
      const venture = await ventureService.getVenture(userId, ventureId);
      
      if (!venture) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'VENTURE_NOT_FOUND',
            message: 'Venture not found or access denied'
          }
        });
      }

      const response: StrategistResponse<typeof venture> = {
        success: true,
        data: venture,
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
          code: 'VENTURE_FETCH_ERROR',
          message: 'Failed to fetch venture'
        }
      });
    }
  });

  // Update a venture
  fastify.patch('/ventures/:ventureId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          coreValues: { type: 'array', items: { type: 'string' } },
          primaryGoals: { type: 'array', items: { type: 'string' } },
          ventureVoice: { type: 'string' },
          targetAudience: { type: 'string' },
          costSharingEnabled: { type: 'boolean' },
          costSharingMethod: { type: 'string', enum: ['equal', 'contribution_based', 'custom'] },
          costSharingNotes: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived', 'suspended'] }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { ventureId: string };
    Body: UpdateVentureRequest;
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = updateVentureSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: validation.error.issues
          }
        });
      }

      const { ventureId } = request.params;
      const userId = (request as any).user?.id;
      
      const venture = await ventureService.updateVenture(userId, ventureId, validation.data);
      
      if (!venture) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'VENTURE_NOT_FOUND',
            message: 'Venture not found or access denied'
          }
        });
      }

      const response: StrategistResponse<typeof venture> = {
        success: true,
        data: venture,
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
          code: 'VENTURE_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update venture'
        }
      });
    }
  });

  // Invite a member to a venture
  fastify.post('/ventures/:ventureId/members/invite', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['co_owner', 'contributor', 'collaborator', 'observer'] },
          permissions: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all']
            } 
          },
          costSharePercentage: { type: 'number', minimum: 0, maximum: 100 },
          personalMessage: { type: 'string', maxLength: 500 }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { ventureId: string };
    Body: InviteMemberRequest;
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = inviteMemberSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid invitation data',
            details: validation.error.issues
          }
        });
      }

      const { ventureId } = request.params;
      const userId = (request as any).user?.id;
      
      const invitation = await ventureService.inviteMember(userId, ventureId, validation.data as InviteMemberRequest);

      const response: StrategistResponse<typeof invitation> = {
        success: true,
        data: invitation,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.status(201).send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INVITATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send invitation'
        }
      });
    }
  });

  // Get venture statistics
  fastify.get('/ventures/:ventureId/stats', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { ventureId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      const userId = (request as any).user?.id;
      
      const stats = await ventureService.getVentureStats(userId, ventureId);

      const response: StrategistResponse<typeof stats> = {
        success: true,
        data: stats,
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
          code: 'STATS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch venture statistics'
        }
      });
    }
  });

  // Delete/archive a venture
  fastify.delete('/ventures/:ventureId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Ventures'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { ventureId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      const userId = (request as any).user?.id;
      
      const deleted = await ventureService.deleteVenture(userId, ventureId);
      
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'VENTURE_NOT_FOUND',
            message: 'Venture not found or access denied'
          }
        });
      }

      // Clear cache for deleted venture
      const cacheKey = CacheService.generateKey(CacheKeys.VENTURE, ventureId);
      await cacheService.del(cacheKey);
      console.log('Cleared cache for deleted venture:', ventureId);

      const response: StrategistResponse<boolean> = {
        success: true,
        data: deleted,
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
          code: 'VENTURE_DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to archive venture'
        }
      });
    }
  });

  // Development/Demo route - mock ventures (no auth required)
  fastify.get('/ventures/demo', {
    schema: {
      tags: ['Ventures'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                ventures: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      ventureType: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                },
                total: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const mockVentures = [
      {
        id: 'demo-venture-1',
        name: 'Liberation Tech Collective',
        ventureType: 'sovereign_circle',
        status: 'active',
        isGreenfieldAffiliate: true,
        billingTier: 'liberation',
        memberCount: 12,
        createdAt: new Date('2024-01-15').toISOString(),
        coreValues: ['Anti-gatekeeping', 'Community sovereignty', 'Open knowledge'],
        primaryGoals: ['Build liberation infrastructure', 'Share knowledge freely', 'Support creator independence']
      },
      {
        id: 'demo-venture-2', 
        name: 'Creative Independence Hub',
        ventureType: 'cooperative',
        status: 'active',
        isGreenfieldAffiliate: false,
        billingTier: 'professional',
        memberCount: 8,
        createdAt: new Date('2024-03-20').toISOString(),
        coreValues: ['Creative freedom', 'Fair compensation', 'Mutual support'],
        primaryGoals: ['Diversify revenue streams', 'Build loyal audience', 'Reduce platform dependency']
      },
      {
        id: 'demo-venture-3',
        name: 'Solo Consultant Practice',
        ventureType: 'solo',
        status: 'active', 
        isGreenfieldAffiliate: false,
        billingTier: 'professional',
        memberCount: 1,
        createdAt: new Date('2024-02-10').toISOString(),
        coreValues: ['Ethical business', 'Long-term thinking', 'Client success'],
        primaryGoals: ['Build reputation', 'Increase rates', 'Create passive income']
      }
    ];

    const response = {
      success: true,
      data: {
        ventures: mockVentures,
        total: mockVentures.length,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: 1
      }
    };

    return reply.send(response);
  });
}