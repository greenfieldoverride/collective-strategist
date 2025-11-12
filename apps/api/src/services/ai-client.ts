import axios, { AxiosInstance } from 'axios';
// import { AIGenerationOptions } from '@collective-strategist/types';

interface AIGenerationOptions {
  [key: string]: any;
}

export interface AIRequest {
  user_id: string;
  venture_id?: string;
  context?: string;
  tone?: string;
  prompt?: string;
  options?: AIGenerationOptions;
}

export interface AIEmbeddingRequest {
  user_id: string;
  text: string;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  processing_time_ms: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AIServiceClient {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.AI_SERVICE_URL || 'http://localhost:3001') {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 second timeout for AI requests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      console.log(`AI Service Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('AI Service Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  /**
   * Generate text using AI service
   */
  async generateText(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.post<APIResponse<AIResponse>>('/ai/generate', request);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'AI generation failed');
      }

      return response.data.data!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Service Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate embeddings using AI service
   */
  async generateEmbedding(request: AIEmbeddingRequest): Promise<number[]> {
    try {
      const response = await this.client.post<APIResponse<number[]>>('/ai/embed', request);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Embedding generation failed');
      }

      return response.data.data!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Service Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    try {
      const response = await this.client.get<APIResponse<Record<string, boolean>>>('/ai/health');
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Health check failed');
      }

      return response.data.data!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Service Health Check Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate strategic business advice
   */
  async generateStrategicAdvice(params: {
    userId: string;
    query: string;
    businessContext: string;
    sessionType: string;
    marketData?: any[];
    tone?: string;
  }): Promise<AIResponse> {
    const prompt = this.buildStrategicAdvicePrompt(params);
    
    return this.generateText({
      user_id: params.userId,
      prompt,
      options: {
        temperature: 0.7,
        max_tokens: 1000,
        model: 'claude-3-haiku-20240307' // Default to cost-effective model
      }
    });
  }

  /**
   * Generate content drafts
   */
  async generateContent(params: {
    userId: string;
    contentType: string;
    businessContext: string;
    platform?: string;
    prompt?: string;
    tone: string;
    length: string;
  }): Promise<AIResponse> {
    const prompt = this.buildContentPrompt(params);
    
    // Adjust parameters based on content type and length
    const maxTokens = this.getMaxTokensForLength(params.length, params.contentType);
    const temperature = this.getTemperatureForTone(params.tone);
    
    return this.generateText({
      user_id: params.userId,
      prompt,
      options: {
        temperature,
        max_tokens: maxTokens,
        model: 'claude-3-haiku-20240307'
      }
    });
  }

  /**
   * Analyze market trends and opportunities
   */
  async analyzeMarketTrends(params: {
    userId: string;
    businessContext: string;
    analysisType: string;
    marketData: any[];
    timeRange: string;
  }): Promise<AIResponse> {
    const prompt = this.buildMarketAnalysisPrompt(params);
    
    return this.generateText({
      user_id: params.userId,
      prompt,
      options: {
        temperature: 0.3, // Lower temperature for analytical tasks
        max_tokens: 800,
        model: 'claude-3-haiku-20240307'
      }
    });
  }

  private buildStrategicAdvicePrompt(params: {
    query: string;
    businessContext: string;
    sessionType: string;
    marketData?: any[];
    tone?: string;
  }): string {
    const marketDataContext = params.marketData?.length 
      ? `\n\nRelevant Market Data:\n${JSON.stringify(params.marketData, null, 2)}`
      : '';

    return `You are a strategic business consultant providing ${params.sessionType} advice. 

Business Context:
${params.businessContext}

User Query: "${params.query}"
${marketDataContext}

Please provide strategic advice that:
1. Directly addresses the user's query
2. Leverages their specific business context
3. Provides actionable recommendations
4. Includes confidence assessment
5. Suggests concrete next steps

Format your response with clear sections for insights, recommendations, and next steps.`;
  }

  private buildContentPrompt(params: {
    contentType: string;
    businessContext: string;
    platform?: string;
    prompt?: string;
    tone: string;
    length: string;
  }): string {
    const lengthGuidance = {
      short: params.contentType === 'social_post' ? '1-2 sentences' : '100-200 words',
      medium: params.contentType === 'social_post' ? '2-3 sentences' : '200-500 words', 
      long: params.contentType === 'social_post' ? '3-4 sentences' : '500-1000 words'
    };

    const contentTypeInstructions = {
      social_post: `Create an engaging social media post${params.platform ? ` for ${params.platform}` : ''}`,
      blog_article: 'Write a comprehensive blog article with clear structure and headings',
      marketing_copy: 'Create persuasive marketing copy with strong calls-to-action',
      email: 'Write a professional email with clear subject line and purpose'
    };

    return `You are a professional content writer creating ${params.contentType} content.

Business Context:
${params.businessContext}

Content Requirements:
- Type: ${params.contentType}
- Tone: ${params.tone}
- Length: ${lengthGuidance[params.length as keyof typeof lengthGuidance]}
${params.platform ? `- Platform: ${params.platform}` : ''}

${params.prompt ? `Additional Instructions: ${params.prompt}` : ''}

${contentTypeInstructions[params.contentType as keyof typeof contentTypeInstructions]}

The content should:
1. Match the brand voice and business context
2. Be appropriate for the target audience
3. Include relevant calls-to-action where appropriate
4. Be optimized for the specified platform
5. Maintain the requested tone throughout

Please provide only the content itself, without additional commentary.`;
  }

  private buildMarketAnalysisPrompt(params: {
    businessContext: string;
    analysisType: string;
    marketData: any[];
    timeRange: string;
  }): string {
    return `You are a market analyst providing ${params.analysisType} analysis.

Business Context:
${params.businessContext}

Market Data (${params.timeRange}):
${JSON.stringify(params.marketData, null, 2)}

Please analyze the market data and provide:
1. Key insights relevant to this business
2. Emerging trends and opportunities
3. Potential threats or challenges
4. Actionable recommendations
5. Confidence scores for each insight

Focus on insights that are specific and actionable for this business context.`;
  }

  private getMaxTokensForLength(length: string, contentType: string): number {
    const baseTokens = {
      social_post: { short: 50, medium: 100, long: 150 },
      blog_article: { short: 300, medium: 600, long: 1000 },
      marketing_copy: { short: 200, medium: 400, long: 800 },
      email: { short: 150, medium: 300, long: 600 }
    };

    return baseTokens[contentType as keyof typeof baseTokens]?.[length as keyof typeof baseTokens.social_post] || 500;
  }

  private getTemperatureForTone(tone: string): number {
    const temperatures = {
      professional: 0.3,
      casual: 0.7,
      enthusiastic: 0.8,
      authoritative: 0.2
    };

    return temperatures[tone as keyof typeof temperatures] || 0.5;
  }
}

// Singleton instance
export const aiServiceClient = new AIServiceClient();