import { render, screen, userEvent, waitFor, runAxeTest, expectAnalyticsEvent, mockGtag } from '../../../utils/test-utils'
import { PaymentManager } from '@/components/account/PaymentManager'

// Mock Stripe
const mockStripe = {
  elements: jest.fn(),
  createToken: jest.fn(),
  createPaymentMethod: jest.fn(),
  confirmCardSetup: jest.fn(),
}

const mockElements = {
  create: jest.fn(),
  getElement: jest.fn(),
}

const mockCardElement = {
  mount: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  update: jest.fn(),
  focus: jest.fn(),
  blur: jest.fn(),
  clear: jest.fn(),
}

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve(mockStripe)),
}))

// Mock Firebase functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn()),
}))

const mockPaymentMethods = [
  {
    id: 'pm_test_1',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
    isDefault: true,
    fingerprint: 'test_fingerprint_1',
  },
  {
    id: 'pm_test_2',
    type: 'card',
    brand: 'mastercard',
    last4: '5555',
    expMonth: 8,
    expYear: 2026,
    isDefault: false,
    fingerprint: 'test_fingerprint_2',
  },
]

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  paymentMethods: mockPaymentMethods,
}

describe('PaymentManager Component', () => {
  beforeEach(() => {
    mockGtag.mockClear()

    // Reset Stripe mocks
    mockStripe.elements.mockReturnValue(mockElements)
    mockElements.create.mockReturnValue(mockCardElement)
    mockCardElement.on.mockImplementation((event, callback) => {
      if (event === 'ready') {
        setTimeout(callback, 100)
      }
    })

    // Mock successful payment method creation
    mockStripe.createPaymentMethod.mockResolvedValue({
      paymentMethod: {
        id: 'pm_new_test',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
      },
      error: null,
    })
  })

  it('renders payment methods list', () => {
    render(<PaymentManager user={mockUser} />)

    expect(screen.getByText('Metodi di Pagamento')).toBeInTheDocument()
    expect(screen.getByText('•••• 4242')).toBeInTheDocument()
    expect(screen.getByText('•••• 5555')).toBeInTheDocument()
    expect(screen.getByText('Predefinito')).toBeInTheDocument()
  })

  it('shows add payment method form when clicking add button', async () => {
    render(<PaymentManager user={mockUser} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    expect(screen.getByText('Nuovo Metodo di Pagamento')).toBeInTheDocument()
    expect(screen.getByLabelText(/nome sul titolare/i)).toBeInTheDocument()
  })

  it('validates cardholder name input', async () => {
    render(<PaymentManager user={mockUser} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    const saveButton = screen.getByText('Salva Metodo')

    // Try to save without name
    await userEvent.click(saveButton)
    expect(screen.getByText('Il nome del titolare è obbligatorio')).toBeInTheDocument()

    // Enter valid name
    await userEvent.type(nameInput, 'Mario Rossi')
    expect(screen.queryByText('Il nome del titolare è obbligatorio')).not.toBeInTheDocument()
  })

  it('handles successful payment method addition', async () => {
    const mockAddPaymentMethod = jest.fn().mockResolvedValue({
      success: true,
      paymentMethod: {
        id: 'pm_new_test',
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
        isDefault: false,
      },
    })

    render(<PaymentManager user={mockUser} onAddPaymentMethod={mockAddPaymentMethod} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(mockAddPaymentMethod).toHaveBeenCalledWith({
        paymentMethodId: 'pm_new_test',
        cardholderName: 'Mario Rossi',
        setAsDefault: false,
      })
    })

    // Should track analytics event
    expectAnalyticsEvent('payment_method_added', {
      method: 'card',
      brand: 'visa',
    })
  })

  it('handles payment method addition errors', async () => {
    mockStripe.createPaymentMethod.mockResolvedValue({
      paymentMethod: null,
      error: {
        code: 'card_declined',
        message: 'Your card was declined.',
      },
    })

    render(<PaymentManager user={mockUser} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Your card was declined.')).toBeInTheDocument()
    })
  })

  it('allows setting payment method as default', async () => {
    const mockSetDefault = jest.fn().mockResolvedValue({ success: true })

    render(<PaymentManager user={mockUser} onSetDefaultPaymentMethod={mockSetDefault} />)

    // Find non-default payment method
    const nonDefaultCard = screen.getByText('•••• 5555').closest('[data-testid="payment-method"]')
    const setDefaultButton = within(nonDefaultCard!).getByText('Imposta come Predefinito')

    await userEvent.click(setDefaultButton)

    expect(mockSetDefault).toHaveBeenCalledWith('pm_test_2')

    // Should track analytics event
    expectAnalyticsEvent('payment_method_set_default', {
      payment_method_id: 'pm_test_2',
    })
  })

  it('allows deleting payment methods', async () => {
    const mockDelete = jest.fn().mockResolvedValue({ success: true })

    render(<PaymentManager user={mockUser} onDeletePaymentMethod={mockDelete} />)

    // Find non-default payment method (can't delete default)
    const nonDefaultCard = screen.getByText('•••• 5555').closest('[data-testid="payment-method"]')
    const deleteButton = within(nonDefaultCard!).getByLabelText(/elimina metodo/i)

    await userEvent.click(deleteButton)

    // Should show confirmation dialog
    expect(screen.getByText('Conferma Eliminazione')).toBeInTheDocument()
    expect(screen.getByText(/sei sicuro di voler eliminare/i)).toBeInTheDocument()

    const confirmButton = screen.getByText('Elimina')
    await userEvent.click(confirmButton)

    expect(mockDelete).toHaveBeenCalledWith('pm_test_2')

    // Should track analytics event
    expectAnalyticsEvent('payment_method_deleted', {
      payment_method_id: 'pm_test_2',
    })
  })

  it('prevents deleting default payment method', () => {
    render(<PaymentManager user={mockUser} />)

    // Default payment method should not have delete button
    const defaultCard = screen.getByText('•••• 4242').closest('[data-testid="payment-method"]')
    const deleteButton = within(defaultCard!).queryByLabelText(/elimina metodo/i)

    expect(deleteButton).not.toBeInTheDocument()
  })

  it('shows empty state when no payment methods', () => {
    const userWithoutPayments = { ...mockUser, paymentMethods: [] }

    render(<PaymentManager user={userWithoutPayments} />)

    expect(screen.getByText('Nessun metodo di pagamento')).toBeInTheDocument()
    expect(screen.getByText(/aggiungi il tuo primo metodo/i)).toBeInTheDocument()
  })

  it('handles loading states correctly', async () => {
    const mockAddPaymentMethod = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    )

    render(<PaymentManager user={mockUser} onAddPaymentMethod={mockAddPaymentMethod} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    // Should show loading state
    expect(screen.getByText('Salvando...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()

    await waitFor(() => {
      expect(mockAddPaymentMethod).toHaveBeenCalled()
    })
  })

  it('handles network errors gracefully', async () => {
    const mockAddPaymentMethod = jest.fn().mockRejectedValue(new Error('Network error'))

    render(<PaymentManager user={mockUser} onAddPaymentMethod={mockAddPaymentMethod} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/errore durante il salvataggio/i)).toBeInTheDocument()
    })
  })

  it('supports setting new payment method as default during creation', async () => {
    const mockAddPaymentMethod = jest.fn().mockResolvedValue({ success: true })

    render(<PaymentManager user={mockUser} onAddPaymentMethod={mockAddPaymentMethod} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const defaultCheckbox = screen.getByLabelText(/imposta come predefinito/i)
    await userEvent.click(defaultCheckbox)

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(mockAddPaymentMethod).toHaveBeenCalledWith({
        paymentMethodId: 'pm_new_test',
        cardholderName: 'Mario Rossi',
        setAsDefault: true,
      })
    })
  })

  it('shows card brand icons correctly', () => {
    render(<PaymentManager user={mockUser} />)

    // Should show Visa and Mastercard icons
    expect(screen.getByAltText('Visa')).toBeInTheDocument()
    expect(screen.getByAltText('Mastercard')).toBeInTheDocument()
  })

  it('meets accessibility standards', async () => {
    const { container } = render(<PaymentManager user={mockUser} />)
    await runAxeTest(container)
  })

  it('supports keyboard navigation', async () => {
    render(<PaymentManager user={mockUser} />)

    const addButton = screen.getByText('Aggiungi Metodo')

    // Should be focusable
    addButton.focus()
    expect(addButton).toHaveFocus()

    // Should open form with Enter
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText('Nuovo Metodo di Pagamento')).toBeInTheDocument()

    // Should be able to navigate form with Tab
    await userEvent.tab()
    expect(screen.getByLabelText(/nome sul titolare/i)).toHaveFocus()
  })

  it('validates expiration dates correctly', async () => {
    mockStripe.createPaymentMethod.mockResolvedValue({
      paymentMethod: null,
      error: {
        code: 'expired_card',
        message: 'Your card has expired.',
      },
    })

    render(<PaymentManager user={mockUser} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Your card has expired.')).toBeInTheDocument()
    })
  })

  it('handles duplicate payment methods', async () => {
    mockStripe.createPaymentMethod.mockResolvedValue({
      paymentMethod: null,
      error: {
        code: 'card_declined',
        message: 'This payment method already exists.',
      },
    })

    render(<PaymentManager user={mockUser} />)

    const addButton = screen.getByText('Aggiungi Metodo')
    await userEvent.click(addButton)

    const nameInput = screen.getByLabelText(/nome sul titolare/i)
    await userEvent.type(nameInput, 'Mario Rossi')

    const saveButton = screen.getByText('Salva Metodo')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('This payment method already exists.')).toBeInTheDocument()
    })
  })
})