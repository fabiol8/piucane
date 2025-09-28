'use client';

import { useState } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  subscription?: {
    enabled: boolean;
    discount: number;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedFrequency?: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number, frequency?: string) => void;
  onRemoveItem: (productId: string, frequency?: string) => void;
  total: number;
}

export default function ShoppingCart({
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  total
}: ShoppingCartProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    // Track begin_checkout event
    trackEvent('begin_checkout', {
      currency: 'EUR',
      value: total,
      items: items.map(item => ({
        item_id: item.product.id,
        item_name: item.product.name,
        price: item.selectedFrequency && item.product.subscription?.enabled
          ? item.product.price * (1 - item.product.subscription.discount / 100)
          : item.product.price,
        quantity: item.quantity
      }))
    });

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            subscriptionFrequency: item.selectedFrequency
          }))
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        console.error('Checkout failed');
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      setIsCheckingOut(false);
    }
  };

  const getItemPrice = (item: CartItem) => {
    if (item.selectedFrequency && item.product.subscription?.enabled) {
      return item.product.price * (1 - item.product.subscription.discount / 100);
    }
    return item.product.price;
  };

  const getItemSubtotal = (item: CartItem) => {
    return getItemPrice(item) * item.quantity;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Carrello ({items.length})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-cta-id="shop.cart.close.click"
            >
              ✕
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Il carrello è vuoto
                </h3>
                <p className="text-gray-600 mb-6">
                  Aggiungi alcuni prodotti per iniziare lo shopping.
                </p>
                <Button
                  onClick={onClose}
                  data-cta-id="shop.cart.continue_shopping.click"
                >
                  Continua lo shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={`${item.product.id}-${item.selectedFrequency || 'single'}`} padding="sm">
                    <div className="flex space-x-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.images.length > 0 ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            📦
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.product.name}
                        </h4>

                        {item.selectedFrequency && (
                          <div className="text-xs text-orange-600 mt-1">
                            Abbonamento: ogni {item.selectedFrequency}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-semibold text-gray-900">
                            €{getItemPrice(item).toFixed(2)}
                            {item.selectedFrequency && item.product.subscription?.enabled && (
                              <span className="text-xs text-gray-500 line-through ml-1">
                                €{item.product.price.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onUpdateQuantity(
                                item.product.id,
                                item.quantity - 1,
                                item.selectedFrequency
                              )}
                              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm"
                              data-cta-id={`shop.cart.decrease_${item.product.id}.click`}
                            >
                              -
                            </button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(
                                item.product.id,
                                item.quantity + 1,
                                item.selectedFrequency
                              )}
                              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm"
                              data-cta-id={`shop.cart.increase_${item.product.id}.click`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-semibold text-gray-900">
                            Subtotale: €{getItemSubtotal(item).toFixed(2)}
                          </div>
                          <button
                            onClick={() => onRemoveItem(item.product.id, item.selectedFrequency)}
                            className="text-xs text-red-600 hover:text-red-800"
                            data-cta-id={`shop.cart.remove_${item.product.id}.click`}
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotale</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Spedizione</span>
                  <span className="text-green-600">Gratuita</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Totale</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full"
                  data-cta-id="shop.cart.checkout.click"
                >
                  {isCheckingOut ? 'Reindirizzamento...' : 'Procedi al pagamento'}
                </Button>

                <Link href="/shop" className="block">
                  <Button
                    variant="secondary"
                    className="w-full"
                    data-cta-id="shop.cart.continue_shopping.click"
                  >
                    Continua lo shopping
                  </Button>
                </Link>
              </div>

              {/* Security Note */}
              <div className="text-xs text-gray-500 text-center">
                🔒 Pagamento sicuro con Stripe
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}