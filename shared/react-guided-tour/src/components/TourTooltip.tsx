import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TourTooltipProps } from '../types/tour'
import type { Position } from '../types/base'
import { calculateOptimalPosition, isMobile } from '../utils/positioning'
import { trapFocus, createAccessibleId } from '../utils/accessibility'
import { EventListenerManager } from '../utils/performance'
import { TourControls } from './TourControls'

export function TourTooltip({
  step,
  targetElement,
  isVisible,
  position: providedPosition,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  className = ''
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const eventManagerRef = useRef<EventListenerManager | null>(null)
  const releaseFocusTrapRef = useRef<(() => void) | null>(null)
  const titleId = useRef(createAccessibleId('tour-title'))
  const contentId = useRef(createAccessibleId('tour-content'))

  // Initialize event manager
  useEffect(() => {
    eventManagerRef.current = new EventListenerManager()
    return () => {
      eventManagerRef.current?.removeAll()
    }
  }, [])

  // Check mobile state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(isMobile(768))
    }
    
    checkMobile()
    eventManagerRef.current?.addThrottled(window, 'resize', checkMobile, 100)
    
    return () => {
      eventManagerRef.current?.removeAll()
    }
  }, [])

  // Calculate tooltip position
  const updatePosition = React.useCallback(() => {
    if (!isVisible || !tooltipRef.current || isMobileView) {
      setPosition(null)
      return
    }

    if (providedPosition) {
      setPosition(providedPosition)
      return
    }

    if (!targetElement) {
      // Center on screen if no target
      const rect = tooltipRef.current.getBoundingClientRect()
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
        placement: 'auto'
      })
      return
    }

    try {
      const optimalPosition = calculateOptimalPosition(
        targetElement,
        tooltipRef.current,
        step.placement || 'auto',
        step.offset || { x: 10, y: 10 }
      )
      setPosition(optimalPosition)
    } catch (error) {
      console.warn('Failed to calculate tooltip position:', error)
      setPosition(null)
    }
  }, [isVisible, targetElement, providedPosition, step.placement, step.offset, isMobileView])

  // Update position when dependencies change
  useEffect(() => {
    updatePosition()
  }, [updatePosition])

  // Listen for window events that affect positioning
  useEffect(() => {
    if (!isVisible) return

    const eventManager = eventManagerRef.current
    if (!eventManager) return

    eventManager.addThrottled(window, 'resize', updatePosition, 16)
    eventManager.addThrottled(window, 'scroll', updatePosition, 16)

    return () => {
      eventManager.removeAll()
    }
  }, [isVisible, updatePosition])

  // Focus management
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      // Trap focus within tooltip
      releaseFocusTrapRef.current = trapFocus(tooltipRef.current)
    } else if (releaseFocusTrapRef.current) {
      releaseFocusTrapRef.current()
      releaseFocusTrapRef.current = null
    }

    return () => {
      if (releaseFocusTrapRef.current) {
        releaseFocusTrapRef.current()
        releaseFocusTrapRef.current = null
      }
    }
  }, [isVisible])

  if (!isVisible) return null

  // Mobile layout
  if (isMobileView) {
    const mobileElement = (
      <div
        ref={tooltipRef}
        className={`tour-tooltip tour-mobile-bottom ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={step.ariaLabel || `Tour step: ${step.title}`}
        aria-labelledby={titleId.current}
        aria-describedby={contentId.current}
      >
        <TooltipContent
          step={step}
          titleId={titleId.current}
          contentId={contentId.current}
          onNext={onNext}
          onPrevious={onPrevious}
          onSkip={onSkip}
          onClose={onClose}
        />
      </div>
    )

    return createPortal(mobileElement, document.body)
  }

  // Desktop/tablet positioned tooltip
  const tooltipStyle: React.CSSProperties = position ? {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 10001
  } : {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10001
  }

  const tooltipElement = (
    <div
      ref={tooltipRef}
      className={`tour-tooltip ${position?.placement ? `placement-${position.placement}` : ''} ${className}`}
      style={tooltipStyle}
      role="dialog"
      aria-modal="true"
      aria-label={step.ariaLabel || `Tour step: ${step.title}`}
      aria-labelledby={titleId.current}
      aria-describedby={contentId.current}
    >
      <TooltipContent
        step={step}
        titleId={titleId.current}
        contentId={contentId.current}
        onNext={onNext}
        onPrevious={onPrevious}
        onSkip={onSkip}
        onClose={onClose}
      />
    </div>
  )

  return createPortal(tooltipElement, document.body)
}

// Internal component for tooltip content
interface TooltipContentProps {
  step: TourTooltipProps['step']
  titleId: string
  contentId: string
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  onClose?: () => void
}

function TooltipContent({
  step,
  titleId,
  contentId,
  onNext,
  onPrevious,
  onSkip,
  onClose
}: TooltipContentProps) {
  return (
    <>
      <div className="tour-header">
        <h2 id={titleId} className="tour-title">
          {step.title}
        </h2>
      </div>

      <div id={contentId} className="tour-content">
        {/* Media content */}
        {step.media && (
          <div className="tour-media">
            {step.media.type === 'image' && (
              <img
                src={step.media.src}
                alt={step.media.alt || ''}
                width={step.media.width}
                height={step.media.height}
              />
            )}
            {step.media.type === 'video' && (
              <video
                src={step.media.src}
                controls
                width={step.media.width}
                height={step.media.height}
                aria-label={step.media.alt || 'Tour video'}
              >
                Your browser does not support the video tag.
              </video>
            )}
            {step.media.type === 'component' && step.media.component && (
              <step.media.component />
            )}
          </div>
        )}

        {/* Main content */}
        <div className="tour-step-content">
          {step.content}
        </div>
      </div>

      <TourControls
        onNext={onNext}
        onPrevious={onPrevious}
        onSkip={onSkip}
        onClose={onClose}
      />
    </>
  )
}