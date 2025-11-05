# ADR-006: Event-Driven Architecture Implementation

**Date:** October 9, 2024  
**Status:** Implemented  
**Decision Makers:** Architecture Team  
**Technical Story:** Implementation of Redis Streams-based event system for microservice communication

## Context

The Collective Strategist requires a robust communication layer between microservices to handle:
- Asynchronous file processing (text extraction, embeddings)
- AI content generation workflows
- Market data collection and analysis
- User notifications and system alerts
- Cross-service data synchronization
- Background task orchestration

Traditional synchronous HTTP communication would create tight coupling and single points of failure, especially for long-running operations like embedding generation and market data analysis.

## Decision

We will implement a comprehensive event-driven architecture using **Redis Streams** as the message bus with the following components:

### Core Components
1. **Event Schema System** - Type-safe event definitions with Zod validation
2. **Redis Streams Event Bus** - Message persistence and delivery guarantees
3. **Task Queue System** - Background job processing with retry logic
4. **Event Client Library** - Simplified pub/sub interface for services

### Event Streams Organization
```yaml
Streams:
  user.events:           # Authentication, preferences, tier changes
  contextual.events:     # File uploads, processing, embeddings
  ai.events:            # Content generation, consultations
  market.events:        # Data collection, trend analysis
  notification.events:   # Alerts, briefings, system messages
  system.events:        # Health, errors, performance metrics
```

### Message Format
```typescript
interface BaseEvent {
  id: string;                    // ULID for ordered IDs
  stream: string;               // Target stream
  type: string;                 // Event type
  version: number;              // Schema version
  timestamp: Date;              // Event occurrence
  correlation_id?: string;      // Request tracking
  user_id?: string;            // User context
  data: object;                // Event payload
  metadata?: object;           // Additional context
}
```

## Rationale

### Why Redis Streams over Alternatives

**vs. Apache Kafka:**
- ✅ Simpler operational overhead
- ✅ Lower resource requirements
- ✅ Built-in persistence and consumer groups
- ✅ Excellent performance for our scale
- ❌ Less enterprise ecosystem

**vs. RabbitMQ:**
- ✅ Better performance for high-throughput
- ✅ Simpler Redis-only dependency
- ✅ Built-in stream processing capabilities
- ❌ Less advanced routing features

**vs. Database-based queues:**
- ✅ Much better performance
- ✅ Built-in message ordering
- ✅ Consumer group load balancing
- ✅ Automatic message persistence

### Key Benefits

1. **Loose Coupling**: Services communicate via events, not direct API calls
2. **Scalability**: Consumer groups enable horizontal scaling
3. **Reliability**: Message persistence and acknowledgments prevent data loss
4. **Observability**: All inter-service communication is logged and traceable
5. **Development Velocity**: Services can be developed independently
6. **Fault Tolerance**: Failed messages are retried automatically

## Implementation Details

### Event Publishing Pattern
```typescript
// Services publish events for actions they complete
await eventClient.publishFileUploaded({
  file_id: "uuid",
  user_id: "uuid", 
  contextual_core_id: "uuid",
  filename: "document.pdf",
  file_size: 1024000,
  mime_type: "application/pdf",
  is_browser_viewable: false
});
```

### Event Subscription Pattern
```typescript
// Services subscribe to events they need to process
await eventBus.subscribe(
  STREAMS.CONTEXTUAL,
  'file.uploaded',
  async (event) => {
    await processFileUpload(event.data);
  },
  {
    consumerGroup: 'file-processor',
    consumerName: 'worker-1'
  }
);
```

### Request/Response Pattern
```typescript
// For operations requiring responses
const correlationId = ulid();
await eventClient.publishEmbeddingGenerationRequested({
  text_content: "sample text",
  correlation_id: correlationId,
  // ... other fields
});

const result = await eventClient.waitForEvent(
  STREAMS.CONTEXTUAL,
  'embedding.generation.completed',
  correlationId,
  30000 // 30 second timeout
);
```

### Background Task Processing
```typescript
// Task queue for heavy operations
const taskId = await taskQueue.processFile(fileId, {
  userId: "uuid",
  contextualCoreId: "uuid", 
  processingType: 'embedding_generation',
  priority: 'normal'
});
```

## Testing Strategy

### Unit Tests
- Event schema validation
- Event client publish/subscribe functionality
- Task queue job processing logic
- Retry and error handling mechanisms

### Integration Tests  
- Redis Streams message flow
- Consumer group functionality
- Cross-service event communication
- Dead letter queue handling

### Performance Tests
- Message throughput benchmarks
- Consumer scaling behavior
- Memory usage under load
- Latency measurements

## Migration Path

### Phase 1: Foundation ✅
- [x] Event schema definitions
- [x] Redis Streams event bus
- [x] Task queue system
- [x] Core API integration

### Phase 2: Service Integration 🚧  
- [ ] Contextual Core event handlers
- [ ] Market Monitor event publishers
- [ ] AI Integration event processing
- [ ] Notification service events

### Phase 3: Advanced Features
- [ ] Event sourcing for audit trails
- [ ] Complex event processing (CEP)
- [ ] Event replay capabilities
- [ ] Cross-stream analytics

## Monitoring and Observability

### Metrics Tracked
- Events published/consumed per stream
- Consumer lag and processing time
- Error rates and retry counts
- Queue depth and throughput
- Memory usage and connection health

### Health Checks
- Redis connection status
- Stream info and consumer groups
- Dead letter queue monitoring
- Task queue performance metrics

### Alerting Thresholds
- Consumer lag > 1000 messages
- Error rate > 5% over 5 minutes
- Queue depth > 10,000 messages
- Memory usage > 80%

## Security Considerations

### Event Data Protection
- No sensitive data in event payloads (use references/IDs)
- Event stream access control via Redis AUTH
- Message encryption for sensitive events (future)
- Audit logging of all event access

### Network Security
- Redis communication over private networks only
- TLS encryption for Redis connections (production)
- Service-to-service authentication tokens
- Network segmentation for event bus access

## Operational Procedures

### Deployment
- Blue/green deployment compatible
- Consumer group management during updates
- Message replay for failed deployments
- Rollback procedures for event schema changes

### Maintenance
- Stream compaction and cleanup procedures
- Consumer group rebalancing
- Performance tuning guidelines
- Backup and disaster recovery plans

## Consequences

### Positive
- ✅ **Scalability**: Horizontal scaling through consumer groups
- ✅ **Reliability**: Message persistence and retry mechanisms
- ✅ **Development Speed**: Independent service development
- ✅ **Observability**: Complete event audit trail
- ✅ **Flexibility**: Easy to add new event types and consumers

### Negative  
- ❌ **Complexity**: Additional infrastructure to manage
- ❌ **Debugging**: Distributed tracing across event flows
- ❌ **Consistency**: Eventual consistency vs immediate consistency
- ❌ **Dependencies**: Redis becomes critical infrastructure

### Mitigation Strategies
- Comprehensive monitoring and alerting
- Event replay capabilities for debugging
- Circuit breakers and fallback mechanisms
- Redis clustering for high availability

## Future Considerations

### Potential Enhancements
- Event sourcing for complete audit trails
- Complex event processing for trend detection
- Event schema evolution and versioning
- Cross-stream event correlation and analytics

### Technology Evolution
- Consider Kafka migration at enterprise scale
- Evaluate newer event streaming technologies
- Implement event mesh architecture for multi-cloud
- Add event encryption for sensitive data

---

**Implementation Status:** ✅ Complete  
**Next Review Date:** January 2025  
**Related ADRs:** ADR-002 (Provider Agnosticism), ADR-005 (Data Sovereignty)