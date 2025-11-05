# Event System Usage Guide

A practical guide for developers building services that integrate with The Collective Strategist's event-driven architecture.

## Quick Start

### 1. Add Event Client to Your Service

```bash
# Copy the shared events library to your service
cp -r shared/events/dist/* your-service/src/shared-events/

# Or install dependencies
npm install redis zod ulid
```

### 2. Initialize Event Client

```typescript
import { EventClient } from './shared-events/client';

const eventClient = new EventClient({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

await eventClient.connect();
```

### 3. Publish Your First Event

```typescript
// Publish a user registration event
await eventClient.publishUserRegistered({
  user_id: "user-uuid",
  email: "user@example.com",
  tier: "individual_pro",
  referral_source: "website_signup"
});
```

### 4. Subscribe to Events

```typescript
import { EventBus } from './shared-events/event-bus';

const eventBus = new EventBus(config);
await eventBus.connect();

// Subscribe to file upload events
await eventBus.subscribe(
  STREAMS.CONTEXTUAL,
  'file.uploaded',
  async (event) => {
    console.log('File uploaded:', event.data.filename);
    // Process the file upload
    await processFileUpload(event.data);
  },
  {
    consumerGroup: 'file-processor',
    consumerName: 'worker-1'
  }
);
```

## Event Patterns

### Request/Response Pattern

Use this pattern when you need a response to an event:

```typescript
// Service A: Request embedding generation
const correlationId = ulid();
await eventClient.publishEmbeddingGenerationRequested({
  text_content: "Sample text",
  correlation_id: correlationId,
  user_id: userId,
  contextual_core_id: coreId,
  priority: "normal"
});

// Wait for response
const result = await eventClient.waitForEvent(
  STREAMS.CONTEXTUAL,
  'embedding.generation.completed',
  correlationId,
  30000 // 30 second timeout
);

console.log('Embedding generated:', result.data.embedding_id);
```

### Fire-and-Forget Pattern

Use this pattern for events that don't need responses:

```typescript
// Publish notification without waiting for response
await eventClient.publishNotificationRequested({
  user_id: userId,
  notification_type: "briefing_ready",
  channels: ["email", "push"],
  message: {
    title: "Your briefing is ready!",
    body: "Click to view your latest strategic briefing."
  },
  priority: "normal"
});
```

### Saga Pattern (Multi-Step Workflows)

Use this pattern for complex workflows that span multiple services:

```typescript
// File processing saga
class FileProcessingSaga {
  async processFile(fileUploadEvent) {
    const { file_id, user_id } = fileUploadEvent.data;
    const correlationId = ulid();
    
    try {
      // Step 1: Extract text
      await eventClient.publishFileProcessingStarted({
        file_id,
        processing_type: "text_extraction",
        correlation_id: correlationId
      });
      
      const textResult = await eventClient.waitForEvent(
        STREAMS.CONTEXTUAL,
        'file.processing.completed',
        correlationId
      );
      
      // Step 2: Generate embeddings
      await eventClient.publishEmbeddingGenerationRequested({
        text_content: textResult.data.extracted_text,
        user_id,
        contextual_core_id: fileUploadEvent.data.contextual_core_id,
        correlation_id: correlationId,
        priority: "normal"
      });
      
      const embeddingResult = await eventClient.waitForEvent(
        STREAMS.CONTEXTUAL,
        'embedding.generation.completed',
        correlationId
      );
      
      // Step 3: Notify user
      await eventClient.publishNotificationRequested({
        user_id,
        notification_type: "content_suggestion",
        channels: ["websocket", "push"],
        message: {
          title: "File processed successfully",
          body: `${fileUploadEvent.data.filename} is now searchable`
        },
        priority: "normal"
      });
      
    } catch (error) {
      await this.handleSagaFailure(file_id, error);
    }
  }
}
```

## Available Event Types

### User Events (STREAMS.USER)
- `user.registered` - New user registration
- `user.login` - User authentication
- `user.preferences.updated` - Settings changes

