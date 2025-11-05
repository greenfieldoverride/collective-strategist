import { PlatformIntegration, IntegrationCredentials, TransactionData } from '../integration-service'

interface PayPalTransaction {
  id: string
  amount: {
    total: string
    currency: string
    details?: {
      subtotal?: string
      tax?: string
      shipping?: string
      fee?: string
    }
  }
  description: string
  create_time: string
  update_time: string
  state: string
  payer: {
    payment_method: string
    payer_info?: {
      email?: string
      first_name?: string
      last_name?: string
    }
  }
  transactions: Array<{
    description: string
    amount: {
      total: string
      currency: string
    }
  }>
}

interface PayPalPayout {
  batch_header: {
    payout_batch_id: string
    batch_status: string
    time_created: string
    time_completed?: string
    sender_batch_header: {
      sender_batch_id: string
      email_subject?: string
    }
    amount: {
      currency: string
      value: string
    }
    fees: {
      currency: string
      value: string
    }
  }
  items: Array<{
    payout_item_id: string
    transaction_id?: string
    transaction_status: string
    payout_item: {
      recipient_type: string
      amount: {
        currency: string
        value: string
      }
      receiver: string
      note?: string
    }
    time_processed?: string
    errors?: any
  }>
}

export class PayPalIntegration implements PlatformIntegration {
  public readonly platform = 'paypal'
  private accessToken: string | null = null
  private credentials: IntegrationCredentials | null = null
  private baseUrl: string = ''

  async authenticate(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      if (!credentials.apiKey || !credentials.secretKey) {
        throw new Error('PayPal client ID and secret are required')
      }

      this.credentials = credentials
      this.baseUrl = credentials.environment === 'production' 
        ? 'https://api.paypal.com'
        : 'https://api.sandbox.paypal.com'

      // Get access token
      const auth = Buffer.from(`${credentials.apiKey}:${credentials.secretKey}`).toString('base64')
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        throw new Error(`PayPal authentication failed: ${response.statusText}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token

      return true
    } catch (error) {
      console.error('PayPal authentication failed:', error)
      return false
    }
  }

  async getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]> {
    if (!this.accessToken) {
      throw new Error('PayPal not authenticated')
    }

    const transactions: TransactionData[] = []

    try {
      // Get payments
      await this.fetchPayments(startDate, endDate, transactions)
      
      // Get payouts
      await this.fetchPayouts(startDate, endDate, transactions)

    } catch (error) {
      console.error('Error fetching PayPal transactions:', error)
      throw error
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  private async fetchPayments(startDate: Date, endDate: Date, transactions: TransactionData[]): Promise<void> {
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const response = await fetch(
      `${this.baseUrl}/v1/payments/payment?start_time=${startDateStr}T00:00:00Z&end_time=${endDateStr}T23:59:59Z&count=100`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch PayPal payments: ${response.statusText}`)
    }

    const data = await response.json()
    
    for (const payment of data.payments || []) {
      if (payment.state === 'approved') {
        const transaction = payment.transactions[0]
        const amount = parseFloat(transaction.amount.total)
        const fees = parseFloat(transaction.amount.details?.fee || '0')

        transactions.push({
          externalId: payment.id,
          amount: amount,
          currency: transaction.amount.currency,
          description: transaction.description || `PayPal payment ${payment.id}`,
          date: new Date(payment.create_time),
          status: this.mapPaymentStatus(payment.state),
          fees: fees,
          netAmount: amount - fees,
          counterparty: payment.payer.payer_info?.email,
          category: 'paypal_payment',
          metadata: {
            paypalPaymentId: payment.id,
            paymentMethod: payment.payer.payment_method,
            payerName: payment.payer.payer_info ? 
              `${payment.payer.payer_info.first_name} ${payment.payer.payer_info.last_name}`.trim() : 
              undefined
          }
        })
      }
    }
  }

  private async fetchPayouts(startDate: Date, endDate: Date, transactions: TransactionData[]): Promise<void> {
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const response = await fetch(
      `${this.baseUrl}/v1/payments/payouts?start_time=${startDateStr}T00:00:00Z&end_time=${endDateStr}T23:59:59Z&page_size=100`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch PayPal payouts: ${response.statusText}`)
    }

    const data = await response.json()
    
    for (const payout of data.payouts || []) {
      if (payout.batch_header.batch_status === 'SUCCESS') {
        const amount = parseFloat(payout.batch_header.amount.value)
        const fees = parseFloat(payout.batch_header.fees.value)

        transactions.push({
          externalId: payout.batch_header.payout_batch_id,
          amount: -amount, // Negative for outgoing payouts
          currency: payout.batch_header.amount.currency,
          description: `PayPal payout batch ${payout.batch_header.payout_batch_id}`,
          date: new Date(payout.batch_header.time_created),
          status: this.mapPayoutStatus(payout.batch_header.batch_status),
          fees: fees,
          netAmount: -(amount + fees),
          category: 'paypal_payout',
          metadata: {
            paypalPayoutId: payout.batch_header.payout_batch_id,
            senderBatchId: payout.batch_header.sender_batch_header.sender_batch_id,
            itemCount: payout.items?.length || 0
          }
        })

        // Add individual payout items if needed
        for (const item of payout.items || []) {
          if (item.transaction_status === 'SUCCESS') {
            const itemAmount = parseFloat(item.payout_item.amount.value)
            
            transactions.push({
              externalId: item.payout_item_id,
              amount: -itemAmount,
              currency: item.payout_item.amount.currency,
              description: `Payout to ${item.payout_item.receiver}`,
              date: new Date(item.time_processed || payout.batch_header.time_created),
              status: 'completed',
              fees: 0,
              netAmount: -itemAmount,
              counterparty: item.payout_item.receiver,
              category: 'paypal_payout_item',
              metadata: {
                paypalPayoutItemId: item.payout_item_id,
                paypalTransactionId: item.transaction_id,
                batchId: payout.batch_header.payout_batch_id,
                note: item.payout_item.note
              }
            })
          }
        }
      }
    }
  }

  async getAccountInfo(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('PayPal not authenticated')
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/identity/userinfo?schema=paypalv1.1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch PayPal account info: ${response.statusText}`)
      }

      const accountInfo = await response.json()

      return {
        userId: accountInfo.user_id,
        name: accountInfo.name,
        email: accountInfo.email,
        verifiedAccount: accountInfo.verified_account,
        accountType: accountInfo.account_type,
        country: accountInfo.locale?.country,
        currency: accountInfo.locale?.language
      }
    } catch (error) {
      console.error('Error fetching PayPal account info:', error)
      throw error
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    // PayPal webhook validation would require additional setup
    // For now, return true but this should be implemented properly
    return true
  }

  async disconnect(): Promise<void> {
    this.accessToken = null
    this.credentials = null
  }

  private mapPaymentStatus(paypalStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (paypalStatus) {
      case 'approved':
        return 'completed'
      case 'created':
        return 'pending'
      case 'failed':
      case 'cancelled':
        return 'failed'
      default:
        return 'pending'
    }
  }

  private mapPayoutStatus(paypalStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (paypalStatus) {
      case 'SUCCESS':
        return 'completed'
      case 'PENDING':
        return 'pending'
      case 'FAILED':
      case 'CANCELLED':
        return 'failed'
      default:
        return 'pending'
    }
  }
}