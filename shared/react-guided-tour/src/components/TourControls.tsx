
import React from 'react'

interface TourControlsProps {
  currentStep?: number
  totalSteps?: number
  canGoNext?: boolean
  canGoPrevious?: boolean
  showProgress?: boolean
  showSkip?: boolean
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  onClose?: () => void
  className?: string
}

export function TourControls({
  currentStep = 0,
  totalSteps = 1,
  canGoNext = false,
  canGoPrevious = false,
  showProgress = true,
  showSkip = true,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  className = ''
}: TourControlsProps) {
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  return (
    <div className={`tour-controls ${className}`}>
      {showProgress && (
        <div className="tour-progress">
          <span className="tour-step-indicator">
            {currentStep + 1} of {totalSteps}
          </span>
          <div className="tour-progress-bar">
            <div 
              className="tour-progress-fill" 
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <div className="tour-buttons">
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="tour-button skip"
            aria-label="Skip tour"
          >
            Skip Tour
          </button>
        )}

        <div className="tour-nav-buttons">
          {onPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="tour-button"
              aria-label="Previous step"
            >
              Previous
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="tour-button primary"
              aria-label={canGoNext ? "Next step" : "Complete tour"}
            >
              {canGoNext ? 'Next' : 'Finish'}
            </button>
          )}

          {onClose && !onNext && (
            <button
              type="button"
              onClick={onClose}
              className="tour-button primary"
              aria-label="Close tour"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}