import { Pool } from 'pg'
import { UserService } from './user-service'
import { lemonSqueezyMock, MockLemonSqueezyCustomer, MockLemonSqueezySubscription } from './integrations/lemonsqueezy-mock'

export interface BillingCustomer {
  id: string
  userId: string
  externalCustomerId: string
  email: string
  name?: string
  createdAt: string
  updatedAt: string
}

export interface BillingSubscription {
  id: string
  userId: string
  externalSubscriptionId: string
  status: 'active' | 'cancelled' | 'paused' | 'past_due'
  planName: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
  updatedAt: string
}

export interface CreateSubscriptionRequest {
  userId: string
  planName: string
  amount: number
  currency?: string
  interval?: 'month' | 'year'
}

export class BillingService {
  private useMock: boolean = process.env.NODE_ENV !== 'production'

  constructor(
    private db: Pool,
    private userService: UserService
  ) {}

  // Customer Management
  async createBillingCustomer(userId: string): Promise<BillingCustomer> {
    try {
      // Get user details
      const userResult = await this.db.query(
        'SELECT email, name FROM users WHERE id = $1 AND is_active = true',
        [userId]
      )

      if (userResult.rows.length === 0) {
        throw new Error('User not found')
      }

      const user = userResult.rows[0]

      // Create customer in payment provider
      let externalCustomer: MockLemonSqueezyCustomer
      if (this.useMock) {
        externalCustomer = await lemonSqueezyMock.createCustomer(user.email, user.name)
      } else {
        // TODO: Create real LemonSqueezy customer
        throw new Error('Real LemonSqueezy integration not implemented yet')
      }

      // Store in our database
      const result = await this.db.query(`
        INSERT INTO billing_customers (user_id, external_customer_id, email, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, user_id, external_customer_id, email, name, created_at, updated_at
      `, [userId, externalCustomer.id, user.email, user.name])

      const customer = result.rows[0]
      return {
        id: customer.id,
        userId: customer.user_id,
        externalCustomerId: customer.external_customer_id,
        email: customer.email,
        name: customer.name,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at
      }

    } catch (error) {
      console.error('Error creating billing customer:', error)
      throw error
    }
  }

