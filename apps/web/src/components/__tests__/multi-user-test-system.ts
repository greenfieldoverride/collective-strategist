import { vi } from 'vitest'

// Test user interface matching our actual user structure
export interface TestUser {
  id: string
  email: string
  token: string
  ventures: {
    id: string
    name: string
    role: 'owner' | 'co_owner' | 'contributor' | 'collaborator' | 'observer'
    permissions: string[]
  }[]
  subscriptionTier: 'liberation' | 'professional'
}

// Define test users with OVERLAPPING venture access for proper security isolation testing
export const TEST_USERS: Record<string, TestUser> = {
  AGATHA_OWNER: {
    id: 'agatha-001',
    email: 'agatha.harkness@test.com',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFnYXRoYS0wMDEiLCJlbWFpbCI6ImFnYXRoYS5oYXJrbmVzc0B0ZXN0LmNvbSIsInRpZXIiOiJzb3ZlcmVpZ25fY2lyY2xlIiwiaWF0IjoxNzYxMTUwODgzLCJleHAiOjE3NjE3NTU2ODN9.k9S7x7_boPJCvrzk9Q97GQvrKwj9OvOIX8u66dOJK0w',
    ventures: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000', // Witches Road (shared with Rio, Alice)
        name: 'Witches Road Coven',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174000', // Darkhold (shared with Billy)
        name: 'Darkhold Collective',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      },
      {
        id: '323e4567-e89b-12d3-a456-426614174000', // Secret venture (Agatha only!)
        name: 'Salem Seven Secrets',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      }
    ],
    subscriptionTier: 'liberation'
  },
  
  RIO_COLLABORATOR: {
    id: 'rio-002',
    email: 'rio.vidal@test.com',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InJpby0wMDIiLCJlbWFpbCI6InJpby52aWRhbEB0ZXN0LmNvbSIsInRpZXIiOiJpbmRpdmlkdWFsX3BybyIsImlhdCI6MTc2MTE1MDg4MywiZXhwIjoxNzYxNzU1NjgzfQ.Qxp4VUWrHS8QK6SBJFPEkRaUIDaHzzJ0Twt8rlT3BbY',
    ventures: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000', // Witches Road (shared with Agatha, Alice)
        name: 'Witches Road Coven',
        role: 'collaborator',
        permissions: ['read', 'write']
      },
      {
        id: '423e4567-e89b-12d3-a456-426614174000', // Death Magic (shared with Billy)
        name: 'Death Magic Guild',
        role: 'co_owner',
        permissions: ['read', 'write', 'admin']
      }
    ],
    subscriptionTier: 'professional'
  },
  
  ALICE_OBSERVER: {
    id: 'alice-003',
    email: 'alice.wu-gulliver@test.com',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFsaWNlLTAwMyIsImVtYWlsIjoiYWxpY2Uud3UtZ3VsbGl2ZXJAdGVzdC5jb20iLCJ0aWVyIjoiaW5kaXZpZHVhbF9wcm8iLCJpYXQiOjE3NjExNTA4ODMsImV4cCI6MTc2MTc1NTY4M30.vdBNXLzeGWgWhv8lkg_e1fO6EL7YnFAwR7AKFReXzpI',
    ventures: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000', // Witches Road (shared with Agatha, Rio) - but as OBSERVER
        name: 'Witches Road Coven',
        role: 'observer',
        permissions: ['read']
      },
      {
        id: '523e4567-e89b-12d3-a456-426614174000', // Protection Circle (Alice only!)
        name: 'Protection Witch Circle',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      }
    ],
    subscriptionTier: 'professional'
  },
  
  BILLY_ADMIN: {
    id: 'billy-004',
    email: 'billy.maximoff@test.com',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJpbGx5LTAwNCIsImVtYWlsIjoiYmlsbHkubWF4aW1vZmZAdGVzdC5jb20iLCJ0aWVyIjoic292ZXJlaWduX2NpcmNsZSIsImlhdCI6MTc2MTE1MTAyOCwiZXhwIjoxNzYxNzU1ODI4fQ.MdrW3tUXn8onHSsDOv-gZazf5fDwgwkHnh3OjoVJ3io',
    ventures: [
      {
        id: '223e4567-e89b-12d3-a456-426614174000', // Darkhold (shared with Agatha) - but as COLLABORATOR
        name: 'Darkhold Collective',
        role: 'collaborator',
        permissions: ['read', 'write']
      },
      {
        id: '423e4567-e89b-12d3-a456-426614174000', // Death Magic (shared with Rio)
        name: 'Death Magic Guild',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      },
      {
        id: '623e4567-e89b-12d3-a456-426614174000', // Maximoff Legacy (Billy only!)
        name: 'Maximoff Legacy Foundation',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      }
    ],
    subscriptionTier: 'liberation'
  },

  JEN_POTIONS: {
    id: 'jen-005',
    email: 'jennifer.kale@test.com',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Implbi0wMDUiLCJlbWFpbCI6Implbm5pZmVyLmthbGVAdGVzdC5jb20iLCJ0aWVyIjoiaW5kaXZpZHVhbF9wcm8iLCJpYXQiOjE3NjExNTEwMjgsImV4cCI6MTc2MTc1NTgyOH0.TprOKLzhSHs9qN6-c39lyZkIMPpcgpY6zhe3iSTwxIU',
    ventures: [
      {
        id: '223e4567-e89b-12d3-a456-426614174000', // Darkhold (shared with Agatha, Billy) - but as OBSERVER
        name: 'Darkhold Collective',
        role: 'observer',
        permissions: ['read']
      },
      {
        id: '523e4567-e89b-12d3-a456-426614174000', // Protection Circle (shared with Alice) - but as COLLABORATOR
        name: 'Protection Witch Circle',
        role: 'collaborator',
        permissions: ['read', 'write']
      },
      {
        id: '723e4567-e89b-12d3-a456-426614174000', // Potions Guild (Jen only!)
        name: 'Healing Potions Guild',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete']
      }
    ],
    subscriptionTier: 'professional'
  }
}

