'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import Link from 'next/link';

interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subscriptionFrequency?: string;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  phone: string;
}

export default function CheckoutFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    zipCode: '',
    country: 'Italia',
    phone: ''
  });
  const [promotionCode, setPromotionCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadCartData();
    loadUserAddress();
  }, []);

  const loadCartData = async () => {
    // In a real implementation, this would load from localStorage or API
    // For now, we'll simulate cart data
    setCartItems([
      {
        productId: '1',
        productName: 'Crocchette Premium per Cani Adulti',
        productImage: '/api/placeholder/150/150',
        price: 29.99,
        quantity: 2,
        subscriptionFrequency: '1 mese'
      },
      {
        productId: '2',
        productName: 'Giocattolo Kong Classic',
        productImage: '/api/placeholder/150/150',
        price: 15.50,
        quantity: 1
      }
    ]);
    setIsLoading(false);
  };

  const loadUserAddress = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        if (userData.address) {
          setShippingAddress({
            firstName: userData.name?.split(' ')[0] || '',
            lastName: userData.name?.split(' ').slice(1).join(' ') || '',
            street: userData.address.street || '',
            city: userData.address.city || '',
            zipCode: userData.address.zipCode || '',
            country: userData.address.country || 'Italia',
            phone: userData.phone || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading user address:', error);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.subscriptionFrequency
        ? item.price * 0.9 // 10% subscription discount
        : item.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal >= 49 ? 0 : 5.99; // Free shipping over €49
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateAddress = () => {
    const required = ['firstName', 'lastName', 'street', 'city', 'zipCode', 'phone'];
    return required.every(field => shippingAddress[field as keyof ShippingAddress].trim() !== '');
  };

  const proceedToPayment = async () => {
    if (!validateAddress()) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    setIsProcessing(true);

    try {
      // Track begin_checkout event
      trackEvent('begin_checkout', {
        currency: 'EUR',
        value: calculateTotal(),
        items: cartItems.map(item => ({
          item_id: item.productId,
          item_name: item.productName,
          price: item.price,
          quantity: item.quantity
        }))
      });

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            subscriptionFrequency: item.subscriptionFrequency
          })),
          shippingAddress,
          promotionCode: promotionCode || undefined
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        const error = await response.json();
        alert(error.error || 'Errore durante il checkout');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Errore durante il checkout');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12 max-w-md mx-auto">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Carrello vuoto</h1>
          <p className="text-gray-600 mb-6">
            Aggiungi alcuni prodotti per procedere al checkout.
          </p>
          <Link href="/shop">
            <Button data-cta-id="checkout.empty_cart.shop.click">
              Vai allo shop
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        <div className="flex items-center space-x-4 text-sm">
          <span className={`px-3 py-1 rounded-full ${
            currentStep >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1. Revisione ordine
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-3 py-1 rounded-full ${
            currentStep >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2. Dati spedizione
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-3 py-1 rounded-full ${
            currentStep >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3. Pagamento
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Order Review */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Il tuo ordine ({cartItems.length} articoli)
            </h2>

            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={`${item.productId}-${item.subscriptionFrequency || 'single'}`}
                     className="flex space-x-4 pb-4 border-b border-gray-200 last:border-b-0">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {item.productName}
                    </h3>

                    {item.subscriptionFrequency && (
                      <div className="text-sm text-orange-600 mt-1">
                        Abbonamento: ogni {item.subscriptionFrequency} (-10%)
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">
                        Quantità: {item.quantity}
                      </span>
                      <div className="text-right">
                        <div className="font-semibold">
                          €{((item.subscriptionFrequency ? item.price * 0.9 : item.price) * item.quantity).toFixed(2)}
                        </div>
                        {item.subscriptionFrequency && (
                          <div className="text-xs text-gray-500 line-through">
                            €{(item.price * item.quantity).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Shipping Address */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Indirizzo di spedizione
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome *"
                value={shippingAddress.firstName}
                onChange={(e) => handleAddressChange('firstName', e.target.value)}
                placeholder="Mario"
              />

              <Input
                label="Cognome *"
                value={shippingAddress.lastName}
                onChange={(e) => handleAddressChange('lastName', e.target.value)}
                placeholder="Rossi"
              />

              <div className="col-span-2">
                <Input
                  label="Indirizzo *"
                  value={shippingAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Via Roma 123"
                />
              </div>

              <Input
                label="Città *"
                value={shippingAddress.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="Milano"
              />

              <Input
                label="CAP *"
                value={shippingAddress.zipCode}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                placeholder="20100"
              />

              <Input
                label="Telefono *"
                value={shippingAddress.phone}
                onChange={(e) => handleAddressChange('phone', e.target.value)}
                placeholder="+39 123 456 7890"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paese *
                </label>
                <select
                  value={shippingAddress.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                >
                  <option value="Italia">Italia</option>
                  <option value="Francia">Francia</option>
                  <option value="Germania">Germania</option>
                  <option value="Spagna">Spagna</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Promotion Code */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Codice promozionale
            </h2>

            <div className="flex space-x-3">
              <Input
                placeholder="Inserisci codice sconto"
                value={promotionCode}
                onChange={(e) => setPromotionCode(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="secondary"
                data-cta-id="checkout.apply_promo.click"
              >
                Applica
              </Button>
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Riepilogo ordine
            </h2>

            <div className="space-y-3 pb-4 border-b border-gray-200">
              <div className="flex justify-between">
                <span>Subtotale</span>
                <span>€{calculateSubtotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Spedizione</span>
                <span className={calculateShipping() === 0 ? 'text-green-600' : ''}>
                  {calculateShipping() === 0 ? 'Gratuita' : `€${calculateShipping().toFixed(2)}`}
                </span>
              </div>

              {calculateShipping() > 0 && (
                <div className="text-xs text-gray-500">
                  Spedizione gratuita per ordini superiori a €49
                </div>
              )}
            </div>

            <div className="flex justify-between text-lg font-semibold pt-4">
              <span>Totale</span>
              <span>€{calculateTotal().toFixed(2)}</span>
            </div>

            <Button
              onClick={proceedToPayment}
              disabled={isProcessing || !validateAddress()}
              className="w-full mt-6 text-lg py-3"
              data-cta-id="checkout.proceed_to_payment.click"
            >
              {isProcessing ? 'Elaborazione...' : 'Procedi al pagamento'}
            </Button>

            <div className="text-xs text-gray-500 text-center mt-3">
              🔒 Pagamento sicuro con crittografia SSL
            </div>

            <div className="text-xs text-gray-500 text-center mt-2">
              Carte accettate: Visa, Mastercard, American Express
            </div>
          </Card>

          {/* Security Features */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Acquisto sicuro</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span>🔒</span>
                <span>Pagamenti crittografati SSL</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>📦</span>
                <span>Spedizione tracciata</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>↩️</span>
                <span>Reso gratuito entro 30 giorni</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🎧</span>
                <span>Supporto clienti 24/7</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}