import { render, screen, waitFor } from '@testing-library/react'
import VentureSelector from '../VentureSelector'
import { ventureApi } from '../../services/ventureApi'
import { Venture } from '../../types/venture'

// Mock the venture API
jest.mock('../../services/ventureApi')
const mockVentureApi = ventureApi as jest.Mocked<typeof ventureApi>

// Mock ventures data
const mockVentures: Venture[] = [
  {
    id: 'venture-1',
    name: 'Liberation Collective',
    description: 'A sovereign circle for mutual aid',
    ventureType: 'sovereign_circle',
    primaryBillingOwner: 'user-1',
    billingTier: 'liberation',
    maxMembers: 50,
    isGreenfieldAffiliate: true,
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    lastActivityAt: '2023-01-01T00:00:00Z',
    coreValues: ['mutual aid', 'liberation'],
    primaryGoals: ['community support'],
    currentUserRole: 'owner',
    currentUserPermissions: ['admin_all']
  },
  {
    id: 'venture-2',
    name: 'Professional Consulting',
    description: 'A professional business venture',
    ventureType: 'professional',
    primaryBillingOwner: 'user-1',
    billingTier: 'professional',
    maxMembers: 5,
    status: 'active',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    lastActivityAt: '2023-01-02T00:00:00Z',
    currentUserRole: 'contributor',
    currentUserPermissions: ['create_conversations']
  }
]

describe('VentureSelector', () => {
  const mockOnVentureChange = jest.fn()
  const mockOnCreateNew = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockVentureApi.getVentures.mockResolvedValue({
      ventures: mockVentures,
      total: 2,
      hasMore: false
    })
  })

  it('renders loading state initially', () => {
    render(
      <VentureSelector
        selectedVenture={null}
        onVentureChange={mockOnVentureChange}
        onCreateNew={mockOnCreateNew}
      />
    )

    expect(screen.getByText('Loading ventures...')).toBeInTheDocument()
  })

  it('renders venture selector with ventures after loading', async () => {
    render(
      <VentureSelector
        selectedVenture={null}
        onVentureChange={mockOnVentureChange}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Select a venture')).toBeInTheDocument()
    })

    expect(mockVentureApi.getVentures).toHaveBeenCalledWith({ limit: 50 })
  })

  it('auto-selects first venture when none selected', async () => {
    render(
      <VentureSelector
        selectedVenture={null}
        onVentureChange={mockOnVentureChange}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(mockOnVentureChange).toHaveBeenCalledWith(mockVentures[0])
    })
  })

  it('displays selected venture information', async () => {
    render(
      <VentureSelector
        selectedVenture={mockVentures[0]}
        onVentureChange={mockOnVentureChange}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Liberation Collective')).toBeInTheDocument()
      expect(screen.getByText('Sovereign Circle')).toBeInTheDocument()
      expect(screen.getByText('Liberation')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockVentureApi.getVentures.mockRejectedValue(new Error('API Error'))

    render(
      <VentureSelector
        selectedVenture={null}
        onVentureChange={mockOnVentureChange}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('⚠️ API Error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })
})
