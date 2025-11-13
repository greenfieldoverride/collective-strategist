import { useState, useEffect } from 'react'
import { integrationsApi, IntegrationConfig, AvailableIntegration, IntegrationCredentials } from '../services/integrationsApi'
import { useTour } from '@greenfield/react-guided-tour'
import '@greenfield/react-guided-tour/styles'

interface IntegrationsPageProps {
  ventureId: string
}

export function IntegrationsPage({ ventureId }: IntegrationsPageProps) {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [availableIntegrations, setAvailableIntegrations] = useState<AvailableIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<AvailableIntegration | null>(null)
  
  const tour = useTour()

  const tourSteps = [
    {
      id: 'welcome',
      title: '💰 Financial Liberation Hub',
      content: 'Connect payment platforms to track income and reduce dependency on any single platform. Take control of your financial data.',
      target: '#integration-header'
    },
    {
      id: 'platform-selection',
      title: '🏦 Choose Your Platform',
      content: 'Select a payment platform to connect. Each platform offers different features for income tracking.',
      target: '#platform-cards'
    },
    {
      id: 'connect-form',
      title: '🔐 Secure API Setup',
      content: "We'll guide you through getting your API credentials. Your data stays encrypted and under your control.",
      target: '#connect-form'
    },
    {
      id: 'sync-data',
      title: '🔄 Sync Your Data',
      content: 'Once connected, sync your transaction data to get insights and track your income streams.',
      target: '#sync-buttons'
    }
  ]

  const startTour = () => {
    tour.start({
      id: 'payment-integration-tour',
      steps: tourSteps
    })
  }

  useEffect(() => {
    loadData()
  }, [ventureId])

  async function loadData() {
    try {
      setLoading(true)
      const [ventureIntegrations, available] = await Promise.all([
        integrationsApi.getVentureIntegrations(ventureId),
        integrationsApi.getAvailableIntegrations()
      ])
      setIntegrations(ventureIntegrations)
      setAvailableIntegrations(available)
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync(platform: string) {
    try {
      setSyncing(prev => ({ ...prev, [platform]: true }))
      await integrationsApi.syncIntegration(ventureId, platform)
      await loadData()
    } catch (error) {
      console.error(`Failed to sync ${platform}:`, error)
      alert(`Failed to sync ${platform}: ${error}`)
    } finally {
      setSyncing(prev => ({ ...prev, [platform]: false }))
    }
  }

  async function handleSyncAll() {
    try {
      setSyncing(prev => ({ ...prev, all: true }))
      const result = await integrationsApi.syncAllIntegrations(ventureId)
      alert(`Synced ${result.totalTransactions} transactions from ${result.totalSynced} platforms`)
      await loadData()
    } catch (error) {
      console.error('Failed to sync all integrations:', error)
      alert(`Failed to sync integrations: ${error}`)
    } finally {
      setSyncing(prev => ({ ...prev, all: false }))
    }
  }

  async function handleDisconnect(platform: string) {
    if (!confirm(`Are you sure you want to disconnect ${integrationsApi.getPlatformInfo(platform).name}?`)) {
      return
    }

    try {
      await integrationsApi.disconnectIntegration(ventureId, platform)
      await loadData()
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error)
      alert(`Failed to disconnect ${platform}: ${error}`)
    }
  }

  function getAvailableToConnect() {
    const connectedPlatforms = integrations.map(i => i.platform)
    return availableIntegrations.filter(a => !connectedPlatforms.includes(a.platform))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div id="integration-header" className="text-center mb-12">
          <div className="relative">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Financial Liberation Hub
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Connect your payment platforms to automatically track income, reduce platform dependency, and maintain financial sovereignty
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button
                onClick={startTour}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                🎯 Start Integration Tour
              </button>
              {integrations.length > 0 && (
                <button
                  onClick={handleSyncAll}
                  disabled={syncing.all}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {syncing.all ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Syncing All...
                    </>
                  ) : (
                    <>🔄 Sync All Platforms</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Liberation Context Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="text-green-600 text-xl">🌱</div>
          <div>
            <h3 className="font-semibold text-green-800">Financial Liberation Tools</h3>
            <p className="text-green-700 text-sm mt-1">
              These integrations help you track income across platforms, understand platform dependency risks, 
              and maintain financial sovereignty for your liberation work.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Status Overview */}
      {integrations.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{integrations.length}</div>
            <div className="text-sm text-gray-600">Connected Platforms</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(i => i.syncEnabled).length}
            </div>
            <div className="text-sm text-gray-600">Active Syncing</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {integrations.filter(i => {
                const status = integrationsApi.formatSyncStatus(i.lastSyncAt)
                return status.color === 'text-green-600'
              }).length}
            </div>
            <div className="text-sm text-gray-600">Recently Synced</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {integrations.filter(i => i.webhooksEnabled).length}
            </div>
            <div className="text-sm text-gray-600">Real-time Updates</div>
          </div>
        </div>
      )}

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Platforms</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const platformInfo = integrationsApi.getPlatformInfo(integration.platform)
              const syncStatus = integrationsApi.formatSyncStatus(integration.lastSyncAt)
              
              return (
                <div key={integration.platform} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{platformInfo.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{platformInfo.name}</h3>
                        <p className="text-sm text-gray-600">{platformInfo.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${integration.syncEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-gray-500">
                        {integration.syncEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-500">Last sync: </span>
                      <span className={syncStatus.color}>{syncStatus.text}</span>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleSync(integration.platform)}
                        disabled={syncing[integration.platform]}
                        className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors font-medium"
                      >
                        {syncing[integration.platform] ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(integration.platform)}
                        className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {getAvailableToConnect().length === 0 ? 'All Platforms Connected' : 'Connect New Platforms'}
        </h2>
        {getAvailableToConnect().length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-gray-600 text-lg font-medium mb-2">Excellent work!</p>
            <p className="text-gray-500">
              You've connected all available payment platforms. Your financial liberation toolkit is complete!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {getAvailableToConnect().map((platform) => {
              const platformInfo = integrationsApi.getPlatformInfo(platform.platform)
              
              return (
                <div key={platform.platform} className="bg-white border-2 border-solid border-gray-200 rounded-xl p-8 hover:border-green-400 hover:bg-green-50 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl group-hover:scale-110 transition-transform">{platformInfo.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                      <p className="text-sm text-gray-600">{platform.authType}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4">{platform.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {platform.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedPlatform(platform)
                      setShowConnectModal(true)
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Connect {platform.name}
                  </button>
                  
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Liberation-friendly • Secure encryption • Read-only access
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {showConnectModal && selectedPlatform && (
        <ConnectModal
          platform={selectedPlatform}
          ventureId={ventureId}
          onClose={() => {
            setShowConnectModal(false)
            setSelectedPlatform(null)
          }}
          onSuccess={() => {
            setShowConnectModal(false)
            setSelectedPlatform(null)
            loadData()
          }}
        />
      )}
      </div>
    </div>
  )
}

interface ConnectModalProps {
  platform: AvailableIntegration
  ventureId: string
  onClose: () => void
  onSuccess: () => void
}

function ConnectModal({ platform, ventureId, onClose, onSuccess }: ConnectModalProps) {
  const [credentials, setCredentials] = useState<IntegrationCredentials>({
    environment: 'sandbox'
  })
  const [connecting, setConnecting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  async function handleConnect() {
    try {
      setConnecting(true)
      await integrationsApi.connectIntegration(ventureId, platform.platform, credentials)
      onSuccess()
    } catch (error) {
      console.error('Failed to connect integration:', error)
      alert(`Failed to connect: ${error}`)
    } finally {
      setConnecting(false)
    }
  }

  function getCredentialFields() {
    switch (platform.platform) {
      case 'stripe':
        return [
          { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_test_...', required: true }
        ]
      case 'paypal':
        return [
          { key: 'apiKey', label: 'Client ID', type: 'text', placeholder: 'Your PayPal Client ID', required: true },
          { key: 'secretKey', label: 'Client Secret', type: 'password', placeholder: 'Your PayPal Client Secret', required: true }
        ]
      case 'venmo':
        return [
          { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Your Venmo Access Token', required: true }
        ]
      case 'wise':
        return [
          { key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'Your Wise API Token', required: true }
        ]
      case 'square':
        return [
          { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Your Square Access Token', required: true }
        ]
      default:
        return []
    }
  }

  const credentialFields = getCredentialFields()
  const isFormValid = credentialFields.every(field => 
    field.required ? credentials[field.key] : true
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{integrationsApi.getPlatformInfo(platform.platform).icon}</div>
            <h2 className="text-xl font-semibold">Connect {platform.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Liberation Context */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700">
            🔒 Your credentials are encrypted and stored securely. We only request read-only access to transaction data.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
            <select
              value={credentials.environment}
              onChange={(e) => setCredentials(prev => ({ ...prev, environment: e.target.value as 'sandbox' | 'production' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="sandbox">Sandbox (Test) - Recommended for setup</option>
              <option value="production">Production (Live) - Use after testing</option>
            </select>
          </div>

          {credentialFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={credentials[field.key] || ''}
                onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required={field.required}
              />
            </div>
          ))}

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </button>
            
            {showAdvanced && (
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={credentials.webhooksEnabled || false}
                    onChange={(e) => setCredentials(prev => ({ ...prev, webhooksEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Enable real-time webhook updates</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting || !isFormValid}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? 'Connecting...' : 'Connect Securely'}
          </button>
        </div>
      </div>
    </div>
  )
}