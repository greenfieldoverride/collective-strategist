import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Database } from '../database/connection'
import { IntegrationService, IntegrationConfig } from '../services/integration-service'

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string
    email: string
  }
}

interface VentureParams {
  ventureId: string
}

interface PlatformParams extends VentureParams {
  platform: string
}

interface ConnectBody {
  platform: string
  credentials: Record<string, any>
  settings?: Record<string, any>
}

export async function integrationsRoutes(fastify: FastifyInstance, options: { db: Database }) {
  const integrationService = new IntegrationService(options.db)

  // Get available integrations
  fastify.get('/available', {
    schema: {
      description: 'Get available payment platform integrations',
      tags: ['Integrations'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                  authType: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const platforms = await integrationService.getAvailableIntegrations()
      
      const integrationDetails = platforms.map(platform => ({
        platform,
        name: getIntegrationDisplayName(platform),
        description: getIntegrationDescription(platform),
        features: getIntegrationFeatures(platform),
        authType: getIntegrationAuthType(platform),
        status: 'available'
      }))

      return {
        success: true,
        data: integrationDetails
      }
    } catch (error) {
      console.error('Error fetching available integrations:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Failed to fetch available integrations'
      }
    }
  })

  // Get venture integrations
  fastify.get<{ Params: VentureParams }>('/venture/:ventureId', {
    schema: {
      description: 'Get integrations for a specific venture',
      tags: ['Integrations'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' }
        },
        required: ['ventureId']
      }
    }
  }, async (request, reply) => {
    try {
      const { ventureId } = request.params
      
      if (!ventureId) {
        reply.code(400)
        return {
          success: false,
          error: 'Venture ID is required'
        }
      }

      const integrations = await integrationService.getVentureIntegrations(ventureId)
      
      return {
        success: true,
        data: integrations
      }
    } catch (error) {
      console.error('Error fetching venture integrations:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Failed to fetch venture integrations'
      }
    }
  })

  // Add new integration
  fastify.post<{ Params: VentureParams; Body: ConnectBody }>('/venture/:ventureId/connect', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Connect a new payment platform integration',
      tags: ['Integrations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' }
        },
        required: ['ventureId']
      },
      body: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          credentials: { type: 'object' },
          settings: { type: 'object' }
        },
        required: ['platform', 'credentials']
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { ventureId } = request.params
      const { platform, credentials, settings = {} } = request.body

      if (!ventureId || !platform || !credentials) {
        reply.code(400)
        return {
          success: false,
          error: 'Venture ID, platform, and credentials are required'
        }
      }

      // Validate platform
      const availablePlatforms = await integrationService.getAvailableIntegrations()
      if (!availablePlatforms.includes(platform)) {
        reply.code(400)
        return {
          success: false,
          error: `Unsupported platform: ${platform}`
        }
      }

      const config: IntegrationConfig = {
        ventureId,
        platform,
        credentials,
        syncEnabled: true,
        webhooksEnabled: settings.webhooksEnabled || false,
        settings
      }

      await integrationService.addIntegration(config)

      return {
        success: true,
        message: `${getIntegrationDisplayName(platform)} integration connected successfully`
      }
    } catch (error) {
      console.error('Error adding integration:', error)
      
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        reply.code(401)
        return {
          success: false,
          error: 'Invalid credentials provided'
        }
      }

      reply.code(500)
      return {
        success: false,
        error: 'Failed to connect integration'
      }
    }
  })

  // Remove integration
  fastify.delete<{ Params: PlatformParams }>('/venture/:ventureId/:platform', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Disconnect a payment platform integration',
      tags: ['Integrations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' },
          platform: { type: 'string' }
        },
        required: ['ventureId', 'platform']
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { ventureId, platform } = request.params

      if (!ventureId || !platform) {
        reply.code(400)
        return {
          success: false,
          error: 'Venture ID and platform are required'
        }
      }

      await integrationService.removeIntegration(ventureId, platform)

      return {
        success: true,
        message: `${getIntegrationDisplayName(platform)} integration disconnected successfully`
      }
    } catch (error) {
      console.error('Error removing integration:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Failed to disconnect integration'
      }
    }
  })

  // Sync single integration
  fastify.post<{ Params: PlatformParams }>('/venture/:ventureId/:platform/sync', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Sync transactions from a specific payment platform',
      tags: ['Integrations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' },
          platform: { type: 'string' }
        },
        required: ['ventureId', 'platform']
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { ventureId, platform } = request.params

      if (!ventureId || !platform) {
        reply.code(400)
        return {
          success: false,
          error: 'Venture ID and platform are required'
        }
      }

      const result = await integrationService.syncIntegration(ventureId, platform)

      return {
        success: true,
        data: result,
        message: `${getIntegrationDisplayName(platform)} sync completed`
      }
    } catch (error) {
      console.error('Error syncing integration:', error)
      
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        reply.code(401)
        return {
          success: false,
          error: 'Authentication failed - please reconnect your account'
        }
      }

      reply.code(500)
      return {
        success: false,
        error: 'Failed to sync integration'
      }
    }
  })

  // Sync all integrations for a venture
  fastify.post<{ Params: VentureParams }>('/venture/:ventureId/sync-all', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Sync transactions from all connected payment platforms',
      tags: ['Integrations'],
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' }
        },
        required: ['ventureId']
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { ventureId } = request.params

      if (!ventureId) {
        reply.code(400)
        return {
          success: false,
          error: 'Venture ID is required'
        }
      }

      const results = await integrationService.syncAllIntegrations(ventureId)

      const summary = {
        totalSynced: results.length,
        totalTransactions: results.reduce((sum, r) => sum + r.transactionsAdded + r.transactionsUpdated, 0),
        transactionsAdded: results.reduce((sum, r) => sum + r.transactionsAdded, 0),
        transactionsUpdated: results.reduce((sum, r) => sum + r.transactionsUpdated, 0),
        errors: results.flatMap(r => r.errors),
        platforms: results.map(r => ({
          platform: r.platform,
          transactionsAdded: r.transactionsAdded,
          transactionsUpdated: r.transactionsUpdated,
          errors: r.errors
        }))
      }

      return {
        success: true,
        data: summary,
        message: `Synced ${summary.totalSynced} integrations with ${summary.totalTransactions} total transactions`
      }
    } catch (error) {
      console.error('Error syncing all integrations:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Failed to sync integrations'
      }
    }
  })

  // Handle webhooks
  fastify.post<{ Params: { platform: string } }>('/webhooks/:platform', {
    schema: {
      description: 'Handle webhook events from payment platforms',
      tags: ['Integrations'],
      params: {
        type: 'object',
        properties: {
          platform: { type: 'string' }
        },
        required: ['platform']
      }
    }
  }, async (request, reply) => {
    try {
      const { platform } = request.params
      const signature = (request.headers['x-webhook-signature'] as string) || 
                       (request.headers['stripe-signature'] as string) ||
                       (request.headers['paypal-transmission-sig'] as string)

      if (!signature) {
        reply.code(400)
        return {
          success: false,
          error: 'Missing webhook signature'
        }
      }

      await integrationService.handleWebhook(platform, request.body, signature)

      return {
        success: true,
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      console.error('Error processing webhook:', error)
      
      if (error instanceof Error && error.message.includes('Invalid webhook signature')) {
        reply.code(401)
        return {
          success: false,
          error: 'Invalid webhook signature'
        }
      }

      reply.code(500)
      return {
        success: false,
        error: 'Failed to process webhook'
      }
    }
  })

  // Get integration status and health
  fastify.get<{ Params: VentureParams }>('/venture/:ventureId/status', {
    schema: {
      description: 'Get integration status and health for a venture',
      tags: ['Integrations'],
      params: {
        type: 'object',
        properties: {
          ventureId: { type: 'string' }
        },
        required: ['ventureId']
      }
    }
  }, async (request, reply) => {
    try {
      const { ventureId } = request.params
      
      if (!ventureId) {
        reply.code(400)
        return {
          success: false,
          error: 'Venture ID is required'
        }
      }

      const integrations = await integrationService.getVentureIntegrations(ventureId)
      
      const status = integrations.map(integration => ({
        platform: integration.platform,
        isConnected: true,
        syncEnabled: integration.syncEnabled,
        webhooksEnabled: integration.webhooksEnabled,
        lastSyncAt: integration.lastSyncAt,
        status: integration.syncEnabled ? 'active' : 'inactive',
        health: integration.lastSyncAt && 
               (Date.now() - integration.lastSyncAt.getTime()) < 24 * 60 * 60 * 1000 
               ? 'healthy' : 'stale'
      }))

      return {
        success: true,
        data: {
          totalIntegrations: status.length,
          activeIntegrations: status.filter(s => s.status === 'active').length,
          healthyIntegrations: status.filter(s => s.health === 'healthy').length,
          integrations: status
        }
      }
    } catch (error) {
      console.error('Error fetching integration status:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Failed to fetch integration status'
      }
    }
  })
}

