import { useState } from 'react'
import { CreateVentureRequest, Venture } from '../types/venture'
import { ventureApi } from '../services/ventureApi'

interface CreateVentureModalProps {
  isOpen: boolean
  onClose: () => void
  onVentureCreated: (venture: Venture) => void
}

export default function CreateVentureModal({ 
  isOpen, 
  onClose, 
  onVentureCreated 
}: CreateVentureModalProps) {
  const [formData, setFormData] = useState<CreateVentureRequest>({
    name: '',
    description: '',
    ventureType: 'professional',
    isGreenfieldAffiliate: false,
    coreValues: [],
    primaryGoals: [],
    costSharingEnabled: false
  })

  const [newValue, setNewValue] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Venture name is required')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      const venture = await ventureApi.createVenture(formData)
      onVentureCreated(venture)
      onClose()
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        ventureType: 'professional',
        isGreenfieldAffiliate: false,
        coreValues: [],
        primaryGoals: [],
        costSharingEnabled: false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venture')
    } finally {
      setIsLoading(false)
    }
  }

  const addValue = () => {
    if (newValue.trim() && !formData.coreValues?.includes(newValue.trim())) {
      setFormData(prev => ({
        ...prev,
        coreValues: [...(prev.coreValues || []), newValue.trim()]
      }))
      setNewValue('')
    }
  }

  const removeValue = (value: string) => {
    setFormData(prev => ({
      ...prev,
      coreValues: prev.coreValues?.filter(v => v !== value) || []
    }))
  }

  const addGoal = () => {
    if (newGoal.trim() && !formData.primaryGoals?.includes(newGoal.trim())) {
      setFormData(prev => ({
        ...prev,
        primaryGoals: [...(prev.primaryGoals || []), newGoal.trim()]
      }))
      setNewGoal('')
    }
  }

  const removeGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      primaryGoals: prev.primaryGoals?.filter(g => g !== goal) || []
    }))
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Create New Venture</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="name">Venture Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter venture name"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your venture"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="ventureType">Venture Type *</label>
              <select
                id="ventureType"
                value={formData.ventureType}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  ventureType: e.target.value as any 
                }))}
                disabled={isLoading}
              >
                <option value="professional">💼 Professional</option>
                <option value="sovereign_circle">🤝 Sovereign Circle</option>
                <option value="cooperative">🔗 Cooperative</option>
                <option value="solo">👤 Solo</option>
              </select>
            </div>

            {/* Liberation features */}
            {(formData.ventureType === 'sovereign_circle' || formData.ventureType === 'cooperative') && (
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isGreenfieldAffiliate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isGreenfieldAffiliate: e.target.checked 
                    }))}
                    disabled={isLoading}
                  />
                  <span>Greenfield Override Affiliate (Liberation Tier)</span>
                </label>
                <p className="help-text">
                  Check this if you're affiliated with Greenfield Override for free access
                </p>
              </div>
            )}
          </div>

          {/* Core Values */}
          <div className="form-section">
            <h3>Core Values</h3>
            <div className="tag-input-group">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Add a core value"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                disabled={isLoading}
              />
              <button type="button" onClick={addValue} disabled={isLoading}>
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.coreValues?.map((value, index) => (
                <span key={index} className="tag">
                  {value}
                  <button
                    type="button"
                    onClick={() => removeValue(value)}
                    className="tag-remove"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Primary Goals */}
          <div className="form-section">
            <h3>Primary Goals</h3>
            <div className="tag-input-group">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a primary goal"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                disabled={isLoading}
              />
              <button type="button" onClick={addGoal} disabled={isLoading}>
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.primaryGoals?.map((goal, index) => (
                <span key={index} className="tag">
                  {goal}
                  <button
                    type="button"
                    onClick={() => removeGoal(goal)}
                    className="tag-remove"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Cost Sharing */}
          {formData.ventureType === 'cooperative' && (
            <div className="form-section">
              <h3>Cost Sharing</h3>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.costSharingEnabled}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      costSharingEnabled: e.target.checked 
                    }))}
                    disabled={isLoading}
                  />
                  <span>Enable cost sharing features</span>
                </label>
                <p className="help-text">
                  Help your cooperative track and coordinate shared expenses
                </p>
              </div>

              {formData.costSharingEnabled && (
                <div className="form-group">
                  <label htmlFor="costSharingMethod">Cost Sharing Method</label>
                  <select
                    id="costSharingMethod"
                    value={formData.costSharingMethod || 'equal'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      costSharingMethod: e.target.value as any 
                    }))}
                    disabled={isLoading}
                  >
                    <option value="equal">Equal split</option>
                    <option value="contribution_based">Contribution-based</option>
                    <option value="custom">Custom arrangement</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Venture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
