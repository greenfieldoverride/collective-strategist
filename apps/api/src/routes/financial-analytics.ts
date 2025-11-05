import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { FinancialAnalyticsService } from '../services/financial-analytics';
import { db } from '../database/connection';
import { StrategistResponse } from '../types/collective-strategist';

export async function financialAnalyticsRoutes(fastify: FastifyInstance) {
  const financialAnalytics = new FinancialAnalyticsService(db);

  // Get complete financial dashboard for a venture
  fastify.get('/ventures/:ventureId/financial-dashboard', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get complete financial dashboard for a venture',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
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
                currentMetrics: {
                  type: 'object',
                  properties: {
                    monthlyIncome: { type: 'number' },
                    monthlyExpenses: { type: 'number' },
                    monthlyNet: { type: 'number' },
                    incomeTransactions: { type: 'integer' },
                    uniqueClients: { type: 'integer' },
                    avgTransactionSize: { type: 'number' },
                    financialHealthScore: { type: 'integer' }
                  }
                },
                revenueStreams: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      streamName: { type: 'string' },
                      platform: { type: 'string' },
                      transactionCount: { type: 'integer' },
                      totalRevenue: { type: 'number' },
                      netRevenue: { type: 'number' },
                      totalFees: { type: 'number' },
                      avgTransactionSize: { type: 'number' },
                      lastTransactionDate: { type: 'string', format: 'date' },
                      profitabilityScore: { type: 'integer' }
                    }
                  }
                },
                solvencyInsights: {
                  type: 'object',
                  properties: {
                    monthsOfRunway: { type: 'number' },
                    cashFlowTrend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
                    platformDependencyRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
                    seasonalityPattern: { type: 'string' },
                    recommendations: { type: 'array', items: { type: 'string' } }
                  }
                },
                goalProgress: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      goalName: { type: 'string' },
                      goalType: { type: 'string' },
                      targetAmount: { type: 'number' },
                      currentAmount: { type: 'number' },
                      progressPercentage: { type: 'number' },
                      daysRemaining: { type: 'integer' },
                      onTrack: { type: 'boolean' }
                    }
                  }
                },
                monthlyTrends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      year: { type: 'integer' },
                      month: { type: 'integer' },
                      income: { type: 'number' },
                      expenses: { type: 'number' },
                      net: { type: 'number' },
                      transactionCount: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      
      // TODO: Add authorization check to ensure user has access to this venture
      
      const dashboard = await financialAnalytics.getVentureFinancialDashboard(ventureId);
      
      const response: StrategistResponse<typeof dashboard> = {
        success: true,
        data: dashboard,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINANCIAL_DASHBOARD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get financial dashboard'
        }
      });
    }
  });

  // Get quick financial stats for dashboard cards
  fastify.get('/ventures/:ventureId/financial-stats', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get quick financial stats for dashboard cards',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
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
                monthlyIncome: { type: 'number' },
                monthlyNet: { type: 'number' },
                activeGoals: { type: 'integer' },
                totalGoals: { type: 'integer' },
                activeStreams: { type: 'integer' },
                healthScore: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      
      const stats = await financialAnalytics.getQuickStats(ventureId);
      
      const response: StrategistResponse<typeof stats> = {
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINANCIAL_STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get financial stats'
        }
      });
    }
  });

  // Get current financial metrics only
  fastify.get('/ventures/:ventureId/financial-metrics', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current financial metrics for a venture',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      
      const metrics = await financialAnalytics.getCurrentMetrics(ventureId);
      
      const response: StrategistResponse<typeof metrics> = {
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINANCIAL_METRICS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get financial metrics'
        }
      });
    }
  });

  // Get revenue stream analysis
  fastify.get('/ventures/:ventureId/revenue-streams', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get revenue stream analysis for a venture',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      
      const revenueStreams = await financialAnalytics.getRevenueStreamStats(ventureId);
      
      const response: StrategistResponse<typeof revenueStreams> = {
        success: true,
        data: revenueStreams,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REVENUE_STREAMS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get revenue streams'
        }
      });
    }
  });

  // Get solvency insights
  fastify.get('/ventures/:ventureId/solvency-insights', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get solvency insights and recommendations for a venture',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      
      const insights = await financialAnalytics.getSolvencyInsights(ventureId);
      
      const response: StrategistResponse<typeof insights> = {
        success: true,
        data: insights,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SOLVENCY_INSIGHTS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get solvency insights'
        }
      });
    }
  });

  // Get financial goal progress
  fastify.get('/ventures/:ventureId/financial-goals', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get financial goal progress for a venture',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      
      const goalProgress = await financialAnalytics.getGoalProgress(ventureId);
      
      const response: StrategistResponse<typeof goalProgress> = {
        success: true,
        data: goalProgress,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINANCIAL_GOALS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get financial goals'
        }
      });
    }
  });

  // Get monthly trend data
  fastify.get('/ventures/:ventureId/financial-trends', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get monthly financial trends for a venture',
      tags: ['Financial Analytics'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['ventureId'],
        properties: {
          ventureId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          months: { type: 'integer', minimum: 1, maximum: 24, default: 6 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { ventureId: string },
    Querystring: { months?: number }
  }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { ventureId } = request.params;
      const { months = 6 } = request.query;
      
      const trends = await financialAnalytics.getMonthlyTrends(ventureId, months);
      
      const response: StrategistResponse<typeof trends> = {
        success: true,
        data: trends,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
      
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINANCIAL_TRENDS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get financial trends'
        }
      });
    }
  });
}