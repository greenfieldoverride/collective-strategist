import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { build } from '../../index';
import { FastifyInstance } from 'fastify';

describe('Authentication Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      tier: 'individual_pro' as const
    };

    it('should register a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: validRegistrationData
      });

      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('user');
      expect(data.data).toHaveProperty('token');
      expect(data.data.user.email).toBe(validRegistrationData.email);
      expect(data.data.user.tier).toBe(validRegistrationData.tier);
      expect(data.data.user).not.toHaveProperty('passwordHash');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: '123' // too short
        }
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should default to individual_pro tier when not specified', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'SecurePassword123!'
        }
      });

      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.body);
      expect(data.data.user.tier).toBe('individual_pro');
    });

    it('should accept sovereign_circle tier', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          ...validRegistrationData,
          tier: 'sovereign_circle'
        }
      });

      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.body);
      expect(data.data.user.tier).toBe('sovereign_circle');
      expect(data.data.user.isVerifiedSovereignCircle).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          ...validRegistrationData,
          email: 'not-an-email'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          ...validRegistrationData,
          password: '1234567'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePassword123!'
    };

    it('should login with valid credentials', async () => {
      // Mock successful login
      const mockDb = require('../../database/connection').db;
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: loginData.email,
          password_hash: '$2a$12$hashedpassword',
          tier: 'individual_pro',
          greenfield_override_id: null,
          is_verified_sovereign_circle: false,
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true
        }]
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: loginData
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('user');
      expect(data.data).toHaveProperty('token');
      expect(data.data.user.email).toBe(loginData.email);
    });

    it('should reject invalid credentials', async () => {
      const mockDb = require('../../database/connection').db;
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: loginData
      });

      expect(response.statusCode).toBe(401);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should reject wrong password', async () => {
      const mockDb = require('../../database/connection').db;
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: loginData.email,
          password_hash: '$2a$12$hashedpassword',
          tier: 'individual_pro',
          is_active: true
        }]
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: loginData
      });

      expect(response.statusCode).toBe(401);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com'
          // missing password
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;

    beforeEach(() => {
      // Create a test JWT token
      authToken = app.jwt.sign({ 
        id: 'user-123', 
        email: 'test@example.com', 
        tier: 'individual_pro' 
      });
    });

    it('should return user info with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('email');
      expect(data.data).toHaveProperty('tier');
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me'
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = app.jwt.sign(
        { id: 'user-123', email: 'test@example.com', tier: 'individual_pro' },
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken: string;

    beforeEach(() => {
      authToken = app.jwt.sign({ 
        id: 'user-123', 
        email: 'test@example.com', 
        tier: 'individual_pro' 
      });
    });

    it('should logout successfully with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });

    it('should reject logout without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});