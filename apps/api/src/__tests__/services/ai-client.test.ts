import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIServiceClient } from '../../services/ai-client';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    defaults: {
      headers: {}
    }
  })),
  isAxiosError: jest.fn()
}));

describe('AI Service Client', () => {
  let aiClient: AIServiceClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    const axios = require('axios');
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      defaults: {
        headers: {}
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    
    aiClient = new AIServiceClient();
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            text: 'Generated AI text response',
            provider: 'claude',
            model: 'claude-3-haiku-20240307',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30
            },
            cost: 0.01,
            processing_time_ms: 150
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = {
        user_id: 'user-123',
        prompt: 'Generate some text about AI',
        options: {
          temperature: 0.7,
          max_tokens: 100
        }
      };

      const result = await aiClient.generateText(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ai/generate', request);
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      const request = {
        user_id: 'user-123',
        prompt: 'Test prompt'
      };

      await expect(aiClient.generateText(request)).rejects.toThrow('API Error');
    });

    it('should handle unsuccessful responses', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid request'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = {
        user_id: 'user-123',
        prompt: 'Test prompt'
      };

      await expect(aiClient.generateText(request)).rejects.toThrow('Invalid request');
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [0.1, 0.2, 0.3, 0.4, 0.5]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = {
        user_id: 'user-123',
        text: 'Text to embed'
      };

      const result = await aiClient.generateEmbedding(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ai/embed', request);
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle embedding errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Embedding Error'));

      const request = {
        user_id: 'user-123',
        text: 'Test text'
      };

      await expect(aiClient.generateEmbedding(request)).rejects.toThrow('Embedding Error');
    });
  });

  describe('checkHealth', () => {
    it('should check service health successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            claude: true,
            openai: true
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await aiClient.checkHealth();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/ai/health');
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle health check errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Health Check Failed'));

      await expect(aiClient.checkHealth()).rejects.toThrow('Health Check Failed');
    });
  });

  describe('generateStrategicAdvice', () => {
    it('should generate strategic advice with business context', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            text: 'Strategic advice response',
            provider: 'claude',
            model: 'claude-3-haiku-20240307',
            usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
            cost: 0.02,
            processing_time_ms: 200
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const params = {
        userId: 'user-123',
        query: 'How can I improve my business strategy?',
        businessContext: 'Tech startup focused on AI solutions',
        sessionType: 'strategic_advice',
        marketData: [{ trend: 'AI adoption increasing' }],
        tone: 'professional'
      };

      const result = await aiClient.generateStrategicAdvice(params);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ai/generate', expect.objectContaining({
        user_id: params.userId,
        prompt: expect.stringContaining(params.query),
        options: expect.objectContaining({
          temperature: 0.7,
          max_tokens: 1000,
          model: 'claude-3-haiku-20240307'
        })
      }));

      expect(result).toEqual(mockResponse.data.data);
    });

    it('should build proper prompts for strategic advice', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { text: 'response', provider: 'claude', model: 'claude', usage: {}, cost: 0, processing_time_ms: 100 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const params = {
        userId: 'user-123',
        query: 'Test query',
        businessContext: 'Test context',
        sessionType: 'strategic_advice'
      };

      await aiClient.generateStrategicAdvice(params);

      const call = mockAxiosInstance.post.mock.calls[0];
      const prompt = call[1].prompt;

      expect(prompt).toContain('You are a strategic business consultant');
      expect(prompt).toContain(params.businessContext);
      expect(prompt).toContain(params.query);
      expect(prompt).toContain('actionable recommendations');
    });
  });

  describe('generateContent', () => {
    it('should generate content with platform-specific optimization', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            text: 'Generated social media content',
            provider: 'claude',
            model: 'claude-3-haiku-20240307',
            usage: { prompt_tokens: 12, completion_tokens: 18, total_tokens: 30 },
            cost: 0.015,
            processing_time_ms: 120
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const params = {
        userId: 'user-123',
        contentType: 'social_post',
        businessContext: 'Tech consulting firm',
        platform: 'twitter',
        prompt: 'Create a post about AI trends',
        tone: 'professional',
        length: 'short'
      };

      const result = await aiClient.generateContent(params);

      expect(result).toEqual(mockResponse.data.data);
      
      const call = mockAxiosInstance.post.mock.calls[0];
      expect(call[1].options.temperature).toBe(0.3); // Professional tone should use lower temperature
      expect(call[1].options.max_tokens).toBe(50); // Short social post should have fewer tokens
    });

    it('should adjust parameters based on content type and length', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { text: 'response', provider: 'claude', model: 'claude', usage: {}, cost: 0, processing_time_ms: 100 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Test blog article with long length
      await aiClient.generateContent({
        userId: 'user-123',
        contentType: 'blog_article',
        businessContext: 'test',
        tone: 'enthusiastic',
        length: 'long'
      });

      const call = mockAxiosInstance.post.mock.calls[0];
      expect(call[1].options.temperature).toBe(0.8); // Enthusiastic tone
      expect(call[1].options.max_tokens).toBe(1000); // Long blog article
    });

    it('should build content-specific prompts', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { text: 'response', provider: 'claude', model: 'claude', usage: {}, cost: 0, processing_time_ms: 100 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const params = {
        userId: 'user-123',
        contentType: 'marketing_copy',
        businessContext: 'SaaS company',
        tone: 'authoritative',
        length: 'medium'
      };

      await aiClient.generateContent(params);

      const call = mockAxiosInstance.post.mock.calls[0];
      const prompt = call[1].prompt;

      expect(prompt).toContain('professional content writer');
      expect(prompt).toContain('marketing_copy');
      expect(prompt).toContain('authoritative');
      expect(prompt).toContain('SaaS company');
      expect(prompt).toContain('calls-to-action');
    });
  });

  describe('analyzeMarketTrends', () => {
    it('should analyze market trends with provided data', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            text: 'Market analysis insights',
            provider: 'claude',
            model: 'claude-3-haiku-20240307',
            usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
            cost: 0.025,
            processing_time_ms: 180
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const params = {
        userId: 'user-123',
        businessContext: 'E-commerce platform',
        analysisType: 'trends',
        marketData: [
          { keyword: 'online shopping', mentions: 1000, sentiment: 0.8 },
          { keyword: 'mobile commerce', mentions: 500, sentiment: 0.7 }
        ],
        timeRange: 'week'
      };

      const result = await aiClient.analyzeMarketTrends(params);

      expect(result).toEqual(mockResponse.data.data);
      
      const call = mockAxiosInstance.post.mock.calls[0];
      expect(call[1].options.temperature).toBe(0.3); // Lower temperature for analytical tasks
      expect(call[1].options.max_tokens).toBe(800);
      
      const prompt = call[1].prompt;
      expect(prompt).toContain('market analyst');
      expect(prompt).toContain(params.analysisType);
      expect(prompt).toContain(params.businessContext);
      expect(prompt).toContain(JSON.stringify(params.marketData));
    });

    it('should build market analysis prompts correctly', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { text: 'response', provider: 'claude', model: 'claude', usage: {}, cost: 0, processing_time_ms: 100 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const params = {
        userId: 'user-123',
        businessContext: 'Test business',
        analysisType: 'competitors',
        marketData: [],
        timeRange: 'month'
      };

      await aiClient.analyzeMarketTrends(params);

      const call = mockAxiosInstance.post.mock.calls[0];
      const prompt = call[1].prompt;

      expect(prompt).toContain('market analyst providing competitors analysis');
      expect(prompt).toContain('Key insights relevant to this business');
      expect(prompt).toContain('confidence scores');
      expect(prompt).toContain('month');
    });
  });

  describe('private helper methods', () => {
    it('should calculate correct max tokens for different content types', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { text: 'response', provider: 'claude', model: 'claude', usage: {}, cost: 0, processing_time_ms: 100 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Test different combinations
      const testCases = [
        { contentType: 'social_post', length: 'short', expected: 50 },
        { contentType: 'social_post', length: 'long', expected: 150 },
        { contentType: 'blog_article', length: 'medium', expected: 600 },
        { contentType: 'email', length: 'long', expected: 600 }
      ];

      for (const testCase of testCases) {
        mockAxiosInstance.post.mockClear();
        
        await aiClient.generateContent({
          userId: 'user-123',
          contentType: testCase.contentType as any,
          businessContext: 'test',
          tone: 'professional',
          length: testCase.length as any
        });

        const call = mockAxiosInstance.post.mock.calls[0];
        expect(call[1].options.max_tokens).toBe(testCase.expected);
      }
    });

    it('should calculate correct temperature for different tones', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { text: 'response', provider: 'claude', model: 'claude', usage: {}, cost: 0, processing_time_ms: 100 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const testCases = [
        { tone: 'professional', expected: 0.3 },
        { tone: 'casual', expected: 0.7 },
        { tone: 'enthusiastic', expected: 0.8 },
        { tone: 'authoritative', expected: 0.2 }
      ];

      for (const testCase of testCases) {
        mockAxiosInstance.post.mockClear();
        
        await aiClient.generateContent({
          userId: 'user-123',
          contentType: 'social_post',
          businessContext: 'test',
          tone: testCase.tone as any,
          length: 'medium'
        });

        const call = mockAxiosInstance.post.mock.calls[0];
        expect(call[1].options.temperature).toBe(testCase.expected);
      }
    });
  });
});