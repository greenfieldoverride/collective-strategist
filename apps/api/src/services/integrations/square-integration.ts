import { PlatformIntegration, IntegrationCredentials, TransactionData } from '../integration-service'

interface SquarePayment {
  id: string
  amount_money: {
    amount: number
    currency: string
  }
  app_fee_money?: {
    amount: number
    currency: string
  }
  approved_money?: {
    amount: number
    currency: string
  }
  card_details?: {
    status: string
    card: {
      card_brand: string
      last_4: string
      exp_month?: number
      exp_year?: number
    }
    entry_method: string
  }
  cash_details?: {
    buyer_tendered_money: {
      amount: number
      currency: string
    }
    change_back_money: {
      amount: number
      currency: string
    }
  }
  created_at: string
  updated_at: string
  location_id: string
  order_id?: string
  receipt_number?: string
  receipt_url?: string
  risk_evaluation?: {
    created_at: string
    risk_level: 'PENDING' | 'NORMAL' | 'MODERATE' | 'HIGH'
  }
  status: 'APPROVED' | 'PENDING' | 'COMPLETED' | 'CANCELED' | 'FAILED'
  delay_duration?: string
  source_type: 'CARD' | 'CASH' | 'THIRD_PARTY' | 'SQUARE_GIFT_CARD' | 'BANK_ACCOUNT' | 'WALLET' | 'BUY_NOW_PAY_LATER'
  customer_id?: string
  reference_id?: string
  note?: string
}

interface SquareRefund {
  id: string
  location_id: string
  transaction_id: string
  tender_id: string
  created_at: string
  reason: string
  amount_money: {
    amount: number
    currency: string
  }
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED'
  processing_fee_money?: {
    amount: number
    currency: string
  }
}

interface SquareOrder {
  id: string
  location_id: string
  created_at: string
  updated_at: string
  state: 'OPEN' | 'COMPLETED' | 'CANCELED'
  net_amounts: {
    total_money: {
      amount: number
      currency: string
    }
    tax_money: {
      amount: number
      currency: string
    }
    discount_money: {
      amount: number
      currency: string
    }
    tip_money: {
      amount: number
      currency: string
    }
    service_charge_money: {
      amount: number
      currency: string
    }
  }
  source: {
    name: string
  }
  customer_id?: string
  reference_id?: string
}

export class SquareIntegration implements PlatformIntegration {
  public readonly platform = 'square'
  private accessToken: string | null = null
  private credentials: IntegrationCredentials | null = null
  private baseUrl: string = ''
  private locationId: string | null = null

