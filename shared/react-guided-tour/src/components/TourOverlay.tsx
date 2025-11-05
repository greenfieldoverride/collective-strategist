import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { TourOverlayProps } from '../types/tour'
import { manageFocus } from '../utils/accessibility'

export function TourOverlay({ 
  isVisible, 
  onMaskClick, 
  className = '' 
}: TourOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<(() => void) | null>(null)

  // Manage focus when overlay becomes visible
  useEffect(() => {
    if (isVisible && overlayRef.current) {
      // Save current focus and focus the overlay
      restoreFocusRef.current = manageFocus(overlayRef.current, true)
    } else if (!isVisible && restoreFocusRef.current) {
      // Restore focus when overlay becomes invisible
      restoreFocusRef.current()
      restoreFocusRef.current = null
    }

    return () => {
      if (restoreFocusRef.current) {
        restoreFocusRef.current()
        restoreFocusRef.current = null
      }
    }
  }, [isVisible])

  // Prevent body scroll when overlay is active
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isVisible])

  if (!isVisible) return null

  const handleMaskClick = (event: React.MouseEvent) => {
    // Only trigger if clicking directly on the mask
    if (event.target === event.currentTarget) {
      onMaskClick?.()
    }
  }

  const overlayElement = (
    <div
      ref={overlayRef}
      className={`tour-overlay ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tour overlay"
      tabIndex={-1}
    >
      <div 
        className="tour-mask"
        onClick={handleMaskClick}
        aria-hidden="true"
      />
    </div>
  )

  // Render in portal to ensure proper stacking
  return createPortal(overlayElement, document.body)
}