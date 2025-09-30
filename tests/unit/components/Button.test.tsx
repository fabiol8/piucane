import { render, screen, userEvent, runAxeTest, expectAnalyticsEvent, mockGtag } from '../../utils/test-utils'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  beforeEach(() => {
    mockGtag.mockClear()
  })

  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('tracks CTA clicks when ctaId is provided', async () => {
    render(<Button ctaId="test.button.click">Track me</Button>)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    expectAnalyticsEvent('cta_click', {
      cta_id: 'test.button.click',
      cta_location: 'unknown',
    })
  })

  it('shows loading state correctly', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
    expect(screen.getByText('Caricamento...')).toBeInTheDocument()
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
  })

  it('renders with icon correctly', () => {
    const icon = <span data-testid="test-icon">🔥</span>
    render(<Button leftIcon={icon}>With Icon</Button>)

    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Keyboard</Button>)

    const button = screen.getByRole('button')
    button.focus()

    expect(button).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)

    await userEvent.keyboard('{Space}')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('supports different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveClass('text-sm')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('text-lg')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref Button</Button>)

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('meets accessibility standards', async () => {
    const { container } = render(
      <Button aria-label="Accessible button">
        Accessible
      </Button>
    )

    await runAxeTest(container)
  })

  it('supports custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')

    expect(button).toHaveClass('custom-class')
  })

  it('prevents click when loading', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick} loading>Loading</Button>)

    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(handleClick).not.toHaveBeenCalled()
  })
})