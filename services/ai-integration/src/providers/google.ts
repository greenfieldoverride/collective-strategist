import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from './base';
import { AIGenerationOptions, AIResponse, AIProviderError } from '../../../shared/types/src/index';

export class GoogleProvider extends BaseAIProvider {
  name = 'google' as const;
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    super(apiKey);
    if (!apiKey) {
      throw new AIProviderError('Google API key is required', 'google');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse> {
    try {
      const model = this.client.getGenerativeModel({ 
        model: options?.model || 'gemini-pro',
        generationConfig: {
          maxOutputTokens: options?.max_tokens || 4000,
          temperature: options?.temperature || 0.7,
        }
      });

      const fullPrompt = options?.system_prompt 
        ? `${options.system_prompt}\n\nUser: ${prompt}`
        : prompt;

      const { result: response, timeMs } = await this.measureTime(async () => {
        return model.generateContent(fullPrompt);
      });

      const text = response.response.text();
      const usage = response.response.usageMetadata;

      return this.createResponse(
        text,
        options?.model || 'gemini-pro',
        (usage?.totalTokenCount || 0),
        timeMs,
        {
          prompt_tokens: usage?.promptTokenCount,
          completion_tokens: usage?.candidatesTokenCount,
          finish_reason: response.response.candidates?.[0]?.finishReason,
        }
      );
    } catch (error) {
      throw new AIProviderError(`Google generation failed: ${error}`, 'google', { prompt, options });
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.client.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding.values || [];
    } catch (error) {
      throw new AIProviderError(`Google embedding failed: ${error}`, 'google', { text });
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent('Health check');
      return true;
    } catch {
      return false;
    }
  }
}