  async authenticate(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      if (!credentials.accessToken) {
        throw new Error('Square access token is required')
      }

      this.credentials = credentials
      this.accessToken = credentials.accessToken
      this.baseUrl = credentials.environment === 'production' 
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com'

      // Test authentication by getting locations
      const response = await fetch(`${this.baseUrl}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        }
      })

      if (!response.ok) {
        throw new Error(`Square authentication failed: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.locations || data.locations.length === 0) {
        throw new Error('No Square locations found')
      }

      // Use the first location
      this.locationId = data.locations[0].id

      return true
    } catch (error) {
      console.error('Square authentication failed:', error)
      return false
    }
  }

  async getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]> {
    if (!this.accessToken || !this.locationId) {
      throw new Error('Square not authenticated')
    }

    const transactions: TransactionData[] = []

    try {
      // Get payments
      await this.fetchPayments(startDate, endDate, transactions)
      
      // Get refunds
      await this.fetchRefunds(startDate, endDate, transactions)

    } catch (error) {
      console.error('Error fetching Square transactions:', error)
      throw error
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  private async fetchPayments(startDate: Date, endDate: Date, transactions: TransactionData[]): Promise<void> {
    const requestBody = {
      begin_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      location_id: this.locationId,
      limit: 500
    }

    let cursor: string | undefined
    
    do {
      const body = cursor ? { ...requestBody, cursor } : requestBody
      
      const response = await fetch(`${this.baseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Square payments: ${response.statusText}`)
      }

      const data = await response.json()
      
      for (const payment of data.payments || []) {
        if (payment.status === 'COMPLETED' || payment.status === 'APPROVED') {
          const amount = payment.amount_money.amount / 100 // Convert from cents
          const fees = (payment.app_fee_money?.amount || 0) / 100
          
          transactions.push({
            externalId: payment.id,
            amount: amount,
            currency: payment.amount_money.currency,
            description: payment.note || `Square payment ${payment.receipt_number || payment.id}`,
            date: new Date(payment.created_at),
            status: this.mapPaymentStatus(payment.status),
            fees: fees,
            netAmount: amount - fees,
            counterparty: payment.customer_id,
            category: this.categorizePayment(payment),
            metadata: {
              squarePaymentId: payment.id,
              locationId: payment.location_id,
              orderId: payment.order_id,
              receiptNumber: payment.receipt_number,
              receiptUrl: payment.receipt_url,
              sourceType: payment.source_type,
              customerId: payment.customer_id,
              referenceId: payment.reference_id,
              cardDetails: payment.card_details,
              riskLevel: payment.risk_evaluation?.risk_level
            }
          })
        }
      }
      
      cursor = data.cursor
    } while (cursor)
  }

  private async fetchRefunds(startDate: Date, endDate: Date, transactions: TransactionData[]): Promise<void> {
    const requestBody = {
      begin_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      location_id: this.locationId,
      limit: 500
    }

    let cursor: string | undefined
    
    do {
      const body = cursor ? { ...requestBody, cursor } : requestBody
      
      const response = await fetch(`${this.baseUrl}/v2/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Square refunds: ${response.statusText}`)
      }

      const data = await response.json()
      
      for (const refund of data.refunds || []) {
        if (refund.status === 'APPROVED') {
          const amount = -(refund.amount_money.amount / 100) // Negative for refunds
          const fees = (refund.processing_fee_money?.amount || 0) / 100
          
          transactions.push({
            externalId: refund.id,
            amount: amount,
            currency: refund.amount_money.currency,
            description: `Refund: ${refund.reason}`,
            date: new Date(refund.created_at),
            status: 'refunded',
            fees: fees,
            netAmount: amount - fees,
            category: 'square_refund',
            metadata: {
              squareRefundId: refund.id,
              squareTransactionId: refund.transaction_id,
              squareTenderId: refund.tender_id,
              locationId: refund.location_id,
              reason: refund.reason
            }
          })
        }
      }
      
      cursor = data.cursor
    } while (cursor)
  }

  private categorizePayment(payment: SquarePayment): string {
    switch (payment.source_type) {
      case 'CARD':
        return 'square_card_payment'
      case 'CASH':
        return 'square_cash_payment'
      case 'SQUARE_GIFT_CARD':
        return 'square_gift_card_payment'
      case 'BANK_ACCOUNT':
        return 'square_bank_payment'
      case 'WALLET':
        return 'square_wallet_payment'
      case 'BUY_NOW_PAY_LATER':
        return 'square_bnpl_payment'
      default:
        return 'square_payment'
    }
  }

  async getAccountInfo(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Square not authenticated')
    }

    try {
      // Get locations
      const locationsResponse = await fetch(`${this.baseUrl}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        }
      })

      if (!locationsResponse.ok) {
        throw new Error(`Failed to fetch Square locations: ${locationsResponse.statusText}`)
      }

      const locationsData = await locationsResponse.json()

      return {
        applicationId: this.credentials?.apiKey,
        locations: locationsData.locations.map((location: any) => ({
          id: location.id,
          name: location.name,
          address: location.address,
          timezone: location.timezone,
          capabilities: location.capabilities,
          status: location.status,
          createdAt: location.created_at,
          merchantId: location.merchant_id,
          country: location.country,
          languageCode: location.language_code,
          currency: location.currency,
          phoneNumber: location.phone_number,
          businessName: location.business_name,
          type: location.type,
          websiteUrl: location.website_url
        }))
      }
    } catch (error) {
      console.error('Error fetching Square account info:', error)
      throw error
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    if (!this.credentials?.webhookSecret) {
      return false
    }

    try {
      // Square uses HMAC-SHA1 for webhook signature validation
      const crypto = require('crypto')
      const computedSignature = crypto
        .createHmac('sha1', this.credentials.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('base64')

      return computedSignature === signature
    } catch (error) {
      console.error('Square webhook validation failed:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.accessToken = null
    this.credentials = null
    this.locationId = null
  }

  private mapPaymentStatus(squareStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (squareStatus) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'completed'
      case 'PENDING':
        return 'pending'
      case 'CANCELED':
      case 'FAILED':
        return 'failed'
      default:
        return 'pending'
    }
  }
}