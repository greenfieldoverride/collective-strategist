import { useState, useEffect } from 'react'
import { billingApi, BillingInfo, PlanOption } from '../services/billingApi'

interface UseSubscriptionReturn {
  billingInfo: BillingInfo | null
  isLoading: boolean
  error: string | null
  hasFeatureAccess: (feature: string) => boolean
  currentPlan: PlanOption | null
  refreshBillingInfo: () => Promise<void>
}

export function useSubscription(): UseSubscriptionReturn {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    loadBillingInfo()
  }, [])

  const getCurrentPlan = (): PlanOption | null => {
    if (!billingInfo?.subscription) return null
    return billingApi.getPlanByName(billingInfo.subscription.planName)
  }

  const hasFeatureAccess = (feature: string): boolean => {
    const currentPlan = getCurrentPlan()
    return billingApi.hasFeatureAccess(currentPlan?.name || null, feature)
  }

  return {
    billingInfo,
    isLoading,
    error,
    hasFeatureAccess,
    currentPlan: getCurrentPlan(),
    refreshBillingInfo: loadBillingInfo
  }
}

// Hook for subscription gates/paywalls
export function useSubscriptionGate(feature: string) {
  const { hasFeatureAccess, currentPlan, isLoading } = useSubscription()
  
  return {
    hasAccess: hasFeatureAccess(feature),
    currentPlan,
    isLoading,
    showUpgradePrompt: !hasFeatureAccess(feature)
  }
}