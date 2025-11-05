import { APIResponse } from '../types/venture'

const API_BASE = 'http://localhost:8007/api/v1'

export interface FinancialMetrics {
  monthlyIncome: number
  monthlyExpenses: number
  monthlyNet: number
  incomeTransactions: number
  uniqueClients: number
  avgTransactionSize: number
  financialHealthScore: number
}

export interface QuickFinancialStats {
  monthlyIncome: number
  monthlyNet: number
  activeGoals: number
  totalGoals: number
  activeStreams: number
  healthScore: number
}

export interface RevenueStreamStats {
  id: string
  streamName: string
  platform: string
  transactionCount: number
  totalRevenue: number
  netRevenue: number
  totalFees: number
  avgTransactionSize: number
  lastTransactionDate: string | null
  profitabilityScore: number
}

export interface SolvencyInsights {
  monthsOfRunway: number
  cashFlowTrend: 'improving' | 'stable' | 'declining'
  platformDependencyRisk: 'low' | 'medium' | 'high'
  seasonalityPattern: string | null
  recommendations: string[]
}

export interface FinancialGoalProgress {
  id: string
  goalName: string
  goalType: string
  targetAmount: number
  currentAmount: number
  progressPercentage: number
  daysRemaining: number | null
  onTrack: boolean
}

export interface MonthlyTrend {
  year: number
  month: number
  income: number
  expenses: number
  net: number
  transactionCount: number
}

export interface FinancialDashboard {
  currentMetrics: FinancialMetrics
  revenueStreams: RevenueStreamStats[]
  solvencyInsights: SolvencyInsights
  goalProgress: FinancialGoalProgress[]
  monthlyTrends: MonthlyTrend[]
}

class FinancialAPIService {
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

  async getFinancialDashboard(ventureId: string): Promise<FinancialDashboard> {
    const response = await this.makeRequest<FinancialDashboard>(`/ventures/${ventureId}/financial-dashboard`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get financial dashboard')
    }
    
    return response.data
  }

  async getQuickStats(ventureId: string): Promise<QuickFinancialStats> {
    const response = await this.makeRequest<QuickFinancialStats>(`/ventures/${ventureId}/financial-stats`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get financial stats')
    }
    
    return response.data
  }

  async getFinancialMetrics(ventureId: string): Promise<FinancialMetrics> {
    const response = await this.makeRequest<FinancialMetrics>(`/ventures/${ventureId}/financial-metrics`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get financial metrics')
    }
    
    return response.data
  }

  async getRevenueStreams(ventureId: string): Promise<RevenueStreamStats[]> {
    const response = await this.makeRequest<RevenueStreamStats[]>(`/ventures/${ventureId}/revenue-streams`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get revenue streams')
    }
    
    return response.data
  }

  async getSolvencyInsights(ventureId: string): Promise<SolvencyInsights> {
    const response = await this.makeRequest<SolvencyInsights>(`/ventures/${ventureId}/solvency-insights`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get solvency insights')
    }
    
    return response.data
  }

  async getFinancialGoals(ventureId: string): Promise<FinancialGoalProgress[]> {
    const response = await this.makeRequest<FinancialGoalProgress[]>(`/ventures/${ventureId}/financial-goals`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get financial goals')
    }
    
    return response.data
  }

  async getMonthlyTrends(ventureId: string, months: number = 6): Promise<MonthlyTrend[]> {
    const response = await this.makeRequest<MonthlyTrend[]>(`/ventures/${ventureId}/financial-trends?months=${months}`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get financial trends')
    }
    
    return response.data
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  formatPercentage(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100)
  }

  getHealthScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  getRiskColor(risk: 'low' | 'medium' | 'high'): string {
    switch (risk) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  getTrendColor(trend: 'improving' | 'stable' | 'declining'): string {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'stable': return 'text-blue-600'
      case 'declining': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
}

export const financialApi = new FinancialAPIService()