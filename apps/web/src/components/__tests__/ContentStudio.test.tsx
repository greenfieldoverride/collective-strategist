import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from './test-utils'
import ContentStudio from '../ContentStudio'

// Mock the useCrossFeatureIntegration hook
vi.mock('../contexts/VentureContext', async () => {
  const actual = await vi.importActual('../contexts/VentureContext')
  return {
    ...actual,
    useCrossFeatureIntegration: () => ({
      publishContentToSocial: vi.fn(),
      scheduleContentDeadline: vi.fn(),
      scheduleSocialPost: vi.fn(),
      shareAssetBetweenFeatures: vi.fn()
    })
  }
})

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

describe('ContentStudio Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      
      if (url.includes('/content-studio/content')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      if (url.includes('/content-studio/tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: ['business', 'marketing', 'strategy']
          })
        })
      }
      // Mock assets API - more specific pattern matching
      if (url.match(/\/api\/v1\/ventures\/[^\/]+\/assets/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            assets: []
          })
        })
      }
      // Mock shared assets API
      if (url.includes('/api/v1/assets/shared')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      }
      // Mock calendar APIs
      if (url.includes('/api/v1/calendar/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      }
      if (url.includes('/api/v1/calendar/connections')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            google: { connected: false },
            outlook: { connected: false }
          })
        })
      }
      if (url.includes('/assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })
  })

  it('renders the main interface with tabs', async () => {
    render(<ContentStudio ventureId={mockVentureId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Content Studio')).toBeInTheDocument()
      expect(screen.getByText('Generate Content')).toBeInTheDocument()
      expect(screen.getByText('Grid')).toBeInTheDocument()
      expect(screen.getByText('List')).toBeInTheDocument()
      expect(screen.getByText('Pipeline')).toBeInTheDocument()
    })
  })

  it('loads existing content on mount', async () => {
    const mockContent = [
      {
        id: '1',
        title: 'Test Blog Post',
        type: 'blog_post',
        status: 'published',
        createdAt: '2024-01-01T00:00:00Z',
        content: 'Test content',
        tags: ['business'],
        workflow: {
          status: 'approved',
          submittedAt: '2024-01-01T00:00:00Z',
          comments: []
        }
      }
    ]

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockContent
      })
    }))

    render(<ContentStudio ventureId={mockVentureId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Blog Post')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/content-studio/content?ventureId=test-venture-123',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
    )
  })

  describe('Content Creation', () => {
    it('allows switching to create content tab', async () => {
      const user = userEvent.setup()
      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Create Content')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Content'))
      
      expect(screen.getByText('Content Type')).toBeInTheDocument()
      expect(screen.getByText('Blog Post')).toBeInTheDocument()
    })

    it('shows content creation form when type is selected', async () => {
      const user = userEvent.setup()
      render(<ContentStudio ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Create Content'))
      await user.click(screen.getByText('Blog Post'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter content title...')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Start writing your content...')).toBeInTheDocument()
      })
    })

    it('generates content with AI when requested', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            content: 'AI generated blog post content about business strategy...',
            title: 'AI Generated: Business Strategy Guide'
          }
        })
      }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Create Content'))
      await user.click(screen.getByText('Blog Post'))
      
      await waitFor(() => {
        expect(screen.getByText('✨ Generate with AI')).toBeInTheDocument()
      })

      const promptInput = screen.getByPlaceholderText('Describe what you want to create...')
      await user.type(promptInput, 'Write about business strategy')
      await user.click(screen.getByText('✨ Generate with AI'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/content-studio/generate',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              ventureId: mockVentureId,
              type: 'blog_post',
              prompt: 'Write about business strategy'
            })
          })
        )
      })
    })

    it('saves content successfully', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'new-content-123' }
        })
      }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Create Content'))
      await user.click(screen.getByText('Blog Post'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter content title...')).toBeInTheDocument()
      })

      const titleInput = screen.getByPlaceholderText('Enter content title...')
      const contentTextarea = screen.getByPlaceholderText('Start writing your content...')
      
      await user.type(titleInput, 'My Test Blog Post')
      await user.type(contentTextarea, 'This is test content for my blog post.')
      
      await user.click(screen.getByText('Save as Draft'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/content-studio/content',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              ventureId: mockVentureId,
              type: 'blog_post',
              title: 'My Test Blog Post',
              content: 'This is test content for my blog post.',
              status: 'draft',
              tags: []
            })
          })
        )
      })
    })
  })

  describe('Approval Workflow', () => {
    const mockContentWithWorkflow = {
      id: 'content-123',
      title: 'Content Under Review',
      type: 'blog_post',
      status: 'under_review',
      content: 'This content needs approval.',
      tags: ['business'],
      workflow: {
        status: 'under_review',
        submittedAt: '2024-01-01T00:00:00Z',
        comments: [
          {
            id: 'comment-1',
            content: 'Please revise the introduction',
            type: 'suggestion',
            author: 'reviewer@example.com',
            timestamp: '2024-01-01T01:00:00Z',
            resolved: false
          }
        ]
      }
    }

    it('shows review button for draft content', async () => {
      const mockDraftContent = [{
        ...mockContentWithWorkflow,
        status: 'draft',
        workflow: { status: 'draft', comments: [] }
      }]

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockDraftContent
        })
      }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Submit for Review')).toBeInTheDocument()
      })
    })

    it('opens approval workflow modal', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [mockContentWithWorkflow]
        })
      }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Review Content')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Review Content'))
      
      await waitFor(() => {
        expect(screen.getByText('Content Review')).toBeInTheDocument()
        expect(screen.getByText('Please revise the introduction')).toBeInTheDocument()
      })
    })

    it('allows adding comments in workflow', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [mockContentWithWorkflow]
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Review Content')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Review Content'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
      })

      const commentInput = screen.getByPlaceholderText('Add a comment...')
      await user.type(commentInput, 'This looks good overall!')
      
      const commentTypeSelect = screen.getByDisplayValue('comment')
      await user.selectOptions(commentTypeSelect, 'approval')
      
      await user.click(screen.getByText('Add Comment'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/content-studio/content/content-123/comments',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              content: 'This looks good overall!',
              type: 'approval'
            })
          })
        )
      })
    })

    it('approves content successfully', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [mockContentWithWorkflow]
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Review Content')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Review Content'))
      
      await waitFor(() => {
        expect(screen.getByText('✅ Approve')).toBeInTheDocument()
      })

      await user.click(screen.getByText('✅ Approve'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8007/api/v1/content-studio/content/content-123/approve',
          expect.objectContaining({
            method: 'POST'
          })
        )
      })
    })
  })

  describe('Asset Management', () => {
    it('switches to asset manager tab', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: []
        })
      }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Asset Manager'))
      
      await waitFor(() => {
        expect(screen.getByText('Upload New Asset')).toBeInTheDocument()
        expect(screen.getByText('Organize by Tags')).toBeInTheDocument()
      })
    })

    it('filters content by tags', async () => {
      const user = userEvent.setup()
      
      const mockTaggedContent = [
        {
          id: '1',
          title: 'Business Strategy',
          tags: ['business', 'strategy'],
          type: 'blog_post',
          status: 'published'
        },
        {
          id: '2', 
          title: 'Marketing Tips',
          tags: ['marketing'],
          type: 'blog_post',
          status: 'published'
        }
      ]

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockTaggedContent
        })
      }))

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText('Business Strategy')).toBeInTheDocument()
        expect(screen.getByText('Marketing Tips')).toBeInTheDocument()
      })

      // Click on business tag to filter
      await user.click(screen.getByText('business'))
      
      await waitFor(() => {
        expect(screen.getByText('Business Strategy')).toBeInTheDocument()
        expect(screen.queryByText('Marketing Tips')).not.toBeInTheDocument()
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

      render(<ContentStudio ventureId={mockVentureId} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load content/i)).toBeInTheDocument()
      })
    })

    it('validates required fields before saving', async () => {
      const user = userEvent.setup()
      render(<ContentStudio ventureId={mockVentureId} />)
      
      await user.click(screen.getByText('Create Content'))
      await user.click(screen.getByText('Blog Post'))
      
      await waitFor(() => {
        expect(screen.getByText('Save as Draft')).toBeInTheDocument()
      })

      // Try to save without title
      await user.click(screen.getByText('Save as Draft'))
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument()
      })
    })
  })
})