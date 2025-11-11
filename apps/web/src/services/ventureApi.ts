import { 
  Venture, 
  CreateVentureRequest, 
  InviteMemberRequest, 
  VentureInvitation,
  APIResponse 
} from '../types/venture'
import { apiUrl } from '../config'

const API_BASE = apiUrl('api/v1')

class VentureAPIService {
  private getAuthToken(): string | null {
    return localStorage.getItem('token')
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    const token = this.getAuthToken()
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`)
    }

    return data
  }

  // Create a new venture
  async createVenture(request: CreateVentureRequest): Promise<Venture> {
    const response = await this.makeRequest<Venture>('/ventures', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create venture')
    }
    
    return response.data
  }

  // Get user's ventures
  async getVentures(params?: {
    limit?: number
    offset?: number
    ventureType?: string
    status?: string
    search?: string
  }): Promise<{ ventures: Venture[]; total: number; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString())
        }
      })
    }
    
    // Get real user ventures with authentication
    const response = await this.makeRequest<{ ventures: Venture[]; total: number; hasMore: boolean }>(
      `/ventures?${searchParams}`
    )
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch ventures')
    }
    
    return response.data
  }

  // Get specific venture
  async getVenture(ventureId: string): Promise<Venture> {
    const response = await this.makeRequest<Venture>(`/ventures/${ventureId}`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch venture')
    }
    
    return response.data
  }

  // Update venture
  async updateVenture(ventureId: string, updates: Partial<CreateVentureRequest>): Promise<Venture> {
    const response = await this.makeRequest<Venture>(`/ventures/${ventureId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update venture')
    }
    
    return response.data
  }

  // Invite team member
  async inviteMember(ventureId: string, invitation: InviteMemberRequest): Promise<VentureInvitation> {
    const response = await this.makeRequest<VentureInvitation>(
      `/ventures/${ventureId}/members/invite`,
      {
        method: 'POST',
        body: JSON.stringify(invitation)
      }
    )
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to send invitation')
    }
    
    return response.data
  }

  // Get venture stats
  async getVentureStats(ventureId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/ventures/${ventureId}/stats`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch venture stats')
    }
    
    return response.data
  }

  // Archive venture
  async archiveVenture(ventureId: string): Promise<boolean> {
    const response = await this.makeRequest<{ archived: boolean }>(
      `/ventures/${ventureId}`,
      { method: 'DELETE' }
    )
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to archive venture')
    }
    
    return response.data.archived
  }
}

export const ventureApi = new VentureAPIService()
