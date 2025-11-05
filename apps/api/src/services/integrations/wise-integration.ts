import { PlatformIntegration, IntegrationCredentials, TransactionData } from '../integration-service'

interface WiseProfile {
  id: number
  type: 'personal' | 'business'
  details: {
    firstName?: string
    lastName?: string
    dateOfBirth?: string
    phoneNumber?: string
    occupation?: string
    primaryAddress?: number
    name?: string // For business profiles
    registrationNumber?: string
    companyType?: string
    companyRole?: string
    website?: string
  }
}

interface WiseAccount {
  id: number
  name: string
  currency: string
  type: string
  primary: boolean
  balance: {
    value: number
    currency: string
  }
  reservedBalance: {
    value: number
    currency: string
  }
  cashManagerBalance?: {
    value: number
    currency: string
  }
  overdraftBalance?: {
    value: number
    currency: string
  }
}

interface WiseTransaction {
  type: 'debit' | 'credit'
  date: string
  amount: {
    value: number
    currency: string
  }
  totalFees: {
    value: number
    currency: string
  }
  details: {
    type: string
    description: string
    exchangeDetails?: {
      fromAmount: {
        value: number
        currency: string
      }
      toAmount: {
        value: number
        currency: string
      }
      rate: number
    }
    paymentReference?: string
    sourceAccount?: {
      name: string
      accountSummary: string
    }
    targetAccount?: {
      name: string
      accountSummary: string
    }
    merchant?: {
      name: string
      category: string
    }
  }
  exchangeDetails?: {
    fromAmount: {
      value: number
      currency: string
    }
    toAmount: {
      value: number
      currency: string
    }
    rate: number
  }
  runningBalance: {
    value: number
    currency: string
  }
  referenceNumber: string
}

export class WiseIntegration implements PlatformIntegration {
  public readonly platform = 'wise'
  private apiToken: string | null = null
  private credentials: IntegrationCredentials | null = null
  private baseUrl: string = ''
  private profileId: number | null = null

