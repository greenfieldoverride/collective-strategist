import { AIProvider, AIProviderName, AIProviderConfig, User, AIProviderError } from '../../shared/types/dist/index';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { DefaultProvider } from './providers/default';
import { encrypt, decrypt } from './utils/encryption';

export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: DefaultProvider;

  constructor() {
    this.defaultProvider = new DefaultProvider();
  }

  async getProvider(user: User, providerConfigs: AIProviderConfig[]): Promise<AIProvider> {
    const userPreferredProvider = providerConfigs.find(config => config.is_active)?.provider_name || 'default';
    
    if (userPreferredProvider === 'default') {
      return this.defaultProvider;
    }

    const cacheKey = `${user.id}-${userPreferredProvider}`;
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    const config = providerConfigs.find(c => c.provider_name === userPreferredProvider && c.is_active);
    if (!config || !config.api_key_encrypted) {
      throw new AIProviderError(`No active configuration found for provider: ${userPreferredProvider}`, userPreferredProvider);
    }

    const apiKey = decrypt(config.api_key_encrypted);
    const provider = this.createProvider(userPreferredProvider, apiKey);
    
    const isHealthy = await provider.isHealthy();
    if (!isHealthy) {
      throw new AIProviderError(`Provider ${userPreferredProvider} is not healthy`, userPreferredProvider);
    }

    this.providers.set(cacheKey, provider);
    return provider;
  }

  private createProvider(providerName: AIProviderName, apiKey: string): AIProvider {
    switch (providerName) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'anthropic':
        return new AnthropicProvider(apiKey);
      case 'google':
        return new GoogleProvider(apiKey);
      case 'default':
        return this.defaultProvider;
      default:
        throw new AIProviderError(`Unknown provider: ${providerName}`, providerName);
    }
  }

  async validateProviderConfig(providerName: AIProviderName, apiKey: string): Promise<boolean> {
    try {
      const provider = this.createProvider(providerName, apiKey);
      return await provider.isHealthy();
    } catch {
      return false;
    }
  }

  async encryptApiKey(apiKey: string): Promise<string> {
    return encrypt(apiKey);
  }

  clearProviderCache(userId: string): void {
    for (const [key] of this.providers.entries()) {
      if (key.startsWith(userId)) {
        this.providers.delete(key);
      }
    }
  }

  async getProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    health.default = await this.defaultProvider.isHealthy();
    
    for (const [key, provider] of this.providers.entries()) {
      try {
        health[key] = await provider.isHealthy();
      } catch {
        health[key] = false;
      }
    }
    
    return health;
  }
}