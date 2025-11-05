import { 
  lemonSqueezySetup,
  getCustomer,
  createCustomer,
  updateCustomer,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  createCheckout,
  listProducts,
  createWebhook
} from '@lemonsqueezy/lemonsqueezy.js'
import { PlatformIntegration, IntegrationCredentials, TransactionData } from '../integration-service'
import crypto from 'crypto'

export interface LemonSqueezyCredentials extends IntegrationCredentials {
  apiKey: string
  storeId: string
  webhookSecret?: string
  testMode?: boolean
}

export interface LemonSqueezyCustomer {
  id: string
  storeId: string
  name: string
  email: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface LemonSqueezySubscription {
  id: string
  storeId: string
  customerId: string
  productId: string
  variantId: string
  status: 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'
  userEmail: string
  renewsAt: string
  endsAt?: string
  createdAt: string
  updatedAt: string
  testMode: boolean
}

export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string
    test_mode: boolean
    webhook_id: string
    custom_data?: Record<string, any>
  }
  data: {
    type: string
    id: string
    attributes: Record<string, any>
    relationships?: Record<string, any>
  }
}

export class LemonSqueezyIntegration implements PlatformIntegration {
  public readonly platform = 'lemonsqueezy'
  private credentials: LemonSqueezyCredentials | null = null
  private isTestMode: boolean = false

