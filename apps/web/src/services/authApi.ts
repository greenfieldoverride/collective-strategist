interface User {
  id: string
  email: string
  name?: string
  createdAt: string
}

interface AuthResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  error?: {
    code: string
    message: string
  }
}

import { apiUrl } from '../config'

class AuthApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = apiUrl('')
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('token')
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken()
    
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await this.makeRequest<AuthResponse>('/auth/me')
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get user profile')
    }
    
    return response.data.user
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAuthToken()
    if (!token) return false
    
    try {
      // Simple JWT validation - check if token exists and is not expired
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 > Date.now()
    } catch {
      return false
    }
  }

  // Get user info from token (without API call)
  getUserFromToken(): Partial<User> | null {
    const token = this.getAuthToken()
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        id: payload.id || payload.sub,
        email: payload.email,
        name: payload.name
      }
    } catch {
      return null
    }
  }

  // Logout
  logout(): void {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  // Demo login for development
  async demoLogin(): Promise<void> {
    // Create a demo JWT token for development
    const demoPayload = {
      id: 'demo-user-123',
      email: 'demo@collective-strategist.com',
      name: 'Demo User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }
    
    // Note: This is a fake token for demo purposes only
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify(demoPayload))
    const signature = 'demo-signature'
    const demoToken = `${header}.${payload}.${signature}`
    
    localStorage.setItem('token', demoToken)
  }
}

export const authApi = new AuthApiService()
export type { User }