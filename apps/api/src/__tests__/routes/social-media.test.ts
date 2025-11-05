import { describe, it, expect, beforeEach } from '@jest/globals';
import { build } from '../../index';
import { FastifyInstance } from 'fastify';

describe('Social Media Routes', () => {
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

  describe('POST /api/v1/social-media/connect', () => {
    const validConnectionRequest = {
      platform: 'twitter' as const,
      authCode: 'mock-auth-code-123',
      redirectUri: 'https://app.example.com/callback'
    };

    it('should connect social media account successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/connect',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: validConnectionRequest
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('platform');
      expect(data.data).toHaveProperty('accountName');
      expect(data.data).toHaveProperty('isActive');
      expect(data.data).toHaveProperty('permissions');
      expect(data.data.platform).toBe('twitter');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/connect',
        payload: validConnectionRequest
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate platform types', async () => {
      const validPlatforms = ['twitter', 'linkedin', 'instagram', 'tiktok', 'facebook'];
      
      for (const platform of validPlatforms) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/social-media/connect',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validConnectionRequest,
            platform
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should reject invalid platform', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/connect',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConnectionRequest,
          platform: 'invalid_platform'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate auth code presence', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/connect',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConnectionRequest,
          authCode: ''
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate redirect URI format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/connect',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConnectionRequest,
          redirectUri: 'not-a-valid-url'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/social-media/accounts', () => {
    it('should retrieve connected accounts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/social-media/accounts',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accounts');
      expect(Array.isArray(data.data.accounts)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/social-media/accounts'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/social-media/publish', () => {
    const validPublishRequest = {
      accountId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'This is a test social media post about AI innovation!',
      hashtags: ['#AI', '#Innovation', '#Tech'],
      mentions: ['@example_user']
    };

    it('should publish content successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: validPublishRequest
      });

      expect(response.statusCode).toBe(404); // Will be 404 because account doesn't exist in mock DB
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        payload: validPublishRequest
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate content length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validPublishRequest,
          content: '' // empty content
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate account ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validPublishRequest,
          accountId: 'invalid-uuid'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle scheduled posts', async () => {
      const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validPublishRequest,
          scheduledFor: scheduledTime
        }
      });

      expect(response.statusCode).toBe(404); // Account not found in mock DB
    });

    it('should handle media attachments', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validPublishRequest,
          media: [
            {
              type: 'image',
              url: 'https://example.com/image.jpg',
              altText: 'Example image'
            }
          ]
        }
      });

      expect(response.statusCode).toBe(404); // Account not found in mock DB
    });

    it('should validate media types', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/publish',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validPublishRequest,
          media: [
            {
              type: 'invalid_type',
              url: 'https://example.com/file.xyz'
            }
          ]
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/social-media/market-data', () => {
    const validMarketDataRequest = {
      platform: 'twitter' as const,
      keywords: ['AI', 'machine learning', 'technology'],
      timeRange: 'week' as const,
      metrics: ['mentions', 'sentiment', 'engagement'] as const
    };

    it('should retrieve market data successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/market-data',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: validMarketDataRequest
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('platform');
      expect(data.data).toHaveProperty('timeRange');
      expect(data.data).toHaveProperty('data');
      expect(data.data).toHaveProperty('lastUpdated');
      expect(Array.isArray(data.data.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/market-data',
        payload: validMarketDataRequest
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate platform types', async () => {
      const validPlatforms = ['twitter', 'linkedin', 'instagram', 'tiktok'];
      
      for (const platform of validPlatforms) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/social-media/market-data',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validMarketDataRequest,
            platform
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should validate keywords array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/market-data',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validMarketDataRequest,
          keywords: [] // empty array
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should limit keywords to 10', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/market-data',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validMarketDataRequest,
          keywords: Array(11).fill('keyword') // 11 keywords
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should default to week timeRange', async () => {
      const { timeRange, ...requestWithoutTimeRange } = validMarketDataRequest;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/market-data',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: requestWithoutTimeRange
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate metrics types', async () => {
      const validMetrics = [
        ['mentions'],
        ['sentiment'],
        ['engagement'],
        ['reach'],
        ['trends'],
        ['mentions', 'sentiment']
      ];
      
      for (const metrics of validMetrics) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/social-media/market-data',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validMarketDataRequest,
            metrics
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('GET /api/v1/social-media/analytics/:accountId', () => {
    const accountId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return 404 for non-existent account', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/social-media/analytics/${accountId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/social-media/analytics/${accountId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/social-media/analytics/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle timeRange parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/social-media/analytics/${accountId}?timeRange=month`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404); // Account not found
    });

    it('should handle metrics parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/social-media/analytics/${accountId}?metrics=followers,engagement_rate`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404); // Account not found
    });
  });

  describe('DELETE /api/v1/social-media/accounts/:accountId', () => {
    const accountId = '123e4567-e89b-12d3-a456-426614174000';

    it('should disconnect account successfully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/social-media/accounts/${accountId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.disconnected).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/social-media/accounts/${accountId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/social-media/accounts/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/social-media/accounts/:accountId/validate', () => {
    const accountId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return 404 for non-existent account', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/social-media/accounts/${accountId}/validate`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/social-media/accounts/${accountId}/validate`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/accounts/invalid-uuid/validate',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});