  async getBillingCustomer(userId: string): Promise<BillingCustomer | null> {
    try {
      const result = await this.db.query(
        'SELECT id, user_id, external_customer_id, email, name, created_at, updated_at FROM billing_customers WHERE user_id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const customer = result.rows[0]
      return {
        id: customer.id,
        userId: customer.user_id,
        externalCustomerId: customer.external_customer_id,
        email: customer.email,
        name: customer.name,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at
      }
    } catch (error) {
      console.error('Error getting billing customer:', error)
      return null
    }
  }

  // Subscription Management
  async createSubscription(request: CreateSubscriptionRequest): Promise<BillingSubscription> {
    try {
      // Ensure billing customer exists
      let customer = await this.getBillingCustomer(request.userId)
      if (!customer) {
        customer = await this.createBillingCustomer(request.userId)
      }

      // Create subscription in payment provider
      let externalSubscription: MockLemonSqueezySubscription
      if (this.useMock) {
        externalSubscription = await lemonSqueezyMock.createSubscription(
          customer.externalCustomerId,
          `product_${request.planName}`,
          request.amount
        )
      } else {
        // TODO: Create real LemonSqueezy subscription
        throw new Error('Real LemonSqueezy integration not implemented yet')
      }

      // Store in our database
      const result = await this.db.query(`
        INSERT INTO billing_subscriptions (
          user_id, external_subscription_id, status, plan_name, amount, currency, 
          interval_type, current_period_start, current_period_end, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, user_id, external_subscription_id, status, plan_name, amount, 
                  currency, interval_type, current_period_start, current_period_end, 
                  created_at, updated_at
      `, [
        request.userId,
        externalSubscription.id,
        externalSubscription.status,
        request.planName,
        request.amount,
        request.currency || 'USD',
        request.interval || 'month',
        externalSubscription.currentPeriodStart,
        externalSubscription.currentPeriodEnd
      ])

      const subscription = result.rows[0]
      
      // Track subscription creation
      await this.userService.trackUsage(request.userId, 'ventures_created') // Using existing metric

      return this.formatSubscription(subscription)

    } catch (error) {
      console.error('Error creating subscription:', error)
      throw error
    }
  }

  async getSubscription(userId: string): Promise<BillingSubscription | null> {
    try {
      const result = await this.db.query(`
        SELECT id, user_id, external_subscription_id, status, plan_name, amount, 
               currency, interval_type, current_period_start, current_period_end, 
               created_at, updated_at
        FROM billing_subscriptions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId])

      if (result.rows.length === 0) {
        return null
      }

      return this.formatSubscription(result.rows[0])
    } catch (error) {
      console.error('Error getting subscription:', error)
      return null
    }
  }

  async updateSubscriptionStatus(externalSubscriptionId: string, status: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE billing_subscriptions 
        SET status = $1, updated_at = NOW()
        WHERE external_subscription_id = $2
      `, [status, externalSubscriptionId])
    } catch (error) {
      console.error('Error updating subscription status:', error)
      throw error
    }
  }

  async cancelSubscription(userId: string): Promise<BillingSubscription | null> {
    try {
      const subscription = await this.getSubscription(userId)
      if (!subscription) {
        throw new Error('No subscription found')
      }

      // Cancel in payment provider
      if (this.useMock) {
        await lemonSqueezyMock.cancelSubscription(subscription.externalSubscriptionId)
      } else {
        // TODO: Cancel real LemonSqueezy subscription
        throw new Error('Real LemonSqueezy integration not implemented yet')
      }

      // Update in our database
      await this.updateSubscriptionStatus(subscription.externalSubscriptionId, 'cancelled')

      return await this.getSubscription(userId)
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }

  // Checkout/Payment Links
  async createCheckoutUrl(planName: string, amount: number, userId?: string): Promise<string> {
    try {
      if (this.useMock) {
        const checkout = await lemonSqueezyMock.createCheckout(
          `product_${planName}`,
          amount,
          'USD'
        )
        
        // Add user context to checkout URL if provided
        if (userId) {
          return `${checkout.url}?user_id=${userId}`
        }
        
        return checkout.url
      } else {
        // TODO: Create real LemonSqueezy checkout
        throw new Error('Real LemonSqueezy integration not implemented yet')
      }
    } catch (error) {
      console.error('Error creating checkout URL:', error)
      throw error
    }
  }

  // Webhook Processing
  async processWebhook(eventType: string, data: any): Promise<void> {
    try {
      switch (eventType) {
        case 'subscription.created':
          await this.handleSubscriptionCreated(data)
          break
        
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(data)
          break
          
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(data)
          break
          
        case 'payment.succeeded':
          await this.handlePaymentSucceeded(data)
          break
          
        case 'payment.failed':
          await this.handlePaymentFailed(data)
          break
          
        default:
          console.log('Unknown webhook event:', eventType, data)
      }
    } catch (error) {
      console.error('Error processing webhook:', error)
      throw error
    }
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    console.log('Subscription created:', data.subscriptionId)
    // Subscription already created via our API, just update if needed
  }

  private async handleSubscriptionUpdated(data: any): Promise<void> {
    console.log('Subscription updated:', data.subscriptionId, data.status)
    await this.updateSubscriptionStatus(data.subscriptionId, data.status)
  }

  private async handleSubscriptionCancelled(data: any): Promise<void> {
    console.log('Subscription cancelled:', data.subscriptionId)
    await this.updateSubscriptionStatus(data.subscriptionId, 'cancelled')
  }

  private async handlePaymentSucceeded(data: any): Promise<void> {
    console.log('Payment succeeded:', data.subscriptionId, data.amount)
    // Could log payment success, update subscription status, etc.
    await this.updateSubscriptionStatus(data.subscriptionId, 'active')
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    console.log('Payment failed:', data.subscriptionId, data.failureReason)
    await this.updateSubscriptionStatus(data.subscriptionId, 'past_due')
  }

  // Utility methods
  async getUserSubscriptionStatus(userId: string): Promise<'none' | 'active' | 'cancelled' | 'past_due'> {
    const subscription = await this.getSubscription(userId)
    if (!subscription) return 'none'
    
    // Map paused to cancelled for simplified status
    if (subscription.status === 'paused') return 'cancelled'
    
    return subscription.status as 'active' | 'cancelled' | 'past_due'
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const status = await getUserSubscriptionStatus(userId)
    return status === 'active'
  }

  private formatSubscription(dbRow: any): BillingSubscription {
    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      externalSubscriptionId: dbRow.external_subscription_id,
      status: dbRow.status,
      planName: dbRow.plan_name,
      amount: dbRow.amount,
      currency: dbRow.currency,
      interval: dbRow.interval_type,
      currentPeriodStart: dbRow.current_period_start,
      currentPeriodEnd: dbRow.current_period_end,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    }
  }

  // Test helpers
  async resetMockData(): Promise<void> {
    if (this.useMock) {
      lemonSqueezyMock.reset()
    }
  }

  async getMockAccountInfo(): Promise<any> {
    if (this.useMock) {
      return await lemonSqueezyMock.getAccountInfo()
    }
    return null
  }
}

// Helper function for getUserSubscriptionStatus
async function getUserSubscriptionStatus(userId: string): Promise<'none' | 'active' | 'cancelled' | 'past_due'> {
  // This is a placeholder - actual implementation would be in the class method above
  return 'none'
}