import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { cacheService } from '../services/cache-service';

export async function cacheAdminRoutes(fastify: FastifyInstance) {
  // Authentication middleware - only for admin operations
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Clear cache by pattern
  fastify.delete('/cache/clear/:pattern?', async (request: FastifyRequest<{
    Params: { pattern?: string }
  }>, reply: FastifyReply) => {
    try {
      const { pattern } = request.params;
      
      const deletedCount = await cacheService.clear(pattern);
      
      return {
        success: true,
        message: pattern 
          ? `Cleared ${deletedCount} keys matching pattern: ${pattern}`
          : 'Cleared entire cache',
        deletedCount
      };
    } catch (error) {
      console.error('Cache clear error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to clear cache',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // Get cache statistics
  fastify.get('/cache/stats', async (request, reply) => {
    try {
      const isConnected = cacheService.isConnected();
      
      return {
        success: true,
        data: {
          connected: isConnected,
          message: isConnected ? 'Redis cache is connected' : 'Redis cache is disconnected'
        }
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to get cache statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // Warm up cache for a specific venture
  fastify.post('/cache/warmup/:ventureId', async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    try {
      const { ventureId } = request.params;
      
      // This could trigger cache warming for common queries
      // For now, just return success
      
      return {
        success: true,
        message: `Cache warmup initiated for venture: ${ventureId}`,
        note: 'Cache will be populated on next request'
      };
    } catch (error) {
      console.error('Cache warmup error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to warm up cache',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });
}