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
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPlatform, setSelectedPlatform] = useState<PaymentPlatform | null>(null)
  const [formData, setFormData] = useState({
    apiKey: '',
    secretKey: '',
    webhookUrl: ''
  })
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const steps = [
    {
      id: 'welcome',
      title: '💰 Financial Liberation Hub',
      content: 'Welcome to your journey toward financial independence! This tour will guide you through connecting payment platforms to diversify your income and reduce platform dependency.',
      target: '#integration-header',
      action: 'introduction'
    },
    {
      id: 'platform-selection',
      title: '🏦 Choose Your Platform',
      content: 'Select a payment platform to integrate. Each platform offers different benefits for your liberation strategy. Consider starting with the easiest setup.',
      target: '#platform-cards',
      action: 'select-platform'
    },
    {
      id: 'liberation-context',
      title: '🌱 Why This Matters',
      content: 'By connecting multiple payment platforms, you\'re building financial resilience. No single platform can control your entire income stream.',
      target: '#liberation-banner',
      action: 'education'
    },
    {
      id: 'api-setup',
      title: '🔐 Secure API Configuration',
      content: 'Now we\'ll set up your API credentials. These keys allow secure communication while keeping your data under your control.',
      target: '#connect-form',
      action: 'configure-api'
    },
    {
      id: 'test-connection',
      title: '🧪 Test Your Integration',
      content: 'Let\'s verify your connection works. This ensures your platform integration is ready for real transactions.',
      target: '#test-section',
      action: 'test-integration'
    },
    {
      id: 'completion',
      title: '🎉 Liberation Step Complete!',
      content: 'Congratulations! You\'ve successfully connected a payment platform. Your financial independence toolkit is growing stronger.',
      target: '#completion-section',
      action: 'celebrate'
    }
  ]

  const currentStepData = steps[currentStep]

  const startTour = () => {
    setIsActive(true)
    setCurrentStep(0)
    setCompletedSteps(new Set())
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
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
    setCurrentStep(0)
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
            fontWeight: 'bold',
            marginTop: '15px'
          }}
        >
          {isActive ? '🔄 Tour In Progress...' : '🎯 Start Integration Tour'}
        </button>
        
        {isActive && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px 15px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            📍 Step {currentStep + 1} of {steps.length}: {currentStepData.title}<br/>
            Use ← → keys to navigate • Escape to exit
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
              onClick={() => setSelectedPlatform(platform)}
              style={{
                padding: '20px',
                border: selectedPlatform?.id === platform.id ? '3px solid #007bff' : '2px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedPlatform?.id === platform.id ? '#f8f9ff' : 'white',
                transition: 'all 0.2s ease'
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
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk_live_..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Secret Key
              </label>
              <input
                type="password"
                value={formData.secretKey}
                onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                placeholder="whsec_..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
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
          <button style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Test Connection
          </button>
          <button style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Validate API Keys
          </button>
          <button style={{
            padding: '10px 20px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Test Webhook
          </button>
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
            
            <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.5' }}>
              {currentStepData.content}
            </p>
            
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
                  style={{
                    padding: '8px 16px',
                    background: currentStep === steps.length - 1 ? '#28a745' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {currentStep === steps.length - 1 ? '🎉 Complete' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}