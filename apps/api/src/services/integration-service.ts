import { Database } from '../database/connection'
import { StripeIntegration } from './integrations/stripe-integration'
import { PayPalIntegration } from './integrations/paypal-integration'
import { VenmoIntegration } from './integrations/venmo-integration'
import { WiseIntegration } from './integrations/wise-integration'
import { SquareIntegration } from './integrations/square-integration'
import { encryptionService } from './encryption-service'

export interface IntegrationCredentials {
  apiKey?: string
  secretKey?: string
  accessToken?: string
  refreshToken?: string
  webhookSecret?: string
  environment?: 'sandbox' | 'production'
  [key: string]: any
}

export interface IntegrationConfig {
  ventureId: string
  platform: string
  credentials: IntegrationCredentials
  syncEnabled: boolean
  webhooksEnabled: boolean
  lastSyncAt?: Date
  settings?: Record<string, any>
}

export interface TransactionData {
  externalId: string
  amount: number
  currency: string
  description: string
  date: Date
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  fees: number
  netAmount: number
  counterparty?: string
  category?: string
  metadata?: Record<string, any>
}

export interface SyncResult {
  platform: string
  transactionsAdded: number
  transactionsUpdated: number
  errors: string[]
  lastSyncAt: Date
  nextSyncAt?: Date
}

export interface PlatformIntegration {
  platform: string
  authenticate(credentials: IntegrationCredentials): Promise<boolean>
  getTransactions(startDate: Date, endDate: Date): Promise<TransactionData[]>
  getAccountInfo(): Promise<any>
  validateWebhook(payload: any, signature: string): boolean
  disconnect(): Promise<void>
}

export class IntegrationService {
  private db: Database
  private integrations: Map<string, PlatformIntegration>

  constructor(database: Database) {
    this.db = database
    this.integrations = new Map()
    
    // Register available integrations
    this.integrations.set('stripe', new StripeIntegration())
    this.integrations.set('paypal', new PayPalIntegration())
    this.integrations.set('venmo', new VenmoIntegration())
    this.integrations.set('wise', new WiseIntegration())
    this.integrations.set('square', new SquareIntegration())
  }

  async getAvailableIntegrations(): Promise<string[]> {
    return Array.from(this.integrations.keys())
  }

  async getVentureIntegrations(ventureId: string): Promise<IntegrationConfig[]> {
    const query = `
      SELECT 
        venture_id,
        platform,
        integration_name,
        last_sync_at,
        sync_status,
        settings,
        is_active,
        created_at,
        updated_at
      FROM financial_integrations
      WHERE venture_id = $1 AND is_active = true
      ORDER BY platform ASC
    `
    
    const result = await this.db.query(query, [ventureId])
    
    return result.rows.map(row => ({
      ventureId: row.venture_id,
      platform: row.platform,
      credentials: {}, // Never return actual credentials
      syncEnabled: row.sync_status === 'active',
      webhooksEnabled: row.settings?.webhooks_enabled || false,
      lastSyncAt: row.last_sync_at,
      settings: row.settings
    }))
  }

  async addIntegration(config: IntegrationConfig): Promise<void> {
    const integration = this.integrations.get(config.platform)
    if (!integration) {
      throw new Error(`Unsupported platform: ${config.platform}`)
    }

    // Test authentication
    const isValid = await integration.authenticate(config.credentials)
    if (!isValid) {
      throw new Error(`Authentication failed for ${config.platform}`)
    }

    // Encrypt and store credentials
    const encryptedCredentials = await this.encryptCredentials(config.credentials)
    
    const query = `
      INSERT INTO financial_integrations (
        venture_id, platform, integration_name, credentials_encrypted,
        sync_status, settings, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (venture_id, platform) 
      DO UPDATE SET
        credentials_encrypted = EXCLUDED.credentials_encrypted,
        sync_status = EXCLUDED.sync_status,
        settings = EXCLUDED.settings,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `
    
    await this.db.query(query, [
      config.ventureId,
      config.platform,
      `${config.platform} Integration`,
      encryptedCredentials,
      config.syncEnabled ? 'active' : 'inactive',
      JSON.stringify(config.settings || {}),
      true
    ])
  }

  async removeIntegration(ventureId: string, platform: string): Promise<void> {
    // Get integration to disconnect
    const integration = this.integrations.get(platform)
    if (integration) {
      try {
        await integration.disconnect()
      } catch (error) {
        console.warn(`Failed to disconnect ${platform}:`, error)
      }
    }

    // Mark as inactive in database
    const query = `
      UPDATE financial_integrations 
      SET is_active = false, sync_status = 'disconnected', updated_at = CURRENT_TIMESTAMP
      WHERE venture_id = $1 AND platform = $2
    `
    
    await this.db.query(query, [ventureId, platform])
  }

