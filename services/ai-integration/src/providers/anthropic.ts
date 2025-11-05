import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base';
import { AIGenerationOptions, AIResponse, AIProviderError } from '../../../shared/types/src/index';

export class AnthropicProvider extends BaseAIProvider {
  name = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey?: string) {
    super(apiKey);
    if (!apiKey) {
      throw new AIProviderError('Anthropic API key is required', 'anthropic');
    }
    this.client = new Anthropic({ apiKey });
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse> {
    try {
      const { result: response, timeMs } = await this.measureTime(async () => {
        return this.client.messages.create({
          model: options?.model || 'claude-3-sonnet-20240229',
          max_tokens: options?.max_tokens || 4000,
          temperature: options?.temperature || 0.7,
          system: options?.system_prompt,
          messages: [{ role: 'user', content: prompt }],
        });
      });

      return this.createResponse(
        response.content[0].type === 'text' ? response.content[0].text : '',
        response.model,
        response.usage.input_tokens + response.usage.output_tokens,
        timeMs,
        {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          stop_reason: response.stop_reason,
        }
      );
    } catch (error) {
      throw new AIProviderError(`Anthropic generation failed: ${error}`, 'anthropic', { prompt, options });
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new AIProviderError('Anthropic does not provide embedding endpoints', 'anthropic');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Health check' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}