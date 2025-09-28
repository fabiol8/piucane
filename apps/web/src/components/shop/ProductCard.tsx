'use client';

import { useState } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import Link from 'next/link';

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
  rating: number;
  reviewCount: number;
  subscription?: {
    enabled: boolean;
    discount: number;
    frequencies: string[];
  };
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, frequency?: string) => void;
  cartQuantity: number;
}

export default function ProductCard({ product, onAddToCart, cartQuantity }: ProductCardProps) {
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    onAddToCart(product, quantity, selectedFrequency || undefined);

    trackEvent('select_item', {
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

  const getDiscountedPrice = () => {
    if (selectedFrequency && product.subscription?.enabled) {
      return product.price * (1 - product.subscription.discount / 100);
    }
    return product.discountPrice || product.price;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ⭐
      </span>
    ));
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <Link
        href={`/shop/products/${product.id}`}
        data-cta-id={`shop.product_${product.id}.view.click`}
      >
        <div className="relative">
          {/* Product Image */}
          <div className="aspect-square bg-gray-100 relative overflow-hidden">
            {product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-4xl">📦</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 space-y-1">
            {!product.inStock && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                Esaurito
              </span>
            )}
            {product.discountPrice && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                -{Math.round((1 - product.discountPrice / product.price) * 100)}%
              </span>
            )}
            {product.subscription?.enabled && (
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                Abbonamento
              </span>
            )}
          </div>

          {/* Quick Add Button */}
          {cartQuantity > 0 && (
            <div className="absolute top-2 right-2">
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                {cartQuantity} nel carrello
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        {/* Brand and Category */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide">{product.brand}</span>
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>

        {/* Product Name */}
        <Link
          href={`/shop/products/${product.id}`}
          data-cta-id={`shop.product_${product.id}.title.click`}
        >
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-orange-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center space-x-1 mb-2">
          <div className="flex text-sm">
            {renderStars(Math.round(product.rating))}
          </div>
          <span className="text-xs text-gray-500">({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">
              €{getDiscountedPrice().toFixed(2)}
            </span>
            {(product.discountPrice || (selectedFrequency && product.subscription?.enabled)) && (
              <span className="text-sm text-gray-500 line-through">
                €{product.price.toFixed(2)}
              </span>
            )}
          </div>
          {selectedFrequency && product.subscription?.enabled && (
            <div className="text-xs text-orange-600">
              Sconto abbonamento: -{product.subscription.discount}%
            </div>
          )}
        </div>

        {/* Subscription Options */}
        {product.subscription?.enabled && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Frequenza consegna (opzionale)
            </label>
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="">Acquisto singolo</option>
              {product.subscription.frequencies.map((freq) => (
                <option key={freq} value={freq}>
                  Ogni {freq} ({product.subscription!.discount}% sconto)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantità
          </label>
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          >
            {Array.from({ length: Math.min(10, product.stockQuantity) }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className="w-full"
          size="sm"
          data-cta-id={`shop.product_${product.id}.add_to_cart.click`}
        >
          {product.inStock ? (
            cartQuantity > 0 ? 'Aggiungi altro' : 'Aggiungi al carrello'
          ) : (
            'Non disponibile'
          )}
        </Button>

        {/* Stock Info */}
        {product.inStock && product.stockQuantity <= 5 && (
          <div className="text-xs text-orange-600 text-center mt-1">
            Solo {product.stockQuantity} rimasti!
          </div>
        )}
      </div>
    </Card>
  );
}