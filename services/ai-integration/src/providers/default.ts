import { BaseAIProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { AIGenerationOptions, AIResponse, AIProviderError } from '../../../shared/types/src/index';

export class DefaultProvider extends BaseAIProvider {
  name = 'default' as const;
  private anthropicProvider: AnthropicProvider;

  constructor() {
    super();
    const defaultApiKey = process.env.DEFAULT_ANTHROPIC_API_KEY;
    if (!defaultApiKey) {
      throw new AIProviderError('Default Anthropic API key not configured', 'default');
    }
    this.anthropicProvider = new AnthropicProvider(defaultApiKey);
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse> {
    try {
      const response = await this.anthropicProvider.generateText(prompt, {
        ...options,
        model: options?.model || 'claude-3-haiku-20240307', // Use faster, cheaper model for default
      });
      
      return {
        ...response,
        provider: 'default',
        metadata: {
          ...response.metadata,
          actual_provider: 'anthropic',
          rate_limited: true,
        }
      };
    } catch (error) {
      throw new AIProviderError(`Default provider failed: ${error}`, 'default');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new AIProviderError('Default provider does not support embeddings - use BYOK with OpenAI or Google', 'default');
  }

  async isHealthy(): Promise<boolean> {
    return this.anthropicProvider.isHealthy();
  }
}