import { VentureService } from '../../services/venture-service';
import { Database } from '../../database/connection';
import { CreateVentureRequest, InviteMemberRequest, UpdateVentureRequest } from '../../types/collective-strategist';

// Mock database
jest.mock('../../database/connection');

describe('VentureService', () => {
  let ventureService: VentureService;
  let mockDb: jest.Mocked<Database>;
  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Mock database
    mockDb = {
      query: jest.fn(),
      getClient: jest.fn().mockResolvedValue(mockClient),
      close: jest.fn()
    } as any;

    ventureService = new VentureService(mockDb);
  });

  describe('createVenture', () => {
    const userId = 'test-user-id';
    const mockVentureData: CreateVentureRequest = {
      name: 'Test Liberation Collective',
      description: 'A test sovereign circle',
      ventureType: 'sovereign_circle',
      isGreenfieldAffiliate: true,
      coreValues: ['mutual aid', 'liberation'],
      primaryGoals: ['community support']
    };

    it('should create a liberation tier venture for sovereign circles', async () => {
      // Mock successful transaction
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // INSERT venture
          rows: [{
            id: 'venture-id',
            name: 'Test Liberation Collective',
            description: 'A test sovereign circle',
            venture_type: 'sovereign_circle',
            primary_billing_owner: userId,
            billing_tier: 'liberation',
            max_members: 50,
            is_greenfield_affiliate: true,
            core_values: ['mutual aid', 'liberation'],
            primary_goals: ['community support'],
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
            last_activity_at: new Date()
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ventureService.createVenture(userId, mockVentureData);

      expect(result).toEqual(expect.objectContaining({
        id: 'venture-id',
        name: 'Test Liberation Collective',
        ventureType: 'sovereign_circle',
        billingTier: 'liberation',
        maxMembers: 50,
        isGreenfieldAffiliate: true,
        currentUserRole: 'owner',
        currentUserPermissions: ['admin_all']
      }));

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create a professional tier venture for professional type', async () => {
      const professionalData: CreateVentureRequest = {
        ...mockVentureData,
        ventureType: 'professional',
        isGreenfieldAffiliate: false
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // INSERT venture
          rows: [{
            id: 'venture-id',
            name: 'Test Liberation Collective',
            venture_type: 'professional',
            primary_billing_owner: userId,
            billing_tier: 'professional',
            max_members: 5,
            is_greenfield_affiliate: false,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
            last_activity_at: new Date()
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ventureService.createVenture(userId, professionalData);

      expect(result.billingTier).toBe('professional');
      expect(result.maxMembers).toBe(5);
      expect(result.isGreenfieldAffiliate).toBe(false);
    });

    it('should handle database errors during creation', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(ventureService.createVenture(userId, mockVentureData))
        .rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...mockVentureData, name: '' };

      // Should validate before database operations
      await expect(ventureService.createVenture(userId, invalidData as any))
        .rejects.toThrow();
    });
  });

  describe('getVentures', () => {
    const userId = 'test-user-id';

    it('should return user ventures with pagination', async () => {
      const mockVentures = [
        {
          id: 'venture-1',
          name: 'Liberation Collective',
          venture_type: 'sovereign_circle',
          billing_tier: 'liberation',
          user_role: 'owner',
          user_permissions: ['admin_all'],
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          last_activity_at: new Date()
        },
        {
          id: 'venture-2',
          name: 'Professional Venture',
          venture_type: 'professional',
          billing_tier: 'professional',
          user_role: 'contributor',
          user_permissions: ['create_conversations'],
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          last_activity_at: new Date()
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockVentures }) // ventures query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count query

      const result = await ventureService.getVentures(userId, { limit: 10, offset: 0 });

      expect(result.ventures).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.ventures[0].name).toBe('Liberation Collective');
    });

    it('should filter ventures by type', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await ventureService.getVentures(userId, { 
        ventureType: 'sovereign_circle',
        limit: 10,
        offset: 0
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('v.venture_type = $2'),
        expect.arrayContaining([userId, 'sovereign_circle'])
      );
    });

    it('should handle search queries', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await ventureService.getVentures(userId, { 
        search: 'liberation',
        limit: 10,
        offset: 0
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining([userId, '%liberation%'])
      );
    });
  });

  describe('updateVenture', () => {
    const userId = 'test-user-id';
    const ventureId = 'venture-id';

    it('should update venture when user has permissions', async () => {
      const updateData: UpdateVentureRequest = {
        name: 'Updated Name',
        description: 'Updated description',
        coreValues: ['updated', 'values']
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'owner', permissions: ['admin_all'] }]
        })
        .mockResolvedValueOnce({ // update query
          rows: [{
            id: ventureId,
            name: 'Updated Name',
            description: 'Updated description',
            core_values: ['updated', 'values'],
            updated_at: new Date()
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ventureService.updateVenture(userId, ventureId, updateData);

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Updated Name');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should deny updates for users without permissions', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // no permission found

      await expect(ventureService.updateVenture(userId, ventureId, {}))
        .rejects.toThrow('Access denied');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should deny updates for insufficient permissions', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'observer', permissions: [] }]
        });

      await expect(ventureService.updateVenture(userId, ventureId, {}))
        .rejects.toThrow('Insufficient permissions');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('inviteMember', () => {
    const userId = 'test-user-id';
    const ventureId = 'venture-id';

    it('should create invitation when user can manage members', async () => {
      const inviteData: InviteMemberRequest = {
        email: 'newmember@example.com',
        role: 'contributor',
        permissions: ['create_conversations'],
        personalMessage: 'Join our collective!'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'owner', permissions: ['manage_members'] }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // current member count
        .mockResolvedValueOnce({ rows: [{ max_members: 50 }] }) // venture limits
        .mockResolvedValueOnce({ // create invitation
          rows: [{
            id: 'invitation-id',
            venture_id: ventureId,
            invited_email: 'newmember@example.com',
            role: 'contributor',
            invitation_token: 'token123',
            expires_at: new Date(),
            status: 'pending',
            created_at: new Date()
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ventureService.inviteMember(userId, ventureId, inviteData);

      expect(result.invitedEmail).toBe('newmember@example.com');
      expect(result.role).toBe('contributor');
      expect(result.status).toBe('pending');
    });

    it('should reject invitations when member limit reached', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'owner', permissions: ['manage_members'] }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // current member count
        .mockResolvedValueOnce({ rows: [{ max_members: 5 }] }); // venture limits

      await expect(ventureService.inviteMember(userId, ventureId, {
        email: 'test@example.com',
        role: 'contributor'
      })).rejects.toThrow('Member limit reached');
    });
  });

  describe('getVentureStats', () => {
    const userId = 'test-user-id';
    const ventureId = 'venture-id';

    it('should return venture statistics for authorized users', async () => {
      const mockStats = {
        members: 3,
        conversations: 15,
        messages: 150,
        lastActivity: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'owner' }]
        })
        .mockResolvedValueOnce({ // stats query
          rows: [mockStats]
        });

      const result = await ventureService.getVentureStats(userId, ventureId);

      expect(result).toEqual(mockStats);
    });

    it('should deny access to unauthorized users', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }); // no access

      await expect(ventureService.getVentureStats(userId, ventureId))
        .rejects.toThrow('Access denied');
    });
  });

  describe('deleteVenture', () => {
    const userId = 'test-user-id';
    const ventureId = 'venture-id';

    it('should archive venture for owners', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'owner' }]
        })
        .mockResolvedValueOnce({ // update to archived
          rowCount: 1
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ventureService.deleteVenture(userId, ventureId);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'archived'"),
        expect.any(Array)
      );
    });

    it('should deny deletion for non-owners', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // permission check
          rows: [{ role: 'contributor' }]
        });

      await expect(ventureService.deleteVenture(userId, ventureId))
        .rejects.toThrow('Only venture owners can archive ventures');
    });
  });

  describe('mapVentureRow', () => {
    it('should correctly map database row to Venture object', () => {
      const mockRow = {
        id: 'venture-id',
        name: 'Test Venture',
        description: 'Test description',
        venture_type: 'sovereign_circle',
        primary_billing_owner: 'user-id',
        billing_tier: 'liberation',
        max_members: 50,
        is_greenfield_affiliate: true,
        core_values: ['mutual aid', 'liberation'],
        primary_goals: ['community support'],
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_activity_at: new Date()
      };

      // Access private method through any cast for testing
      const venture = (ventureService as any).mapVentureRow(mockRow);

      expect(venture).toEqual({
        id: 'venture-id',
        name: 'Test Venture',
        description: 'Test description',
        ventureType: 'sovereign_circle',
        primaryBillingOwner: 'user-id',
        billingTier: 'liberation',
        maxMembers: 50,
        isGreenfieldAffiliate: true,
        coreValues: ['mutual aid', 'liberation'],
        primaryGoals: ['community support'],
        status: 'active',
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
        lastActivityAt: mockRow.last_activity_at,
        sovereignCircleId: undefined,
        solidarityNetworkId: undefined,
        costSharingEnabled: undefined,
        costSharingMethod: undefined,
        costSharingNotes: undefined,
        ventureVoice: undefined,
        targetAudience: undefined
      });
    });
  });
});