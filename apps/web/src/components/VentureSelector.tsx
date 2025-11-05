import { useState, useEffect } from 'react'
import { Venture } from '../types/venture'
import { ventureApi } from '../services/ventureApi'

interface VentureSelectorProps {
  selectedVenture: Venture | null
  onVentureChange: (venture: Venture | null) => void
  onCreateNew: () => void
}

export default function VentureSelector({ 
  selectedVenture, 
  onVentureChange, 
  onCreateNew 
}: VentureSelectorProps) {
  const [ventures, setVentures] = useState<Venture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadVentures()
  }, [])

  const loadVentures = async () => {
    try {
      setIsLoading(true)
      const response = await ventureApi.getVentures({ limit: 50 })
      setVentures(response.ventures)
      
      // Auto-select first venture if none selected
      if (!selectedVenture && response.ventures.length > 0) {
        onVentureChange(response.ventures[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ventures')
    } finally {
      setIsLoading(false)
    }
  }

  const getVentureIcon = (type: string) => {
    // Using simple icons for now to maintain compatibility
    // These could be replaced with SVG components in the future
    switch (type) {
      case 'sovereign_circle': return '👥'
      case 'cooperative': return '🔗'
      case 'professional': return '💼'
      case 'solo': return '👤'
      default: return '🏢'
    }
  }

  const getVentureLabel = (type: string) => {
    switch (type) {
      case 'sovereign_circle': return 'Sovereign Circle'
      case 'cooperative': return 'Cooperative'
      case 'professional': return 'Professional'
      case 'solo': return 'Solo'
      default: return type
    }
  }

  const getBillingTierBadge = (tier: string) => {
    if (tier === 'liberation') {
      return <span className="tier-badge liberation">Liberation</span>
    }
    return <span className="tier-badge professional">Professional</span>
  }

  if (isLoading) {
    return (
      <div className="venture-selector loading">
        <div className="selector-button">
          <div className="loading-placeholder">Loading ventures...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="venture-selector error">
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={loadVentures} className="retry-btn">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="venture-selector" data-testid="venture-selector">
      <div className="selector-wrapper">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="selector-button"
        >
          <div className="selected-venture">
            {selectedVenture ? (
              <>
                <span className="venture-icon">
                  {getVentureIcon(selectedVenture.ventureType)}
                </span>
                <div className="venture-info">
                  <span className="venture-name">{selectedVenture.name}</span>
                  <span className="venture-type">
                    {getVentureLabel(selectedVenture.ventureType)}
                  </span>
                </div>
                {getBillingTierBadge(selectedVenture.billingTier)}
              </>
            ) : (
              <>
                <span className="venture-icon">🏢</span>
                <span className="venture-name">Select a venture</span>
              </>
            )}
          </div>
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-header">
              <h3>Your Ventures</h3>
              <button 
                onClick={() => {
                  setIsOpen(false)
                  onCreateNew()
                }}
                className="create-venture-btn"
              >
                + New Venture
              </button>
            </div>

            <div className="ventures-list">
              {ventures.length === 0 ? (
                <div className="empty-state">
                  <p>No ventures yet</p>
                  <button onClick={onCreateNew} className="btn-primary">
                    Create Your First Venture
                  </button>
                </div>
              ) : (
                ventures.map((venture) => (
                  <div
                    key={venture.id}
                    onClick={() => {
                      onVentureChange(venture)
                      setIsOpen(false)
                    }}
                    className={`venture-option ${
                      selectedVenture?.id === venture.id ? 'selected' : ''
                    }`}
                  >
                    <span className="venture-icon">
                      {getVentureIcon(venture.ventureType)}
                    </span>
                    <div className="venture-details">
                      <div className="venture-header">
                        <span className="venture-name">{venture.name}</span>
                        {getBillingTierBadge(venture.billingTier)}
                      </div>
                      <div className="venture-meta">
                        <span className="venture-type">
                          {getVentureLabel(venture.ventureType)}
                        </span>
                        {venture.members && (
                          <span className="member-count">
                            {venture.members.length} member{venture.members.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {venture.description && (
                        <p className="venture-description">{venture.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
