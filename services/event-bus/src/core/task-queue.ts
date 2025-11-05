import { EventBus, RetryConfig } from './event-bus';
import { CollectiveStrategistEvent, createEvent, STREAMS } from '../shared-events/index';
import { ulid } from 'ulid';
import pino from 'pino';

export interface TaskDefinition {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  maxRetries: number;
  retryConfig: RetryConfig;
  createdAt: Date;
  scheduledFor?: Date;
  userId?: string;
  correlationId?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
  retryCount: number;
}

export interface TaskHandler {
  (task: TaskDefinition): Promise<any>;
}

export interface TaskQueueConfig {
  maxConcurrentTasks: number;
  defaultRetryConfig: RetryConfig;
  healthCheckIntervalMs: number;
  deadLetterRetentionMs: number;
}

export class TaskQueue {
  private eventBus: EventBus;
  private logger: pino.Logger;
  private config: TaskQueueConfig;
  private taskHandlers = new Map<string, TaskHandler>();
  private runningTasks = new Map<string, Promise<TaskResult>>();
  private taskStats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
  };

  constructor(eventBus: EventBus, config: TaskQueueConfig) {
    this.eventBus = eventBus;
    this.config = config;
    this.logger = pino({ name: 'task-queue' });
  }

  async start(): Promise<void> {
    this.logger.info('Starting task queue');
    
    // Subscribe to task events
    await this.eventBus.subscribe(
      STREAMS.SYSTEM,
      ['task.queued', 'task.retry', 'task.schedule'],
      this.handleTaskEvent.bind(this),
      {
        consumerGroup: 'task-queue-processor',
        consumerName: `worker-${ulid()}`,
      }
    );

    // Start health check interval
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    this.logger.info('Task queue started');
  }

  registerHandler(taskType: string, handler: TaskHandler): void {
    this.taskHandlers.set(taskType, handler);
    this.logger.debug(`Registered handler for task type: ${taskType}`);
  }

  async queueTask(task: Omit<TaskDefinition, 'id' | 'createdAt'>): Promise<string> {
    const taskId = ulid();
    const fullTask: TaskDefinition = {
      id: taskId,
      createdAt: new Date(),
      ...task,
    };

    // Create task queued event
    const event = createEvent({
      stream: STREAMS.SYSTEM,
      type: 'task.queued' as any,
      version: 1,
      user_id: task.userId,
      correlation_id: task.correlationId,
      data: fullTask,
    });

    await this.eventBus.publish(event);
    
    this.logger.info(`Queued task ${taskId} of type ${task.type}`, {
      taskId,
      taskType: task.type,
      priority: task.priority,
    });

    return taskId;
  }

  async scheduleTask(
    task: Omit<TaskDefinition, 'id' | 'createdAt' | 'scheduledFor'>,
    scheduledFor: Date
  ): Promise<string> {
    const taskId = ulid();
    const fullTask: TaskDefinition = {
      id: taskId,
      createdAt: new Date(),
      scheduledFor,
      ...task,
    };

    // Create task scheduled event
    const event = createEvent({
      stream: STREAMS.SYSTEM,
      type: 'task.scheduled' as any,
      version: 1,
      user_id: task.userId,
      correlation_id: task.correlationId,
      data: fullTask,
    });

    await this.eventBus.publish(event);
    
    this.logger.info(`Scheduled task ${taskId} for ${scheduledFor.toISOString()}`, {
      taskId,
      taskType: task.type,
      scheduledFor,
    });

    return taskId;
  }

  // File Processing Tasks
  async processFile(
    fileId: string,
    options: {
      userId: string;
      contextualCoreId: string;
      processingType: 'text_extraction' | 'embedding_generation' | 'metadata_analysis';
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'file.process',
      payload: {
        fileId,
        processingType: options.processingType,
        contextualCoreId: options.contextualCoreId,
      },
      priority: options.priority || 'normal',
      maxRetries: 3,
      retryConfig: this.config.defaultRetryConfig,
      userId: options.userId,
    });
  }

  async extractText(
    filePath: string,
    mimeType: string,
    options: {
      userId: string;
      fileId: string;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'file.extract_text',
      payload: {
        filePath,
        mimeType,
        fileId: options.fileId,
      },
      priority: options.priority || 'normal',
      maxRetries: 2,
      retryConfig: this.config.defaultRetryConfig,
      userId: options.userId,
    });
  }

  async generateEmbedding(
    text: string,
    options: {
      userId: string;
      contextualCoreId: string;
      modelId?: string;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'embedding.generate',
      payload: {
        text,
        contextualCoreId: options.contextualCoreId,
        modelId: options.modelId,
      },
      priority: options.priority || 'normal',
      maxRetries: 3,
      retryConfig: this.config.defaultRetryConfig,
      userId: options.userId,
    });
  }

  // AI Tasks
  async generateContent(
    request: {
      userId: string;
      contextualCoreId: string;
      contentType: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
      promptTemplate: string;
      aiProvider?: string;
      maxTokens?: number;
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'ai.generate_content',
      payload: request,
      priority: 'normal',
      maxRetries: 2,
      retryConfig: this.config.defaultRetryConfig,
      userId: request.userId,
    });
  }

  async runConsultation(
    query: string,
    options: {
      userId: string;
      contextualCoreId: string;
      sessionType: 'strategic_advice' | 'trend_analysis' | 'goal_planning';
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'ai.consultation',
      payload: {
        query,
        contextualCoreId: options.contextualCoreId,
        sessionType: options.sessionType,
      },
      priority: options.priority || 'normal',
      maxRetries: 2,
      retryConfig: this.config.defaultRetryConfig,
      userId: options.userId,
    });
  }

  // Market Monitoring Tasks
  async collectMarketData(
    sources: string[],
    keywords: string[],
    options: {
      userIds: string[];
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'market.collect_data',
      payload: {
        sources,
        keywords,
        userIds: options.userIds,
      },
      priority: options.priority || 'low',
      maxRetries: 3,
      retryConfig: this.config.defaultRetryConfig,
    });
  }

  async analyzeMarketTrends(
    dataPoints: any[],
    options: {
      userIds: string[];
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'market.analyze_trends',
      payload: {
        dataPoints,
        userIds: options.userIds,
      },
      priority: options.priority || 'normal',
      maxRetries: 2,
      retryConfig: this.config.defaultRetryConfig,
    });
  }

  // Notification Tasks
  async sendNotification(
    userId: string,
    message: {
      title: string;
      body: string;
      actionUrl?: string;
    },
    options: {
      channels: ('email' | 'push' | 'websocket')[];
      priority?: 'low' | 'normal' | 'high' | 'critical';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'notification.send',
      payload: {
        message,
        channels: options.channels,
      },
      priority: options.priority || 'normal',
      maxRetries: 5,
      retryConfig: this.config.defaultRetryConfig,
      userId,
    });
  }

  async generateBriefing(
    userId: string,
    options: {
      contextualCoreId: string;
      period: 'weekly' | 'monthly';
      periodStart: Date;
      periodEnd: Date;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string> {
    return this.queueTask({
      type: 'briefing.generate',
      payload: {
        contextualCoreId: options.contextualCoreId,
        period: options.period,
        periodStart: options.periodStart,
        periodEnd: options.periodEnd,
      },
      priority: options.priority || 'normal',
      maxRetries: 3,
      retryConfig: this.config.defaultRetryConfig,
      userId,
    });
  }

  // System Maintenance Tasks
  async cleanupExpiredData(): Promise<string> {
    return this.queueTask({
      type: 'system.cleanup_expired_data',
      payload: {},
      priority: 'low',
      maxRetries: 2,
      retryConfig: this.config.defaultRetryConfig,
    });
  }

  async optimizeEmbeddingCache(): Promise<string> {
    return this.queueTask({
      type: 'system.optimize_embedding_cache',
      payload: {},
      priority: 'low',
      maxRetries: 1,
      retryConfig: this.config.defaultRetryConfig,
    });
  }

  async updateModelBenchmarks(): Promise<string> {
    return this.queueTask({
      type: 'system.update_model_benchmarks',
      payload: {},
      priority: 'low',
      maxRetries: 2,
      retryConfig: this.config.defaultRetryConfig,
    });
  }

  // Internal Methods
  private async handleTaskEvent(event: CollectiveStrategistEvent): Promise<void> {
    if (event.type === 'task.queued' || event.type === 'task.retry') {
      const task = event.data as TaskDefinition;
      
      // Check if task is scheduled for future execution
      if (task.scheduledFor && task.scheduledFor > new Date()) {
        // Re-schedule for later
        setTimeout(() => {
          this.executeTask(task);
        }, task.scheduledFor.getTime() - Date.now());
        return;
      }
      
      await this.executeTask(task);
    }
  }

  private async executeTask(task: TaskDefinition): Promise<void> {
    // Check concurrency limits
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      // Re-queue task for later
      setTimeout(() => this.executeTask(task), 1000);
      return;
    }

    const handler = this.taskHandlers.get(task.type);
    if (!handler) {
      this.logger.error(`No handler registered for task type: ${task.type}`, {
        taskId: task.id,
        taskType: task.type,
      });
      return;
    }

    const execution = this.runTask(task, handler);
    this.runningTasks.set(task.id, execution);

    try {
      const result = await execution;
      this.taskStats.processed++;
      
      if (result.success) {
        this.taskStats.succeeded++;
        this.logger.info(`Task completed successfully`, {
          taskId: task.id,
          taskType: task.type,
          executionTimeMs: result.executionTimeMs,
        });
      } else {
        this.taskStats.failed++;
        this.logger.error(`Task failed`, {
          taskId: task.id,
          taskType: task.type,
          error: result.error,
          retryCount: result.retryCount,
        });
      }
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  private async runTask(task: TaskDefinition, handler: TaskHandler): Promise<TaskResult> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= task.maxRetries) {
      try {
        const result = await handler(task);
        
        return {
          taskId: task.id,
          success: true,
          result,
          executionTimeMs: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        retryCount++;
        
        if (retryCount > task.maxRetries) {
          return {
            taskId: task.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTimeMs: Date.now() - startTime,
            retryCount,
          };
        }

        // Calculate retry delay
        const delay = this.calculateRetryDelay(task.retryConfig, retryCount);
        this.logger.warn(`Task failed, retrying in ${delay}ms`, {
          taskId: task.id,
          taskType: task.type,
          retryCount,
          maxRetries: task.maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        this.taskStats.retried++;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Unexpected task execution state');
  }

  private calculateRetryDelay(config: RetryConfig, attempt: number): number {
    let delay: number;

    switch (config.backoffStrategy) {
      case 'exponential':
        delay = config.baseDelayMs * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = config.baseDelayMs * attempt;
        break;
      case 'fixed':
      default:
        delay = config.baseDelayMs;
        break;
    }

    delay = Math.min(delay, config.maxDelayMs);

    if (config.jitter) {
      delay += Math.random() * (delay * 0.1); // Add up to 10% jitter
    }

    return Math.floor(delay);
  }

  private performHealthCheck(): void {
    const health = {
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      registeredHandlers: this.taskHandlers.size,
      stats: this.taskStats,
      uptime: process.uptime(),
    };

    this.logger.debug('Task queue health check', health);

    // Publish health event
    const event = createEvent({
      stream: STREAMS.SYSTEM,
      type: 'system.service.health' as any,
      version: 1,
      data: {
        service_name: 'task-queue',
        status: this.runningTasks.size < this.config.maxConcurrentTasks ? 'healthy' : 'degraded',
        response_time_ms: 0, // Not applicable for task queue
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpu_usage_percent: 0, // Would need additional monitoring
        error_rate: this.taskStats.processed > 0 ? this.taskStats.failed / this.taskStats.processed : 0,
      },
    });

    this.eventBus.publish(event).catch(error => {
      this.logger.error('Failed to publish health event', error);
    });
  }

  getStats(): typeof this.taskStats & { runningTasks: number } {
    return {
      ...this.taskStats,
      runningTasks: this.runningTasks.size,
    };
  }
}