interface IntegrationCredentials {
  apiKey?: string
  secretKey?: string
  accessToken?: string
  refreshToken?: string
  webhookSecret?: string
  environment?: 'sandbox' | 'production'
  [key: string]: any
}

interface IntegrationConfig {
  ventureId: string
  platform: string
  credentials: IntegrationCredentials
  syncEnabled: boolean
  webhooksEnabled: boolean
  lastSyncAt?: Date
  settings?: Record<string, any>
}

interface AvailableIntegration {
  platform: string
  name: string
  description: string
  features: string[]
  authType: string
  status: string
}

interface SyncResult {
  platform: string
  transactionsAdded: number
  transactionsUpdated: number
  errors: string[]
  lastSyncAt: Date
}

interface SyncAllResult {
  totalSynced: number
  totalTransactions: number
  transactionsAdded: number
  transactionsUpdated: number
  errors: string[]
  platforms: Array<{
    platform: string
    transactionsAdded: number
    transactionsUpdated: number
    errors: string[]
  }>
}

import { apiUrl } from '../config'

class IntegrationsApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = apiUrl('')
  }

  async getAvailableIntegrations(): Promise<AvailableIntegration[]> {
    const response = await fetch(`${this.baseUrl}/api/integrations/available`)
    if (!response.ok) throw new Error('Failed to fetch available integrations')
    const data = await response.json()
    return data.data
  }

  async getVentureIntegrations(ventureId: string): Promise<IntegrationConfig[]> {
    const response = await fetch(`${this.baseUrl}/api/integrations/venture/${ventureId}`)
    if (!response.ok) throw new Error('Failed to fetch venture integrations')
    const data = await response.json()
    return data.data.map((integration: any) => ({
      ...integration,
      lastSyncAt: integration.lastSyncAt ? new Date(integration.lastSyncAt) : undefined
    }))
  }

  async connectIntegration(
    ventureId: string, 
    platform: string, 
    credentials: IntegrationCredentials,
    settings?: Record<string, any>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/integrations/venture/${ventureId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, credentials, settings })
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to connect ${platform}`)
    }
  }

  async disconnectIntegration(ventureId: string, platform: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/integrations/venture/${ventureId}/${platform}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to disconnect ${platform}`)
    }
  }

  async syncIntegration(ventureId: string, platform: string): Promise<SyncResult> {
    const response = await fetch(`${this.baseUrl}/api/integrations/venture/${ventureId}/${platform}/sync`, {
      method: 'POST'
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to sync ${platform}`)
    }
    const data = await response.json()
    return { ...data.data, lastSyncAt: new Date(data.data.lastSyncAt) }
  }

  async syncAllIntegrations(ventureId: string): Promise<SyncAllResult> {
    const response = await fetch(`${this.baseUrl}/api/integrations/venture/${ventureId}/sync-all`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to sync integrations')
    const data = await response.json()
    return data.data
  }

  getPlatformInfo(platform: string) {
    const platformData: Record<string, { name: string; color: string; icon: string; description: string }> = {
      stripe: { name: 'Stripe', color: '#635BFF', icon: '💳', description: 'Online payments and subscriptions' },
      paypal: { name: 'PayPal', color: '#003087', icon: '🅿️', description: 'Global payment platform' },
      venmo: { name: 'Venmo', color: '#3D95CE', icon: '💸', description: 'Peer-to-peer payments' },
      wise: { name: 'Wise', color: '#37517E', icon: '🌍', description: 'International money transfers' },
      square: { name: 'Square', color: '#3E4348', icon: '⬜', description: 'Point-of-sale and payments' }
    }
    return platformData[platform] || { name: platform, color: '#6B7280', icon: '🔗', description: 'Payment platform' }
  }

  formatSyncStatus(lastSyncAt?: Date): { text: string; color: string } {
    if (!lastSyncAt) return { text: 'Never synced', color: 'text-gray-500' }
    
    const diffHours = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
    if (diffHours < 1) return { text: 'Just now', color: 'text-green-600' }
    if (diffHours < 24) return { text: `${Math.floor(diffHours)}h ago`, color: 'text-green-600' }
    if (diffHours < 48) return { text: '1 day ago', color: 'text-yellow-600' }
    if (diffHours < 168) return { text: `${Math.floor(diffHours / 24)} days ago`, color: 'text-yellow-600' }
    return { text: 'Stale', color: 'text-red-600' }
  }
}

export const integrationsApi = new IntegrationsApiService()
export type { IntegrationCredentials, IntegrationConfig, AvailableIntegration, SyncResult, SyncAllResult }