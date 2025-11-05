import { createClient } from 'redis';
import { ulid } from 'ulid';
import { EventClient } from '../../shared/events/src/client';

// Mock Redis client for unit tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    xAdd: jest.fn().mockResolvedValue('1234567890-0'),
    xGroupCreate: jest.fn().mockResolvedValue('OK'),
    xReadGroup: jest.fn().mockResolvedValue([]),
  })),
}));

describe('EventClient Unit Tests', () => {
  let eventClient: EventClient;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = (createClient as jest.Mock)();
    eventClient = new EventClient({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    });
  });

  describe('Connection Management', () => {
    test('should connect to Redis', async () => {
      await eventClient.connect();
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    test('should disconnect from Redis', async () => {
      await eventClient.connect();
      await eventClient.disconnect();
      expect(mockRedisClient.disconnect).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple connect calls', async () => {
      await eventClient.connect();
      await eventClient.connect(); // Should not connect again
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Publishing', () => {
    beforeEach(async () => {
      await eventClient.connect();
    });

    test('should publish user registration event', async () => {
      const testData = {
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro' as const,
        referral_source: 'unit_test',
      };

      const messageId = await eventClient.publishUserRegistered(testData);
      
      expect(messageId).toBe('1234567890-0');
      expect(mockRedisClient.xAdd).toHaveBeenCalledTimes(1);
      
      const [stream, , fields] = mockRedisClient.xAdd.mock.calls[0];
      expect(stream).toBe('user.events');
      expect(fields.type).toBe('user.registered');
      expect(JSON.parse(fields.data).email).toBe('test@example.com');
    });

    test('should publish file uploaded event', async () => {
      const testData = {
        file_id: ulid(),
        user_id: ulid(),
        contextual_core_id: ulid(),
        filename: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        is_browser_viewable: false,
      };

      const messageId = await eventClient.publishFileUploaded(testData);
      
      expect(messageId).toBe('1234567890-0');
      expect(mockRedisClient.xAdd).toHaveBeenCalledTimes(1);
      
      const [stream, , fields] = mockRedisClient.xAdd.mock.calls[0];
      expect(stream).toBe('contextual.events');
      expect(fields.type).toBe('file.uploaded');
      expect(JSON.parse(fields.data).filename).toBe('test.pdf');
    });

    test('should publish embedding generation request', async () => {
      const testData = {
        text_content: 'Sample text for embedding',
        content_hash: 'sha256hash',
        user_id: ulid(),
        contextual_core_id: ulid(),
        priority: 'normal' as const,
      };

      const messageId = await eventClient.publishEmbeddingGenerationRequested(testData);
      
      expect(messageId).toBe('1234567890-0');
      expect(mockRedisClient.xAdd).toHaveBeenCalledTimes(1);
      
      const [stream, , fields] = mockRedisClient.xAdd.mock.calls[0];
      expect(stream).toBe('contextual.events');
      expect(fields.type).toBe('embedding.generation.requested');
      expect(JSON.parse(fields.data).priority).toBe('normal');
    });

    test('should handle correlation IDs', async () => {
      const correlationId = ulid();
      const testData = {
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro' as const,
        correlation_id: correlationId,
      };

      await eventClient.publishUserRegistered(testData);
      
      const [, , fields] = mockRedisClient.xAdd.mock.calls[0];
      expect(fields.correlation_id).toBe(correlationId);
    });

    test('should throw error when not connected', async () => {
      const disconnectedClient = new EventClient({
        redis: { host: 'localhost', port: 6379 },
      });

      await expect(
        disconnectedClient.publishUserRegistered({
          user_id: ulid(),
          email: 'test@example.com',
          tier: 'individual_pro',
        })
      ).rejects.toThrow('EventClient is not connected');
    });
  });

  describe('Event Field Serialization', () => {
    beforeEach(async () => {
      await eventClient.connect();
    });

    test('should serialize event data as JSON', async () => {
      const testData = {
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro' as const,
      };

      await eventClient.publishUserRegistered(testData);
      
      const [, , fields] = mockRedisClient.xAdd.mock.calls[0];
      const parsedData = JSON.parse(fields.data);
      
      expect(parsedData).toEqual({
        user_id: testData.user_id,
        email: testData.email,
        tier: testData.tier,
      });
    });

    test('should handle empty metadata', async () => {
      await eventClient.publishUserRegistered({
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro',
      });
      
      const [, , fields] = mockRedisClient.xAdd.mock.calls[0];
      expect(fields.metadata).toBe('{}');
    });

    test('should serialize timestamps as ISO strings', async () => {
      const beforePublish = new Date();
      
      await eventClient.publishUserRegistered({
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro',
      });
      
      const afterPublish = new Date();
      const [, , fields] = mockRedisClient.xAdd.mock.calls[0];
      const timestamp = new Date(fields.timestamp);
      
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterPublish.getTime());
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection errors', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(eventClient.connect()).rejects.toThrow('Connection failed');
    });

    test('should handle Redis publish errors', async () => {
      await eventClient.connect();
      mockRedisClient.xAdd.mockRejectedValueOnce(new Error('Publish failed'));
      
      await expect(
        eventClient.publishUserRegistered({
          user_id: ulid(),
          email: 'test@example.com', 
          tier: 'individual_pro',
        })
      ).rejects.toThrow('Publish failed');
    });

    test('should handle invalid event data gracefully', async () => {
      await eventClient.connect();
      
      // This should not throw at the client level, 
      // validation happens at the schema level
      await expect(
        eventClient.publishUserRegistered({
          user_id: 'invalid-uuid',
          email: 'invalid-email',
          tier: 'invalid-tier' as any,
        })
      ).resolves.toBe('1234567890-0');
    });
  });
});