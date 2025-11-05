import type { AriaAttributes, ScreenReaderAnnouncements } from '../types/accessibility'

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return

  // Create or get existing announcement element
  let announcer = document.getElementById('tour-announcer')
  
  if (!announcer) {
    announcer = document.createElement('div')
    announcer.id = 'tour-announcer'
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.style.position = 'absolute'
    announcer.style.left = '-10000px'
    announcer.style.width = '1px'
    announcer.style.height = '1px'
    announcer.style.overflow = 'hidden'
    document.body.appendChild(announcer)
  }

  // Clear and set new message
  announcer.textContent = ''
  setTimeout(() => {
    announcer!.textContent = message
  }, 100)
}

export function manageFocus(element: Element | null, restoreFocus = true): () => void {
  const previousActiveElement = document.activeElement as HTMLElement

  if (element && 'focus' in element) {
    (element as HTMLElement).focus()
  }

  return () => {
    if (restoreFocus && previousActiveElement && 'focus' in previousActiveElement) {
      previousActiveElement.focus()
    }
  }
}

export function trapFocus(container: Element): () => void {
  const focusableElements = getFocusableElements(container)
  const firstFocusable = focusableElements[0] as HTMLElement
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

  function handleKeyDown(event: Event) {
    const keyboardEvent = event as KeyboardEvent
    if (keyboardEvent.key !== 'Tab') return

    if (keyboardEvent.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        keyboardEvent.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        keyboardEvent.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)
  
  // Focus first element
  firstFocusable?.focus()

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

export function getFocusableElements(container: Element): Element[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
  ].join(', ')

  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter(element => {
      const style = window.getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
}

export function getAriaAttributes(
  step: { title: string; content: string; ariaLabel?: string },
  currentIndex: number,
  totalSteps: number
): AriaAttributes {
  return {
    role: 'dialog',
    'aria-label': step.ariaLabel || `Tour step ${currentIndex + 1} of ${totalSteps}: ${step.title}`,
    'aria-describedby': 'tour-content',
    'aria-live': 'polite',
    'aria-atomic': true
  }
}

export function handleKeyboardNavigation(
  event: KeyboardEvent,
  handlers: {
    onEscape?: () => void
    onNext?: () => void
    onPrevious?: () => void
    onSkip?: () => void
  }
): boolean {
  const { key, ctrlKey, metaKey } = event
  
  switch (key) {
    case 'Escape':
      handlers.onEscape?.()
      return true
      
    case 'ArrowRight':
    case 'ArrowDown':
      if (!ctrlKey && !metaKey) {
        handlers.onNext?.()
        return true
      }
      break
      
    case 'ArrowLeft':
    case 'ArrowUp':
      if (!ctrlKey && !metaKey) {
        handlers.onPrevious?.()
        return true
      }
      break
      
    case 's':
    case 'S':
      if (ctrlKey || metaKey) {
        handlers.onSkip?.()
        return true
      }
      break
  }
  
  return false
}

export function supportsReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia && 
         window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function supportsHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia && 
         window.matchMedia('(prefers-contrast: high)').matches
}

export function createAccessibleId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`
}

export function getDefaultAnnouncements(): ScreenReaderAnnouncements {
  return {
    tourStart: 'Interactive tour started. Use arrow keys to navigate, Escape to exit.',
    tourEnd: 'Tour completed.',
    stepChange: (current, total, title) => 
      `Step ${current} of ${total}: ${title}. Use arrow keys to navigate.`,
    navigationHelp: 'Press Escape to exit, arrow keys to navigate, Enter to interact.',
    skipAvailable: 'Press Control+S to skip tour.'
  }
}