import React from 'react'
import { TourProvider, useTourContext } from './TourProvider'
import { TourOverlay } from './TourOverlay'
import { TourSpotlight } from './TourSpotlight'
import { TourTooltip } from './TourTooltip'
import type { TourConfig } from '../types/tour'

interface TourProps {
  config: TourConfig
  onConfigChange?: (config: TourConfig) => void
  children?: React.ReactNode
}

export function Tour({ config, onConfigChange, children }: TourProps) {
  return (
    <TourProvider config={config} onConfigChange={onConfigChange}>
      {children}
      <TourRenderer />
    </TourProvider>
  )
}

function TourRenderer() {
  const { state, currentStepData, controls, config } = useTourContext()

  if (!state.isActive || !currentStepData || !config) {
    return null
  }

  // Get target element
  let targetElement: Element | null = null
  if (currentStepData.target) {
    if (typeof currentStepData.target === 'string') {
      targetElement = document.querySelector(currentStepData.target)
    } else {
      targetElement = currentStepData.target
    }
  }

  const handleMaskClick = () => {
    if (config.maskClickToClose !== false) {
      controls.stop()
    }
  }

  return (
    <>
      <TourOverlay
        isVisible={state.isActive}
        onMaskClick={handleMaskClick}
        className={config.className}
      />
      
      <TourSpotlight
        targetElement={targetElement}
        isVisible={state.isActive}
        className={config.className}
      />
      
      <TourTooltip
        step={currentStepData}
        targetElement={targetElement}
        isVisible={state.isActive}
        onNext={controls.next}
        onPrevious={controls.previous}
        onSkip={controls.skip}
        onClose={controls.stop}
        className={config.className}
      />
    </>
  )
}