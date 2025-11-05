import { ImpactMetric, IntegrationConnection } from '../types/impact-dashboard'

// Mock integration data for development
export class MockIntegrationDataService {
  
  // Generate realistic GitHub metrics for different types of users
  static getGitHubMetrics(accountName: string = 'test-user'): ImpactMetric[] {
    // Different profiles based on account name or venture type
    const profiles = {
      'liberation-collective': {
        stars: 1247,
        forks: 324,
        repos: 18,
        contributions: 89,
        context: 'liberation tools and community projects'
      },
      'creative-hub': {
        stars: 89,
        forks: 23,
        repos: 8,
        contributions: 45,
        context: 'creative tools and artistic projects'
      },
      'solo-consultant': {
        stars: 156,
        forks: 42,
        repos: 12,
        contributions: 67,
        context: 'professional consulting tools'
      },
      'default': {
        stars: 234,
        forks: 67,
        repos: 11,
        contributions: 52,
        context: 'open source projects'
      }
    }

    const profile = profiles[accountName as keyof typeof profiles] || profiles.default

    return [
      {
        id: 'github_stars',
        name: 'Total Stars',
        value: profile.stars,
        displayValue: profile.stars.toLocaleString(),
        trend: 'up',
        changePercent: 12.5,
        context: `Community appreciation for your ${profile.context} - each star represents someone who values your liberation work`,
        icon: '⭐'
      },
      {
        id: 'github_forks',
        name: 'Total Forks',
        value: profile.forks,
        displayValue: profile.forks.toLocaleString(),
        trend: 'up',
        changePercent: 8.3,
        context: `Others building upon your ${profile.context} - forks show how your work enables further innovation`,
        icon: '🍴'
      },
      {
        id: 'github_repos',
        name: 'Public Repositories',
        value: profile.repos,
        displayValue: profile.repos.toString(),
        trend: 'stable',
        context: `${profile.context} shared openly - every public repo is knowledge liberated from corporate gatekeeping`,
        icon: '📦'
      },
      {
        id: 'github_contributions',
        name: 'Recent Contributions',
        value: profile.contributions,
        displayValue: profile.contributions.toString(),
        trend: 'up',
        changePercent: 15.2,
        context: 'Active participation in collaborative development - building the commons together',
        icon: '💻'
      }
    ]
  }

  // Generate realistic Patreon metrics
  static getPatreonMetrics(accountName: string = 'test-creator'): ImpactMetric[] {
    const profiles = {
      'liberation-collective': {
        patrons: 156,
        monthly: 2850,
        posts: 48,
        context: 'liberation education and tools'
      },
      'creative-hub': {
        patrons: 89,
        monthly: 1240,
        posts: 32,
        context: 'independent creative work'
      },
      'solo-consultant': {
        patrons: 34,
        monthly: 680,
        posts: 24,
        context: 'business strategy content'
      },
      'default': {
        patrons: 67,
        monthly: 980,
        posts: 28,
        context: 'creative independence'
      }
    }

    const profile = profiles[accountName as keyof typeof profiles] || profiles.default

    return [
      {
        id: 'patreon_patrons',
        name: 'Active Patrons',
        value: profile.patrons,
        displayValue: profile.patrons.toString(),
        trend: 'up',
        changePercent: 18.5,
        context: `Community members directly funding your ${profile.context} - breaking free from advertiser-driven models`,
        icon: '🤝'
      },
      {
        id: 'patreon_income',
        name: 'Monthly Support',
        value: profile.monthly,
        displayValue: `$${profile.monthly.toLocaleString()}`,
        trend: 'up',
        changePercent: 22.3,
        context: 'Direct community funding enabling creative freedom without corporate dependency or platform algorithms',
        icon: '💰'
      },
      {
        id: 'patreon_posts',
        name: 'Content Created',
        value: profile.posts,
        displayValue: profile.posts.toString(),
        trend: 'up',
        changePercent: 9.1,
        context: 'Regular creation builds trust and delivers value - consistent output strengthens community bonds',
        icon: '📝'
      },
      {
        id: 'patreon_engagement',
        name: 'Community Engagement',
        value: 87,
        displayValue: '87%',
        trend: 'stable',
        context: 'High engagement shows authentic connection with supporters rather than passive consumption',
        icon: '❤️'
      }
    ]
  }

