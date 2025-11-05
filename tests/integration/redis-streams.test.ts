import { createClient } from 'redis';
import { ulid } from 'ulid';
import { 
  createUserRegisteredEvent,
  createFileUploadedEvent,
  STREAMS
} from '../../shared/events/src/index';

describe('Redis Streams Integration', () => {
  const redisClient = createClient({
    socket: { host: 'localhost', port: 6379 }
  });

  beforeAll(async () => {
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    // Clean up test streams
    try {
      await redisClient.del('test.events');
      await redisClient.del('test.user.events');
      await redisClient.del('test.contextual.events');
    } catch (error) {
      // Ignore errors if streams don't exist
    }
  });

  describe('Basic Stream Operations', () => {
    test('should publish and read messages from stream', async () => {
      const testEvent = {
        id: ulid(),
        type: 'test.message',
        data: JSON.stringify({ message: 'Hello Redis Streams!' }),
        timestamp: new Date().toISOString(),
      };

      // Publish message
      const messageId = await redisClient.xAdd('test.events', '*', testEvent);
      expect(messageId).toBeTruthy();

      // Read messages
      const messages = await redisClient.xRange('test.events', '-', '+');
      expect(messages).toHaveLength(1);
      expect(messages[0].message.type).toBe('test.message');
    });

    test('should create and manage consumer groups', async () => {
      const streamName = 'test.events';
      const groupName = 'test-group';

      // Add a message first
      await redisClient.xAdd(streamName, '*', { test: 'data' });

      // Create consumer group
      await redisClient.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });

      // Verify group exists
      const groups = await redisClient.xInfoGroups(streamName);
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe(groupName);
    });

    test('should handle consumer group message consumption', async () => {
      const streamName = 'test.events';
      const groupName = 'test-group';
      const consumerName = 'test-consumer';

      // Add test message
      const messageId = await redisClient.xAdd(streamName, '*', {
        type: 'test.message',
        data: JSON.stringify({ test: 'consumer data' }),
      });

      // Create consumer group
      await redisClient.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });

      // Read messages with consumer group
      const messages = await redisClient.xReadGroup(
        groupName,
        consumerName,
        [{ key: streamName, id: '>' }],
        { COUNT: 1 }
      );

      expect(messages).not.toBeNull();
      expect(messages).toHaveLength(1);
      expect(messages![0].name).toBe(streamName);
      expect(messages![0].messages).toHaveLength(1);

      // Acknowledge message
      const ackResult = await redisClient.xAck(streamName, groupName, messageId);
      expect(ackResult).toBe(1);
    });

    test('should handle message acknowledgment and pending messages', async () => {
      const streamName = 'test.events';
      const groupName = 'test-group';
      const consumerName = 'test-consumer';

      // Add test message
      await redisClient.xAdd(streamName, '*', { type: 'test.pending' });

      // Create consumer group
      await redisClient.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });

      // Read message (creates pending entry)
      const messages = await redisClient.xReadGroup(
        groupName,
        consumerName,
        [{ key: streamName, id: '>' }],
        { COUNT: 1 }
      );

      expect(messages![0].messages).toHaveLength(1);
      const messageId = messages![0].messages[0].id;

      // Check pending messages
      const pending = await redisClient.xPending(streamName, groupName);
      expect(pending.pending).toBe(1);

      // Acknowledge message
      await redisClient.xAck(streamName, groupName, messageId);

      // Verify no pending messages
      const pendingAfterAck = await redisClient.xPending(streamName, groupName);
      expect(pendingAfterAck.pending).toBe(0);
    });
  });

  describe('Event-Specific Stream Operations', () => {
    test('should publish user registration events', async () => {
      const event = createUserRegisteredEvent({
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro',
        referral_source: 'test_suite',
      });

      // Convert event to Redis fields
      const fields = {
        id: event.id,
        stream: event.stream,
        type: event.type,
        version: event.version.toString(),
        timestamp: event.timestamp.toISOString(),
        correlation_id: event.correlation_id || '',
        user_id: event.user_id || '',
        data: JSON.stringify(event.data),
        metadata: JSON.stringify(event.metadata || {}),
      };

      const messageId = await redisClient.xAdd('test.user.events', '*', fields);
      expect(messageId).toBeTruthy();

      // Verify message was stored correctly
      const messages = await redisClient.xRange('test.user.events', '-', '+');
      expect(messages).toHaveLength(1);
      
      const storedMessage = messages[0];
      expect(storedMessage.message.type).toBe('user.registered');
      expect(storedMessage.message.stream).toBe(STREAMS.USER);
      
      const storedData = JSON.parse(storedMessage.message.data);
      expect(storedData.email).toBe('test@example.com');
      expect(storedData.tier).toBe('individual_pro');
    });

    test('should publish file upload events', async () => {
      const event = createFileUploadedEvent({
        file_id: ulid(),
        user_id: ulid(),
        contextual_core_id: ulid(),
        filename: 'test-document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        is_browser_viewable: false,
      });

      const fields = {
        id: event.id,
        stream: event.stream,
        type: event.type,
        version: event.version.toString(),
        timestamp: event.timestamp.toISOString(),
        correlation_id: event.correlation_id || '',
        user_id: event.user_id || '',
        data: JSON.stringify(event.data),
        metadata: JSON.stringify(event.metadata || {}),
      };

      const messageId = await redisClient.xAdd('test.contextual.events', '*', fields);
      expect(messageId).toBeTruthy();

      // Verify message content
      const messages = await redisClient.xRange('test.contextual.events', '-', '+');
      expect(messages).toHaveLength(1);
      
      const storedData = JSON.parse(messages[0].message.data);
      expect(storedData.filename).toBe('test-document.pdf');
      expect(storedData.file_size).toBe(1024000);
      expect(storedData.is_browser_viewable).toBe(false);
    });

    test('should handle message ordering with timestamps', async () => {
      const streamName = 'test.events';
      
      // Add multiple messages with slight delays
      const message1Id = await redisClient.xAdd(streamName, '*', { order: '1', timestamp: Date.now().toString() });
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const message2Id = await redisClient.xAdd(streamName, '*', { order: '2', timestamp: Date.now().toString() });
      
      await new Promise(resolve => setTimeout(resolve, 1));
      const message3Id = await redisClient.xAdd(streamName, '*', { order: '3', timestamp: Date.now().toString() });

      // Read messages in order
      const messages = await redisClient.xRange(streamName, '-', '+');
      expect(messages).toHaveLength(3);
      
      // Verify ordering by message IDs (Redis Streams guarantee order)
      expect(messages[0].id).toBe(message1Id);
      expect(messages[1].id).toBe(message2Id);
      expect(messages[2].id).toBe(message3Id);
      
      expect(messages[0].message.order).toBe('1');
      expect(messages[1].message.order).toBe('2');
      expect(messages[2].message.order).toBe('3');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent stream reads gracefully', async () => {
      const messages = await redisClient.xRange('non.existent.stream', '-', '+');
      expect(messages).toHaveLength(0);
    });

    test('should handle consumer group creation on non-existent stream', async () => {
      // Create group with MKSTREAM option
      await expect(
        redisClient.xGroupCreate('new.stream', 'new-group', '0', { MKSTREAM: true })
      ).resolves.not.toThrow();

      // Verify stream was created
      const streamInfo = await redisClient.xInfoStream('new.stream');
      expect(streamInfo.length).toBe(0); // Empty stream
    });

    test('should handle duplicate consumer group creation', async () => {
      const streamName = 'test.events';
      const groupName = 'duplicate-group';

      // Add a message first
      await redisClient.xAdd(streamName, '*', { test: 'data' });

      // Create group first time
      await redisClient.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });

      // Attempt to create same group again should throw
      await expect(
        redisClient.xGroupCreate(streamName, groupName, '0')
      ).rejects.toThrow();
    });

    test('should handle blocking reads with timeout', async () => {
      const streamName = 'test.events';
      const groupName = 'block-group';
      const consumerName = 'block-consumer';

      // Create consumer group
      await redisClient.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });

      // Start blocking read with short timeout
      const startTime = Date.now();
      const messages = await redisClient.xReadGroup(
        groupName,
        consumerName,
        [{ key: streamName, id: '>' }],
        { COUNT: 1, BLOCK: 100 } // 100ms timeout
      );

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should timeout and return null/empty
      expect(messages).toBeNull();
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some timing variance
      expect(elapsed).toBeLessThan(200); // But not too much
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-volume message publishing', async () => {
      const streamName = 'test.performance';
      const messageCount = 1000;
      const startTime = Date.now();

      // Publish many messages
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(
          redisClient.xAdd(streamName, '*', {
            index: i.toString(),
            data: `test-message-${i}`,
            timestamp: Date.now().toString(),
          })
        );
      }

      await Promise.all(promises);
      const publishTime = Date.now() - startTime;

      // Verify all messages were stored
      const streamInfo = await redisClient.xInfoStream(streamName);
      expect(streamInfo.length).toBe(messageCount);

      // Performance should be reasonable (less than 5 seconds for 1000 messages)
      expect(publishTime).toBeLessThan(5000);

      console.log(`Published ${messageCount} messages in ${publishTime}ms`);
    });

    test('should handle multiple concurrent consumers', async () => {
      const streamName = 'test.concurrent';
      const groupName = 'concurrent-group';
      const messageCount = 100;

      // Add messages to stream
      for (let i = 0; i < messageCount; i++) {
        await redisClient.xAdd(streamName, '*', { 
          message: `concurrent-test-${i}`,
          index: i.toString()
        });
      }

      // Create consumer group
      await redisClient.xGroupCreate(streamName, groupName, '0');

      // Create multiple consumers
      const consumerPromises = [];
      const consumedMessages: any[] = [];

      for (let c = 0; c < 3; c++) {
        const consumerName = `consumer-${c}`;
        
        consumerPromises.push(
          (async () => {
            let totalConsumed = 0;
            while (totalConsumed < messageCount / 3) { // Each consumer gets roughly 1/3
              const messages = await redisClient.xReadGroup(
                groupName,
                consumerName,
                [{ key: streamName, id: '>' }],
                { COUNT: 10, BLOCK: 100 }
              );

              if (messages && messages.length > 0) {
                for (const streamMessage of messages) {
                  for (const message of streamMessage.messages) {
                    consumedMessages.push({
                      consumer: consumerName,
                      messageId: message.id,
                      data: message.message
                    });
                    await redisClient.xAck(streamName, groupName, message.id);
                    totalConsumed++;
                  }
                }
              } else {
                break; // No more messages
              }
            }
          })()
        );
      }

      await Promise.all(consumerPromises);

      // Verify all messages were consumed
      expect(consumedMessages.length).toBe(messageCount);

      // Verify no pending messages
      const pending = await redisClient.xPending(streamName, groupName);
      expect(pending.pending).toBe(0);
    });
  });
});