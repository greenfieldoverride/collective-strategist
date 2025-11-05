import { createClient } from 'redis';
import { ulid } from 'ulid';
import { EventClient } from '../../shared/events/dist/client';
import { STREAMS } from '../../shared/events/dist/index';

describe('Event System Validation', () => {
  const eventClient = new EventClient({
    redis: {
      host: 'localhost',
      port: 6379,
    },
  });

  const redisClient = createClient({
    socket: { host: 'localhost', port: 6379 }
  });

  beforeAll(async () => {
    try {
      await eventClient.connect();
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis not available, skipping integration tests');
      return;
    }
  });

  afterAll(async () => {
    try {
      await eventClient.disconnect();
      await redisClient.disconnect();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up test streams
    try {
      await redisClient.del('test.user.events.validation');
      await redisClient.del('test.contextual.events.validation');
    } catch (error) {
      // Ignore errors if streams don't exist
    }
  });

  describe('End-to-End Event Flow', () => {
    test('should publish and consume user registration events', async () => {
      const testUserId = ulid();
      const testEmail = 'integration-test@example.com';
      
      // Publish event using EventClient
      const messageId = await eventClient.publishUserRegistered({
        user_id: testUserId,
        email: testEmail,
        tier: 'individual_pro',
        referral_source: 'integration_test',
      });

      expect(messageId).toBeTruthy();

      // Verify message was stored in Redis
      const messages = await redisClient.xRange(STREAMS.USER, '-', '+', { COUNT: 10 });
      expect(messages.length).toBeGreaterThan(0);

      // Find our test message
      const testMessage = messages.find(msg => {
        const data = JSON.parse(msg.message.data);
        return data.user_id === testUserId;
      });

      expect(testMessage).toBeDefined();
      expect(testMessage!.message.type).toBe('user.registered');
      
      const eventData = JSON.parse(testMessage!.message.data);
      expect(eventData.email).toBe(testEmail);
      expect(eventData.tier).toBe('individual_pro');
    }, 10000);

    test('should publish and consume file upload events', async () => {
      const testFileId = ulid();
      const testUserId = ulid();
      const testFilename = 'integration-test-document.pdf';
      
      // Publish event
      const messageId = await eventClient.publishFileUploaded({
        file_id: testFileId,
        user_id: testUserId,
        contextual_core_id: ulid(),
        filename: testFilename,
        file_size: 1024000,
        mime_type: 'application/pdf',
        is_browser_viewable: false,
      });

      expect(messageId).toBeTruthy();

      // Verify message in Redis
      const messages = await redisClient.xRange(STREAMS.CONTEXTUAL, '-', '+', { COUNT: 10 });
      expect(messages.length).toBeGreaterThan(0);

      const testMessage = messages.find(msg => {
        const data = JSON.parse(msg.message.data);
        return data.file_id === testFileId;
      });

      expect(testMessage).toBeDefined();
      expect(testMessage!.message.type).toBe('file.uploaded');
      
      const eventData = JSON.parse(testMessage!.message.data);
      expect(eventData.filename).toBe(testFilename);
      expect(eventData.file_size).toBe(1024000);
    }, 10000);

    test('should handle consumer groups for message processing', async () => {
      const streamName = 'test.consumer.group.validation';
      const groupName = 'validation-group';
      const consumerName = 'validation-consumer';

      // Add test message
      const testData = {
        type: 'test.validation',
        user_id: ulid(),
        timestamp: new Date().toISOString(),
        data: JSON.stringify({ test: 'consumer group validation' }),
      };

      const messageId = await redisClient.xAdd(streamName, '*', testData);
      expect(messageId).toBeTruthy();

      // Create consumer group
      await redisClient.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });

      // Read message with consumer group
      const messages = await redisClient.xReadGroup(
        groupName,
        consumerName,
        [{ key: streamName, id: '>' }],
        { COUNT: 1, BLOCK: 1000 }
      );

      expect(messages).not.toBeNull();
      expect(messages!.length).toBe(1);
      expect(messages![0].messages.length).toBe(1);

      const message = messages![0].messages[0];
      expect(message.message.type).toBe('test.validation');

      // Acknowledge message
      const ackResult = await redisClient.xAck(streamName, groupName, messageId);
      expect(ackResult).toBe(1);

      // Verify no pending messages
      const pending = await redisClient.xPending(streamName, groupName);
      expect(pending.pending).toBe(0);
    }, 10000);
  });

  describe('Event Schema Validation in Practice', () => {
    test('should create valid events that can be consumed', async () => {
      // Create events with all required fields
      const correlationId = ulid();
      
      const userEvent = await eventClient.publishUserRegistered({
        user_id: ulid(),
        email: 'schema-test@example.com',
        tier: 'sovereign_circle',
        correlation_id: correlationId,
      });

      const fileEvent = await eventClient.publishFileUploaded({
        file_id: ulid(),
        user_id: ulid(),
        contextual_core_id: ulid(),
        filename: 'schema-test.pdf',
        file_size: 2048000,
        mime_type: 'application/pdf',
        is_browser_viewable: false,
        correlation_id: correlationId,
      });

      expect(userEvent).toBeTruthy();
      expect(fileEvent).toBeTruthy();

      // Verify both events have the same correlation ID when retrieved
      const userMessages = await redisClient.xRange(STREAMS.USER, '-', '+', { COUNT: 10 });
      const contextualMessages = await redisClient.xRange(STREAMS.CONTEXTUAL, '-', '+', { COUNT: 10 });

      const correlatedUserMessage = userMessages.find(msg => 
        msg.message.correlation_id === correlationId
      );
      const correlatedFileMessage = contextualMessages.find(msg => 
        msg.message.correlation_id === correlationId
      );

      expect(correlatedUserMessage).toBeDefined();
      expect(correlatedFileMessage).toBeDefined();
      expect(correlatedUserMessage!.message.correlation_id).toBe(correlationId);
      expect(correlatedFileMessage!.message.correlation_id).toBe(correlationId);
    }, 10000);
  });

  describe('Performance and Reliability', () => {
    test('should handle high-volume event publishing', async () => {
      const streamName = 'test.performance.validation';
      const eventCount = 100;
      const startTime = Date.now();

      // Publish many events rapidly
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(
          redisClient.xAdd(streamName, '*', {
            type: 'performance.test',
            index: i.toString(),
            timestamp: Date.now().toString(),
            data: JSON.stringify({ message: `Performance test ${i}` }),
          })
        );
      }

      const messageIds = await Promise.all(promises);
      const publishTime = Date.now() - startTime;

      expect(messageIds.length).toBe(eventCount);
      expect(publishTime).toBeLessThan(2000); // Should complete in under 2 seconds

      // Verify all messages were stored
      const storedMessages = await redisClient.xRange(streamName, '-', '+');
      expect(storedMessages.length).toBe(eventCount);

      console.log(`Published ${eventCount} events in ${publishTime}ms`);
    }, 15000);

    test('should maintain message ordering', async () => {
      const streamName = 'test.ordering.validation';
      const messageCount = 50;

      // Publish messages in sequence
      const messageIds = [];
      for (let i = 0; i < messageCount; i++) {
        const messageId = await redisClient.xAdd(streamName, '*', {
          sequence: i.toString(),
          timestamp: Date.now().toString(),
        });
        messageIds.push(messageId);
      }

      // Retrieve all messages
      const messages = await redisClient.xRange(streamName, '-', '+');
      expect(messages.length).toBe(messageCount);

      // Verify ordering is maintained
      for (let i = 0; i < messageCount; i++) {
        expect(messages[i].message.sequence).toBe(i.toString());
        expect(messages[i].id).toBe(messageIds[i]);
      }
    }, 10000);
  });
});