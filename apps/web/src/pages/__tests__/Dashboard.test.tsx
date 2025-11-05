import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Dashboard from '../Dashboard'

// Mock the AIConsultant component
vi.mock('../../components/AIConsultant', () => ({
  default: () => <div data-testid="ai-consultant">AI Consultant Component</div>
}))

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
})

const DashboardWithRouter = ({ initialRoute = '/dashboard' }) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <Dashboard />
  </MemoryRouter>
)

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with navigation', () => {
    render(<DashboardWithRouter />)
    
    expect(screen.getByText('The Collective Strategist')).toBeInTheDocument()
    expect(screen.getByText('Welcome back! 👋')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('displays all navigation tabs', () => {
    render(<DashboardWithRouter />)
    
    expect(screen.getByText('📊 Overview')).toBeInTheDocument()
    expect(screen.getByText('🤖 AI Consultant')).toBeInTheDocument()
    expect(screen.getByText('✍️ Content Studio')).toBeInTheDocument()
    expect(screen.getByText('📱 Social Media')).toBeInTheDocument()
  })

  it('shows overview tab as active by default', () => {
    render(<DashboardWithRouter />)
    
    const overviewTab = screen.getByText('📊 Overview').parentElement
    expect(overviewTab).toHaveClass('active')
  })

  it('shows AI consultant tab when URL is /ai-consultant', () => {
    render(<DashboardWithRouter initialRoute="/ai-consultant" />)
    
    const aiTab = screen.getByText('🤖 AI Consultant').parentElement
    expect(aiTab).toHaveClass('active')
    expect(screen.getByTestId('ai-consultant')).toBeInTheDocument()
  })

  it('switches tabs when clicked', async () => {
    const user = userEvent.setup()
    render(<DashboardWithRouter />)
    
    const aiTab = screen.getByText('🤖 AI Consultant')
    await user.click(aiTab)
    
    expect(aiTab.parentElement).toHaveClass('active')
    expect(screen.getByTestId('ai-consultant')).toBeInTheDocument()
  })

  it('displays overview content by default', () => {
    render(<DashboardWithRouter />)
    
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    expect(screen.getByText('Your AI business consultant platform at a glance')).toBeInTheDocument()
  })

  it('displays stats cards in overview', () => {
    render(<DashboardWithRouter />)
    
    expect(screen.getByText('AI Consultations')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
  })

  it('shows different session type descriptions for AI tab', async () => {
    const user = userEvent.setup()
    render(<DashboardWithRouter />)
    
    const aiTab = screen.getByText('🤖 AI Consultant')
    await user.click(aiTab)
    
    expect(screen.getByText('Get practical advice on growing, improving, and developing your business')).toBeInTheDocument()
  })

  it('logs out when logout button is clicked', async () => {
    const user = userEvent.setup()
    const mockRemoveItem = vi.fn()
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        ...window.localStorage,
        removeItem: mockRemoveItem,
      },
      writable: true,
    })

    render(<DashboardWithRouter />)
    
    const logoutButton = screen.getByText('Logout')
    await user.click(logoutButton)
    
    expect(mockRemoveItem).toHaveBeenCalledWith('token')
  })

  it('handles all session types correctly', () => {
    render(<DashboardWithRouter initialRoute="/ai-consultant" />)
    
    // Check that AI consultant loads without errors
    expect(screen.getByTestId('ai-consultant')).toBeInTheDocument()
  })
})
