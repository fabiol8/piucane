'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import ProductCard from './ProductCard';
import ShoppingCart from './ShoppingCart';
import ProductFilters from './ProductFilters';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  subcategory: string;
  brand: string;
  tags: string[];
  inStock: boolean;
  stockQuantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  targetSize: string[];
  targetAge: string[];
  ingredients?: string[];
  nutritionalInfo?: {
    protein: number;
    fat: number;
    fiber: number;
    moisture: number;
    calories: number;
  };
  rating: number;
  reviewCount: number;
  subscription?: {
    enabled: boolean;
    discount: number;
    frequencies: string[];
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedFrequency?: string;
}

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 1000]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, sortBy, priceRange]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0; // featured
      }
    });

    setFilteredProducts(filtered);
  };

  const addToCart = (product: Product, quantity: number = 1, frequency?: string) => {
    const existingItem = cart.find(item =>
      item.product.id === product.id && item.selectedFrequency === frequency
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id && item.selectedFrequency === frequency
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity, selectedFrequency: frequency }]);
    }

    trackEvent('add_to_cart', {
      currency: 'EUR',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand,
        price: product.price,
        quantity: quantity
      }]
    });
  };

  const removeFromCart = (productId: string, frequency?: string) => {
    setCart(cart.filter(item =>
      !(item.product.id === productId && item.selectedFrequency === frequency)
    ));

    trackEvent('remove_from_cart', {
      currency: 'EUR',
      items: [{
        item_id: productId
      }]
    });
  };

  const updateCartQuantity = (productId: string, quantity: number, frequency?: string) => {
    if (quantity === 0) {
      removeFromCart(productId, frequency);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId && item.selectedFrequency === frequency
        ? { ...item, quantity }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.selectedFrequency && item.product.subscription?.enabled
        ? item.product.price * (1 - item.product.subscription.discount / 100)
        : item.product.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="md:col-span-3">
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop PiuCane</h1>
          <p className="text-gray-600 mt-2">
            Scopri i migliori prodotti per il benessere del tuo cane
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              placeholder="Cerca prodotti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowCart(true)}
            className="relative"
            data-cta-id="shop.cart.open.click"
          >
            🛒 Carrello
            {getCartItemCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {getCartItemCount()}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        >
          <option value="all">Tutte le categorie</option>
          <option value="food">Alimentazione</option>
          <option value="accessories">Accessori</option>
          <option value="toys">Giocattoli</option>
          <option value="health">Salute & Igiene</option>
          <option value="training">Addestramento</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        >
          <option value="featured">In evidenza</option>
          <option value="price-low">Prezzo: crescente</option>
          <option value="price-high">Prezzo: decrescente</option>
          <option value="rating">Valutazione</option>
          <option value="newest">Novità</option>
        </select>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Prezzo:</span>
          <span className="text-sm font-medium">€{priceRange[0]} - €{priceRange[1]}</span>
        </div>

        <div className="text-sm text-gray-600">
          {filteredProducts.length} prodotti trovati
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="hidden md:block">
          <ProductFilters
            products={products}
            onPriceRangeChange={setPriceRange}
            priceRange={priceRange}
          />
        </div>

        {/* Products Grid */}
        <div className="md:col-span-3">
          {filteredProducts.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun prodotto trovato
              </h3>
              <p className="text-gray-600 mb-6">
                Prova a modificare i filtri di ricerca o esplora altre categorie.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceRange([0, 1000]);
                }}
                data-cta-id="shop.clear_filters.button.click"
              >
                Rimuovi filtri
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  cartQuantity={cart.find(item => item.product.id === product.id)?.quantity || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <ShoppingCart
          items={cart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          total={getCartTotal()}
        />
      )}
    </div>
  );
}