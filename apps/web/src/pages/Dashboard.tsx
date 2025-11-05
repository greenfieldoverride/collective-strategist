import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AIConsultant from '../components/AIConsultant'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')

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

  const navItems = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'ai-consultant', name: 'AI Consultant', icon: '🤖' },
    { id: 'content', name: 'Content Studio', icon: '✍️' },
    { id: 'social', name: 'Social Media', icon: '📱' }
  ]

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="top-nav-content">
          <h1 className="brand-title">The Collective Strategist</h1>
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
                <h2 className="page-title">Dashboard Overview</h2>
                <p className="page-subtitle">Your AI business consultant platform at a glance</p>
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
                    <div className="stat-icon purple">
                      <span className="stat-emoji">📱</span>
                    </div>
                    <div className="stat-details">
                      <h3>Social Posts</h3>
                      <p>89</p>
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
                  <h3 className="feature-title">🤖 AI Business Consultant</h3>
                  <p className="feature-description">
                    Get strategic business advice tailored to your context and goals. Ask questions, explore scenarios, and get actionable insights.
                  </p>
                  <button 
                    onClick={() => setActiveTab('ai-consultant')}
                    className="btn-feature btn-blue"
                  >
                    Start Consultation
                  </button>
                </div>

                <div className="feature-card">
                  <h3 className="feature-title">✍️ Content Studio</h3>
                  <p className="feature-description">
                    Generate high-quality content in your unique voice. Blog posts, marketing copy, social media content, and more.
                  </p>
                  <button 
                    onClick={() => setActiveTab('content')}
                    className="btn-feature btn-green"
                  >
                    Create Content
                  </button>
                </div>

                <div className="feature-card">
                  <h3 className="feature-title">📱 Social Media Hub</h3>
                  <p className="feature-description">
                    Connect your social platforms, schedule posts, and analyze engagement. Streamline your social media strategy.
                  </p>
                  <button 
                    onClick={() => setActiveTab('social')}
                    className="btn-feature btn-purple"
                  >
                    Manage Social
                  </button>
                </div>

                <div className="feature-card">
                  <h3 className="feature-title">📈 Analytics & Insights</h3>
                  <p className="feature-description">
                    Track your progress, measure impact, and optimize your strategy with detailed analytics and reporting.
                  </p>
                  <button 
                    onClick={() => setActiveTab('analytics')}
                    className="btn-feature btn-orange"
                  >
                    View Analytics
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-consultant' && <AIConsultant />}

          {activeTab !== 'overview' && activeTab !== 'ai-consultant' && (
            <div className="coming-soon">
              <div className="coming-soon-icon">🚀</div>
              <h3 className="coming-soon-title">Feature Coming Soon</h3>
              <p className="coming-soon-text">This section will be integrated with your backend API</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}