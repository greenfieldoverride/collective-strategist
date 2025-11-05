import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Venture } from '../types/venture'
import VentureSelector from '../components/VentureSelector'
import CreateVentureModal from '../components/CreateVentureModal'
import TeamManagement from '../components/TeamManagement'
import AIConsultantWithVentures from '../components/AIConsultantWithVentures'
import { financialApi, QuickFinancialStats } from '../services/financialApi'

export default function DashboardWithVentures() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVenture, setSelectedVenture] = useState<Venture | null>(null)
  const [showCreateVenture, setShowCreateVenture] = useState(false)
  const [financialStats, setFinancialStats] = useState<QuickFinancialStats | null>(null)
  const [loadingFinancials, setLoadingFinancials] = useState(false)

  // Set active tab based on URL
  useEffect(() => {
    if (location.pathname === '/ai-consultant') {
      setActiveTab('ai-consultant')
    } else if (location.pathname === '/dashboard') {
      setActiveTab('overview')
    }
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleVentureCreated = (venture: Venture) => {
    setSelectedVenture(venture)
    setShowCreateVenture(false)
  }

  const handleVentureUpdated = (venture: Venture) => {
    setSelectedVenture(venture)
  }

  const navItems = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'ai-consultant', name: 'AI Consultant', icon: '🤖' },
    { id: 'team', name: 'Team', icon: '👥' },
    { id: 'content', name: 'Content Studio', icon: '✍️' },
    { id: 'social', name: 'Social Media', icon: '📱' }
  ]

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="top-nav-content">
          <h1 className="brand-title">The Collective Strategist</h1>
          
          {/* Venture Selector */}
          <div className="venture-selector-nav">
            <VentureSelector
              selectedVenture={selectedVenture}
              onVentureChange={setSelectedVenture}
              onCreateNew={() => setShowCreateVenture(true)}
            />
          </div>
          
          <div className="nav-user">
            <span className="nav-welcome">Welcome back! 👋</span>
            <button onClick={handleLogout} className="btn btn-danger">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  if (item.id === 'ai-consultant') {
                    navigate('/ai-consultant', { replace: true })
                  } else {
                    navigate('/dashboard', { replace: true })
                  }
                }}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {activeTab === 'overview' && (
            <div>
              <div className="page-header">
                <h2 className="page-title">
                  {selectedVenture ? `${selectedVenture.name} Overview` : 'Dashboard Overview'}
                </h2>
                <p className="page-subtitle">
                  {selectedVenture 
                    ? `${selectedVenture.ventureType === 'sovereign_circle' ? 'Sovereign circle' : 'Venture'} management and insights`
                    : 'Select or create a venture to get started'
                  }
                </p>
              </div>

              {selectedVenture ? (
                <>
                  {/* Venture Info Card */}
                  <div className="venture-info-card">
                    <div className="venture-header">
                      <div className="venture-title">
                        <span className="venture-icon">
                          {selectedVenture.ventureType === 'sovereign_circle' ? '🤝' : 
                           selectedVenture.ventureType === 'cooperative' ? '🔗' :
                           selectedVenture.ventureType === 'professional' ? '💼' : '👤'}
                        </span>
                        <div>
                          <h3>{selectedVenture.name}</h3>
                          <p>{selectedVenture.description}</p>
                        </div>
                      </div>
                      <div className="venture-badges">
                        {selectedVenture.billingTier === 'liberation' ? (
                          <span className="tier-badge liberation">Liberation</span>
                        ) : (
                          <span className="tier-badge professional">Professional</span>
                        )}
                        {selectedVenture.isGreenfieldAffiliate && (
                          <span className="affiliate-badge">Greenfield Override</span>
                        )}
                      </div>
                    </div>

                    {selectedVenture.coreValues && selectedVenture.coreValues.length > 0 && (
                      <div className="venture-values">
                        <h4>Core Values</h4>
                        <div className="values-list">
                          {selectedVenture.coreValues.map((value, index) => (
                            <span key={index} className="value-tag">{value}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedVenture.primaryGoals && selectedVenture.primaryGoals.length > 0 && (
                      <div className="venture-goals">
                        <h4>Primary Goals</h4>
                        <div className="goals-list">
                          {selectedVenture.primaryGoals.map((goal, index) => (
                            <span key={index} className="goal-tag">{goal}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats Cards */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon blue">
                          <span className="stat-emoji">🤖</span>
                        </div>
                        <div className="stat-details">
                          <h3>AI Consultations</h3>
                          <p>24</p>
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon green">
                          <span className="stat-emoji">👥</span>
                        </div>
                        <div className="stat-details">
                          <h3>Team Members</h3>
                          <p>{selectedVenture.members?.length || 1} / {selectedVenture.maxMembers}</p>
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon purple">
                          <span className="stat-emoji">✍️</span>
                        </div>
                        <div className="stat-details">
                          <h3>Content Generated</h3>
                          <p>156</p>
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon orange">
                          <span className="stat-emoji">📈</span>
                        </div>
                        <div className="stat-details">
                          <h3>Active Projects</h3>
                          <p>12</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Cards */}
                  <div className="feature-grid">
                    <div className="feature-card">
                      <h3 className="feature-title">🤖 AI Consultant</h3>
                      <p className="feature-description">
                        Get strategic advice tailored to your {selectedVenture.ventureType === 'sovereign_circle' ? 'circle' : 'venture'} and goals.
                      </p>
                      <button 
                        onClick={() => setActiveTab('ai-consultant')}
                        className="btn-feature btn-blue"
                      >
                        Start Consultation
                      </button>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">👥 Team Management</h3>
                      <p className="feature-description">
                        Manage your team members, invite collaborators, and coordinate your collective work.
                      </p>
                      <button 
                        onClick={() => setActiveTab('team')}
                        className="btn-feature btn-green"
                      >
                        Manage Team
                      </button>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">✍️ Content Studio</h3>
                      <p className="feature-description">
                        Generate content that reflects your venture's voice and values.
                      </p>
                      <button 
                        onClick={() => setActiveTab('content')}
                        className="btn-feature btn-purple"
                      >
                        Create Content
                      </button>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">📱 Social Media Hub</h3>
                      <p className="feature-description">
                        Share your message and connect with your community across platforms.
                      </p>
                      <button 
                        onClick={() => setActiveTab('social')}
                        className="btn-feature btn-orange"
                      >
                        Manage Social
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-venture-state">
                  <div className="no-venture-content">
                    <h3>🏢 Welcome to The Collective Strategist</h3>
                    <p>Create your first venture to get started with AI-powered strategic advice and team collaboration.</p>
                    <button 
                      onClick={() => setShowCreateVenture(true)}
                      className="btn-primary"
                    >
                      Create Your First Venture
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai-consultant' && selectedVenture && (
            <div>
              <div className="page-header">
                <h2 className="page-title">AI Consultant</h2>
                <p className="page-subtitle">Strategic advice for {selectedVenture.name}</p>
              </div>
              <AIConsultantWithVentures ventureId={selectedVenture.id} />
            </div>
          )}

          {activeTab === 'team' && selectedVenture && (
            <div>
              <div className="page-header">
                <h2 className="page-title">Team Management</h2>
                <p className="page-subtitle">Manage your {selectedVenture.ventureType === 'sovereign_circle' ? 'circle members' : 'team'}</p>
              </div>
              <TeamManagement 
                venture={selectedVenture} 
                onVentureUpdate={handleVentureUpdated}
              />
            </div>
          )}

          {(activeTab === 'content' || activeTab === 'social') && (
            <div className="coming-soon">
              <div className="coming-soon-icon">🚀</div>
              <h3 className="coming-soon-title">Feature Coming Soon</h3>
              <p className="coming-soon-text">This section will be integrated with your venture context</p>
            </div>
          )}

          {activeTab !== 'overview' && !selectedVenture && (
            <div className="no-venture-state">
              <div className="no-venture-content">
                <h3>🏢 No Venture Selected</h3>
                <p>Please select or create a venture to access this feature.</p>
                <button 
                  onClick={() => setShowCreateVenture(true)}
                  className="btn-primary"
                >
                  Create New Venture
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Venture Modal */}
      <CreateVentureModal
        isOpen={showCreateVenture}
        onClose={() => setShowCreateVenture(false)}
        onVentureCreated={handleVentureCreated}
      />
    </div>
  )
}
