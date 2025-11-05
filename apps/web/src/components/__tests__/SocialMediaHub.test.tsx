import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from './test-utils'
import SocialMediaHub from '../SocialMediaHub'

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

const mockVentureId = 'test-venture-123'

describe('SocialMediaHub Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/social-media/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      if (url.includes('/social-media/posts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      if (url.includes('/social-media/analytics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              totalPosts: 0,
              totalEngagement: 0,
              platformBreakdown: {}
            }
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })
  })

  it('renders the main interface with view modes', async () => {
    render(<SocialMediaHub ventureId={mockVentureId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Social Media Hub')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Publish')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
  })

  it('loads accounts and posts on mount', async () => {
    const mockAccounts = [
      {
        id: 'twitter-123',
        platform: 'twitter',
        accountName: '@testuser',
        isConnected: true,
        followers: 1500
      }
    ]

    const mockPosts = [
      {
        id: 'post-123',
        platform: 'twitter',
        content: 'Test social media post',
        scheduledFor: '2024-01-01T12:00:00Z',
        status: 'published',
        engagement: {
          likes: 42,
          shares: 10,
          comments: 5
        }
      }
    ]

    mockFetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockAccounts
        })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockPosts
        })
      }))

    render(<SocialMediaHub ventureId={mockVentureId} />)
    
    await waitFor(() => {
      expect(screen.getByText('@testuser')).toBeInTheDocument()
      expect(screen.getByText('Test social media post')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/social-media/accounts?ventureId=test-venture-123',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
    )
  })

  describe('Dashboard View', () => {
    it('displays account overview correctly', async () => {
      const mockAccounts = [
        {
          id: 'twitter-123',
          platform: 'twitter',
          accountName: '@testuser',
          isConnected: true,
          followers: 1500
        },
        {
          id: 'linkedin-456',
          platform: 'linkedin',
          accountName: 'Test Company',
          isConnected: false,
          followers: 850
        }
      ]

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockAccounts
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Connected Accounts')).toBeInTheDocument()
        expect(screen.getByText('@testuser')).toBeInTheDocument()
        expect(screen.getByText('Test Company')).toBeInTheDocument()
        expect(screen.getByText('1.5K followers')).toBeInTheDocument()
      })
    })

    it('shows connect account button for platforms', async () => {
      const user = userEvent.setup()
      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Connect Account')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Connect Account'))
      
      await waitFor(() => {
        expect(screen.getByText('Connect Social Media Account')).toBeInTheDocument()
        expect(screen.getByText('Twitter')).toBeInTheDocument()
        expect(screen.getByText('LinkedIn')).toBeInTheDocument()
        expect(screen.getByText('Instagram')).toBeInTheDocument()
      })
    })
  })

  describe('Publishing Interface', () => {
    it('switches to publish view correctly', async () => {
      const user = userEvent.setup()
      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Publish')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Publish'))
      
      await waitFor(() => {
        expect(screen.getByText('Create Social Media Post')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('What\'s on your mind?')).toBeInTheDocument()
      })
    })

    it('allows creating and scheduling posts', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'new-post-123' }
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Publish'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('What\'s on your mind?')).toBeInTheDocument()
      })

      const contentTextarea = screen.getByPlaceholderText('What\'s on your mind?')
      await user.type(contentTextarea, 'This is a test social media post!')
      
      // Select platform
      const twitterCheckbox = screen.getByLabelText('Twitter')
      await user.click(twitterCheckbox)
      
      // Schedule for later
      const scheduleRadio = screen.getByLabelText('Schedule for later')
      await user.click(scheduleRadio)
      
      const dateInput = screen.getByDisplayValue('') // datetime-local input
      await user.type(dateInput, '2024-12-25T15:00')
      
      await user.click(screen.getByText('Schedule Post'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/social-media/publish',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              ventureId: mockVentureId,
              content: 'This is a test social media post!',
              platforms: ['twitter'],
              scheduledFor: '2024-12-25T15:00:00.000Z'
            })
          })
        )
      })
    })

    it('publishes immediately when selected', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'immediate-post-123' }
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Publish'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('What\'s on your mind?')).toBeInTheDocument()
      })

      const contentTextarea = screen.getByPlaceholderText('What\'s on your mind?')
      await user.type(contentTextarea, 'Publishing right now!')
      
      const linkedinCheckbox = screen.getByLabelText('LinkedIn')
      await user.click(linkedinCheckbox)
      
      const publishNowRadio = screen.getByLabelText('Publish now')
      await user.click(publishNowRadio)
      
      await user.click(screen.getByText('Publish Now'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/social-media/publish',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              ventureId: mockVentureId,
              content: 'Publishing right now!',
              platforms: ['linkedin'],
              publishNow: true
            })
          })
        )
      })
    })

    it('validates content before publishing', async () => {
      const user = userEvent.setup()
      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Publish'))
      
      await waitFor(() => {
        expect(screen.getByText('Publish Now')).toBeInTheDocument()
      })

      // Try to publish without content
      await user.click(screen.getByText('Publish Now'))
      
      await waitFor(() => {
        expect(screen.getByText('Please enter some content')).toBeInTheDocument()
      })
    })
  })

  describe('Analytics View', () => {
    it('switches to analytics view and displays metrics', async () => {
      const user = userEvent.setup()
      
      const mockAnalytics = {
        totalPosts: 45,
        totalEngagement: 2350,
        topPerformingPost: {
          content: 'Best performing post',
          engagement: 120
        },
        platformBreakdown: {
          twitter: { posts: 20, engagement: 1200 },
          linkedin: { posts: 15, engagement: 800 },
          instagram: { posts: 10, engagement: 350 }
        }
      }

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockAnalytics
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Analytics'))
      
      await waitFor(() => {
        expect(screen.getByText('Social Media Analytics')).toBeInTheDocument()
        expect(screen.getByText('45')).toBeInTheDocument() // Total posts
        expect(screen.getByText('2,350')).toBeInTheDocument() // Total engagement
        expect(screen.getByText('Best performing post')).toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8007/api/v1/social-media/analytics?ventureId=test-venture-123',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-token'
          }
        })
      )
    })

    it('displays platform-specific analytics', async () => {
      const user = userEvent.setup()
      
      const mockAnalytics = {
        platformBreakdown: {
          twitter: { posts: 20, engagement: 1200, followers: 1500 },
          linkedin: { posts: 15, engagement: 800, followers: 850 }
        }
      }

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockAnalytics
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Analytics'))
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance')).toBeInTheDocument()
        // Twitter stats
        expect(screen.getByText('20 posts')).toBeInTheDocument()
        expect(screen.getByText('1,200 engagement')).toBeInTheDocument()
        // LinkedIn stats  
        expect(screen.getByText('15 posts')).toBeInTheDocument()
        expect(screen.getByText('800 engagement')).toBeInTheDocument()
      })
    })
  })

  describe('Account Management', () => {
    it('connects new social media account', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { connectionUrl: 'https://oauth.twitter.com/auth' }
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Connect Account'))
      
      await waitFor(() => {
        expect(screen.getByText('Twitter')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Twitter'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/social-media/connect',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              ventureId: mockVentureId,
              platform: 'twitter'
            })
          })
        )
      })
    })

    it('disconnects existing account', async () => {
      const user = userEvent.setup()
      
      const mockAccounts = [
        {
          id: 'twitter-123',
          platform: 'twitter',
          accountName: '@testuser',
          isConnected: true,
          followers: 1500
        }
      ]

      mockFetch
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockAccounts
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Disconnect'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/social-media/accounts/twitter-123',
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })
    })
  })

  describe('Quick Actions', () => {
    it('opens quick publish modal', async () => {
      const user = userEvent.setup()
      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Quick Publish')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Quick Publish'))
      
      await waitFor(() => {
        expect(screen.getByText('Quick Social Media Post')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('What do you want to share?')).toBeInTheDocument()
      })
    })

    it('publishes quick post successfully', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'quick-post-123' }
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Quick Publish'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('What do you want to share?')).toBeInTheDocument()
      })

      const quickContent = screen.getByPlaceholderText('What do you want to share?')
      await user.type(quickContent, 'Quick update from our team!')
      
      await user.click(screen.getByText('Post to All Connected'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/social-media/publish',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              ventureId: mockVentureId,
              content: 'Quick update from our team!',
              platforms: [], // All connected platforms
              publishNow: true
            })
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Server error'
        })
      }))

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load accounts/i)).toBeInTheDocument()
      })
    })

    it('shows loading states during operations', async () => {
      const user = userEvent.setup()
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockFetch.mockReturnValueOnce(mockPromise)

      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Publish'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('What\'s on your mind?')).toBeInTheDocument()
      })

      const contentTextarea = screen.getByPlaceholderText('What\'s on your mind?')
      await user.type(contentTextarea, 'Test post')
      
      const linkedinCheckbox = screen.getByLabelText('LinkedIn')
      await user.click(linkedinCheckbox)
      
      await user.click(screen.getByText('Publish Now'))
      
      // Check loading state
      expect(screen.getByText(/Publishing/i)).toBeInTheDocument()
      
      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'test-post-123' }
        })
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/Publishing/i)).not.toBeInTheDocument()
      })
    })

    it('validates platform selection before publishing', async () => {
      const user = userEvent.setup()
      render(<SocialMediaHub ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Publish'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('What\'s on your mind?')).toBeInTheDocument()
      })

      const contentTextarea = screen.getByPlaceholderText('What\'s on your mind?')
      await user.type(contentTextarea, 'Test post')
      
      // Try to publish without selecting platforms
      await user.click(screen.getByText('Publish Now'))
      
      await waitFor(() => {
        expect(screen.getByText('Please select at least one platform')).toBeInTheDocument()
      })
    })
  })
})