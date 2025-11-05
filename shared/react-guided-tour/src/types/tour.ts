import type React from 'react'
import type { Placement, ScrollBehavior, TriggerType, MobileLayout, Position } from './base'

export interface TourStep {
  id: string
  title: string
  content: React.ReactNode
  target?: string | Element
  placement?: Placement
  offset?: { x: number; y: number }
  
  // Accessibility
  ariaLabel?: string
  announceOnEntry?: string
  skipToTarget?: boolean
  
  // Media support
  media?: {
    type: 'image' | 'video' | 'iframe' | 'component'
    src?: string
    component?: React.ComponentType
    alt?: string
    width?: number
    height?: number
  }
  
  // Interaction
  trigger?: TriggerType
  waitFor?: string | (() => Promise<boolean>)
  
  // Behavior
  disableInteraction?: boolean
  allowClickThrough?: boolean
  scrollBehavior?: ScrollBehavior
  
  // Styling
  className?: string
  style?: React.CSSProperties
  
  // Events
  onShow?: () => void
  onHide?: () => void
  onTargetClick?: () => void
}

export interface TourConfig {
  id: string
  steps: TourStep[]
  
  // Accessibility
  keyboardNavigation?: boolean
  screenReaderSupport?: boolean
  highContrastMode?: boolean
  reducedMotion?: boolean
  
  // Mobile optimization
  mobileBreakpoint?: number
  mobileLayout?: MobileLayout
  
  // Performance
  lazyLoad?: boolean
  eventThrottling?: number
  
  // Behavior
  maskClickToClose?: boolean
  escapeToClose?: boolean
  showProgress?: boolean
  showSkip?: boolean
  
  // Styling
  theme?: 'light' | 'dark' | 'auto'
  className?: string
  
  // Callbacks
  onStart?: () => void
  onComplete?: () => void
  onSkip?: () => void
  onStepChange?: (step: TourStep, index: number) => void
  onError?: (error: Error, step?: TourStep) => void
}

export interface TourState {
  isActive: boolean
  currentStep: number
  totalSteps: number
  isLoading: boolean
  error?: Error
}

export interface TourControls {
  start: () => void
  stop: () => void
  next: () => void
  previous: () => void
  goToStep: (index: number) => void
  skip: () => void
}

export interface TourContextValue {
  config: TourConfig | null
  state: TourState
  controls: TourControls
  
  // Computed values
  canGoNext: boolean
  canGoPrevious: boolean
  progress: number
  currentStepData?: TourStep
}

// Component Props
export interface TourProviderProps {
  children: React.ReactNode
  config?: TourConfig
  onConfigChange?: (config: TourConfig) => void
}

export interface TourOverlayProps {
  isVisible: boolean
  onMaskClick?: () => void
  className?: string
}

export interface TourSpotlightProps {
  targetElement: Element | null
  isVisible: boolean
  className?: string
}

export interface TourTooltipProps {
  step: TourStep
  targetElement: Element | null
  isVisible: boolean
  position?: Position
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  onClose?: () => void
  className?: string
}

export interface TourControlsProps {
  currentStep: number
  totalSteps: number
  canGoNext: boolean
  canGoPrevious: boolean
  showProgress?: boolean
  showSkip?: boolean
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  onClose?: () => void
  className?: string
}

export interface TourProgressProps {
  current: number
  total: number
  className?: string
}

// Hook interfaces
export interface UseTourOptions {
  config?: TourConfig
  autoStart?: boolean
  onComplete?: () => void
  onError?: (error: Error) => void
}

export interface UseTourReturn {
  isActive: boolean
  currentStep: number
  totalSteps: number
  progress: number
  currentStepData?: TourStep
  canGoNext: boolean
  canGoPrevious: boolean
  
  // Actions
  start: (config?: TourConfig) => void
  stop: () => void
  next: () => void
  previous: () => void
  goToStep: (index: number) => void
  skip: () => void
  
  // State
  isLoading: boolean
  error?: Error
}