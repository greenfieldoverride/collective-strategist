import { useState, useCallback, useEffect } from 'react'
import type { TourConfig, UseTourOptions, UseTourReturn } from '../types/tour'
import { 
  announceToScreenReader, 
  getDefaultAnnouncements 
} from '../utils/accessibility'
import { autoScrollToElement } from '../utils/scrolling'
import { waitForElement } from '../utils/performance'

export function useTour(options: UseTourOptions = {}): UseTourReturn {
  const { 
    config: initialConfig, 
    autoStart = false, 
    onComplete, 
    onError 
  } = options

  const [config, setConfig] = useState<TourConfig | null>(initialConfig || null)
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  // Computed values
  const totalSteps = config?.steps.length || 0
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0
  const currentStepData = config?.steps[currentStep]
  const canGoNext = currentStep < totalSteps - 1
  const canGoPrevious = currentStep > 0

  // Navigate to specific step
  const goToStep = useCallback(async (stepIndex: number) => {
    if (!config || stepIndex < 0 || stepIndex >= config.steps.length) return

    try {
      setIsLoading(true)
      setError(undefined)
      
      const step = config.steps[stepIndex]
      
      // Handle waitFor condition
      if (step.waitFor) {
        if (typeof step.waitFor === 'function') {
          const shouldProceed = await step.waitFor()
          if (!shouldProceed) {
            setIsLoading(false)
            return
          }
        } else {
          // Wait for element to appear
          try {
            await waitForElement(step.waitFor, 5000)
          } catch (err) {
            throw new Error(`Element not found: ${step.waitFor}`)
          }
        }
      }

      // Get target element
      let targetElement: Element | null = null
      if (step.target) {
        if (typeof step.target === 'string') {
          targetElement = document.querySelector(step.target)
          if (!targetElement) {
            throw new Error(`Target element not found: ${step.target}`)
          }
        } else {
          targetElement = step.target
        }
      }

      // Auto-scroll to target
      if (targetElement && step.scrollBehavior !== 'none') {
        await autoScrollToElement(
          targetElement, 
          step.scrollBehavior || 'smooth'
        )
      }

      // Update step
      setCurrentStep(stepIndex)

      // Announce to screen readers
      if (config.screenReaderSupport !== false) {
        const announcements = getDefaultAnnouncements()
        announceToScreenReader(
          step.announceOnEntry || 
          announcements.stepChange(stepIndex + 1, config.steps.length, step.title),
          'polite'
        )
      }

      // Call step show callback
      step.onShow?.()

      // Call config step change callback
      config.onStepChange?.(step, stepIndex)

      setIsLoading(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setIsLoading(false)
      onError?.(error)
      config?.onError?.(error, config.steps[stepIndex])
    }
  }, [config, onError])

  // Start tour
  const start = useCallback((newConfig?: TourConfig) => {
    const tourConfig = newConfig || config
    if (!tourConfig || tourConfig.steps.length === 0) return
    
    if (newConfig) {
      setConfig(newConfig)
    }
    
    setIsActive(true)
    setCurrentStep(0)
    setError(undefined)
    
    // Announce tour start
    if (tourConfig.screenReaderSupport !== false) {
      const announcements = getDefaultAnnouncements()
      announceToScreenReader(announcements.tourStart, 'assertive')
    }

    tourConfig.onStart?.()
    
    // Navigate to first step
    if (newConfig) {
      // Use setTimeout to ensure config is set
      setTimeout(() => goToStep(0), 0)
    } else {
      goToStep(0)
    }
  }, [config, goToStep])

  // Stop tour
  const stop = useCallback(() => {
    // Call current step hide callback
    currentStepData?.onHide?.()
    
    setIsActive(false)
    setCurrentStep(0)
    setError(undefined)
    
    // Announce tour end
    if (config?.screenReaderSupport !== false) {
      const announcements = getDefaultAnnouncements()
      announceToScreenReader(announcements.tourEnd, 'polite')
    }

    // Check if tour was completed
    if (currentStep === totalSteps - 1) {
      config?.onComplete?.()
      onComplete?.()
    }
  }, [config, currentStepData, currentStep, totalSteps, onComplete])

  // Next step
  const next = useCallback(() => {
    if (canGoNext) {
      currentStepData?.onHide?.()
      goToStep(currentStep + 1)
    } else {
      // Last step - complete tour
      stop()
    }
  }, [canGoNext, currentStepData, goToStep, currentStep, stop])

  // Previous step
  const previous = useCallback(() => {
    if (canGoPrevious) {
      currentStepData?.onHide?.()
      goToStep(currentStep - 1)
    }
  }, [canGoPrevious, currentStepData, goToStep, currentStep])

  // Skip tour
  const skip = useCallback(() => {
    stop()
    config?.onSkip?.()
  }, [stop, config])

  // Auto-start effect
  useEffect(() => {
    if (autoStart && config && !isActive) {
      start()
    }
  }, [autoStart, config, isActive, start])

  return {
    isActive,
    currentStep,
    totalSteps,
    progress,
    currentStepData,
    canGoNext,
    canGoPrevious,
    
    // Actions
    start,
    stop,
    next,
    previous,
    goToStep,
    skip,
    
    // State
    isLoading,
    error
  }
}