import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateVentureModal from '../CreateVentureModal'
import { ventureApi } from '../../services/ventureApi'
import { Venture } from '../../types/venture'

// Mock the venture API
jest.mock('../../services/ventureApi')
const mockVentureApi = ventureApi as jest.Mocked<typeof ventureApi>

const mockCreatedVenture: Venture = {
  id: 'new-venture-id',
  name: 'Test Venture',
  description: 'Test description',
  ventureType: 'professional',
  primaryBillingOwner: 'user-1',
  billingTier: 'professional',
  maxMembers: 5,
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  lastActivityAt: '2023-01-01T00:00:00Z'
}

describe('CreateVentureModal', () => {
  const mockOnClose = jest.fn()
  const mockOnVentureCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockVentureApi.createVenture.mockResolvedValue(mockCreatedVenture)
  })

  it('does not render when closed', () => {
    render(
      <CreateVentureModal
        isOpen={false}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    expect(screen.queryByText('Create New Venture')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    expect(screen.getByText('Create New Venture')).toBeInTheDocument()
    expect(screen.getByLabelText('Venture Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Venture Type *')).toBeInTheDocument()
  })

  it('shows all venture type options', () => {
    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    const ventureTypeSelect = screen.getByLabelText('Venture Type *')
    expect(ventureTypeSelect).toBeInTheDocument()

    // Check that professional is selected by default
    expect(ventureTypeSelect).toHaveValue('professional')
  })

  it('creates venture with valid data', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Fill in the form
    await user.type(screen.getByLabelText('Venture Name *'), 'Test Venture')
    await user.type(screen.getByLabelText('Description'), 'Test description')

    // Submit the form
    const submitButton = screen.getByText('Create Venture')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockVentureApi.createVenture).toHaveBeenCalledWith({
        name: 'Test Venture',
        description: 'Test description',
        ventureType: 'professional',
        isGreenfieldAffiliate: false,
        coreValues: [],
        primaryGoals: [],
        costSharingEnabled: false
      })
    })

    expect(mockOnVentureCreated).toHaveBeenCalledWith(mockCreatedVenture)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows Greenfield affiliate option for sovereign circles', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Change to sovereign circle
    const ventureTypeSelect = screen.getByLabelText('Venture Type *')
    await user.selectOptions(ventureTypeSelect, 'sovereign_circle')

    // Check that Greenfield affiliate option appears
    expect(screen.getByText('Greenfield Override Affiliate (Liberation Tier)')).toBeInTheDocument()
  })

  it('shows cost sharing options for cooperatives', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Change to cooperative
    const ventureTypeSelect = screen.getByLabelText('Venture Type *')
    await user.selectOptions(ventureTypeSelect, 'cooperative')

    // Check that cost sharing option appears
    expect(screen.getByText('Enable cost sharing features')).toBeInTheDocument()
  })

  it('allows adding and removing core values', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Add a core value
    const valueInput = screen.getByPlaceholderText('Add a core value')
    await user.type(valueInput, 'mutual aid')
    
    const addButton = screen.getAllByText('Add')[0]
    await user.click(addButton)

    // Check that the value appears as a tag
    expect(screen.getByText('mutual aid')).toBeInTheDocument()

    // Remove the value
    const removeButton = screen.getByText('×')
    await user.click(removeButton)

    // Check that the value is removed
    expect(screen.queryByText('mutual aid')).not.toBeInTheDocument()
  })

  it('allows adding and removing primary goals', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Add a primary goal
    const goalInput = screen.getByPlaceholderText('Add a primary goal')
    await user.type(goalInput, 'community support')
    
    const addButton = screen.getAllByText('Add')[1]
    await user.click(addButton)

    // Check that the goal appears as a tag
    expect(screen.getByText('community support')).toBeInTheDocument()
  })

  it('validates required name field', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Try to submit without name
    const submitButton = screen.getByText('Create Venture')
    await user.click(submitButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('⚠️ Venture name is required')).toBeInTheDocument()
    })

    expect(mockVentureApi.createVenture).not.toHaveBeenCalled()
  })

  it('handles API errors', async () => {
    const user = userEvent.setup()
    mockVentureApi.createVenture.mockRejectedValue(new Error('API Error'))

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Fill in the form
    await user.type(screen.getByLabelText('Venture Name *'), 'Test Venture')

    // Submit the form
    const submitButton = screen.getByText('Create Venture')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('⚠️ API Error')).toBeInTheDocument()
    })

    expect(mockOnVentureCreated).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('shows loading state during creation', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    mockVentureApi.createVenture.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockCreatedVenture), 100))
    )

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    // Fill in the form
    await user.type(screen.getByLabelText('Venture Name *'), 'Test Venture')

    // Submit the form
    const submitButton = screen.getByText('Create Venture')
    await user.click(submitButton)

    // Check loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Wait for completion
    await waitFor(() => {
      expect(mockOnVentureCreated).toHaveBeenCalled()
    })
  })

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when X button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CreateVentureModal
        isOpen={true}
        onClose={mockOnClose}
        onVentureCreated={mockOnVentureCreated}
      />
    )

    const closeButton = screen.getByText('×')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
