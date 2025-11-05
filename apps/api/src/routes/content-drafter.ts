import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { 
  ContentGenerationRequest, 
  ContentGenerationResponse,
  ContentDraft,
  StrategistResponse 
} from '../types/collective-strategist';
import { aiServiceClient } from '../services/ai-client';
import { checkVentureAccess } from '../middleware/authorization';

// Validation schemas
const contentGenerationSchema = z.object({
  contextualCoreId: z.string().uuid(),
  contentType: z.enum(['social_post', 'blog_article', 'marketing_copy', 'email']),
  platform: z.string().optional(),
  prompt: z.string().min(10).max(1000).optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'authoritative']).optional().default('professional'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  aiProvider: z.string().optional()
});

const publishContentSchema = z.object({
  platform: z.string().optional(),
  scheduledFor: z.string().datetime().optional()
});

// Helper function to generate content-specific suggestions
function generateSuggestions(contentType: string, platform?: string, tone?: string): string[] {
  const suggestions: Record<string, string[]> = {
    social_post: [
      'Add a compelling question to increase engagement',
      'Include relevant hashtags for better discoverability',
      'Tag relevant influencers or partners',
      'Add a clear call-to-action'
    ],
    blog_article: [
      'Add relevant data and statistics to support key points',
      'Include case studies or examples',
      'Create visual elements like infographics',
      'Add internal links to related content'
    ],
    marketing_copy: [
      'A/B test different headlines',
      'Add social proof and testimonials',
      'Include urgency elements',
      'Optimize call-to-action placement'
    ],
    email: [
      'Personalize based on recipient behavior',
      'Test different subject lines',
      'Add more interactive elements',
      'Include relevant case studies'
    ]
  };

  return suggestions[contentType] || [
    'Review for brand voice consistency',
    'Optimize for target audience',
    'Include relevant calls-to-action',
    'Test different variations'
  ];
}

