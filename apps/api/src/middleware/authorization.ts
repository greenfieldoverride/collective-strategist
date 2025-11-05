import { FastifyRequest, FastifyReply } from 'fastify'
import { VenturePermission } from '../types/collective-strategist'
import { cacheService, CacheKeys } from '../services/cache-service'

// Authorization errors
export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'FORBIDDEN') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// Extract venture ID from request (URL params, body, or query)
function extractVentureId(request: FastifyRequest): string | null {
  const params = request.params as any
  const body = request.body as any
  const query = request.query as any
  
  return params?.ventureId || 
         params?.contextualCoreId || 
         body?.ventureId || 
         body?.contextualCoreId || 
         query?.ventureId || 
         null
}

// Check if user has access to a venture with required permissions
export async function checkVentureAccess(
  userId: string,
  ventureId: string,
  requiredPermissions?: VenturePermission[]
): Promise<{ hasAccess: boolean; userRole: string; userPermissions: VenturePermission[] }> {
  try {
    // Check cache first for venture access
    const cacheKey = CacheKeys.VENTURE_MEMBERS + ':' + userId + ':' + ventureId
    const cachedAccess = await cacheService.get<{ hasAccess: boolean; userRole: string; userPermissions: VenturePermission[] }>(cacheKey)
    
    if (cachedAccess) {
      console.log(`🚀 Cache HIT for venture access: ${userId}@${ventureId}`)
      
      // Still need to check required permissions for this specific request
      if (requiredPermissions && requiredPermissions.length > 0) {
        const perms = requiredPermissions as VenturePermission[]
        const hasRequiredPermissions = perms.every(permission => 
          cachedAccess.userPermissions.includes(permission)
        )
        return {
          ...cachedAccess,
          hasAccess: cachedAccess.hasAccess && hasRequiredPermissions
        }
      }
      
      return cachedAccess
    }

    console.log(`💾 Cache MISS for venture access: ${userId}@${ventureId} - querying DB`)
    
    // TODO: Replace with actual database query
    // This is a mock implementation for now
    const mockUserVentures = {
      'agatha-001': [
        { ventureId: '123e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] }, // Witches Road
        { ventureId: '223e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] }, // Darkhold
        { ventureId: '323e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] }  // Salem Secrets (Agatha only!)
      ],
      'rio-002': [
        { ventureId: '123e4567-e89b-12d3-a456-426614174000', role: 'collaborator', permissions: ['create_conversations'] as VenturePermission[] }, // Witches Road
        { ventureId: '423e4567-e89b-12d3-a456-426614174000', role: 'co_owner', permissions: ['create_conversations', 'access_analytics', 'export_data', 'manage_integrations'] as VenturePermission[] } // Death Magic
      ],
      'alice-003': [
        { ventureId: '123e4567-e89b-12d3-a456-426614174000', role: 'observer', permissions: [] as VenturePermission[] }, // Witches Road (observer only!)
        { ventureId: '523e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] } // Protection Circle
      ],
      'billy-004': [
        { ventureId: '223e4567-e89b-12d3-a456-426614174000', role: 'collaborator', permissions: ['create_conversations'] as VenturePermission[] }, // Darkhold (collaborator only!)
        { ventureId: '423e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] }, // Death Magic
        { ventureId: '623e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] } // Maximoff Legacy (Billy only!)
      ],
      'jen-005': [
        { ventureId: '223e4567-e89b-12d3-a456-426614174000', role: 'observer', permissions: [] as VenturePermission[] }, // Darkhold (observer only!)
        { ventureId: '523e4567-e89b-12d3-a456-426614174000', role: 'collaborator', permissions: ['create_conversations'] as VenturePermission[] }, // Protection Circle (collaborator)
        { ventureId: '723e4567-e89b-12d3-a456-426614174000', role: 'owner', permissions: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[] } // Potions Guild (Jen only!)
      ]
    }

    const userVentures = mockUserVentures[userId as keyof typeof mockUserVentures] || []
    const venture = userVentures.find(v => v.ventureId === ventureId)
    
    if (!venture) {
      const result = { hasAccess: false, userRole: '', userPermissions: [] as VenturePermission[] }
      // Cache negative results for short time to avoid repeated failed lookups
      await cacheService.set(cacheKey, result, cacheService.constructor.prototype.constructor.TTL.MINUTE)
      return result
    }

    // Check if user has all required permissions
    const hasAllPermissions = !requiredPermissions || requiredPermissions.length === 0 || 
      requiredPermissions.every(permission => venture.permissions.includes(permission))

    const result = {
      hasAccess: hasAllPermissions,
      userRole: venture.role,
      userPermissions: venture.permissions
    }
    
    // Cache successful venture access for 15 minutes
    await cacheService.set(cacheKey, result, 900) // 15 minutes
    console.log(`💾 Cached venture access: ${userId}@${ventureId}`)
    
    return result
  } catch (error) {
    console.error('Error checking venture access:', error)
    return { hasAccess: false, userRole: '', userPermissions: [] }
  }
}

// Authorization middleware factory
export function requireVenturePermissions(permissions: VenturePermission[]) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Ensure user is authenticated first
      const user = request.user as any
      if (!user || !user.id) {
        throw new AuthorizationError('User not authenticated', 'UNAUTHORIZED')
      }

      // Extract venture ID from request
      const ventureId = extractVentureId(request)
      if (!ventureId) {
        throw new AuthorizationError('No venture ID provided', 'BAD_REQUEST')
      }

      // Check venture access and permissions
      const { hasAccess, userRole, userPermissions } = await checkVentureAccess(
        user.id, 
        ventureId, 
        permissions
      )

      if (!hasAccess) {
        throw new AuthorizationError(
          `Access denied. Required permissions: ${permissions.join(', ')}. User role: ${userRole}`,
          'FORBIDDEN'
        )
      }

      // Add venture context to request for downstream use
      (request as any).venture = {
        id: ventureId,
        userRole,
        userPermissions
      }

    } catch (error) {
      if (error instanceof AuthorizationError) {
        const statusCode = error.code === 'UNAUTHORIZED' ? 401 : 
                          error.code === 'BAD_REQUEST' ? 400 : 403
        return reply.code(statusCode).send({
          error: error.message,
          code: error.code
        })
      }
      throw error
    }
  }
}

// Common permission sets for convenience
export const PermissionSets = {
  READ_ONLY: [] as VenturePermission[], // Observer role - no special permissions needed
  CONTENT_CREATOR: ['create_conversations'] as VenturePermission[], // Can create content
  COLLABORATOR: ['create_conversations', 'access_analytics'] as VenturePermission[], // Can create and view analytics
  ADMIN: ['manage_members', 'manage_billing', 'admin_all'] as VenturePermission[], // Administrative access
  OWNER: ['manage_members', 'manage_billing', 'create_conversations', 'access_analytics', 'export_data', 'manage_integrations', 'admin_all'] as VenturePermission[]
}

// Helper function to check role-based access (simpler alternative)
export function requireRole(minRole: 'observer' | 'collaborator' | 'contributor' | 'co_owner' | 'owner') {
  const roleHierarchy = {
    observer: 0,
    collaborator: 1, 
    contributor: 2,
    co_owner: 3,
    owner: 4
  }
  
  return async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any
      if (!user || !user.id) {
        return reply.code(401).send({ error: 'User not authenticated' })
      }

      const ventureId = extractVentureId(request)
      if (!ventureId) {
        return reply.code(400).send({ error: 'No venture ID provided' })
      }

      const { hasAccess, userRole } = await checkVentureAccess(user.id, ventureId, [])
      
      if (!hasAccess) {
        return reply.code(403).send({ error: 'Access denied to venture' })
      }

      const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1
      const requiredRoleLevel = roleHierarchy[minRole]

      if (userRoleLevel < requiredRoleLevel) {
        return reply.code(403).send({ 
          error: `Insufficient permissions. Required role: ${minRole}, user role: ${userRole}` 
        })
      }

      // Add venture context to request
      (request as any).venture = {
        id: ventureId,
        userRole
      }

    } catch (error) {
      console.error('Role authorization error:', error)
      return reply.code(500).send({ error: 'Authorization check failed' })
    }
  }
}