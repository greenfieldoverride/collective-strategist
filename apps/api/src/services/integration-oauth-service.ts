import crypto from 'crypto'
import { encryptionService } from './encryption-service'
import { 
  IntegrationConnection, 
  IntegrationConfig, 
  OAuthState, 
  IntegrationPlatform,
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  HandleOAuthCallbackRequest
} from '../types/impact-dashboard'

export class IntegrationOAuthService {
  private integrationConfigs: Map<IntegrationPlatform, IntegrationConfig> = new Map()

  constructor() {
    this.initializeIntegrationConfigs()
  }

  private initializeIntegrationConfigs() {
    // GitHub Integration
    this.integrationConfigs.set('github', {
      platform: 'github',
      name: 'GitHub',
      description: 'Track open source project impact and community growth',
      modules: ['knowledge'],
      oauthConfig: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['read:user', 'public_repo'],
        redirectUri: `${process.env.API_BASE_URL}/api/v1/integrations/oauth/callback/github`
      },
      rateLimit: {
        requestsPerHour: 5000,
        burstLimit: 100
      },
      endpoints: {
        userInfo: 'https://api.github.com/user',
        metrics: [
          'https://api.github.com/user/repos',
          'https://api.github.com/repos/{owner}/{repo}',
          'https://api.github.com/repos/{owner}/{repo}/contributors'
        ]
      }
    })

    // Patreon Integration
    this.integrationConfigs.set('patreon', {
      platform: 'patreon',
      name: 'Patreon',
      description: 'Track creator support and community funding',
      modules: ['cultural', 'community'],
      oauthConfig: {
        clientId: process.env.PATREON_CLIENT_ID || '',
        clientSecret: process.env.PATREON_CLIENT_SECRET || '',
        authUrl: 'https://www.patreon.com/oauth2/authorize',
        tokenUrl: 'https://www.patreon.com/api/oauth2/token',
        scopes: ['identity', 'campaigns'],
        redirectUri: `${process.env.API_BASE_URL}/api/v1/integrations/oauth/callback/patreon`
      },
      rateLimit: {
        requestsPerHour: 1000,
        burstLimit: 50
      },
      endpoints: {
        userInfo: 'https://www.patreon.com/api/oauth2/v2/identity',
        metrics: [
          'https://www.patreon.com/api/oauth2/v2/campaigns',
          'https://www.patreon.com/api/oauth2/v2/campaigns/{campaign_id}/members'
        ]
      }
    })

