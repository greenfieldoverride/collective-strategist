import { ReactNode } from 'react'
import { useSubscriptionGate } from '../hooks/useSubscription'
import { billingApi, PlanOption } from '../services/billingApi'

interface SubscriptionGateProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

interface UpgradePromptProps {
  feature: string
  currentPlan: PlanOption | null
  onUpgrade?: (plan: PlanOption) => void
}

function UpgradePrompt({ feature, currentPlan, onUpgrade }: UpgradePromptProps) {
  const getRequiredPlan = (): PlanOption | null => {
    const plans = billingApi.getAvailablePlans()
    
    // Feature to minimum plan mapping
    const featureRequirements: Record<string, string> = {
      'unlimited_ventures': 'enterprise',
      'advanced_analytics': 'pro',
      'team_collaboration': 'pro',
      'custom_integrations': 'enterprise',
      'priority_support': 'pro',
      'white_label': 'enterprise',
      'api_access': 'pro',
      'export_data': 'pro',
    }
    
    const requiredPlanName = featureRequirements[feature]
    if (!requiredPlanName) return plans[0] // Default to basic
    
    return plans.find(plan => plan.name === requiredPlanName) || plans[0]
  }

  const getFeatureDescription = (feature: string): string => {
    const descriptions: Record<string, string> = {
      'unlimited_ventures': 'Create unlimited ventures and scale your business',
      'advanced_analytics': 'Access detailed analytics and insights',
      'team_collaboration': 'Collaborate with your team members',
      'custom_integrations': 'Connect custom tools and platforms',
      'priority_support': 'Get priority customer support',
      'white_label': 'White-label the platform for your brand',
      'api_access': 'Access our developer API',
      'export_data': 'Export your data in various formats',
    }
    
    return descriptions[feature] || 'Access premium features'
  }

  const handleUpgrade = async (plan: PlanOption) => {
    if (onUpgrade) {
      onUpgrade(plan)
      return
    }
    
    // Default behavior: open checkout
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

  const requiredPlan = getRequiredPlan()
  
  if (!requiredPlan) {
    return null
  }

  return (
    <div className="subscription-gate">
      <div className="gate-content">
        <div className="gate-icon">🔒</div>
        <div className="gate-message">
          <h3>Premium Feature</h3>
          <p>{getFeatureDescription(feature)}</p>
          <p>
            {currentPlan 
              ? `Upgrade from ${currentPlan.displayName} to ${requiredPlan.displayName} to unlock this feature.`
              : `Subscribe to ${requiredPlan.displayName} to unlock this feature.`
            }
          </p>
        </div>
        <div className="gate-actions">
          <button 
            className="btn btn-primary"
            onClick={() => handleUpgrade(requiredPlan)}
          >
            {currentPlan ? 'Upgrade' : 'Subscribe'} to {requiredPlan.displayName}
          </button>
          <div className="plan-price">
            {billingApi.formatPrice(requiredPlan.amount)}/{requiredPlan.interval}
          </div>
        </div>
      </div>
      
      <div className="gate-features">
        <h4>What you get with {requiredPlan.displayName}:</h4>
        <ul>
          {requiredPlan.features.slice(0, 4).map((feature, idx) => (
            <li key={idx}>
              <span className="feature-icon">✓</span>
              {feature}
            </li>
          ))}
          {requiredPlan.features.length > 4 && (
            <li>
              <span className="feature-icon">+</span>
              {requiredPlan.features.length - 4} more features
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default function SubscriptionGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: SubscriptionGateProps) {
  const { hasAccess, currentPlan, isLoading } = useSubscriptionGate(feature)

  if (isLoading) {
    return (
      <div className="subscription-gate loading">
        <div className="loading-content">
          <span className="loading-icon">⏳</span>
          <span>Checking access...</span>
        </div>
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} currentPlan={currentPlan} />
  }

  return null
}

// Convenience wrapper for inline feature gates
export function FeatureGate({ 
  feature, 
  children, 
  fallback 
}: { 
  feature: string
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <SubscriptionGate 
      feature={feature} 
      fallback={fallback || <span className="feature-disabled">🔒 Premium Feature</span>}
      showUpgradePrompt={false}
    >
      {children}
    </SubscriptionGate>
  )
}

// CSS styles (add to your main CSS file)
export const subscriptionGateStyles = `
.subscription-gate {
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  background: #f9fafb;
  margin: 16px 0;
}

.subscription-gate.loading {
  border-style: solid;
  background: white;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #6b7280;
}

.loading-icon {
  font-size: 24px;
}

.gate-content {
  margin-bottom: 20px;
}

.gate-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.gate-message h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
}

.gate-message p {
  margin: 0 0 12px 0;
  color: #6b7280;
  line-height: 1.5;
}

.gate-message p:last-child {
  color: #374151;
  font-weight: 500;
}

.gate-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.plan-price {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.gate-features {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
}

.gate-features h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.gate-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.gate-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  color: #374151;
  font-size: 14px;
}

.feature-icon {
  color: #10b981;
  font-weight: bold;
  font-size: 12px;
  flex-shrink: 0;
}

.feature-disabled {
  color: #9ca3af;
  font-size: 12px;
  font-style: italic;
}

@media (max-width: 640px) {
  .subscription-gate {
    padding: 16px;
    margin: 12px 0;
  }
  
  .gate-icon {
    font-size: 36px;
    margin-bottom: 12px;
  }
  
  .gate-message h3 {
    font-size: 18px;
  }
  
  .gate-features {
    max-width: none;
  }
}
`