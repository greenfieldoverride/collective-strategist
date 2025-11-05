import { IntegrationService, IntegrationConfig, TransactionData } from '../../services/integration-service'
import { Database } from '../../database/connection'
import { encryptionService } from '../../services/encryption-service'

// Mock the platform integrations
jest.mock('../../services/integrations/stripe-integration')
jest.mock('../../services/integrations/paypal-integration')
jest.mock('../../services/integrations/venmo-integration')
jest.mock('../../services/integrations/wise-integration')
jest.mock('../../services/integrations/square-integration')
jest.mock('../../services/encryption-service')

const mockDatabase = {
  query: jest.fn()
} as unknown as Database

const mockEncryptionService = encryptionService as jest.Mocked<typeof encryptionService>

describe('IntegrationService', () => {
  let integrationService: IntegrationService
  let mockPlatformIntegration: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock platform integration
    mockPlatformIntegration = {
      platform: 'stripe',
      authenticate: jest.fn(),
      getTransactions: jest.fn(),
      getAccountInfo: jest.fn(),
      validateWebhook: jest.fn(),
      disconnect: jest.fn()
    }

    // Mock encryption service
    mockEncryptionService.encryptGCM = jest.fn().mockReturnValue('encrypted-credentials')
    mockEncryptionService.decryptGCM = jest.fn().mockReturnValue({
      secretKey: 'sk_test_123456789',
      environment: 'sandbox'
    })

    integrationService = new IntegrationService(mockDatabase)
    
    // Replace the mocked integration with our mock
    ;(integrationService as any).integrations.set('stripe', mockPlatformIntegration)
  })

  describe('getAvailableIntegrations', () => {
    it('should return list of available platform integrations', async () => {
      const platforms = await integrationService.getAvailableIntegrations()
      
      expect(platforms).toContain('stripe')
      expect(platforms).toContain('paypal')
      expect(platforms).toContain('venmo')
      expect(platforms).toContain('wise')
      expect(platforms).toContain('square')
    })
  })

  describe('getVentureIntegrations', () => {
    it('should fetch integrations for a venture', async () => {
      const mockQueryResult = {
        rows: [
          {
            venture_id: 'venture-123',
            platform: 'stripe',
            integration_name: 'Stripe Integration',
            last_sync_at: new Date('2023-01-15'),
            sync_status: 'active',
            settings: { webhooks_enabled: true },
            is_active: true,
            created_at: new Date('2023-01-01'),
            updated_at: new Date('2023-01-15')
          }
        ]
      }

      mockDatabase.query.mockResolvedValue(mockQueryResult)

      const integrations = await integrationService.getVentureIntegrations('venture-123')

      expect(integrations).toHaveLength(1)
      expect(integrations[0]).toEqual({
        ventureId: 'venture-123',
        platform: 'stripe',
        credentials: {},
        syncEnabled: true,
        webhooksEnabled: true,
        lastSyncAt: new Date('2023-01-15'),
        settings: { webhooks_enabled: true }
      })

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['venture-123']
      )
    })

    it('should return empty array for venture with no integrations', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] })

      const integrations = await integrationService.getVentureIntegrations('venture-456')

      expect(integrations).toHaveLength(0)
    })
  })

  describe('addIntegration', () => {
    it('should successfully add a new integration', async () => {
      const config: IntegrationConfig = {
        ventureId: 'venture-123',
        platform: 'stripe',
        credentials: {
          secretKey: 'sk_test_123456789',
          environment: 'sandbox'
        },
        syncEnabled: true,
        webhooksEnabled: false
      }

      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockDatabase.query.mockResolvedValue({})

      await integrationService.addIntegration(config)

      expect(mockPlatformIntegration.authenticate).toHaveBeenCalledWith(config.credentials)
      expect(mockEncryptionService.encryptGCM).toHaveBeenCalledWith(config.credentials)
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO financial_integrations'),
        expect.arrayContaining([
          'venture-123',
          'stripe',
          'stripe Integration',
          'encrypted-credentials',
          'active',
          '{}',
          true
        ])
      )
    })

    it('should throw error for unsupported platform', async () => {
      const config: IntegrationConfig = {
        ventureId: 'venture-123',
        platform: 'unsupported-platform',
        credentials: {},
        syncEnabled: true,
        webhooksEnabled: false
      }

      await expect(integrationService.addIntegration(config))
        .rejects.toThrow('Unsupported platform: unsupported-platform')
    })

    it('should throw error when authentication fails', async () => {
      const config: IntegrationConfig = {
        ventureId: 'venture-123',
        platform: 'stripe',
        credentials: {
          secretKey: 'invalid-key'
        },
        syncEnabled: true,
        webhooksEnabled: false
      }

      mockPlatformIntegration.authenticate.mockResolvedValue(false)

      await expect(integrationService.addIntegration(config))
        .rejects.toThrow('Authentication failed for stripe')
    })
  })

  describe('removeIntegration', () => {
    it('should remove integration and call disconnect', async () => {
      mockDatabase.query.mockResolvedValue({})

      await integrationService.removeIntegration('venture-123', 'stripe')

      expect(mockPlatformIntegration.disconnect).toHaveBeenCalled()
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE financial_integrations'),
        ['venture-123', 'stripe']
      )
    })

    it('should handle disconnect errors gracefully', async () => {
      mockPlatformIntegration.disconnect.mockRejectedValue(new Error('Disconnect failed'))
      mockDatabase.query.mockResolvedValue({})

      // Should not throw error even if disconnect fails
      await expect(integrationService.removeIntegration('venture-123', 'stripe'))
        .resolves.not.toThrow()

      expect(mockDatabase.query).toHaveBeenCalled()
    })
  })

  describe('syncIntegration', () => {
    beforeEach(() => {
      // Mock getIntegrationConfig
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            venture_id: 'venture-123',
            platform: 'stripe',
            credentials_encrypted: 'encrypted-credentials',
            sync_status: 'active',
            last_sync_at: new Date('2023-01-01'),
            settings: {}
          }]
        })
        // Mock findExistingTransaction (no existing)
        .mockResolvedValueOnce({ rows: [] })
        // Mock addTransaction
        .mockResolvedValueOnce({})
        // Mock updateLastSync
        .mockResolvedValueOnce({})
    })

    it('should sync transactions from platform', async () => {
      const mockTransactions: TransactionData[] = [
        {
          externalId: 'tx_123456789',
          amount: 100,
          currency: 'USD',
          description: 'Test payment',
          date: new Date('2023-01-15'),
          status: 'completed',
          fees: 3,
          netAmount: 97,
          category: 'stripe_payment',
          metadata: { stripePaymentId: 'tx_123456789' }
        }
      ]

      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockPlatformIntegration.getTransactions.mockResolvedValue(mockTransactions)

      const result = await integrationService.syncIntegration('venture-123', 'stripe')

      expect(result.platform).toBe('stripe')
      expect(result.transactionsAdded).toBe(1)
      expect(result.transactionsUpdated).toBe(0)
      expect(result.errors).toHaveLength(0)

      expect(mockPlatformIntegration.authenticate).toHaveBeenCalled()
      expect(mockPlatformIntegration.getTransactions).toHaveBeenCalled()
    })

    it('should update existing transactions', async () => {
      const mockTransactions: TransactionData[] = [
        {
          externalId: 'tx_existing',
          amount: 100,
          currency: 'USD',
          description: 'Updated payment',
          date: new Date('2023-01-15'),
          status: 'completed',
          fees: 3,
          netAmount: 97,
          category: 'stripe_payment',
          metadata: {}
        }
      ]

      // Mock finding existing transaction
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            venture_id: 'venture-123',
            platform: 'stripe',
            credentials_encrypted: 'encrypted-credentials',
            sync_status: 'active',
            last_sync_at: new Date('2023-01-01'),
            settings: {}
          }]
        })
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] })
        .mockResolvedValueOnce({}) // updateTransaction
        .mockResolvedValueOnce({}) // updateLastSync

      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockPlatformIntegration.getTransactions.mockResolvedValue(mockTransactions)

      const result = await integrationService.syncIntegration('venture-123', 'stripe')

      expect(result.transactionsAdded).toBe(0)
      expect(result.transactionsUpdated).toBe(1)
    })

    it('should handle sync errors gracefully', async () => {
      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockPlatformIntegration.getTransactions.mockRejectedValue(new Error('API Error'))

      await expect(integrationService.syncIntegration('venture-123', 'stripe'))
        .rejects.toThrow('API Error')
    })

    it('should throw error for non-existent integration', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rows: [] })

      await expect(integrationService.syncIntegration('venture-123', 'stripe'))
        .rejects.toThrow('No integration found for stripe')
    })
  })

  describe('syncAllIntegrations', () => {
    it('should sync all active integrations', async () => {
      // Mock getVentureIntegrations
      const mockIntegrations = [
        {
          ventureId: 'venture-123',
          platform: 'stripe',
          credentials: {},
          syncEnabled: true,
          webhooksEnabled: false
        },
        {
          ventureId: 'venture-123',
          platform: 'paypal',
          credentials: {},
          syncEnabled: true,
          webhooksEnabled: false
        }
      ]

      jest.spyOn(integrationService, 'getVentureIntegrations')
        .mockResolvedValue(mockIntegrations as any)

      jest.spyOn(integrationService, 'syncIntegration')
        .mockResolvedValueOnce({
          platform: 'stripe',
          transactionsAdded: 5,
          transactionsUpdated: 2,
          errors: [],
          lastSyncAt: new Date()
        })
        .mockResolvedValueOnce({
          platform: 'paypal',
          transactionsAdded: 3,
          transactionsUpdated: 1,
          errors: ['Minor error'],
          lastSyncAt: new Date()
        })

      const results = await integrationService.syncAllIntegrations('venture-123')

      expect(results).toHaveLength(2)
      expect(results[0].platform).toBe('stripe')
      expect(results[1].platform).toBe('paypal')
    })

    it('should skip inactive integrations', async () => {
      const mockIntegrations = [
        {
          ventureId: 'venture-123',
          platform: 'stripe',
          credentials: {},
          syncEnabled: false,
          webhooksEnabled: false
        }
      ]

      jest.spyOn(integrationService, 'getVentureIntegrations')
        .mockResolvedValue(mockIntegrations as any)

      const syncSpy = jest.spyOn(integrationService, 'syncIntegration')

      const results = await integrationService.syncAllIntegrations('venture-123')

      expect(results).toHaveLength(0)
      expect(syncSpy).not.toHaveBeenCalled()
    })
  })

  describe('handleWebhook', () => {
    it('should validate and process webhook', async () => {
      const payload = { type: 'payment.completed' }
      const signature = 'webhook-signature'

      mockPlatformIntegration.validateWebhook.mockReturnValue(true)

      await integrationService.handleWebhook('stripe', payload, signature)

      expect(mockPlatformIntegration.validateWebhook).toHaveBeenCalledWith(payload, signature)
    })

    it('should throw error for invalid webhook signature', async () => {
      const payload = { type: 'payment.completed' }
      const signature = 'invalid-signature'

      mockPlatformIntegration.validateWebhook.mockReturnValue(false)

      await expect(integrationService.handleWebhook('stripe', payload, signature))
        .rejects.toThrow('Invalid webhook signature')
    })

    it('should throw error for unsupported platform webhook', async () => {
      await expect(integrationService.handleWebhook('unsupported', {}, 'signature'))
        .rejects.toThrow('Unsupported platform: unsupported')
    })
  })

  describe('credential encryption/decryption', () => {
    it('should encrypt credentials when storing', async () => {
      const config: IntegrationConfig = {
        ventureId: 'venture-123',
        platform: 'stripe',
        credentials: { secretKey: 'sk_test_123' },
        syncEnabled: true,
        webhooksEnabled: false
      }

      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockDatabase.query.mockResolvedValue({})

      await integrationService.addIntegration(config)

      expect(mockEncryptionService.encryptGCM).toHaveBeenCalledWith(config.credentials)
    })

    it('should decrypt credentials when retrieving', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            venture_id: 'venture-123',
            platform: 'stripe',
            credentials_encrypted: 'encrypted-credentials',
            sync_status: 'active',
            last_sync_at: new Date('2023-01-01'),
            settings: {}
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})

      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockPlatformIntegration.getTransactions.mockResolvedValue([])

      await integrationService.syncIntegration('venture-123', 'stripe')

      expect(mockEncryptionService.decryptGCM).toHaveBeenCalledWith('encrypted-credentials')
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Database connection failed'))

      await expect(integrationService.getVentureIntegrations('venture-123'))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle encryption errors', async () => {
      const config: IntegrationConfig = {
        ventureId: 'venture-123',
        platform: 'stripe',
        credentials: { secretKey: 'sk_test_123' },
        syncEnabled: true,
        webhooksEnabled: false
      }

      mockPlatformIntegration.authenticate.mockResolvedValue(true)
      mockEncryptionService.encryptGCM.mockImplementation(() => {
        throw new Error('Encryption failed')
      })

      await expect(integrationService.addIntegration(config))
        .rejects.toThrow('Failed to secure credentials')
    })

    it('should handle decryption errors', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          venture_id: 'venture-123',
          platform: 'stripe',
          credentials_encrypted: 'corrupted-credentials',
          sync_status: 'active',
          last_sync_at: new Date('2023-01-01'),
          settings: {}
        }]
      })

      mockEncryptionService.decryptGCM.mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      await expect(integrationService.syncIntegration('venture-123', 'stripe'))
        .rejects.toThrow('Failed to retrieve credentials')
    })
  })
})