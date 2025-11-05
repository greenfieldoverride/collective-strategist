import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import DashboardWithVentures from '../DashboardWithVentures'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
})

// Wrapper component for router
const DashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock ventures API
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/ventures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [{
              id: 'test-venture-123',
              name: 'Test Venture',
              description: 'A test venture for integration testing',
              ventureType: 'professional',
              billingTier: 'professional',
              members: [],
              maxMembers: 5,
              coreValues: ['innovation', 'collaboration'],
              primaryGoals: ['growth', 'impact']
            }]
          })
        })
      }
      if (url.includes('/financial/quick-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              monthlyIncome: 5000,
              monthlyNet: 2000,
              activeGoals: 3,
              totalGoals: 5,
              activeStreams: 2,
              healthScore: 75
            }
          })
        })
      }
      // Default for content studio and social media APIs
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })
  })

  it('renders dashboard with venture selector and navigation', async () => {
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('The Collective Strategist')).toBeInTheDocument()
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Content Studio')).toBeInTheDocument()
      expect(screen.getByText('Social Media')).toBeInTheDocument()
    })
  })

  it('navigates to Content Studio and loads the component', async () => {
    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture')).toBeInTheDocument()
    })

    // Click on Content Studio in navigation
    await user.click(screen.getByText('Content Studio'))
    
    await waitFor(() => {
      expect(screen.getByText('Content Library')).toBeInTheDocument()
      expect(screen.getByText('Create Content')).toBeInTheDocument()
      expect(screen.getByText('Asset Manager')).toBeInTheDocument()
    })

    // Verify API calls for content studio
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/content-studio/content?ventureId=test-venture-123',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
    )
  })

  it('navigates to Social Media Hub and loads the component', async () => {
    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture')).toBeInTheDocument()
    })

    // Click on Social Media in navigation
    await user.click(screen.getByText('Social Media'))
    
    await waitFor(() => {
      expect(screen.getByText('Social Media Hub')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Publish')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    // Verify API calls for social media hub
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/social-media/accounts?ventureId=test-venture-123',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
    )
  })

  it('shows feature cards on overview that link to new components', async () => {
    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture Overview')).toBeInTheDocument()
      expect(screen.getByText('Create, manage, and approve content')).toBeInTheDocument()
      expect(screen.getByText('Share your message and connect')).toBeInTheDocument()
    })

    // Click Content Studio feature card
    await user.click(screen.getByText('Create Content'))
    
    await waitFor(() => {
      expect(screen.getByText('Content Library')).toBeInTheDocument()
    })

    // Go back to overview
    await user.click(screen.getByText('Overview'))
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture Overview')).toBeInTheDocument()
    })

    // Click Social Media feature card
    await user.click(screen.getByText('Manage Social'))
    
    await waitFor(() => {
      expect(screen.getByText('Social Media Hub')).toBeInTheDocument()
    })
  })

  it('maintains venture context across navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture')).toBeInTheDocument()
    })

    // Navigate to Content Studio
    await user.click(screen.getByText('Content Studio'))
    
    await waitFor(() => {
      expect(screen.getByText('Content Library')).toBeInTheDocument()
    })

    // Verify venture ID is passed correctly
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ventureId=test-venture-123'),
      expect.any(Object)
    )

    // Navigate to Social Media
    await user.click(screen.getByText('Social Media'))
    
    await waitFor(() => {
      expect(screen.getByText('Social Media Hub')).toBeInTheDocument()
    })

    // Verify venture ID is still correct
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ventureId=test-venture-123'),
      expect.any(Object)
    )
  })

  it('handles no venture selected state', async () => {
    // Mock empty ventures
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: []
      })
    }))

    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Welcome to The Collective Strategist')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Venture')).toBeInTheDocument()
    })

    // Try to navigate to Content Studio without venture
    await user.click(screen.getByText('Content Studio'))
    
    await waitFor(() => {
      expect(screen.getByText('No Venture Selected')).toBeInTheDocument()
      expect(screen.getByText('Please select or create a venture')).toBeInTheDocument()
    })
  })

  it('displays correct page headers for each section', async () => {
    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture Overview')).toBeInTheDocument()
    })

    // Navigate to Content Studio
    await user.click(screen.getByText('Content Studio'))
    
    await waitFor(() => {
      expect(screen.getByText('Content Studio')).toBeInTheDocument() // Page title
    })

    // Navigate to Social Media
    await user.click(screen.getByText('Social Media'))
    
    await waitFor(() => {
      expect(screen.getByText('Social Media Hub')).toBeInTheDocument() // Page title
      expect(screen.getByText('Manage social media for Test Venture')).toBeInTheDocument()
    })
  })

  it('preserves active tab state during navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Venture Overview')).toBeInTheDocument()
    })

    // Navigate to Content Studio
    await user.click(screen.getByText('Content Studio'))
    
    await waitFor(() => {
      expect(screen.getByText('Content Library')).toBeInTheDocument()
    })

    // Check that Content Studio nav item is active
    const contentNavItem = screen.getByTestId('nav-content')
    expect(contentNavItem).toHaveClass('active')

    // Navigate to Social Media
    await user.click(screen.getByText('Social Media'))
    
    await waitFor(() => {
      expect(screen.getByText('Social Media Hub')).toBeInTheDocument()
    })

    // Check that Social Media nav item is active
    const socialNavItem = screen.getByTestId('nav-social')
    expect(socialNavItem).toHaveClass('active')
  })

  it('loads financial stats and displays them correctly', async () => {
    render(
      <DashboardWrapper>
        <DashboardWithVentures />
      </DashboardWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByText('$5,000')).toBeInTheDocument() // Monthly income
      expect(screen.getByText('$2,000')).toBeInTheDocument() // Monthly net
      expect(screen.getByText('75/100')).toBeInTheDocument() // Health score
    })

    // Verify financial API was called
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/financial/quick-stats/test-venture-123',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
    )
  })

  describe('Error Handling', () => {
    it('handles API failures gracefully', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Server error'
        })
      }))

      render(
        <DashboardWrapper>
          <DashboardWithVentures />
        </DashboardWrapper>
      )
      
      // Should still render basic structure even with API failure
      await waitFor(() => {
        expect(screen.getByText('The Collective Strategist')).toBeInTheDocument()
        expect(screen.getByText('Overview')).toBeInTheDocument()
      })
    })

    it('shows loading states during initial load', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockFetch.mockReturnValueOnce(mockPromise)

      render(
        <DashboardWrapper>
          <DashboardWithVentures />
        </DashboardWrapper>
      )
      
      // Check that loading indicator appears
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [{
            id: 'test-venture-123',
            name: 'Test Venture',
            description: 'A test venture',
            ventureType: 'professional',
            billingTier: 'professional',
            members: [],
            maxMembers: 5
          }]
        })
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })
  })
})