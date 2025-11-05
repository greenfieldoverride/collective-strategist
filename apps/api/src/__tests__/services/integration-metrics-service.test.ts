import { IntegrationMetricsService } from '../../services/integration-metrics-service'
import { encryptionService } from '../../services/encryption-service'
import { IntegrationConnection } from '../../types/impact-dashboard'

// Mock the encryption service
jest.mock('../../services/encryption-service')

describe('IntegrationMetricsService', () => {
  let service: IntegrationMetricsService
  
  beforeEach(() => {
    service = new IntegrationMetricsService()
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('syncIntegration', () => {
    const mockConnection: IntegrationConnection = {
      id: 'conn-123',
      ventureId: 'venture-123',
      platform: 'github',
      accountId: '12345',
      accountName: 'testuser',
      accessToken: 'encrypted-token',
      scopes: ['read:user', 'public_repo'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    beforeEach(() => {
      (encryptionService.decryptGCM as jest.Mock).mockReturnValue('decrypted-token')
      jest.spyOn(service as any, 'storeMetrics').mockResolvedValue(undefined)
    })

    it('should sync GitHub metrics successfully', async () => {
      // Mock GitHub API responses
      const mockRepos = [
        {
          name: 'test-repo-1',
          private: false,
          stargazers_count: 50,
          forks_count: 10,
          open_issues_count: 5
        },
        {
          name: 'test-repo-2', 
          private: false,
          stargazers_count: 100,
          forks_count: 25,
          open_issues_count: 3
        }
      ]

      const mockEvents = [
        { type: 'PushEvent' },
        { type: 'PullRequestEvent' },
        { type: 'IssuesEvent' },
        { type: 'WatchEvent' }
      ]

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRepos)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvents)
        })

      const result = await service.syncIntegration(mockConnection)

      expect(result.success).toBe(true)
      expect(result.metricsUpdated).toBe(4) // stars, forks, repos, contributions
      expect(result.errors).toHaveLength(0)

      // Verify API calls
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?type=owner&per_page=100',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer decrypted-token'
          })
        })
      )
    })

    it('should sync Patreon metrics successfully', async () => {
      const patreonConnection = { ...mockConnection, platform: 'patreon' as const }
      
      const mockCampaigns = {
        data: [{
          id: 'campaign-123',
          attributes: {
            pledge_sum: 50000, // $500.00 in cents
            creation_count: 25
          }
        }]
      }

      const mockMembers = {
        data: [
          { attributes: { patron_status: 'active_patron' } },
          { attributes: { patron_status: 'active_patron' } },
          { attributes: { patron_status: 'declined_patron' } }
        ]
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCampaigns)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers)
        })

      const result = await service.syncIntegration(patreonConnection)

      expect(result.success).toBe(true)
      expect(result.metricsUpdated).toBe(3) // patrons, income, posts
      expect(result.errors).toHaveLength(0)
    })

    it('should sync Meetup metrics successfully', async () => {
      const meetupConnection = { ...mockConnection, platform: 'meetup' as const }
      
      const mockGroups = [
        { 
          id: 'group-1',
          urlname: 'test-group-1',
          members: 150
        },
        {
          id: 'group-2', 
          urlname: 'test-group-2',
          members: 200
        }
      ]

      const mockEvents = [
        { status: 'upcoming' },
        { status: 'past' },
        { status: 'past' },
        { status: 'upcoming' }
      ]

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGroups)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvents)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvents)
        })

      const result = await service.syncIntegration(meetupConnection)

      expect(result.success).toBe(true)
      expect(result.metricsUpdated).toBe(4) // members, groups, events, upcoming
      expect(result.errors).toHaveLength(0)
    })

    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      })

      const result = await service.syncIntegration(mockConnection)

      expect(result.success).toBe(false)
      expect(result.metricsUpdated).toBe(0)
      expect(result.errors).toContain('GitHub API error: Unauthorized')
    })

    it('should handle unsupported platform', async () => {
      const unsupportedConnection = { 
        ...mockConnection, 
        platform: 'unsupported' as any 
      }

      const result = await service.syncIntegration(unsupportedConnection)

      expect(result.success).toBe(false)
      expect(result.metricsUpdated).toBe(0)
      expect(result.errors).toContain('Unsupported platform: unsupported')
    })
  })

  describe('GitHub metrics processing', () => {
    it('should generate liberation-focused GitHub metrics', async () => {
      const metrics = await (service as any).syncGitHubMetrics('token', 'testuser')

      expect(metrics).toHaveLength(4)
      
      const starsMetric = metrics.find((m: any) => m.id === 'github_stars')
      expect(starsMetric).toMatchObject({
        name: 'Total Stars',
        icon: '⭐',
        context: expect.stringContaining('community appreciation')
      })

      const forksMetric = metrics.find((m: any) => m.id === 'github_forks') 
      expect(forksMetric).toMatchObject({
        name: 'Total Forks',
        icon: '🍴',
        context: expect.stringContaining('liberation tools')
      })

      const reposMetric = metrics.find((m: any) => m.id === 'github_repos')
      expect(reposMetric).toMatchObject({
        name: 'Public Repositories',
        icon: '📦',
        context: expect.stringContaining('knowledge freely shared')
      })

      const contributionsMetric = metrics.find((m: any) => m.id === 'github_contributions')
      expect(contributionsMetric).toMatchObject({
        name: 'Recent Contributions',
        icon: '💻',
        context: expect.stringContaining('collaborative development')
      })
    })
  })

  describe('Patreon metrics processing', () => {
    it('should generate liberation-focused Patreon metrics', async () => {
      // Mock successful Patreon API responses
      const mockCampaigns = {
        data: [{
          id: 'campaign-123',
          attributes: {
            pledge_sum: 50000,
            creation_count: 25
          }
        }]
      }

      const mockMembers = {
        data: [
          { attributes: { patron_status: 'active_patron' } },
          { attributes: { patron_status: 'active_patron' } }
        ]
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCampaigns)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers)
        })

      const metrics = await (service as any).syncPatreonMetrics('token')

      expect(metrics).toHaveLength(3)

      const patronsMetric = metrics.find((m: any) => m.id === 'patreon_patrons')
      expect(patronsMetric).toMatchObject({
        name: 'Active Patrons',
        icon: '🤝',
        context: expect.stringContaining('creative independence')
      })

      const incomeMetric = metrics.find((m: any) => m.id === 'patreon_income')
      expect(incomeMetric).toMatchObject({
        name: 'Monthly Support',
        icon: '💰',
        context: expect.stringContaining('corporate dependency')
      })
    })
  })

  describe('Meetup metrics processing', () => {
    it('should generate liberation-focused Meetup metrics', async () => {
      const mockGroups = [
        { 
          urlname: 'test-group',
          members: 150
        }
      ]

      const mockEvents = [
        { status: 'upcoming' },
        { status: 'past' }
      ]

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGroups)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvents)
        })

      const metrics = await (service as any).syncMeetupMetrics('token')

      expect(metrics).toHaveLength(4)

      const membersMetric = metrics.find((m: any) => m.id === 'meetup_members')
      expect(membersMetric).toMatchObject({
        name: 'Total Members',
        icon: '👥',
        context: expect.stringContaining('local community network')
      })

      const eventsMetric = metrics.find((m: any) => m.id === 'meetup_events')
      expect(eventsMetric).toMatchObject({
        name: 'Total Events',
        icon: '📅',
        context: expect.stringContaining('solidarity networks')
      })
    })
  })
})