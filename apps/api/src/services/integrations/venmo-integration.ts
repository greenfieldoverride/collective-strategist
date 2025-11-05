import { PlatformIntegration, IntegrationCredentials, TransactionData } from '../integration-service'

interface VenmoTransaction {
  id: string
  story: string
  amount: string
  audience: string
  status: string
  date_created: string
  date_updated: string
  payment: {
    id: string
    action: 'pay' | 'charge'
    actor: {
      id: string
      username?: string
      display_name?: string
      profile_picture_url?: string
    }
    target: {
      id: string
      username?: string
      display_name?: string
      profile_picture_url?: string
    }
    amount: number
    note: string
    status: string
  }
}

interface VenmoUser {
  id: string
  username: string
  display_name: string
  email?: string
  phone?: string
  profile_picture_url?: string
  is_verified: boolean
  balance?: number
}

export class VenmoIntegration implements PlatformIntegration {
  public readonly platform = 'venmo'
  private accessToken: string | null = null
  private credentials: IntegrationCredentials | null = null
  private baseUrl: string = 'https://api.venmo.com/v1'
  private userId: string | null = null

  async authenticate(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      if (!credentials.accessToken) {
        throw new Error('Venmo access token is required')
      }

      this.credentials = credentials
      this.accessToken = credentials.accessToken

      // Test authentication by getting user profile
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Venmo authentication failed: ${response.statusText}`)
      }

      const data = await response.json()
      this.userId = data.data.user.id

      return true
    } catch (error) {
      console.error('Venmo authentication failed:', error)
      return false
    }
  }

  async getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]> {
    if (!this.accessToken || !this.userId) {
      throw new Error('Venmo not authenticated')
    }

    const transactions: TransactionData[] = []

    try {
      let nextUrl: string | null = `${this.baseUrl}/payments?limit=50`
      
      // Venmo API doesn't support date filtering directly, so we fetch and filter
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch Venmo transactions: ${response.statusText}`)
        }

        const data = await response.json()
        
        for (const payment of data.data || []) {
          const paymentDate = new Date(payment.date_created)
          
          // Filter by date range
          if (paymentDate >= startDate && paymentDate <= endDate) {
            // Determine if this is incoming or outgoing for the authenticated user
            const isIncoming = payment.payment.target.id === this.userId
            const amount = isIncoming ? payment.payment.amount : -payment.payment.amount
            const counterparty = isIncoming 
              ? payment.payment.actor.display_name || payment.payment.actor.username
              : payment.payment.target.display_name || payment.payment.target.username

            transactions.push({
              externalId: payment.payment.id,
              amount: amount,
              currency: 'USD', // Venmo only supports USD
              description: payment.payment.note || payment.story || `Venmo ${payment.payment.action}`,
              date: paymentDate,
              status: this.mapVenmoStatus(payment.payment.status),
              fees: 0, // Venmo typically doesn't charge fees for standard transfers
              netAmount: amount,
              counterparty: counterparty,
              category: `venmo_${payment.payment.action}`,
              metadata: {
                venmoPaymentId: payment.payment.id,
                venmoTransactionId: payment.id,
                action: payment.payment.action,
                audience: payment.audience,
                actorId: payment.payment.actor.id,
                targetId: payment.payment.target.id,
                story: payment.story
              }
            })
          } else if (paymentDate < startDate) {
            // If we've reached transactions before our start date, we can stop
            nextUrl = null
            break
          }
        }

        // Get next page URL if available and we haven't stopped due to date filtering
        if (nextUrl !== null) {
          nextUrl = data.pagination?.next || null
        }
      }

    } catch (error) {
      console.error('Error fetching Venmo transactions:', error)
      throw error
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  async getAccountInfo(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Venmo not authenticated')
    }

    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Venmo account info: ${response.statusText}`)
      }

      const data = await response.json()
      const user = data.data.user

      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone,
        profilePictureUrl: user.profile_picture_url,
        isVerified: user.is_verified,
        balance: user.balance
      }
    } catch (error) {
      console.error('Error fetching Venmo account info:', error)
      throw error
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    // Venmo doesn't currently support webhooks for third-party applications
    // This would need to be implemented if Venmo adds webhook support
    console.warn('Venmo webhook validation not implemented - Venmo does not support webhooks for third-party apps')
    return false
  }

  async disconnect(): Promise<void> {
    this.accessToken = null
    this.credentials = null
    this.userId = null
  }

  private mapVenmoStatus(venmoStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (venmoStatus) {
      case 'settled':
        return 'completed'
      case 'pending':
        return 'pending'
      case 'cancelled':
      case 'failed':
        return 'failed'
      default:
        return 'pending'
    }
  }
}