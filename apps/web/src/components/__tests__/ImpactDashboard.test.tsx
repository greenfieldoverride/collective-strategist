import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImpactDashboard from '../ImpactDashboard'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('ImpactDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('token', 'mock-jwt-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  const mockImpactData = {
    success: true,
    data: {
      modules: [
        {
          id: 'community',
          name: 'Community Resilience',
          icon: '🌿',
          description: 'Building strong, interdependent communities that support each other',
          widgets: []
        },
        {
          id: 'knowledge',
          name: 'Knowledge Liberation',
          icon: '🧠',
          description: 'Sharing knowledge freely and building collective intelligence',
          widgets: []
        },
        {
          id: 'cultural',
          name: 'Cultural Impact',
          icon: '🎨',
          description: 'Creating and preserving culture that reflects our values',
          widgets: []
        },
        {
          id: 'movement',
          name: 'Movement Growth',
          icon: '🚀',
          description: 'Growing the liberation movement and inspiring others',
          widgets: []
        },
        {
          id: 'sovereignty',
          name: 'Personal Sovereignty',
          icon: '✊',
          description: 'Achieving independence from oppressive systems',
          widgets: []
        }
      ],
      lastSyncAt: new Date().toISOString(),
      connectedIntegrations: 0,
      totalMetrics: 0
    }
  }

  const mockAvailableIntegrations = {
    success: true,
    data: [
      {
        platform: 'github',
        name: 'GitHub',
        description: 'Track open source project impact and community growth',
        modules: ['knowledge'],
        icon: '🐙',
        isAvailable: true
      },
      {
        platform: 'patreon',
        name: 'Patreon',
        description: 'Track creator support and community funding',
        modules: ['cultural', 'community'],
        icon: '🎨',
        isAvailable: true
      },
      {
        platform: 'meetup',
        name: 'Meetup',
        description: 'Track real-world community building and event impact',
        modules: ['movement', 'community'],
        icon: '👥',
        isAvailable: true
      }
    ]
  }

  it('should render impact dashboard with five modules', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Impact Dashboard')).toBeInTheDocument()
    })

    // Verify all five modules are present
    expect(screen.getByText('Community Resilience')).toBeInTheDocument()
    expect(screen.getByText('Knowledge Liberation')).toBeInTheDocument()
    expect(screen.getByText('Cultural Impact')).toBeInTheDocument()
    expect(screen.getByText('Movement Growth')).toBeInTheDocument()
    expect(screen.getByText('Personal Sovereignty')).toBeInTheDocument()
  })

  it('should display liberation-focused module descriptions', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('Measure what truly matters for liberation and community building')).toBeInTheDocument()
    })

    // Check that liberation-focused descriptions are shown
    expect(screen.getByText(/interdependent communities/)).toBeInTheDocument()
    expect(screen.getByText(/knowledge freely/)).toBeInTheDocument()
    expect(screen.getByText(/oppressive systems/)).toBeInTheDocument()
  })

  it('should switch between modules when navigation buttons are clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('Impact Dashboard')).toBeInTheDocument()
    })

    // Default module should be Community Resilience
    expect(screen.getByText('Building strong, interdependent communities that support each other')).toBeInTheDocument()

    // Click on Knowledge Liberation module
    fireEvent.click(screen.getByText('Knowledge Liberation'))

    // Should now show Knowledge Liberation description
    expect(screen.getByText('Sharing knowledge freely and building collective intelligence')).toBeInTheDocument()
  })

  it('should show "No Connected Platforms" message for empty modules', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('No Connected Platforms')).toBeInTheDocument()
    })

    expect(screen.getByText(/Connect platforms to start tracking/)).toBeInTheDocument()
  })

  it('should display suggested integrations for each module', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('Suggested for this module:')).toBeInTheDocument()
    })

    // Default module (Community) should suggest Patreon and Meetup
    expect(screen.getByText('Patreon')).toBeInTheDocument()
    expect(screen.getByText('Meetup')).toBeInTheDocument()

    // Switch to Knowledge Liberation module
    fireEvent.click(screen.getByText('Knowledge Liberation'))

    // Should suggest GitHub for Knowledge Liberation
    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument()
    })
  })

  it('should open connect platform modal', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('Connect Platform')).toBeInTheDocument()
    })

    // Click Connect Platform button
    fireEvent.click(screen.getByText('Connect Platform'))

    // Modal should open
    expect(screen.getByText('Connect a Platform')).toBeInTheDocument()
    expect(screen.getByText('Choose a platform to connect and start tracking your impact:')).toBeInTheDocument()
  })

  it('should initiate OAuth flow when connecting a platform', async () => {
    const mockConnectResponse = {
      success: true,
      data: {
        authUrl: 'https://github.com/login/oauth/authorize?client_id=test&state=test-state',
        state: 'test-state'
      }
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConnectResponse
      } as Response)

    // Mock window.location.href
    delete (window as any).location
    window.location = { href: '' } as any

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('Connect Platform')).toBeInTheDocument()
    })

    // Open modal
    fireEvent.click(screen.getByText('Connect Platform'))

    // Click on GitHub integration
    fireEvent.click(screen.getByText('GitHub'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8007/api/v1/impact/integrations/connect',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify({
            platform: 'github',
            ventureId: 'test-venture-123'
          })
        })
      )
    })

    // Should redirect to OAuth URL
    expect(window.location.href).toBe('https://github.com/login/oauth/authorize?client_id=test&state=test-state')
  })

  it('should handle API errors gracefully', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    // Should still show default modules when API fails
    await waitFor(() => {
      expect(screen.getByText('Community Resilience')).toBeInTheDocument()
    })

    // Should show fallback modules
    expect(screen.getByText('Knowledge Liberation')).toBeInTheDocument()
    expect(screen.getByText('Cultural Impact')).toBeInTheDocument()
  })

  it('should display error message for connection failures', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Failed to connect platform' }
        })
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(screen.getByText('Connect Platform')).toBeInTheDocument()
    })

    // Open modal and try to connect
    fireEvent.click(screen.getByText('Connect Platform'))
    fireEvent.click(screen.getByText('GitHub'))

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to connect platform/)).toBeInTheDocument()
    })
  })

  it('should make API calls with correct headers and venture ID', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpactData
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableIntegrations
      } as Response)

    render(<ImpactDashboard ventureId="test-venture-123" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8007/api/v1/impact/test-venture-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      )
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/impact/integrations/available',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-jwt-token'
        })
      })
    )
  })
})