  // Generate realistic Meetup metrics
  static getMeetupMetrics(accountName: string = 'test-organizer'): ImpactMetric[] {
    const profiles = {
      'liberation-collective': {
        members: 342,
        groups: 3,
        events: 24,
        upcoming: 4,
        context: 'liberation technology and community sovereignty'
      },
      'creative-hub': {
        members: 189,
        groups: 2,
        events: 18,
        upcoming: 3,
        context: 'creative independence and artistic collaboration'
      },
      'solo-consultant': {
        members: 67,
        groups: 1,
        events: 12,
        upcoming: 2,
        context: 'professional development and business strategy'
      },
      'default': {
        members: 124,
        groups: 2,
        events: 15,
        upcoming: 2,
        context: 'community building and mutual support'
      }
    }

    const profile = profiles[accountName as keyof typeof profiles] || profiles.default

    return [
      {
        id: 'meetup_members',
        name: 'Total Members',
        value: profile.members,
        displayValue: profile.members.toLocaleString(),
        trend: 'up',
        changePercent: 14.7,
        context: `Real people in your local ${profile.context} network - face-to-face connections that algorithms can't mediate`,
        icon: '👥'
      },
      {
        id: 'meetup_groups',
        name: 'Organized Groups',
        value: profile.groups,
        displayValue: profile.groups.toString(),
        trend: 'stable',
        context: `${profile.context} communities you've created - spaces for in-person solidarity and skill sharing`,
        icon: '🏢'
      },
      {
        id: 'meetup_events',
        name: 'Total Events',
        value: profile.events,
        displayValue: profile.events.toString(),
        trend: 'up',
        changePercent: 11.2,
        context: 'Gatherings that strengthen local networks and build real-world community resilience',
        icon: '📅'
      },
      {
        id: 'meetup_upcoming',
        name: 'Upcoming Events',
        value: profile.upcoming,
        displayValue: profile.upcoming.toString(),
        trend: 'stable',
        context: 'Planned gatherings show ongoing commitment to community building and future impact',
        icon: '🗓️'
      }
    ]
  }

  // Generate mock integration connections for a venture
  static getMockConnections(ventureId: string): IntegrationConnection[] {
    const baseDate = new Date()
    
    return [
      {
        id: `github-${ventureId}`,
        ventureId,
        platform: 'github',
        accountId: 'liberation-collective',
        accountName: 'liberation-collective',
        accessToken: 'encrypted-github-token',
        scopes: ['read:user', 'public_repo'],
        isActive: true,
        lastSyncAt: new Date(baseDate.getTime() - 300000), // 5 minutes ago
        createdAt: new Date(baseDate.getTime() - 86400000 * 30), // 30 days ago
        updatedAt: new Date(baseDate.getTime() - 300000)
      },
      {
        id: `patreon-${ventureId}`,
        ventureId,
        platform: 'patreon',
        accountId: 'liberation-creator',
        accountName: 'Liberation Creator',
        accessToken: 'encrypted-patreon-token',
        scopes: ['identity', 'campaigns'],
        isActive: true,
        lastSyncAt: new Date(baseDate.getTime() - 600000), // 10 minutes ago
        createdAt: new Date(baseDate.getTime() - 86400000 * 45), // 45 days ago
        updatedAt: new Date(baseDate.getTime() - 600000)
      },
      {
        id: `meetup-${ventureId}`,
        ventureId,
        platform: 'meetup',
        accountId: 'tech-liberation-organizer',
        accountName: 'Tech Liberation Organizer',
        accessToken: 'encrypted-meetup-token',
        scopes: ['basic'],
        isActive: true,
        lastSyncAt: new Date(baseDate.getTime() - 900000), // 15 minutes ago
        createdAt: new Date(baseDate.getTime() - 86400000 * 60), // 60 days ago
        updatedAt: new Date(baseDate.getTime() - 900000)
      }
    ]
  }

  // Get metrics for a specific platform and account
  static getMetricsForPlatform(platform: string, accountName: string): ImpactMetric[] {
    switch (platform) {
      case 'github':
        return this.getGitHubMetrics(accountName)
      case 'patreon':
        return this.getPatreonMetrics(accountName)
      case 'meetup':
        return this.getMeetupMetrics(accountName)
      default:
        return []
    }
  }

  // Generate time-series data for trends (for future charts)
  static generateTrendData(baseValue: number, months: number = 6): Array<{date: string, value: number}> {
    const trends = []
    const now = new Date()
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
      const growth = 1 + (0.05 * (months - i)) // 5% monthly growth trend
      const value = Math.round(baseValue * growth * (1 + variation))
      
      trends.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, value)
      })
    }
    
    return trends
  }
}