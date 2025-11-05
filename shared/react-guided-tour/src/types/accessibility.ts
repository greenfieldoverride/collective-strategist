export interface AccessibilityConfig {
  keyboardNavigation: boolean
  screenReaderSupport: boolean
  highContrastMode: boolean
  reducedMotion: boolean
  announceSteps: boolean
  focusManagement: boolean
}

export interface AriaAttributes {
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-atomic'?: boolean
  'aria-current'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
}

export interface KeyboardHandlers {
  onEscape?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onEnter?: () => void
  onSpace?: () => void
  onTab?: (event: KeyboardEvent) => void
}

export interface ScreenReaderAnnouncements {
  tourStart: string
  tourEnd: string
  stepChange: (current: number, total: number, title: string) => string
  navigationHelp: string
  skipAvailable: string
}

export const defaultAnnouncements: ScreenReaderAnnouncements = {
  tourStart: 'Interactive tour started. Use arrow keys to navigate, Escape to exit.',
  tourEnd: 'Tour completed.',
  stepChange: (current, total, title) => 
    `Step ${current} of ${total}: ${title}. Use arrow keys to navigate.`,
  navigationHelp: 'Press Escape to exit, arrow keys to navigate, Enter to interact.',
  skipAvailable: 'Press S to skip tour.'
}