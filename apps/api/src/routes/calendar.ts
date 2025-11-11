/// <reference path="../types/fastify.d.ts" />
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/connection';

export async function calendarRoutes(fastify: FastifyInstance) {
  
  // GET /calendar/events - Get calendar events
  fastify.get<{
    Querystring: {
      ventureId?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
      status?: string;
    };
  }>('/calendar/events', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Get calendar events',
      tags: ['Calendar'],
      querystring: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const { ventureId, startDate, endDate, type, status } = request.query;
      const userId = request.user.id;
      
      let query = `
        SELECT 
          e.id,
          e.title,
          e.description,
          e.start_date as "startDate",
          e.end_date as "endDate",
          e.event_type as "type",
          e.source,
          e.related_id as "relatedId",
          e.priority,
          e.status,
          e.assignees,
          e.metadata,
          e.created_at as "createdAt",
          e.updated_at as "updatedAt"
        FROM calendar_events e
        WHERE e.user_id = $1
      `;
      const params: any[] = [userId];

      if (ventureId) {
        query += ` AND e.venture_id = $${params.length + 1}`;
        params.push(ventureId);
      }

      if (startDate) {
        query += ` AND e.start_date >= $${params.length + 1}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND e.start_date <= $${params.length + 1}`;
        params.push(endDate);
      }

      if (type && type !== 'all') {
        query += ` AND e.event_type = $${params.length + 1}`;
        params.push(type);
      }

      if (status && status !== 'all') {
        query += ` AND e.status = $${params.length + 1}`;
        params.push(status);
      }

      query += ' ORDER BY e.start_date ASC';

      const result = await db.query(query, params);
      
      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error) {
      fastify.log.error('Error fetching calendar events:', error);
      return reply.status(500).send({ 
        error: 'Failed to fetch calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /calendar/events - Create calendar event
  fastify.post<{
    Body: {
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
      type: 'content_deadline' | 'content_review' | 'social_post' | 'meeting' | 'milestone';
      source?: 'content_studio' | 'social_media' | 'calendar' | 'external';
      relatedId?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
      assignees?: string[];
      metadata?: any;
      ventureId?: string;
    };
  }>('/calendar/events', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Create calendar event',
      tags: ['Calendar'],
      body: {
        type: 'object',
        required: ['title', 'startDate', 'type'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['content_deadline', 'content_review', 'social_post', 'meeting', 'milestone'] 
          },
          source: { 
            type: 'string', 
            enum: ['content_studio', 'social_media', 'calendar', 'external'],
            default: 'calendar'
          },
          relatedId: { type: 'string' },
          priority: { 
            type: 'string', 
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
          },
          status: { 
            type: 'string', 
            enum: ['pending', 'in_progress', 'completed', 'overdue'],
            default: 'pending'
          },
          assignees: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
          ventureId: { type: 'string' }
        }
      }
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const eventData = request.body;

      const query = `
        INSERT INTO calendar_events (
          user_id, venture_id, title, description, start_date, end_date,
          event_type, source, related_id, priority, status, assignees, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING 
          id,
          title,
          description,
          start_date as "startDate",
          end_date as "endDate",
          event_type as "type",
          source,
          related_id as "relatedId",
          priority,
          status,
          assignees,
          metadata,
          created_at as "createdAt"
      `;

      const result = await db.query(query, [
        userId,
        eventData.ventureId || null,
        eventData.title,
        eventData.description || null,
        eventData.startDate,
        eventData.endDate || null,
        eventData.type,
        eventData.source || 'calendar',
        eventData.relatedId || null,
        eventData.priority || 'medium',
        eventData.status || 'pending',
        JSON.stringify(eventData.assignees || []),
        JSON.stringify(eventData.metadata || {})
      ]);

      return reply.status(201).send({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      fastify.log.error('Error creating calendar event:', error);
      return reply.status(500).send({ 
        error: 'Failed to create calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DELETE /calendar/events/:id - Delete calendar event
  fastify.delete<{
    Params: { id: string };
  }>('/calendar/events/:id', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Delete calendar event',
      tags: ['Calendar'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const { id } = request.params;

      const result = await db.query(
        'DELETE FROM calendar_events WHERE user_id = $1 AND id = $2 RETURNING id',
        [userId, id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      return reply.send({
        success: true,
        message: 'Event deleted successfully'
      });

    } catch (error) {
      fastify.log.error('Error deleting calendar event:', error);
      return reply.status(500).send({ 
        error: 'Failed to delete calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /calendar/connections - Get calendar connections
  fastify.get('/calendar/connections', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Get calendar connections',
      tags: ['Calendar']
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.id;

      // First, ensure the calendar_connections table exists and create mock data for now
      const connections = {
        google: { connected: false, lastSync: null, settings: {} },
        outlook: { connected: false, lastSync: null, settings: {} }
      };

      return reply.send({
        success: true,
        data: connections
      });

    } catch (error) {
      fastify.log.error('Error fetching calendar connections:', error);
      return reply.status(500).send({ 
        error: 'Failed to fetch calendar connections',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /calendar/connect/:provider - Connect calendar
  fastify.post<{
    Params: { provider: string };
  }>('/calendar/connect/:provider', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Connect external calendar',
      tags: ['Calendar'],
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['google', 'outlook'] }
        }
      }
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const { provider } = request.params;

      if (!['google', 'outlook'].includes(provider)) {
        return reply.status(400).send({ error: 'Invalid provider' });
      }

      // For now, simulate the connection
      return reply.send({
        success: true,
        message: `${provider} calendar connected successfully`,
        data: {
          provider,
          connected: true,
          lastSync: new Date().toISOString()
        }
      });

    } catch (error) {
      fastify.log.error('Error connecting calendar:', error);
      return reply.status(500).send({ 
        error: 'Failed to connect calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /calendar/disconnect/:provider - Disconnect calendar
  fastify.post<{
    Params: { provider: string };
  }>('/calendar/disconnect/:provider', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Disconnect external calendar',
      tags: ['Calendar'],
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['google', 'outlook'] }
        }
      }
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const { provider } = request.params;

      return reply.send({
        success: true,
        message: `${provider} calendar disconnected successfully`
      });

    } catch (error) {
      fastify.log.error('Error disconnecting calendar:', error);
      return reply.status(500).send({ 
        error: 'Failed to disconnect calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /calendar/sync/:provider - Sync external calendar
  fastify.post<{
    Params: { provider: string };
  }>('/calendar/sync/:provider', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Sync external calendar',
      tags: ['Calendar'],
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['google', 'outlook'] }
        }
      }
    }
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const { provider } = request.params;

      // Simulate sync
      return reply.send({
        success: true,
        message: `${provider} calendar synced successfully`,
        data: {
          provider,
          lastSync: new Date().toISOString(),
          eventsImported: 0
        }
      });

    } catch (error) {
      fastify.log.error('Error syncing calendar:', error);
      return reply.status(500).send({ 
        error: 'Failed to sync calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default calendarRoutes;