"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventClient = void 0;
const redis_1 = require("redis");
const index_1 = require("./index");
const ulid_1 = require("ulid");
class EventClient {
    constructor(config) {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            socket: {
                host: config.redis.host,
                port: config.redis.port,
            },
            password: config.redis.password,
            database: config.redis.db || 0,
        });
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
            this.isConnected = true;
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
        }
    }
    async publish(event) {
        this.ensureConnected();
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
        return await this.client.xAdd(event.stream, '*', fields);
    }
    // Convenience methods for common events
    async publishUserRegistered(data) {
        const event = (0, index_1.createUserRegisteredEvent)(data);
        return this.publish(event);
    }
    async publishFileUploaded(data) {
        const event = (0, index_1.createFileUploadedEvent)(data);
        return this.publish(event);
    }
    async publishFileProcessingStarted(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.CONTEXTUAL,
            type: 'file.processing.started',
            version: 1,
            user_id: data.user_id,
            correlation_id: data.correlation_id,
            data: {
                file_id: data.file_id,
                processing_type: data.processing_type,
                estimated_duration_ms: data.estimated_duration_ms,
            },
        });
        return this.publish(event);
    }
    async publishFileProcessingCompleted(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.CONTEXTUAL,
            type: 'file.processing.completed',
            version: 1,
            user_id: data.user_id,
            correlation_id: data.correlation_id,
            data: {
                file_id: data.file_id,
                processing_type: data.processing_type,
                processing_time_ms: data.processing_time_ms,
                extracted_text_length: data.extracted_text_length,
                embedding_model_used: data.embedding_model_used,
                success: data.success,
                error: data.error,
            },
        });
        return this.publish(event);
    }
    async publishEmbeddingGenerationRequested(data) {
        const event = (0, index_1.createEmbeddingGenerationRequestedEvent)(data);
        return this.publish(event);
    }
    async publishEmbeddingGenerationCompleted(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.CONTEXTUAL,
            type: 'embedding.generation.completed',
            version: 1,
            user_id: data.user_id,
            correlation_id: data.correlation_id,
            data: {
                embedding_id: data.embedding_id,
                content_hash: data.content_hash,
                model_id: data.model_id,
                dimensions: data.dimensions,
                generation_time_ms: data.generation_time_ms,
                cost_usd: data.cost_usd,
                quality_score: data.quality_score,
            },
        });
        return this.publish(event);
    }
    async publishAIContentGenerationRequested(data) {
        const event = (0, index_1.createAIContentGenerationRequestedEvent)(data);
        return this.publish(event);
    }
    async publishAIContentGenerationCompleted(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.AI,
            type: 'ai.content.generation.completed',
            version: 1,
            user_id: data.user_id,
            correlation_id: data.correlation_id,
            data: {
                request_id: data.request_id,
                content_draft_id: data.content_draft_id,
                generated_content: data.generated_content,
                ai_provider: data.ai_provider,
                model_used: data.model_used,
                tokens_used: data.tokens_used,
                generation_time_ms: data.generation_time_ms,
                cost_usd: data.cost_usd,
            },
        });
        return this.publish(event);
    }
    async publishNotificationRequested(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.NOTIFICATION,
            type: 'notification.send.requested',
            version: 1,
            user_id: data.user_id,
            correlation_id: data.correlation_id,
            data: {
                user_id: data.user_id,
                notification_type: data.notification_type,
                channels: data.channels,
                message: data.message,
                priority: data.priority,
            },
        });
        return this.publish(event);
    }
    async publishSystemError(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.SYSTEM,
            type: 'system.error.critical',
            version: 1,
            user_id: data.user_id,
            correlation_id: data.correlation_id,
            data: {
                service_name: data.service_name,
                error_type: data.error_type,
                error_message: data.error_message,
                stack_trace: data.stack_trace,
                user_id: data.user_id,
                request_id: data.request_id,
                requires_immediate_attention: data.requires_immediate_attention,
            },
        });
        return this.publish(event);
    }
    async publishServiceHealth(data) {
        const event = (0, index_1.createEvent)({
            stream: index_1.STREAMS.SYSTEM,
            type: 'system.service.health',
            version: 1,
            correlation_id: data.correlation_id,
            data: {
                service_name: data.service_name,
                status: data.status,
                response_time_ms: data.response_time_ms,
                memory_usage_mb: data.memory_usage_mb,
                cpu_usage_percent: data.cpu_usage_percent,
                error_rate: data.error_rate,
            },
        });
        return this.publish(event);
    }
    // Utility methods
    async waitForEvent(stream, eventType, correlationId, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout waiting for event ${eventType} with correlation ID ${correlationId}`));
            }, timeoutMs);
            const consumerGroup = `wait-${(0, ulid_1.ulid)()}`;
            const consumerName = `waiter-${(0, ulid_1.ulid)()}`;
            // This is a simplified version - in practice, you'd want to use the full EventBus
            const pollForEvent = async () => {
                try {
                    const messages = await this.client.xReadGroup(consumerGroup, consumerName, [{ key: stream, id: '>' }], { COUNT: 1, BLOCK: 1000 });
                    if (messages && messages.length > 0) {
                        for (const streamMessages of messages) {
                            for (const message of streamMessages.messages) {
                                const fields = message.message;
                                if (fields.type === eventType && fields.correlation_id === correlationId) {
                                    clearTimeout(timeout);
                                    const event = {
                                        id: fields.id,
                                        stream: fields.stream,
                                        type: fields.type,
                                        version: parseInt(fields.version),
                                        timestamp: new Date(fields.timestamp),
                                        correlation_id: fields.correlation_id || undefined,
                                        user_id: fields.user_id || undefined,
                                        data: JSON.parse(fields.data),
                                        metadata: JSON.parse(fields.metadata || '{}'),
                                    };
                                    resolve(event);
                                    return;
                                }
                            }
                        }
                    }
                    // Continue polling
                    setImmediate(pollForEvent);
                }
                catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };
            // Create consumer group and start polling
            this.client.xGroupCreate(stream, consumerGroup, '0', { MKSTREAM: true })
                .then(() => pollForEvent())
                .catch(() => pollForEvent()); // Group might already exist
        });
    }
    ensureConnected() {
        if (!this.isConnected) {
            throw new Error('EventClient is not connected. Call connect() first.');
        }
    }
}
exports.EventClient = EventClient;
//# sourceMappingURL=client.js.map