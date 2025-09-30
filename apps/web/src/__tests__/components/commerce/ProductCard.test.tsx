/**
 * ProductCard Component Tests
 * Unit tests for product card component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ProductCard from '@/components/shop/ProductCard';
import { CommerceProvider } from '@/contexts/CommerceContext';

// Mock analytics
jest.mock('@/analytics/ga4', () => ({
  trackAnalyticsEvent: jest.fn()
}));

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

const mockProduct = {
  id: 'test-product-1',
  name: 'Premium Dog Food',
  brand: 'Test Brand',
  category: 'food' as const,
  price: 29.99,
  discountPrice: 24.99,
  rating: 4.5,
  reviewCount: 125,
  image: '/test-product.jpg',
  formats: [
    {
      id: 'format-1',
      size: '1kg',
      price: 29.99,
      inventory: 50
    },
    {
      id: 'format-2',
      size: '3kg',
      price: 79.99,
      inventory: 25
    }
  ],
  tags: ['organic', 'grain-free'],
  compatibility: {
    overall: 0.95,
    breed: 0.9,
    age: 0.95,
    size: 1.0,
    health: 0.9
  },
  subscription: {
    available: true,
    discount: 15,
    frequencies: [15, 30, 60]
  }
};

const mockCommerceContext = {
  addToCart: jest.fn(),
  addToWishlist: jest.fn(),
  removeFromWishlist: jest.fn(),
  isInWishlist: jest.fn(() => false),
  isInCart: jest.fn(() => false),
  cart: { items: [], total: 0, itemCount: 0 },
  wishlist: [],
  isLoading: false
};

const MockCommerceProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <CommerceProvider value={mockCommerceContext}>
      {children}
    </CommerceProvider>
  );
};

describe('ProductCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('Premium Dog Food')).toBeInTheDocument();
    expect(screen.getByText('Test Brand')).toBeInTheDocument();
    expect(screen.getByText('€24,99')).toBeInTheDocument();
    expect(screen.getByText('€29,99')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('125 recensioni')).toBeInTheDocument();
  });

  it('displays discount badge when product has discount', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('-17%')).toBeInTheDocument();
  });

  it('shows compatibility score', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('95% compatibile')).toBeInTheDocument();
  });

  it('displays product tags', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('organic')).toBeInTheDocument();
    expect(screen.getByText('grain-free')).toBeInTheDocument();
  });

  it('shows subscription availability', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('Abbonamento -15%')).toBeInTheDocument();
  });

  it('handles add to cart action', async () => {
    mockCommerceContext.addToCart.mockResolvedValue({ success: true });

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const addToCartButton = screen.getByRole('button', { name: /aggiungi al carrello/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(mockCommerceContext.addToCart).toHaveBeenCalledWith(
        mockProduct.id,
        mockProduct.formats[0].id,
        1,
        expect.any(Object)
      );
    });
  });

  it('handles add to wishlist action', async () => {
    mockCommerceContext.addToWishlist.mockResolvedValue({ success: true });

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const wishlistButton = screen.getByRole('button', { name: /aggiungi ai preferiti/i });
    fireEvent.click(wishlistButton);

    await waitFor(() => {
      expect(mockCommerceContext.addToWishlist).toHaveBeenCalledWith(mockProduct.id);
    });
  });

  it('shows wishlist button as active when product is in wishlist', () => {
    mockCommerceContext.isInWishlist.mockReturnValue(true);

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const wishlistButton = screen.getByRole('button', { name: /rimuovi dai preferiti/i });
    expect(wishlistButton).toHaveClass('text-red-500');
  });

  it('shows format selector when multiple formats available', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByDisplayValue('1kg')).toBeInTheDocument();

    const formatSelector = screen.getByRole('combobox');
    fireEvent.change(formatSelector, { target: { value: 'format-2' } });

    expect(screen.getByDisplayValue('3kg')).toBeInTheDocument();
    expect(screen.getByText('€79,99')).toBeInTheDocument();
  });

  it('handles out of stock products', () => {
    const outOfStockProduct = {
      ...mockProduct,
      formats: [
        {
          id: 'format-1',
          size: '1kg',
          price: 29.99,
          inventory: 0
        }
      ]
    };

    render(
      <MockCommerceProvider>
        <ProductCard product={outOfStockProduct} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('Esaurito')).toBeInTheDocument();

    const addToCartButton = screen.getByRole('button', { name: /non disponibile/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('shows loading state during cart operations', async () => {
    mockCommerceContext.addToCart.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
    );

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const addToCartButton = screen.getByRole('button', { name: /aggiungi al carrello/i });
    fireEvent.click(addToCartButton);

    expect(screen.getByText('Aggiungendo...')).toBeInTheDocument();
    expect(addToCartButton).toBeDisabled();
  });

  it('handles quick view action', () => {
    const mockOnQuickView = jest.fn();

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} onQuickView={mockOnQuickView} />
      </MockCommerceProvider>
    );

    const quickViewButton = screen.getByRole('button', { name: /anteprima rapida/i });
    fireEvent.click(quickViewButton);

    expect(mockOnQuickView).toHaveBeenCalledWith(mockProduct);
  });

  it('displays subscription modal when subscription button clicked', async () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const subscriptionButton = screen.getByRole('button', { name: /abbonati/i });
    fireEvent.click(subscriptionButton);

    await waitFor(() => {
      expect(screen.getByText('Configura Abbonamento')).toBeInTheDocument();
    });
  });

  it('calculates discount percentage correctly', () => {
    const productWithDiscount = {
      ...mockProduct,
      price: 100,
      discountPrice: 80
    };

    render(
      <MockCommerceProvider>
        <ProductCard product={productWithDiscount} />
      </MockCommerceProvider>
    );

    expect(screen.getByText('-20%')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const productCard = screen.getByRole('article');

    // Test focus
    productCard.focus();
    expect(productCard).toHaveFocus();

    // Test Enter key to view product
    const mockOnClick = jest.fn();
    productCard.addEventListener('click', mockOnClick);

    fireEvent.keyDown(productCard, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('shows error state when cart operation fails', async () => {
    mockCommerceContext.addToCart.mockRejectedValue(new Error('Network error'));

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const addToCartButton = screen.getByRole('button', { name: /aggiungi al carrello/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(screen.getByText('Errore nell\'aggiunta al carrello')).toBeInTheDocument();
    });
  });

  it('applies compact layout when specified', () => {
    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} layout="compact" />
      </MockCommerceProvider>
    );

    const productCard = screen.getByRole('article');
    expect(productCard).toHaveClass('flex-row');
  });

  it('tracks analytics events', async () => {
    const { trackAnalyticsEvent } = await import('@/analytics/ga4');

    render(
      <MockCommerceProvider>
        <ProductCard product={mockProduct} />
      </MockCommerceProvider>
    );

    const addToCartButton = screen.getByRole('button', { name: /aggiungi al carrello/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(trackAnalyticsEvent).toHaveBeenCalledWith('add_to_cart', {
        product_id: mockProduct.id,
        product_name: mockProduct.name,
        category: mockProduct.category,
        price: mockProduct.discountPrice || mockProduct.price,
        quantity: 1
      });
    });
  });
});