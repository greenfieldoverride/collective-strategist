# Event System Design - The Collective Strategist

## Overview

The Collective Strategist uses Redis Streams for event-driven architecture, enabling asynchronous processing, service isolation, and horizontal scaling from day one.

## Event Streams Architecture

### Stream Organization
```yaml
Streams:
  user.events:           # User actions (signup, login, preferences)
  content.events:        # Content creation, editing, publishing  
  contextual.events:     # File uploads, processing, embeddings
  market.events:         # Data collection, trend analysis
  ai.events:            # Generation requests, completions
  notification.events:   # Alerts, briefings, system messages
  system.events:        # Health, errors, performance metrics
```

### Message Persistence
- **Redis Streams**: Guaranteed message delivery with acknowledgments
- **Consumer Groups**: Multiple workers for parallel processing
- **Dead Letter Queues**: Failed message handling and retry logic
- **Retention**: Configurable message retention for audit trails

## Event Schema Design

### Base Event Structure
```typescript
interface BaseEvent {
  id: string;                    // Unique event ID (ULID)
  stream: string;               // Stream name
  type: string;                 // Event type
  version: number;              // Schema version
  timestamp: Date;              // Event occurrence time
  correlation_id?: string;      // For tracking related events
  user_id?: string;            // Associated user
  metadata?: Record<string, any>;
}
```

### Core Event Types

#### User Events
```typescript
'user.registered': {
  user_id: string;
  email: string;
  tier: 'sovereign_circle' | 'individual_pro';
  referral_source?: string;
}

'user.preferences.updated': {
  user_id: string;
  changed_fields: string[];
  old_values: Record<string, any>;
  new_values: Record<string, any>;
}

'user.login': {
  user_id: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
}
```

#### Contextual Events
```typescript
'file.uploaded': {
  file_id: string;
  user_id: string;
  contextual_core_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  is_browser_viewable: boolean;
}

'file.processing.started': {
  file_id: string;
  processing_type: 'text_extraction' | 'embedding_generation' | 'metadata_analysis';
  estimated_duration_ms: number;
}

'file.processing.completed': {
  file_id: string;
  processing_type: string;
  processing_time_ms: number;
  extracted_text_length?: number;
  embedding_model_used?: string;
  success: boolean;
  error?: string;
}

'embedding.generation.requested': {
  text_content: string;
  content_hash: string;
  user_id: string;
  contextual_core_id: string;
  preferred_model?: string;
  priority: 'low' | 'normal' | 'high';
}

'embedding.generation.completed': {
  embedding_id: string;
  content_hash: string;
  model_id: string;
  dimensions: number;
  generation_time_ms: number;
  cost_usd: number;
  quality_score?: number;
}
```

#### AI Events
```typescript
'ai.content.generation.requested': {
  request_id: string;
  user_id: string;
  contextual_core_id: string;
  content_type: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
  prompt_template: string;
  ai_provider: string;
  max_tokens: number;
}

'ai.content.generation.completed': {
  request_id: string;
  content_draft_id: string;
  generated_content: string;
  ai_provider: string;
  model_used: string;
  tokens_used: number;
  generation_time_ms: number;
  cost_usd: number;
}

'ai.consultation.requested': {
  session_id: string;
  user_id: string;
  contextual_core_id: string;
  query: string;
  session_type: 'strategic_advice' | 'trend_analysis' | 'goal_planning';
}

'ai.consultation.completed': {
  session_id: string;
  response: string;
  confidence_score: number;
  market_data_referenced: string[];
  ai_provider: string;
  tokens_used: number;
}
```

#### Market Events
```typescript
'market.data.collection.started': {
  collection_id: string;
  data_source: 'reddit' | 'google_trends' | 'rss_feeds';
  keywords: string[];
  user_ids: string[]; // Users interested in this data
}

'market.data.collected': {
  collection_id: string;
  data_source: string;
  data_type: 'engagement' | 'trend' | 'competitor_activity';
  records_collected: number;
  collection_time_ms: number;
  data_quality_score: number;
}

'market.trend.detected': {
  trend_id: string;
  trend_type: 'rising' | 'declining' | 'stable';
  keywords: string[];
  confidence_score: number;
  affected_users: string[];
  trend_data: object;
}
```

#### Notification Events
```typescript
'notification.send.requested': {
  user_id: string;
  notification_type: 'briefing_ready' | 'system_alert' | 'content_suggestion';
  channels: ('email' | 'push' | 'websocket')[];
  message: {
    title: string;
    body: string;
    action_url?: string;
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
}

'notification.delivered': {
  notification_id: string;
  user_id: string;
  channel: string;
  delivery_time_ms: number;
  success: boolean;
  error?: string;
}

'briefing.generation.scheduled': {
  user_id: string;
  contextual_core_id: string;
  briefing_period: 'weekly' | 'monthly';
  scheduled_time: Date;
  period_start: Date;
  period_end: Date;
}
```

#### System Events
```typescript
'system.service.health': {
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  error_rate: number;
}

'system.error.critical': {
  service_name: string;
  error_type: string;
  error_message: string;
  stack_trace: string;
  user_id?: string;
  request_id?: string;
  requires_immediate_attention: boolean;
}

'system.performance.degraded': {
  metric_name: string;
  current_value: number;
  threshold_value: number;
  affected_services: string[];
  suggested_actions: string[];
}
```

