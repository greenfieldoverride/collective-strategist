import { encryptionService } from './encryption-service'
import { 
  IntegrationConnection, 
  ImpactMetric, 
  IntegrationSyncResult
} from '../types/impact-dashboard'

export class IntegrationMetricsService {
  async syncIntegration(connection: IntegrationConnection): Promise<IntegrationSyncResult> {
    try {
      const accessToken = encryptionService.decryptGCM(connection.accessToken)
      let metrics: ImpactMetric[] = []

      switch (connection.platform) {
        case 'github':
          metrics = await this.syncGitHubMetrics(accessToken, connection.accountName)
          break
        case 'patreon':
          metrics = await this.syncPatreonMetrics(accessToken)
          break
        case 'meetup':
          metrics = await this.syncMeetupMetrics(accessToken)
          break
        default:
          throw new Error(`Unsupported platform: ${connection.platform}`)
      }

      // Store metrics in database
      await this.storeMetrics(connection.id, metrics)

      return {
        integrationId: connection.id,
        success: true,
        metricsUpdated: metrics.length,
        errors: [],
        nextSyncAt: new Date(Date.now() + 3600000) // Next sync in 1 hour
      }
    } catch (error) {
      console.error(`Failed to sync ${connection.platform} integration:`, error)
      return {
        integrationId: connection.id,
        success: false,
        metricsUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        nextSyncAt: new Date(Date.now() + 1800000) // Retry in 30 minutes
      }
    }
  }

