import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { register } from 'prom-client';

// Route imports
import { authRoutes } from './routes/auth';
import { contextualCoreRoutes } from './routes/contextual-core';
import { aiConsultantRoutes } from './routes/ai-consultant';
import { contentDrafterRoutes } from './routes/content-drafter';
import { socialMediaRoutes } from './routes/social-media';
import { conversationRoutes } from './routes/conversations';
import { ventureRoutes } from './routes/ventures';
import { migrationRoutes } from './routes/migration';
import { financialAnalyticsRoutes } from './routes/financial-analytics';
// import { integrationsRoutes } from './routes/integrations-fastify';
// import impactDashboardRoutes from './routes/impact-dashboard-fastify';
import { assetRoutes } from './routes/assets';
import billingRoutes from './routes/billing';
import { db } from './database/connection';
import { cacheService } from './services/cache-service';
// import { initializeEventClient, closeEventClient } from './events/client';

const fastify = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  }
});

async function build() {
  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'The Collective Strategist API',
        description: 'AI Business Consultant SaaS platform for sovereign professionals and small collectives',
        version: '1.0.0'
      },
      externalDocs: {
        url: 'https://github.com/thegreenfieldoverride/collective-strategist',
        description: 'Find more info here'
      },
      host: 'localhost:8007',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Contextual Core', description: 'Brand and business context management' },
        { name: 'AI Consultant', description: 'Strategic business advice and analysis' },
        { name: 'Content Drafter', description: 'AI-powered content generation' },
        { name: 'Social Media', description: 'Social media platform integrations and analytics' },
        { name: 'Market Monitor', description: 'Market data and trend analysis' },
        { name: 'Migration', description: 'System migration tools and utilities' },
        { name: 'Integrations', description: 'Payment platform integrations and financial data sync' }
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    }
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    },
    transformSpecificationClone: true
  });

  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3333'],
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-change-in-production',
    sign: {
      expiresIn: '7d',
    },
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Authentication middleware
  fastify.decorate('authenticate', async function(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
                ai_integration: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Actual service health checks
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected', // TODO: Add actual DB health check
        redis: cacheService.isConnected() ? 'connected' : 'disconnected', 
        ai_integration: 'available'
      }
    };
  });

  // Metrics endpoint for Prometheus
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain; charset=utf-8');
    return register.metrics();
  });

  // Database connection is imported from ./database/connection
  
  // API Routes
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(contextualCoreRoutes, { prefix: '/api/v1' });
  await fastify.register(aiConsultantRoutes, { prefix: '/api/v1' });
  await fastify.register(contentDrafterRoutes, { prefix: '/api/v1' });
  await fastify.register(socialMediaRoutes, { prefix: '/api/v1' });
  await fastify.register(conversationRoutes, { prefix: '/api/v1' });
  await fastify.register(ventureRoutes, { prefix: '/api/v1' });
  await fastify.register(migrationRoutes, { prefix: '/api/v1' });
  await fastify.register(financialAnalyticsRoutes, { prefix: '/api/v1' });
  // await fastify.register(integrationsRoutes, { prefix: '/api/v1/integrations', db });
  // await fastify.register(impactDashboardRoutes, { prefix: '/api/v1' });
  await fastify.register(assetRoutes, { prefix: '/api/v1' });
  await fastify.register(billingRoutes);

  // API Info endpoint
  fastify.get('/api', {
    schema: {
      description: 'API information and available endpoints',
      tags: ['API Info'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            version: { type: 'string' },
            endpoints: {
              type: 'object',
              properties: {
                docs: { type: 'string' },
                health: { type: 'string' },
                metrics: { type: 'string' }
              }
            },
            features: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      name: 'The Collective Strategist API',
      description: 'AI Business Consultant SaaS platform for sovereign professionals and small collectives',
      version: '1.0.0',
      endpoints: {
        docs: '/docs',
        health: '/health',
        metrics: '/metrics'
      },
      features: [
        'Contextual Core - Private brand and business context storage',
        'AI Business Consultant - Interactive strategic advice engine',
        'AI Content Drafter - Generate content in your unique voice',
        'Social Media Integration - Connect and publish to platforms',
        'Market Monitor - Real-time trend and competitor analysis',
        'Payment Integrations - Connect Stripe, PayPal, Venmo, Wise, Square for automated financial tracking',
        'BYOK Support - Bring Your Own Key for AI providers'
      ]
    };
  });

  return fastify;
}

async function start() {
  try {
    // Initialize cache service
    await cacheService.connect();
    console.log('Cache service initialized');
    
    // Initialize event client
    // await initializeEventClient();
    
    const app = await build();
    const port = parseInt(process.env.PORT || '8007');
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    console.log(`Core API Service running on port ${port}`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully');
      await app.close();
      await cacheService.disconnect();
      // await closeEventClient();
      process.exit(0);
    });
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { build };