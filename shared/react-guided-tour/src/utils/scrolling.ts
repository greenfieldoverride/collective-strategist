import type { ScrollBehavior } from '../types/base'

export function autoScrollToElement(
  element: Element, 
  behavior: ScrollBehavior = 'smooth',
  offset: { top: number; left: number } = { top: 100, left: 0 }
): Promise<void> {
  return new Promise((resolve) => {
    if (behavior === 'none') {
      resolve()
      return
    }

    // Check if element is already in viewport
    if (isElementInViewport(element, offset)) {
      resolve()
      return
    }

    const rect = element.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    
    const targetY = scrollTop + rect.top - offset.top
    const targetX = scrollLeft + rect.left - offset.left

    // Respect prefers-reduced-motion
    const actualBehavior = shouldReduceMotion() ? 'auto' : behavior

    const scrollOptions: ScrollToOptions = {
      top: Math.max(0, targetY),
      left: Math.max(0, targetX),
      behavior: actualBehavior === 'instant' ? 'auto' : (actualBehavior as 'auto' | 'smooth')
    }

    window.scrollTo(scrollOptions)

    // For smooth scrolling, wait for completion
    if (actualBehavior === 'smooth') {
      // Estimate scroll duration and wait
      const distance = Math.abs(targetY - scrollTop)
      const duration = Math.min(1000, distance * 0.5) // Max 1s, 0.5ms per pixel
      
      setTimeout(() => resolve(), duration)
    } else {
      // For instant scrolling, resolve immediately
      setTimeout(() => resolve(), 0)
    }
  })
}

export function isElementInViewport(
  element: Element, 
  offset: { top: number; left: number } = { top: 0, left: 0 }
): boolean {
  const rect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth

  return (
    rect.top >= offset.top &&
    rect.left >= offset.left &&
    rect.bottom <= viewportHeight - offset.top &&
    rect.right <= viewportWidth - offset.left
  )
}

export function shouldReduceMotion(): boolean {
  // Check CSS prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return false
}

export function getScrollableParent(element: Element): Element {
  let parent = element.parentElement

  while (parent) {
    const { overflow, overflowY, overflowX } = window.getComputedStyle(parent)
    
    if (
      overflow !== 'visible' ||
      overflowY !== 'visible' ||
      overflowX !== 'visible'
    ) {
      return parent
    }
    
    parent = parent.parentElement
  }

  return document.documentElement
}

export function scrollElementIntoView(
  element: Element,
  container: Element = document.documentElement,
  behavior: ScrollBehavior = 'smooth'
): Promise<void> {
  return new Promise((resolve) => {
    if (behavior === 'none') {
      resolve()
      return
    }

    const elementRect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Calculate if element is outside container viewport
    const isAbove = elementRect.top < containerRect.top
    const isBelow = elementRect.bottom > containerRect.bottom
    const isLeft = elementRect.left < containerRect.left
    const isRight = elementRect.right > containerRect.right

    if (!isAbove && !isBelow && !isLeft && !isRight) {
      resolve()
      return
    }

    // Calculate scroll position
    let scrollTop = container.scrollTop
    let scrollLeft = container.scrollLeft

    if (isAbove) {
      scrollTop += elementRect.top - containerRect.top - 20 // 20px padding
    } else if (isBelow) {
      scrollTop += elementRect.bottom - containerRect.bottom + 20
    }

    if (isLeft) {
      scrollLeft += elementRect.left - containerRect.left - 20
    } else if (isRight) {
      scrollLeft += elementRect.right - containerRect.right + 20
    }

    const actualBehavior = shouldReduceMotion() ? 'auto' : behavior

    container.scrollTo({
      top: Math.max(0, scrollTop),
      left: Math.max(0, scrollLeft),
      behavior: actualBehavior === 'instant' ? 'auto' : (actualBehavior as 'auto' | 'smooth')
    })

    if (actualBehavior === 'smooth') {
      setTimeout(() => resolve(), 500)
    } else {
      setTimeout(() => resolve(), 0)
    }
  })
}