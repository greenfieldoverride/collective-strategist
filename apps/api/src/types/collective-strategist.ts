// The Collective Strategist - Core Types
// AI Business Consultant SaaS platform for sovereign professionals and small collectives

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  tier: 'sovereign_circle' | 'individual_pro';
  greenfieldOverrideId?: string;
  isVerifiedSovereignCircle: boolean;
  
  // Enhanced user profile
  name?: string;
  profileImageUrl?: string;
  bio?: string;
  pronouns?: string;
  location?: string;
  websiteUrl?: string;
  
  // Email verification
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  
  // Security
  loginAttempts: number;
  lockedUntil?: Date;
  
  // Preferences
  preferredLanguage: string;
  onboardingCompleted: boolean;
  termsAcceptedAt?: Date;
  privacyPolicyAcceptedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
  isRevoked: boolean;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface UserUsageMetrics {
  id: string;
  userId: string;
  metricType: 'ai_queries' | 'ventures_created' | 'members_invited' | 'integrations_connected';
  count: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

// Enhanced billing types
export type BillingTier = 'liberation' | 'collective_basic' | 'collective_pro' | 'collective_scale';

export interface VentureSubscription {
  id: string;
  ventureId: string;
  lemonSqueezySubscriptionId?: string;
  lemonSqueezyCustomerId?: string;
  billingTier: BillingTier;
  status: 'trial' | 'active' | 'past_due' | 'cancelled';
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LemonSqueezyEvent {
  id: string;
  eventId: string;
  eventType: string;
  subscriptionId?: string;
  customerId?: string;
  eventData: Record<string, any>;
  processed: boolean;
  createdAt: Date;
}

export interface UserAIProvider {
  id: string;
  userId: string;
  providerName: 'openai' | 'anthropic' | 'google' | 'default';
  apiKeyEncrypted?: string;
  isActive: boolean;
  rateLimitPerDay?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy ContextualCore - keeping for backwards compatibility
export interface ContextualCore {
  id: string;
  userId: string;
  name: string;
  description?: string;
  businessType?: string;
  targetAudience?: string;
  brandVoice?: string;
  coreValues: string[];
  primaryGoals: string[];
  createdAt: Date;
  updatedAt: Date;
}

// New venture-based system types
export interface Venture {
  id: string;
  name: string;
  description?: string;
  ventureType: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo';
  
  // Billing & Ownership
  primaryBillingOwner: string; // User ID responsible for billing
  billingTier: 'liberation' | 'professional';
  maxMembers: number;
  
  // Liberation-specific
  isGreenfieldAffiliate: boolean;
  sovereignCircleId?: string;
  solidarityNetworkId?: string;
  
  // Optional cost-sharing (UI features only)
  costSharingEnabled: boolean;
  costSharingMethod?: 'equal' | 'contribution_based' | 'custom';
  costSharingNotes?: string;
  
  // Core values and communication
  coreValues: string[];
  primaryGoals: string[];
  ventureVoice?: string;
  targetAudience?: string;
  
  // Status and timestamps
  status: 'active' | 'archived' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  
  // Related data
  members?: VentureMember[];
  currentUserRole?: string;
  currentUserPermissions?: VenturePermission[];
}

export type VenturePermission = 
  | 'manage_members'       // Add/remove team members
  | 'manage_billing'       // Handle payments and billing
  | 'create_conversations' // Start AI consultant sessions
  | 'access_analytics'     // View venture statistics
  | 'export_data'         // Export conversations and data
  | 'manage_integrations'  // Connect external tools
  | 'admin_all';          // Full administrative access

export interface VentureMember {
  id: string;
  userId: string;
  ventureId: string;
  role: 'owner' | 'co_owner' | 'contributor' | 'collaborator' | 'observer';
  permissions: VenturePermission[];
  
  // Member-specific settings
  notificationPreferences: {
    newConversations: boolean;
    memberChanges: boolean;
    billingUpdates: boolean;
  };
  costSharePercentage?: number; // For cooperative cost sharing (0-100)
  
  // Timestamps and invitation tracking
  joinedAt: Date;
  invitedBy?: string;
  invitationAcceptedAt?: Date;
  lastActiveAt: Date;
  
  // User details (populated from joins)
  userEmail?: string;
  userName?: string;
}

export interface VentureInvitation {
  id: string;
  ventureId: string;
  invitedEmail: string;
  invitedBy: string;
  role: 'co_owner' | 'contributor' | 'collaborator' | 'observer';
  permissions: VenturePermission[];
  
  invitationToken: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  
  createdAt: Date;
  respondedAt?: Date;
}

export interface VentureAsset {
  id: string;
  ventureId: string;
  assetType: string;
  name: string;
  description?: string;
  filePath?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  extractedText?: string;
  
  // Access control
  uploadedBy: string;
  isSharedWithTeam: boolean;
  accessPermissions: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SolidarityNetwork {
  id: string;
  name: string;
  description?: string;
  networkType: 'mutual_aid' | 'resource_sharing' | 'collaboration';
  governanceModel: 'consensus' | 'democratic' | 'rotating_leadership';
  maxVentures?: number;
  createdAt: Date;
}

export interface NetworkMembership {
  id: string;
  ventureId: string;
  networkId: string;
  role: 'member' | 'coordinator' | 'founder';
  contributionType?: string;
  resourceNeeds: string[];
  joinedAt: Date;
}

export interface ContextualAsset {
  id: string;
  contextualCoreId: string;
  assetType: 'brand_asset' | 'marketing_material' | 'product_info' | 'writing_sample' | 'competitor_analysis';
  filename: string;
  filePath: string;
  fileSizeBytes?: number;
  mimeType?: string;
  extractedText?: string;
  isBrowserViewable: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  version: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface MarketData {
  id: string;
  userId: string;
  dataSource: 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'google_trends' | 'reddit';
  dataType: 'engagement' | 'trend' | 'competitor_activity' | 'keyword_performance';
  content: Record<string, any>;
  collectedAt: Date;
  processedAt?: Date;
  createdAt: Date;
}

export interface ContentDraft {
  id: string;
  userId: string;
  contextualCoreId: string;
  contentType: 'social_post' | 'blog_article' | 'marketing_copy' | 'email';
  platform?: string;
  title?: string;
  content: string;
  aiProviderUsed?: string;
  generationMetadata?: Record<string, any>;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
}

// Legacy type - keeping for backwards compatibility
export interface ConsultantSession {
  id: string;
  userId: string;
  contextualCoreId: string;
  sessionType: 'strategic_advice' | 'trend_analysis' | 'goal_planning' | 'market_analysis';
  query: string;
  response: string;
  aiProviderUsed: string;
  marketDataReferenced: any[];
  confidenceScore: number;
  sessionMetadata: {
    includeMarketData: boolean;
    processingTimeMs: number;
  };
  createdAt: Date;
}

// New conversation persistence types
export interface Conversation {
  id: string;
  userId: string;
  contextualCoreId: string;
  title: string;
  sessionType: 'strategic_advice' | 'trend_analysis' | 'goal_planning' | 'market_analysis';
  status: 'active' | 'archived' | 'deleted';
  totalMessages: number;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  tags?: ConversationTag[];
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  messageType: 'user' | 'ai';
  content: string;
  queryText?: string; // Original query for AI messages
  confidenceScore?: number;
  processingTimeMs?: number;
  aiProvider?: string;
  aiModel?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  positionInConversation: number;
  recommendations?: MessageRecommendation[];
  attachments?: MessageAttachment[];
}

export interface MessageRecommendation {
  id: string;
  messageId: string;
  recommendationText: string;
  recommendationType?: string;
  priority: number;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  attachmentType: string;
  filename?: string;
  fileSize?: number;
  filePath?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ConversationTag {
  id: string;
  conversationId: string;
  tagName: string;
  tagColor: string;
  createdAt: Date;
}

export interface ConversationShare {
  id: string;
  conversationId: string;
  sharedByUserId: string;
  sharedWithEmail?: string;
  shareToken: string;
  permissionLevel: 'read' | 'comment' | 'edit';
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface UserConsultantPreferences {
  id: string;
  userId: string;
  defaultSessionType: 'strategic_advice' | 'trend_analysis' | 'goal_planning' | 'market_analysis';
  autoSaveConversations: boolean;
  exportFormatPreference: 'markdown' | 'pdf' | 'json' | 'html';
  uiTheme: 'light' | 'dark' | 'auto';
  notificationPreferences: {
    newRecommendations: boolean;
    conversationShared: boolean;
    weeklySummary: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategistBriefing {
  id: string;
  userId: string;
  contextualCoreId: string;
  briefingPeriod: 'weekly' | 'monthly';
  periodStartDate: Date;
  periodEndDate: Date;
  whatWorked?: string;
  emergingOpportunities?: string;
  strategicRecommendations?: string;
  keyMetrics?: Record<string, any>;
  aiProviderUsed?: string;
  generationMetadata?: Record<string, any>;
  isSent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  briefingFrequency: 'weekly' | 'monthly';
  preferredAiProvider: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    websocket: boolean;
  };
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types

export interface CreateContextualCoreRequest {
  name: string;
  description?: string;
  businessType?: string;
  targetAudience?: string;
  brandVoice?: string;
  coreValues?: string[];
  primaryGoals?: string[];
}

export interface UploadAssetRequest {
  assetType: ContextualAsset['assetType'];
  file: File | Buffer;
  filename: string;
  metadata?: Record<string, any>;
}

export interface AIConsultantRequest {
  contextualCoreId: string;
  sessionType: ConsultantSession['sessionType'];
  query: string;
  includeMarketData?: boolean;
  aiProvider?: string;
}

export interface AIConsultantResponse {
  response: string;
  confidenceScore: number;
  marketDataUsed: MarketData[];
  recommendations: string[];
  nextSteps?: string[];
  processingTimeMs: number;
}

export interface ContentGenerationRequest {
  contextualCoreId: string;
  contentType: ContentDraft['contentType'];
  platform?: string;
  prompt?: string;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'authoritative';
  length?: 'short' | 'medium' | 'long';
  aiProvider?: string;
}

export interface ContentGenerationResponse {
  content: string;
  title?: string;
  suggestions: string[];
  alternativeVersions?: string[];
  processingTimeMs: number;
}

export interface MarketAnalysisRequest {
  contextualCoreId: string;
  analysisType: 'trends' | 'competitors' | 'opportunities' | 'keywords';
  timeRange?: 'day' | 'week' | 'month' | 'quarter';
  platforms?: MarketData['dataSource'][];
}

export interface MarketAnalysisResponse {
  insights: Array<{
    type: 'opportunity' | 'threat' | 'trend';
    title: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    timeframe: 'immediate' | 'short_term' | 'long_term';
    actionable: boolean;
    dataSource: string;
  }>;
  trends: Array<{
    keyword: string;
    platform: string;
    engagementRate: number;
    growthRate: number;
    relevanceScore: number;
    peakDate: Date;
  }>;
  recommendations: string[];
  dataPoints: number;
  lastUpdated: Date;
}

// Conversation Management API Types
export interface CreateConversationRequest {
  contextualCoreId: string;
  title: string;
  sessionType: 'strategic_advice' | 'trend_analysis' | 'goal_planning' | 'market_analysis';
  tags?: string[];
}

export interface UpdateConversationRequest {
  title?: string;
  status?: 'active' | 'archived' | 'deleted';
  tags?: string[];
}

export interface GetConversationsRequest {
  limit?: number;
  offset?: number;
  sessionType?: string;
  status?: 'active' | 'archived' | 'deleted';
  search?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'totalMessages';
  sortOrder?: 'asc' | 'desc';
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType: 'user' | 'ai';
  attachments?: Array<{
    attachmentType: string;
    filename?: string;
    data?: string; // base64 encoded data
    metadata?: Record<string, any>;
  }>;
}

export interface ExportConversationRequest {
  conversationId: string;
  format: 'markdown' | 'pdf' | 'json' | 'html';
  includeAttachments?: boolean;
  includeMetadata?: boolean;
}

export interface ShareConversationRequest {
  conversationId: string;
  sharedWithEmail?: string;
  permissionLevel: 'read' | 'comment' | 'edit';
  expiresAt?: Date;
}

export interface ConversationStatsResponse {
  totalConversations: number;
  activeConversations: number;
  archivedConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  totalTokensUsed: number;
  averageConfidenceScore: number;
  mostUsedSessionType: string;
  conversationsBySessionType: Record<string, number>;
  dailyActivity: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
}

// Venture Management API Types
export interface CreateVentureRequest {
  name: string;
  description?: string;
  ventureType: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo';
  isGreenfieldAffiliate?: boolean;
  sovereignCircleId?: string;
  coreValues?: string[];
  primaryGoals?: string[];
  ventureVoice?: string;
  targetAudience?: string;
  costSharingEnabled?: boolean;
  costSharingMethod?: 'equal' | 'contribution_based' | 'custom';
}

export interface UpdateVentureRequest {
  name?: string;
  description?: string;
  coreValues?: string[];
  primaryGoals?: string[];
  ventureVoice?: string;
  targetAudience?: string;
  costSharingEnabled?: boolean;
  costSharingMethod?: 'equal' | 'contribution_based' | 'custom';
  costSharingNotes?: string;
  status?: 'active' | 'archived' | 'suspended';
}

export interface GetVenturesRequest {
  limit?: number;
  offset?: number;
  ventureType?: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo';
  status?: 'active' | 'archived' | 'suspended';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  includeMembers?: boolean;
}

export interface InviteMemberRequest {
  email: string;
  role: 'co_owner' | 'contributor' | 'collaborator' | 'observer';
  permissions?: VenturePermission[];
  costSharePercentage?: number;
  personalMessage?: string;
}

export interface UpdateMemberRequest {
  role?: 'co_owner' | 'contributor' | 'collaborator' | 'observer';
  permissions?: VenturePermission[];
  costSharePercentage?: number;
  notificationPreferences?: {
    newConversations?: boolean;
    memberChanges?: boolean;
    billingUpdates?: boolean;
  };
}

export interface VentureStatsResponse {
  totalMembers: number;
  activeMembers: number;
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  totalTokensUsed: number;
  currentBillingTier: string;
  estimatedMonthlyCost: number;
  costPerMember?: number;
  memberActivity: Array<{
    userId: string;
    userEmail: string;
    conversationsStarted: number;
    messagesPosted: number;
    lastActiveAt: Date;
  }>;
  conversationsBySessionType: Record<string, number>;
  dailyActivity: Array<{
    date: string;
    conversations: number;
    messages: number;
    activeMembers: number;
  }>;
}

export interface AcceptInvitationRequest {
  invitationToken: string;
  acceptTerms: boolean;
}

export interface VenturePermissionsResponse {
  userId: string;
  ventureId: string;
  role: string;
  permissions: VenturePermission[];
  canInviteMembers: boolean;
  canManageBilling: boolean;
  canExportData: boolean;
  canCreateConversations: boolean;
}

export interface MarketInsight {
  type: 'opportunity' | 'threat' | 'trend' | 'competitor_move';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  actionable: boolean;
  dataSource: MarketData['dataSource'];
}

export interface TrendData {
  keyword: string;
  platform: MarketData['dataSource'];
  engagementRate: number;
  growthRate: number;
  relevanceScore: number;
  peakDate?: Date;
}

export interface GenerateBriefingRequest {
  contextualCoreId: string;
  period: StrategistBriefing['briefingPeriod'];
  includeMetrics?: boolean;
  includeRecommendations?: boolean;
}

export interface BriefingResponse {
  briefing: StrategistBriefing;
  keyHighlights: string[];
  actionItems: string[];
  metricsImprovement: Record<string, number>;
}

// Event Types for Real-time Updates
export interface StrategistEvent {
  type: 'asset_processed' | 'content_generated' | 'market_data_updated' | 'briefing_ready' | 'consultation_complete';
  userId: string;
  contextualCoreId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

// API Response Wrapper
export interface StrategistResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    processingTime: number;
    aiProvider?: string;
    creditsUsed?: number;
  };
}