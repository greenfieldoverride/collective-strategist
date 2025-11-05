import { describe, it, expect, beforeEach } from '@jest/globals';
import { build } from '../../index';
import { FastifyInstance } from 'fastify';

describe('Content Drafter Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeEach(async () => {
    app = await build();
    await app.ready();
    
    // Create auth token for authenticated requests
    authToken = app.jwt.sign({ 
      id: 'user-123', 
      email: 'test@example.com', 
      tier: 'individual_pro' 
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/content-drafter/generate', () => {
    const validContentRequest = {
      contextualCoreId: '123e4567-e89b-12d3-a456-426614174000',
      contentType: 'social_post' as const,
      platform: 'twitter',
      prompt: 'Create a post about AI innovation',
      tone: 'professional' as const,
      length: 'medium' as const
    };

    it('should generate social media content successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: validContentRequest
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('content');
      expect(data.data).toHaveProperty('suggestions');
      expect(data.data).toHaveProperty('processingTimeMs');
      
      expect(typeof data.data.content).toBe('string');
      expect(Array.isArray(data.data.suggestions)).toBe(true);
      expect(data.data.content).toContain('Mock generated content');
    });

    it('should generate blog article content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validContentRequest,
          contentType: 'blog_article'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.data).toHaveProperty('title');
      expect(typeof data.data.title).toBe('string');
    });

    it('should generate marketing copy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validContentRequest,
          contentType: 'marketing_copy'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.data).toHaveProperty('title');
    });

    it('should generate email content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validContentRequest,
          contentType: 'email'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.data).toHaveProperty('title');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        payload: validContentRequest
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate content types', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validContentRequest,
          contentType: 'invalid_type'
        }
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate tone options', async () => {
      const validTones = ['professional', 'casual', 'enthusiastic', 'authoritative'];
      
      for (const tone of validTones) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/content-drafter/generate',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validContentRequest,
            tone
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should validate length options', async () => {
      const validLengths = ['short', 'medium', 'long'];
      
      for (const length of validLengths) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/content-drafter/generate',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validContentRequest,
            length
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should use default tone and length when not specified', async () => {
      const { tone, length, ...requestWithoutDefaults } = validContentRequest;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: requestWithoutDefaults
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate contextual core ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validContentRequest,
          contextualCoreId: 'invalid-uuid'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate prompt length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validContentRequest,
          prompt: 'short' // too short
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should work without prompt', async () => {
      const { prompt, ...requestWithoutPrompt } = validContentRequest;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: requestWithoutPrompt
      });

      expect(response.statusCode).toBe(200);
    });

    it('should work without platform', async () => {
      const { platform, ...requestWithoutPlatform } = validContentRequest;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: requestWithoutPlatform
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/content-drafter/drafts/:contextualCoreId', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';

    it('should retrieve content drafts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('drafts');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('hasMore');
      
      expect(Array.isArray(data.data.drafts)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}?limit=10&offset=5`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by content type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}?contentType=social_post`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by published status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}?published=false`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content-drafter/drafts/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/content-drafter/drafts/:contextualCoreId/:draftId', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';
    const draftId = '456e7890-e89b-12d3-a456-426614174001';

    it('should return 404 for non-existent draft', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DRAFT_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate UUID formats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content-drafter/drafts/invalid-uuid/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/v1/content-drafter/drafts/:contextualCoreId/:draftId', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';
    const draftId = '456e7890-e89b-12d3-a456-426614174001';

    it('should return 404 for non-existent draft', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          title: 'Updated Title',
          content: 'Updated content'
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}`,
        payload: {
          title: 'Updated Title'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/content-drafter/drafts/:contextualCoreId/:draftId/publish', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';
    const draftId = '456e7890-e89b-12d3-a456-426614174001';

    it('should mark draft as published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}/publish`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          platform: 'twitter'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.published).toBe(true);
    });

    it('should handle scheduled publishing', async () => {
      const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}/publish`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          platform: 'linkedin',
          scheduledFor: scheduledTime
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.data.scheduledFor).toBe(scheduledTime);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}/publish`
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/content-drafter/drafts/:contextualCoreId/:draftId', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';
    const draftId = '456e7890-e89b-12d3-a456-426614174001';

    it('should delete draft successfully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/content-drafter/drafts/${contextualCoreId}/${draftId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate UUID formats', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/content-drafter/drafts/invalid-uuid/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});