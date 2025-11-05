import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import { VentureProvider } from '../../contexts/VentureContext'

// Test wrapper that provides VentureProvider
interface TestWrapperProps {
  children: React.ReactNode
  ventureId?: string | null
}

const TestWrapper = ({ children, ventureId = 'test-venture-123' }: TestWrapperProps) => {
  return (
    <VentureProvider ventureId={ventureId}>
      {children}
    </VentureProvider>
  )
}

// Custom render function that includes VentureProvider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  ventureId?: string | null
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { ventureId, ...renderOptions } = options
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper ventureId={ventureId}>{children}</TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock context values for testing
export const mockVentureContextValue = {
  ventureId: 'test-venture-123',
  calendarEvents: [],
  addCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  removeCalendarEvent: vi.fn(),
  getEventsByType: vi.fn(() => []),
  getEventsByDateRange: vi.fn(() => []),
  sharedAssets: [],
  addSharedAsset: vi.fn(),
  updateAssetUsage: vi.fn(),
  getAssetsByTags: vi.fn(() => []),
  notifications: [],
  addNotification: vi.fn(),
  markNotificationRead: vi.fn(),
  getUnreadNotifications: vi.fn(() => []),
  calendarConnections: {
    google: { connected: false },
    outlook: { connected: false }
  },
  connectCalendar: vi.fn(),
  disconnectCalendar: vi.fn(),
  syncExternalCalendar: vi.fn()
}

export const mockCrossFeatureIntegration = {
  publishContentToSocial: vi.fn(),
  scheduleContentDeadline: vi.fn(),
  scheduleSocialPost: vi.fn(),
  shareAssetBetweenFeatures: vi.fn()
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override the default render
export { customRender as render }