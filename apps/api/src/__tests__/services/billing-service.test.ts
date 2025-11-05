import { Pool } from 'pg'
import { BillingService } from '../../services/billing-service'
import { UserService } from '../../services/user-service'
import { lemonSqueezyMock } from '../../services/integrations/lemonsqueezy-mock'

// Mock PostgreSQL
const mockDb = {
  query: jest.fn()
} as unknown as Pool

// Mock UserService
const mockUserService = {
  trackUsage: jest.fn()
} as unknown as UserService

describe('BillingService', () => {
  let billingService: BillingService

  beforeEach(() => {
    billingService = new BillingService(mockDb, mockUserService)
    jest.clearAllMocks()
    lemonSqueezyMock.reset()
  })

  describe('createBillingCustomer', () => {
    it('should create a billing customer successfully', async () => {
      // Mock user query
      ;(mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ email: 'test@example.com', name: 'Test User' }]
        })
        // Mock customer insert
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_cust_123',
            user_id: 'user_123',
            external_customer_id: 'cust_test_456',
            email: 'test@example.com',
            name: 'Test User',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })

      const result = await billingService.createBillingCustomer('user_123')

      expect(result).toEqual({
        id: 'bill_cust_123',
        userId: 'user_123',
        externalCustomerId: 'cust_test_456',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      })

      expect(mockDb.query).toHaveBeenCalledTimes(2)
    })

    it('should throw error if user not found', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await expect(billingService.createBillingCustomer('nonexistent'))
        .rejects.toThrow('User not found')
    })
  })

  describe('getBillingCustomer', () => {
    it('should return billing customer if exists', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'bill_cust_123',
          user_id: 'user_123',
          external_customer_id: 'cust_test_456',
          email: 'test@example.com',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }]
      })

      const result = await billingService.getBillingCustomer('user_123')

      expect(result).toEqual({
        id: 'bill_cust_123',
        userId: 'user_123',
        externalCustomerId: 'cust_test_456',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      })
    })

    it('should return null if customer not found', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      const result = await billingService.getBillingCustomer('user_123')

      expect(result).toBeNull()
    })
  })

  describe('createSubscription', () => {
    it('should create subscription for existing customer', async () => {
      // Mock existing customer
      ;(mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_cust_123',
            user_id: 'user_123',
            external_customer_id: 'cust_test_456',
            email: 'test@example.com',
            name: 'Test User',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_sub_123',
            user_id: 'user_123',
            external_subscription_id: 'sub_test_456',
            status: 'active',
            plan_name: 'pro',
            amount: 2900,
            currency: 'USD',
            interval_type: 'month',
            current_period_start: '2023-01-01T00:00:00Z',
            current_period_end: '2023-02-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })

      const result = await billingService.createSubscription({
        userId: 'user_123',
        planName: 'pro',
        amount: 2900
      })

      expect(result.planName).toBe('pro')
      expect(result.amount).toBe(2900)
      expect(result.status).toBe('active')
      expect(mockUserService.trackUsage).toHaveBeenCalledWith('user_123', 'ventures_created')
    })

    it('should create customer if none exists', async () => {
      // Mock no existing customer
      ;(mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        // Mock user query for customer creation
        .mockResolvedValueOnce({
          rows: [{ email: 'test@example.com', name: 'Test User' }]
        })
        // Mock customer insert
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_cust_123',
            user_id: 'user_123',
            external_customer_id: 'cust_test_456',
            email: 'test@example.com',
            name: 'Test User',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_sub_123',
            user_id: 'user_123',
            external_subscription_id: 'sub_test_456',
            status: 'active',
            plan_name: 'pro',
            amount: 2900,
            currency: 'USD',
            interval_type: 'month',
            current_period_start: '2023-01-01T00:00:00Z',
            current_period_end: '2023-02-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })

      const result = await billingService.createSubscription({
        userId: 'user_123',
        planName: 'pro',
        amount: 2900
      })

      expect(result.planName).toBe('pro')
      expect(mockDb.query).toHaveBeenCalledTimes(4) // Check customer, create user query, create customer, create subscription
    })
  })

  describe('getSubscription', () => {
    it('should return user subscription', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'bill_sub_123',
          user_id: 'user_123',
          external_subscription_id: 'sub_test_456',
          status: 'active',
          plan_name: 'pro',
          amount: 2900,
          currency: 'USD',
          interval_type: 'month',
          current_period_start: '2023-01-01T00:00:00Z',
          current_period_end: '2023-02-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }]
      })

      const result = await billingService.getSubscription('user_123')

      expect(result).toEqual({
        id: 'bill_sub_123',
        userId: 'user_123',
        externalSubscriptionId: 'sub_test_456',
        status: 'active',
        planName: 'pro',
        amount: 2900,
        currency: 'USD',
        interval: 'month',
        currentPeriodStart: '2023-01-01T00:00:00Z',
        currentPeriodEnd: '2023-02-01T00:00:00Z',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      })
    })

    it('should return null if no subscription', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      const result = await billingService.getSubscription('user_123')

      expect(result).toBeNull()
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel existing subscription', async () => {
      // Mock get subscription
      ;(mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_sub_123',
            user_id: 'user_123',
            external_subscription_id: 'sub_test_456',
            status: 'active',
            plan_name: 'pro',
            amount: 2900,
            currency: 'USD',
            interval_type: 'month',
            current_period_start: '2023-01-01T00:00:00Z',
            current_period_end: '2023-02-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })
        // Mock update subscription status
        .mockResolvedValueOnce({ rows: [] })
        // Mock get updated subscription
        .mockResolvedValueOnce({
          rows: [{
            id: 'bill_sub_123',
            user_id: 'user_123',
            external_subscription_id: 'sub_test_456',
            status: 'cancelled',
            plan_name: 'pro',
            amount: 2900,
            currency: 'USD',
            interval_type: 'month',
            current_period_start: '2023-01-01T00:00:00Z',
            current_period_end: '2023-02-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        })

      const result = await billingService.cancelSubscription('user_123')

      expect(result?.status).toBe('cancelled')
      expect(mockDb.query).toHaveBeenCalledTimes(3)
    })

    it('should throw error if no subscription found', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await expect(billingService.cancelSubscription('user_123'))
        .rejects.toThrow('No subscription found')
    })
  })

  describe('createCheckoutUrl', () => {
    it('should create checkout URL', async () => {
      const url = await billingService.createCheckoutUrl('pro', 2900, 'user_123')

      expect(url).toContain('https://checkout.lemonsqueezy.com/test/')
      expect(url).toContain('user_id=user_123')
    })

    it('should create checkout URL without user ID', async () => {
      const url = await billingService.createCheckoutUrl('pro', 2900)

      expect(url).toContain('https://checkout.lemonsqueezy.com/test/')
      expect(url).not.toContain('user_id=')
    })
  })

  describe('getUserSubscriptionStatus', () => {
    it('should return subscription status', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'bill_sub_123',
          user_id: 'user_123',
          external_subscription_id: 'sub_test_456',
          status: 'active',
          plan_name: 'pro',
          amount: 2900,
          currency: 'USD',
          interval_type: 'month',
          current_period_start: '2023-01-01T00:00:00Z',
          current_period_end: '2023-02-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }]
      })

      const status = await billingService.getUserSubscriptionStatus('user_123')

      expect(status).toBe('active')
    })

    it('should return none if no subscription', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      const status = await billingService.getUserSubscriptionStatus('user_123')

      expect(status).toBe('none')
    })

    it('should map paused to cancelled', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          status: 'paused'
        }]
      })

      const status = await billingService.getUserSubscriptionStatus('user_123')

      expect(status).toBe('cancelled')
    })
  })

  describe('processWebhook', () => {
    it('should handle subscription.created event', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await billingService.processWebhook('subscription.created', {
        subscriptionId: 'sub_123'
      })

      expect(consoleSpy).toHaveBeenCalledWith('Subscription created:', 'sub_123')
      consoleSpy.mockRestore()
    })

    it('should handle subscription.updated event', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await billingService.processWebhook('subscription.updated', {
        subscriptionId: 'sub_123',
        status: 'active'
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE billing_subscriptions'),
        ['active', 'sub_123']
      )
    })

    it('should handle payment.succeeded event', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await billingService.processWebhook('payment.succeeded', {
        subscriptionId: 'sub_123',
        amount: 2900
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE billing_subscriptions'),
        ['active', 'sub_123']
      )
    })

    it('should handle payment.failed event', async () => {
      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await billingService.processWebhook('payment.failed', {
        subscriptionId: 'sub_123',
        failureReason: 'insufficient_funds'
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE billing_subscriptions'),
        ['past_due', 'sub_123']
      )
    })
  })

  describe('Mock integration', () => {
    it('should get mock account info', async () => {
      const info = await billingService.getMockAccountInfo()

      expect(info).toEqual({
        id: 'store_test_123',
        name: 'Test Store',
        currency: 'USD',
        country: 'US',
        testMode: true,
        customersCount: 1, // Has test customer
        subscriptionsCount: 1 // Has test subscription
      })
    })

    it('should reset mock data', async () => {
      // Add some data
      await lemonSqueezyMock.createCustomer('new@example.com', 'New User')
      
      expect(lemonSqueezyMock.getAllCustomers()).toHaveLength(2) // Test + new
      
      await billingService.resetMockData()
      
      expect(lemonSqueezyMock.getAllCustomers()).toHaveLength(1) // Just test data
    })
  })
})