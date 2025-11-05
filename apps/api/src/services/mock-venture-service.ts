import { 
  Venture, 
  VentureMember, 
  CreateVentureRequest,
  UpdateVentureRequest,
  GetVenturesRequest,
  InviteMemberRequest,
  VentureStatsResponse
} from '../types/collective-strategist';
import { v4 as uuidv4 } from 'uuid';

// Mock ventures for local development and testing
export class MockVentureService {
  private ventures: Map<string, Venture> = new Map();
  private members: Map<string, VentureMember[]> = new Map();

  constructor() {
    // Initialize with some sample ventures
    this.initializeMockData();
  }

  private initializeMockData() {
    const sampleVentures: Venture[] = [
      {
        id: 'venture-liberation-collective',
        name: 'Liberation Collective',
        description: 'A cooperative focused on building liberation technologies and supporting community sovereignty',
        ventureType: 'cooperative',
        primaryBillingOwner: 'uuid-placeholder',
        billingTier: 'liberation',
        maxMembers: 50,
        status: 'active' as const,
        lastActivityAt: new Date(),
        isGreenfieldAffiliate: true,
        sovereignCircleId: 'sovereign-circle-1',
        coreValues: [
          'Community sovereignty',
          'Open source technology',
          'Economic justice',
          'Mutual aid'
        ],
        primaryGoals: [
          'Build liberation-focused software tools',
          'Support local community resilience',
          'Create sustainable funding models',
          'Share knowledge freely'
        ],
        ventureVoice: 'Collaborative, empowering, and focused on systemic change. We speak to people ready to build alternatives to oppressive systems.',
        targetAudience: 'Activists, technologists, and community organizers working toward liberation',
        costSharingEnabled: true,
        costSharingMethod: 'contribution_based',
        monthlyBudget: 8500,
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-01')
      },
      {
        id: 'venture-creative-commons',
        name: 'Creative Commons Studio',
        description: 'Independent creative studio producing liberation-themed art, music, and media',
        ventureType: 'professional',
        primaryBillingOwner: 'uuid-placeholder',
        billingTier: 'professional',
        maxMembers: 12,
        currentMembers: 5,
        isGreenfieldAffiliate: false,
        coreValues: [
          'Artistic freedom',
          'Cultural preservation',
          'Anti-capitalist creativity',
          'Community storytelling'
        ],
        primaryGoals: [
          'Create independent media content',
          'Support marginalized artists',
          'Build sustainable creative economy',
          'Preserve cultural knowledge'
        ],
        ventureVoice: 'Creative, inclusive, and culturally rooted. We center marginalized voices and challenge dominant narratives.',
        targetAudience: 'Artists, cultural workers, and communities seeking authentic representation',
        costSharingEnabled: true,
        costSharingMethod: 'equal',
        monthlyBudget: 4200,
        isActive: true,
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-11-28')
      },
      {
        id: 'venture-solo-consultant',
        name: 'Sovereign Strategies',
        description: 'Solo consulting practice helping organizations transition to cooperative and liberation-focused models',
        ventureType: 'solo',
        primaryBillingOwner: 'uuid-placeholder',
        billingTier: 'professional',
        maxMembers: 1,
        currentMembers: 1,
        isGreenfieldAffiliate: false,
        coreValues: [
          'Organizational liberation',
          'Worker empowerment',
          'Systemic transformation',
          'Ethical business practices'
        ],
        primaryGoals: [
          'Help organizations become more democratic',
          'Build sustainable consulting practice',
          'Develop liberation-focused methodologies',
          'Support cooperative movement'
        ],
        ventureVoice: 'Professional yet approachable, focused on practical transformation and empowerment',
        targetAudience: 'Progressive organizations, cooperatives, and mission-driven businesses',
        costSharingEnabled: false,
        monthlyBudget: 6800,
        isActive: true,
        createdAt: new Date('2024-05-20'),
        updatedAt: new Date('2024-12-15')
      }
    ];

    // Store ventures
    sampleVentures.forEach(venture => {
      this.ventures.set(venture.id, venture);
    });

    // Add sample members
    this.members.set('venture-liberation-collective', [
      {
        id: 'member-1',
        userId: 'uuid-placeholder',
        ventureId: 'venture-liberation-collective',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        joinedAt: new Date('2024-01-15'),
        isActive: true
      },
      {
        id: 'member-2',
        userId: 'user-2',
        ventureId: 'venture-liberation-collective',
        role: 'member',
        permissions: ['read', 'write'],
        joinedAt: new Date('2024-02-01'),
        isActive: true
      }
    ]);

    this.members.set('venture-creative-commons', [
      {
        id: 'member-3',
        userId: 'uuid-placeholder',
        ventureId: 'venture-creative-commons',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        joinedAt: new Date('2024-03-10'),
        isActive: true
      }
    ]);

    this.members.set('venture-solo-consultant', [
      {
        id: 'member-4',
        userId: 'uuid-placeholder',
        ventureId: 'venture-solo-consultant',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        joinedAt: new Date('2024-05-20'),
        isActive: true
      }
    ]);
  }

