import { build } from '../../index'
import { FastifyInstance } from 'fastify'

describe('Impact Dashboard API Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/v1/impact/:ventureId', () => {
    it('should return impact dashboard data for authenticated user', async () => {
      // Mock JWT token
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/venture-123',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('modules')
      expect(data.data.modules).toHaveLength(5)
      
      // Verify all five modules are present
      const moduleIds = data.data.modules.map((m: any) => m.id)
      expect(moduleIds).toContain('community')
      expect(moduleIds).toContain('knowledge')
      expect(moduleIds).toContain('cultural')
      expect(moduleIds).toContain('movement')
      expect(moduleIds).toContain('sovereignty')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/venture-123'
      })

      expect(response.statusCode).toBe(401)
    })

    it('should include module structure with liberation focus', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/venture-123',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      const data = JSON.parse(response.payload)
      const communityModule = data.data.modules.find((m: any) => m.id === 'community')
      
      expect(communityModule).toMatchObject({
        id: 'community',
        name: 'Community Resilience',
        icon: '🌿',
        description: expect.stringContaining('interdependent communities')
      })
    })
  })

  describe('GET /api/v1/impact/integrations/available', () => {
    it('should return available integrations for authenticated user', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/integrations/available',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data).toBeInstanceOf(Array)
      
      // Verify MVP integrations are present
      const platforms = data.data.map((i: any) => i.platform)
      expect(platforms).toContain('github')
      expect(platforms).toContain('patreon')
      expect(platforms).toContain('meetup')
    })

    it('should include integration details with liberation modules', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/integrations/available',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      const data = JSON.parse(response.payload)
      const githubIntegration = data.data.find((i: any) => i.platform === 'github')
      
      expect(githubIntegration).toMatchObject({
        platform: 'github',
        name: 'GitHub',
        description: expect.stringContaining('open source project impact'),
        modules: ['knowledge'],
        icon: '🐙',
        isAvailable: true
      })
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/integrations/available'
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/impact/integrations/connect', () => {
    it('should initiate OAuth flow for GitHub integration', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/impact/integrations/connect',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        payload: {
          platform: 'github',
          ventureId: 'venture-123'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('authUrl')
      expect(data.data).toHaveProperty('state')
      expect(data.data.authUrl).toContain('github.com/login/oauth/authorize')
    })

    it('should initiate OAuth flow for Patreon integration', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/impact/integrations/connect',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        payload: {
          platform: 'patreon',
          ventureId: 'venture-123'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data.authUrl).toContain('patreon.com/oauth2/authorize')
    })

    it('should return error for unsupported platform', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/impact/integrations/connect',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        payload: {
          platform: 'unsupported',
          ventureId: 'venture-123'
        }
      })

      expect(response.statusCode).toBe(500)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('platform connection')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/impact/integrations/connect',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          platform: 'github',
          ventureId: 'venture-123'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/impact/integrations/sync', () => {
    it('should sync integration data for authenticated user', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/impact/integrations/sync',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        payload: {
          integrationId: 'integration-123'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('integrationId')
      expect(data.data).toHaveProperty('success')
      expect(data.data).toHaveProperty('nextSyncAt')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/impact/integrations/sync',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          integrationId: 'integration-123'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('DELETE /api/v1/impact/integrations/disconnect', () => {
    it('should disconnect integration for authenticated user', async () => {
      const token = app.jwt.sign({ id: 'user-123', email: 'test@example.com' })

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/impact/integrations/disconnect',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        payload: {
          integrationId: 'integration-123',
          ventureId: 'venture-123'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data.message).toContain('disconnected successfully')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/impact/integrations/disconnect',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          integrationId: 'integration-123',
          ventureId: 'venture-123'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/impact/integrations/oauth/callback/:platform', () => {
    it('should handle OAuth callback and redirect to dashboard', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/integrations/oauth/callback/github?code=auth_code_123&state=oauth_state_123'
      })

      // Should redirect on successful OAuth callback
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('/dashboard')
    })

    it('should redirect with error on OAuth failure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/impact/integrations/oauth/callback/github?code=invalid_code&state=invalid_state'
      })

      // Should redirect with error message
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('integration=error')
    })
  })
})