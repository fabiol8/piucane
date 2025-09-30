import { render, screen, runAxeTest } from '../../../utils/test-utils'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders children correctly', () => {
      render(
        <Card>
          <div>Card content</div>
        </Card>
      )

      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      )

      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Card ref={ref}>
          Content
        </Card>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('meets accessibility standards', async () => {
      const { container } = render(
        <Card>
          <h2>Card Title</h2>
          <p>Card content</p>
        </Card>
      )

      await runAxeTest(container)
    })
  })

  describe('CardHeader', () => {
    it('renders header content', () => {
      render(
        <Card>
          <CardHeader>
            <h2>Header content</h2>
          </CardHeader>
        </Card>
      )

      expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('applies correct styling', () => {
      render(
        <CardHeader data-testid="header">
          Header
        </CardHeader>
      )

      const header = screen.getByTestId('header')
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })
  })

  describe('CardTitle', () => {
    it('renders title as h3 by default', () => {
      render(
        <CardTitle>Card Title</CardTitle>
      )

      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveTextContent('Card Title')
    })

    it('applies correct styling', () => {
      render(
        <CardTitle data-testid="title">
          Title
        </CardTitle>
      )

      const title = screen.getByTestId('title')
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(
        <CardTitle ref={ref}>
          Title
        </CardTitle>
      )

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('CardContent', () => {
    it('renders content correctly', () => {
      render(
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
      )

      expect(screen.getByText('Card content goes here')).toBeInTheDocument()
    })

    it('applies correct padding', () => {
      render(
        <CardContent data-testid="content">
          Content
        </CardContent>
      )

      const content = screen.getByTestId('content')
      expect(content).toHaveClass('p-6', 'pt-0')
    })
  })

  describe('CardFooter', () => {
    it('renders footer content', () => {
      render(
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      )

      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('applies correct styling for actions', () => {
      render(
        <CardFooter data-testid="footer">
          <button>Action 1</button>
          <button>Action 2</button>
        </CardFooter>
      )

      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })
  })

  describe('Complete Card Example', () => {
    it('renders complete card structure', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Product Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Product description goes here</p>
            <p>Price: €29.99</p>
          </CardContent>
          <CardFooter>
            <button>Add to Cart</button>
            <button>View Details</button>
          </CardFooter>
        </Card>
      )

      // Check all parts are rendered
      expect(screen.getByRole('heading', { name: 'Product Card' })).toBeInTheDocument()
      expect(screen.getByText('Product description goes here')).toBeInTheDocument()
      expect(screen.getByText('Price: €29.99')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument()
    })

    it('maintains proper semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Semantic Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This card has proper semantic structure</p>
          </CardContent>
          <CardFooter>
            <button>Primary Action</button>
          </CardFooter>
        </Card>
      )

      // Should have proper heading structure
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('Semantic Card')
    })

    it('supports interactive elements', async () => {
      const handleClick = jest.fn()
      render(
        <Card>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Click the button below</p>
          </CardContent>
          <CardFooter>
            <button onClick={handleClick}>Click Me</button>
          </CardFooter>
        </Card>
      )

      const button = screen.getByRole('button', { name: 'Click Me' })
      await userEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('handles responsive design classes', () => {
      render(
        <Card className="md:flex-row lg:max-w-4xl" data-testid="responsive-card">
          <CardContent>
            Responsive content
          </CardContent>
        </Card>
      )

      const card = screen.getByTestId('responsive-card')
      expect(card).toHaveClass('md:flex-row', 'lg:max-w-4xl')
    })

    it('works with complex content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complex Card</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <img src="/test-image.jpg" alt="Test" />
              <ul>
                <li>Feature 1</li>
                <li>Feature 2</li>
                <li>Feature 3</li>
              </ul>
              <form>
                <input type="text" placeholder="Enter text" />
                <select>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
              </form>
            </div>
          </CardContent>
          <CardFooter>
            <button type="submit">Submit</button>
            <button type="button">Cancel</button>
          </CardFooter>
        </Card>
      )

      // Verify complex content is rendered
      expect(screen.getByAltText('Test')).toBeInTheDocument()
      expect(screen.getByText('Feature 1')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })

    it('meets accessibility standards with complex content', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Complex Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This card contains various accessible elements</p>
            <button aria-label="More information">ℹ️</button>
            <input type="text" aria-label="Search products" />
          </CardContent>
          <CardFooter>
            <button aria-describedby="help-text">Primary Action</button>
            <div id="help-text" style={{ fontSize: '0.875rem', color: '#666' }}>
              This action will save your changes
            </div>
          </CardFooter>
        </Card>
      )

      await runAxeTest(container)
    })
  })
})