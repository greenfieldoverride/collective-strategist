import { ulid } from 'ulid';
import {
  createUserRegisteredEvent,
  createFileUploadedEvent,
  createEmbeddingGenerationRequestedEvent,
  createAIContentGenerationRequestedEvent,
  UserRegisteredEventSchema,
  FileUploadedEventSchema,
  EmbeddingGenerationRequestedEventSchema,
  AIContentGenerationRequestedEventSchema,
  STREAMS,
  EVENT_SCHEMAS
} from '../../shared/events/src/index';

describe('Event Schema Validation', () => {
  describe('Base Event Structure', () => {
    test('should create valid base event using factory', () => {
      const event = createUserRegisteredEvent({
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro',
      });

      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event.stream).toBe(STREAMS.USER);
      expect(event.type).toBe('user.registered');
      expect(event.version).toBe(1);
      expect(typeof event.data).toBe('object');
    });

    test('should generate unique IDs for events', () => {
      const event1 = createUserRegisteredEvent({
        user_id: ulid(),
        email: 'test1@example.com',
        tier: 'individual_pro',
      });

      const event2 = createUserRegisteredEvent({
        user_id: ulid(),
        email: 'test2@example.com',
        tier: 'individual_pro',
      });

      expect(event1.id).not.toBe(event2.id);
      expect(event1.id.length).toBeGreaterThan(0);
      expect(event2.id.length).toBeGreaterThan(0);
    });

    test('should handle correlation IDs', () => {
      const correlationId = ulid();
      const event = createUserRegisteredEvent({
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro',
        correlation_id: correlationId,
      });

      expect(event.correlation_id).toBe(correlationId);
    });
  });

  describe('User Events', () => {
    test('should create valid user registration event', () => {
      const testData = {
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro' as const,
        referral_source: 'direct_signup',
      };

      const event = createUserRegisteredEvent(testData);
      const result = UserRegisteredEventSchema.safeParse(event);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('user.registered');
        expect(result.data.stream).toBe(STREAMS.USER);
      }
    });

    test('should validate email format in schema validation', () => {
      // Create event with invalid email directly for schema testing
      const invalidEvent = {
        id: ulid(),
        stream: STREAMS.USER,
        type: 'user.registered' as const,
        version: 1,
        timestamp: new Date(),
        data: {
          user_id: ulid(),
          email: 'invalid-email',
          tier: 'individual_pro' as const,
        },
      };

      const result = UserRegisteredEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    test('should validate tier values in schema validation', () => {
      const invalidEvent = {
        id: ulid(),
        stream: STREAMS.USER,
        type: 'user.registered' as const,
        version: 1,
        timestamp: new Date(),
        data: {
          user_id: ulid(),
          email: 'test@example.com',
          tier: 'invalid_tier' as any,
        },
      };

      const result = UserRegisteredEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('Contextual Events', () => {
    test('should create valid file uploaded event', () => {
      const testData = {
        file_id: ulid(),
        user_id: ulid(),
        contextual_core_id: ulid(),
        filename: 'document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        is_browser_viewable: false,
      };

      const event = createFileUploadedEvent(testData);
      const result = FileUploadedEventSchema.safeParse(event);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('file.uploaded');
        expect(result.data.stream).toBe(STREAMS.CONTEXTUAL);
      }
    });

    test('should validate UUID format for IDs in schema validation', () => {
      const invalidEvent = {
        id: ulid(),
        stream: STREAMS.CONTEXTUAL,
        type: 'file.uploaded' as const,
        version: 1,
        timestamp: new Date(),
        data: {
          file_id: 'invalid-uuid',
          user_id: ulid(),
          contextual_core_id: ulid(),
          filename: 'document.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf',
          is_browser_viewable: false,
        },
      };

      const result = FileUploadedEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    test('should create valid embedding generation request event', () => {
      const testData = {
        text_content: 'Sample text for embedding',
        content_hash: 'sha256hash',
        user_id: ulid(),
        contextual_core_id: ulid(),
        preferred_model: 'all-mpnet-base-v2',
        priority: 'normal' as const,
      };

      const event = createEmbeddingGenerationRequestedEvent(testData);
      const result = EmbeddingGenerationRequestedEventSchema.safeParse(event);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('embedding.generation.requested');
      }
    });

    test('should validate priority values in schema validation', () => {
      const invalidEvent = {
        id: ulid(),
        stream: STREAMS.CONTEXTUAL,
        type: 'embedding.generation.requested' as const,
        version: 1,
        timestamp: new Date(),
        data: {
          text_content: 'Sample text',
          content_hash: 'hash',
          user_id: ulid(),
          contextual_core_id: ulid(),
          priority: 'invalid_priority' as any,
        },
      };

      const result = EmbeddingGenerationRequestedEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('AI Events', () => {
    test('should create valid AI content generation request event', () => {
      const testData = {
        request_id: ulid(),
        user_id: ulid(),
        contextual_core_id: ulid(),
        content_type: 'social_post' as const,
        prompt_template: 'Create a social media post about {{topic}}',
        ai_provider: 'anthropic',
        max_tokens: 500,
      };

      const event = createAIContentGenerationRequestedEvent(testData);
      const result = AIContentGenerationRequestedEventSchema.safeParse(event);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('ai.content.generation.requested');
        expect(result.data.stream).toBe(STREAMS.AI);
      }
    });

    test('should validate content type values in schema validation', () => {
      const invalidEvent = {
        id: ulid(),
        stream: STREAMS.AI,
        type: 'ai.content.generation.requested' as const,
        version: 1,
        timestamp: new Date(),
        data: {
          request_id: ulid(),
          user_id: ulid(),
          contextual_core_id: ulid(),
          content_type: 'invalid_type' as any,
          prompt_template: 'Test',
          ai_provider: 'anthropic',
          max_tokens: 500,
        },
      };

      const result = AIContentGenerationRequestedEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('Event Schema Registry', () => {
    test('should have schemas for all defined event types', () => {
      const requiredSchemas = [
        'user.registered',
        'user.login',
        'user.preferences.updated',
        'file.uploaded',
        'file.processing.started',
        'file.processing.completed',
        'embedding.generation.requested',
        'embedding.generation.completed',
        'ai.content.generation.requested',
        'ai.content.generation.completed',
        'ai.consultation.requested',
        'ai.consultation.completed',
        'notification.send.requested',
        'notification.delivered',
        'system.service.health',
        'system.error.critical',
      ];

      for (const eventType of requiredSchemas) {
        expect(EVENT_SCHEMAS).toHaveProperty(eventType);
        expect(EVENT_SCHEMAS[eventType as keyof typeof EVENT_SCHEMAS]).toBeDefined();
      }
    });

    test('should validate events against correct schemas', () => {
      const userEvent = createUserRegisteredEvent({
        user_id: ulid(),
        email: 'test@example.com',
        tier: 'individual_pro',
      });

      const schema = EVENT_SCHEMAS['user.registered'];
      const result = schema.safeParse(userEvent);
      expect(result.success).toBe(true);
    });
  });
});