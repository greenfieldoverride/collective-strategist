import { useState, useEffect } from 'react'
import { authApi, User } from '../services/authApi'
import SubscriptionStatus from './SubscriptionStatus'

interface UserProfileProps {
  onLogout: () => void
}

export default function UserProfile({ onLogout }: UserProfileProps) {
  const [user, setUser] = useState<Partial<User> | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      setIsLoading(true)
      
      // First try to get user from token (quick)
      const userFromToken = authApi.getUserFromToken()
      if (userFromToken) {
        setUser(userFromToken)
        setIsLoading(false)
        return
      }

      // If no token or invalid token, try demo login
      if (!authApi.isAuthenticated()) {
        await authApi.demoLogin()
        const demoUser = authApi.getUserFromToken()
        setUser(demoUser)
      }
    } catch (error) {
      console.error('Failed to load user info:', error)
      // Fallback to basic info
      setUser({
        email: 'user@collective-strategist.com',
        name: 'Liberation User'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    authApi.logout()
    onLogout()
  }

  const getDisplayName = () => {
    if (user?.name) return user.name
    if (user?.email) return user.email.split('@')[0]
    return 'User'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="nav-user">
        <span className="nav-welcome">Loading...</span>
      </div>
    )
  }

  return (
    <div className="nav-user" data-testid="user-profile">
      <span className="nav-welcome">Welcome back, {getDisplayName()}! 👋</span>
      
      <div className="user-profile-dropdown">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="user-avatar-button"
          data-testid="user-dropdown"
          title={`Logged in as ${user?.email || 'Unknown'}`}
        >
          <div className="user-avatar">
            {getInitials()}
          </div>
        </button>

        {showDropdown && (
          <div className="user-dropdown">
            <div className="user-info">
              <div className="user-avatar-large">
                {getInitials()}
              </div>
              <div className="user-details">
                <div className="user-name">{getDisplayName()}</div>
                <div className="user-email" data-testid="user-email">{user?.email || 'No email'}</div>
              </div>
            </div>
            
            <div className="dropdown-divider"></div>
            
            {/* Subscription Status */}
            <SubscriptionStatus compact={true} />
            
            <div className="dropdown-divider"></div>
            
            <div className="dropdown-actions">
              <button 
                className="dropdown-item"
                onClick={() => {
                  setShowDropdown(false)
                  // TODO: Add profile settings
                  alert('Profile settings coming soon!')
                }}
              >
                <span className="dropdown-icon">⚙️</span>
                Profile Settings
              </button>
              
              <button 
                className="dropdown-item"
                onClick={() => {
                  setShowDropdown(false)
                  // TODO: Add help/support
                  alert('Help & Support coming soon!')
                }}
              >
                <span className="dropdown-icon">❓</span>
                Help & Support
              </button>
              
              <div className="dropdown-divider"></div>
              
              <button 
                className="dropdown-item logout-item"
                data-testid="logout-button"
                onClick={() => {
                  setShowDropdown(false)
                  handleLogout()
                }}
              >
                <span className="dropdown-icon">🚪</span>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div 
          className="dropdown-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}