  async authenticate(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      const lsCredentials = credentials as LemonSqueezyCredentials
      
      if (!lsCredentials.apiKey) {
        throw new Error('LemonSqueezy API key is required')
      }

      if (!lsCredentials.storeId) {
        throw new Error('LemonSqueezy store ID is required')
      }

      // Set up the LemonSqueezy SDK
      lemonSqueezySetup({
        apiKey: lsCredentials.apiKey,
        onError: (error) => {
          console.error('LemonSqueezy API Error:', error)
        }
      })

      this.credentials = lsCredentials
      this.isTestMode = lsCredentials.testMode || false

      // Test authentication by fetching store products
      const products = await listProducts({
        filter: { storeId: lsCredentials.storeId },
        page: { size: 1 }
      })

      if (products.error) {
        throw new Error(`LemonSqueezy authentication failed: ${products.error.message}`)
      }

      return true
    } catch (error) {
      console.error('LemonSqueezy authentication failed:', error)
      return false
    }
  }

  async getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]> {
    if (!this.credentials?.storeId) {
      throw new Error('LemonSqueezy not authenticated')
    }

    // For now, return empty array - we'll implement this after basic integration works
    // This method would typically fetch subscription invoices and orders
    console.log(`Fetching LemonSqueezy transactions from ${startDate} to ${endDate}`)
    return []
  }

  async getAccountInfo(): Promise<any> {
    if (!this.credentials?.storeId) {
      throw new Error('LemonSqueezy not authenticated')
    }

    try {
      // Get products to verify store access
      const productsResponse = await listProducts({
        filter: { storeId: this.credentials.storeId }
      })

      if (productsResponse.error) {
        throw new Error(`Failed to fetch account info: ${productsResponse.error.message}`)
      }

      const products = productsResponse.data?.data || []

      return {
        storeId: this.credentials.storeId,
        platform: 'lemonsqueezy',
        testMode: this.isTestMode,
        productsCount: products.length,
        products: products.map((p: any) => ({
          id: p.id,
          name: p.attributes.name,
          status: p.attributes.status,
          description: p.attributes.description
        }))
      }
    } catch (error) {
      console.error('Error fetching LemonSqueezy account info:', error)
      throw error
    }
  }

  // Customer management
  async createCustomer(email: string, name?: string): Promise<LemonSqueezyCustomer> {
    if (!this.credentials?.storeId) {
      throw new Error('LemonSqueezy not authenticated')
    }

    try {
      const response = await createCustomer(this.credentials.storeId, {
        name: name || '',
        email
      })

      if (response.error) {
        throw new Error(`Failed to create customer: ${response.error.message}`)
      }

      return this.formatCustomer(response.data!)
    } catch (error) {
      console.error('Error creating LemonSqueezy customer:', error)
      throw error
    }
  }

  async getCustomerById(customerId: string): Promise<LemonSqueezyCustomer | null> {
    try {
      const response = await getCustomer(customerId)

      if (response.error) {
        if ((response.error as any).status === 404) {
          return null
        }
        throw new Error(`Failed to get customer: ${response.error.message}`)
      }

      return this.formatCustomer(response.data!)
    } catch (error) {
      console.error('Error getting LemonSqueezy customer:', error)
      return null
    }
  }

  async updateCustomer(customerId: string, updates: { name?: string; email?: string }): Promise<LemonSqueezyCustomer> {
    try {
      const response = await updateCustomer(customerId, updates)

      if (response.error) {
        throw new Error(`Failed to update customer: ${response.error.message}`)
      }

      return this.formatCustomer(response.data!)
    } catch (error) {
      console.error('Error updating LemonSqueezy customer:', error)
      throw error
    }
  }

  // Subscription management
  async getSubscriptionById(subscriptionId: string): Promise<LemonSqueezySubscription | null> {
    try {
      const response = await getSubscription(subscriptionId)

      if (response.error) {
        if ((response.error as any).status === 404) {
          return null
        }
        throw new Error(`Failed to get subscription: ${response.error.message}`)
      }

      return this.formatSubscription(response.data!)
    } catch (error) {
      console.error('Error getting LemonSqueezy subscription:', error)
      return null
    }
  }

  async updateSubscription(subscriptionId: string, updates: any): Promise<LemonSqueezySubscription> {
    try {
      const response = await updateSubscription(subscriptionId, updates)

      if (response.error) {
        throw new Error(`Failed to update subscription: ${response.error.message}`)
      }

      return this.formatSubscription(response.data!)
    } catch (error) {
      console.error('Error updating LemonSqueezy subscription:', error)
      throw error
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<LemonSqueezySubscription> {
    try {
      const response = await cancelSubscription(subscriptionId)

      if (response.error) {
        throw new Error(`Failed to cancel subscription: ${response.error.message}`)
      }

      return this.formatSubscription(response.data!)
    } catch (error) {
      console.error('Error canceling LemonSqueezy subscription:', error)
      throw error
    }
  }

  // Checkout creation
  async createCheckout(variantId: string, options?: any): Promise<{ checkoutUrl: string; id: string }> {
    if (!this.credentials?.storeId) {
      throw new Error('LemonSqueezy not authenticated')
    }

    try {
      const response = await createCheckout(this.credentials.storeId, variantId, options)

      if (response.error) {
        throw new Error(`Failed to create checkout: ${response.error.message}`)
      }

      const checkout = response.data!
      return {
        id: checkout.data.id,
        checkoutUrl: checkout.data.attributes.url
      }
    } catch (error) {
      console.error('Error creating LemonSqueezy checkout:', error)
      throw error
    }
  }

  // Webhook management
  async createWebhook(url: string, events: string[], secret?: string): Promise<{ id: string; url: string; secret: string }> {
    if (!this.credentials?.storeId) {
      throw new Error('LemonSqueezy not authenticated')
    }

    try {
      const webhookSecret = secret || this.generateWebhookSecret()
      
      const response = await createWebhook(this.credentials.storeId, {
        url,
        events: events as any[],
        secret: webhookSecret
      })

      if (response.error) {
        throw new Error(`Failed to create webhook: ${response.error.message}`)
      }

      const webhook = response.data!
      return {
        id: webhook.data.id,
        url: webhook.data.attributes.url,
        secret: webhookSecret
      }
    } catch (error) {
      console.error('Error creating LemonSqueezy webhook:', error)
      throw error
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    // LemonSqueezy webhook validation
    // The signature is in the X-Signature header as HMAC SHA256
    if (!this.credentials?.webhookSecret) {
      return false
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.credentials.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      console.error('LemonSqueezy webhook validation failed:', error)
      return false
    }
  }

  // Process webhook events
  processWebhookEvent(event: LemonSqueezyWebhookEvent): { type: string; data: any } {
    const { meta, data } = event

    switch (meta.event_name) {
      case 'subscription_created':
        return {
          type: 'subscription.created',
          data: {
            subscriptionId: data.id,
            customerId: data.attributes.customer_id,
            status: data.attributes.status,
            subscription: this.formatSubscription(data)
          }
        }

      case 'subscription_updated':
        return {
          type: 'subscription.updated',
          data: {
            subscriptionId: data.id,
            customerId: data.attributes.customer_id,
            status: data.attributes.status,
            subscription: this.formatSubscription(data)
          }
        }

      case 'subscription_cancelled':
        return {
          type: 'subscription.cancelled',
          data: {
            subscriptionId: data.id,
            customerId: data.attributes.customer_id,
            cancelledAt: data.attributes.ends_at,
            subscription: this.formatSubscription(data)
          }
        }

      case 'subscription_payment_success':
        return {
          type: 'payment.succeeded',
          data: {
            subscriptionId: data.attributes.subscription_id,
            amount: data.attributes.subtotal,
            currency: data.attributes.currency,
            invoiceId: data.id
          }
        }

      case 'subscription_payment_failed':
        return {
          type: 'payment.failed',
          data: {
            subscriptionId: data.attributes.subscription_id,
            amount: data.attributes.subtotal,
            currency: data.attributes.currency,
            failureReason: data.attributes.billing_reason
          }
        }

      case 'order_created':
        return {
          type: 'order.created',
          data: {
            orderId: data.id,
            customerId: data.attributes.customer_id,
            amount: data.attributes.subtotal,
            currency: data.attributes.currency,
            status: data.attributes.status
          }
        }

      default:
        return {
          type: 'unknown',
          data: { event: meta.event_name, payload: data }
        }
    }
  }

  async disconnect(): Promise<void> {
    this.credentials = null
    this.isTestMode = false
  }

  // Helper methods
  private formatCustomer(customerData: any): LemonSqueezyCustomer {
    return {
      id: customerData.id,
      storeId: customerData.attributes.store_id,
      name: customerData.attributes.name,
      email: customerData.attributes.email,
      status: customerData.attributes.status,
      createdAt: customerData.attributes.created_at,
      updatedAt: customerData.attributes.updated_at
    }
  }

  private formatSubscription(subscriptionData: any): LemonSqueezySubscription {
    return {
      id: subscriptionData.id,
      storeId: subscriptionData.attributes.store_id,
      customerId: subscriptionData.attributes.customer_id,
      productId: subscriptionData.attributes.product_id,
      variantId: subscriptionData.attributes.variant_id,
      status: subscriptionData.attributes.status,
      userEmail: subscriptionData.attributes.user_email,
      renewsAt: subscriptionData.attributes.renews_at,
      endsAt: subscriptionData.attributes.ends_at,
      createdAt: subscriptionData.attributes.created_at,
      updatedAt: subscriptionData.attributes.updated_at,
      testMode: subscriptionData.attributes.test_mode
    }
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}