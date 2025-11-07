import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { 
  AIConsultantRequest, 
  AIConsultantResponse,
  ConsultantSession,
  MarketAnalysisRequest,
  MarketAnalysisResponse,
  StrategistResponse 
} from '../types/collective-strategist';
import { aiServiceClient } from '../services/ai-client';
import { ConversationService } from '../services/conversation-service';
import { db } from '../database/connection';
import { cacheService, CacheKeys } from '../services/cache-service';

// Validation schemas
const consultantRequestSchema = z.object({
  ventureId: z.string().uuid(),
  sessionType: z.enum(['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']),
  query: z.string().min(10).max(2000),
  includeMarketData: z.boolean().optional().default(true),
  aiProvider: z.string().optional(),
  conversationId: z.string().uuid().optional(), // For existing conversations
  saveToHistory: z.boolean().optional().default(true), // Whether to save this interaction
  // Legacy support for contextualCoreId (will be deprecated)
  contextualCoreId: z.string().uuid().optional()
});

const marketAnalysisSchema = z.object({
  contextualCoreId: z.string().uuid(),
  analysisType: z.enum(['trends', 'competitors', 'opportunities', 'keywords']),
  timeRange: z.enum(['day', 'week', 'month', 'quarter']).optional().default('week'),
  platforms: z.array(z.enum(['twitter', 'linkedin', 'instagram', 'tiktok', 'google_trends', 'reddit'])).optional()
});

