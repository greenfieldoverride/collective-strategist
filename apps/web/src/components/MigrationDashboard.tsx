import { useState, useEffect } from 'react'
import { 
  migrationApi, 
  MigrationStatus, 
  ValidationResult, 
  MigrationHistoryEntry 
} from '../services/migrationApi'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string | React.ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false 
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <h3>{title}</h3>
        <div className="dialog-message">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        <div className="dialog-actions">
          <button onClick={onCancel} className="btn-secondary">
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={destructive ? 'btn-destructive' : 'btn-primary'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MigrationDashboard() {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [history, setHistory] = useState<MigrationHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [migrationLog, setMigrationLog] = useState<string[]>([])
  
  // Dialog states
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)
  const [rollbackReason, setRollbackReason] = useState('')

  useEffect(() => {
    loadMigrationData()
  }, [])

  const loadMigrationData = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const [statusData, historyData] = await Promise.all([
        migrationApi.getMigrationStatus(),
        migrationApi.getMigrationHistory()
      ])
      
      setStatus(statusData)
      setHistory(historyData)
      
      // If migration is complete, also load validation
      if (statusData.isComplete) {
        const validationData = await migrationApi.validateMigration()
        setValidation(validationData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load migration data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteMigration = async () => {
    setShowExecuteDialog(false)
    setIsExecuting(true)
    setError('')
    setSuccessMessage('')
    setMigrationLog([])
    
    try {
      // Create backup first
      await migrationApi.createBackup()
      
      // Execute migration
      const result = await migrationApi.executeMigration()
      setMigrationLog(result.migrationLog)
      
      if (result.failedCount > 0) {
        setError(`Migration completed with ${result.failedCount} failures. ${result.migratedCount} items migrated successfully.`)
      } else {
        setSuccessMessage(`Migration completed successfully! ${result.migratedCount} contextual cores migrated to ventures.`)
      }
      
      // Reload data
      await loadMigrationData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setError('')
      const result = await migrationApi.createBackup()
      setSuccessMessage(`Backup created successfully at: ${result.backupPath}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup creation failed')
    }
  }

  const handleValidateMigration = async () => {
    try {
      setError('')
      const result = await migrationApi.validateMigration()
      setValidation(result)
      
      if (result.validationStatus === 'PASSED') {
        setSuccessMessage('Migration validation passed successfully!')
      } else if (result.validationStatus === 'WARNING') {
        setSuccessMessage('Migration validation completed with warnings.')
      } else {
        setError('Migration validation failed. Please review the details.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    }
  }

  const handleRollbackMigration = async () => {
    setShowRollbackDialog(false)
    setIsExecuting(true)
    setError('')
    setSuccessMessage('')
    
    try {
      const result = await migrationApi.rollbackMigration(rollbackReason)
      setMigrationLog(result.migrationLog)
      setSuccessMessage(`Rollback completed successfully! ${result.migratedCount} items restored.`)
      
      // Reload data
      await loadMigrationData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed')
    } finally {
      setIsExecuting(false)
      setRollbackReason('')
    }
  }

  const handleCleanupOldData = async () => {
    setShowCleanupDialog(false)
    
    try {
      setError('')
      await migrationApi.cleanupOldData()
      setSuccessMessage('Old data cleanup completed successfully!')
      
      // Reload data
      await loadMigrationData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed')
    }
  }

  const getStatusIcon = (migrationStatus: MigrationStatus) => {
    if (migrationStatus.isComplete) return '✅'
    if (migrationStatus.migrationNeeded) return '⚠️'
    return '✅'
  }

  const getValidationIcon = (validationStatus: string) => {
    switch (validationStatus) {
      case 'PASSED': return '✅'
      case 'WARNING': return '⚠️'
      case 'FAILED': return '❌'
      default: return '❓'
    }
  }

  if (isLoading) {
    return (
      <div className="migration-dashboard loading">
        <div className="loading-spinner">Loading migration dashboard...</div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="migration-dashboard error">
        <div className="error-message">Failed to load migration status</div>
        <button onClick={loadMigrationData} className="btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div className="migration-dashboard">
      <div className="dashboard-header">
        <h1>🔄 System Migration Dashboard</h1>
        <p>Manage the migration from Contextual Cores to the new Venture system</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>❌ {error}</span>
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="alert-close">×</button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Migration Status Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>{getStatusIcon(status)} Migration Status</h2>
          </div>
          <div className="card-content">
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Migration Complete:</span>
                <span className={`status-value ${status.isComplete ? 'success' : 'pending'}`}>
                  {status.isComplete ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-label">Contextual Cores:</span>
                <span className={`status-value ${status.hasContextualCores ? 'warning' : 'success'}`}>
                  {status.hasContextualCores ? 'Found' : 'None'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-label">Ventures:</span>
                <span className={`status-value ${status.hasVentures ? 'success' : 'pending'}`}>
                  {status.hasVentures ? 'Found' : 'None'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-label">Migration Needed:</span>
                <span className={`status-value ${status.migrationNeeded ? 'warning' : 'success'}`}>
                  {status.migrationNeeded ? 'Yes' : 'No'}
                </span>
              </div>
              
              {status.hasOrphanedConversations && (
                <div className="status-item">
                  <span className="status-label">Orphaned Conversations:</span>
                  <span className="status-value warning">Found</span>
                </div>
              )}
              
              {status.lastMigrationDate && (
                <div className="status-item">
                  <span className="status-label">Last Migration:</span>
                  <span className="status-value">
                    {new Date(status.lastMigrationDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Migration Actions Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>🔧 Migration Actions</h2>
          </div>
          <div className="card-content">
            <div className="action-buttons">
              {status.migrationNeeded && !isExecuting && (
                <button 
                  onClick={() => setShowExecuteDialog(true)}
                  className="btn-primary"
                  disabled={isExecuting}
                >
                  🚀 Execute Migration
                </button>
              )}
              
              <button 
                onClick={handleCreateBackup}
                className="btn-secondary"
                disabled={isExecuting}
              >
                💾 Create Backup
              </button>
              
              <button 
                onClick={handleValidateMigration}
                className="btn-secondary"
                disabled={isExecuting}
              >
                ✅ Validate Migration
              </button>
              
              {status.isComplete && (
                <>
                  <button 
                    onClick={() => setShowRollbackDialog(true)}
                    className="btn-destructive"
                    disabled={isExecuting}
                  >
                    ↩️ Emergency Rollback
                  </button>
                  
                  <button 
                    onClick={() => setShowCleanupDialog(true)}
                    className="btn-warning"
                    disabled={isExecuting}
                  >
                    🗑️ Cleanup Old Data
                  </button>
                </>
              )}
            </div>
            
            {isExecuting && (
              <div className="execution-status">
                <div className="loading-spinner">Migration in progress...</div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Results Card */}
        {validation && (
          <div className="dashboard-card">
            <div className="card-header">
              <h2>{getValidationIcon(validation.validationStatus)} Validation Results</h2>
            </div>
            <div className="card-content">
              <div className="validation-grid">
                <div className="validation-item">
                  <span className="validation-label">Status:</span>
                  <span className={`validation-value ${validation.validationStatus.toLowerCase()}`}>
                    {validation.validationStatus}
                  </span>
                </div>
                
                <div className="validation-item">
                  <span className="validation-label">Contextual Cores:</span>
                  <span className="validation-value">{validation.contextualCoresCount}</span>
                </div>
                
                <div className="validation-item">
                  <span className="validation-label">Ventures:</span>
                  <span className="validation-value">{validation.venturesCount}</span>
                </div>
                
                <div className="validation-item">
                  <span className="validation-label">Conversations with Ventures:</span>
                  <span className="validation-value">{validation.conversationsWithVentures}</span>
                </div>
                
                {validation.conversationsWithLegacy > 0 && (
                  <div className="validation-item">
                    <span className="validation-label">Legacy Conversations:</span>
                    <span className="validation-value warning">{validation.conversationsWithLegacy}</span>
                  </div>
                )}
                
                {validation.orphanedConversations > 0 && (
                  <div className="validation-item">
                    <span className="validation-label">Orphaned Conversations:</span>
                    <span className="validation-value error">{validation.orphanedConversations}</span>
                  </div>
                )}
              </div>
              
              {validation.validationDetails.length > 0 && (
                <div className="validation-details">
                  <h4>Details:</h4>
                  <ul>
                    {validation.validationDetails.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Migration Log */}
        {migrationLog.length > 0 && (
          <div className="dashboard-card log-card">
            <div className="card-header">
              <h2>📝 Migration Log</h2>
            </div>
            <div className="card-content">
              <div className="migration-log">
                {migrationLog.map((logEntry, index) => (
                  <div key={index} className="log-entry">
                    {logEntry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Migration History */}
        {history.length > 0 && (
          <div className="dashboard-card">
            <div className="card-header">
              <h2>📅 Migration History</h2>
            </div>
            <div className="card-content">
              <div className="history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="history-entry">
                    <div className="history-header">
                      <span className="history-type">{entry.migrationType}</span>
                      <span className={`history-status ${entry.status.toLowerCase()}`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="history-date">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showExecuteDialog}
        title="Execute Migration"
        message="This will migrate all contextual cores to the new venture system. A backup will be created automatically. This action cannot be undone without using the rollback feature. Are you sure you want to proceed?"
        onConfirm={handleExecuteMigration}
        onCancel={() => setShowExecuteDialog(false)}
        confirmText="Execute Migration"
      />

      <ConfirmDialog
        isOpen={showRollbackDialog}
        title="Emergency Rollback"
        message={
          <div>
            <p>This will rollback the migration and restore the original contextual cores. All venture data created during migration will be lost.</p>
            <div className="rollback-reason">
              <label htmlFor="rollbackReason">Reason for rollback:</label>
              <textarea
                id="rollbackReason"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="Explain why you need to rollback..."
                className="reason-input"
              />
            </div>
          </div>
        }
        onConfirm={handleRollbackMigration}
        onCancel={() => {
          setShowRollbackDialog(false)
          setRollbackReason('')
        }}
        confirmText="Rollback Migration"
        destructive={true}
      />

      <ConfirmDialog
        isOpen={showCleanupDialog}
        title="Cleanup Old Data"
        message="This will permanently delete old contextual core data. Make sure the migration was successful and you have backups before proceeding. This action cannot be undone."
        onConfirm={handleCleanupOldData}
        onCancel={() => setShowCleanupDialog(false)}
        confirmText="Delete Old Data"
        destructive={true}
      />
    </div>
  )
}