  async getUserVentures(userId: string, request?: GetVenturesRequest): Promise<Venture[]> {
    // Return all ventures where the user is a member
    const userVentures = Array.from(this.ventures.values()).filter(venture => {
      const ventureMembers = this.members.get(venture.id) || [];
      return ventureMembers.some(member => member.userId === userId && member.isActive);
    });

    return userVentures;
  }

  async createVenture(userId: string, request: CreateVentureRequest): Promise<Venture> {
    const ventureId = uuidv4();
    
    const newVenture: Venture = {
      id: ventureId,
      name: request.name,
      description: request.description,
      ventureType: request.ventureType,
      primaryBillingOwner: userId,
      billingTier: request.ventureType === 'sovereign_circle' || request.isGreenfieldAffiliate ? 'liberation' : 'professional',
      maxMembers: request.ventureType === 'solo' ? 1 : (request.ventureType === 'sovereign_circle' ? 50 : 12),
      currentMembers: 1,
      isGreenfieldAffiliate: request.isGreenfieldAffiliate || false,
      sovereignCircleId: request.sovereignCircleId,
      coreValues: request.coreValues || [],
      primaryGoals: request.primaryGoals || [],
      ventureVoice: request.ventureVoice || '',
      targetAudience: request.targetAudience || '',
      costSharingEnabled: request.costSharingEnabled || false,
      costSharingMethod: request.costSharingMethod || 'equal',
      monthlyBudget: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.ventures.set(ventureId, newVenture);

    // Add creator as admin member
    const creatorMember: VentureMember = {
      id: uuidv4(),
      userId,
      ventureId,
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
      joinedAt: new Date(),
      isActive: true
    };

    this.members.set(ventureId, [creatorMember]);

    return newVenture;
  }

  async getVenture(ventureId: string): Promise<Venture | null> {
    return this.ventures.get(ventureId) || null;
  }

  async updateVenture(ventureId: string, updates: UpdateVentureRequest): Promise<Venture> {
    const existing = this.ventures.get(ventureId);
    if (!existing) {
      throw new Error('Venture not found');
    }

    const updated: Venture = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    this.ventures.set(ventureId, updated);
    return updated;
  }

  async deleteVenture(ventureId: string): Promise<void> {
    this.ventures.delete(ventureId);
    this.members.delete(ventureId);
  }

  async getVentureMembers(ventureId: string): Promise<VentureMember[]> {
    return this.members.get(ventureId) || [];
  }

  async inviteMember(ventureId: string, request: InviteMemberRequest): Promise<void> {
    // Mock implementation - in real system this would send email invitation
    console.log(`Mock invitation sent to ${request.email} for venture ${ventureId}`);
  }

  async addMember(ventureId: string, userId: string, role: string = 'member'): Promise<VentureMember> {
    const newMember: VentureMember = {
      id: uuidv4(),
      userId,
      ventureId,
      role,
      permissions: role === 'admin' ? ['read', 'write', 'admin'] : ['read', 'write'],
      joinedAt: new Date(),
      isActive: true
    };

    const existingMembers = this.members.get(ventureId) || [];
    this.members.set(ventureId, [...existingMembers, newMember]);

    // Update member count
    const venture = this.ventures.get(ventureId);
    if (venture) {
      venture.currentMembers = existingMembers.length + 1;
      this.ventures.set(ventureId, venture);
    }

    return newMember;
  }

  async removeMember(ventureId: string, memberId: string): Promise<void> {
    const existingMembers = this.members.get(ventureId) || [];
    const updatedMembers = existingMembers.filter(member => member.id !== memberId);
    this.members.set(ventureId, updatedMembers);

    // Update member count
    const venture = this.ventures.get(ventureId);
    if (venture) {
      venture.currentMembers = updatedMembers.length;
      this.ventures.set(ventureId, venture);
    }
  }

  async getVentureStats(ventureId: string): Promise<VentureStatsResponse> {
    const venture = this.ventures.get(ventureId);
    if (!venture) {
      throw new Error('Venture not found');
    }

    const members = this.members.get(ventureId) || [];

    return {
      memberCount: members.length,
      activeProjects: Math.floor(Math.random() * 8) + 1, // Mock data
      monthlyRevenue: venture.monthlyBudget || 0,
      totalRevenue: (venture.monthlyBudget || 0) * 6, // Mock 6 months
      integrationCount: 3, // Mock - GitHub, Patreon, Meetup
      lastActivity: new Date(),
      growthRate: Math.random() * 20 + 5, // Mock 5-25% growth
      communityEngagement: Math.random() * 30 + 70 // Mock 70-100% engagement
    };
  }
}

export const mockVentureService = new MockVentureService();