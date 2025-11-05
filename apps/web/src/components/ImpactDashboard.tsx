import { useState, useEffect } from 'react'
import IntegrationSettings from './IntegrationSettings'

interface ImpactMetric {
  id: string
  name: string
  value: number | string
  displayValue: string
  trend?: 'up' | 'down' | 'stable'
  changePercent?: number
  context: string
  icon?: string
}

interface ImpactWidget {
  id: string
  integrationId: string
  platform: string
  title: string
  metrics: ImpactMetric[]
  lastSync: Date
  isConnected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'syncing'
}

interface ImpactModule {
  id: 'community' | 'knowledge' | 'cultural' | 'movement' | 'sovereignty'
  name: string
  icon: string
  description: string
  widgets: ImpactWidget[]
}

interface AvailableIntegration {
  platform: string
  name: string
  description: string
  modules: string[]
  icon: string
  isAvailable: boolean
}

interface ImpactDashboardProps {
  ventureId: string
}

export default function ImpactDashboard({ ventureId }: ImpactDashboardProps) {
  const [modules, setModules] = useState<ImpactModule[]>([])
  const [availableIntegrations, setAvailableIntegrations] = useState<AvailableIntegration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('community')
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showIntegrationSettings, setShowIntegrationSettings] = useState(false)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('')

  useEffect(() => {
    loadDashboardData()
    loadAvailableIntegrations()
  }, [ventureId])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8007/api/v1/impact/${ventureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setModules(data.data.modules)
        } else {
          throw new Error(data.error?.message || 'Failed to load impact data')
        }
      } else {
        throw new Error('Failed to connect to impact dashboard API')
      }
    } catch (error) {
      console.error('Failed to load impact dashboard:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      
      // Set default modules for development
      setModules([
        {
          id: 'community',
          name: 'Community Resilience',
          icon: '🌿',
          description: 'Building strong, interdependent communities that support each other',
          widgets: []
        },
        {
          id: 'knowledge',
          name: 'Knowledge Liberation',
          icon: '🧠',
          description: 'Sharing knowledge freely and building collective intelligence',
          widgets: []
        },
        {
          id: 'cultural',
          name: 'Cultural Impact',
          icon: '🎨',
          description: 'Creating and preserving culture that reflects our values',
          widgets: []
        },
        {
          id: 'movement',
          name: 'Movement Growth',
          icon: '🚀',
          description: 'Growing the liberation movement and inspiring others',
          widgets: []
        },
        {
          id: 'sovereignty',
          name: 'Personal Sovereignty',
          icon: '✊',
          description: 'Achieving independence from oppressive systems',
          widgets: []
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableIntegrations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8007/api/v1/impact/integrations/available', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableIntegrations(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load available integrations:', error)
      // Set default integrations for development
      setAvailableIntegrations([
        {
          platform: 'github',
          name: 'GitHub',
          description: 'Track open source project impact and community growth',
          modules: ['knowledge'],
          icon: '🐙',
          isAvailable: true
        },
        {
          platform: 'patreon',
          name: 'Patreon',
          description: 'Track creator support and community funding',
          modules: ['cultural', 'community'],
          icon: '🎨',
          isAvailable: true
        },
        {
          platform: 'meetup',
          name: 'Meetup',
          description: 'Track real-world community building and event impact',
          modules: ['movement', 'community'],
          icon: '👥',
          isAvailable: true
        }
      ])
    }
  }

  const connectIntegration = async (platform: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8007/api/v1/impact/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform,
          ventureId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Redirect to OAuth URL
          window.location.href = data.data.authUrl
        } else {
          throw new Error(data.error?.message || 'Failed to start connection')
        }
      } else {
        throw new Error('Failed to connect to integration service')
      }
    } catch (error) {
      console.error('Failed to connect integration:', error)
      setError(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const getModuleConnectedIntegrations = (moduleId: string) => {
    return availableIntegrations.filter(integration => 
      integration.modules.includes(moduleId) && integration.isAvailable
    )
  }

  const getModuleMetricsCount = (module: ImpactModule) => {
    return module.widgets.reduce((total, widget) => total + widget.metrics.length, 0)
  }

  const openIntegrationSettings = (integrationId: string) => {
    setSelectedIntegrationId(integrationId)
    setShowIntegrationSettings(true)
  }

  const closeIntegrationSettings = () => {
    setShowIntegrationSettings(false)
    setSelectedIntegrationId('')
  }

  const handleIntegrationDisconnected = () => {
    // Reload dashboard data after disconnection
    loadDashboardData()
    closeIntegrationSettings()
  }

  const selectedModuleData = modules.find(m => m.id === selectedModule)

  if (isLoading) {
    return (
      <div className="impact-dashboard loading">
        <div className="loading-spinner">Loading impact dashboard...</div>
      </div>
    )
  }

  return (
    <div className="impact-dashboard">
      <div className="dashboard-header">
        <h2 className="page-title">Impact Dashboard</h2>
        <p className="page-subtitle">
          Measure what truly matters for liberation and community building
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {/* Module Navigation */}
      <div className="module-nav">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => setSelectedModule(module.id)}
            className={`module-nav-item ${selectedModule === module.id ? 'active' : ''}`}
            data-testid="module-nav-item"
          >
            <span className="module-icon">{module.icon}</span>
            <div className="module-info">
              <span className="module-name">{module.name}</span>
              <span className="module-metrics">{getModuleMetricsCount(module)} metrics</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Module Content */}
      {selectedModuleData && (
        <div className="module-content">
          <div className="module-header">
            <div className="module-title">
              <span className="module-icon-large">{selectedModuleData.icon}</span>
              <div>
                <h3>{selectedModuleData.name}</h3>
                <p>{selectedModuleData.description}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowConnectModal(true)}
              className="btn-primary"
            >
              Connect Platform
            </button>
          </div>

          {/* Widgets */}
          <div className="widgets-grid">
            {selectedModuleData.widgets.length > 0 ? (
              selectedModuleData.widgets.map((widget) => (
                <div key={widget.id} className="impact-widget">
                  <div className="widget-header">
                    <h4>{widget.title}</h4>
                    <div className="widget-controls">
                      <div className={`connection-status ${widget.connectionStatus}`}>
                        {widget.connectionStatus === 'connected' && '🟢'}
                        {widget.connectionStatus === 'disconnected' && '🔴'}
                        {widget.connectionStatus === 'error' && '🟠'}
                        {widget.connectionStatus === 'syncing' && '🟡'}
                      </div>
                      <button
                        onClick={() => openIntegrationSettings(widget.integrationId)}
                        className="widget-settings-btn"
                        data-testid="widget-settings-btn"
                        title="Integration settings"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                  
                  <div className="widget-metrics">
                    {widget.metrics.map((metric) => (
                      <div key={metric.id} className="metric">
                        <div className="metric-header">
                          <span className="metric-icon">{metric.icon}</span>
                          <span className="metric-name">{metric.name}</span>
                        </div>
                        <div className="metric-value">{metric.displayValue}</div>
                        <div className="metric-context">{metric.context}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="widget-footer">
                    <span className="last-sync">
                      Last sync: {widget.lastSync.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-widgets">
                <div className="no-widgets-content">
                  <span className="no-widgets-icon">📊</span>
                  <h4>No Connected Platforms</h4>
                  <p>Connect platforms to start tracking your {selectedModuleData.name.toLowerCase()} impact.</p>
                  
                  <div className="suggested-integrations">
                    <h5>Suggested for this module:</h5>
                    <div className="integration-suggestions">
                      {getModuleConnectedIntegrations(selectedModuleData.id).map((integration) => (
                        <button
                          key={integration.platform}
                          onClick={() => connectIntegration(integration.platform)}
                          className="integration-suggestion"
                        >
                          <span className="integration-icon">{integration.icon}</span>
                          <div>
                            <span className="integration-name">{integration.name}</span>
                            <p className="integration-description">{integration.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect Platform Modal */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal connect-modal">
            <div className="modal-header">
              <h3>Connect a Platform</h3>
              <button 
                onClick={() => setShowConnectModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <p>Choose a platform to connect and start tracking your impact:</p>
              
              <div className="available-integrations">
                {availableIntegrations
                  .filter(integration => integration.isAvailable)
                  .map((integration) => (
                    <button
                      key={integration.platform}
                      onClick={() => {
                        connectIntegration(integration.platform)
                        setShowConnectModal(false)
                      }}
                      className="integration-option"
                    >
                      <span className="integration-icon">{integration.icon}</span>
                      <div className="integration-details">
                        <span className="integration-name">{integration.name}</span>
                        <p className="integration-description">{integration.description}</p>
                        <div className="integration-modules">
                          Tracks: {integration.modules.map(moduleId => {
                            const module = modules.find(m => m.id === moduleId)
                            return module ? module.name : moduleId
                          }).join(', ')}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Settings Modal */}
      {showIntegrationSettings && selectedIntegrationId && (
        <div className="modal-overlay">
          <div className="modal settings-modal">
            <IntegrationSettings
              integrationId={selectedIntegrationId}
              ventureId={ventureId}
              onDisconnect={handleIntegrationDisconnected}
              onCancel={closeIntegrationSettings}
            />
          </div>
        </div>
      )}
    </div>
  )
}