### Contextual Events (STREAMS.CONTEXTUAL)  
- `file.uploaded` - File upload to contextual core
- `file.processing.started` - File processing initiated
- `file.processing.completed` - File processing finished
- `embedding.generation.requested` - Request embedding creation
- `embedding.generation.completed` - Embedding creation finished

### AI Events (STREAMS.AI)
- `ai.content.generation.requested` - Request content generation
- `ai.content.generation.completed` - Content generation finished
- `ai.consultation.requested` - Request business consultation
- `ai.consultation.completed` - Consultation finished

### Market Events (STREAMS.MARKET)
- `market.data.collection.started` - Data collection initiated
- `market.data.collected` - Data collection finished
- `market.trend.detected` - New trend identified

### Notification Events (STREAMS.NOTIFICATION)
- `notification.send.requested` - Request notification delivery
- `notification.delivered` - Notification delivery confirmed
- `briefing.generation.scheduled` - Briefing generation scheduled

### System Events (STREAMS.SYSTEM)
- `system.service.health` - Service health status
- `system.error.critical` - Critical error occurred
- `system.performance.degraded` - Performance issue detected

## Error Handling

### Retry Logic

The event system includes automatic retry with exponential backoff:

```typescript
const retryConfig = {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true
};
```

### Dead Letter Handling

Failed messages are automatically moved to dead letter queues:

```typescript
// Republish dead letters after fixing issues
await eventBus.republishDeadLetters(
  STREAMS.CONTEXTUAL,
  'file-processor-group',
  3600000 // 1 hour max age
);
```

### Error Events

Publish error events for system monitoring:

```typescript
await eventClient.publishSystemError({
  service_name: 'file-processor',
  error_type: 'ProcessingError',
  error_message: error.message,
  stack_trace: error.stack,
  user_id: userId,
  requires_immediate_attention: true
});
```

## Performance Best Practices

### 1. Use Consumer Groups for Scaling

```typescript
// Create multiple consumers for parallel processing
for (let i = 0; i < workerCount; i++) {
  await eventBus.subscribe(
    STREAMS.CONTEXTUAL,
    'file.uploaded',
    processFileUpload,
    {
      consumerGroup: 'file-processors',
      consumerName: `worker-${i}`
    }
  );
}
```

### 2. Batch Processing

```typescript
// Process multiple events in batches
await eventBus.subscribe(
  STREAMS.MARKET,
  'market.data.collected',
  async (events) => {
    await processBatchOfMarketData(events);
  },
  {
    consumerGroup: 'market-analyzers',
    consumerName: 'batch-processor',
    batchSize: 10
  }
);
```

### 3. Memory Management

```typescript
// Configure stream trimming to prevent memory issues
const maxStreamLength = 10000;

await eventClient.publish(event, {
  maxLength: maxStreamLength,
  trimStrategy: 'MAXLEN'
});
```

## Monitoring and Debugging

### Health Checks

```typescript
// Check event system health
const health = await fetch('http://event-bus:3002/health');
const status = await health.json();

console.log('Event system status:', status.data.services);
```

### Stream Information

```typescript
// Get stream information
const streamInfo = await fetch('http://event-bus:3002/streams/user.events/info');
const info = await streamInfo.json();

console.log('Stream length:', info.data.length);
console.log('Consumer groups:', info.data.groups);
```

### Event Tracing

Use correlation IDs to trace events across services:

```typescript
// Add correlation ID to all related events
const correlationId = ulid();

await eventClient.publishFileUploaded({
  // ... other fields
  correlation_id: correlationId
});

await eventClient.publishEmbeddingGenerationRequested({
  // ... other fields
  correlation_id: correlationId
});

// Search logs by correlation ID to trace the entire flow
```

## Testing Your Event Integration

### Unit Tests

