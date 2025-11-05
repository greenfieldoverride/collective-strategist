// Simple LemonSqueezy mock for local development and testing
// No external dependencies - just pure TypeScript

export interface MockLemonSqueezyCustomer {
  id: string
  email: string
  name: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface MockLemonSqueezySubscription {
  id: string
  customerId: string
  productId: string
  status: 'active' | 'cancelled' | 'paused' | 'past_due'
  currentPeriodStart: string
  currentPeriodEnd: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  createdAt: string
  updatedAt: string
}

export interface MockLemonSqueezyCheckout {
  id: string
  url: string
  status: 'open' | 'expired'
  productId: string
  amount: number
  currency: string
  createdAt: string
}

export class LemonSqueezyMock {
  private customers: Map<string, MockLemonSqueezyCustomer> = new Map()
  private subscriptions: Map<string, MockLemonSqueezySubscription> = new Map()
  private checkouts: Map<string, MockLemonSqueezyCheckout> = new Map()
  private webhookSecret: string = 'test_webhook_secret_123'

  constructor() {
    // Initialize with some test data
    this.setupTestData()
  }

  // Customer methods
  async createCustomer(email: string, name?: string): Promise<MockLemonSqueezyCustomer> {
    const customer: MockLemonSqueezyCustomer = {
      id: `cust_${Date.now()}`,
      email,
      name: name || 'Test User',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    this.customers.set(customer.id, customer)
    return customer
  }

  async getCustomer(customerId: string): Promise<MockLemonSqueezyCustomer | null> {
    return this.customers.get(customerId) || null
  }

  async updateCustomer(customerId: string, updates: { name?: string; email?: string }): Promise<MockLemonSqueezyCustomer | null> {
    const customer = this.customers.get(customerId)
    if (!customer) return null

    const updated = {
      ...customer,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    this.customers.set(customerId, updated)
    return updated
  }

  // Subscription methods
  async createSubscription(customerId: string, productId: string, amount: number): Promise<MockLemonSqueezySubscription> {
    const subscription: MockLemonSqueezySubscription = {
      id: `sub_${Date.now()}`,
      customerId,
      productId,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount,
      currency: 'USD',
      interval: 'month',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    this.subscriptions.set(subscription.id, subscription)
    return subscription
  }

  async getSubscription(subscriptionId: string): Promise<MockLemonSqueezySubscription | null> {
    return this.subscriptions.get(subscriptionId) || null
  }

  async updateSubscription(subscriptionId: string, updates: { status?: string }): Promise<MockLemonSqueezySubscription | null> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return null

    const updated = {
      ...subscription,
      ...updates,
      updatedAt: new Date().toISOString()
    } as MockLemonSqueezySubscription
    
    this.subscriptions.set(subscriptionId, updated)
    return updated
  }

  async cancelSubscription(subscriptionId: string): Promise<MockLemonSqueezySubscription | null> {
    return this.updateSubscription(subscriptionId, { status: 'cancelled' })
  }

  async getCustomerSubscriptions(customerId: string): Promise<MockLemonSqueezySubscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.customerId === customerId)
  }

  // Checkout methods
  async createCheckout(productId: string, amount: number, currency: string = 'USD'): Promise<MockLemonSqueezyCheckout> {
    const checkout: MockLemonSqueezyCheckout = {
      id: `checkout_${Date.now()}`,
      url: `https://checkout.lemonsqueezy.com/test/${Date.now()}`,
      status: 'open',
      productId,
      amount,
      currency,
      createdAt: new Date().toISOString()
    }
    
    this.checkouts.set(checkout.id, checkout)
    return checkout
  }

  async getCheckout(checkoutId: string): Promise<MockLemonSqueezyCheckout | null> {
    return this.checkouts.get(checkoutId) || null
  }

  // Webhook methods
  validateWebhook(payload: string, signature: string): boolean {
    // Simple mock validation - in real implementation, use crypto.createHmac
    return signature === `sha256=${this.webhookSecret}`
  }

  generateWebhookSignature(payload: string): string {
    // Simple mock signature
    return `sha256=${this.webhookSecret}`
  }

  createWebhookEvent(type: string, data: any): any {
    return {
      meta: {
        event_name: type,
        test_mode: true,
        webhook_id: 'webhook_test_123',
        timestamp: new Date().toISOString()
      },
      data: {
        type: type.split('.')[0],
        id: data.id,
        attributes: data
      }
    }
  }

  // Utility methods
  async getAccountInfo(): Promise<any> {
    return {
      id: 'store_test_123',
      name: 'Test Store',
      currency: 'USD',
      country: 'US',
      testMode: true,
      customersCount: this.customers.size,
      subscriptionsCount: this.subscriptions.size
    }
  }

  private setupTestData(): void {
    // Create a test customer
    const testCustomer: MockLemonSqueezyCustomer = {
      id: 'cust_test_123',
      email: 'test@example.com',
      name: 'Test Customer',
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.customers.set(testCustomer.id, testCustomer)

    // Create a test subscription
    const testSubscription: MockLemonSqueezySubscription = {
      id: 'sub_test_123',
      customerId: 'cust_test_123',
      productId: 'prod_liberation_pro',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 2900, // $29.00
      currency: 'USD',
      interval: 'month',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.subscriptions.set(testSubscription.id, testSubscription)
  }

  // Test helpers
  reset(): void {
    this.customers.clear()
    this.subscriptions.clear()
    this.checkouts.clear()
    this.setupTestData()
  }

  getAllCustomers(): MockLemonSqueezyCustomer[] {
    return Array.from(this.customers.values())
  }

  getAllSubscriptions(): MockLemonSqueezySubscription[] {
    return Array.from(this.subscriptions.values())
  }

  getAllCheckouts(): MockLemonSqueezyCheckout[] {
    return Array.from(this.checkouts.values())
  }
}

// Global mock instance for testing
export const lemonSqueezyMock = new LemonSqueezyMock()