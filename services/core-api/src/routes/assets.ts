import { FastifyInstance } from 'fastify';
import { AssetService } from '../services/asset-service';
import { db } from '../database/connection';

// Initialize service
const assetService = new AssetService(db);

export async function assetRoutes(fastify: FastifyInstance) {
  // Get all assets for a venture
  fastify.get('/ventures/:ventureId/assets', {
    schema: {
      description: 'Get all assets for a venture with filtering and pagination',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId']
      },
      querystring: {
        type: 'object',
        properties: {
          fileType: { type: 'string' },
          isBrandAsset: { type: 'boolean' },
          tagIds: { type: 'string', description: 'Comma-separated tag IDs' },
          search: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          sortBy: { type: 'string', enum: ['created_at', 'name', 'file_size'], default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const queryParams = request.query || {};

      // Parse comma-separated tag IDs
      const tagIds = queryParams.tagIds ? queryParams.tagIds.split(',') : undefined;

      const options = {
        fileType: queryParams.fileType,
        isBrandAsset: queryParams.isBrandAsset,
        tagIds,
        search: queryParams.search,
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        sortBy: queryParams.sortBy || 'created_at',
        sortOrder: queryParams.sortOrder || 'desc'
      };

      const result = await assetService.getAssets(ventureId, options);

      const totalPages = Math.ceil(result.total / options.limit);

      return {
        assets: result.assets,
        total: result.total,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          totalPages
        }
      };
    } catch (error) {
      fastify.log.error('Failed to get assets:', error);
      reply.status(500).send({ error: 'Failed to get assets' });
    }
  });

  // Upload new asset
  fastify.post('/ventures/:ventureId/assets', {
    schema: {
      description: 'Upload a new asset',
      tags: ['Assets'],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const userId = request.user?.id;

      // Handle multipart upload
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Get file buffer
      const fileBuffer = await data.toBuffer();

      // Parse additional form fields
      const fields = data.fields;
      const name = fields?.name?.value || data.filename || 'Untitled Asset';
      const description = fields?.description?.value;
      const altText = fields?.altText?.value;
      const isBrandAsset = fields?.isBrandAsset?.value === 'true';
      const tagIds = fields?.tagIds?.value ? 
        JSON.parse(fields.tagIds.value) : undefined;

      // Determine file type from mimetype
      const fileType = data.mimetype.startsWith('image/') ? 'image' :
                      data.mimetype.startsWith('video/') ? 'video' :
                      data.mimetype.includes('pdf') ? 'document' :
                      data.mimetype.startsWith('audio/') ? 'audio' : 'document';

      const createRequest = {
        venture_id: ventureId,
        name,
        description,
        file_type: fileType,
        mime_type: data.mimetype,
        file_size: fileBuffer.length,
        alt_text: altText,
        is_brand_asset: isBrandAsset,
        created_by: userId,
        tag_ids: tagIds
      };

      const asset = await assetService.createAsset(createRequest, fileBuffer);

      reply.status(201).send({ asset });
    } catch (error) {
      fastify.log.error('Failed to upload asset:', error);
      reply.status(500).send({ error: 'Failed to upload asset' });
    }
  });

  // Get specific asset
  fastify.get('/ventures/:ventureId/assets/:assetId', {
    schema: {
      description: 'Get a specific asset',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' },
          assetId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId', 'assetId']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { assetId } = request.params;
      const asset = await assetService.getAssetWithTags(assetId);
      return { asset };
    } catch (error) {
      if (error instanceof Error && error.message === 'Asset not found') {
        reply.status(404).send({ error: 'Asset not found' });
      } else {
        fastify.log.error('Failed to get asset:', error);
        reply.status(500).send({ error: 'Failed to get asset' });
      }
    }
  });

  // Update asset
  fastify.put('/ventures/:ventureId/assets/:assetId', {
    schema: {
      description: 'Update asset metadata',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' },
          assetId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId', 'assetId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          alt_text: { type: 'string' },
          is_brand_asset: { type: 'boolean' },
          status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
          tag_ids: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { assetId } = request.params;
      const updates = request.body;

      const asset = await assetService.updateAsset(assetId, updates);
      return { asset };
    } catch (error) {
      fastify.log.error('Failed to update asset:', error);
      reply.status(500).send({ error: 'Failed to update asset' });
    }
  });

  // Delete asset
  fastify.delete('/ventures/:ventureId/assets/:assetId', {
    schema: {
      description: 'Delete an asset',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' },
          assetId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId', 'assetId']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { assetId } = request.params;
      await assetService.deleteAsset(assetId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete asset:', error);
      reply.status(500).send({ error: 'Failed to delete asset' });
    }
  });

  // Tag Management Routes

  // Get all tags for a venture
  fastify.get('/ventures/:ventureId/asset-tags', {
    schema: {
      description: 'Get all asset tags for a venture',
      tags: ['Asset Tags'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const tags = await assetService.getTags(ventureId);
      return { tags };
    } catch (error) {
      fastify.log.error('Failed to get tags:', error);
      reply.status(500).send({ error: 'Failed to get tags' });
    }
  });

  // Create new tag
  fastify.post('/ventures/:ventureId/asset-tags', {
    schema: {
      description: 'Create a new asset tag',
      tags: ['Asset Tags'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          description: { type: 'string' }
        },
        required: ['name']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const { name, color, description } = request.body;

      const tag = await assetService.createTag({
        venture_id: ventureId,
        name,
        color,
        description
      });

      reply.status(201).send({ tag });
    } catch (error) {
      fastify.log.error('Failed to create tag:', error);
      reply.status(500).send({ error: 'Failed to create tag' });
    }
  });

  // Brand Identity Routes

  // Get brand identity for a venture
  fastify.get('/ventures/:ventureId/brand-identity', {
    schema: {
      description: 'Get brand identity elements for a venture',
      tags: ['Brand Identity'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const brandIdentity = await assetService.getBrandIdentity(ventureId);
      return { brandIdentity };
    } catch (error) {
      fastify.log.error('Failed to get brand identity:', error);
      reply.status(500).send({ error: 'Failed to get brand identity' });
    }
  });

  // Create or update brand identity element
  fastify.post('/ventures/:ventureId/brand-identity', {
    schema: {
      description: 'Create or update a brand identity element',
      tags: ['Brand Identity'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId']
      },
      body: {
        type: 'object',
        properties: {
          element_type: { type: 'string' },
          element_value: { type: 'string' },
          element_metadata: { type: 'object' },
          display_name: { type: 'string' },
          guidelines: { type: 'string' }
        },
        required: ['element_type', 'element_value']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const elementData = request.body;

      const element = await assetService.createBrandElement({
        venture_id: ventureId,
        ...elementData
      });

      reply.status(201).send({ element });
    } catch (error) {
      fastify.log.error('Failed to create brand element:', error);
      reply.status(500).send({ error: 'Failed to create brand element' });
    }
  });

  // Asset usage tracking
  fastify.post('/ventures/:ventureId/assets/:assetId/usage', {
    schema: {
      description: 'Track asset usage',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' },
          assetId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId', 'assetId']
      },
      body: {
        type: 'object',
        properties: {
          used_in_type: { type: 'string' },
          used_in_id: { type: 'string' },
          usage_context: { type: 'object' }
        },
        required: ['used_in_type']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { assetId } = request.params;
      const { used_in_type, used_in_id, usage_context } = request.body;

      await assetService.trackAssetUsage(assetId, used_in_type, used_in_id, usage_context);
      reply.status(201).send({ success: true });
    } catch (error) {
      fastify.log.error('Failed to track asset usage:', error);
      reply.status(500).send({ error: 'Failed to track asset usage' });
    }
  });

  // Get asset usage
  fastify.get('/ventures/:ventureId/assets/:assetId/usage', {
    schema: {
      description: 'Get asset usage history',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' },
          assetId: { type: 'string', format: 'uuid' }
        },
        required: ['ventureId', 'assetId']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { assetId } = request.params;
      const usage = await assetService.getAssetUsage(assetId);
      return { usage };
    } catch (error) {
      fastify.log.error('Failed to get asset usage:', error);
      reply.status(500).send({ error: 'Failed to get asset usage' });
    }
  });

  // Convenience endpoints for specific asset types
  fastify.get('/ventures/:ventureId/assets/brand', {
    schema: {
      description: 'Get all brand assets for a venture',
      tags: ['Assets']
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId } = request.params;
      const assets = await assetService.getBrandAssets(ventureId);
      return { assets };
    } catch (error) {
      fastify.log.error('Failed to get brand assets:', error);
      reply.status(500).send({ error: 'Failed to get brand assets' });
    }
  });

  fastify.get('/ventures/:ventureId/assets/by-type/:type', {
    schema: {
      description: 'Get assets by file type',
      tags: ['Assets'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['image', 'video', 'document', 'audio'] }
        },
        required: ['ventureId', 'type']
      }
    },
    preHandler: fastify.authenticate
  }, async (request: any, reply) => {
    try {
      const { ventureId, type } = request.params;
      const assets = await assetService.getAssetsByType(ventureId, type);
      return { assets };
    } catch (error) {
      fastify.log.error('Failed to get assets by type:', error);
      reply.status(500).send({ error: 'Failed to get assets by type' });
    }
  });
}