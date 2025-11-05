import Fastify from 'fastify';
import { EventBus, EventBusConfig } from './core/event-bus';
import { TaskQueue, TaskQueueConfig } from './core/task-queue';
import { APIResponse } from './shared-types/index';

const fastify = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  }
});

// Configuration
const eventBusConfig: EventBusConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  streams: {
    maxRetries: 3,
    retryDelayMs: 1000,
    maxLength: 10000,
    trimStrategy: 'MAXLEN',
  },
  consumers: {
    groupPrefix: 'collective-strategist',
    blockTimeMs: 1000,
    claimIdleTimeMs: 60000,
  },
};

const taskQueueConfig: TaskQueueConfig = {
  maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '10'),
  defaultRetryConfig: {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitter: true,
  },
  healthCheckIntervalMs: 30000,
  deadLetterRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
};

// Initialize services
const eventBus = new EventBus(eventBusConfig);
const taskQueue = new TaskQueue(eventBus, taskQueueConfig);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    // Check Redis connection
    const redisHealth = await eventBus.getStreamInfo('user.events').catch(() => null);
    const taskStats = taskQueue.getStats();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth ? 'connected' : 'disconnected',
        eventBus: 'running',
        taskQueue: 'running',
      },
      stats: {
        taskQueue: taskStats,
      },
    };
    
    const response: APIResponse<typeof health> = {
      success: true,
      data: health,
    };
    
    reply.send(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: 'Health check failed',
    };
    reply.status(500).send(response);
  }
});

// Stream info endpoint
fastify.get<{
  Params: { stream: string };
}>('/streams/:stream/info', async (request, reply) => {
  try {
    const streamInfo = await eventBus.getStreamInfo(request.params.stream as any);
    
    const response: APIResponse<typeof streamInfo> = {
      success: true,
      data: streamInfo,
    };
    
    reply.send(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stream info',
    };
    reply.status(500).send(response);
  }
});

// Consumer group info endpoint
fastify.get<{
  Params: { stream: string };
}>('/streams/:stream/groups', async (request, reply) => {
  try {
    const groupInfo = await eventBus.getConsumerGroupInfo(request.params.stream as any);
    
    const response: APIResponse<typeof groupInfo> = {
      success: true,
      data: groupInfo,
    };
    
    reply.send(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get consumer group info',
    };
    reply.status(500).send(response);
  }
});

// Dead letter republish endpoint
fastify.post<{
  Params: { stream: string; group: string };
  Body: { maxAge?: number };
}>('/streams/:stream/groups/:group/republish-dead-letters', async (request, reply) => {
  try {
    const { stream, group } = request.params;
    const { maxAge = 3600000 } = request.body || {};
    
    const republishedCount = await eventBus.republishDeadLetters(
      stream as any,
      group,
      maxAge
    );
    
    const response: APIResponse<{ republishedCount: number }> = {
      success: true,
      data: { republishedCount },
    };
    
    reply.send(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to republish dead letters',
    };
    reply.status(500).send(response);
  }
});

// Task queue stats endpoint
fastify.get('/tasks/stats', async (request, reply) => {
  try {
    const stats = taskQueue.getStats();
    
    const response: APIResponse<typeof stats> = {
      success: true,
      data: stats,
    };
    
    reply.send(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: 'Failed to get task stats',
    };
    reply.status(500).send(response);
  }
});

// Manual task queue endpoint (for testing/admin)
fastify.post<{
  Body: {
    type: string;
    payload: any;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    userId?: string;
  };
}>('/tasks/queue', async (request, reply) => {
  try {
    const { type, payload, priority = 'normal', userId } = request.body;
    
    const taskId = await taskQueue.queueTask({
      type,
      payload,
      priority,
      maxRetries: 3,
      retryConfig: taskQueueConfig.defaultRetryConfig,
      userId,
    });
    
    const response: APIResponse<{ taskId: string }> = {
      success: true,
      data: { taskId },
    };
    
    reply.send(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to queue task',
    };
    reply.status(500).send(response);
  }
});

async function start() {
  try {
    // Connect to Redis and start services
    await eventBus.connect();
    await taskQueue.start();
    
    // Start HTTP server
    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`Event Bus Service running on port ${port}`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully');
      await fastify.close();
      await eventBus.disconnect();
      process.exit(0);
    });
    
  } catch (err) {
    console.error('Error starting Event Bus Service:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { eventBus, taskQueue };