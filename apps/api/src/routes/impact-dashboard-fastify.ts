import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { integrationOAuthService } from '../services/integration-oauth-service'
import { integrationMetricsService } from '../services/integration-metrics-service'
import { MockIntegrationDataService } from '../services/mock-integration-data'
import { cacheService, CacheKeys } from '../services/cache-service'
import { 
  ConnectIntegrationRequest,
  SyncIntegrationRequest,
  DisconnectIntegrationRequest,
  ImpactModule,
  ImpactWidget
} from '../types/impact-dashboard'

export async function impactDashboardRoutes(fastify: FastifyInstance) {
  // Authentication middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  // Get impact dashboard data for a venture
  fastify.get<{
    Params: { ventureId: string }
  }>('/impact/:ventureId', async (request, reply: FastifyReply) => {
    try {
      const { ventureId } = request.params

      // Check cache first for dashboard data
      const cacheKey = CacheKeys.DASHBOARD_METRICS + ':' + ventureId
      const cachedData = await cacheService.get(cacheKey)
      
      if (cachedData) {
        console.log(`🚀 Cache HIT for dashboard metrics: ${ventureId}`)
        return reply.send(cachedData)
      }

      console.log(`💾 Cache MISS for dashboard metrics: ${ventureId} - generating fresh data`)

      // Get mock integrations for the venture
      const mockConnections = MockIntegrationDataService.getMockConnections(ventureId)
      
      // Organize metrics into modules with mock data
      const modules: ImpactModule[] = [
        {
          id: 'community',
          name: 'Community Resilience',
          icon: '🌿',
          description: 'Building strong, interdependent communities that support each other',
          widgets: [
            {
              id: 'patreon-widget',
              integrationId: 'patreon-' + ventureId,
              platform: 'patreon',
              title: 'Creator Community Support',
              metrics: MockIntegrationDataService.getPatreonMetrics('liberation-collective'),
              lastSync: new Date(),
              isConnected: true,
              connectionStatus: 'connected'
            },
            {
              id: 'meetup-widget-community',
              integrationId: 'meetup-' + ventureId,
              platform: 'meetup',
              title: 'Local Community Building',
              metrics: MockIntegrationDataService.getMeetupMetrics('liberation-collective').slice(0, 2),
              lastSync: new Date(),
              isConnected: true,
              connectionStatus: 'connected'
            }
          ]
        },
        {
          id: 'knowledge',
          name: 'Knowledge Liberation',
          icon: '🧠',
          description: 'Sharing knowledge freely and building collective intelligence',
          widgets: [
            {
              id: 'github-widget',
              integrationId: 'github-' + ventureId,
              platform: 'github',
              title: 'Open Source Impact',
              metrics: MockIntegrationDataService.getGitHubMetrics('liberation-collective'),
              lastSync: new Date(),
              isConnected: true,
              connectionStatus: 'connected'
            }
          ]
        },
        {
          id: 'cultural',
          name: 'Cultural Impact',
          icon: '🎨',
          description: 'Creating and preserving culture that reflects our values',
          widgets: [
            {
              id: 'patreon-widget-cultural',
              integrationId: 'patreon-' + ventureId,
              platform: 'patreon',
              title: 'Creative Independence',
              metrics: MockIntegrationDataService.getPatreonMetrics('liberation-collective').slice(1, 4),
              lastSync: new Date(),
              isConnected: true,
              connectionStatus: 'connected'
            }
          ]
        },
        {
          id: 'movement',
          name: 'Movement Growth',
          icon: '🚀',
          description: 'Growing the liberation movement and inspiring others',
          widgets: [
            {
              id: 'meetup-widget-movement',
              integrationId: 'meetup-' + ventureId,
              platform: 'meetup',
              title: 'Movement Building Events',
              metrics: MockIntegrationDataService.getMeetupMetrics('liberation-collective').slice(2, 4),
              lastSync: new Date(),
              isConnected: true,
              connectionStatus: 'connected'
            }
          ]
        },
        {
          id: 'sovereignty',
          name: 'Personal Sovereignty',
          icon: '✊',
          description: 'Achieving independence from oppressive systems',
          widgets: []
        }
      ]

      const dashboardData = {
        success: true,
        data: {
          modules,
          lastSyncAt: new Date(),
          connectedIntegrations: mockConnections.length,
          totalMetrics: modules.reduce((total, module) => 
            total + module.widgets.reduce((widgetTotal, widget) => 
              widgetTotal + widget.metrics.length, 0), 0)
        }
      }
      
      // Cache dashboard data for 5 minutes
      await cacheService.set(cacheKey, dashboardData, cacheService.constructor.prototype.constructor.TTL.FIVE_MINUTES)
      console.log(`💾 Cached dashboard metrics: ${ventureId}`)
      
      return dashboardData
    } catch (error) {
      console.error('Failed to get impact dashboard:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to load impact dashboard',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Initiate OAuth flow for platform integration
  fastify.post<{
    Body: ConnectIntegrationRequest
  }>('/impact/integrations/connect', async (request, reply: FastifyReply) => {
    try {
      const { platform, ventureId } = request.body

      // Verify user has access to this venture
      // TODO: Add venture ownership verification

      const result = await integrationOAuthService.initiateOAuthFlow({
        platform,
        ventureId
      })

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Failed to initiate OAuth flow:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to start platform connection',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Handle OAuth callback
  fastify.get<{
    Querystring: {
      code: string
      state: string
      platform: string
    }
  }>('/impact/integrations/oauth/callback/:platform', async (request, reply: FastifyReply) => {
    try {
      const { code, state } = request.query
      const { platform } = request.params as { platform: string }

      const connection = await integrationOAuthService.handleOAuthCallback({
        code,
        state,
        platform: platform as any
      })

      // Redirect back to dashboard with success
      return reply.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=connected&platform=${platform}`)
    } catch (error) {
      console.error('OAuth callback failed:', error)
      // Redirect back to dashboard with error
      return reply.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Connection failed')}`)
    }
  })

  // Sync integration data
  fastify.post<{
    Body: SyncIntegrationRequest
  }>('/impact/integrations/sync', async (request, reply: FastifyReply) => {
    try {
      const { integrationId } = request.body

      // TODO: Get integration and verify ownership
      // const connection = await getIntegrationConnection(integrationId)
      // const result = await integrationMetricsService.syncIntegration(connection)

      return {
        success: true,
        data: {
          integrationId,
          success: true,
          metricsUpdated: 0,
          errors: [],
          nextSyncAt: new Date(Date.now() + 3600000)
        }
      }
    } catch (error) {
      console.error('Failed to sync integration:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to sync integration data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Disconnect integration
  fastify.delete<{
    Body: DisconnectIntegrationRequest
  }>('/impact/integrations/disconnect', async (request, reply: FastifyReply) => {
    try {
      const { integrationId, ventureId } = request.body

      await integrationOAuthService.disconnectIntegration(integrationId, ventureId)

      return {
        success: true,
        data: {
          message: 'Integration disconnected successfully',
          details: {
            dataRemoved: 'All cached metrics and connection data have been permanently deleted',
            tokenRevoked: 'Your authorization token has been revoked with the platform',
            privacy: 'We do not retain any of your platform data after disconnection',
            reconnect: 'You can reconnect at any time without penalty or data loss'
          }
        }
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to disconnect integration',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Get integration details (for disconnect confirmation)
  fastify.get<{
    Params: { integrationId: string }
  }>('/impact/integrations/:integrationId/details', async (request, reply: FastifyReply) => {
    try {
      const { integrationId } = request.params

      // Mock integration details for demonstration
      const integrationDetails = {
        id: integrationId,
        platform: integrationId.split('-')[0],
        accountName: 'liberation-collective',
        connectedSince: new Date(Date.now() - 86400000 * 30).toISOString(),
        lastSync: new Date(Date.now() - 300000).toISOString(),
        metricsCount: 4,
        dataStored: [
          'Public repository metrics (stars, forks, contributions)',
          'Community engagement data (supporters, posts, events)',
          'Growth trends and historical data (last 6 months)'
        ],
        permissions: [
          'Read public profile information',
          'Access public repository data',
          'View community metrics'
        ],
        disconnectNote: 'Disconnecting will immediately remove all stored data and revoke platform access. This action cannot be undone, but you can reconnect at any time.'
      }

      return {
        success: true,
        data: integrationDetails
      }
    } catch (error) {
      console.error('Failed to get integration details:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to load integration details',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Get available impact dashboard integrations
  fastify.get('/impact/integrations/available', async (request, reply: FastifyReply) => {
    try {
      const integrations = [
        {
          platform: 'github',
          name: 'GitHub',
          description: 'Track open source project impact and community growth',
          modules: ['knowledge'],
          icon: '🐙',
          isAvailable: true
        },
        {
          platform: 'patreon',
          name: 'Patreon',
          description: 'Track creator support and community funding',
          modules: ['cultural', 'community'],
          icon: '🎨',
          isAvailable: true
        },
        {
          platform: 'meetup',
          name: 'Meetup',
          description: 'Track real-world community building and event impact',
          modules: ['movement', 'community'],
          icon: '👥',
          isAvailable: true
        },
        // Future integrations
        {
          platform: 'opencollective',
          name: 'Open Collective',
          description: 'Track transparent funding for open source projects',
          modules: ['community', 'knowledge'],
          icon: '💰',
          isAvailable: false
        },
        {
          platform: 'substack',
          name: 'Substack',
          description: 'Track independent newsletter growth and engagement',
          modules: ['knowledge', 'cultural'],
          icon: '📝',
          isAvailable: false
        }
      ]

      return {
        success: true,
        data: integrations
      }
    } catch (error) {
      console.error('Failed to get available integrations:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to load available integrations',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })
}

export default impactDashboardRoutes