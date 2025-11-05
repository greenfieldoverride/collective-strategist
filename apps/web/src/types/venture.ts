// Venture types for frontend
export interface Venture {
  id: string
  name: string
  description?: string
  ventureType: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo'
  primaryBillingOwner: string
  billingTier: 'liberation' | 'professional'
  maxMembers: number
  isGreenfieldAffiliate?: boolean
  sovereignCircleId?: string
  solidarityNetworkId?: string
  costSharingEnabled?: boolean
  costSharingMethod?: 'equal' | 'contribution_based' | 'custom'
  costSharingNotes?: string
  coreValues?: string[]
  primaryGoals?: string[]
  ventureVoice?: string
  targetAudience?: string
  status: 'active' | 'archived' | 'suspended'
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  currentUserRole?: VentureMemberRole
  currentUserPermissions?: VenturePermission[]
  members?: VentureMember[]
}

export interface VentureMember {
  id: string
  userId: string
  ventureId: string
  role: VentureMemberRole
  permissions: VenturePermission[]
  notificationPreferences: {
    newConversations: boolean
    memberChanges: boolean
    billingUpdates: boolean
  }
  costSharePercentage?: number
  joinedAt: string
  invitedBy?: string
  invitationAcceptedAt?: string
  lastActiveAt: string
}

export type VentureMemberRole = 'owner' | 'co_owner' | 'contributor' | 'collaborator' | 'observer'

export type VenturePermission = 
  | 'manage_members'
  | 'manage_billing' 
  | 'create_conversations'
  | 'access_analytics'
  | 'export_data'
  | 'manage_integrations'
  | 'admin_all'

export interface CreateVentureRequest {
  name: string
  description?: string
  ventureType: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo'
  isGreenfieldAffiliate?: boolean
  sovereignCircleId?: string
  coreValues?: string[]
  primaryGoals?: string[]
  ventureVoice?: string
  targetAudience?: string
  costSharingEnabled?: boolean
  costSharingMethod?: 'equal' | 'contribution_based' | 'custom'
}

export interface VentureInvitation {
  id: string
  ventureId: string
  invitedEmail: string
  invitedBy: string
  role: VentureMemberRole
  permissions: VenturePermission[]
  invitationToken: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: string
  respondedAt?: string
}

export interface InviteMemberRequest {
  email: string
  role: VentureMemberRole
  permissions?: VenturePermission[]
  costSharePercentage?: number
  personalMessage?: string
}

// API Response wrapper
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    processingTime: number
  }
}
