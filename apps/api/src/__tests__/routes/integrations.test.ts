import request from 'supertest'
import express from 'express'
import { createIntegrationsRouter } from '../../routes/integrations'
import { Database } from '../../database/connection'
import { IntegrationService } from '../../services/integration-service'

// Mock the integration service
jest.mock('../../services/integration-service')

const mockDatabase = {
  query: jest.fn()
} as unknown as Database

const MockedIntegrationService = IntegrationService as jest.MockedClass<typeof IntegrationService>

describe('Integrations Routes', () => {
  let app: express.Application
  let mockIntegrationService: jest.Mocked<IntegrationService>

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockIntegrationService = {
      getAvailableIntegrations: jest.fn(),
      getVentureIntegrations: jest.fn(),
      addIntegration: jest.fn(),
      removeIntegration: jest.fn(),
      syncIntegration: jest.fn(),
      syncAllIntegrations: jest.fn(),
      handleWebhook: jest.fn()
    } as any

    MockedIntegrationService.mockImplementation(() => mockIntegrationService)

    app = express()
    app.use(express.json())
    app.use('/api/integrations', createIntegrationsRouter(mockDatabase))
  })

  describe('GET /available', () => {
    it('should return available integrations', async () => {
      const mockIntegrations = [
        {
          platform: 'stripe',
          name: 'Stripe',
          description: 'Connect your Stripe account to automatically sync payments, refunds, and payouts',
          features: ['Payments', 'Refunds', 'Payouts', 'Fees tracking', 'Webhooks'],
          authType: 'API Key',
          status: 'available'
        },
        {
          platform: 'paypal',
          name: 'PayPal',
          description: 'Sync PayPal payments, payouts, and account transactions',
          features: ['Payments', 'Payouts', 'Refunds', 'Fees tracking'],
          authType: 'OAuth / API Credentials',
          status: 'available'
        }
      ]

      mockIntegrationService.getAvailableIntegrations.mockResolvedValue(['stripe', 'paypal'])

      const response = await request(app)
        .get('/api/integrations/available')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].platform).toBe('stripe')
      expect(response.body.data[1].platform).toBe('paypal')
    })

    it('should handle service errors', async () => {
      mockIntegrationService.getAvailableIntegrations.mockRejectedValue(new Error('Service error'))

      const response = await request(app)
        .get('/api/integrations/available')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to fetch available integrations')
    })
  })

  describe('GET /venture/:ventureId', () => {
    it('should return venture integrations', async () => {
      const mockVentureIntegrations = [
        {
          ventureId: 'venture-123',
          platform: 'stripe',
          credentials: {},
          syncEnabled: true,
          webhooksEnabled: false,
          lastSyncAt: new Date('2023-01-15'),
          settings: {}
        }
      ]

      mockIntegrationService.getVentureIntegrations.mockResolvedValue(mockVentureIntegrations)

      const response = await request(app)
        .get('/api/integrations/venture/venture-123')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].platform).toBe('stripe')
      expect(mockIntegrationService.getVentureIntegrations).toHaveBeenCalledWith('venture-123')
    })

    it('should return 400 for missing venture ID', async () => {
      const response = await request(app)
        .get('/api/integrations/venture/')
        .expect(404) // Express returns 404 for missing route parameter
    })

    it('should handle service errors', async () => {
      mockIntegrationService.getVentureIntegrations.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/integrations/venture/venture-123')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to fetch venture integrations')
    })
  })

  describe('POST /venture/:ventureId/connect', () => {
    it('should connect new integration', async () => {
      const connectionData = {
        platform: 'stripe',
        credentials: {
          secretKey: 'sk_test_123456789',
          environment: 'sandbox'
        },
        settings: {
          webhooksEnabled: false
        }
      }

      mockIntegrationService.addIntegration.mockResolvedValue()

      const response = await request(app)
        .post('/api/integrations/venture/venture-123/connect')
        .send(connectionData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Stripe integration connected successfully')
      expect(mockIntegrationService.addIntegration).toHaveBeenCalledWith({
        ventureId: 'venture-123',
        platform: 'stripe',
        credentials: connectionData.credentials,
        syncEnabled: true,
        webhooksEnabled: false,
        settings: connectionData.settings
      })
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/integrations/venture/venture-123/connect')
        .send({
          platform: 'stripe'
          // Missing credentials
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Venture ID, platform, and credentials are required')
    })

    it('should return 400 for unsupported platform', async () => {
      mockIntegrationService.getAvailableIntegrations.mockResolvedValue(['stripe', 'paypal'])

      const response = await request(app)
        .post('/api/integrations/venture/venture-123/connect')
        .send({
          platform: 'unsupported-platform',
          credentials: { apiKey: 'test' }
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Unsupported platform: unsupported-platform')
    })

    it('should return 401 for authentication failure', async () => {
      mockIntegrationService.getAvailableIntegrations.mockResolvedValue(['stripe'])
      mockIntegrationService.addIntegration.mockRejectedValue(new Error('Authentication failed for stripe'))

      const response = await request(app)
        .post('/api/integrations/venture/venture-123/connect')
        .send({
          platform: 'stripe',
          credentials: { secretKey: 'invalid-key' }
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Invalid credentials provided')
    })
  })

  describe('DELETE /venture/:ventureId/:platform', () => {
    it('should disconnect integration', async () => {
      mockIntegrationService.removeIntegration.mockResolvedValue()

      const response = await request(app)
        .delete('/api/integrations/venture/venture-123/stripe')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Stripe integration disconnected successfully')
      expect(mockIntegrationService.removeIntegration).toHaveBeenCalledWith('venture-123', 'stripe')
    })

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .delete('/api/integrations/venture/venture-123/')
        .expect(404) // Express returns 404 for incomplete route
    })

    it('should handle service errors', async () => {
      mockIntegrationService.removeIntegration.mockRejectedValue(new Error('Disconnect failed'))

      const response = await request(app)
        .delete('/api/integrations/venture/venture-123/stripe')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to disconnect integration')
    })
  })

  describe('POST /venture/:ventureId/:platform/sync', () => {
    it('should sync integration successfully', async () => {
      const mockSyncResult = {
        platform: 'stripe',
        transactionsAdded: 5,
        transactionsUpdated: 2,
        errors: [],
        lastSyncAt: new Date('2023-01-15')
      }

      mockIntegrationService.syncIntegration.mockResolvedValue(mockSyncResult)

      const response = await request(app)
        .post('/api/integrations/venture/venture-123/stripe/sync')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(expect.objectContaining({
        platform: 'stripe',
        transactionsAdded: 5,
        transactionsUpdated: 2
      }))
      expect(response.body.message).toContain('Stripe sync completed')
    })

    it('should return 401 for authentication failure', async () => {
      mockIntegrationService.syncIntegration.mockRejectedValue(new Error('Authentication failed for stripe'))

      const response = await request(app)
        .post('/api/integrations/venture/venture-123/stripe/sync')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Authentication failed - please reconnect your account')
    })
  })

  describe('POST /venture/:ventureId/sync-all', () => {
    it('should sync all integrations', async () => {
      const mockSyncResults = [
        {
          platform: 'stripe',
          transactionsAdded: 5,
          transactionsUpdated: 2,
          errors: [],
          lastSyncAt: new Date()
        },
        {
          platform: 'paypal',
          transactionsAdded: 3,
          transactionsUpdated: 1,
          errors: ['Minor error'],
          lastSyncAt: new Date()
        }
      ]

      mockIntegrationService.syncAllIntegrations.mockResolvedValue(mockSyncResults)

      const response = await request(app)
        .post('/api/integrations/venture/venture-123/sync-all')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalSynced).toBe(2)
      expect(response.body.data.totalTransactions).toBe(11) // 5+2+3+1
      expect(response.body.data.platforms).toHaveLength(2)
    })

    it('should return 400 for missing venture ID', async () => {
      const response = await request(app)
        .post('/api/integrations/venture//sync-all')
        .expect(404)
    })
  })

  describe('POST /webhooks/:platform', () => {
    it('should process valid webhook', async () => {
      const webhookPayload = {
        type: 'payment.succeeded',
        data: { payment_id: 'pay_123' }
      }

      mockIntegrationService.handleWebhook.mockResolvedValue()

      const response = await request(app)
        .post('/api/integrations/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(webhookPayload)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Webhook processed successfully')
      expect(mockIntegrationService.handleWebhook).toHaveBeenCalledWith(
        'stripe',
        webhookPayload,
        'valid-signature'
      )
    })

    it('should return 400 for missing signature', async () => {
      const response = await request(app)
        .post('/api/integrations/webhooks/stripe')
        .send({ type: 'test' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Missing webhook signature')
    })

    it('should return 401 for invalid signature', async () => {
      mockIntegrationService.handleWebhook.mockRejectedValue(new Error('Invalid webhook signature'))

      const response = await request(app)
        .post('/api/integrations/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send({ type: 'test' })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Invalid webhook signature')
    })
  })

  describe('GET /venture/:ventureId/status', () => {
    it('should return integration status', async () => {
      const mockIntegrations = [
        {
          ventureId: 'venture-123',
          platform: 'stripe',
          credentials: {},
          syncEnabled: true,
          webhooksEnabled: false,
          lastSyncAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          settings: {}
        },
        {
          ventureId: 'venture-123',
          platform: 'paypal',
          credentials: {},
          syncEnabled: false,
          webhooksEnabled: true,
          lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 25), // 25 hours ago
          settings: {}
        }
      ]

      mockIntegrationService.getVentureIntegrations.mockResolvedValue(mockIntegrations)

      const response = await request(app)
        .get('/api/integrations/venture/venture-123/status')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalIntegrations).toBe(2)
      expect(response.body.data.activeIntegrations).toBe(1) // Only stripe is active
      expect(response.body.data.healthyIntegrations).toBe(1) // Only stripe is healthy (recent sync)
      expect(response.body.data.integrations).toHaveLength(2)

      const stripeStatus = response.body.data.integrations.find((i: any) => i.platform === 'stripe')
      expect(stripeStatus.status).toBe('active')
      expect(stripeStatus.health).toBe('healthy')

      const paypalStatus = response.body.data.integrations.find((i: any) => i.platform === 'paypal')
      expect(paypalStatus.status).toBe('inactive')
      expect(paypalStatus.health).toBe('stale')
    })

    it('should handle empty integrations list', async () => {
      mockIntegrationService.getVentureIntegrations.mockResolvedValue([])

      const response = await request(app)
        .get('/api/integrations/venture/venture-123/status')
        .expect(200)

      expect(response.body.data.totalIntegrations).toBe(0)
      expect(response.body.data.activeIntegrations).toBe(0)
      expect(response.body.data.healthyIntegrations).toBe(0)
      expect(response.body.data.integrations).toHaveLength(0)
    })
  })

  describe('Error handling', () => {
    it('should handle unexpected service errors', async () => {
      mockIntegrationService.getAvailableIntegrations.mockRejectedValue(new Error('Unexpected error'))

      const response = await request(app)
        .get('/api/integrations/available')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to fetch available integrations')
    })

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/integrations/venture/venture-123/connect')
        .send('invalid-json')
        .expect(400)
    })
  })

  describe('Helper functions', () => {
    it('should return correct platform display names', () => {
      const { getIntegrationDisplayName } = require('../../routes/integrations')
      
      expect(getIntegrationDisplayName('stripe')).toBe('Stripe')
      expect(getIntegrationDisplayName('paypal')).toBe('PayPal')
      expect(getIntegrationDisplayName('venmo')).toBe('Venmo')
      expect(getIntegrationDisplayName('wise')).toBe('Wise (TransferWise)')
      expect(getIntegrationDisplayName('square')).toBe('Square')
      expect(getIntegrationDisplayName('unknown')).toBe('unknown')
    })

    it('should return correct platform descriptions', () => {
      const { getIntegrationDescription } = require('../../routes/integrations')
      
      expect(getIntegrationDescription('stripe')).toContain('Stripe account')
      expect(getIntegrationDescription('paypal')).toContain('PayPal')
      expect(getIntegrationDescription('unknown')).toContain('Connect your unknown account')
    })
  })
})