// Helper functions for integration metadata
function getIntegrationDisplayName(platform: string): string {
  const names: Record<string, string> = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    venmo: 'Venmo',
    wise: 'Wise (TransferWise)',
    square: 'Square'
  }
  return names[platform] || platform
}

function getIntegrationDescription(platform: string): string {
  const descriptions: Record<string, string> = {
    stripe: 'Connect your Stripe account to automatically sync payments, refunds, and payouts',
    paypal: 'Sync PayPal payments, payouts, and account transactions',
    venmo: 'Track Venmo payments and transfers (personal account only)',
    wise: 'Connect Wise for international transfers and multi-currency transactions',
    square: 'Sync Square point-of-sale transactions and payments'
  }
  return descriptions[platform] || `Connect your ${platform} account to sync transactions`
}

function getIntegrationFeatures(platform: string): string[] {
  const features: Record<string, string[]> = {
    stripe: ['Payments', 'Refunds', 'Payouts', 'Fees tracking', 'Webhooks'],
    paypal: ['Payments', 'Payouts', 'Refunds', 'Fees tracking'],
    venmo: ['Personal payments', 'Transaction history'],
    wise: ['International transfers', 'Currency exchange', 'Multi-currency balances', 'Fees tracking'],
    square: ['Point-of-sale transactions', 'Card payments', 'Cash transactions', 'Refunds']
  }
  return features[platform] || ['Transaction sync']
}

function getIntegrationAuthType(platform: string): string {
  const authTypes: Record<string, string> = {
    stripe: 'API Key',
    paypal: 'OAuth / API Credentials',
    venmo: 'OAuth Access Token',
    wise: 'API Token',
    square: 'OAuth / Access Token'
  }
  return authTypes[platform] || 'API Credentials'
}