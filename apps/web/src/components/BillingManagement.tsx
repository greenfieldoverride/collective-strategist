import { useState, useEffect } from 'react'
import { billingApi, BillingInfo, PlanOption } from '../services/billingApi'
import SubscriptionStatus from './SubscriptionStatus'

interface BillingManagementProps {
  onClose?: () => void
}

export default function BillingManagement({ onClose }: BillingManagementProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPlanSelector, setShowPlanSelector] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    loadBillingInfo()
  }, [])

  const loadBillingInfo = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const info = await billingApi.getBillingInfo()
      setBillingInfo(info)
    } catch (err) {
      console.error('Failed to load billing info:', err)
      setError('Failed to load billing information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (plan: PlanOption) => {
    try {
      const checkoutUrl = await billingApi.createCheckoutUrl({
        planName: plan.name,
        amount: plan.amount,
        currency: plan.currency
      })
      window.open(checkoutUrl, '_blank')
    } catch (err) {
      console.error('Failed to create checkout:', err)
      alert('Failed to create checkout. Please try again.')
    }
  }

  const handleCancelSubscription = async () => {
    if (!billingInfo?.subscription) return
    
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.'
    )
    
    if (!confirmed) return
    
    try {
      setIsCancelling(true)
      await billingApi.cancelSubscription()
      await loadBillingInfo() // Refresh to show updated status
      alert('Subscription cancelled successfully. You will retain access until the end of your current billing period.')
    } catch (err) {
      console.error('Failed to cancel subscription:', err)
      alert('Failed to cancel subscription. Please contact support.')
    } finally {
      setIsCancelling(false)
    }
  }

  const getCurrentPlan = (): PlanOption | null => {
    if (!billingInfo?.subscription) return null
    return billingApi.getPlanByName(billingInfo.subscription.planName)
  }

  const getAllPlans = (): PlanOption[] => {
    return billingApi.getAvailablePlans()
  }

  if (isLoading) {
    return (
      <div className="billing-management">
        <div className="billing-header">
          <h2>Billing Management</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>
        <div className="billing-content loading">
          <div className="loading-spinner">
            <span>⏳</span>
            <span>Loading billing information...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="billing-management">
        <div className="billing-header">
          <h2>Billing Management</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>
        <div className="billing-content error">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button className="retry-btn" onClick={loadBillingInfo}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentPlan = getCurrentPlan()
  const allPlans = getAllPlans()

  return (
    <div className="billing-management">
      <div className="billing-header">
        <h2>Billing Management</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="billing-content">
        {/* Current Subscription Status */}
        <div className="section">
          <h3>Current Subscription</h3>
          <SubscriptionStatus 
            onUpgrade={handleUpgrade}
            onManageBilling={() => setShowPlanSelector(!showPlanSelector)}
          />
        </div>

        {/* Plan Management */}
        {(showPlanSelector || !billingInfo?.subscription) && (
          <div className="section">
            <div className="section-header">
              <h3>Choose Your Plan</h3>
              {billingInfo?.subscription && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPlanSelector(false)}
                >
                  Hide Plans
                </button>
              )}
            </div>
            
            <div className="plans-grid">
              {allPlans.map((plan) => {
                const isCurrent = currentPlan?.name === plan.name
                
                return (
                  <div key={plan.name} className={`plan-card ${isCurrent ? 'current' : ''}`}>
                    <div className="plan-header">
                      <div className="plan-name-section">
                        <h4>{plan.displayName}</h4>
                        {plan.popular && <span className="plan-badge popular">Popular</span>}
                        {isCurrent && <span className="plan-badge current">Current Plan</span>}
                      </div>
                      <div className="plan-price">
                        <span className="price-amount">
                          {billingApi.formatPrice(plan.amount)}
                        </span>
                        <span className="price-interval">/{plan.interval}</span>
                      </div>
                    </div>
                    
                    <div className="plan-description">
                      {plan.description}
                    </div>
                    
                    <div className="plan-features">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="feature">
                          <span className="feature-icon">✓</span>
                          <span className="feature-text">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="plan-actions">
                      {isCurrent ? (
                        <button className="btn btn-secondary btn-full" disabled>
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-full"
                          onClick={() => handleUpgrade(plan)}
                        >
                          {billingInfo?.subscription ? 'Switch to' : 'Choose'} {plan.displayName}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Subscription Actions */}
        {billingInfo?.subscription && billingInfo.status === 'active' && (
          <div className="section">
            <h3>Subscription Actions</h3>
            <div className="actions-grid">
              <button 
                className="action-btn"
                onClick={() => setShowPlanSelector(!showPlanSelector)}
              >
                <span className="action-icon">📈</span>
                <div className="action-content">
                  <div className="action-title">Change Plan</div>
                  <div className="action-description">Upgrade or switch to a different plan</div>
                </div>
              </button>
              
              <button 
                className="action-btn danger"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
              >
                <span className="action-icon">❌</span>
                <div className="action-content">
                  <div className="action-title">
                    {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                  </div>
                  <div className="action-description">
                    Cancel your subscription (access until end of billing period)
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Billing History */}
        <div className="section">
          <h3>Billing History</h3>
          <div className="billing-history">
            {billingInfo?.subscription ? (
              <div className="history-item">
                <div className="history-date">
                  {new Date(billingInfo.subscription.createdAt).toLocaleDateString()}
                </div>
                <div className="history-description">
                  Subscription started - {currentPlan?.displayName}
                </div>
                <div className="history-amount">
                  {currentPlan ? billingApi.formatPrice(currentPlan.amount) : 'N/A'}
                </div>
              </div>
            ) : (
              <div className="no-history">
                <span className="no-history-icon">📄</span>
                <span>No billing history available</span>
              </div>
            )}
          </div>
        </div>

        {/* Development Tools */}
        <div className="section dev-tools">
          <h3>Development Tools</h3>
          <div className="dev-actions">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                const info = await billingApi.getMockInfo()
                alert(`Mock Info: ${JSON.stringify(info, null, 2)}`)
              }}
            >
              Show Mock Info
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                await billingApi.resetMockData()
                await loadBillingInfo()
                alert('Mock data reset successfully')
              }}
            >
              Reset Mock Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// CSS styles (add to your main CSS file)
export const billingManagementStyles = `
.billing-management {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.billing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.billing-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.billing-content {
  padding: 24px;
}

.billing-content.loading,
.billing-content.error {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

.loading-spinner span:first-child {
  font-size: 24px;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #dc2626;
}

.error-icon {
  font-size: 24px;
}

.section {
  margin-bottom: 32px;
}

.section:last-child {
  margin-bottom: 0;
}

.section h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.plan-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: white;
  transition: all 0.2s;
}

.plan-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.plan-card.current {
  border-color: #10b981;
  background: #f0fdf4;
}

.plan-header {
  margin-bottom: 12px;
}

.plan-name-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.plan-name-section h4 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
}

.plan-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.plan-badge.popular {
  background: #3b82f6;
  color: white;
}

.plan-badge.current {
  background: #10b981;
  color: white;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-amount {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.price-interval {
  font-size: 14px;
  color: #6b7280;
}

.plan-description {
  color: #6b7280;
  margin-bottom: 16px;
  line-height: 1.5;
}

.plan-features {
  margin-bottom: 20px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.feature-icon {
  color: #10b981;
  font-weight: bold;
  font-size: 12px;
}

.feature-text {
  color: #374151;
  font-size: 14px;
}

.plan-actions {
  margin-top: auto;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-full {
  width: 100%;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.action-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.action-btn.danger:hover:not(:disabled) {
  border-color: #ef4444;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
}

.action-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-title {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.action-btn.danger .action-title {
  color: #dc2626;
}

.action-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.billing-history {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.history-item {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
}

.history-item:last-child {
  border-bottom: none;
}

.history-date {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.history-description {
  color: #374151;
  font-size: 14px;
}

.history-amount {
  font-weight: 600;
  color: #1f2937;
}

.no-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: #6b7280;
  gap: 8px;
}

.no-history-icon {
  font-size: 24px;
  opacity: 0.5;
}

.dev-tools {
  border-top: 2px dashed #e5e7eb;
  padding-top: 20px;
  margin-top: 32px;
}

.dev-tools h3 {
  color: #6b7280;
  font-style: italic;
}

.dev-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .billing-management {
    margin: 0;
    border-radius: 0;
  }
  
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .history-item {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }
}
`