  async authenticate(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      if (!credentials.apiKey) {
        throw new Error('Wise API token is required')
      }

      this.credentials = credentials
      this.apiToken = credentials.apiKey
      this.baseUrl = credentials.environment === 'production' 
        ? 'https://api.transferwise.com'
        : 'https://api.sandbox.transferwise.tech'

      // Test authentication by getting profiles
      const response = await fetch(`${this.baseUrl}/v1/profiles`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Wise authentication failed: ${response.statusText}`)
      }

      const profiles = await response.json()
      if (profiles.length === 0) {
        throw new Error('No Wise profiles found')
      }

      // Use the first profile (usually personal profile)
      this.profileId = profiles[0].id

      return true
    } catch (error) {
      console.error('Wise authentication failed:', error)
      return false
    }
  }

  async getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]> {
    if (!this.apiToken || !this.profileId) {
      throw new Error('Wise not authenticated')
    }

    const transactions: TransactionData[] = []

    try {
      // Get all accounts for the profile
      const accountsResponse = await fetch(`${this.baseUrl}/v1/profiles/${this.profileId}/balances?types=STANDARD`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!accountsResponse.ok) {
        throw new Error(`Failed to fetch Wise accounts: ${accountsResponse.statusText}`)
      }

      const accounts = await accountsResponse.json()

      // Get transactions for each account
      for (const account of accounts) {
        await this.fetchAccountTransactions(account.id, startDate, endDate, transactions)
      }

    } catch (error) {
      console.error('Error fetching Wise transactions:', error)
      throw error
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  private async fetchAccountTransactions(
    accountId: number, 
    startDate: Date, 
    endDate: Date, 
    transactions: TransactionData[]
  ): Promise<void> {
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const response = await fetch(
      `${this.baseUrl}/v1/profiles/${this.profileId}/balances/${accountId}/statement.json?intervalStart=${startDateStr}&intervalEnd=${endDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch Wise account transactions: ${response.statusText}`)
    }

    const statement = await response.json()
    
    for (const transaction of statement.transactions || []) {
      const amount = transaction.type === 'credit' ? transaction.amount.value : -transaction.amount.value
      const fees = transaction.totalFees?.value || 0
      
      transactions.push({
        externalId: transaction.referenceNumber,
        amount: amount,
        currency: transaction.amount.currency,
        description: transaction.details.description || `Wise ${transaction.details.type}`,
        date: new Date(transaction.date),
        status: 'completed', // Wise transactions are typically completed when visible
        fees: fees,
        netAmount: amount - (transaction.type === 'debit' ? fees : 0),
        counterparty: this.getCounterparty(transaction),
        category: this.categorizeTransaction(transaction),
        metadata: {
          wiseReferenceNumber: transaction.referenceNumber,
          wiseTransactionType: transaction.details.type,
          accountId: accountId,
          exchangeDetails: transaction.exchangeDetails,
          paymentReference: transaction.details.paymentReference,
          merchant: transaction.details.merchant,
          runningBalance: transaction.runningBalance
        }
      })
    }
  }

  private getCounterparty(transaction: WiseTransaction): string | undefined {
    if (transaction.details.targetAccount?.name) {
      return transaction.details.targetAccount.name
    }
    if (transaction.details.sourceAccount?.name) {
      return transaction.details.sourceAccount.name
    }
    if (transaction.details.merchant?.name) {
      return transaction.details.merchant.name
    }
    return undefined
  }

  private categorizeTransaction(transaction: WiseTransaction): string {
    const type = transaction.details.type.toLowerCase()
    
    if (type.includes('transfer')) {
      return 'wise_transfer'
    }
    if (type.includes('conversion')) {
      return 'wise_currency_exchange'
    }
    if (type.includes('card')) {
      return 'wise_card_transaction'
    }
    if (type.includes('fee')) {
      return 'wise_fee'
    }
    if (type.includes('deposit')) {
      return 'wise_deposit'
    }
    if (type.includes('withdrawal')) {
      return 'wise_withdrawal'
    }
    
    return 'wise_transaction'
  }

  async getAccountInfo(): Promise<any> {
    if (!this.apiToken || !this.profileId) {
      throw new Error('Wise not authenticated')
    }

    try {
      // Get profile info
      const profileResponse = await fetch(`${this.baseUrl}/v1/profiles/${this.profileId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch Wise profile: ${profileResponse.statusText}`)
      }

      const profile = await profileResponse.json()

      // Get account balances
      const balancesResponse = await fetch(`${this.baseUrl}/v1/profiles/${this.profileId}/balances`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!balancesResponse.ok) {
        throw new Error(`Failed to fetch Wise balances: ${balancesResponse.statusText}`)
      }

      const balances = await balancesResponse.json()

      return {
        profileId: profile.id,
        profileType: profile.type,
        name: profile.details.firstName ? 
          `${profile.details.firstName} ${profile.details.lastName}`.trim() : 
          profile.details.name,
        email: profile.details.primaryAddress?.email,
        balances: balances.map((balance: WiseAccount) => ({
          accountId: balance.id,
          currency: balance.currency,
          name: balance.name,
          type: balance.type,
          isPrimary: balance.primary,
          balance: balance.balance.value,
          reservedBalance: balance.reservedBalance.value
        }))
      }
    } catch (error) {
      console.error('Error fetching Wise account info:', error)
      throw error
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    // Wise webhook validation would require the webhook signing key
    // This is a simplified implementation
    if (!this.credentials?.webhookSecret) {
      return false
    }

    try {
      // Wise uses HMAC-SHA256 for webhook signature validation
      const crypto = require('crypto')
      const computedSignature = crypto
        .createHmac('sha256', this.credentials.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

      return computedSignature === signature
    } catch (error) {
      console.error('Wise webhook validation failed:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.apiToken = null
    this.credentials = null
    this.profileId = null
  }
}