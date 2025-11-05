import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { 
  TourConfig, 
  TourState, 
  TourControls, 
  TourContextValue, 
  TourProviderProps
} from '../types/tour'
import { 
  announceToScreenReader, 
  handleKeyboardNavigation,
  getDefaultAnnouncements 
} from '../utils/accessibility'
import { autoScrollToElement } from '../utils/scrolling'
import { EventListenerManager } from '../utils/performance'

// Context
const TourContext = createContext<TourContextValue | null>(null)

// Actions
type TourAction = 
  | { type: 'SET_CONFIG'; config: TourConfig }
  | { type: 'START_TOUR' }
  | { type: 'STOP_TOUR' }
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: Error | undefined }

// Reducer
function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'SET_CONFIG':
      return {
        ...state,
        totalSteps: action.config.steps.length,
        currentStep: 0,
        isActive: false,
        error: undefined
      }
    
    case 'START_TOUR':
      return {
        ...state,
        isActive: true,
        currentStep: 0,
        error: undefined
      }
    
    case 'STOP_TOUR':
      return {
        ...state,
        isActive: false,
        currentStep: 0,
        error: undefined
      }
    
    case 'SET_STEP':
      return {
        ...state,
        currentStep: Math.max(0, Math.min(action.step, state.totalSteps - 1))
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        isLoading: false
      }
    
    default:
      return state
  }
}

// Initial state
const initialState: TourState = {
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  isLoading: false
}

// Provider component
export function TourProvider({ children, config }: TourProviderProps) {
  const [state, dispatch] = useReducer(tourReducer, initialState)
  const eventManagerRef = React.useRef<EventListenerManager | null>(null)

  // Initialize event manager
  useEffect(() => {
    eventManagerRef.current = new EventListenerManager()
    return () => {
      eventManagerRef.current?.removeAll()
    }
  }, [])

  // Update state when config changes
  useEffect(() => {
    if (config) {
      dispatch({ type: 'SET_CONFIG', config })
    }
  }, [config])

  // Current step data
  const currentStepData = config?.steps[state.currentStep]

  // Computed values
  const canGoNext = state.currentStep < state.totalSteps - 1
  const canGoPrevious = state.currentStep > 0
  const progress = state.totalSteps > 0 ? (state.currentStep + 1) / state.totalSteps : 0

  // Navigate to step with proper handling
  const navigateToStep = useCallback(async (stepIndex: number) => {
    if (!config || stepIndex < 0 || stepIndex >= config.steps.length) return

    try {
      dispatch({ type: 'SET_LOADING', loading: true })
      
      const step = config.steps[stepIndex]
      
      // Handle waitFor condition
      if (step.waitFor) {
        if (typeof step.waitFor === 'function') {
          const shouldProceed = await step.waitFor()
          if (!shouldProceed) {
            dispatch({ type: 'SET_LOADING', loading: false })
            return
          }
        } else {
          // Wait for element
          const element = document.querySelector(step.waitFor)
          if (!element) {
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
      dispatch({ type: 'SET_STEP', step: stepIndex })

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

      dispatch({ type: 'SET_LOADING', loading: false })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      dispatch({ type: 'SET_ERROR', error: err })
      config?.onError?.(err, config.steps[stepIndex])
    }
  }, [config])

  // Controls
  const controls: TourControls = {
    start: useCallback(() => {
      if (!config || config.steps.length === 0) return
      
      dispatch({ type: 'START_TOUR' })
      navigateToStep(0)
      
      // Announce tour start
      if (config.screenReaderSupport !== false) {
        const announcements = getDefaultAnnouncements()
        announceToScreenReader(announcements.tourStart, 'assertive')
      }

      config.onStart?.()
    }, [config, navigateToStep]),

    stop: useCallback(() => {
      // Call current step hide callback
      currentStepData?.onHide?.()
      
      dispatch({ type: 'STOP_TOUR' })
      
      // Announce tour end
      if (config?.screenReaderSupport !== false) {
        const announcements = getDefaultAnnouncements()
        announceToScreenReader(announcements.tourEnd, 'polite')
      }
    }, [config, currentStepData]),

    next: useCallback(() => {
      if (canGoNext) {
        currentStepData?.onHide?.()
        navigateToStep(state.currentStep + 1)
      }
    }, [canGoNext, currentStepData, navigateToStep, state.currentStep]),

    previous: useCallback(() => {
      if (canGoPrevious) {
        currentStepData?.onHide?.()
        navigateToStep(state.currentStep - 1)
      }
    }, [canGoPrevious, currentStepData, navigateToStep, state.currentStep]),

    goToStep: useCallback((index: number) => {
      currentStepData?.onHide?.()
      navigateToStep(index)
    }, [currentStepData, navigateToStep]),

    skip: useCallback(() => {
      controls.stop()
      config?.onSkip?.()
    }, [config])
  }

  // Keyboard navigation
  useEffect(() => {
    if (!state.isActive || config?.keyboardNavigation === false) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const handled = handleKeyboardNavigation(event, {
        onEscape: controls.stop,
        onNext: controls.next,
        onPrevious: controls.previous,
        onSkip: controls.skip
      })

      if (handled) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    eventManagerRef.current?.add(document, 'keydown', handleKeyDown as EventListener)

    return () => {
      eventManagerRef.current?.remove(document, 'keydown', handleKeyDown as EventListener)
    }
  }, [state.isActive, config?.keyboardNavigation, controls])

  // Context value
  const contextValue: TourContextValue = {
    config: config || null,
    state,
    controls,
    canGoNext,
    canGoPrevious,
    progress,
    currentStepData
  }

  return (
    <TourContext.Provider value={contextValue}>
      {children}
    </TourContext.Provider>
  )
}

// Hook to use tour context
export function useTourContext(): TourContextValue {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTourContext must be used within a TourProvider')
  }
  return context
}