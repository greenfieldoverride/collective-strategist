import { IntegrationOAuthService } from '../../services/integration-oauth-service'
import { encryptionService } from '../../services/encryption-service'
import { ConnectIntegrationRequest, HandleOAuthCallbackRequest } from '../../types/impact-dashboard'

// Mock the encryption service
jest.mock('../../services/encryption-service')

describe('IntegrationOAuthService', () => {
  let service: IntegrationOAuthService
  
  beforeEach(() => {
    service = new IntegrationOAuthService()
    jest.clearAllMocks()
  })

  describe('initiateOAuthFlow', () => {
    it('should generate OAuth URL for GitHub integration', async () => {
      const request: ConnectIntegrationRequest = {
        platform: 'github',
        ventureId: 'test-venture-123'
      }

      const result = await service.initiateOAuthFlow(request)

      expect(result.authUrl).toContain('https://github.com/login/oauth/authorize')
      expect(result.authUrl).toContain('client_id=')
      expect(result.authUrl).toContain('scope=read%3Auser%20public_repo')
      expect(result.authUrl).toContain('code_challenge=')
      expect(result.state).toHaveLength(64) // 32 bytes as hex
    })

    it('should generate OAuth URL for Patreon integration', async () => {
      const request: ConnectIntegrationRequest = {
        platform: 'patreon',
        ventureId: 'test-venture-123'
      }

      const result = await service.initiateOAuthFlow(request)

      expect(result.authUrl).toContain('https://www.patreon.com/oauth2/authorize')
      expect(result.authUrl).toContain('scope=identity%20campaigns')
      expect(result.state).toHaveLength(64)
    })

    it('should generate OAuth URL for Meetup integration', async () => {
      const request: ConnectIntegrationRequest = {
        platform: 'meetup',
        ventureId: 'test-venture-123'
      }

      const result = await service.initiateOAuthFlow(request)

      expect(result.authUrl).toContain('https://secure.meetup.com/oauth2/authorize')
      expect(result.authUrl).toContain('scope=basic')
      expect(result.state).toHaveLength(64)
    })

    it('should throw error for unsupported platform', async () => {
      const request: ConnectIntegrationRequest = {
        platform: 'unsupported' as any,
        ventureId: 'test-venture-123'
      }

      await expect(service.initiateOAuthFlow(request))
        .rejects.toThrow('Unsupported integration platform: unsupported')
    })
  })

  describe('handleOAuthCallback', () => {
    beforeEach(() => {
      // Mock encryption
      (encryptionService.encryptGCM as jest.Mock).mockReturnValue('encrypted-token')
      
      // Mock fetch for token exchange
      global.fetch = jest.fn()
    })

    it('should handle GitHub OAuth callback successfully', async () => {
      const mockTokenResponse = {
        access_token: 'github_token_123',
        expires_in: 3600,
        refresh_token: 'github_refresh_123'
      }
      
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User'
      }

      // Mock token exchange
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse)
        })
        // Mock user info
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserResponse)
        })

      // Mock OAuth state retrieval
      jest.spyOn(service as any, 'getOAuthState').mockResolvedValue({
        ventureId: 'test-venture-123',
        platform: 'github',
        state: 'test-state',
        codeVerifier: 'test-verifier',
        createdAt: new Date()
      })

      jest.spyOn(service as any, 'storeIntegrationConnection').mockResolvedValue(undefined)
      jest.spyOn(service as any, 'deleteOAuthState').mockResolvedValue(undefined)

      const request: HandleOAuthCallbackRequest = {
        code: 'auth_code_123',
        state: 'test-state',
        platform: 'github'
      }

      const result = await service.handleOAuthCallback(request)

      expect(result.platform).toBe('github')
      expect(result.accountId).toBe('12345')
      expect(result.accountName).toBe('Test User')
      expect(result.ventureId).toBe('test-venture-123')
      expect(encryptionService.encryptGCM).toHaveBeenCalledWith('github_token_123')
    })

    it('should throw error for invalid OAuth state', async () => {
      jest.spyOn(service as any, 'getOAuthState').mockResolvedValue(null)

      const request: HandleOAuthCallbackRequest = {
        code: 'auth_code_123',
        state: 'invalid-state',
        platform: 'github'
      }

      await expect(service.handleOAuthCallback(request))
        .rejects.toThrow('Invalid OAuth state')
    })

    it('should handle token exchange failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      })

      jest.spyOn(service as any, 'getOAuthState').mockResolvedValue({
        ventureId: 'test-venture-123',
        platform: 'github',
        state: 'test-state',
        codeVerifier: 'test-verifier',
        createdAt: new Date()
      })

      const request: HandleOAuthCallbackRequest = {
        code: 'invalid_code',
        state: 'test-state',
        platform: 'github'
      }

      await expect(service.handleOAuthCallback(request))
        .rejects.toThrow('Token exchange failed: Bad Request')
    })
  })

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      (encryptionService.decryptGCM as jest.Mock).mockReturnValue('refresh_token_123')
      ;(encryptionService.encryptGCM as jest.Mock).mockReturnValue('encrypted-new-token')
      global.fetch = jest.fn()
    })

    it('should refresh access token successfully', async () => {
      const mockConnection = {
        id: 'conn-123',
        ventureId: 'venture-123',
        platform: 'github' as const,
        accountId: '12345',
        accountName: 'testuser',
        accessToken: 'encrypted-old-token',
        refreshToken: 'encrypted-refresh-token',
        tokenExpiresAt: new Date(),
        scopes: ['read:user'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockTokenResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      })

      jest.spyOn(service as any, 'storeIntegrationConnection').mockResolvedValue(undefined)

      const result = await service.refreshAccessToken(mockConnection)

      expect(result.id).toBe('conn-123')
      expect(encryptionService.decryptGCM).toHaveBeenCalledWith('encrypted-refresh-token')
      expect(encryptionService.encryptGCM).toHaveBeenCalledWith('new_access_token')
    })

    it('should throw error if no refresh token available', async () => {
      const mockConnection = {
        id: 'conn-123',
        ventureId: 'venture-123',
        platform: 'github' as const,
        accountId: '12345',
        accountName: 'testuser',
        accessToken: 'encrypted-token',
        refreshToken: undefined,
        scopes: ['read:user'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await expect(service.refreshAccessToken(mockConnection))
        .rejects.toThrow('No refresh token available')
    })
  })

  describe('disconnectIntegration', () => {
    it('should disconnect integration successfully', async () => {
      const mockConnection = {
        id: 'conn-123',
        ventureId: 'venture-123',
        platform: 'github' as const,
        accountId: '12345',
        accountName: 'testuser',
        accessToken: 'encrypted-token',
        scopes: ['read:user'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      jest.spyOn(service as any, 'getIntegrationConnection').mockResolvedValue(mockConnection)
      jest.spyOn(service as any, 'revokeToken').mockResolvedValue(undefined)
      jest.spyOn(service as any, 'deleteIntegrationConnection').mockResolvedValue(undefined)

      await service.disconnectIntegration('conn-123', 'venture-123')

      expect(service as any).toHaveProperty('deleteIntegrationConnection')
    })

    it('should throw error if integration not found', async () => {
      jest.spyOn(service as any, 'getIntegrationConnection').mockResolvedValue(null)

      await expect(service.disconnectIntegration('invalid-id', 'venture-123'))
        .rejects.toThrow('Integration not found or access denied')
    })

    it('should throw error if venture ID does not match', async () => {
      const mockConnection = {
        id: 'conn-123',
        ventureId: 'different-venture',
        platform: 'github' as const,
        accountId: '12345',
        accountName: 'testuser',
        accessToken: 'encrypted-token',
        scopes: ['read:user'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      jest.spyOn(service as any, 'getIntegrationConnection').mockResolvedValue(mockConnection)

      await expect(service.disconnectIntegration('conn-123', 'venture-123'))
        .rejects.toThrow('Integration not found or access denied')
    })
  })
})