// User context switcher for tests
class UserTestContext {
  private currentUser: TestUser | null = null
  private mockLocalStorage: Record<string, string> = {}
  private mockFetch: ReturnType<typeof vi.fn>
  
  constructor() {
    this.mockFetch = vi.fn()
    this.setupGlobalMocks()
  }

  switchToUser(userKey: keyof typeof TEST_USERS) {
    this.currentUser = TEST_USERS[userKey]
    
    // Update localStorage with user data
    this.mockLocalStorage['user'] = JSON.stringify({
      id: this.currentUser.id,
      email: this.currentUser.email,
      token: this.currentUser.token
    })
    
    this.mockLocalStorage['ventures'] = JSON.stringify(this.currentUser.ventures)
    this.mockLocalStorage['authToken'] = this.currentUser.token
    
    console.log(`🔮 Switched to witch: ${userKey} (${this.currentUser.email})`)
    return this.currentUser
  }

  getCurrentUser(): TestUser | null {
    return this.currentUser
  }

  getAuthHeaders() {
    if (!this.currentUser) {
      throw new Error('No witch selected. Call switchToUser() first.')
    }
    
    return {
      'Authorization': `Bearer ${this.currentUser.token}`,
      'Content-Type': 'application/json'
    }
  }

  private setupGlobalMocks() {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => this.mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          this.mockLocalStorage[key] = value
        },
        removeItem: (key: string) => {
          delete this.mockLocalStorage[key]
        },
        clear: () => {
          this.mockLocalStorage = {}
        }
      },
      writable: true
    })

    // Mock fetch to return user-specific data
    global.fetch = this.mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      // Check for content generation API with venture access control
      if (url.includes('/content-drafter/generate') && this.currentUser && options?.body) {
        try {
          const body = JSON.parse(options.body as string)
          const requestedVentureId = body.contextualCoreId
          
          if (requestedVentureId) {
            const hasAccess = this.currentUser.ventures.some(v => v.id === requestedVentureId)
            
            if (!hasAccess) {
              return new Response(JSON.stringify({ 
                error: 'Access denied: You do not have permission to generate content for this venture'
              }), { status: 403 })
            }
          }
          
          // User has access, return success
          return new Response(JSON.stringify({
            success: true,
            data: {
              content: 'Generated content...',
              title: 'Test Content'
            }
          }), { status: 200 })
        } catch (e) {
          // If we can't parse the body, just continue to default response
        }
      }
      
      // Check for specific venture access
      const ventureIdMatch = url.match(/\/ventures\/([^\/\?]+)/)
      if (ventureIdMatch && this.currentUser) {
        const requestedVentureId = ventureIdMatch[1]
        const hasAccess = this.currentUser.ventures.some(v => v.id === requestedVentureId)
        
        if (!hasAccess) {
          return new Response(JSON.stringify({ 
            error: 'Access denied: You do not have permission to access this venture'
          }), { status: 403 })
        }
        
        return new Response(JSON.stringify({
          venture: this.currentUser.ventures.find(v => v.id === requestedVentureId)
        }), { status: 200 })
      }
      
      // General ventures list - return user's ventures
      if (url.includes('/ventures') && this.currentUser) {
        return new Response(JSON.stringify({
          ventures: this.currentUser.ventures
        }), { status: 200 })
      }
      
      // Default mock response
      return new Response(JSON.stringify({ 
        success: true, 
        user: this.currentUser?.id,
        message: `Mocked response for ${url}` 
      }), { status: 200 })
    })
  }

  reset() {
    this.currentUser = null
    this.mockLocalStorage = {}
    this.mockFetch.mockClear()
  }
}

