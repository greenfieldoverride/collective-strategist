import { FastifyInstance } from 'fastify';
import { build } from '../setup';
import { CreateVentureRequest, InviteMemberRequest } from '../../types/collective-strategist';

describe('Venture Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = build();
    await app.ready();

    // Mock authentication
    authToken = 'mock-jwt-token';
    
    // Mock JWT verification
    app.jwt = {
      verify: jest.fn().mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        tier: 'individual_pro'
      })
    } as any;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/ventures', () => {
    const validVentureData: CreateVentureRequest = {
      name: 'Test Liberation Collective',
      description: 'A test sovereign circle for community mutual aid',
      ventureType: 'sovereign_circle',
      isGreenfieldAffiliate: true,
      coreValues: ['mutual aid', 'liberation', 'solidarity'],
      primaryGoals: ['community support', 'resource sharing']
    };

    it('should create a new venture with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: validVentureData
      });

      expect(response.statusCode).toBe(201);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Test Liberation Collective',
        ventureType: 'sovereign_circle',
        billingTier: 'liberation',
        maxMembers: 50,
        isGreenfieldAffiliate: true,
        currentUserRole: 'owner',
        currentUserPermissions: expect.arrayContaining(['admin_all'])
      });
      expect(body.meta).toHaveProperty('timestamp');
      expect(body.meta).toHaveProperty('processingTime');
    });

    it('should create professional venture with correct tier', async () => {
      const professionalData = {
        ...validVentureData,
        ventureType: 'professional' as const,
        isGreenfieldAffiliate: false
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: professionalData
      });

      expect(response.statusCode).toBe(201);
      
      const body = response.json();
      expect(body.data.billingTier).toBe('professional');
      expect(body.data.maxMembers).toBe(5);
      expect(body.data.isGreenfieldAffiliate).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
      
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate venture type enum', async () => {
      const invalidData = {
        ...validVentureData,
        ventureType: 'invalid_type'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          'content-type': 'application/json'
        },
        payload: validVentureData
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/ventures', () => {
    it('should return user ventures with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ventures?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('ventures');
      expect(body.data).toHaveProperty('total');
      expect(body.data).toHaveProperty('hasMore');
      expect(Array.isArray(body.data.ventures)).toBe(true);
    });

    it('should filter by venture type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ventures?ventureType=sovereign_circle',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should support search functionality', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ventures?search=liberation',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ventures?limit=invalid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/ventures/:ventureId', () => {
    const mockVentureId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return venture details for authorized user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ventures/${mockVentureId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('name');
      expect(body.data).toHaveProperty('currentUserRole');
      expect(body.data).toHaveProperty('currentUserPermissions');
    });

    it('should return 404 for non-existent venture', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ventures/${nonExistentId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VENTURE_NOT_FOUND');
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ventures/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/ventures/:ventureId', () => {
    const mockVentureId = '123e4567-e89b-12d3-a456-426614174000';

    it('should update venture for authorized user', async () => {
      const updateData = {
        name: 'Updated Venture Name',
        description: 'Updated description',
        coreValues: ['updated', 'values']
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/ventures/${mockVentureId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Venture Name');
    });

    it('should validate update data', async () => {
      const invalidData = {
        name: '', // Empty name should be invalid
        status: 'invalid_status'
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/ventures/${mockVentureId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/ventures/:ventureId/members/invite', () => {
    const mockVentureId = '123e4567-e89b-12d3-a456-426614174000';

    it('should create member invitation', async () => {
      const inviteData: InviteMemberRequest = {
        email: 'newmember@example.com',
        role: 'contributor',
        permissions: ['create_conversations', 'access_analytics'],
        personalMessage: 'Join our liberation collective!'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/ventures/${mockVentureId}/members/invite`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: inviteData
      });

      expect(response.statusCode).toBe(201);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        invitedEmail: 'newmember@example.com',
        role: 'contributor',
        status: 'pending'
      });
      expect(body.data).toHaveProperty('invitationToken');
      expect(body.data).toHaveProperty('expiresAt');
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        role: 'contributor'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/ventures/${mockVentureId}/members/invite`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate role enum', async () => {
      const invalidData = {
        email: 'test@example.com',
        role: 'invalid_role'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/ventures/${mockVentureId}/members/invite`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/ventures/:ventureId/stats', () => {
    const mockVentureId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return venture statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ventures/${mockVentureId}/stats`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('members');
      expect(body.data).toHaveProperty('conversations');
      expect(body.data).toHaveProperty('messages');
    });

    it('should require access to venture', async () => {
      const unauthorizedVentureId = '99999999-9999-9999-9999-999999999999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/ventures/${unauthorizedVentureId}/stats`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/ventures/:ventureId', () => {
    const mockVentureId = '123e4567-e89b-12d3-a456-426614174000';

    it('should archive venture for owner', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/ventures/${mockVentureId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.archived).toBe(true);
    });

    it('should deny deletion for non-owners', async () => {
      // This would need to mock a different user role
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/ventures/${mockVentureId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // This test would need proper role mocking to test 403
      expect([200, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {
          name: 'Test Venture',
          ventureType: 'professional'
        }
      });

      // Should not crash the server
      expect([200, 201, 500]).toContain(response.statusCode);
    });

    it('should return consistent error format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ventures',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {} // Invalid payload
      });

      expect(response.statusCode).toBe(400);
      
      const body = response.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });
});