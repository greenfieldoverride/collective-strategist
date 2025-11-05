// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.AI_SERVICE_URL = 'http://localhost:3001';
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock external services
jest.mock('../database/connection', () => ({
  db: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    pool: {
      end: jest.fn()
    }
  }
}));

jest.mock('../events/client', () => ({
  eventClient: {
    publishUserRegistered: jest.fn().mockResolvedValue(undefined),
    publishContentGenerated: jest.fn().mockResolvedValue(undefined),
    publishSocialMediaConnected: jest.fn().mockResolvedValue(undefined)
  },
  initializeEventClient: jest.fn().mockResolvedValue(undefined),
  closeEventClient: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../services/ai-client', () => ({
  aiServiceClient: {
    generateText: jest.fn().mockResolvedValue({
      text: 'Mock AI response',
      provider: 'claude',
      model: 'claude-3-haiku',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cost: 0.01,
      processing_time_ms: 100
    }),
    generateStrategicAdvice: jest.fn().mockResolvedValue({
      text: 'Mock strategic advice response',
      provider: 'claude',
      model: 'claude-3-haiku',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cost: 0.01,
      processing_time_ms: 150
    }),
    generateContent: jest.fn().mockResolvedValue({
      text: 'Mock generated content',
      provider: 'claude',
      model: 'claude-3-haiku',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cost: 0.01,
      processing_time_ms: 120
    }),
    analyzeMarketTrends: jest.fn().mockResolvedValue({
      text: 'Mock market analysis',
      provider: 'claude',
      model: 'claude-3-haiku',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cost: 0.01,
      processing_time_ms: 180
    })
  }
}));

jest.mock('../services/social-media-client', () => ({
  socialMediaClient: {
    connectAccount: jest.fn().mockResolvedValue({
      id: 'test-account-id',
      userId: 'test-user-id',
      platform: 'twitter',
      accountId: 'test-social-account-id',
      accountName: 'Test Account',
      accessToken: 'test-access-token',
      isActive: true,
      permissions: ['read', 'write'],
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    publishPost: jest.fn().mockResolvedValue({
      success: true,
      postId: 'test-post-id',
      url: 'https://twitter.com/test/status/123'
    }),
    getMarketData: jest.fn().mockResolvedValue({
      platform: 'twitter',
      timeRange: 'week',
      data: [
        {
          keyword: 'test keyword',
          mentions: 100,
          sentiment: 0.7,
          engagement: 0.05,
          reach: 1000,
          trending: true
        }
      ],
      lastUpdated: new Date()
    }),
    getAnalytics: jest.fn().mockResolvedValue({
      platform: 'twitter',
      accountId: 'test-account-id',
      timeRange: 'week',
      metrics: {
        followers: 1000,
        following: 500,
        posts: 50,
        engagement_rate: 0.05,
        reach: 10000,
        impressions: 50000,
        clicks: 500,
        shares: 25,
        comments: 10,
        likes: 200
      },
      topPosts: [],
      audience: {
        demographics: { age: {}, gender: {}, location: {} },
        interests: [],
        activeHours: {}
      }
    }),
    validateAccount: jest.fn().mockResolvedValue(true)
  }
}));

// Increase timeout for integration tests
jest.setTimeout(30000);