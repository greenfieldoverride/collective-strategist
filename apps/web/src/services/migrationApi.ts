import { APIResponse } from '../types/venture'
import { apiUrl } from '../config'

const API_BASE = apiUrl('api/v1')

export interface MigrationStatus {
  isComplete: boolean
  hasContextualCores: boolean
  hasVentures: boolean
  hasOrphanedConversations: boolean
  migrationNeeded: boolean
  lastMigrationDate?: string
}

export interface MigrationResult {
  migratedCount: number
  failedCount: number
  migrationLog: string[]
}

export interface ValidationResult {
  validationStatus: 'PASSED' | 'WARNING' | 'FAILED'
  contextualCoresCount: number
  venturesCount: number
  conversationsWithVentures: number
  conversationsWithLegacy: number
  orphanedConversations: number
  validationDetails: string[]
}

export interface BackupResult {
  backupCreated: boolean
  backupPath: string
}

export interface MigrationHistoryEntry {
  id: string
  migrationType: string
  status: string
  details: any
  createdAt: string
}

class MigrationAPIService {
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

  async getMigrationStatus(): Promise<MigrationStatus> {
    const response = await this.makeRequest<MigrationStatus>('/migration/status')
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get migration status')
    }
    
    return response.data
  }

  async executeMigration(): Promise<MigrationResult> {
    const response = await this.makeRequest<MigrationResult>('/migration/execute', {
      method: 'POST'
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to execute migration')
    }
    
    return response.data
  }

  async validateMigration(): Promise<ValidationResult> {
    const response = await this.makeRequest<ValidationResult>('/migration/validate')
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to validate migration')
    }
    
    return response.data
  }

  async createBackup(): Promise<BackupResult> {
    const response = await this.makeRequest<BackupResult>('/migration/backup', {
      method: 'POST'
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create backup')
    }
    
    return response.data
  }

  async rollbackMigration(reason?: string): Promise<MigrationResult> {
    const response = await this.makeRequest<MigrationResult>('/migration/rollback', {
      method: 'POST',
      body: JSON.stringify({
        confirmRollback: true,
        reason
      })
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to rollback migration')
    }
    
    return response.data
  }

  async getMigrationHistory(): Promise<MigrationHistoryEntry[]> {
    const response = await this.makeRequest<MigrationHistoryEntry[]>('/migration/history')
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get migration history')
    }
    
    return response.data
  }

  async cleanupOldData(): Promise<{ cleanupCompleted: boolean; details: string[] }> {
    const response = await this.makeRequest<{ cleanupCompleted: boolean; details: string[] }>('/migration/cleanup', {
      method: 'DELETE',
      body: JSON.stringify({
        confirmCleanup: true
      })
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to cleanup old data')
    }
    
    return response.data
  }
}

export const migrationApi = new MigrationAPIService()