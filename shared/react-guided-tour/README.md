# @greenfield/react-guided-tour

An accessibility-first, mobile-optimized React tour component library.

## Features

✅ **Accessibility First**
- Screen reader support with ARIA live regions
- Keyboard navigation (Arrow keys, Escape, Tab)
- High contrast mode support
- Focus management and trapping
- Respects `prefers-reduced-motion`

✅ **Mobile Optimized**  
- Touch-friendly controls (44px+ touch targets)
- Responsive layouts (bottom sheet, fullscreen, adaptive)
- Swipe gesture support
- Mobile breakpoint detection

✅ **Performance Optimized**
- Event-driven architecture
- Throttled scroll/resize handlers  
- Intersection Observer for visibility
- Lazy loading support
- RequestAnimationFrame for smooth animations

✅ **Auto-Positioning**
- Smart positioning algorithm
- Auto-scroll to bring elements into view
- Collision detection with viewport boundaries
- Works with virtual scrolling containers

✅ **Rich Content Support**
- Mixed media (images, videos, components)
- React components as step content
- Syntax highlighted code snippets
- Interactive forms and elements

## Installation

```bash
npm install @greenfield/react-guided-tour
```

## Basic Usage

```typescript
import { 
  calculateOptimalPosition, 
  autoScrollToElement,
  announceToScreenReader 
} from '@greenfield/react-guided-tour'
import '@greenfield/react-guided-tour/styles'

// Position a tooltip relative to a target element
const position = calculateOptimalPosition(
  targetElement, 
  tooltipElement, 
  'auto' // placement preference
)

// Auto-scroll to bring element into view
await autoScrollToElement(element, 'smooth')

// Announce to screen readers
announceToScreenReader('Tour step completed', 'polite')
```

## Advanced Features

### Smart Positioning
```typescript
import { calculateOptimalPosition, getElementBounds } from '@greenfield/react-guided-tour'

const position = calculateOptimalPosition(
  document.querySelector('.target'),
  document.querySelector('.tooltip'),
  'top', // preferred placement
  { x: 10, y: 10 } // offset
)
// Returns: { x: 100, y: 50, placement: 'bottom' } (flipped if no space)
```

### Accessibility Utilities
```typescript
import { 
  manageFocus, 
  trapFocus, 
  handleKeyboardNavigation 
} from '@greenfield/react-guided-tour'

// Manage focus with restoration
const restoreFocus = manageFocus(document.querySelector('.tour-content'))
// Later: restoreFocus()

// Trap focus within container
const releaseTrap = trapFocus(document.querySelector('.modal'))
// Later: releaseTrap()

// Handle keyboard navigation
const handled = handleKeyboardNavigation(event, {
  onEscape: () => closeTour(),
  onNext: () => nextStep(),
  onPrevious: () => prevStep()
})
```

### Performance Utilities
```typescript
import { 
  EventListenerManager, 
  throttle, 
  createIntersectionObserver 
} from '@greenfield/react-guided-tour'

// Manage event listeners efficiently
const eventManager = new EventListenerManager()
eventManager.addThrottled(window, 'scroll', handleScroll, 16)
eventManager.addDebounced(window, 'resize', handleResize, 250)
// Cleanup: eventManager.removeAll()

// Throttle expensive operations
const throttledUpdate = throttle(updatePosition, 16)

// Observe element visibility
const observer = createIntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      showTourStep(entry.target)
    }
  })
})
```

## Styling

The library includes comprehensive CSS with:
- Light/dark theme support
- High contrast mode
- Reduced motion respect
- Mobile responsiveness
- Touch-friendly interactions

```css
/* Import base styles */
@import '@greenfield/react-guided-tour/styles';

/* Customize theme */
.tour-tooltip {
  --tour-bg: #2d2d2d;
  --tour-text: #e5e5e5;
  --tour-primary: #007bff;
}
```

## Mobile Layouts

```typescript
import { isMobile, supportsTouch } from '@greenfield/react-guided-tour'

if (isMobile(768)) {
  // Use mobile-optimized layout
  // Bottom sheet or fullscreen modal
}

if (supportsTouch()) {
  // Enable swipe gestures
  // Larger touch targets
}
```

## Browser Support

- Modern browsers with ES2018+ support
- React 16.8+ (hooks support)
- Graceful degradation for older browsers
- SSR compatible (checks for `window` object)

## TypeScript

Fully typed with comprehensive TypeScript definitions included.

```typescript
import type { 
  Placement, 
  Position, 
  ScrollBehavior,
  AccessibilityConfig 
} from '@greenfield/react-guided-tour'
```

## License

Liberation License - Built for the open source community

## Contributing

This library is part of the Greenfield Collective's open source initiatives. We welcome contributions that improve accessibility, performance, and usability for all users.