  async syncIntegration(ventureId: string, platform: string): Promise<SyncResult> {
    const integration = this.integrations.get(platform)
    if (!integration) {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    // Get integration config
    const config = await this.getIntegrationConfig(ventureId, platform)
    if (!config) {
      throw new Error(`No integration found for ${platform}`)
    }

    // Decrypt credentials
    const credentials = await this.decryptCredentials(config.credentials)
    
    // Authenticate
    const isValid = await integration.authenticate(credentials)
    if (!isValid) {
      throw new Error(`Authentication failed for ${platform}`)
    }

    // Determine sync period (last 30 days or since last sync)
    const endDate = new Date()
    const startDate = config.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fetch transactions
    const transactions = await integration.getTransactions(startDate, endDate)
    
    let transactionsAdded = 0
    let transactionsUpdated = 0
    const errors: string[] = []

    // Process each transaction
    for (const transaction of transactions) {
      try {
        const existing = await this.findExistingTransaction(
          ventureId, 
          platform, 
          transaction.externalId
        )

        if (existing) {
          await this.updateTransaction(existing.id, transaction)
          transactionsUpdated++
        } else {
          await this.addTransaction(ventureId, platform, transaction)
          transactionsAdded++
        }
      } catch (error) {
        errors.push(`Failed to process transaction ${transaction.externalId}: ${error}`)
      }
    }

    // Update last sync time
    await this.updateLastSync(ventureId, platform)

    return {
      platform,
      transactionsAdded,
      transactionsUpdated,
      errors,
      lastSyncAt: new Date()
    }
  }

  async syncAllIntegrations(ventureId: string): Promise<SyncResult[]> {
    const integrations = await this.getVentureIntegrations(ventureId)
    const results: SyncResult[] = []

    for (const config of integrations) {
      if (config.syncEnabled) {
        try {
          const result = await this.syncIntegration(ventureId, config.platform)
          results.push(result)
        } catch (error) {
          results.push({
            platform: config.platform,
            transactionsAdded: 0,
            transactionsUpdated: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            lastSyncAt: new Date()
          })
        }
      }
    }

    return results
  }

  async handleWebhook(platform: string, payload: any, signature: string): Promise<void> {
    const integration = this.integrations.get(platform)
    if (!integration) {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    if (!integration.validateWebhook(payload, signature)) {
      throw new Error('Invalid webhook signature')
    }

    // Process webhook payload based on platform
    // This would be platform-specific logic
    await this.processWebhookPayload(platform, payload)
  }

  private async getIntegrationConfig(ventureId: string, platform: string): Promise<IntegrationConfig | null> {
    const query = `
      SELECT * FROM financial_integrations
      WHERE venture_id = $1 AND platform = $2 AND is_active = true
    `
    
    const result = await this.db.query(query, [ventureId, platform])
    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      ventureId: row.venture_id,
      platform: row.platform,
      credentials: row.credentials_encrypted,
      syncEnabled: row.sync_status === 'active',
      webhooksEnabled: row.settings?.webhooks_enabled || false,
      lastSyncAt: row.last_sync_at,
      settings: row.settings
    }
  }

  private async findExistingTransaction(
    ventureId: string, 
    platform: string, 
    externalId: string
  ): Promise<{ id: string } | null> {
    const query = `
      SELECT id FROM financial_transactions
      WHERE venture_id = $1 AND platform = $2 AND external_transaction_id = $3
    `
    
    const result = await this.db.query(query, [ventureId, platform, externalId])
    return result.rows.length > 0 ? { id: result.rows[0].id } : null
  }

  private async addTransaction(
    ventureId: string, 
    platform: string, 
    transaction: TransactionData
  ): Promise<void> {
    const query = `
      INSERT INTO financial_transactions (
        venture_id, transaction_type, category, amount, currency, description,
        external_transaction_id, platform, transaction_date, payment_method,
        status, fees_amount, net_amount, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `
    
    await this.db.query(query, [
      ventureId,
      transaction.amount > 0 ? 'income' : 'expense',
      transaction.category || 'platform_transaction',
      Math.abs(transaction.amount),
      transaction.currency,
      transaction.description,
      transaction.externalId,
      platform,
      transaction.date,
      platform,
      transaction.status,
      transaction.fees,
      transaction.netAmount,
      JSON.stringify(transaction.metadata || {})
    ])
  }

  private async updateTransaction(transactionId: string, transaction: TransactionData): Promise<void> {
    const query = `
      UPDATE financial_transactions SET
        amount = $2, description = $3, status = $4, fees_amount = $5,
        net_amount = $6, metadata = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `
    
    await this.db.query(query, [
      transactionId,
      Math.abs(transaction.amount),
      transaction.description,
      transaction.status,
      transaction.fees,
      transaction.netAmount,
      JSON.stringify(transaction.metadata || {})
    ])
  }

  private async updateLastSync(ventureId: string, platform: string): Promise<void> {
    const query = `
      UPDATE financial_integrations 
      SET last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE venture_id = $1 AND platform = $2
    `
    
    await this.db.query(query, [ventureId, platform])
  }

  private async processWebhookPayload(platform: string, payload: any): Promise<void> {
    // Platform-specific webhook processing logic would go here
    console.log(`Processing ${platform} webhook:`, payload)
  }

  private async encryptCredentials(credentials: IntegrationCredentials): Promise<string> {
    try {
      return encryptionService.encryptGCM(credentials)
    } catch (error) {
      console.error('Failed to encrypt credentials:', error)
      throw new Error('Failed to secure credentials')
    }
  }

  private async decryptCredentials(encryptedCredentials: string): Promise<IntegrationCredentials> {
    try {
      return encryptionService.decryptGCM(encryptedCredentials)
    } catch (error) {
      console.error('Failed to decrypt credentials:', error)
      throw new Error('Failed to retrieve credentials')
    }
  }
}