  private async syncGitHubMetrics(accessToken: string, username: string): Promise<ImpactMetric[]> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Collective-Strategist/1.0'
    }

    // Get user's repositories
    const reposResponse = await fetch(`https://api.github.com/user/repos?type=owner&per_page=100`, {
      headers
    })

    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.statusText}`)
    }

    const repos = await reposResponse.json()
    
    // Aggregate metrics
    let totalStars = 0
    let totalForks = 0
    let totalIssues = 0
    let publicRepos = 0
    let contributions = 0

    for (const repo of repos) {
      if (!repo.private) {
        publicRepos++
        totalStars += repo.stargazers_count || 0
        totalForks += repo.forks_count || 0
        totalIssues += repo.open_issues_count || 0
      }
    }

    // Get contribution activity (simplified)
    const eventsResponse = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
      headers
    })

    if (eventsResponse.ok) {
      const events = await eventsResponse.json()
      contributions = events.filter((event: any) => 
        ['PushEvent', 'PullRequestEvent', 'IssuesEvent'].includes(event.type)
      ).length
    }

    return [
      {
        id: 'github_stars',
        name: 'Total Stars',
        value: totalStars,
        displayValue: totalStars.toLocaleString(),
        trend: 'stable',
        context: 'Stars represent community appreciation and adoption of your open source work',
        icon: '⭐'
      },
      {
        id: 'github_forks',
        name: 'Total Forks',
        value: totalForks,
        displayValue: totalForks.toLocaleString(),
        trend: 'stable',
        context: 'Forks show how others build upon your liberation tools and ideas',
        icon: '🍴'
      },
      {
        id: 'github_repos',
        name: 'Public Repositories',
        value: publicRepos,
        displayValue: publicRepos.toString(),
        trend: 'stable',
        context: 'Public repos represent knowledge freely shared with the community',
        icon: '📦'
      },
      {
        id: 'github_contributions',
        name: 'Recent Contributions',
        value: contributions,
        displayValue: contributions.toString(),
        trend: 'up',
        context: 'Active contributions show ongoing commitment to collaborative development',
        icon: '💻'
      }
    ]
  }

  private async syncPatreonMetrics(accessToken: string): Promise<ImpactMetric[]> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }

    // Get user's campaigns
    const campaignsResponse = await fetch('https://www.patreon.com/api/oauth2/v2/campaigns?include=creator', {
      headers
    })

    if (!campaignsResponse.ok) {
      throw new Error(`Patreon API error: ${campaignsResponse.statusText}`)
    }

    const campaignsData = await campaignsResponse.json()
    const campaign = campaignsData.data[0] // Assuming first campaign

    if (!campaign) {
      return []
    }

    // Get campaign members (patrons)
    const membersResponse = await fetch(
      `https://www.patreon.com/api/oauth2/v2/campaigns/${campaign.id}/members?include=user&fields%5Bmember%5D=patron_status,pledge_relationship_start`, 
      { headers }
    )

    let patronCount = 0
    let monthlyIncome = 0

    if (membersResponse.ok) {
      const membersData = await membersResponse.json()
      patronCount = membersData.data?.filter((member: any) => member.attributes.patron_status === 'active_patron').length || 0
    }

    // Extract financial data from campaign
    const pledgeSum = campaign.attributes.pledge_sum || 0
    monthlyIncome = pledgeSum / 100 // Convert from cents

    return [
      {
        id: 'patreon_patrons',
        name: 'Active Patrons',
        value: patronCount,
        displayValue: patronCount.toString(),
        trend: 'stable',
        context: 'Patrons represent sustained community support for your creative independence',
        icon: '🤝'
      },
      {
        id: 'patreon_income',
        name: 'Monthly Support',
        value: monthlyIncome,
        displayValue: `$${monthlyIncome.toFixed(2)}`,
        trend: 'stable',
        context: 'Direct community funding enables creative freedom without corporate dependency',
        icon: '💰'
      },
      {
        id: 'patreon_creation_count',
        name: 'Published Posts',
        value: campaign.attributes.creation_count || 0,
        displayValue: (campaign.attributes.creation_count || 0).toString(),
        trend: 'up',
        context: 'Regular content creation builds trust and delivers value to your community',
        icon: '📝'
      }
    ]
  }

  private async syncMeetupMetrics(accessToken: string): Promise<ImpactMetric[]> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }

    // Get user's groups (where they are an organizer)
    const groupsResponse = await fetch('https://api.meetup.com/self/groups', {
      headers
    })

    if (!groupsResponse.ok) {
      throw new Error(`Meetup API error: ${groupsResponse.statusText}`)
    }

    const groups = await groupsResponse.json()
    
    let totalMembers = 0
    let totalEvents = 0
    let upcomingEvents = 0

    for (const group of groups) {
      totalMembers += group.members || 0
      
      // Get events for this group
      try {
        const eventsResponse = await fetch(
          `https://api.meetup.com/${group.urlname}/events?status=past,upcoming&page=200`, 
          { headers }
        )
        
        if (eventsResponse.ok) {
          const events = await eventsResponse.json()
          totalEvents += events.length
          upcomingEvents += events.filter((event: any) => event.status === 'upcoming').length
        }
      } catch (error) {
        console.warn(`Failed to get events for group ${group.urlname}:`, error)
      }
    }

    return [
      {
        id: 'meetup_members',
        name: 'Total Members',
        value: totalMembers,
        displayValue: totalMembers.toLocaleString(),
        trend: 'stable',
        context: 'Members represent real people in your local community network',
        icon: '👥'
      },
      {
        id: 'meetup_groups',
        name: 'Organized Groups',
        value: groups.length,
        displayValue: groups.length.toString(),
        trend: 'stable',
        context: 'Groups you organize create spaces for in-person community building',
        icon: '🏢'
      },
      {
        id: 'meetup_events',
        name: 'Total Events',
        value: totalEvents,
        displayValue: totalEvents.toString(),
        trend: 'up',
        context: 'Events bring people together and strengthen local solidarity networks',
        icon: '📅'
      },
      {
        id: 'meetup_upcoming',
        name: 'Upcoming Events',
        value: upcomingEvents,
        displayValue: upcomingEvents.toString(),
        trend: 'stable',
        context: 'Planned events show active community engagement and future impact',
        icon: '🗓️'
      }
    ]
  }

  async getVentureMetrics(_ventureId: string): Promise<ImpactMetric[]> {
    // Retrieve all metrics for a venture from database
    // For now, return mock data
    return []
  }

  private async storeMetrics(integrationId: string, metrics: ImpactMetric[]): Promise<void> {
    // Store metrics in database
    // Implementation depends on your database choice
    console.log(`Storing ${metrics.length} metrics for integration ${integrationId}`)
    
    for (const metric of metrics) {
      console.log(`- ${metric.name}: ${metric.displayValue}`)
    }
  }

  async scheduleIntegrationSync(ventureId: string): Promise<void> {
    // Get all active integrations for venture
    const connections = await this.getVentureIntegrations(ventureId)
    
    // Schedule sync jobs for each integration
    for (const connection of connections) {
      if (this.shouldSync(connection)) {
        await this.syncIntegration(connection)
      }
    }
  }

  private shouldSync(connection: IntegrationConnection): boolean {
    if (!connection.isActive) return false
    
    // Check if token is expired
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      return false // Should refresh token first
    }
    
    // Check last sync time (sync every hour)
    if (connection.lastSyncAt) {
      const hoursSinceLastSync = (Date.now() - connection.lastSyncAt.getTime()) / (1000 * 60 * 60)
      return hoursSinceLastSync >= 1
    }
    
    return true // Never synced before
  }

  private async getVentureIntegrations(_ventureId: string): Promise<IntegrationConnection[]> {
    // Get integrations from database
    // For now, return empty array
    return []
  }
}

export const integrationMetricsService = new IntegrationMetricsService()