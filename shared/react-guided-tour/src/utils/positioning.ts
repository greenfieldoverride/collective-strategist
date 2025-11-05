import type { Placement, Position, ElementBounds } from '../types/base'

export function getElementBounds(element: Element): ElementBounds {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right
  }
}

export function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

export function calculateOptimalPosition(
  targetElement: Element,
  tooltipElement: Element,
  preferredPlacement: Placement = 'auto',
  offset: { x: number; y: number } = { x: 10, y: 10 }
): Position {
  const targetBounds = getElementBounds(targetElement)
  const tooltipBounds = getElementBounds(tooltipElement)
  const viewport = getViewportSize()
  
  // Calculate available space in each direction
  const spaceTop = targetBounds.top
  const spaceBottom = viewport.height - targetBounds.bottom
  const spaceLeft = targetBounds.left
  const spaceRight = viewport.width - targetBounds.right
  
  let placement: Placement = preferredPlacement
  
  // Auto-placement logic
  if (placement === 'auto') {
    // Find the side with the most space
    const spaces = {
      top: spaceTop,
      bottom: spaceBottom,
      left: spaceLeft,
      right: spaceRight
    }
    
    placement = Object.entries(spaces).reduce((a, b) => 
      spaces[a[0] as keyof typeof spaces] > spaces[b[0] as keyof typeof spaces] ? a : b
    )[0] as Placement
  }
  
  let x: number, y: number
  
  switch (placement) {
    case 'top':
      x = targetBounds.left + (targetBounds.width / 2) - (tooltipBounds.width / 2)
      y = targetBounds.top - tooltipBounds.height - offset.y
      
      // Check if tooltip would overflow viewport
      if (y < 0) {
        placement = 'bottom'
        y = targetBounds.bottom + offset.y
      }
      break
      
    case 'bottom':
      x = targetBounds.left + (targetBounds.width / 2) - (tooltipBounds.width / 2)
      y = targetBounds.bottom + offset.y
      
      if (y + tooltipBounds.height > viewport.height) {
        placement = 'top'
        y = targetBounds.top - tooltipBounds.height - offset.y
      }
      break
      
    case 'left':
      x = targetBounds.left - tooltipBounds.width - offset.x
      y = targetBounds.top + (targetBounds.height / 2) - (tooltipBounds.height / 2)
      
      if (x < 0) {
        placement = 'right'
        x = targetBounds.right + offset.x
      }
      break
      
    case 'right':
      x = targetBounds.right + offset.x
      y = targetBounds.top + (targetBounds.height / 2) - (tooltipBounds.height / 2)
      
      if (x + tooltipBounds.width > viewport.width) {
        placement = 'left'
        x = targetBounds.left - tooltipBounds.width - offset.x
      }
      break
      
    default:
      x = targetBounds.right + offset.x
      y = targetBounds.top
      placement = 'right'
  }
  
  // Ensure tooltip stays within viewport bounds
  x = Math.max(10, Math.min(x, viewport.width - tooltipBounds.width - 10))
  y = Math.max(10, Math.min(y, viewport.height - tooltipBounds.height - 10))
  
  return { x, y, placement }
}

export function isMobile(breakpoint: number = 768): boolean {
  return window.innerWidth <= breakpoint
}

export function supportsTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function getScrollParent(element: Element): Element {
  let parent = element.parentElement
  
  while (parent) {
    const style = getComputedStyle(parent)
    if (style.overflow !== 'visible' || style.overflowY !== 'visible') {
      return parent
    }
    parent = parent.parentElement
  }
  
  return document.documentElement
}