import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { build } from '../../index';
import { FastifyInstance } from 'fastify';

describe('AI Consultant Routes', () => {
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

  describe('POST /api/v1/ai-consultant/ask', () => {
    const validConsultationRequest = {
      contextualCoreId: '123e4567-e89b-12d3-a456-426614174000',
      sessionType: 'strategic_advice' as const,
      query: 'How can I improve my business growth strategy?',
      includeMarketData: true
    };

    it('should provide strategic advice successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: validConsultationRequest
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('response');
      expect(data.data).toHaveProperty('confidenceScore');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('nextSteps');
      expect(data.data).toHaveProperty('processingTimeMs');
      
      expect(typeof data.data.response).toBe('string');
      expect(typeof data.data.confidenceScore).toBe('number');
      expect(Array.isArray(data.data.recommendations)).toBe(true);
      expect(Array.isArray(data.data.nextSteps)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        payload: validConsultationRequest
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate session type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConsultationRequest,
          sessionType: 'invalid_type'
        }
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate contextual core ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConsultationRequest,
          contextualCoreId: 'invalid-uuid'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate query length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConsultationRequest,
          query: 'short' // too short
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle market analysis session type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConsultationRequest,
          sessionType: 'market_analysis'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.response).toContain('Mock strategic advice response');
    });

    it('should handle goal planning session type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConsultationRequest,
          sessionType: 'goal_planning'
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should work without market data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          ...validConsultationRequest,
          includeMarketData: false
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.data.marketDataUsed).toEqual([]);
    });
  });

  describe('POST /api/v1/ai-consultant/market-analysis', () => {
    const validMarketAnalysisRequest = {
      contextualCoreId: '123e4567-e89b-12d3-a456-426614174000',
      analysisType: 'trends' as const,
      timeRange: 'week' as const,
      platforms: ['twitter', 'linkedin'] as const
    };

    it('should provide market analysis successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/market-analysis',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: validMarketAnalysisRequest
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('insights');
      expect(data.data).toHaveProperty('trends');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('dataPoints');
      expect(data.data).toHaveProperty('lastUpdated');
      
      expect(Array.isArray(data.data.insights)).toBe(true);
      expect(Array.isArray(data.data.trends)).toBe(true);
      expect(Array.isArray(data.data.recommendations)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/market-analysis',
        payload: validMarketAnalysisRequest
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate analysis types', async () => {
      const validTypes = ['trends', 'competitors', 'opportunities', 'keywords'];
      
      for (const analysisType of validTypes) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/ai-consultant/market-analysis',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validMarketAnalysisRequest,
            analysisType
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should validate time ranges', async () => {
      const validRanges = ['day', 'week', 'month', 'quarter'];
      
      for (const timeRange of validRanges) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/ai-consultant/market-analysis',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validMarketAnalysisRequest,
            timeRange
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should default to week time range', async () => {
      const { timeRange, ...requestWithoutTimeRange } = validMarketAnalysisRequest;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/market-analysis',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: requestWithoutTimeRange
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate platforms', async () => {
      const validPlatforms = [
        ['twitter'],
        ['linkedin'],
        ['instagram'],
        ['tiktok'],
        ['google_trends'],
        ['reddit'],
        ['twitter', 'linkedin']
      ];
      
      for (const platforms of validPlatforms) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/ai-consultant/market-analysis',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            ...validMarketAnalysisRequest,
            platforms
          }
        });

        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('GET /api/v1/ai-consultant/sessions/:contextualCoreId', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';

    it('should retrieve consultation sessions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ai-consultant/sessions/${contextualCoreId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sessions');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('hasMore');
      
      expect(Array.isArray(data.data.sessions)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ai-consultant/sessions/${contextualCoreId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ai-consultant/sessions/${contextualCoreId}?limit=10&offset=5`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by session type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ai-consultant/sessions/${contextualCoreId}?sessionType=strategic_advice`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai-consultant/sessions/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/ai-consultant/sessions/:contextualCoreId/:sessionId', () => {
    const contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';
    const sessionId = '456e7890-e89b-12d3-a456-426614174001';

    it('should retrieve specific consultation session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ai-consultant/sessions/${contextualCoreId}/${sessionId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Since we're mocking empty database, this should return 404
      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ai-consultant/sessions/${contextualCoreId}/${sessionId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate UUID formats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai-consultant/sessions/invalid-uuid/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});