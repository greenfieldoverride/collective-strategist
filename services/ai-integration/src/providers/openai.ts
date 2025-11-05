import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import { AIGenerationOptions, AIResponse, AIProviderError } from '../../../shared/types/src/index';

export class OpenAIProvider extends BaseAIProvider {
  name = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey?: string) {
    super(apiKey);
    if (!apiKey) {
      throw new AIProviderError('OpenAI API key is required', 'openai');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'user', content: prompt }
      ];

      if (options?.system_prompt) {
        messages.unshift({ role: 'system', content: options.system_prompt });
      }

      const { result: response, timeMs } = await this.measureTime(async () => {
        return this.client.chat.completions.create({
          model: options?.model || 'gpt-4-turbo-preview',
          messages,
          max_tokens: options?.max_tokens || 4000,
          temperature: options?.temperature || 0.7,
        });
      });

      const choice = response.choices[0];
      return this.createResponse(
        choice.message.content || '',
        response.model,
        response.usage?.total_tokens || 0,
        timeMs,
        {
          prompt_tokens: response.usage?.prompt_tokens,
          completion_tokens: response.usage?.completion_tokens,
          finish_reason: choice.finish_reason,
        }
      );
    } catch (error) {
      throw new AIProviderError(`OpenAI generation failed: ${error}`, 'openai', { prompt, options });
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      throw new AIProviderError(`OpenAI embedding failed: ${error}`, 'openai', { text });
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Health check' }],
        max_tokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}