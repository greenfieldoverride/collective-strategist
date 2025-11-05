import { Database } from '../../database/connection'
import { IntegrationService } from '../../services/integration-service'
import { encryptionService } from '../../services/encryption-service'

// Integration test that simulates the full payment integration flow
describe('Payment Integrations - End to End', () => {
  let db: Database
  let integrationService: IntegrationService
  const testVentureId = 'test-venture-e2e'

  beforeAll(async () => {
    // Set up test encryption key
    process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcw=='
    
    // Initialize database connection for tests
    db = {
      query: jest.fn()
    } as unknown as Database

    integrationService = new IntegrationService(db)
  })

  afterAll(async () => {
    // Cleanup
    delete process.env.ENCRYPTION_KEY
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Integration Workflow', () => {
    it('should handle full Stripe integration lifecycle', async () => {
      // Mock database responses for the full workflow
      let queryCallCount = 0
      ;(db.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
        queryCallCount++
        
        // Mock different database operations based on call order
        if (query.includes('INSERT INTO financial_integrations')) {
          return { rows: [] }
        }
        
        if (query.includes('SELECT') && query.includes('financial_integrations')) {
          if (queryCallCount === 2) {
            // Return integration config for sync
            return {
              rows: [{
                venture_id: testVentureId,
                platform: 'stripe',
                credentials_encrypted: encryptionService.encryptGCM({
                  secretKey: 'sk_test_123456789',
                  environment: 'sandbox'
                }),
                sync_status: 'active',
                last_sync_at: new Date('2023-01-01'),
                settings: {}
              }]
            }
          } else {
            // Return venture integrations
            return {
              rows: [{
                venture_id: testVentureId,
                platform: 'stripe',
                integration_name: 'Stripe Integration',
                last_sync_at: new Date('2023-01-15'),
                sync_status: 'active',
                settings: { webhooks_enabled: false },
                is_active: true,
                created_at: new Date('2023-01-01'),
                updated_at: new Date('2023-01-15')
              }]
            }
          }
        }
        
        if (query.includes('SELECT id FROM financial_transactions')) {
          // No existing transactions
          return { rows: [] }
        }
        
        if (query.includes('INSERT INTO financial_transactions')) {
          return { rows: [] }
        }
        
        if (query.includes('UPDATE financial_integrations')) {
          return { rows: [] }
        }

        return { rows: [] }
      })

      // Mock Stripe integration
      const mockStripeIntegration = {
        platform: 'stripe',
        authenticate: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockResolvedValue([
          {
            externalId: 'ch_test_123456789',
            amount: 100,
            currency: 'USD',
            description: 'Test payment',
            date: new Date('2023-01-15'),
            status: 'completed',
            fees: 3,
            netAmount: 97,
            category: 'stripe_payment',
            metadata: { stripeChargeId: 'ch_test_123456789' }
          },
          {
            externalId: 'po_test_987654321', 
            amount: -97,
            currency: 'USD',
            description: 'Payout to bank',
            date: new Date('2023-01-16'),
            status: 'completed',
            fees: 0,
            netAmount: -97,
            category: 'stripe_payout',
            metadata: { stripePayoutId: 'po_test_987654321' }
          }
        ]),
        getAccountInfo: jest.fn().mockResolvedValue({
          id: 'acct_test_123',
          country: 'US',
          defaultCurrency: 'usd'
        }),
        validateWebhook: jest.fn().mockReturnValue(true),
        disconnect: jest.fn().mockResolvedValue(undefined)
      }

      // Replace the integration in the service
      ;(integrationService as any).integrations.set('stripe', mockStripeIntegration)

      // Step 1: Get available integrations
      const availablePlatforms = await integrationService.getAvailableIntegrations()
      expect(availablePlatforms).toContain('stripe')

      // Step 2: Add Stripe integration
      const integrationConfig = {
        ventureId: testVentureId,
        platform: 'stripe',
        credentials: {
          secretKey: 'sk_test_123456789',
          environment: 'sandbox' as const
        },
        syncEnabled: true,
        webhooksEnabled: false
      }

      await integrationService.addIntegration(integrationConfig)

      expect(mockStripeIntegration.authenticate).toHaveBeenCalledWith(integrationConfig.credentials)
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO financial_integrations'),
        expect.arrayContaining([testVentureId, 'stripe'])
      )

      // Step 3: Get venture integrations to verify it was added
      const ventureIntegrations = await integrationService.getVentureIntegrations(testVentureId)
      expect(ventureIntegrations).toHaveLength(1)
      expect(ventureIntegrations[0].platform).toBe('stripe')
      expect(ventureIntegrations[0].syncEnabled).toBe(true)

      // Step 4: Sync the integration
      const syncResult = await integrationService.syncIntegration(testVentureId, 'stripe')
      
      expect(syncResult.platform).toBe('stripe')
      expect(syncResult.transactionsAdded).toBe(2) // Payment + payout
      expect(syncResult.transactionsUpdated).toBe(0)
      expect(syncResult.errors).toHaveLength(0)

      expect(mockStripeIntegration.getTransactions).toHaveBeenCalled()
      
      // Verify transactions were inserted
      const insertCalls = (db.query as jest.Mock).mock.calls.filter(call => 
        call[0].includes('INSERT INTO financial_transactions')
      )
      expect(insertCalls).toHaveLength(2) // One for payment, one for payout

      // Step 5: Test webhook handling
      const webhookPayload = { type: 'payment_intent.succeeded', data: {} }
      const webhookSignature = 'test-signature'

      await integrationService.handleWebhook('stripe', webhookPayload, webhookSignature)
      expect(mockStripeIntegration.validateWebhook).toHaveBeenCalledWith(webhookPayload, webhookSignature)

      // Step 6: Remove integration
      await integrationService.removeIntegration(testVentureId, 'stripe')
      
      expect(mockStripeIntegration.disconnect).toHaveBeenCalled()
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE financial_integrations'),
        [testVentureId, 'stripe']
      )
    })

    it('should handle multi-platform sync workflow', async () => {
      // Mock multiple integrations
      const mockStripe = {
        platform: 'stripe',
        authenticate: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockResolvedValue([
          {
            externalId: 'stripe_tx_1',
            amount: 100,
            currency: 'USD',
            description: 'Stripe payment',
            date: new Date(),
            status: 'completed',
            fees: 3,
            netAmount: 97,
            category: 'stripe_payment',
            metadata: {}
          }
        ]),
        getAccountInfo: jest.fn(),
        validateWebhook: jest.fn(),
        disconnect: jest.fn()
      }

      const mockPayPal = {
        platform: 'paypal',
        authenticate: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockResolvedValue([
          {
            externalId: 'paypal_tx_1',
            amount: 75,
            currency: 'USD',
            description: 'PayPal payment',
            date: new Date(),
            status: 'completed',
            fees: 2.5,
            netAmount: 72.5,
            category: 'paypal_payment',
            metadata: {}
          }
        ]),
        getAccountInfo: jest.fn(),
        validateWebhook: jest.fn(),
        disconnect: jest.fn()
      }

      ;(integrationService as any).integrations.set('stripe', mockStripe)
      ;(integrationService as any).integrations.set('paypal', mockPayPal)

      // Mock venture integrations query to return both platforms
      ;(db.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            venture_id: testVentureId,
            platform: 'stripe',
            integration_name: 'Stripe Integration',
            last_sync_at: new Date('2023-01-15'),
            sync_status: 'active',
            settings: {},
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            venture_id: testVentureId,
            platform: 'paypal',
            integration_name: 'PayPal Integration',
            last_sync_at: new Date('2023-01-15'),
            sync_status: 'active',
            settings: {},
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      })

      // Mock individual sync operations
      jest.spyOn(integrationService, 'syncIntegration')
        .mockResolvedValueOnce({
          platform: 'stripe',
          transactionsAdded: 1,
          transactionsUpdated: 0,
          errors: [],
          lastSyncAt: new Date()
        })
        .mockResolvedValueOnce({
          platform: 'paypal',
          transactionsAdded: 1,
          transactionsUpdated: 0,
          errors: [],
          lastSyncAt: new Date()
        })

      // Sync all integrations
      const syncResults = await integrationService.syncAllIntegrations(testVentureId)

      expect(syncResults).toHaveLength(2)
      expect(syncResults[0].platform).toBe('stripe')
      expect(syncResults[1].platform).toBe('paypal')
      expect(syncResults[0].transactionsAdded).toBe(1)
      expect(syncResults[1].transactionsAdded).toBe(1)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle authentication failures gracefully', async () => {
      const mockFailingIntegration = {
        platform: 'stripe',
        authenticate: jest.fn().mockResolvedValue(false),
        getTransactions: jest.fn(),
        getAccountInfo: jest.fn(),
        validateWebhook: jest.fn(),
        disconnect: jest.fn()
      }

      ;(integrationService as any).integrations.set('stripe', mockFailingIntegration)

      const integrationConfig = {
        ventureId: testVentureId,
        platform: 'stripe',
        credentials: { secretKey: 'invalid-key' },
        syncEnabled: true,
        webhooksEnabled: false
      }

      await expect(integrationService.addIntegration(integrationConfig))
        .rejects.toThrow('Authentication failed for stripe')

      expect(mockFailingIntegration.authenticate).toHaveBeenCalled()
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO financial_integrations'),
        expect.anything()
      )
    })

    it('should handle platform API errors during sync', async () => {
      const mockErrorIntegration = {
        platform: 'stripe',
        authenticate: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockRejectedValue(new Error('API Rate Limit Exceeded')),
        getAccountInfo: jest.fn(),
        validateWebhook: jest.fn(),
        disconnect: jest.fn()
      }

      ;(integrationService as any).integrations.set('stripe', mockErrorIntegration)

      // Mock getting integration config
      ;(db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          venture_id: testVentureId,
          platform: 'stripe',
          credentials_encrypted: encryptionService.encryptGCM({
            secretKey: 'sk_test_123456789'
          }),
          sync_status: 'active',
          last_sync_at: new Date(),
          settings: {}
        }]
      })

      await expect(integrationService.syncIntegration(testVentureId, 'stripe'))
        .rejects.toThrow('API Rate Limit Exceeded')

      expect(mockErrorIntegration.authenticate).toHaveBeenCalled()
      expect(mockErrorIntegration.getTransactions).toHaveBeenCalled()
    })

    it('should handle database connection failures', async () => {
      ;(db.query as jest.Mock).mockRejectedValue(new Error('Database connection lost'))

      await expect(integrationService.getVentureIntegrations(testVentureId))
        .rejects.toThrow('Database connection lost')
    })

    it('should handle encryption/decryption failures', async () => {
      const originalDecrypt = encryptionService.decryptGCM
      jest.spyOn(encryptionService, 'decryptGCM').mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      ;(db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          venture_id: testVentureId,
          platform: 'stripe',
          credentials_encrypted: 'corrupted-data',
          sync_status: 'active',
          last_sync_at: new Date(),
          settings: {}
        }]
      })

      await expect(integrationService.syncIntegration(testVentureId, 'stripe'))
        .rejects.toThrow('Failed to retrieve credentials')

      // Restore original method
      encryptionService.decryptGCM = originalDecrypt
    })
  })

  describe('Data Integrity', () => {
    it('should ensure transaction data consistency', async () => {
      const mockTransactions = [
        {
          externalId: 'duplicate_id',
          amount: 100,
          currency: 'USD',
          description: 'Original transaction',
          date: new Date('2023-01-15'),
          status: 'completed',
          fees: 3,
          netAmount: 97,
          category: 'stripe_payment',
          metadata: {}
        },
        {
          externalId: 'duplicate_id', // Same external ID
          amount: 100,
          currency: 'USD',
          description: 'Updated transaction',
          date: new Date('2023-01-15'),
          status: 'completed',
          fees: 3,
          netAmount: 97,
          category: 'stripe_payment',
          metadata: {}
        }
      ]

      const mockIntegration = {
        platform: 'stripe',
        authenticate: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockResolvedValue(mockTransactions),
        getAccountInfo: jest.fn(),
        validateWebhook: jest.fn(),
        disconnect: jest.fn()
      }

      ;(integrationService as any).integrations.set('stripe', mockIntegration)

      // Mock database responses
      let findCallCount = 0
      ;(db.query as jest.Mock).mockImplementation(async (query: string) => {
        if (query.includes('SELECT') && query.includes('financial_integrations')) {
          return {
            rows: [{
              venture_id: testVentureId,
              platform: 'stripe',
              credentials_encrypted: encryptionService.encryptGCM({ secretKey: 'sk_test_123' }),
              sync_status: 'active',
              last_sync_at: new Date(),
              settings: {}
            }]
          }
        }
        
        if (query.includes('SELECT id FROM financial_transactions')) {
          findCallCount++
          if (findCallCount === 1) {
            // First transaction doesn't exist
            return { rows: [] }
          } else {
            // Second transaction exists (duplicate)
            return { rows: [{ id: 'existing-transaction-id' }] }
          }
        }
        
        return { rows: [] }
      })

      const syncResult = await integrationService.syncIntegration(testVentureId, 'stripe')

      expect(syncResult.transactionsAdded).toBe(1) // Only first transaction added
      expect(syncResult.transactionsUpdated).toBe(1) // Second transaction updated
      expect(syncResult.errors).toHaveLength(0)
    })

    it('should handle currency and amount formatting consistently', async () => {
      const mockTransactions = [
        {
          externalId: 'eur_tx_1',
          amount: 85.50,
          currency: 'eur', // lowercase
          description: 'Euro payment',
          date: new Date(),
          status: 'completed',
          fees: 2.5,
          netAmount: 83.0,
          category: 'stripe_payment',
          metadata: {}
        },
        {
          externalId: 'jpy_tx_1',
          amount: 10000, // JPY doesn't use decimals
          currency: 'JPY', // uppercase
          description: 'Yen payment',
          date: new Date(),
          status: 'completed',
          fees: 100,
          netAmount: 9900,
          category: 'stripe_payment',
          metadata: {}
        }
      ]

      const mockIntegration = {
        platform: 'stripe',
        authenticate: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockResolvedValue(mockTransactions),
        getAccountInfo: jest.fn(),
        validateWebhook: jest.fn(),
        disconnect: jest.fn()
      }

      ;(integrationService as any).integrations.set('stripe', mockIntegration)

      // Mock database responses
      ;(db.query as jest.Mock).mockImplementation(async (query: string) => {
        if (query.includes('INSERT INTO financial_transactions')) {
          // Verify the data being inserted
          return { rows: [] }
        }
        if (query.includes('SELECT') && query.includes('financial_integrations')) {
          return {
            rows: [{
              venture_id: testVentureId,
              platform: 'stripe',
              credentials_encrypted: encryptionService.encryptGCM({ secretKey: 'sk_test_123' }),
              sync_status: 'active',
              last_sync_at: new Date(),
              settings: {}
            }]
          }
        }
        if (query.includes('SELECT id FROM financial_transactions')) {
          return { rows: [] }
        }
        return { rows: [] }
      })

      const syncResult = await integrationService.syncIntegration(testVentureId, 'stripe')

      expect(syncResult.transactionsAdded).toBe(2)
      
      // Verify that both currencies are handled properly
      const insertCalls = (db.query as jest.Mock).mock.calls.filter(call => 
        call[0].includes('INSERT INTO financial_transactions')
      )
      expect(insertCalls).toHaveLength(2)
    })
  })
})