    // Meetup Integration
    this.integrationConfigs.set('meetup', {
      platform: 'meetup',
      name: 'Meetup',
      description: 'Track real-world community building and event impact',
      modules: ['movement', 'community'],
      oauthConfig: {
        clientId: process.env.MEETUP_CLIENT_ID || '',
        clientSecret: process.env.MEETUP_CLIENT_SECRET || '',
        authUrl: 'https://secure.meetup.com/oauth2/authorize',
        tokenUrl: 'https://secure.meetup.com/oauth2/access',
        scopes: ['basic'],
        redirectUri: `${process.env.API_BASE_URL}/api/v1/integrations/oauth/callback/meetup`
      },
      rateLimit: {
        requestsPerHour: 200,
        burstLimit: 20
      },
      endpoints: {
        userInfo: 'https://api.meetup.com/members/self',
        metrics: [
          'https://api.meetup.com/self/groups',
          'https://api.meetup.com/{urlname}/events',
          'https://api.meetup.com/{urlname}/members'
        ]
      }
    })
  }

  async initiateOAuthFlow(request: ConnectIntegrationRequest): Promise<ConnectIntegrationResponse> {
    const config = this.integrationConfigs.get(request.platform)
    if (!config) {
      throw new Error(`Unsupported integration platform: ${request.platform}`)
    }

    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('hex')
    const codeVerifier = crypto.randomBytes(32).toString('base64url')

    // Store OAuth state
    await this.storeOAuthState({
      ventureId: request.ventureId,
      platform: request.platform,
      state,
      codeVerifier,
      createdAt: new Date()
    })

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.oauthConfig.clientId,
      redirect_uri: config.oauthConfig.redirectUri,
      scope: config.oauthConfig.scopes.join(' '),
      state,
      response_type: 'code'
    })

    // Add PKCE for platforms that support it
    if (request.platform === 'github') {
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url')
      params.append('code_challenge', codeChallenge)
      params.append('code_challenge_method', 'S256')
    }

    const authUrl = `${config.oauthConfig.authUrl}?${params.toString()}`

    return { authUrl, state }
  }

  async handleOAuthCallback(request: HandleOAuthCallbackRequest): Promise<IntegrationConnection> {
    const config = this.integrationConfigs.get(request.platform)
    if (!config) {
      throw new Error(`Unsupported integration platform: ${request.platform}`)
    }

    // Verify OAuth state
    const oauthState = await this.getOAuthState(request.state)
    if (!oauthState || oauthState.platform !== request.platform) {
      throw new Error('Invalid OAuth state')
    }

    // Exchange code for access token
    const tokenData = await this.exchangeCodeForToken(
      config, 
      request.code, 
      oauthState.codeVerifier
    )

    // Get user info from the platform
    const userInfo = await this.getUserInfo(config, tokenData.access_token)

    // Create and store integration connection
    const connection: IntegrationConnection = {
      id: crypto.randomUUID(),
      ventureId: oauthState.ventureId,
      platform: request.platform,
      accountId: userInfo.id,
      accountName: userInfo.name || userInfo.login || userInfo.username,
      accessToken: encryptionService.encryptGCM(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encryptionService.encryptGCM(tokenData.refresh_token) : undefined,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      scopes: config.oauthConfig.scopes,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeIntegrationConnection(connection)
    await this.deleteOAuthState(request.state)

    return connection
  }

  async refreshAccessToken(connection: IntegrationConnection): Promise<IntegrationConnection> {
    if (!connection.refreshToken) {
      throw new Error('No refresh token available')
    }

    const config = this.integrationConfigs.get(connection.platform)
    if (!config) {
      throw new Error(`Unsupported integration platform: ${connection.platform}`)
    }

    const refreshToken = encryptionService.decryptGCM(connection.refreshToken)
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.oauthConfig.clientId,
      client_secret: config.oauthConfig.clientSecret
    })

    const response = await fetch(config.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const tokenData = await response.json()

    // Update connection with new tokens
    const updatedConnection = {
      ...connection,
      accessToken: encryptionService.encryptGCM(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encryptionService.encryptGCM(tokenData.refresh_token) : connection.refreshToken,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      updatedAt: new Date()
    }

    await this.storeIntegrationConnection(updatedConnection)
    return updatedConnection
  }

  async disconnectIntegration(integrationId: string, ventureId: string): Promise<void> {
    const connection = await this.getIntegrationConnection(integrationId)
    if (!connection || connection.ventureId !== ventureId) {
      throw new Error('Integration not found or access denied')
    }

    // Revoke token if platform supports it
    await this.revokeToken(connection)
    
    // Delete connection
    await this.deleteIntegrationConnection(integrationId)
  }

  private async exchangeCodeForToken(config: IntegrationConfig, code: string, codeVerifier?: string) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.oauthConfig.clientId,
      client_secret: config.oauthConfig.clientSecret,
      redirect_uri: config.oauthConfig.redirectUri
    })

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier)
    }

    const response = await fetch(config.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    return await response.json()
  }

  private async getUserInfo(config: IntegrationConfig, accessToken: string) {
    const response = await fetch(config.endpoints.userInfo, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`)
    }

    return await response.json()
  }

  private async revokeToken(connection: IntegrationConnection): Promise<void> {
    // Platform-specific token revocation logic
    const config = this.integrationConfigs.get(connection.platform)
    if (!config) return

    try {
      const accessToken = encryptionService.decryptGCM(connection.accessToken)
      
      // GitHub token revocation
      if (connection.platform === 'github') {
        await fetch(`https://api.github.com/applications/${config.oauthConfig.clientId}/token`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.oauthConfig.clientId}:${config.oauthConfig.clientSecret}`).toString('base64')}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({ access_token: accessToken })
        })
      }
    } catch (error) {
      console.error(`Failed to revoke token for ${connection.platform}:`, error)
      // Continue with deletion even if revocation fails
    }
  }

  // Database operations (to be implemented based on your database choice)
  private async storeOAuthState(state: OAuthState): Promise<void> {
    // Implementation depends on your database
    // For now, store in memory/Redis for demo
    console.log('Storing OAuth state:', state.state)
  }

  private async getOAuthState(state: string): Promise<OAuthState | null> {
    // Implementation depends on your database
    console.log('Getting OAuth state:', state)
    return null
  }

  private async deleteOAuthState(state: string): Promise<void> {
    // Implementation depends on your database
    console.log('Deleting OAuth state:', state)
  }

  private async storeIntegrationConnection(connection: IntegrationConnection): Promise<void> {
    // Implementation depends on your database
    console.log('Storing integration connection:', connection.id)
  }

  private async getIntegrationConnection(id: string): Promise<IntegrationConnection | null> {
    // Implementation depends on your database
    console.log('Getting integration connection:', id)
    return null
  }

  private async deleteIntegrationConnection(id: string): Promise<void> {
    // Implementation depends on your database
    console.log('Deleting integration connection:', id)
  }
}

export const integrationOAuthService = new IntegrationOAuthService()