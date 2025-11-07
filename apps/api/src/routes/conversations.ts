import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ConversationService } from '../services/conversation-service';
import { db } from '../database/connection';
import { 
  CreateConversationRequest,
  UpdateConversationRequest,
  GetConversationsRequest,
  SendMessageRequest,
  StrategistResponse
} from '../types/collective-strategist';

// Validation schemas
const createConversationSchema = z.object({
  contextualCoreId: z.string().uuid(),
  title: z.string().min(1).max(500),
  sessionType: z.enum(['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']),
  tags: z.array(z.string()).optional()
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  tags: z.array(z.string()).optional()
});

const getConversationsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
  sessionType: z.enum(['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastActivityAt', 'totalMessages']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  messageType: z.enum(['user', 'ai']),
  attachments: z.array(z.object({
    attachmentType: z.string(),
    filename: z.string().optional(),
    data: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).optional()
});

export async function conversationRoutes(fastify: FastifyInstance) {
  const conversationService = new ConversationService(db);

  // Create a new conversation
  fastify.post('/conversations', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['contextualCoreId', 'title', 'sessionType'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 1, maxLength: 500 },
          sessionType: { 
            type: 'string', 
            enum: ['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis'] 
          },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    } as any
  }, async (request: FastifyRequest<{ Body: CreateConversationRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = createConversationSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conversation data',
            details: validation.error.issues
          }
        });
      }

      const userId = (request as any).user?.id;
      const conversation = await conversationService.createConversation(userId, validation.data as CreateConversationRequest);

      const response: StrategistResponse<typeof conversation> = {
        success: true,
        data: conversation,
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
          code: 'CONVERSATION_CREATE_ERROR',
          message: 'Failed to create conversation'
        }
      });
    }
  });

  // Get conversations for the authenticated user
  fastify.get('/conversations', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          sessionType: { 
            type: 'string',
            enum: ['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']
          },
          status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
          search: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          sortBy: { 
            type: 'string',
            enum: ['createdAt', 'updatedAt', 'lastActivityAt', 'totalMessages'],
            default: 'updatedAt'
          },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetConversationsRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = getConversationsSchema.safeParse(request.query);
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
      const result = await conversationService.getConversations(userId, validation.data);

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
          code: 'CONVERSATIONS_FETCH_ERROR',
          message: 'Failed to fetch conversations'
        }
      });
    }
  });

  // Get a specific conversation
  fastify.get('/conversations/:conversationId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['conversationId'],
        properties: {
          conversationId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { conversationId } = request.params;
      const userId = (request as any).user?.id;
      
      const conversation = await conversationService.getConversation(userId, conversationId);
      
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found'
          }
        });
      }

      const response: StrategistResponse<typeof conversation> = {
        success: true,
        data: conversation,
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
          code: 'CONVERSATION_FETCH_ERROR',
          message: 'Failed to fetch conversation'
        }
      });
    }
  });

  // Update a conversation
  fastify.patch('/conversations/:conversationId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['conversationId'],
        properties: {
          conversationId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { conversationId: string };
    Body: UpdateConversationRequest;
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = updateConversationSchema.safeParse(request.body);
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

      const { conversationId } = request.params;
      const userId = (request as any).user?.id;
      
      const conversation = await conversationService.updateConversation(userId, conversationId, validation.data);
      
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found'
          }
        });
      }

      const response: StrategistResponse<typeof conversation> = {
        success: true,
        data: conversation,
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
          code: 'CONVERSATION_UPDATE_ERROR',
          message: 'Failed to update conversation'
        }
      });
    }
  });

  // Add a message to a conversation
  fastify.post('/conversations/messages', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['conversationId', 'content', 'messageType'],
        properties: {
          conversationId: { type: 'string', format: 'uuid' },
          content: { type: 'string', minLength: 1 },
          messageType: { type: 'string', enum: ['user', 'ai'] },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                attachmentType: { type: 'string' },
                filename: { type: 'string' },
                data: { type: 'string' },
                metadata: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: SendMessageRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = sendMessageSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid message data',
            details: validation.error.issues
          }
        });
      }

      const userId = (request as any).user?.id;
      const message = await conversationService.addMessage(userId, validation.data as SendMessageRequest);

      const response: StrategistResponse<typeof message> = {
        success: true,
        data: message,
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
          code: 'MESSAGE_CREATE_ERROR',
          message: 'Failed to add message'
        }
      });
    }
  });

  // Delete a conversation
  fastify.delete('/conversations/:conversationId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['conversationId'],
        properties: {
          conversationId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { conversationId } = request.params;
      const userId = (request as any).user?.id;
      
      const deleted = await conversationService.deleteConversation(userId, conversationId);
      
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found'
          }
        });
      }

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
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONVERSATION_DELETE_ERROR',
          message: 'Failed to delete conversation'
        }
      });
    }
  });

  // Get conversation statistics
  fastify.get('/conversations/stats', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['Conversations'],
      security: [{ Bearer: [] }]
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const userId = (request as any).user?.id;
      const stats = await conversationService.getConversationStats(userId);

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
          message: 'Failed to fetch conversation statistics'
        }
      });
    }
  });
}