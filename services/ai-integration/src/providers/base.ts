import { AIProvider, AIProviderName, AIGenerationOptions, AIResponse } from '../../../shared/types/src/index';

export abstract class BaseAIProvider implements AIProvider {
  abstract name: AIProviderName;
  protected apiKey?: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  abstract generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse>;
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract isHealthy(): Promise<boolean>;

  protected createResponse(
    content: string,
    modelUsed: string,
    tokensUsed: number,
    generationTimeMs: number,
    metadata?: Record<string, any>
  ): AIResponse {
    return {
      content,
      provider: this.name,
      model_used: modelUsed,
      tokens_used: tokensUsed,
      generation_time_ms: generationTimeMs,
      metadata,
    };
  }

  protected measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = Date.now();
    return fn().then(result => ({
      result,
      timeMs: Date.now() - start,
    }));
  }
}