## Event Processing Patterns

### Request-Response Pattern
```typescript
// Content generation request/response
async function requestContentGeneration(request: ContentRequest): Promise<ContentResponse> {
  const correlationId = generateULID();
  
  // Publish request event
  await eventBus.publish('ai.events', {
    type: 'ai.content.generation.requested',
    correlation_id: correlationId,
    data: request
  });
  
  // Wait for completion event with same correlation_id
  return await eventBus.waitForEvent('ai.events', {
    type: 'ai.content.generation.completed',
    correlation_id: correlationId,
    timeout: 30000 // 30 second timeout
  });
}
```

### Saga Pattern (Multi-Step Workflows)
```typescript
// File upload and processing saga
class FileProcessingSaga {
  async execute(fileUploadEvent: FileUploadEvent) {
    const { file_id, user_id } = fileUploadEvent.data;
    
    try {
      // Step 1: Extract text
      await this.publishAndWait('file.text_extraction.requested', { file_id });
      
      // Step 2: Generate embeddings
      await this.publishAndWait('embedding.generation.requested', { 
        file_id,
        user_id 
      });
      
      // Step 3: Update search index
      await this.publishAndWait('search.index.update.requested', { file_id });
      
      // Step 4: Notify user
      await this.publish('notification.send.requested', {
        user_id,
        type: 'file.processing.completed',
        message: { title: 'File processed successfully' }
      });
      
    } catch (error) {
      await this.handleSagaFailure(file_id, error);
    }
  }
}
```

### Event Sourcing Pattern
```typescript
// Track all changes to user preferences as events
class UserPreferencesProjection {
  async handleEvent(event: BaseEvent) {
    switch (event.type) {
      case 'user.preferences.updated':
        await this.updatePreferences(event.data);
        break;
      case 'user.embedding.model.changed':
        await this.updateEmbeddingPreferences(event.data);
        break;
      // Rebuild complete state from event history if needed
    }
  }
  
  async rebuildFromHistory(userId: string) {
    const events = await eventStore.getEventsForUser(userId);
    for (const event of events) {
      await this.handleEvent(event);
    }
  }
}
```

## Task Queue Implementation

### Background Job Processing
```typescript
interface TaskQueue {
  // File processing
  processFile(fileId: string, options: ProcessingOptions): Promise<void>;
  extractText(filePath: string, mimeType: string): Promise<string>;
  generateEmbedding(text: string, modelId: string): Promise<EmbeddingResult>;
  
  // AI operations
  generateContent(request: ContentRequest): Promise<ContentResponse>;
  runConsultation(query: string, context: ConsultationContext): Promise<ConsultationResponse>;
  
  // Market monitoring
  collectMarketData(sources: DataSource[], keywords: string[]): Promise<void>;
  analyzeMarketTrends(dataPoints: MarketDataPoint[]): Promise<TrendAnalysis>;
  
  // Notifications
  sendNotification(userId: string, message: NotificationMessage): Promise<void>;
  generateBriefing(userId: string, period: BriefingPeriod): Promise<void>;
  
  // System maintenance
  cleanupExpiredData(): Promise<void>;
  optimizeEmbeddingCache(): Promise<void>;
  updateModelBenchmarks(): Promise<void>;
}
```

### Worker Scaling Strategy
```yaml
Worker Configuration:
  file-processor:
    min_workers: 2
    max_workers: 10
    scale_metric: queue_length
    scale_threshold: 50
    
  embedding-generator:
    min_workers: 1
    max_workers: 5
    scale_metric: cpu_usage
    scale_threshold: 80%
    
  content-generator:
    min_workers: 1
    max_workers: 8
    scale_metric: queue_length
    scale_threshold: 20
    
  market-monitor:
    min_workers: 1
    max_workers: 3
    scale_metric: schedule
    scale_threshold: time_based
```

## Error Handling & Resilience

### Retry Logic
```typescript
interface RetryConfig {
  max_attempts: number;
  backoff_strategy: 'exponential' | 'linear' | 'fixed';
  base_delay_ms: number;
  max_delay_ms: number;
  jitter: boolean;
}

const defaultRetryConfig: RetryConfig = {
  max_attempts: 3,
  backoff_strategy: 'exponential',
  base_delay_ms: 1000,
  max_delay_ms: 30000,
  jitter: true
};
```

### Dead Letter Queues
```typescript
interface DeadLetterHandler {
  // Messages that fail all retry attempts
  handleDeadLetter(event: BaseEvent, error: Error): Promise<void>;
  
  // Admin interface for manual intervention
  reprocessDeadLetter(eventId: string): Promise<void>;
  
  // Automatic resolution for known error patterns
  attemptAutoResolution(event: BaseEvent): Promise<boolean>;
}
```

## Monitoring & Observability

### Event Metrics
- **Throughput**: Events processed per second by stream
- **Latency**: Time from event publish to completion
- **Error Rate**: Failed events per stream
- **Queue Depth**: Pending events per consumer group
- **Consumer Lag**: How far behind consumers are

### Performance Tracking
```typescript
interface EventPerformanceMetrics {
  stream_name: string;
  event_type: string;
  processing_time_p50: number;
  processing_time_p95: number;
  processing_time_p99: number;
  success_rate: number;
  error_rate: number;
  throughput_per_minute: number;
}
```

---

*This event system provides the foundation for a scalable, resilient, and observable microservices architecture.*