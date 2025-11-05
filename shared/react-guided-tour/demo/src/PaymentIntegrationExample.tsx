import { useState, useEffect } from 'react'

// Real-world Payment Integration Demo
// This showcases how the tour library guides users through complex workflows

interface PaymentPlatform {
  id: string
  name: string
  icon: string
  description: string
  setupComplexity: 'easy' | 'medium' | 'complex'
  liberationBenefit: string
}

const platforms: PaymentPlatform[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    description: 'Global payment processing with robust APIs',
    setupComplexity: 'medium',
    liberationBenefit: 'Access to international markets, reduced platform dependency'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: '🅿️',
    description: 'Popular digital wallet and payment platform',
    setupComplexity: 'easy',
    liberationBenefit: 'Direct payments, bypass intermediary platforms'
  },
  {
    id: 'wise',
    name: 'Wise',
    icon: '🌍',
    description: 'International money transfers with low fees',
    setupComplexity: 'medium',
    liberationBenefit: 'Global financial freedom, multi-currency support'
  },
  {
    id: 'venmo',
    name: 'Venmo',
    icon: '💚',
    description: 'Social payments and peer-to-peer transfers',
    setupComplexity: 'easy',
    liberationBenefit: 'Community-based support, social fundraising'
  }
]

export function PaymentIntegrationExample() {
  // Load saved state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem('payment-integration-tour')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          currentStep: parsed.currentStep || 0,
          selectedPlatform: parsed.selectedPlatform || null,
          formData: parsed.formData || { apiKey: '', secretKey: '', webhookUrl: '' },
          completedSteps: new Set<number>(parsed.completedSteps || []),
          connectionTested: parsed.connectionTested || false
        }
      }
    } catch (error) {
      console.warn('Could not load saved tour state:', error)
    }
    return null
  }

  const savedState = loadSavedState()
  
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(savedState?.currentStep || 0)
  const [selectedPlatform, setSelectedPlatform] = useState<PaymentPlatform | null>(
    savedState?.selectedPlatform || null
  )
  const [formData, setFormData] = useState(
    savedState?.formData || { apiKey: '', secretKey: '', webhookUrl: '' }
  )
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    savedState?.completedSteps || new Set<number>()
  )
  const [connectionTested, setConnectionTested] = useState(savedState?.connectionTested || false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const steps = [
    {
      id: 'welcome',
      title: '💰 Financial Liberation Hub',
      content: 'Welcome to your journey toward financial independence! This tour will guide you through connecting payment platforms to diversify your income and reduce platform dependency.',
      target: '#integration-header',
      action: 'introduction',
      requiresAction: false
    },
    {
      id: 'platform-selection',
      title: '🏦 Choose Your Platform',
      content: 'Click on a payment platform below to select it. Each platform offers different benefits for your liberation strategy.',
      target: '#platform-cards',
      action: 'select-platform',
      requiresAction: true,
      actionTarget: '.platform-card',
      validation: () => selectedPlatform !== null,
      actionText: 'Select a platform to continue'
    },
    {
      id: 'liberation-context',
      title: '🌱 Why This Matters',
      content: 'By connecting multiple payment platforms, you\'re building financial resilience. No single platform can control your entire income stream.',
      target: '#liberation-banner',
      action: 'education',
      requiresAction: false
    },
    {
      id: 'api-key-input',
      title: '🔐 Enter Your API Key',
      content: 'Type your API key in the field below. This allows secure communication with your chosen platform.',
      target: '#api-key-input',
      action: 'enter-api-key',
      requiresAction: true,
      actionTarget: '#api-key-input',
      validation: () => formData.apiKey.length > 5,
      actionText: 'Enter your API key to continue'
    },
    {
      id: 'secret-key-input',
      title: '🔑 Enter Your Secret Key',
      content: 'Now enter your secret key. This provides additional security for your integration.',
      target: '#secret-key-input',
      action: 'enter-secret-key',
      requiresAction: true,
      actionTarget: '#secret-key-input',
      validation: () => formData.secretKey.length > 5,
      actionText: 'Enter your secret key to continue'
    },
    {
      id: 'test-connection',
      title: '🧪 Test Your Integration',
      content: 'Click the "Test Connection" button to verify your credentials work properly.',
      target: '#test-connection-btn',
      action: 'test-integration',
      requiresAction: true,
      actionTarget: '#test-connection-btn',
      validation: () => connectionTested,
      actionText: 'Click "Test Connection" to continue'
    },
    {
      id: 'completion',
      title: '🎉 Liberation Step Complete!',
      content: 'Congratulations! You\'ve successfully connected a payment platform. Your financial independence toolkit is growing stronger.',
      target: '#completion-section',
      action: 'celebrate',
      requiresAction: false
    }
  ]

  const currentStepData = steps[currentStep]

  // Save state to localStorage
  const saveState = () => {
    try {
      const stateToSave = {
        currentStep,
        selectedPlatform,
        formData,
        completedSteps: Array.from(completedSteps),
        connectionTested
      }
      localStorage.setItem('payment-integration-tour', JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Could not save tour state:', error)
    }
  }

  // Save state whenever it changes
  useEffect(() => {
    if (isActive) {
      saveState()
    }
  }, [currentStep, selectedPlatform, formData, completedSteps, connectionTested, isActive])

  const startTour = () => {
    setIsActive(true)
    // If we have saved progress, resume from there
    if (savedState && savedState.currentStep > 0) {
      setCurrentStep(savedState.currentStep)
    } else {
      setCurrentStep(0)
      setCompletedSteps(new Set())
    }
  }

  const resumeTour = () => {
    setIsActive(true)
    // Resume from saved position
  }

  const restartTour = () => {
    setIsActive(true)
    setCurrentStep(0)
    setCompletedSteps(new Set())
    // Clear saved state
    localStorage.removeItem('payment-integration-tour')
  }

  const hasProgress = savedState && savedState.currentStep > 0 && !completedSteps.has(steps.length - 1)

  const nextStep = () => {
    const step = currentStepData
    
    // Check if step requires action and validate it
    if (step.requiresAction && step.validation && !step.validation()) {
      // Don't advance if required action isn't completed
      return
    }
    
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const canProceed = () => {
    const step = currentStepData
    if (!step.requiresAction) return true
    return step.validation ? step.validation() : true
  }

  const handleTestConnection = () => {
    // Simulate API test
    setTimeout(() => {
      setConnectionTested(true)
      setTestResult('success')
      // Auto-advance after successful test
      setTimeout(() => {
        if (currentStepData.id === 'test-connection') {
          nextStep()
        }
      }, 1000)
    }, 1500)
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    setIsActive(false)
    setCurrentStep(0)
    // Celebrate completion
    setTimeout(() => {
      alert('🎉 You\'ve completed the payment integration tour! Your liberation journey continues...')
    }, 500)
  }

  const skipTour = () => {
    setIsActive(false)
    // Save current progress when pausing
    saveState()
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          previousStep()
          break
        case 'Escape':
          e.preventDefault()
          skipTour()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStep])

  // Auto-scroll to target
  useEffect(() => {
    if (isActive && currentStepData.target) {
      const target = document.querySelector(currentStepData.target)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [isActive, currentStep])

  return (
    <>
      {/* Add pulse animation for resume button */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header id="integration-header" style={{ 
        textAlign: 'center', 
        padding: '40px 20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        borderRadius: '10px',
        marginBottom: '30px'
      }}>
        <h1>💰 Payment Integration Hub</h1>
        <p>Connect payment platforms • Build financial resilience • Secure your liberation</p>
        <div style={{ marginTop: '15px' }}>
          {!isActive && hasProgress ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={resumeTour}
                style={{
                  padding: '15px 30px',
                  background: 'rgba(40, 167, 69, 0.9)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📍 Resume Tour (Step {savedState?.currentStep + 1})
              </button>
              <button 
                onClick={restartTour}
                style={{
                  padding: '15px 30px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🔄 Start Over
              </button>
            </div>
          ) : (
            <button 
              onClick={startTour}
              style={{
                padding: '15px 30px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isActive ? '🔄 Tour In Progress...' : '🎯 Start Integration Tour'}
            </button>
          )}
        </div>
        
        {(isActive || hasProgress) && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px 15px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {isActive ? (
              <>
                📍 Step {currentStep + 1} of {steps.length}: {currentStepData.title}<br/>
                Use ← → keys to navigate • Escape to exit
              </>
            ) : (
              <>
                💾 Saved Progress: {completedSteps.size} of {steps.length} steps completed<br/>
                {selectedPlatform && `Selected platform: ${selectedPlatform.name}`}
                {formData.apiKey && ` • API key entered`}
                {connectionTested && ` • Connection tested`}
              </>
            )}
          </div>
        )}
      </header>

      {/* Liberation Context Banner */}
      <div id="liberation-banner" style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '24px' }}>🌱</div>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>Financial Liberation Strategy</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              Diversify your income streams • Reduce platform dependency • Build financial sovereignty
            </p>
          </div>
        </div>
      </div>

      {/* Platform Selection */}
      <section id="platform-cards" style={{ marginBottom: '30px' }}>
        <h2>🏦 Available Payment Platforms</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px',
          marginTop: '20px'
        }}>
          {platforms.map(platform => (
            <div
              key={platform.id}
              className="platform-card"
              onClick={() => {
                setSelectedPlatform(platform)
                // Auto-advance when platform is selected during tour
                if (currentStepData.id === 'platform-selection') {
                  setTimeout(() => nextStep(), 1000)
                }
              }}
              style={{
                padding: '20px',
                border: selectedPlatform?.id === platform.id ? '3px solid #007bff' : 
                        currentStepData.id === 'platform-selection' ? '2px solid #007bff' : '2px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedPlatform?.id === platform.id ? '#f8f9ff' : 'white',
                transition: 'all 0.2s ease',
                boxShadow: currentStepData.id === 'platform-selection' ? 
                          '0 0 0 3px rgba(0,123,255,0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{platform.icon}</span>
                <h3 style={{ margin: 0 }}>{platform.name}</h3>
                <span style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  borderRadius: '12px',
                  background: platform.setupComplexity === 'easy' ? '#10b981' : 
                             platform.setupComplexity === 'medium' ? '#f59e0b' : '#ef4444',
                  color: 'white'
                }}>
                  {platform.setupComplexity}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 10px 0' }}>
                {platform.description}
              </p>
              <div style={{ 
                fontSize: '13px', 
                color: '#10b981', 
                fontWeight: 'bold',
                background: '#ecfdf5',
                padding: '8px',
                borderRadius: '4px'
              }}>
                🌱 {platform.liberationBenefit}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API Configuration Form */}
      {selectedPlatform && (
        <section id="connect-form" style={{
          background: '#f8f9fa',
          padding: '25px',
          borderRadius: '8px',
          border: '2px solid #e9ecef',
          marginBottom: '30px'
        }}>
          <h2>🔐 Configure {selectedPlatform.name} Integration</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Enter your {selectedPlatform.name} API credentials. All data is encrypted and stored securely.
          </p>
          
          <div style={{ display: 'grid', gap: '15px', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                API Key {formData.apiKey.length > 5 && <span style={{ color: '#28a745' }}>✓</span>}
              </label>
              <input
                id="api-key-input"
                type="password"
                value={formData.apiKey}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, apiKey: e.target.value }))
                  // Auto-advance when valid input is entered during tour
                  if (currentStepData.id === 'api-key-input' && e.target.value.length > 5) {
                    setTimeout(() => nextStep(), 800)
                  }
                }}
                placeholder="sk_live_..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `2px solid ${
                    currentStepData.id === 'api-key-input' ? '#007bff' : 
                    formData.apiKey.length > 5 ? '#28a745' : '#ddd'
                  }`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                  boxShadow: currentStepData.id === 'api-key-input' ? '0 0 0 3px rgba(0,123,255,0.25)' : 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Secret Key {formData.secretKey.length > 5 && <span style={{ color: '#28a745' }}>✓</span>}
              </label>
              <input
                id="secret-key-input"
                type="password"
                value={formData.secretKey}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, secretKey: e.target.value }))
                  // Auto-advance when valid input is entered during tour
                  if (currentStepData.id === 'secret-key-input' && e.target.value.length > 5) {
                    setTimeout(() => nextStep(), 800)
                  }
                }}
                placeholder="whsec_..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `2px solid ${
                    currentStepData.id === 'secret-key-input' ? '#007bff' : 
                    formData.secretKey.length > 5 ? '#28a745' : '#ddd'
                  }`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                  boxShadow: currentStepData.id === 'secret-key-input' ? '0 0 0 3px rgba(0,123,255,0.25)' : 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder="https://your-domain.com/webhooks/stripe"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Test Section */}
      <section id="test-section" style={{
        background: '#fff3cd',
        border: '2px solid #ffc107',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2>🧪 Test Your Integration</h2>
        <p>Verify your connection is working properly:</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            id="test-connection-btn"
            onClick={handleTestConnection}
            disabled={connectionTested}
            style={{
              padding: '10px 20px',
              background: connectionTested ? '#28a745' : 
                         currentStepData.id === 'test-connection' ? '#007bff' : '#6c757d',
              color: 'white',
              border: currentStepData.id === 'test-connection' ? '2px solid #0056b3' : 'none',
              borderRadius: '4px',
              cursor: connectionTested ? 'default' : 'pointer',
              opacity: connectionTested ? 0.8 : 1,
              boxShadow: currentStepData.id === 'test-connection' ? 
                        '0 0 0 3px rgba(0,123,255,0.25)' : 'none'
            }}
          >
            {connectionTested ? '✅ Connection Tested' : 'Test Connection'}
          </button>
          
          {testResult === 'success' && (
            <div style={{
              padding: '10px 15px',
              background: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
              border: '1px solid #c3e6cb',
              fontSize: '14px'
            }}>
              ✅ Connection successful! All credentials are valid.
            </div>
          )}
        </div>
      </section>

      {/* Completion Section */}
      <section id="completion-section" style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2>🎉 Integration Complete!</h2>
        <p>You've successfully set up payment platform integration. Your financial liberation toolkit is growing stronger!</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
          <button onClick={startTour} style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            🔄 Replay Tour
          </button>
          <button style={{
            padding: '12px 24px',
            background: 'white',
            color: '#10b981',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            🚀 Connect Another Platform
          </button>
        </div>
      </section>

      {/* Floating Resume Button */}
      {!isActive && hasProgress && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Progress indicator */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 12px',
            borderRadius: '15px',
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            📊 Progress: {completedSteps.size}/{steps.length} steps
            {selectedPlatform && <div>✓ {selectedPlatform.name}</div>}
            {formData.apiKey && <div>✓ API configured</div>}
            {connectionTested && <div>✓ Connection tested</div>}
          </div>
          
          <button 
            onClick={resumeTour}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #28a745, #20c997)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
              transition: 'all 0.2s ease',
              minWidth: '180px',
              animation: 'pulse 2s infinite'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)'
            }}
          >
            📍 Resume Tour
            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
              Step {savedState?.currentStep + 1} of {steps.length}
            </div>
          </button>
          
          <button 
            onClick={restartTour}
            style={{
              padding: '8px 16px',
              background: 'rgba(108, 117, 125, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(108, 117, 125, 1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(108, 117, 125, 0.9)'
            }}
          >
            🔄 Start Over
          </button>
        </div>
      )}

      {/* Tour Overlay */}
      {isActive && (
        <>
          {/* Dark overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 9999,
            pointerEvents: 'auto'
          }} onClick={skipTour} />
          
          {/* Tour tooltip */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 10000,
            maxWidth: '450px',
            minWidth: '350px'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>
                  {currentStepData.title}
                </h3>
                <button 
                  onClick={skipTour}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: '#999'
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#e5e5e5',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            
            <p style={{ margin: '0 0 15px 0', color: '#666', lineHeight: '1.5' }}>
              {currentStepData.content}
            </p>
            
            {currentStepData.requiresAction && !canProceed() && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                padding: '8px 12px',
                margin: '0 0 15px 0',
                fontSize: '13px',
                color: '#856404'
              }}>
                💡 {currentStepData.actionText}
              </div>
            )}
            
            {currentStepData.requiresAction && canProceed() && (
              <div style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                padding: '8px 12px',
                margin: '0 0 15px 0',
                fontSize: '13px',
                color: '#155724'
              }}>
                ✅ Great! You can now continue to the next step.
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {currentStep + 1} of {steps.length}
              </span>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {currentStep > 0 && (
                  <button 
                    onClick={previousStep}
                    style={{
                      padding: '8px 16px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Previous
                  </button>
                )}
                
                <button 
                  onClick={nextStep}
                  disabled={currentStepData.requiresAction && !canProceed()}
                  style={{
                    padding: '8px 16px',
                    background: (currentStepData.requiresAction && !canProceed()) ? '#6c757d' :
                               currentStep === steps.length - 1 ? '#28a745' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (currentStepData.requiresAction && !canProceed()) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: (currentStepData.requiresAction && !canProceed()) ? 0.6 : 1
                  }}
                >
                  {currentStep === steps.length - 1 ? '🎉 Complete' : 
                   currentStepData.requiresAction && !canProceed() ? 'Complete Action First' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  )
}