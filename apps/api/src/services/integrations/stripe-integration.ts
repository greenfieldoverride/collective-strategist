import Stripe from 'stripe'
import { PlatformIntegration, IntegrationCredentials, TransactionData } from '../integration-service'

export class StripeIntegration implements PlatformIntegration {
  public readonly platform = 'stripe'
  private stripe: Stripe | null = null
  private credentials: IntegrationCredentials | null = null

  async authenticate(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      if (!credentials.secretKey) {
        throw new Error('Stripe secret key is required')
      }

      this.stripe = new Stripe(credentials.secretKey, {
        apiVersion: '2024-10-28.acacia' as any,
        typescript: true
      })

      this.credentials = credentials

      // Test authentication by making a simple API call
      await this.stripe.accounts.retrieve()
      return true
    } catch (error) {
      console.error('Stripe authentication failed:', error)
      return false
    }
  }

  async getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]> {
    if (!this.stripe) {
      throw new Error('Stripe not authenticated')
    }

    const transactions: TransactionData[] = []

    try {
      // Get charges (successful payments)
      const charges = await this.stripe.charges.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000)
        },
        limit: 100
      })

      for (const charge of charges.data) {
        if (charge.status === 'succeeded') {
          transactions.push({
            externalId: charge.id,
            amount: charge.amount / 100, // Convert from cents
            currency: charge.currency.toUpperCase(),
            description: charge.description || `Stripe charge ${charge.id}`,
            date: new Date(charge.created * 1000),
            status: this.mapChargeStatus(charge.status),
            fees: (charge.application_fee_amount || 0) / 100,
            netAmount: (charge.amount - (charge.application_fee_amount || 0)) / 100,
            counterparty: charge.billing_details?.email || charge.receipt_email,
            category: 'stripe_payment',
            metadata: {
              stripeChargeId: charge.id,
              paymentMethod: charge.payment_method_details?.type,
              receiptUrl: charge.receipt_url,
              refunded: charge.refunded,
              captured: charge.captured
            }
          })
        }
      }

      // Get refunds
      const refunds = await this.stripe.refunds.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000)
        },
        limit: 100
      })

      for (const refund of refunds.data) {
        transactions.push({
          externalId: refund.id,
          amount: -(refund.amount / 100), // Negative for refunds
          currency: refund.currency.toUpperCase(),
          description: `Refund for ${refund.charge}`,
          date: new Date(refund.created * 1000),
          status: 'refunded',
          fees: 0,
          netAmount: -(refund.amount / 100),
          category: 'stripe_refund',
          metadata: {
            stripeRefundId: refund.id,
            stripeChargeId: refund.charge,
            reason: refund.reason
          }
        })
      }

      // Get payouts (transfers to bank account)
      const payouts = await this.stripe.payouts.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000)
        },
        limit: 100
      })

      for (const payout of payouts.data) {
        transactions.push({
          externalId: payout.id,
          amount: -(payout.amount / 100), // Negative for outgoing payouts
          currency: payout.currency.toUpperCase(),
          description: `Payout to ${payout.destination}`,
          date: new Date(payout.created * 1000),
          status: this.mapPayoutStatus(payout.status),
          fees: 0,
          netAmount: -(payout.amount / 100),
          category: 'stripe_payout',
          metadata: {
            stripePayoutId: payout.id,
            destination: payout.destination,
            method: payout.method,
            type: payout.type
          }
        })
      }

    } catch (error) {
      console.error('Error fetching Stripe transactions:', error)
      throw error
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  async getAccountInfo(): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not authenticated')
    }

    try {
      const account = await this.stripe.accounts.retrieve()
      const balance = await this.stripe.balance.retrieve()

      return {
        id: account.id,
        businessProfile: account.business_profile,
        country: account.country,
        defaultCurrency: account.default_currency,
        email: account.email,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        balance: {
          available: balance.available.map(b => ({
            amount: b.amount / 100,
            currency: b.currency.toUpperCase()
          })),
          pending: balance.pending.map(b => ({
            amount: b.amount / 100,
            currency: b.currency.toUpperCase()
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching Stripe account info:', error)
      throw error
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    if (!this.stripe || !this.credentials?.webhookSecret) {
      return false
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.credentials.webhookSecret
      )
      return true
    } catch (error) {
      console.error('Stripe webhook validation failed:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.stripe = null
    this.credentials = null
  }

  private mapChargeStatus(stripeStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'completed'
      case 'pending':
        return 'pending'
      case 'failed':
        return 'failed'
      default:
        return 'failed'
    }
  }

  private mapPayoutStatus(stripeStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (stripeStatus) {
      case 'paid':
        return 'completed'
      case 'pending':
        return 'pending'
      case 'in_transit':
        return 'pending'
      case 'canceled':
      case 'failed':
        return 'failed'
      default:
        return 'pending'
    }
  }
}