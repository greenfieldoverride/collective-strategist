import { Database } from '../database/connection';
import { 
  Venture, 
  VentureMember, 
  VentureInvitation,
  VentureAsset,
  VenturePermission,
  CreateVentureRequest,
  UpdateVentureRequest,
  GetVenturesRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  VentureStatsResponse
} from '../types/collective-strategist';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class VentureService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Create a new venture
  async createVenture(userId: string, request: CreateVentureRequest): Promise<Venture> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const ventureId = uuidv4();
      
      // Determine billing tier and max members based on venture type
      let billingTier = 'professional';
      let maxMembers = 5; // Default for professional
      
      if (request.ventureType === 'sovereign_circle' || request.isGreenfieldAffiliate) {
        billingTier = 'liberation';
        maxMembers = 50; // Generous for liberation tier
      }
      
      // Insert venture
      const ventureResult = await client.query(`
        INSERT INTO ventures (
          id, name, description, venture_type, primary_billing_owner, 
          billing_tier, max_members, is_greenfield_affiliate, sovereign_circle_id,
          core_values, primary_goals, venture_voice, target_audience,
          cost_sharing_enabled, cost_sharing_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        ventureId, request.name, request.description, request.ventureType, userId,
        billingTier, maxMembers, request.isGreenfieldAffiliate || false, request.sovereignCircleId,
        request.coreValues || [], request.primaryGoals || [], request.ventureVoice, request.targetAudience,
        request.costSharingEnabled || false, request.costSharingMethod
      ]);
      
      await client.query('COMMIT');
      
      // Return venture with user as owner
      const venture = this.mapVentureRow(ventureResult.rows[0]);
      venture.currentUserRole = 'owner';
      venture.currentUserPermissions = ['admin_all'];
      
      return venture;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get ventures for a user
  async getVentures(userId: string, request: GetVenturesRequest): Promise<{
    ventures: Venture[];
    total: number;
    hasMore: boolean;
  }> {
    const client = await this.db.getClient();
    
    try {
      let whereClause = `WHERE vm.user_id = $1 AND v.status != 'suspended'`;
      let params: any[] = [userId];
      let paramIndex = 2;

      // Add filters
      if (request.ventureType) {
        whereClause += ` AND v.venture_type = $${paramIndex}`;
        params.push(request.ventureType);
        paramIndex++;
      }

      if (request.status) {
        whereClause = whereClause.replace(`v.status != 'suspended'`, `v.status = $${paramIndex}`);
        params.push(request.status);
        paramIndex++;
      }

      if (request.search) {
        whereClause += ` AND (v.name ILIKE $${paramIndex} OR v.description ILIKE $${paramIndex})`;
        params.push(`%${request.search}%`);
        paramIndex++;
      }

      // Sort clause
      const sortBy = request.sortBy || 'updated_at';
      const sortOrder = request.sortOrder || 'desc';
      const orderClause = `ORDER BY v.${sortBy} ${sortOrder}`;

      // Pagination
      const limit = request.limit || 20;
      const offset = request.offset || 0;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT v.id) as total
        FROM ventures v
        JOIN venture_members vm ON v.id = vm.venture_id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get ventures with user's role and permissions
      const venturesQuery = `
        SELECT 
          v.*,
          vm.role as user_role,
          vm.permissions as user_permissions,
          ${request.includeMembers ? `
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', m.id,
                'userId', m.user_id,
                'role', m.role,
                'permissions', m.permissions,
                'joinedAt', m.joined_at,
                'lastActiveAt', m.last_active_at
              ) ORDER BY m.joined_at
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) as members
          ` : `'[]'::json as members`}
        FROM ventures v
        JOIN venture_members vm ON v.id = vm.venture_id
        ${request.includeMembers ? 'LEFT JOIN venture_members m ON v.id = m.venture_id' : ''}
        ${whereClause}
        ${request.includeMembers ? 'GROUP BY v.id, vm.role, vm.permissions' : ''}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      const result = await client.query(venturesQuery, params);
      
      const ventures = result.rows.map(row => ({
        ...this.mapVentureRow(row),
        currentUserRole: row.user_role,
        currentUserPermissions: row.user_permissions || [],
        members: request.includeMembers ? (row.members || []) : undefined
      }));

      return {
        ventures,
        total,
        hasMore: offset + limit < total
      };
    } finally {
      client.release();
    }
  }

  // Get a single venture with full details
  async getVenture(userId: string, ventureId: string): Promise<Venture | null> {
    const client = await this.db.getClient();
    
    try {
      const result = await client.query(`
        SELECT 
          v.*,
          vm.role as user_role,
          vm.permissions as user_permissions,
          COALESCE(
            JSON_AGG(
              DISTINCT JSON_BUILD_OBJECT(
                'id', m.id,
                'userId', m.user_id,
                'role', m.role,
                'permissions', m.permissions,
                'notificationPreferences', m.notification_preferences,
                'costSharePercentage', m.cost_share_percentage,
                'joinedAt', m.joined_at,
                'invitedBy', m.invited_by,
                'lastActiveAt', m.last_active_at
              ) ORDER BY m.joined_at
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) as members
        FROM ventures v
        JOIN venture_members vm ON v.id = vm.venture_id AND vm.user_id = $2
        LEFT JOIN venture_members m ON v.id = m.venture_id
        WHERE v.id = $1 AND v.status != 'suspended'
        GROUP BY v.id, vm.role, vm.permissions
      `, [ventureId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...this.mapVentureRow(row),
        currentUserRole: row.user_role,
        currentUserPermissions: row.user_permissions || [],
        members: row.members || []
      };
    } finally {
      client.release();
    }
  }

  // Update a venture
  async updateVenture(
    userId: string, 
    ventureId: string, 
    request: UpdateVentureRequest
  ): Promise<Venture | null> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if user has permission to update
      const permissionCheck = await client.query(`
        SELECT role, permissions FROM venture_members 
        WHERE venture_id = $1 AND user_id = $2
      `, [ventureId, userId]);
      
      if (permissionCheck.rows.length === 0) {
        throw new Error('Access denied: User not a member of this venture');
      }
      
      const { role, permissions } = permissionCheck.rows[0];
      if (role !== 'owner' && role !== 'co_owner' && !permissions.includes('admin_all')) {
        throw new Error('Access denied: Insufficient permissions to update venture');
      }
      
      // Update venture
      const updateFields: string[] = [];
      const params: any[] = [ventureId];
      let paramIndex = 2;

      if (request.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        params.push(request.name);
        paramIndex++;
      }

      if (request.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(request.description);
        paramIndex++;
      }

      if (request.coreValues !== undefined) {
        updateFields.push(`core_values = $${paramIndex}`);
        params.push(request.coreValues);
        paramIndex++;
      }

      if (request.primaryGoals !== undefined) {
        updateFields.push(`primary_goals = $${paramIndex}`);
        params.push(request.primaryGoals);
        paramIndex++;
      }

      if (request.ventureVoice !== undefined) {
        updateFields.push(`venture_voice = $${paramIndex}`);
        params.push(request.ventureVoice);
        paramIndex++;
      }

      if (request.targetAudience !== undefined) {
        updateFields.push(`target_audience = $${paramIndex}`);
        params.push(request.targetAudience);
        paramIndex++;
      }

      if (request.costSharingEnabled !== undefined) {
        updateFields.push(`cost_sharing_enabled = $${paramIndex}`);
        params.push(request.costSharingEnabled);
        paramIndex++;
      }

      if (request.costSharingMethod !== undefined) {
        updateFields.push(`cost_sharing_method = $${paramIndex}`);
        params.push(request.costSharingMethod);
        paramIndex++;
      }

      if (request.costSharingNotes !== undefined) {
        updateFields.push(`cost_sharing_notes = $${paramIndex}`);
        params.push(request.costSharingNotes);
        paramIndex++;
      }

      if (request.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(request.status);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE ventures 
          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 
          RETURNING *
        `;
        await client.query(updateQuery, params);
      }
      
      await client.query('COMMIT');
      
      // Return updated venture
      return await this.getVenture(userId, ventureId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Invite a member to a venture
  async inviteMember(userId: string, ventureId: string, request: InviteMemberRequest): Promise<VentureInvitation> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check permissions
      const permissionCheck = await client.query(`
        SELECT v.max_members, vm.role, vm.permissions,
               (SELECT COUNT(*) FROM venture_members WHERE venture_id = $1) as current_members
        FROM ventures v
        JOIN venture_members vm ON v.id = vm.venture_id
        WHERE v.id = $1 AND vm.user_id = $2
      `, [ventureId, userId]);
      
      if (permissionCheck.rows.length === 0) {
        throw new Error('Access denied: User not a member of this venture');
      }
      
      const { max_members, role, permissions, current_members } = permissionCheck.rows[0];
      
      if (!permissions.includes('manage_members') && role !== 'owner' && role !== 'co_owner') {
        throw new Error('Access denied: Insufficient permissions to invite members');
      }
      
      if (current_members >= max_members) {
        throw new Error('Venture has reached maximum member limit');
      }
      
      // Check if user is already a member or has pending invitation
      const existingCheck = await client.query(`
        SELECT 1 FROM venture_members WHERE venture_id = $1 AND user_id = (
          SELECT id FROM users WHERE email = $2 LIMIT 1
        )
        UNION
        SELECT 1 FROM venture_invitations 
        WHERE venture_id = $1 AND invited_email = $2 AND status = 'pending'
      `, [ventureId, request.email]);
      
      if (existingCheck.rows.length > 0) {
        throw new Error('User is already a member or has a pending invitation');
      }
      
      // Create invitation
      const invitationId = uuidv4();
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to accept
      
      const invitationResult = await client.query(`
        INSERT INTO venture_invitations (
          id, venture_id, invited_email, invited_by, role, permissions,
          invitation_token, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        invitationId, ventureId, request.email, userId, request.role,
        request.permissions || [], invitationToken, expiresAt
      ]);
      
      await client.query('COMMIT');
      
      return this.mapInvitationRow(invitationResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get venture statistics
  async getVentureStats(userId: string, ventureId: string): Promise<VentureStatsResponse> {
    const client = await this.db.getClient();
    
    try {
      // Check access
      const accessCheck = await client.query(`
        SELECT role, permissions FROM venture_members 
        WHERE venture_id = $1 AND user_id = $2
      `, [ventureId, userId]);
      
      if (accessCheck.rows.length === 0) {
        throw new Error('Access denied: User not a member of this venture');
      }
      
      const { role, permissions } = accessCheck.rows[0];
      if (!permissions.includes('access_analytics') && role !== 'owner' && role !== 'co_owner') {
        throw new Error('Access denied: Insufficient permissions to view analytics');
      }
      
      // Get basic stats
      const basicStats = await client.query(`
        SELECT 
          v.billing_tier,
          v.max_members,
          COUNT(DISTINCT vm.id) as total_members,
          COUNT(DISTINCT vm.id) FILTER (WHERE vm.last_active_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as active_members,
          COUNT(DISTINCT c.id) as total_conversations,
          COALESCE(SUM(c.total_messages), 0) as total_messages,
          COALESCE(AVG(c.total_messages), 0) as avg_messages_per_conversation
        FROM ventures v
        LEFT JOIN venture_members vm ON v.id = vm.venture_id
        LEFT JOIN conversations c ON v.id = c.venture_id AND c.status != 'deleted'
        WHERE v.id = $1
        GROUP BY v.id, v.billing_tier, v.max_members
      `, [ventureId]);
      
      const stats = basicStats.rows[0];
      
      // Calculate estimated costs (simplified)
      const baseCost = stats.billing_tier === 'liberation' ? 0 : 29; // $29/month for professional
      const costPerMember = stats.total_members > 0 ? baseCost / stats.total_members : 0;
      
      return {
        totalMembers: parseInt(stats.total_members),
        activeMembers: parseInt(stats.active_members),
        totalConversations: parseInt(stats.total_conversations),
        totalMessages: parseInt(stats.total_messages),
        averageMessagesPerConversation: parseFloat(stats.avg_messages_per_conversation),
        totalTokensUsed: 0, // TODO: Implement token tracking
        currentBillingTier: stats.billing_tier,
        estimatedMonthlyCost: baseCost,
        costPerMember: costPerMember,
        memberActivity: [], // TODO: Implement member activity tracking
        conversationsBySessionType: {}, // TODO: Implement session type breakdown
        dailyActivity: [] // TODO: Implement daily activity tracking
      };
    } finally {
      client.release();
    }
  }

  // Delete/archive a venture
  async deleteVenture(userId: string, ventureId: string): Promise<boolean> {
    const client = await this.db.getClient();
    
    try {
      // Check if user is owner
      const ownerCheck = await client.query(`
        SELECT role FROM venture_members 
        WHERE venture_id = $1 AND user_id = $2 AND role = 'owner'
      `, [ventureId, userId]);
      
      if (ownerCheck.rows.length === 0) {
        throw new Error('Access denied: Only venture owners can delete ventures');
      }
      
      // Archive instead of delete to preserve data
      const result = await client.query(
        'UPDATE ventures SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['archived', ventureId]
      );
      
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private mapVentureRow(row: any): Venture {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ventureType: row.venture_type,
      primaryBillingOwner: row.primary_billing_owner,
      billingTier: row.billing_tier,
      maxMembers: row.max_members,
      isGreenfieldAffiliate: row.is_greenfield_affiliate,
      sovereignCircleId: row.sovereign_circle_id,
      solidarityNetworkId: row.solidarity_network_id,
      costSharingEnabled: row.cost_sharing_enabled,
      costSharingMethod: row.cost_sharing_method,
      costSharingNotes: row.cost_sharing_notes,
      coreValues: row.core_values || [],
      primaryGoals: row.primary_goals || [],
      ventureVoice: row.venture_voice,
      targetAudience: row.target_audience,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at
    };
  }

  private mapInvitationRow(row: any): VentureInvitation {
    return {
      id: row.id,
      ventureId: row.venture_id,
      invitedEmail: row.invited_email,
      invitedBy: row.invited_by,
      role: row.role,
      permissions: row.permissions || [],
      invitationToken: row.invitation_token,
      expiresAt: row.expires_at,
      status: row.status,
      createdAt: row.created_at,
      respondedAt: row.responded_at
    };
  }
}