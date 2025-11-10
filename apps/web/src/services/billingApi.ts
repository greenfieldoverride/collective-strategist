interface BillingCustomer {
  id: string
  userId: string
  externalCustomerId: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

interface BillingSubscription {
  id: string
  userId: string
  externalSubscriptionId: string
  status: 'active' | 'cancelled' | 'paused' | 'past_due'
  planName: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
  updatedAt: string
}

interface BillingInfo {
  customer: BillingCustomer | null
  subscription: BillingSubscription | null
  status: 'none' | 'active' | 'cancelled' | 'past_due'
}

interface CreateCheckoutRequest {
  planName: string
  amount: number
  currency?: string
}

interface CreateSubscriptionRequest {
  planName: string
  amount: number
  currency?: string
  interval?: 'month' | 'year'
}

interface PlanOption {
  name: string
  displayName: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  description: string
  popular?: boolean
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

import { apiUrl } from '../config'

class BillingApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = apiUrl('')
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('token')
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken()
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
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

  // Get user's billing information
  async getBillingInfo(): Promise<BillingInfo> {
    const response = await this.makeRequest<ApiResponse<BillingInfo>>('/api/billing/customer')
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get billing info')
    }
    
    return response.data!
  }

  // Get subscription status
  async getSubscriptionStatus(): Promise<'none' | 'active' | 'cancelled' | 'past_due'> {
    const billingInfo = await this.getBillingInfo()
    return billingInfo.status
  }

  // Create checkout URL for plan upgrade
  async createCheckoutUrl(request: CreateCheckoutRequest): Promise<string> {
    const response = await this.makeRequest<ApiResponse<{ checkoutUrl: string }>>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create checkout URL')
    }
    
    return response.data!.checkoutUrl
  }

  // Create subscription directly (for testing)
  async createSubscription(request: CreateSubscriptionRequest): Promise<BillingSubscription> {
    const response = await this.makeRequest<ApiResponse<BillingSubscription>>('/api/billing/subscription', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create subscription')
    }
    
    return response.data!
  }

  // Cancel subscription
  async cancelSubscription(): Promise<BillingSubscription | null> {
    const response = await this.makeRequest<ApiResponse<BillingSubscription | null>>('/api/billing/subscription', {
      method: 'DELETE',
    })
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to cancel subscription')
    }
    
    return response.data || null
  }

  // Get available plans
  getAvailablePlans(): PlanOption[] {
    return [
      {
        name: 'liberation',
        displayName: 'Liberation',
        amount: 0, // Free
        currency: 'USD',
        interval: 'month',
        features: [
          'Sovereign circles only',
          'Basic AI consultant',
          'Community support',
          'Up to 10 circle members',
          'Liberation-focused features'
        ],
        description: 'Free for sovereign circles and Greenfield Override affiliates'
      },
      {
        name: 'individual_pro',
        displayName: 'Individual Pro',
        amount: 2900, // $29.00
        currency: 'USD',
        interval: 'month',
        features: [
          'Up to 3 ventures',
          'Advanced AI consultant',
          'Priority support',
          'Solo or small team (up to 3)',
          'Financial analytics',
          'Basic integrations'
        ],
        description: 'Perfect for individual entrepreneurs and small ventures',
        popular: true
      },
      {
        name: 'collective_pro',
        displayName: 'Collective Pro',
        amount: 9900, // $99.00
        currency: 'USD',
        interval: 'month',
        features: [
          'Up to 10 ventures',
          'Advanced AI consultant',
          'Team collaboration tools',
          'Up to 25 team members',
          'Advanced analytics',
          'Custom integrations',
          'Multi-venture coordination'
        ],
        description: 'For collectives managing multiple ventures together'
      },
      {
        name: 'network',
        displayName: 'Network',
        amount: 29900, // $299.00
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited ventures',
          'Premium AI consultant',
          'Dedicated support',
          'Unlimited team members',
          'White-label options',
          'API access',
          'Cross-venture analytics',
          'Network coordination tools'
        ],
        description: 'For large networks and organizations coordinating many ventures'
      }
    ]
  }

  // Get plan details by name
  getPlanByName(planName: string): PlanOption | null {
    return this.getAvailablePlans().find(plan => plan.name === planName) || null
  }

  // Format price for display
  formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100)
  }

  // Check if user has access to feature based on plan
  hasFeatureAccess(currentPlan: string | null, feature: string): boolean {
    // Liberation tier has special access rules
    if (currentPlan === 'liberation') {
      const liberationFeatures = [
        'basic_ai_consultant',
        'community_support', 
        'sovereign_circle_features',
        'liberation_tools'
      ]
      return liberationFeatures.includes(feature) || feature.includes('liberation')
    }
    
    const planHierarchy = ['liberation', 'individual_pro', 'collective_pro', 'network']
    const currentIndex = currentPlan ? planHierarchy.indexOf(currentPlan) : -1
    
    // Feature access rules based on venture-focused needs
    const featureRequirements: Record<string, number> = {
      // Individual Pro features (index 1+)
      'advanced_analytics': 1,
      'priority_support': 1,
      'venture_management': 1,
      'financial_tracking': 1,
      
      // Collective Pro features (index 2+) 
      'team_collaboration': 2,
      'multi_venture_coordination': 2,
      'advanced_integrations': 2,
      'collective_tools': 2,
      
      // Network features (index 3+)
      'unlimited_ventures': 3,
      'white_label': 3,
      'api_access': 3,
      'network_coordination': 3,
      'cross_venture_analytics': 3,
    }
    
    const requiredLevel = featureRequirements[feature]
    if (requiredLevel === undefined) {
      return true // Feature doesn't require subscription
    }
    
    return currentIndex >= requiredLevel
  }

  // Demo/Development helpers
  async getMockInfo(): Promise<any> {
    try {
      const response = await this.makeRequest<any>('/api/billing/mock/info')
      return response
    } catch (error) {
      console.warn('Mock billing info not available:', error)
      return null
    }
  }

  async resetMockData(): Promise<void> {
    try {
      await this.makeRequest<any>('/api/billing/mock/reset', { method: 'POST' })
    } catch (error) {
      console.warn('Mock data reset not available:', error)
    }
  }
}

export const billingApi = new BillingApiService()
export type { 
  BillingCustomer, 
  BillingSubscription, 
  BillingInfo, 
  PlanOption,
  CreateCheckoutRequest,
  CreateSubscriptionRequest
}