export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let previous = 0

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now()

    if (!previous) previous = now

    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func(...args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func(...args)
      }, remaining)
    }
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

export class EventListenerManager {
  private listeners: Array<{
    element: Element | Window | Document
    event: string
    handler: EventListener
    options?: boolean | AddEventListenerOptions
  }> = []

  add(
    element: Element | Window | Document,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options)
    this.listeners.push({ element, event, handler, options })
  }

  addThrottled(
    element: Element | Window | Document,
    event: string,
    handler: EventListener,
    throttleMs: number = 16,
    options?: boolean | AddEventListenerOptions
  ): void {
    const throttledHandler = throttle(handler, throttleMs)
    this.add(element, event, throttledHandler as EventListener, options)
  }

  addDebounced(
    element: Element | Window | Document,
    event: string,
    handler: EventListener,
    debounceMs: number = 250,
    options?: boolean | AddEventListenerOptions
  ): void {
    const debouncedHandler = debounce(handler, debounceMs)
    this.add(element, event, debouncedHandler as EventListener, options)
  }

  removeAll(): void {
    this.listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options)
    })
    this.listeners = []
  }

  remove(
    element: Element | Window | Document,
    event: string,
    handler: EventListener
  ): void {
    element.removeEventListener(event, handler)
    this.listeners = this.listeners.filter(
      listener => 
        listener.element !== element ||
        listener.event !== event ||
        listener.handler !== handler
    )
  }
}

export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !window.IntersectionObserver) {
    return null
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
    ...options
  })
}

export function createResizeObserver(
  callback: ResizeObserverCallback
): ResizeObserver | null {
  if (typeof window === 'undefined' || !window.ResizeObserver) {
    return null
  }

  return new ResizeObserver(callback)
}

export function raf(callback: () => void): number {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) {
    return setTimeout(callback, 16) as unknown as number
  }

  return window.requestAnimationFrame(callback)
}

export function cancelRaf(id: number): void {
  if (typeof window === 'undefined' || !window.cancelAnimationFrame) {
    clearTimeout(id)
    return
  }

  window.cancelAnimationFrame(id)
}

export function isElementVisible(element: Element): boolean {
  if (typeof window === 'undefined') return false

  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    parseFloat(style.opacity) > 0
  )
}

export function waitForElement(
  selector: string,
  timeout: number = 5000,
  root: Document | Element = document
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = root.querySelector(selector)
    
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const element = root.querySelector(selector)
      if (element) {
        obs.disconnect()
        resolve(element)
      }
    })

    observer.observe(root, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`))
    }, timeout)
  })
}