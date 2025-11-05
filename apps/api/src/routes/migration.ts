import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MigrationService } from '../services/migration-service';
import { db } from '../database/connection';
import { StrategistResponse } from '../types/collective-strategist';

export async function migrationRoutes(fastify: FastifyInstance) {
  const migrationService = new MigrationService(db);

  // Get migration status
  fastify.get('/migration/status', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current migration status',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                isComplete: { type: 'boolean' },
                hasContextualCores: { type: 'boolean' },
                hasVentures: { type: 'boolean' },
                hasOrphanedConversations: { type: 'boolean' },
                migrationNeeded: { type: 'boolean' },
                lastMigrationDate: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const status = await migrationService.getMigrationStatus();
      
      const response: StrategistResponse<typeof status> = {
        success: true,
        data: status,
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
          code: 'MIGRATION_STATUS_ERROR',
          message: 'Failed to get migration status'
        }
      });
    }
  });

  // Execute migration
  fastify.post('/migration/execute', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Execute migration from contextual cores to ventures',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                migratedCount: { type: 'integer' },
                failedCount: { type: 'integer' },
                migrationLog: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      // Check if user has admin permissions (you might want to add this check)
      // For now, we'll allow any authenticated user to trigger migration
      
      const result = await migrationService.executeMigration();
      
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
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIGRATION_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute migration'
        }
      });
    }
  });

  // Validate migration
  fastify.get('/migration/validate', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Validate migration results',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                validationStatus: { type: 'string', enum: ['PASSED', 'WARNING', 'FAILED'] },
                contextualCoresCount: { type: 'integer' },
                venturesCount: { type: 'integer' },
                conversationsWithVentures: { type: 'integer' },
                conversationsWithLegacy: { type: 'integer' },
                orphanedConversations: { type: 'integer' },
                validationDetails: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const result = await migrationService.validateMigration();
      
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
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIGRATION_VALIDATION_ERROR',
          message: 'Failed to validate migration'
        }
      });
    }
  });

  // Create backup
  fastify.post('/migration/backup', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Create backup of contextual cores before migration',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                backupCreated: { type: 'boolean' },
                backupPath: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const result = await migrationService.createBackup();
      
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
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIGRATION_BACKUP_ERROR',
          message: 'Failed to create backup'
        }
      });
    }
  });

  // Rollback migration (emergency use)
  fastify.post('/migration/rollback', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Rollback migration (emergency use only)',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['confirmRollback'],
        properties: {
          confirmRollback: { type: 'boolean' },
          reason: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: { confirmRollback: boolean; reason?: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { confirmRollback, reason } = request.body;
      
      if (!confirmRollback) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'ROLLBACK_NOT_CONFIRMED',
            message: 'Rollback must be explicitly confirmed'
          }
        });
      }
      
      fastify.log.warn(`Migration rollback initiated by user. Reason: ${reason || 'Not specified'}`);
      
      const result = await migrationService.rollbackMigration();
      
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
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIGRATION_ROLLBACK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to rollback migration'
        }
      });
    }
  });

  // Get migration history
  fastify.get('/migration/history', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get migration history and logs',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  migrationType: { type: 'string' },
                  status: { type: 'string' },
                  details: { type: 'object' },
                  createdAt: { type: 'string', format: 'date-time' }
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
      const history = await migrationService.getMigrationHistory();
      
      const response: StrategistResponse<typeof history> = {
        success: true,
        data: history,
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
          code: 'MIGRATION_HISTORY_ERROR',
          message: 'Failed to fetch migration history'
        }
      });
    }
  });

  // Clean up old data (post-migration)
  fastify.delete('/migration/cleanup', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Clean up old contextual cores after successful migration',
      tags: ['Migration'],
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['confirmCleanup'],
        properties: {
          confirmCleanup: { type: 'boolean' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: { confirmCleanup: boolean }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { confirmCleanup } = request.body;
      
      if (!confirmCleanup) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CLEANUP_NOT_CONFIRMED',
            message: 'Cleanup must be explicitly confirmed'
          }
        });
      }
      
      const result = await migrationService.cleanupOldData();
      
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
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIGRATION_CLEANUP_ERROR',
          message: error instanceof Error ? error.message : 'Failed to cleanup old data'
        }
      });
    }
  });
}