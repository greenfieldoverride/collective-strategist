import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TourSpotlightProps } from '../types/tour'
import { getElementBounds } from '../utils/positioning'
import { createResizeObserver, EventListenerManager } from '../utils/performance'

export function TourSpotlight({ 
  targetElement, 
  isVisible, 
  className = '' 
}: TourSpotlightProps) {
  const [bounds, setBounds] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const eventManagerRef = useRef<EventListenerManager | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Initialize event manager
  useEffect(() => {
    eventManagerRef.current = new EventListenerManager()
    return () => {
      eventManagerRef.current?.removeAll()
    }
  }, [])

  // Update spotlight position when target element changes or moves
  const updateSpotlight = React.useCallback(() => {
    if (!targetElement || !isVisible) {
      setBounds(null)
      return
    }

    try {
      const elementBounds = getElementBounds(targetElement)
      setBounds({
        top: elementBounds.top,
        left: elementBounds.left,
        width: elementBounds.width,
        height: elementBounds.height
      })
    } catch (error) {
      console.warn('Failed to update spotlight position:', error)
      setBounds(null)
    }
  }, [targetElement, isVisible])

  // Update spotlight on element changes
  useEffect(() => {
    updateSpotlight()
  }, [updateSpotlight])

  // Listen for window resize and scroll
  useEffect(() => {
    if (!isVisible || !targetElement) return

    const eventManager = eventManagerRef.current
    if (!eventManager) return

    // Throttled handlers for performance
    eventManager.addThrottled(window, 'resize', updateSpotlight, 16)
    eventManager.addThrottled(window, 'scroll', updateSpotlight, 16)

    return () => {
      eventManager.removeAll()
    }
  }, [isVisible, targetElement, updateSpotlight])

  // Observe target element for size changes
  useEffect(() => {
    if (!isVisible || !targetElement) {
      resizeObserverRef.current?.disconnect()
      return
    }

    const resizeObserver = createResizeObserver(() => {
      updateSpotlight()
    })

    if (resizeObserver) {
      resizeObserver.observe(targetElement)
      resizeObserverRef.current = resizeObserver
    }

    return () => {
      resizeObserver?.disconnect()
    }
  }, [isVisible, targetElement, updateSpotlight])

  if (!isVisible || !bounds) return null

  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: bounds.top,
    left: bounds.left,
    width: bounds.width,
    height: bounds.height,
    pointerEvents: 'none',
    zIndex: 10000
  }

  const spotlightElement = (
    <div
      className={`tour-spotlight ${className}`}
      style={spotlightStyle}
      aria-hidden="true"
    />
  )

  return createPortal(spotlightElement, document.body)
}