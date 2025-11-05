// Impact Dashboard Types
export type ImpactModuleType = 'community' | 'knowledge' | 'cultural' | 'movement' | 'sovereignty'

export type IntegrationPlatform = 
  | 'github'
  | 'patreon' 
  | 'meetup'
  | 'opencollective'
  | 'substack'
  | 'bandcamp'
  | 'itch'
  | 'youtube'
  | 'gofundme'
  | 'mastodon'
  | 'nextcloud'
  | 'inaturalist'

export interface ImpactModule {
  id: ImpactModuleType
  name: string
  icon: string
  description: string
  widgets: ImpactWidget[]
}

export interface ImpactWidget {
  id: string
  integrationId: string
  platform: IntegrationPlatform
  title: string
  metrics: ImpactMetric[]
  lastSync: Date
  isConnected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'syncing'
}

export interface ImpactMetric {
  id: string
  name: string
  value: number | string
  displayValue: string
  trend?: 'up' | 'down' | 'stable'
  changePercent?: number
  context: string // Liberation-focused explanation of what this metric means
  icon?: string
}

export interface IntegrationConnection {
  id: string
  ventureId: string
  platform: IntegrationPlatform
  accountId: string
  accountName: string
  accessToken: string // Encrypted
  refreshToken?: string // Encrypted
  tokenExpiresAt?: Date
  scopes: string[]
  isActive: boolean
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IntegrationConfig {
  platform: IntegrationPlatform
  name: string
  description: string
  modules: ImpactModuleType[]
  oauthConfig: {
    clientId: string
    clientSecret: string
    authUrl: string
    tokenUrl: string
    scopes: string[]
    redirectUri: string
  }
  rateLimit: {
    requestsPerHour: number
    burstLimit: number
  }
  endpoints: {
    userInfo: string
    metrics: string[]
  }
}

export interface OAuthState {
  ventureId: string
  platform: IntegrationPlatform
  state: string
  codeVerifier?: string // For PKCE
  createdAt: Date
}

export interface IntegrationSyncResult {
  integrationId: string
  success: boolean
  metricsUpdated: number
  errors: string[]
  nextSyncAt: Date
}

// Platform-specific metric types
export interface GitHubMetrics {
  stars: number
  forks: number
  contributors: number
  commits: number
  openIssues: number
  closedIssues: number
  pullRequests: number
  releases: number
}

export interface PatreonMetrics {
  patronCount: number
  monthlyIncome: number
  posts: number
  likes: number
  comments: number
  tier: string
}

export interface MeetupMetrics {
  members: number
  events: number
  pastEvents: number
  totalRsvps: number
  upcomingEvents: number
  averageAttendance: number
}

// API Request/Response types
export interface ConnectIntegrationRequest {
  platform: IntegrationPlatform
  ventureId: string
}

export interface ConnectIntegrationResponse {
  authUrl: string
  state: string
}

export interface HandleOAuthCallbackRequest {
  code: string
  state: string
  platform: IntegrationPlatform
}

export interface GetVentureImpactRequest {
  ventureId: string
}

export interface GetVentureImpactResponse {
  modules: ImpactModule[]
  lastSyncAt: Date
  connectedIntegrations: number
  totalMetrics: number
}

export interface SyncIntegrationRequest {
  integrationId: string
  force?: boolean
}

export interface DisconnectIntegrationRequest {
  integrationId: string
  ventureId: string
}