// Liberation App API Types
// Enterprise-grade types for the Liberation platform

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'developer';
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'startup' | 'growth' | 'enterprise';
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  vectorSearchEnabled: boolean;
  maxProjects: number;
  maxVectors: number;
  customDomain?: string;
  ssoEnabled: boolean;
  auditLogsEnabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  type: 'ai' | 'api' | 'web' | 'mobile' | 'data';
  status: 'active' | 'paused' | 'archived';
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  vectorNamespace: string;
  aiProvider: 'anthropic' | 'openai' | 'google' | 'local';
  authRequired: boolean;
  rateLimits: RateLimitSettings;
  monitoring: MonitoringSettings;
}

export interface RateLimitSettings {
  requestsPerMinute: number;
  burstLimit: number;
  enabled: boolean;
}

export interface MonitoringSettings {
  metricsEnabled: boolean;
  logsEnabled: boolean;
  alertsEnabled: boolean;
  errorTrackingEnabled: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; // Hashed in database
  projectId: string;
  permissions: Permission[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface Permission {
  resource: string; // e.g., 'vectors', 'auth', 'analytics'
  actions: string[]; // e.g., ['read', 'write', 'delete']
}

export interface VectorOperation {
  id: string;
  projectId: string;
  operation: 'store' | 'search' | 'delete' | 'update';
  namespace: string;
  documentCount?: number;
  queryText?: string;
  resultCount?: number;
  processingTimeMs: number;
  cost: number;
  createdAt: Date;
}

export interface CostUsage {
  organizationId: string;
  month: string; // YYYY-MM
  vectorOperations: number;
  apiRequests: number;
  storageBytes: number;
  aiModelCalls: number;
  totalCost: number;
  breakdown: CostBreakdown;
}

export interface CostBreakdown {
  vectorStore: number;
  aiModels: number;
  storage: number;
  compute: number;
  monitoring: number;
}

export interface LiberationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    cost?: number;
  };
}

export interface LiberationMetrics {
  totalUsers: number;
  totalOrganizations: number;
  totalProjects: number;
  totalVectorOperations: number;
  totalCostSavings: number;
  monthlyActiveUsers: number;
  averageResponseTime: number;
  uptime: number;
}