// Multi-user test runner that executes tests across different witches
export class MultiUserTestRunner {
  public context: UserTestContext

  constructor() {
    this.context = new UserTestContext()
  }

  async runAcrossUsers<T>(
    userKeys: (keyof typeof TEST_USERS)[],
    testFn: (user: TestUser) => Promise<T>
  ): Promise<Array<T & { user: string }>> {
    const results: Array<T & { user: string }> = []
    
    for (const userKey of userKeys) {
      const user = this.context.switchToUser(userKey)
      try {
        const result = await testFn(user)
        results.push({ ...result, user: userKey as string })
      } catch (error) {
        console.error(`Test failed for witch ${userKey}:`, error)
        throw error
      }
    }
    
    return results
  }

  async testAuthorization(action: string, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST') {
    const results = await this.runAcrossUsers(
      ['AGATHA_OWNER', 'RIO_COLLABORATOR', 'ALICE_OBSERVER', 'BILLY_ADMIN', 'JEN_POTIONS'],
      async (user) => {
        const response = await fetch(endpoint, {
          method,
          headers: this.context.getAuthHeaders(),
          body: method !== 'GET' ? JSON.stringify({
            contextualCoreId: user.ventures[0].id,
            contentType: 'blog_article'
          }) : undefined
        })
        
        return {
          action,
          allowed: response.ok,
          status: response.status,
          hasAccess: response.status !== 403
        }
      }
    )
    
    return results
  }

  // SOPHISTICATED CROSS-VENTURE SECURITY ISOLATION TEST
  async testCrossVentureIsolation() {
    const testScenarios = [
      // Test 1: Agatha tries to access ventures she shouldn't have access to
      { user: 'AGATHA_OWNER', ventureId: '423e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Agatha not in Death Magic Guild' },
      { user: 'AGATHA_OWNER', ventureId: '623e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Agatha not in Maximoff Legacy' },
      { user: 'AGATHA_OWNER', ventureId: '723e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Agatha not in Potions Guild' },
      
      // Test 2: Rio tries ventures she has different access levels to
      { user: 'RIO_COLLABORATOR', ventureId: '123e4567-e89b-12d3-a456-426614174000', shouldSucceed: true, reason: 'Rio collaborator in Witches Road' },
      { user: 'RIO_COLLABORATOR', ventureId: '223e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Rio not in Darkhold' },
      { user: 'RIO_COLLABORATOR', ventureId: '323e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Rio not in Salem Secrets' },
      
      // Test 3: Alice observer trying to create content (should fail)
      { user: 'ALICE_OBSERVER', ventureId: '123e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Alice only observer in Witches Road' },
      { user: 'ALICE_OBSERVER', ventureId: '523e4567-e89b-12d3-a456-426614174000', shouldSucceed: true, reason: 'Alice owner in Protection Circle' },
      
      // Test 4: Billy different roles in different ventures
      { user: 'BILLY_ADMIN', ventureId: '223e4567-e89b-12d3-a456-426614174000', shouldSucceed: true, reason: 'Billy collaborator in Darkhold' },
      { user: 'BILLY_ADMIN', ventureId: '423e4567-e89b-12d3-a456-426614174000', shouldSucceed: true, reason: 'Billy owner in Death Magic' },
      { user: 'BILLY_ADMIN', ventureId: '123e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Billy not in Witches Road' },
      
      // Test 5: Jen complex access patterns
      { user: 'JEN_POTIONS', ventureId: '223e4567-e89b-12d3-a456-426614174000', shouldSucceed: false, reason: 'Jen only observer in Darkhold' },
      { user: 'JEN_POTIONS', ventureId: '523e4567-e89b-12d3-a456-426614174000', shouldSucceed: true, reason: 'Jen collaborator in Protection Circle' },
      { user: 'JEN_POTIONS', ventureId: '723e4567-e89b-12d3-a456-426614174000', shouldSucceed: true, reason: 'Jen owner in Potions Guild' }
    ]

    const results = []
    
    for (const scenario of testScenarios) {
      this.context.switchToUser(scenario.user as keyof typeof TEST_USERS)
      
      const response = await fetch('http://localhost:8007/api/v1/content-drafter/generate', {
        method: 'POST',
        headers: this.context.getAuthHeaders(),
        body: JSON.stringify({
          contextualCoreId: scenario.ventureId,
          contentType: 'blog_article'
        })
      })
      
      const actualSuccess = response.status !== 403
      const testPassed = actualSuccess === scenario.shouldSucceed
      
      results.push({
        user: scenario.user,
        ventureId: scenario.ventureId,
        reason: scenario.reason,
        expectedSuccess: scenario.shouldSucceed,
        actualSuccess,
        testPassed,
        status: response.status
      })
    }
    
    return results
  }

  cleanup() {
    this.context.reset()
  }
}

// Export singleton instance for tests
export const multiUserTest = new MultiUserTestRunner()