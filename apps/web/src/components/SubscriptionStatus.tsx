import { useState, useEffect } from 'react'
import { billingApi, BillingInfo, PlanOption } from '../services/billingApi'

interface SubscriptionStatusProps {
  className?: string
  onUpgrade?: (plan: PlanOption) => void
  onManageBilling?: () => void
  compact?: boolean
}

export default function SubscriptionStatus({ 
  className = '', 
  onUpgrade, 
  onManageBilling,
  compact = false 
}: SubscriptionStatusProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setError('Failed to load subscription status')
      // Fallback for development/demo
      setBillingInfo({
        customer: null,
        subscription: null,
        status: 'none'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusDisplay = () => {
    if (!billingInfo) return { text: 'Unknown', color: 'gray', icon: '❓' }
    
    switch (billingInfo.status) {
      case 'active':
        return { text: 'Active', color: 'green', icon: '✅' }
      case 'past_due':
        return { text: 'Past Due', color: 'orange', icon: '⚠️' }
      case 'cancelled':
        return { text: 'Cancelled', color: 'red', icon: '❌' }
      case 'none':
      default:
        return { text: 'Free Plan', color: 'gray', icon: '🆓' }
    }
  }

  const getCurrentPlan = (): PlanOption | null => {
    if (!billingInfo?.subscription) return null
    return billingApi.getPlanByName(billingInfo.subscription.planName)
  }

  const getUpgradeOptions = (): PlanOption[] => {
    const currentPlan = getCurrentPlan()
    const allPlans = billingApi.getAvailablePlans()
    
    if (!currentPlan) {
      return allPlans // Show all plans if no current subscription
    }
    
    // Show plans that are upgrades from current plan
    const planHierarchy = ['basic', 'pro', 'enterprise']
    const currentIndex = planHierarchy.indexOf(currentPlan.name)
    
    return allPlans.filter((_, index) => index > currentIndex)
  }

  const handleUpgrade = (plan: PlanOption) => {
    if (onUpgrade) {
      onUpgrade(plan)
    } else {
      // Default behavior: open checkout
      openCheckout(plan)
    }
  }

  const openCheckout = async (plan: PlanOption) => {
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

  const status = getStatusDisplay()
  const currentPlan = getCurrentPlan()
  const upgradeOptions = getUpgradeOptions()

  if (isLoading) {
    return (
      <div className={`subscription-status loading ${className}`}>
        <div className="status-content">
          <span className="status-icon">⏳</span>
          <span className="status-text">Loading...</span>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`subscription-status compact ${className}`}>
        <div className="status-content">
          <span className="status-icon">{status.icon}</span>
          <span className={`status-text ${status.color}`}>
            {currentPlan ? currentPlan.displayName : status.text}
          </span>
          {upgradeOptions.length > 0 && (
            <button 
              className="upgrade-btn-small"
              onClick={() => handleUpgrade(upgradeOptions[0])}
              title={`Upgrade to ${upgradeOptions[0].displayName}`}
            >
              ⬆️
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`subscription-status ${className}`}>
      <div className="status-header">
        <div className="status-main">
          <span className="status-icon">{status.icon}</span>
          <div className="status-info">
            <div className={`status-text ${status.color}`}>
              {status.text}
            </div>
            {currentPlan && (
              <div className="plan-info">
                <span className="plan-name">{currentPlan.displayName}</span>
                <span className="plan-price">
                  {billingApi.formatPrice(currentPlan.amount)}/{currentPlan.interval}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="status-actions">
          {onManageBilling && billingInfo?.subscription && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onManageBilling}
            >
              Manage
            </button>
          )}
          
          {upgradeOptions.length > 0 && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => handleUpgrade(upgradeOptions[0])}
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="status-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button 
            className="retry-btn"
            onClick={loadBillingInfo}
          >
            Retry
          </button>
        </div>
      )}

      {currentPlan && billingInfo?.subscription && (
        <div className="subscription-details">
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-value ${status.color}`}>{status.text}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Next billing:</span>
            <span className="detail-value">
              {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
          
          {billingInfo.status === 'past_due' && (
            <div className="detail-row warning">
              <span className="detail-label">Action needed:</span>
              <span className="detail-value">Update payment method</span>
            </div>
          )}
        </div>
      )}

      {upgradeOptions.length > 1 && (
        <div className="upgrade-options">
          <div className="upgrade-header">Available Upgrades:</div>
          <div className="upgrade-plans">
            {upgradeOptions.map((plan) => (
              <div key={plan.name} className="upgrade-plan">
                <div className="plan-header">
                  <span className="plan-name">{plan.displayName}</span>
                  {plan.popular && <span className="plan-badge">Popular</span>}
                </div>
                <div className="plan-price">
                  {billingApi.formatPrice(plan.amount)}/{plan.interval}
                </div>
                <div className="plan-features">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="feature">
                      <span className="feature-icon">✓</span>
                      <span className="feature-text">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 3 && (
                    <div className="feature">
                      <span className="feature-text">
                        +{plan.features.length - 3} more features
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  className="btn btn-primary btn-sm upgrade-plan-btn"
                  onClick={() => handleUpgrade(plan)}
                >
                  Upgrade to {plan.displayName}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// CSS styles (add to your main CSS file)
const styles = `
.subscription-status {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}

.subscription-status.compact {
  padding: 8px 12px;
  margin: 4px 0;
}

.subscription-status.loading {
  opacity: 0.7;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-size: 20px;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-text {
  font-weight: 600;
  font-size: 14px;
}

.status-text.green { color: #10b981; }
.status-text.orange { color: #f59e0b; }
.status-text.red { color: #ef4444; }
.status-text.gray { color: #6b7280; }

.plan-info {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
}

.plan-name {
  font-weight: 500;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.upgrade-btn-small {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
}

.upgrade-btn-small:hover {
  background: #2563eb;
}

.status-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #dc2626;
}

.retry-btn {
  background: none;
  border: none;
  color: #dc2626;
  text-decoration: underline;
  cursor: pointer;
  font-size: 12px;
}

.subscription-details {
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
  margin-top: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.detail-row.warning {
  color: #f59e0b;
  font-weight: 500;
}

.detail-label {
  color: #6b7280;
}

.upgrade-options {
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
  margin-top: 12px;
}

.upgrade-header {
  font-weight: 500;
  font-size: 12px;
  color: #374151;
  margin-bottom: 8px;
}

.upgrade-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.upgrade-plan {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #f9fafb;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.plan-badge {
  background: #3b82f6;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.plan-price {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.plan-features {
  margin-bottom: 12px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 2px;
}

.feature-icon {
  color: #10b981;
  font-weight: bold;
}

.upgrade-plan-btn {
  width: 100%;
}

/* Compact mode styles */
.subscription-status.compact .status-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subscription-status.compact .status-icon {
  font-size: 16px;
}

.subscription-status.compact .status-text {
  font-size: 12px;
}
`

export { styles as subscriptionStatusStyles }