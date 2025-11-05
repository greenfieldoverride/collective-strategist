export type Placement = 'auto' | 'top' | 'bottom' | 'left' | 'right'
export type ScrollBehavior = 'auto' | 'instant' | 'smooth' | 'none'
export type TriggerType = 'manual' | 'click' | 'hover' | 'focus' | 'intersect'
export type MobileLayout = 'bottom' | 'fullscreen' | 'adaptive'

export interface Position {
  x: number
  y: number
  placement: Placement
}

export interface ElementBounds {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}