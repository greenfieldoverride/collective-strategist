import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Venture } from '../types/venture'
import VentureSelector from '../components/VentureSelector'
import CreateVentureModal from '../components/CreateVentureModal'
import TeamManagement from '../components/TeamManagement'
import AIConsultantWithVentures from '../components/AIConsultantWithVentures'
import { IntegrationsPage } from '../components/IntegrationsPage'
import ImpactDashboard from '../components/ImpactDashboard'
import UserProfile from '../components/UserProfile'
import BillingManagement from '../components/BillingManagement'
import SubscriptionGate, { FeatureGate } from '../components/SubscriptionGate'
import ContentStudio from '../components/ContentStudio'
import SocialMediaHub from '../components/SocialMediaHub'
import CalendarHub from '../components/CalendarHub'
import { VentureProvider } from '../contexts/VentureContext'
import { financialApi, QuickFinancialStats } from '../services/financialApi'
import { 
  OverviewIcon, 
  ZapIcon, 
  AIConsultantIcon, 
  IntegrationsIcon, 
  TeamIcon, 
  BillingIcon, 
  ContentStudioIcon, 
  SocialMediaIcon,
  CalendarIcon,
  RevenueIcon,
  TrendingUpIcon,
  TargetIcon
} from '../components/Icons'

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
    } else if (location.pathname === '/integrations') {
      setActiveTab('integrations')
    } else if (location.pathname === '/impact') {
      setActiveTab('impact')
    } else if (location.pathname === '/billing') {
      setActiveTab('billing')
    } else if (location.pathname === '/content') {
      setActiveTab('content')
    } else if (location.pathname === '/social') {
      setActiveTab('social')
    } else if (location.pathname === '/calendar') {
      setActiveTab('calendar')
    } else if (location.pathname === '/dashboard') {
      setActiveTab('overview')
    }
  }, [location.pathname])

  // Load financial stats when venture changes
  useEffect(() => {
    if (selectedVenture) {
      loadFinancialStats(selectedVenture.id)
    } else {
      setFinancialStats(null)
    }
  }, [selectedVenture])

  const loadFinancialStats = async (ventureId: string) => {
    try {
      setLoadingFinancials(true)
      const stats = await financialApi.getQuickStats(ventureId)
      setFinancialStats(stats)
    } catch (error) {
      console.error('Failed to load financial stats:', error)
      // Use fallback data for development
      setFinancialStats({
        monthlyIncome: 0,
        monthlyNet: 0,
        activeGoals: 0,
        totalGoals: 0,
        activeStreams: 0,
        healthScore: 0
      })
    } finally {
      setLoadingFinancials(false)
    }
  }

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
    { id: 'overview', name: 'Overview', IconComponent: OverviewIcon },
    { id: 'impact', name: 'Impact Dashboard', IconComponent: ZapIcon },
    { id: 'ai-consultant', name: 'AI Consultant', IconComponent: AIConsultantIcon },
    { id: 'integrations', name: 'Integration Hub', IconComponent: IntegrationsIcon },
    { id: 'team', name: 'Team', IconComponent: TeamIcon },
    { id: 'billing', name: 'Billing', IconComponent: BillingIcon },
    { id: 'content', name: 'Content Studio', IconComponent: ContentStudioIcon },
    { id: 'social', name: 'Social Media', IconComponent: SocialMediaIcon },
    { id: 'calendar', name: 'Calendar Hub', IconComponent: CalendarIcon }
  ]

  return (
    <VentureProvider ventureId={selectedVenture?.id || null}>
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
            
            <UserProfile onLogout={handleLogout} />
          </div>
        </nav>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                data-testid={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id)
                  if (item.id === 'ai-consultant') {
                    navigate('/ai-consultant', { replace: true })
                  } else if (item.id === 'integrations') {
                    navigate('/integrations', { replace: true })
                  } else if (item.id === 'impact') {
                    navigate('/impact', { replace: true })
                  } else if (item.id === 'billing') {
                    navigate('/billing', { replace: true })
                  } else if (item.id === 'content') {
                    navigate('/content', { replace: true })
                  } else if (item.id === 'social') {
                    navigate('/social', { replace: true })
                  } else if (item.id === 'calendar') {
                    navigate('/calendar', { replace: true })
                  } else {
                    navigate('/dashboard', { replace: true })
                  }
                }}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <span className="nav-icon"><item.IconComponent size="md" /></span>
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
                          {selectedVenture.ventureType === 'sovereign_circle' ? <TeamIcon size="lg" /> : 
                           selectedVenture.ventureType === 'cooperative' ? <IntegrationsIcon size="lg" /> :
                           selectedVenture.ventureType === 'professional' ? <BillingIcon size="lg" /> : <OverviewIcon size="lg" />}
                        </span>
                        <div>
                          <h3 data-testid="current-venture">{selectedVenture.name}</h3>
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

                  {/* Stats Cards - Now with Real Financial Data */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon blue">
                          <RevenueIcon size="lg" />
                        </div>
                        <div className="stat-details">
                          <h3>Monthly Income</h3>
                          {loadingFinancials ? (
                            <p className="loading-text">Loading...</p>
                          ) : (
                            <p>{financialApi.formatCurrency(financialStats?.monthlyIncome || 0)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon green">
                          <TeamIcon size="lg" />
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
                          <TrendingUpIcon size="lg" />
                        </div>
                        <div className="stat-details">
                          <h3>Monthly Net</h3>
                          {loadingFinancials ? (
                            <p className="loading-text">Loading...</p>
                          ) : (
                            <p className={financialStats?.monthlyNet && financialStats.monthlyNet > 0 ? 'text-green-600' : 'text-red-600'}>
                              {financialApi.formatCurrency(financialStats?.monthlyNet || 0)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-icon orange">
                          <TargetIcon size="lg" />
                        </div>
                        <div className="stat-details">
                          <h3>Financial Health</h3>
                          {loadingFinancials ? (
                            <p className="loading-text">Loading...</p>
                          ) : (
                            <p className={financialApi.getHealthScoreColor(financialStats?.healthScore || 0)}>
                              {financialStats?.healthScore || 0}/100
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Cards */}
                  <div className="feature-grid">
                    <div className="feature-card">
                      <h3 className="feature-title">
                        <AIConsultantIcon size="md" className="feature-icon" /> AI Consultant
                      </h3>
                      <p className="feature-description">
                        Get strategic advice tailored to your {selectedVenture.ventureType === 'sovereign_circle' ? 'circle' : 'venture'} and goals.
                      </p>
                      <button 
                        onClick={() => {
                          setActiveTab('ai-consultant')
                          navigate('/ai-consultant', { replace: true })
                        }}
                        className="btn-feature btn-blue"
                      >
                        Start Consultation
                      </button>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">
                        <ContentStudioIcon size="md" className="feature-icon" /> Content Studio
                      </h3>
                      <p className="feature-description">
                        Create, manage, and approve content with AI assistance and professional workflow tools.
                      </p>
                      <button 
                        onClick={() => {
                          setActiveTab('content')
                          navigate('/content', { replace: true })
                        }}
                        className="btn-feature btn-green"
                      >
                        Create Content
                      </button>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">
                        <TeamIcon size="md" className="feature-icon" /> Team Management{' '}
                        <FeatureGate feature="team_collaboration" fallback={<span className="premium-badge">Pro</span>}>
                          <span></span>
                        </FeatureGate>
                      </h3>
                      <p className="feature-description">
                        Manage your team members, invite collaborators, and coordinate your collective work.
                      </p>
                      <FeatureGate 
                        feature="team_collaboration" 
                        fallback={
                          <button className="btn-feature btn-disabled" disabled>
                            🔒 Requires Pro Plan
                          </button>
                        }
                      >
                        <button 
                          onClick={() => {
                            setActiveTab('team')
                            navigate('/dashboard', { replace: true })
                          }}
                          className="btn-feature btn-green"
                        >
                          Manage Team
                        </button>
                      </FeatureGate>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">
                        <ZapIcon size="md" className="feature-icon" /> Financial Insights{' '}
                        <FeatureGate feature="advanced_analytics" fallback={<span className="premium-badge">Pro</span>}>
                          <span></span>
                        </FeatureGate>
                      </h3>
                      <p className="feature-description">
                        Track revenue streams, monitor solvency, and get recommendations for financial growth.
                      </p>
                      <FeatureGate 
                        feature="advanced_analytics" 
                        fallback={
                          <button className="btn-feature btn-disabled" disabled>
                            🔒 Requires Pro Plan
                          </button>
                        }
                      >
                        <button 
                          onClick={() => {
                            setActiveTab('impact')
                            navigate('/impact', { replace: true })
                          }}
                          className="btn-feature btn-purple"
                        >
                          View Finances
                        </button>
                      </FeatureGate>
                    </div>

                    <div className="feature-card">
                      <h3 className="feature-title">
                        <SocialMediaIcon size="md" className="feature-icon" /> Social Media Hub
                      </h3>
                      <p className="feature-description">
                        Share your message and connect with your community across platforms.
                      </p>
                      <button 
                        onClick={() => {
                          setActiveTab('social')
                          navigate('/social', { replace: true })
                        }}
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
                    <h3>
                      <OverviewIcon size="lg" className="feature-icon" /> Welcome to The Collective Strategist
                    </h3>
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
                <p className="page-subtitle">Manage your team for {selectedVenture.name}</p>
              </div>
              <SubscriptionGate feature="team_collaboration">
                <TeamManagement 
                  venture={selectedVenture} 
                  onVentureUpdate={handleVentureUpdated}
                />
              </SubscriptionGate>
            </div>
          )}

          {activeTab === 'integrations' && selectedVenture && (
            <div>
              <div className="page-header">
                <h2 className="page-title">Integration Hub</h2>
                <p className="page-subtitle">Financial Liberation Tools for {selectedVenture.name}</p>
              </div>
              <IntegrationsPage ventureId={selectedVenture.id} />
            </div>
          )}

          {activeTab === 'impact' && selectedVenture && (
            <ImpactDashboard ventureId={selectedVenture.id} />
          )}

          {activeTab === 'billing' && (
            <div>
              <div className="page-header">
                <h2 className="page-title">Billing & Subscription</h2>
                <p className="page-subtitle">Manage your subscription and billing information</p>
              </div>
              <BillingManagement />
            </div>
          )}

          {activeTab === 'content' && selectedVenture && (
            <ContentStudio ventureId={selectedVenture.id} />
          )}

          {activeTab === 'social' && selectedVenture && (
            <div>
              <div className="page-header">
                <h2 className="page-title">Social Media Hub</h2>
                <p className="page-subtitle">Manage social media for {selectedVenture.name}</p>
              </div>
              <SocialMediaHub ventureId={selectedVenture.id} />
            </div>
          )}

          {activeTab === 'calendar' && selectedVenture && (
            <CalendarHub ventureId={selectedVenture.id} />
          )}

          {activeTab !== 'overview' && !selectedVenture && (
            <div className="no-venture-state">
              <div className="no-venture-content">
                <h3>
                  <OverviewIcon size="lg" className="feature-icon" /> No Venture Selected
                </h3>
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
    </VentureProvider>
  )
}