export async function aiConsultantRoutes(fastify: FastifyInstance) {
  const conversationService = new ConversationService(db);
  // AI Business Consultant - Interactive strategic advice
  fastify.post('/ai-consultant/ask', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['AI Consultant'],
        body: {
          type: 'object',
          required: ['sessionType', 'query'],
          properties: {
            ventureId: { type: 'string', format: 'uuid' },
            sessionType: { 
              type: 'string', 
              enum: ['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis'] 
            },
            query: { type: 'string', minLength: 10, maxLength: 2000 },
            includeMarketData: { type: 'boolean', default: true },
            aiProvider: { type: 'string' },
            conversationId: { type: 'string', format: 'uuid' },
            saveToHistory: { type: 'boolean', default: true },
            contextualCoreId: { type: 'string', format: 'uuid', description: 'Legacy - will be deprecated' }
          }
        },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                response: { type: 'string' },
                confidenceScore: { type: 'number' },
                marketDataUsed: { type: 'array' },
                recommendations: { type: 'array', items: { type: 'string' } },
                nextSteps: { type: 'array', items: { type: 'string' } },
                processingTimeMs: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: AIConsultantRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = consultantRequestSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const { ventureId, contextualCoreId, sessionType, query, includeMarketData, aiProvider, conversationId, saveToHistory } = validation.data;
      const userId = (request as any).user?.id;
      
      // Determine which ID to use (prefer ventureId, fallback to contextualCoreId for legacy support)
      const effectiveVentureId = ventureId || contextualCoreId;
      
      if (!effectiveVentureId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either ventureId or contextualCoreId must be provided'
          }
        });
      }

      // TODO: Verify user owns the contextual core
      // TODO: Fetch contextual core data for context
      // TODO: Fetch relevant market data if requested
      // TODO: Store consultation session in database

      // Fetch business context (placeholder for now)
      const businessContext = `Business type: Consulting
Industry: Professional services
Target audience: Small business owners and entrepreneurs
Value proposition: Strategic business consulting for growth and optimization`;

      // Fetch market data if requested (placeholder for now)
      const marketData = includeMarketData ? [
        { source: 'trends', data: 'Growing interest in business automation' },
        { source: 'keywords', data: 'Strategic planning searches up 23%' }
      ] : [];

      // Generate strategic advice using Anthropic API directly
      const generateRealAIResponse = async (sessionType: string, query: string, businessContext: string) => {
        // Create cache key based on session type, query, and business context
        const queryHash = Buffer.from(query + sessionType + businessContext).toString('base64').slice(0, 16)
        const aiCacheKey = CacheKeys.AI_RESPONSES + ':' + sessionType + ':' + queryHash
        
        // Check cache first
        const cachedResponse = await cacheService.get<string>(aiCacheKey)
        if (cachedResponse) {
          console.log(`🚀 Cache HIT for AI response: ${sessionType} query`)
          return cachedResponse
        }
        
        console.log(`💾 Cache MISS for AI response: ${sessionType} query - generating fresh response`)
        console.log('🤖 Attempting AI generation for:', query);
        console.log('📝 Session type:', sessionType);
        
        try {
          const prompt = buildBusinessConsultantPrompt(sessionType, query, businessContext);
          console.log('📋 Generated prompt:', prompt.substring(0, 200) + '...');
          
          const apiKey = process.env.DEFAULT_ANTHROPIC_API_KEY;
          if (!apiKey) {
            throw new Error('No Anthropic API key found');
          }
          
          console.log('🔑 API key available:', apiKey.substring(0, 10) + '...');
          
          // Direct Anthropic API call
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 500,
              temperature: 0.7,
              messages: [{
                role: 'user',
                content: prompt
              }]
            })
          });

          console.log('🌐 Anthropic response status:', anthropicResponse.status);

          if (!anthropicResponse.ok) {
            const errorText = await anthropicResponse.text();
            console.error('❌ Anthropic API error:', errorText);
            throw new Error(`Anthropic API error: ${anthropicResponse.status} - ${errorText}`);
          }

          const data = await anthropicResponse.json();
          const responseText = data.content[0].text;
          console.log('✅ AI response received, length:', responseText.length);
          
          // Cache AI response for 1 hour (similar queries can reuse)
          await cacheService.set(aiCacheKey, responseText, cacheService.constructor.prototype.constructor.TTL.HOUR)
          console.log(`💾 Cached AI response: ${sessionType} query`)
          
          return responseText;
        } catch (error) {
          console.error('💥 AI generation failed:', error);
          // Fall back to simple error message
          return `I'm having trouble connecting to my AI service right now. Here's some quick advice for "${query}": This looks like a great question that would benefit from personalized guidance. Please try asking again in a moment, or feel free to rephrase your question.`;
        }
      };

      const buildBusinessConsultantPrompt = (sessionType: string, query: string, businessContext: string) => {
        const sessionContext = {
          strategic_advice: "You are a friendly business advisor helping small business owners.",
          trend_analysis: "You are a market trends expert helping business owners spot opportunities.",
          goal_planning: "You are a business planning coach helping entrepreneurs achieve their goals.",
          market_analysis: "You are a competitive strategy expert helping businesses understand their market."
        };

        return `${sessionContext[sessionType as keyof typeof sessionContext]}

Business Context: ${businessContext}

Question: ${query}

Give direct, practical advice that answers their question. Use beginner-friendly language and focus on actionable steps. Format with markdown (**bold** for headings, bullets for lists). Keep it under 250 words.

Start your response directly with advice - no preamble like "Perfect!" or "You asked about..." Just answer their question.`;
      };

      const getTemplateResponse = (sessionType: string, query: string) => {
        // Always try AI first, only use templates as absolute fallback
        
        // Default session-type responses for general questions
        const sessionResponses = {
          strategic_advice: `Great question about "${query}"! Here's what I think could help your business grow:\n\n` +
                           `**What you should focus on first:**\n` +
                           `• Find what makes you different from competitors - this is your biggest advantage\n` +
                           `• Put your time and money into the things that bring in customers\n` +
                           `• Think about what could go wrong and have backup plans\n\n` +
                           `**For your type of business, here's what usually works:**\n` +
                           `• Build something that customers can't easily get elsewhere\n` +
                           `• Track what's working and what isn't (like sales, website visits, customer feedback)\n` +
                           `• Balance quick wins with building for the long term\n\n` +
                           `I'm seeing good opportunities in your area right now. I'd suggest making some changes in the next month or two to take advantage of what's happening in the market.`,

          trend_analysis: `You asked about "${query}" - here's what I'm seeing in your industry:\n\n` +
                         `**What's happening right now:**\n` +
                         `• More people are buying online than ever before\n` +
                         `• Customers want personalized products and experiences\n` +
                         `• Small businesses are finding new ways to compete with big companies\n\n` +
                         `**Opportunities for you:**\n` +
                         `• There's growing demand for what you're offering\n` +
                         `• New tools are making it easier to reach customers\n` +
                         `• People are willing to pay more for quality and convenience\n\n` +
                         `**What this means for your business:**\n` +
                         `Focus on what makes you special, use social media and online tools to find customers, and don't be afraid to charge what you're worth.`,

          goal_planning: `You want to know about "${query}" - let's break this down into simple steps:\n\n` +
                        `**Your next 30 days:**\n` +
                        `• Pick 1-2 main things to focus on (don't try to do everything)\n` +
                        `• Set up a simple way to track your progress\n` +
                        `• Talk to 5-10 potential customers to understand what they want\n\n` +
                        `**Your next 3 months:**\n` +
                        `• Launch one new thing or improve something you already offer\n` +
                        `• Build a list of people interested in your business\n` +
                        `• Figure out what's working and do more of it\n\n` +
                        `**How to measure success:**\n` +
                        `Keep it simple - track things like new customers, sales, and how much time you're spending on different activities.`,

          market_analysis: `You asked "${query}" - here's what I know about your competition:\n\n` +
                          `**What your competitors are doing well:**\n` +
                          `• They're active on social media and showing their work\n` +
                          `• They offer different price points for different customers\n` +
                          `• They're building relationships, not just making sales\n\n` +
                          `**Where you can do better:**\n` +
                          `• Most competitors aren't great at customer service - this is your chance\n` +
                          `• They're not explaining their process well - you can be more transparent\n` +
                          `• Many are competing only on price - you can compete on value\n\n` +
                          `**Your advantage:**\n` +
                          `Focus on being the business that customers trust and enjoy working with. Good service and clear communication will set you apart.`
        };
        
        return sessionResponses[sessionType as keyof typeof sessionResponses] || sessionResponses.strategic_advice;
      };

      // Always use AI first
      const aiResponseText = await generateRealAIResponse(sessionType, query, businessContext);

      const aiResult = {
        text: aiResponseText,
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 },
        cost: 0.01,
        processing_time_ms: 1500
      };

      // Parse recommendations and next steps from AI response
      const responseLines = aiResult.text.split('\n');
      const recommendations: string[] = [];
      const nextSteps: string[] = [];
      
      let currentSection = '';
      for (const line of responseLines) {
        if (line.toLowerCase().includes('recommendation')) {
          currentSection = 'recommendations';
        } else if (line.toLowerCase().includes('next step')) {
          currentSection = 'nextSteps';
        } else if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
          const cleanLine = line.replace(/^[\s\-\d\.]+/, '').trim();
          if (cleanLine) {
            if (currentSection === 'recommendations') {
              recommendations.push(cleanLine);
            } else if (currentSection === 'nextSteps') {
              nextSteps.push(cleanLine);
            }
          }
        }
      }

      const aiResponse: AIConsultantResponse = {
        response: aiResult.text,
        confidenceScore: 0.85, // TODO: Extract from AI response or calculate based on factors
        marketDataUsed: includeMarketData ? marketData as any : [],
        recommendations: recommendations.length > 0 ? recommendations : [
          'Based on the analysis, consider implementing the suggested strategies',
          'Monitor key performance indicators regularly',
          'Adjust tactics based on market feedback'
        ],
        nextSteps: nextSteps.length > 0 ? nextSteps : [
          'Review the strategic recommendations in detail',
          'Prioritize actions based on available resources',
          'Set up metrics to track progress'
        ],
        processingTimeMs: aiResult.processing_time_ms
      };

      // Save to conversation history if requested
      let currentConversationId = conversationId;
      if (saveToHistory) {
        try {
          // Create conversation if none provided
          if (!currentConversationId) {
            const conversation = await conversationService.createConversation(userId, {
              contextualCoreId: effectiveVentureId, // Using venture ID in place of contextual core
              title: query.length > 50 ? query.substring(0, 47) + '...' : query,
              sessionType,
              tags: []
            });
            currentConversationId = conversation.id;
          }

          // Add user message
          await conversationService.addMessage(userId, {
            conversationId: currentConversationId,
            content: query,
            messageType: 'user'
          });

          // Add AI response message
          await conversationService.addMessage(userId, {
            conversationId: currentConversationId,
            content: aiResponseText,
            messageType: 'ai'
          });
        } catch (historyError) {
          // Log error but don't fail the request
          console.warn('Failed to save conversation history:', historyError);
        }
      }

      // Legacy session object for backwards compatibility
      const session: ConsultantSession = {
        id: currentConversationId || 'uuid-placeholder',
        userId,
        contextualCoreId: effectiveVentureId,
        sessionType,
        query,
        response: aiResponse.response,
        aiProviderUsed: aiProvider || 'default',
        marketDataReferenced: [],
        confidenceScore: aiResponse.confidenceScore,
        sessionMetadata: {
          includeMarketData,
          processingTimeMs: aiResponse.processingTimeMs
        },
        createdAt: new Date()
      };

      const response: StrategistResponse<AIConsultantResponse & { conversationId?: string }> = {
        success: true,
        data: {
          ...aiResponse,
          conversationId: currentConversationId
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          aiProvider: aiProvider || 'default'
        }
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONSULTANT_ERROR',
          message: 'Failed to process consultation request'
        }
      });
    }
  });

  // Market Analysis - Analyze trends and opportunities
  fastify.post('/ai-consultant/market-analysis', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['AI Consultant'],
      body: {
        type: 'object',
        required: ['contextualCoreId', 'analysisType'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          analysisType: { 
            type: 'string', 
            enum: ['trends', 'competitors', 'opportunities', 'keywords'] 
          },
          timeRange: { 
            type: 'string', 
            enum: ['day', 'week', 'month', 'quarter'],
            default: 'week'
          },
          platforms: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: ['twitter', 'linkedin', 'instagram', 'tiktok', 'google_trends', 'reddit']
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: MarketAnalysisRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const validation = marketAnalysisSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const { contextualCoreId, analysisType, timeRange, platforms } = validation.data;

      // TODO: Fetch relevant market data from database
      // TODO: Analyze trends based on contextual core

      // Fetch business context (placeholder for now)
      const businessContext = `Business type: Consulting
Industry: Professional services
Target audience: Small business owners and entrepreneurs
Value proposition: Strategic business consulting for growth and optimization`;

      // Fetch market data based on platforms and analysis type (placeholder for now)
      const marketData = [
        {
          platform: platforms?.[0] || 'twitter',
          analysisType,
          timeRange,
          data: [
            { keyword: 'business consulting', mentions: 1247, sentiment: 0.7, growth: 0.23 },
            { keyword: 'strategic planning', mentions: 892, sentiment: 0.8, growth: 0.15 },
            { keyword: 'small business growth', mentions: 634, sentiment: 0.6, growth: 0.34 }
          ]
        }
      ];

      // Generate market analysis using AI service (mock for now)
      const aiResult = {
        text: `Here's what I found about ${analysisType.replace('_', ' ')} over the past ${timeRange}:\n\n` +
              `**What's happening in your market:**\n` +
              `• More people are starting businesses and need help (up 23% this quarter)\n` +
              `• Small businesses are looking for affordable guidance and tools\n` +
              `• There's a growing market for what you're offering\n\n` +
              `**Good news for your business:**\n` +
              `• People want simple, practical business advice\n` +
              `• There's demand for tools that don't require a business degree to use\n` +
              `• Customers are willing to pay for help that actually works\n\n` +
              `**What you should do:**\n` +
              `• Focus on helping the customers who need you most\n` +
              `• Keep your approach simple and easy to understand\n` +
              `• Watch what successful competitors do, but do it better\n\n` +
              `I'm pretty confident about this advice (about 85% sure) based on what I'm seeing in the market right now.`,
        provider: 'mock',
        model: 'claude-3-haiku-20240307',
        usage: { prompt_tokens: 200, completion_tokens: 250, total_tokens: 450 },
        cost: 0.01,
        processing_time_ms: 1500
      };

      // Parse AI response to extract structured insights
      const aiLines = aiResult.text.split('\n').filter(line => line.trim());
      const insights = [];
      const trends = [];
      const recommendations = [];

      let currentSection = '';
      for (const line of aiLines) {
        if (line.toLowerCase().includes('insight') || line.toLowerCase().includes('opportunity')) {
          currentSection = 'insights';
        } else if (line.toLowerCase().includes('trend')) {
          currentSection = 'trends';
        } else if (line.toLowerCase().includes('recommendation')) {
          currentSection = 'recommendations';
        } else if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
          const cleanLine = line.replace(/^[\s\-\d\.]+/, '').trim();
          if (cleanLine) {
            if (currentSection === 'recommendations') {
              recommendations.push(cleanLine);
            }
          }
        }
      }

      // Create structured insights from AI analysis
      insights.push({
        type: 'opportunity',
        title: 'AI-Identified Market Opportunity',
        confidence: 0.85,
        impact: 'high',
        timeframe: 'short_term',
        actionable: true,
        dataSource: platforms?.[0] || 'multiple'
      });

      // Create trend data from market data
      marketData[0].data.forEach((item, index) => {
        trends.push({
          keyword: item.keyword,
          platform: marketData[0].platform,
          engagementRate: item.sentiment * 0.05, // Convert sentiment to engagement rate
          growthRate: item.growth,
          relevanceScore: 0.8 + (index * 0.05),
          peakDate: new Date()
        });
      });

      const analysisResponse: MarketAnalysisResponse = {
        insights,
        trends,
        recommendations: recommendations.length > 0 ? recommendations : [
          'Based on market analysis, focus on high-growth keywords',
          'Monitor competitor activity in your space',
          'Leverage positive sentiment trends in messaging'
        ],
        dataPoints: marketData.reduce((total, platform) => total + platform.data.length, 0),
        lastUpdated: new Date()
      };

      const response: StrategistResponse<MarketAnalysisResponse> = {
        success: true,
        data: analysisResponse,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MARKET_ANALYSIS_ERROR',
          message: 'Failed to generate market analysis'
        }
      });
    }
  });

  // Get consultation history for a contextual core
  fastify.get('/ai-consultant/sessions/:contextualCoreId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['AI Consultant'],
      params: {
        type: 'object',
        required: ['contextualCoreId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          sessionType: { 
            type: 'string',
            enum: ['strategic_advice', 'trend_analysis', 'goal_planning', 'market_analysis']
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string };
    Querystring: { limit?: number; offset?: number; sessionType?: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId } = request.params;
      const { limit = 20, offset = 0, sessionType } = request.query;
      
      // TODO: Fetch consultation sessions from database
      const sessions: ConsultantSession[] = []; // Replace with actual DB query
      
      const response: StrategistResponse<{
        sessions: ConsultantSession[];
        total: number;
        hasMore: boolean;
      }> = {
        success: true,
        data: {
          sessions,
          total: sessions.length,
          hasMore: sessions.length === limit
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SESSIONS_FETCH_ERROR',
          message: 'Failed to fetch consultation sessions'
        }
      });
    }
  });

  // Get specific consultation session
  fastify.get('/ai-consultant/sessions/:contextualCoreId/:sessionId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      tags: ['AI Consultant'],
      params: {
        type: 'object',
        required: ['contextualCoreId', 'sessionId'],
        properties: {
          contextualCoreId: { type: 'string', format: 'uuid' },
          sessionId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { contextualCoreId: string; sessionId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { contextualCoreId, sessionId } = request.params;
      
      // TODO: Fetch specific session from database
      const session: ConsultantSession | null = null; // Replace with actual DB query
      
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Consultation session not found'
          }
        });
      }

      const response: StrategistResponse<ConsultantSession> = {
        success: true,
        data: session,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return reply.send(response);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SESSION_FETCH_ERROR',
          message: 'Failed to fetch consultation session'
        }
      });
    }
  });
}