```typescript
// Mock the event client for unit tests
jest.mock('./shared-events/client');

test('should publish user registration event', async () => {
  const mockPublish = jest.fn().mockResolvedValue('message-id');
  EventClient.prototype.publishUserRegistered = mockPublish;
  
  await userService.registerUser(userData);
  
  expect(mockPublish).toHaveBeenCalledWith({
    user_id: userData.id,
    email: userData.email,
    tier: 'individual_pro'
  });
});
```

### Integration Tests

```typescript
// Test against real Redis in integration tests
describe('File Processing Integration', () => {
  let eventClient;
  
  beforeAll(async () => {
    eventClient = new EventClient({ redis: testConfig });
    await eventClient.connect();
  });
  
  test('should process file upload end-to-end', async () => {
    // Publish file upload event
    await eventClient.publishFileUploaded(testFileData);
    
    // Wait for processing completion
    const result = await eventClient.waitForEvent(
      STREAMS.CONTEXTUAL,
      'file.processing.completed',
      correlationId
    );
    
    expect(result.data.success).toBe(true);
  });
});
```

## Migration from HTTP to Events

### Before (HTTP)
```typescript
// Synchronous HTTP call
const response = await axios.post('/api/generate-content', {
  user_id: userId,
  content_type: 'social_post',
  prompt: 'Write about sustainability'
});

return response.data;
```

### After (Events)
```typescript
// Asynchronous event-driven
const correlationId = ulid();

await eventClient.publishAIContentGenerationRequested({
  request_id: ulid(),
  user_id: userId,
  contextual_core_id: coreId,
  content_type: 'social_post',
  prompt_template: 'Write about {{topic}}',
  ai_provider: 'anthropic',
  max_tokens: 500,
  correlation_id: correlationId
});

const result = await eventClient.waitForEvent(
  STREAMS.AI,
  'ai.content.generation.completed',
  correlationId
);

return result.data.generated_content;
```

## Common Pitfalls and Solutions

### 1. Forgetting to Acknowledge Messages
```typescript
// ❌ Wrong - message will be redelivered
await eventBus.subscribe(stream, eventType, async (event) => {
  await processEvent(event);
  // Missing acknowledgment!
});

// ✅ Correct - explicitly acknowledge
await eventBus.subscribe(stream, eventType, async (event) => {
  await processEvent(event);
  return true; // Acknowledges message
});
```

### 2. Not Handling Failures Gracefully
```typescript
// ❌ Wrong - errors crash the consumer
await eventBus.subscribe(stream, eventType, async (event) => {
  await riskyOperation(event); // Might throw
});

// ✅ Correct - handle errors gracefully
await eventBus.subscribe(stream, eventType, async (event) => {
  try {
    await riskyOperation(event);
    return true; // Success
  } catch (error) {
    logger.error('Failed to process event', { event, error });
    
    if (error.isRetryable) {
      return false; // Don't ack, will retry
    } else {
      await publishErrorEvent(error, event);
      return true; // Ack to prevent infinite retries
    }
  }
});
```

### 3. Creating Infinite Event Loops
```typescript
// ❌ Wrong - creates infinite loop
await eventBus.subscribe(STREAMS.USER, 'user.updated', async (event) => {
  // This triggers another user.updated event!
  await updateUserInDatabase(event.data);
  await eventClient.publishUserUpdated(event.data);
});

// ✅ Correct - only publish when actually changing data
await eventBus.subscribe(STREAMS.USER, 'user.updated', async (event) => {
  const changed = await updateUserInDatabase(event.data);
  
  // Only publish if we made actual changes
  if (changed) {
    await eventClient.publishUserUpdated(updatedData);
  }
});
```

## Resources

- **Event Schema Reference**: `shared/events/src/index.ts`
- **Integration Tests**: `tests/integration/event-system-validation.test.ts`
- **Performance Benchmarks**: `docs/EVENT_SYSTEM_VALIDATION.md`
- **Architecture Decisions**: `docs/ADR-006-EVENT_DRIVEN_ARCHITECTURE.md`

---

**Need Help?** Check the integration tests for working examples of all patterns described in this guide.