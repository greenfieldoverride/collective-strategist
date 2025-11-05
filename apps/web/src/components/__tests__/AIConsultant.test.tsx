import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AIConsultant from '../AIConsultant'

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

describe('AIConsultant Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial AI greeting message', () => {
    render(<AIConsultant />)
    expect(screen.getByText(/Hi there/i)).toBeInTheDocument()
  })

  it('displays session type selector', () => {
    render(<AIConsultant />)
    expect(screen.getByText('Growing My Business')).toBeInTheDocument()
  })

  it('allows typing in message input', async () => {
    const user = userEvent.setup()
    render(<AIConsultant />)
    
    const textarea = screen.getByPlaceholderText(/Ask me about/i)
    await user.type(textarea, 'Test message')
    
    expect(textarea).toHaveValue('Test message')
  })

  it('sends API request when message is sent', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          response: 'AI response',
          confidenceScore: 0.9,
          recommendations: [],
          nextSteps: [],
          marketDataUsed: [],
          processingTimeMs: 1000
        }
      })
    })

    render(<AIConsultant />)
    
    const textarea = screen.getByPlaceholderText(/Ask me about/i)
    const sendButton = screen.getByTitle('Send message (Enter)')
    
    await user.type(textarea, 'Test question')
    await user.click(sendButton)
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8007/api/v1/ai-consultant/ask',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        }
      })
    )
  })

  it('displays loading state during API call', async () => {
    const user = userEvent.setup()
    
    // Create a promise that we can control
    let resolvePromise: (value: any) => void
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    mockFetch.mockReturnValueOnce(mockPromise)

    render(<AIConsultant />)
    
    const textarea = screen.getByPlaceholderText(/Ask me about/i)
    const sendButton = screen.getByTitle('Send message (Enter)')
    
    await user.type(textarea, 'Test question')
    await user.click(sendButton)
    
    // Check loading state
    expect(screen.getByText(/Analyzing your question/i)).toBeInTheDocument()
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          response: 'AI response',
          confidenceScore: 0.9,
          recommendations: [],
          nextSteps: [],
          marketDataUsed: [],
          processingTimeMs: 1000
        }
      })
    })
    
    await waitFor(() => {
      expect(screen.queryByText(/Analyzing your question/i)).not.toBeInTheDocument()
    })
  })
})
