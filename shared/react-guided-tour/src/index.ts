// Types
export type {
  Placement,
  ScrollBehavior,
  TriggerType,
  MobileLayout,
  Position,
  ElementBounds
} from './types/base'

export type {
  AccessibilityConfig,
  AriaAttributes,
  KeyboardHandlers,
  ScreenReaderAnnouncements
} from './types/accessibility'

export type {
  TourStep,
  TourConfig,
  TourState,
  TourContextValue,
  TourProviderProps,
  TourOverlayProps,
  TourSpotlightProps,
  TourTooltipProps,
  TourProgressProps,
  UseTourOptions,
  UseTourReturn
} from './types/tour'

// Components
export { Tour } from './components/Tour'
export { TourProvider, useTourContext } from './components/TourProvider'
export { TourOverlay } from './components/TourOverlay'
export { TourSpotlight } from './components/TourSpotlight'
export { TourTooltip } from './components/TourTooltip'
export { TourControls } from './components/TourControls'

// Hooks
export { useTour } from './hooks/useTour'

// Utilities
export {
  getElementBounds,
  getViewportSize,
  calculateOptimalPosition,
  isMobile,
  supportsTouch,
  getScrollParent
} from './utils/positioning'

export {
  autoScrollToElement,
  isElementInViewport,
  shouldReduceMotion,
  getScrollableParent,
  scrollElementIntoView
} from './utils/scrolling'

export {
  announceToScreenReader,
  manageFocus,
  trapFocus,
  getFocusableElements,
  handleKeyboardNavigation,
  supportsReducedMotion,
  supportsHighContrast,
  createAccessibleId,
  getDefaultAnnouncements
} from './utils/accessibility'

export {
  throttle,
  debounce,
  EventListenerManager,
  createIntersectionObserver,
  createResizeObserver,
  raf,
  cancelRaf,
  isElementVisible,
  waitForElement
} from './utils/performance'

// Default announcements
export { defaultAnnouncements } from './types/accessibility'

// CSS import path for consumers
export const styles = '@greenfield/react-guided-tour/styles'