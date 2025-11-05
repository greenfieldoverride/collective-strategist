import { StripeIntegration } from '../../../services/integrations/stripe-integration'
import { IntegrationCredentials } from '../../../services/integration-service'

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      retrieve: jest.fn()
    },
    charges: {
      list: jest.fn()
    },
    refunds: {
      list: jest.fn()
    },
    payouts: {
      list: jest.fn()
    },
    balance: {
      retrieve: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }))
})

describe('StripeIntegration', () => {
  let stripeIntegration: StripeIntegration
  let mockStripe: any

  beforeEach(() => {
    stripeIntegration = new StripeIntegration()
    // Get the mocked Stripe constructor
    const StripeConstructor = require('stripe')
    mockStripe = new StripeConstructor()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }

      mockStripe.accounts.retrieve.mockResolvedValue({
        id: 'acct_123456789',
        type: 'standard'
      })

      const result = await stripeIntegration.authenticate(credentials)
      
      expect(result).toBe(true)
      expect(mockStripe.accounts.retrieve).toHaveBeenCalled()
    })

    it('should fail authentication with invalid credentials', async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_invalid',
        environment: 'sandbox'
      }

      mockStripe.accounts.retrieve.mockRejectedValue(new Error('Invalid API key'))

      const result = await stripeIntegration.authenticate(credentials)
      
      expect(result).toBe(false)
    })

    it('should fail authentication without secret key', async () => {
      const credentials: IntegrationCredentials = {
        environment: 'sandbox'
      }

      const result = await stripeIntegration.authenticate(credentials)
      
      expect(result).toBe(false)
    })
  })

  describe('getTransactions', () => {
    beforeEach(async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }
      
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_123' })
      await stripeIntegration.authenticate(credentials)
    })

    it('should fetch charges, refunds, and payouts', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-31')

      // Mock charges
      mockStripe.charges.list.mockResolvedValue({
        data: [
          {
            id: 'ch_123456789',
            amount: 5000, // $50.00 in cents
            currency: 'usd',
            status: 'succeeded',
            description: 'Test payment',
            created: Math.floor(new Date('2023-01-15').getTime() / 1000),
            application_fee_amount: 150, // $1.50 in cents
            billing_details: { email: 'customer@example.com' },
            payment_method_details: { type: 'card' },
            receipt_url: 'https://pay.stripe.com/receipts/test'
          }
        ]
      })

      // Mock refunds
      mockStripe.refunds.list.mockResolvedValue({
        data: [
          {
            id: 'rf_123456789',
            amount: 1000, // $10.00 in cents
            currency: 'usd',
            charge: 'ch_123456789',
            reason: 'requested_by_customer',
            created: Math.floor(new Date('2023-01-20').getTime() / 1000),
            status: 'succeeded'
          }
        ]
      })

      // Mock payouts
      mockStripe.payouts.list.mockResolvedValue({
        data: [
          {
            id: 'po_123456789',
            amount: 4850, // $48.50 in cents (after fees)
            currency: 'usd',
            status: 'paid',
            created: Math.floor(new Date('2023-01-25').getTime() / 1000),
            destination: 'ba_123456789',
            method: 'standard',
            type: 'bank_account'
          }
        ]
      })

      const transactions = await stripeIntegration.getTransactions(startDate, endDate)

      expect(transactions).toHaveLength(3)

      // Check charge transaction
      const chargeTransaction = transactions.find(t => t.externalId === 'ch_123456789')
      expect(chargeTransaction).toBeDefined()
      expect(chargeTransaction!.amount).toBe(50) // Converted from cents
      expect(chargeTransaction!.currency).toBe('USD')
      expect(chargeTransaction!.fees).toBe(1.5)
      expect(chargeTransaction!.netAmount).toBe(48.5)
      expect(chargeTransaction!.status).toBe('completed')
      expect(chargeTransaction!.category).toBe('stripe_payment')
      expect(chargeTransaction!.counterparty).toBe('customer@example.com')

      // Check refund transaction
      const refundTransaction = transactions.find(t => t.externalId === 'rf_123456789')
      expect(refundTransaction).toBeDefined()
      expect(refundTransaction!.amount).toBe(-10) // Negative for refunds
      expect(refundTransaction!.status).toBe('refunded')
      expect(refundTransaction!.category).toBe('stripe_refund')

      // Check payout transaction
      const payoutTransaction = transactions.find(t => t.externalId === 'po_123456789')
      expect(payoutTransaction).toBeDefined()
      expect(payoutTransaction!.amount).toBe(-48.5) // Negative for outgoing
      expect(payoutTransaction!.status).toBe('completed')
      expect(payoutTransaction!.category).toBe('stripe_payout')
    })

    it('should filter transactions by date range', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-31')

      mockStripe.charges.list.mockResolvedValue({ data: [] })
      mockStripe.refunds.list.mockResolvedValue({ data: [] })
      mockStripe.payouts.list.mockResolvedValue({ data: [] })

      await stripeIntegration.getTransactions(startDate, endDate)

      // Verify date filtering
      expect(mockStripe.charges.list).toHaveBeenCalledWith({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000)
        },
        limit: 100
      })
    })

    it('should handle empty transaction lists', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-31')

      mockStripe.charges.list.mockResolvedValue({ data: [] })
      mockStripe.refunds.list.mockResolvedValue({ data: [] })
      mockStripe.payouts.list.mockResolvedValue({ data: [] })

      const transactions = await stripeIntegration.getTransactions(startDate, endDate)

      expect(transactions).toHaveLength(0)
    })

    it('should handle API errors gracefully', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-31')

      mockStripe.charges.list.mockRejectedValue(new Error('API Error'))

      await expect(stripeIntegration.getTransactions(startDate, endDate))
        .rejects.toThrow('API Error')
    })
  })

  describe('getAccountInfo', () => {
    beforeEach(async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }
      
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_123' })
      await stripeIntegration.authenticate(credentials)
    })

    it('should fetch account and balance information', async () => {
      mockStripe.accounts.retrieve.mockResolvedValue({
        id: 'acct_123456789',
        business_profile: {
          name: 'Test Business',
          url: 'https://testbusiness.com'
        },
        country: 'US',
        default_currency: 'usd',
        email: 'business@example.com',
        payouts_enabled: true,
        charges_enabled: true
      })

      mockStripe.balance.retrieve.mockResolvedValue({
        available: [
          { amount: 10000, currency: 'usd' },
          { amount: 50000, currency: 'eur' }
        ],
        pending: [
          { amount: 5000, currency: 'usd' }
        ]
      })

      const accountInfo = await stripeIntegration.getAccountInfo()

      expect(accountInfo.id).toBe('acct_123456789')
      expect(accountInfo.country).toBe('US')
      expect(accountInfo.defaultCurrency).toBe('usd')
      expect(accountInfo.payoutsEnabled).toBe(true)
      expect(accountInfo.balance.available).toHaveLength(2)
      expect(accountInfo.balance.available[0]).toEqual({
        amount: 100, // Converted from cents
        currency: 'USD'
      })
    })
  })

  describe('validateWebhook', () => {
    beforeEach(async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        webhookSecret: 'whsec_test_secret',
        environment: 'sandbox'
      }
      
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_123' })
      await stripeIntegration.authenticate(credentials)
    })

    it('should validate webhook signatures correctly', () => {
      const payload = { type: 'payment_intent.succeeded' }
      const signature = 'stripe-signature-header'

      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: 'evt_123456789',
        type: 'payment_intent.succeeded'
      })

      const result = stripeIntegration.validateWebhook(payload, signature)

      expect(result).toBe(true)
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_secret'
      )
    })

    it('should reject invalid webhook signatures', () => {
      const payload = { type: 'payment_intent.succeeded' }
      const signature = 'invalid-signature'

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const result = stripeIntegration.validateWebhook(payload, signature)

      expect(result).toBe(false)
    })

    it('should return false when webhook secret is missing', () => {
      // Re-authenticate without webhook secret
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }
      
      stripeIntegration['credentials'] = credentials

      const result = stripeIntegration.validateWebhook({}, 'signature')

      expect(result).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should clear authentication state', async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }
      
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_123' })
      await stripeIntegration.authenticate(credentials)

      await stripeIntegration.disconnect()

      // Verify that subsequent operations fail due to lack of authentication
      await expect(stripeIntegration.getTransactions(new Date(), new Date()))
        .rejects.toThrow('Stripe not authenticated')
    })
  })

  describe('status mapping', () => {
    it('should map Stripe charge statuses correctly', () => {
      const integration = stripeIntegration as any
      
      expect(integration.mapChargeStatus('succeeded')).toBe('completed')
      expect(integration.mapChargeStatus('pending')).toBe('pending')
      expect(integration.mapChargeStatus('failed')).toBe('failed')
      expect(integration.mapChargeStatus('unknown')).toBe('failed')
    })

    it('should map Stripe payout statuses correctly', () => {
      const integration = stripeIntegration as any
      
      expect(integration.mapPayoutStatus('paid')).toBe('completed')
      expect(integration.mapPayoutStatus('pending')).toBe('pending')
      expect(integration.mapPayoutStatus('in_transit')).toBe('pending')
      expect(integration.mapPayoutStatus('canceled')).toBe('failed')
      expect(integration.mapPayoutStatus('failed')).toBe('failed')
      expect(integration.mapPayoutStatus('unknown')).toBe('pending')
    })
  })

  describe('error handling', () => {
    it('should handle network errors during authentication', async () => {
      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }

      mockStripe.accounts.retrieve.mockRejectedValue(new Error('Network error'))

      const result = await stripeIntegration.authenticate(credentials)
      
      expect(result).toBe(false)
    })

    it('should handle rate limiting errors', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-31')

      const credentials: IntegrationCredentials = {
        secretKey: 'sk_test_123456789',
        environment: 'sandbox'
      }
      
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_123' })
      await stripeIntegration.authenticate(credentials)

      const rateLimitError = new Error('Too Many Requests')
      mockStripe.charges.list.mockRejectedValue(rateLimitError)

      await expect(stripeIntegration.getTransactions(startDate, endDate))
        .rejects.toThrow('Too Many Requests')
    })
  })
})