export async function contentDrafterRoutes(fastify: FastifyInstance) {
  // Generate content with AI Content Drafter
  fastify.post('/content-drafter/generate', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Generate content using AI Content Drafter',
      tags: ['Content Drafter'],
      body: {
        type: 'object',
        required: ['contextualCoreId', 'contentType'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          contentType: { 
            type: 'string', 
            enum: ['social_post', 'blog_article', 'marketing_copy', 'email'] 
          },
          platform: { type: 'string' },
          prompt: { type: 'string', minLength: 10, maxLength: 1000 },
          tone: { 
            type: 'string', 
            enum: ['professional', 'casual', 'enthusiastic', 'authoritative'],
            default: 'professional'
          },
          length: { 
            type: 'string', 
            enum: ['short', 'medium', 'long'],
            default: 'medium'
          },
          aiProvider: { type: 'string' }
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
                content: { type: 'string' },
                title: { type: 'string' },
                suggestions: { type: 'array', items: { type: 'string' } },
                alternativeVersions: { type: 'array', items: { type: 'string' } },
                processingTimeMs: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: ContentGenerationRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = contentGenerationSchema.safeParse(request.body);
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

      const { 
        contextualCoreId, 
        contentType, 
        platform, 
        prompt, 
        tone, 
        length, 
        aiProvider 
      } = validation.data;
      
      const userId = (request as any).user?.id;

      // Verify user has permission to create content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        contextualCoreId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to create content for this venture'
          }
        });
      }

      // TODO: Fetch contextual core data for brand voice and context
      // TODO: Store generated content as draft

      // Fetch business context (placeholder for now)
      const businessContext = `Business type: Strategic business consulting
Industry: Professional services
Target audience: Small business owners and entrepreneurs
Brand voice: Professional yet approachable, focused on actionable insights
Value proposition: Expert strategic guidance for sustainable growth`;

      // Generate content using AI service
      const aiResult = await aiServiceClient.generateContent({
        userId,
        contentType,
        businessContext,
        platform,
        prompt,
        tone,
        length
      });

      // Extract title from content if it's a blog article or marketing copy
      let title = '';
      let generatedContent = aiResult.text;
      
      if (contentType === 'blog_article' || contentType === 'marketing_copy') {
        const lines = aiResult.text.split('\n');
        const titleLine = lines.find(line => 
          line.startsWith('#') || 
          line.length < 100 && line.trim() && !line.includes('.')
        );
        if (titleLine) {
          title = titleLine.replace('#', '').trim();
        }
      }

      if (contentType === 'email') {
        const subjectMatch = aiResult.text.match(/Subject:\s*(.+)/);
        if (subjectMatch) {
          title = subjectMatch[1].trim();
        }
      }

      // Generate content-specific suggestions
      const suggestions = generateSuggestions(contentType, platform, tone);

      const generationResponse: ContentGenerationResponse = {
        content: generatedContent,
        title: title || undefined,
        suggestions,
        alternativeVersions: [
          // TODO: Generate alternative versions
        ],
        processingTimeMs: Date.now() - startTime
      };

      // TODO: Save as draft in database
      const draft: ContentDraft = {
        id: 'uuid-placeholder',
        userId,
        contextualCoreId,
        contentType,
        platform,
        title: title || undefined,
        content: generatedContent,
        aiProviderUsed: aiProvider || 'default',
        generationMetadata: {
          tone,
          length,
          prompt,
          processingTimeMs: generationResponse.processingTimeMs
        },
        isPublished: false,
        createdAt: new Date()
      };

      const response: StrategistResponse<ContentGenerationResponse> = {
        success: true,
        data: generationResponse,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          aiProvider: aiProvider || 'default'
        }
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONTENT_GENERATION_ERROR',
          message: 'Failed to generate content'
        }
      });
    }
  });

  // Get content drafts for a contextual core
  fastify.get('/content-drafter/drafts/:contextualCoreId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get content drafts for a contextual core',
      tags: ['Content Drafter'],
      params: {
        type: 'object',
        required: ['contextualCoreId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          contentType: { 
            type: 'string',
            enum: ['social_post', 'blog_article', 'marketing_copy', 'email']
          },
          published: { type: 'boolean' }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string };
    Querystring: { 
      limit?: number; 
      offset?: number; 
      contentType?: string;
      published?: boolean;
    }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId } = request.params;
      const { limit = 20, offset = 0, contentType, published } = request.query;
      const userId = (request as any).user?.id;

      // Verify user has permission to view content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        contextualCoreId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to view content for this venture'
          }
        });
      }
      
      // TODO: Fetch content drafts from database
      const drafts: ContentDraft[] = []; // Replace with actual DB query
      
      const response: StrategistResponse<{
        drafts: ContentDraft[];
        total: number;
        hasMore: boolean;
      }> = {
        success: true,
        data: {
          drafts,
          total: drafts.length,
          hasMore: drafts.length === limit
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
          code: 'DRAFTS_FETCH_ERROR',
          message: 'Failed to fetch content drafts'
        }
      });
    }
  });

  // Get a specific content draft
  fastify.get('/content-drafter/drafts/:contextualCoreId/:draftId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get a specific content draft',
      tags: ['Content Drafter'],
      params: {
        type: 'object',
        required: ['contextualCoreId', 'draftId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          draftId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string; draftId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId, draftId } = request.params;
      const userId = (request as any).user?.id;

      // Verify user has permission to view content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        contextualCoreId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to view content for this venture'
          }
        });
      }
      
      // TODO: Fetch specific draft from database
      const draft: ContentDraft | null = null; // Replace with actual DB query
      
      if (!draft) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'DRAFT_NOT_FOUND',
            message: 'Content draft not found'
          }
        });
      }

      const response: StrategistResponse<ContentDraft> = {
        success: true,
        data: draft,
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
          code: 'DRAFT_FETCH_ERROR',
          message: 'Failed to fetch content draft'
        }
      });
    }
  });

  // Update/edit a content draft
  fastify.put('/content-drafter/drafts/:contextualCoreId/:draftId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update a content draft',
      tags: ['Content Drafter'],
      params: {
        type: 'object',
        required: ['contextualCoreId', 'draftId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          draftId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          platform: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string; draftId: string };
    Body: { title?: string; content?: string; platform?: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId, draftId } = request.params;
      const updates = request.body;
      const userId = (request as any).user?.id;

      // Verify user has permission to edit content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        contextualCoreId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to edit content for this venture'
          }
        });
      }
      
      // TODO: Update draft in database
      const updatedDraft: ContentDraft | null = null; // Replace with actual DB update
      
      if (!updatedDraft) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'DRAFT_NOT_FOUND',
            message: 'Content draft not found'
          }
        });
      }

      const response: StrategistResponse<ContentDraft> = {
        success: true,
        data: updatedDraft,
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
          code: 'DRAFT_UPDATE_ERROR',
          message: 'Failed to update content draft'
        }
      });
    }
  });

  // Mark content as published
  fastify.post('/content-drafter/drafts/:contextualCoreId/:draftId/publish', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Mark content draft as published',
      tags: ['Content Drafter'],
      params: {
        type: 'object',
        required: ['contextualCoreId', 'draftId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          draftId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          scheduledFor: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string; draftId: string };
    Body: { platform?: string; scheduledFor?: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId, draftId } = request.params;
      const { platform, scheduledFor } = request.body;
      const userId = (request as any).user?.id;

      // Verify user has permission to publish content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        contextualCoreId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to publish content for this venture'
          }
        });
      }
      
      // TODO: Update draft as published in database
      // TODO: Optionally integrate with social media scheduling APIs
      
      const response: StrategistResponse<{ published: boolean; scheduledFor?: string }> = {
        success: true,
        data: { 
          published: true,
          scheduledFor 
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
          code: 'PUBLISH_ERROR',
          message: 'Failed to publish content'
        }
      });
    }
  });

  // Delete a content draft
  fastify.delete('/content-drafter/drafts/:contextualCoreId/:draftId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Delete a content draft',
      tags: ['Content Drafter'],
      params: {
        type: 'object',
        required: ['contextualCoreId', 'draftId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          draftId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string; draftId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId, draftId } = request.params;
      const userId = (request as any).user?.id;

      // Verify user has permission to delete content for this venture
      const { hasAccess } = await checkVentureAccess(
        userId, 
        contextualCoreId, 
        ['create_conversations']
      );
      
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to delete content for this venture'
          }
        });
      }
      
      // TODO: Delete draft from database
      
      const response: StrategistResponse<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
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
          code: 'DRAFT_DELETE_ERROR',
          message: 'Failed to delete content draft'
        }
      });
    }
  });
}