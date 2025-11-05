import Fastify from 'fastify';
import { AIProviderManager } from './manager';
import { AIGenerationOptions, APIResponse, AIResponse } from '../../shared/types/src/index';

const fastify = Fastify({ logger: true });
const aiManager = new AIProviderManager();

fastify.post<{
  Body: {
    user_id: string;
    prompt: string;
    options?: AIGenerationOptions;
  };
}>('/ai/generate', async (request, reply) => {
  try {
    const { user_id, prompt, options } = request.body;
    
    // In a real implementation, you would:
    // 1. Authenticate the request
    // 2. Fetch user and provider configs from database
    // 3. Check rate limits
    
    // For now, using mock data
    const mockUser = { 
      id: user_id, 
      email: 'test@example.com', 
      tier: 'individual_pro' as const,
      is_verified_sovereign_circle: false,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };
    
    const mockProviderConfigs = []; // This would come from database
    
    const provider = await aiManager.getProvider(mockUser, mockProviderConfigs);
    const response = await provider.generateText(prompt, options);
    
    const apiResponse: APIResponse<AIResponse> = {
      success: true,
      data: response,
    };
    
    reply.send(apiResponse);
  } catch (error) {
    const apiResponse: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    reply.status(500).send(apiResponse);
  }
});

fastify.post<{
  Body: {
    user_id: string;
    text: string;
  };
}>('/ai/embed', async (request, reply) => {
  try {
    const { user_id, text } = request.body;
    
    const mockUser = { 
      id: user_id, 
      email: 'test@example.com', 
      tier: 'individual_pro' as const,
      is_verified_sovereign_circle: false,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };
    
    const mockProviderConfigs = []; // This would come from database
    
    const provider = await aiManager.getProvider(mockUser, mockProviderConfigs);
    const embedding = await provider.generateEmbedding(text);
    
    const apiResponse: APIResponse<number[]> = {
      success: true,
      data: embedding,
    };
    
    reply.send(apiResponse);
  } catch (error) {
    const apiResponse: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    reply.status(500).send(apiResponse);
  }
});

fastify.get('/ai/health', async (request, reply) => {
  try {
    const health = await aiManager.getProviderHealth();
    
    const apiResponse: APIResponse<Record<string, boolean>> = {
      success: true,
      data: health,
    };
    
    reply.send(apiResponse);
  } catch (error) {
    const apiResponse: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    reply.status(500).send(apiResponse);
  }
});

async function start() {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('AI Integration Service running on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();