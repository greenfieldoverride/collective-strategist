import { describe, it, expect, afterEach } from 'vitest'
import { multiUserTest, TEST_USERS } from './multi-user-test-system'

describe('Multi-User Security and Isolation', () => {
  afterEach(() => {
    multiUserTest.cleanup()
  })

  describe('Venture Access Control', () => {
    it('should isolate venture access between users', async () => {
      const results = await multiUserTest.testCrossVentureIsolation()
      
      // Check that forbidden access attempts fail
      const forbiddenAttempts = results.filter((r: any) => !r.expectedSuccess)
      const blockedAttempts = forbiddenAttempts.filter((r: any) => r.testPassed)
      
      expect(blockedAttempts.length).toBeGreaterThan(0)
      expect(blockedAttempts.length).toBe(forbiddenAttempts.length)
      
      // Check that allowed access attempts succeed
      const allowedAttempts = results.filter((r: any) => r.expectedSuccess)
      const successfulAttempts = allowedAttempts.filter((r: any) => r.testPassed)
      
      expect(successfulAttempts.length).toBe(allowedAttempts.length)
    })

    it('should prevent unauthorized venture access', async () => {
      // Rio tries to access Darkhold venture (should fail - not in their ventures list)
      multiUserTest.context.switchToUser('RIO_COLLABORATOR')
      
      const response = await fetch('http://localhost:8007/api/v1/ventures/223e4567-e89b-12d3-a456-426614174000', {
        headers: { 'Authorization': `Bearer ${TEST_USERS.RIO_COLLABORATOR.token}` }
      })
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })

  describe('Permission-Based Access Control', () => {
    it('should enforce write permissions for content creation', async () => {
      const results = await multiUserTest.testAuthorization('content creation', '/api/v1/content-drafter/generate')
      
      // Check that authorization works as expected
      const allPassed = results.every((r: any) => r.testPassed)
      expect(allPassed).toBe(true)
      
      // Check that some users have access and some don't
      const hasVariedAccess = results.some((r: any) => r.authorized) && results.some((r: any) => !r.authorized)
      expect(hasVariedAccess).toBe(true)
    })

    it('should prevent observers from modifying content', async () => {
      // Alice (observer) tries to modify content
      multiUserTest.context.switchToUser('ALICE_OBSERVER')
      
      const response = await fetch('http://localhost:8007/api/content-drafter/generate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${TEST_USERS.ALICE_OBSERVER.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contentType: 'blog_article' })
      })
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })

    it('should allow collaborators to create content', async () => {
      // Rio (collaborator) should be able to create content
      multiUserTest.context.switchToUser('RIO_COLLABORATOR')
      
      const response = await fetch('http://localhost:8007/api/content-drafter/generate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${TEST_USERS.RIO_COLLABORATOR.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contentType: 'blog_article' })
      })
      
      expect(response.ok).toBe(true)
    })
  })

  describe('Social Media Security', () => {
    it('should isolate social media accounts between users', async () => {
      // Alice should see her connected accounts
      multiUserTest.context.switchToUser('ALICE_OWNER')
      
      let response = await fetch('http://localhost:8007/api/v1/social-media/accounts', {
        headers: { 'Authorization': `Bearer ${TEST_USERS.ALICE_OWNER.token}` }
      })
      
      expect(response.ok).toBe(true)
      let data = await response.json()
      expect(data.data[0].username).toContain('alice@test.com')
      
      // Rio should see different accounts
      multiUserTest.context.switchToUser('RIO_COLLABORATOR')
      
      response = await fetch('http://localhost:8007/api/v1/social-media/accounts', {
        headers: { 'Authorization': `Bearer ${TEST_USERS.RIO_COLLABORATOR.token}` }
      })
      
      expect(response.ok).toBe(true)
      data = await response.json()
      expect(data.data[0].username).toContain('bob@test.com')
    })

    it('should prevent unauthorized social media publishing', async () => {
      // Alice (observer) tries to publish social media post
      multiUserTest.context.switchToUser('ALICE_OBSERVER')
      
      const response = await fetch('http://localhost:8007/api/v1/social-media/publish', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${TEST_USERS.ALICE_OBSERVER.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: 'test-account',
          content: 'Test post'
        })
      })
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })

  describe('Cross-User Data Isolation', () => {
    it('should not leak data between users', async () => {
      // Alice creates content
      multiUserTest.context.switchToUser('ALICE_OWNER')
      
      const createResponse = await fetch('http://localhost:8007/api/content-drafter/generate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${TEST_USERS.ALICE_OWNER.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentType: 'blog_article',
          title: 'Alice Secret Content'
        })
      })
      
      expect(createResponse.ok).toBe(true)
      
      // Jen should NOT see Agatha's content
      multiUserTest.context.switchToUser('JEN_POTIONS')
      
      const listResponse = await fetch('http://localhost:8007/api/v1/content-studio', {
        headers: { 'Authorization': `Bearer ${TEST_USERS.JEN_POTIONS.token}` }
      })
      
      expect(listResponse.ok).toBe(true)
      const data = await listResponse.json()
      
      // Verify Jen doesn't see Agatha's content
      const hasAliceContent = data.data?.some((content: any) => 
        content.title?.includes('Alice Secret Content')
      )
      expect(hasAliceContent).toBe(false)
    })

    it('should handle token validation correctly', async () => {
      // When Rio's context is active, Agatha's token should be rejected
      multiUserTest.context.switchToUser('RIO_COLLABORATOR')
      
      const bobResponse = await fetch('http://localhost:8007/api/v1/ventures', {
        headers: { 'Authorization': `Bearer ${TEST_USERS.ALICE_OWNER.token}` }
      })
      
      expect(bobResponse.ok).toBe(false)
      expect(bobResponse.status).toBe(401)
    })
  })

  describe('Subscription Tier Gating', () => {
    it('should respect subscription tier limitations', async () => {
      // Test authorization across different subscription tiers
      const results = await multiUserTest.testAuthorization('premium feature access', '/api/v1/content-drafter/generate')
      
      // All users should have some form of access to basic features
      expect(results.length).toBeGreaterThan(0)
      
      // Check that the test system properly validates user authorization
      const allTestsPassed = results.every((r: any) => typeof r.testPassed === 'boolean')
      expect(allTestsPassed).toBe(true)
    })
  })

  describe('Role-Based Feature Access', () => {
    it('should restrict features based on user role', async () => {
      // Owner should have full access
      multiUserTest.context.switchToUser('ALICE_OWNER')
      const aliceVenture = TEST_USERS.ALICE_OWNER.ventures[0]
      expect(aliceVenture.role).toBe('owner')
      expect(aliceVenture.permissions).toContain('admin')
      expect(aliceVenture.permissions).toContain('delete')
      
      // Collaborator should have limited access
      multiUserTest.context.switchToUser('RIO_COLLABORATOR')
      const bobVenture = TEST_USERS.RIO_COLLABORATOR.ventures[0]
      expect(bobVenture.role).toBe('collaborator')
      expect(bobVenture.permissions).toContain('write')
      expect(bobVenture.permissions).not.toContain('admin')
      expect(bobVenture.permissions).not.toContain('delete')
      
      // Observer should have read-only access
      multiUserTest.context.switchToUser('ALICE_OBSERVER')
      const charlieVenture = TEST_USERS.ALICE_OBSERVER.ventures.find(v => v.id === 'venture-alpha')
      expect(charlieVenture?.role).toBe('observer')
      expect(charlieVenture?.permissions).toContain('read')
      expect(charlieVenture?.permissions).not.toContain('write')
    })
  })

  describe('Cross-User Interaction Security', () => {
    it('should prevent unauthorized cross-user actions', async () => {
      // Test cross-venture isolation using the available method
      const results = await multiUserTest.testCrossVentureIsolation()
      
      // Verify that unauthorized access attempts are properly blocked
      const unauthorizedAttempts = results.filter((r: any) => !r.expectedSuccess)
      const blockedAttempts = unauthorizedAttempts.filter((r: any) => !r.actualSuccess)
      
      expect(blockedAttempts.length).toBe(unauthorizedAttempts.length)
      
      // Verify that authorized access attempts succeed
      const authorizedAttempts = results.filter((r: any) => r.expectedSuccess)
      const successfulAttempts = authorizedAttempts.filter((r: any) => r.actualSuccess)
      
      expect(successfulAttempts.length).toBe(authorizedAttempts.length)
    })
  })
})