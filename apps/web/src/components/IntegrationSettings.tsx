import { useState, useEffect } from 'react'

interface IntegrationDetails {
  id: string
  platform: string
  accountName: string
  connectedSince: string
  lastSync: string
  metricsCount: number
  dataStored: string[]
  permissions: string[]
  disconnectNote: string
}

interface IntegrationSettingsProps {
  integrationId: string
  ventureId: string
  onDisconnect: () => void
  onCancel: () => void
}

export default function IntegrationSettings({ 
  integrationId,
  ventureId,
  onDisconnect, 
  onCancel 
}: IntegrationSettingsProps) {
  const [details, setDetails] = useState<IntegrationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadIntegrationDetails()
  }, [integrationId])

  const loadIntegrationDetails = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8007/api/v1/impact/integrations/${integrationId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDetails(data.data)
        } else {
          throw new Error(data.error?.message || 'Failed to load integration details')
        }
      } else {
        throw new Error('Failed to connect to integration service')
      }
    } catch (error) {
      console.error('Failed to load integration details:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8007/api/v1/impact/integrations/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          integrationId,
          ventureId: ventureId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Show success message with liberation-focused details
          alert(`✅ Successfully disconnected from ${details?.platform}\n\n${data.data.details.dataRemoved}\n${data.data.details.tokenRevoked}\n${data.data.details.privacy}\n\n${data.data.details.reconnect}`)
          onDisconnect()
        } else {
          throw new Error(data.error?.message || 'Failed to disconnect')
        }
      } else {
        throw new Error('Failed to disconnect integration')
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
      setError(error instanceof Error ? error.message : 'Disconnect failed')
    } finally {
      setIsDisconnecting(false)
      setShowConfirmDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="integration-settings loading">
        <div className="loading-spinner">Loading integration details...</div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="integration-settings error">
        <div className="error-message">
          <span>⚠️ Failed to load integration details</span>
          {error && <p>{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="integration-settings">
      <div className="settings-header">
        <h3>Integration Settings</h3>
        <button onClick={onCancel} className="btn-secondary">Close</button>
      </div>

      <div className="integration-overview">
        <div className="integration-identity">
          <div className="platform-info">
            <span className="platform-icon">
              {details.platform === 'github' && '🐙'}
              {details.platform === 'patreon' && '🎨'}
              {details.platform === 'meetup' && '👥'}
            </span>
            <div>
              <h4>{details.platform.charAt(0).toUpperCase() + details.platform.slice(1)}</h4>
              <p>Connected as: <strong>{details.accountName}</strong></p>
            </div>
          </div>
          <div className="connection-details">
            <p><strong>Connected since:</strong> {new Date(details.connectedSince).toLocaleDateString()}</p>
            <p><strong>Last sync:</strong> {new Date(details.lastSync).toLocaleString()}</p>
            <p><strong>Metrics tracked:</strong> {details.metricsCount}</p>
          </div>
        </div>
      </div>

      <div className="data-transparency">
        <h4>📊 Data We Store</h4>
        <ul className="data-list">
          {details.dataStored.map((data, index) => (
            <li key={index}>{data}</li>
          ))}
        </ul>

        <h4>🔐 Platform Permissions</h4>
        <ul className="permissions-list">
          {details.permissions.map((permission, index) => (
            <li key={index}>{permission}</li>
          ))}
        </ul>
      </div>

      <div className="disconnect-section">
        <h4>🔌 Disconnect Platform</h4>
        <div className="disconnect-explanation">
          <p className="liberation-note">
            <strong>Your data sovereignty matters.</strong> We believe you should have complete control 
            over your connections without dark patterns or guilt trips.
          </p>
          <p>{details.disconnectNote}</p>
        </div>

        <button 
          onClick={() => setShowConfirmDialog(true)}
          className="btn-danger disconnect-btn"
        >
          Disconnect {details.platform.charAt(0).toUpperCase() + details.platform.slice(1)}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {/* Liberation-focused confirmation dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header">
              <h3>Confirm Disconnection</h3>
            </div>
            
            <div className="modal-content">
              <div className="honest-messaging">
                <p>
                  <strong>We're committed to honest disconnection.</strong> Here's exactly what will happen:
                </p>
                
                <div className="consequences-list">
                  <div className="consequence">
                    <span className="consequence-icon">🗑️</span>
                    <div>
                      <strong>Data Removal:</strong> All cached metrics and connection data will be permanently deleted
                    </div>
                  </div>
                  <div className="consequence">
                    <span className="consequence-icon">🔒</span>
                    <div>
                      <strong>Token Revocation:</strong> Your authorization token will be revoked with {details.platform}
                    </div>
                  </div>
                  <div className="consequence">
                    <span className="consequence-icon">🛡️</span>
                    <div>
                      <strong>Privacy:</strong> We do not retain any of your platform data after disconnection
                    </div>
                  </div>
                  <div className="consequence">
                    <span className="consequence-icon">🔄</span>
                    <div>
                      <strong>Reconnection:</strong> You can reconnect at any time without penalty or data loss
                    </div>
                  </div>
                </div>

                <div className="no-guilt-trip">
                  <p>
                    <em>No guilt trips, no retention tricks, no "are you sure you're sure?" - 
                    just honest, transparent disconnection that respects your sovereignty.</em>
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className="btn-secondary"
                disabled={isDisconnecting}
              >
                Keep Connected
              </button>
              <button 
                onClick={handleDisconnect}
                className="btn-danger"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}