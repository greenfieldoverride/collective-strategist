import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { build } from '../../index';
import { FastifyInstance } from 'fastify';

describe('API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health and Info Endpoints', () => {
    it('should return API info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api'
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.name).toBe('The Collective Strategist API');
      expect(data.features).toContain('AI Business Consultant - Interactive strategic advice engine');
      expect(data.features).toContain('Social Media Integration - Connect and publish to platforms');
    });

    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.status).toBe('healthy');
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('ai_integration');
    });

    it('should return metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('Authentication Flow', () => {
    let authToken: string;

    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'integration@test.com',
          password: 'SecurePassword123!',
          tier: 'individual_pro'
        }
      });

      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      
      authToken = data.data.token;
    });

    it('should get user info with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('integration@test.com');
    });
  });

  describe('Complete AI Workflow', () => {
    let authToken: string;
    let contextualCoreId: string;

    beforeAll(async () => {
      // Register user and get token
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'workflow@test.com',
          password: 'SecurePassword123!',
          tier: 'individual_pro'
        }
      });

      authToken = JSON.parse(authResponse.body).data.token;
      contextualCoreId = '123e4567-e89b-12d3-a456-426614174000';
    });

    it('should complete AI consultant workflow', async () => {
      // 1. Ask for strategic advice
      const consultResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          contextualCoreId,
          sessionType: 'strategic_advice',
          query: 'How can I improve my business growth strategy?',
          includeMarketData: true
        }
      });

      expect(consultResponse.statusCode).toBe(200);
      
      const consultData = JSON.parse(consultResponse.body);
      expect(consultData.success).toBe(true);
      expect(consultData.data.response).toContain('Mock strategic advice response');
      expect(consultData.data.recommendations).toBeDefined();
      expect(consultData.data.nextSteps).toBeDefined();

      // 2. Get market analysis
      const marketResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/market-analysis',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          contextualCoreId,
          analysisType: 'trends',
          timeRange: 'week',
          platforms: ['twitter', 'linkedin']
        }
      });

      expect(marketResponse.statusCode).toBe(200);
      
      const marketData = JSON.parse(marketResponse.body);
      expect(marketData.success).toBe(true);
      expect(marketData.data.insights).toBeDefined();
      expect(marketData.data.trends).toBeDefined();
    });

    it('should complete content generation workflow', async () => {
      // 1. Generate social media content
      const contentResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          contextualCoreId,
          contentType: 'social_post',
          platform: 'twitter',
          prompt: 'Create a post about AI innovation',
          tone: 'professional',
          length: 'medium'
        }
      });

      expect(contentResponse.statusCode).toBe(200);
      
      const contentData = JSON.parse(contentResponse.body);
      expect(contentData.success).toBe(true);
      expect(contentData.data.content).toContain('Mock generated content');
      expect(contentData.data.suggestions).toBeDefined();

      // 2. Generate blog article
      const blogResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/content-drafter/generate',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          contextualCoreId,
          contentType: 'blog_article',
          tone: 'authoritative',
          length: 'long'
        }
      });

      expect(blogResponse.statusCode).toBe(200);
      
      const blogData = JSON.parse(blogResponse.body);
      expect(blogData.success).toBe(true);
      expect(blogData.data.title).toBeDefined();
    });

    it('should complete social media workflow', async () => {
      // 1. Get market data from social platforms
      const marketDataResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/social-media/market-data',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          platform: 'twitter',
          keywords: ['AI', 'innovation', 'technology'],
          timeRange: 'week',
          metrics: ['mentions', 'sentiment']
        }
      });

      expect(marketDataResponse.statusCode).toBe(200);
      
      const marketData = JSON.parse(marketDataResponse.body);
      expect(marketData.success).toBe(true);
      expect(marketData.data.platform).toBe('twitter');
      expect(Array.isArray(marketData.data.data)).toBe(true);

      // 2. Get connected accounts (should be empty)
      const accountsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/social-media/accounts',
        headers: { authorization: `Bearer ${authToken}` }
      });

      expect(accountsResponse.statusCode).toBe(200);
      
      const accountsData = JSON.parse(accountsResponse.body);
      expect(accountsData.success).toBe(true);
      expect(Array.isArray(accountsData.data.accounts)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    let authToken: string;

    beforeAll(async () => {
      const authResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'errors@test.com',
          password: 'SecurePassword123!',
          tier: 'individual_pro'
        }
      });

      authToken = JSON.parse(authResponse.body).data.token;
    });

    it('should handle validation errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          contextualCoreId: 'invalid-uuid',
          sessionType: 'invalid_type',
          query: 'short'
        }
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-consultant/ask',
        payload: {
          contextualCoreId: '123e4567-e89b-12d3-a456-426614174000',
          sessionType: 'strategic_advice',
          query: 'Test query without auth'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle not found errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai-consultant/sessions/123e4567-e89b-12d3-a456-426614174000/456e7890-e89b-12d3-a456-426614174001',
        headers: { authorization: `Bearer ${authToken}` }
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should serve OpenAPI specification', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json'
      });

      expect(response.statusCode).toBe(200);
      
      const spec = JSON.parse(response.body);
      expect(spec.info.title).toBe('The Collective Strategist API');
      expect(spec.paths).toHaveProperty('/api/v1/auth/register');
      expect(spec.paths).toHaveProperty('/api/v1/ai-consultant/ask');
      expect(spec.paths).toHaveProperty('/api/v1/content-drafter/generate');
      expect(spec.paths).toHaveProperty('/api/v1/social-media/connect');
    });
  });
});