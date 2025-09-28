'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  subscription?: {
    enabled: boolean;
    discount: number;
    frequencies: string[];
  };
}

interface CreateSubscriptionModalProps {
  onClose: () => void;
  onSuccess: (subscription: any) => void;
}

export default function CreateSubscriptionModal({ onClose, onSuccess }: CreateSubscriptionModalProps) {
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    frequency: 'monthly',
    customFrequency: {
      interval: 'month' as 'day' | 'week' | 'month',
      count: 1
    },
    startDate: '',
    useCustomFrequency: false,
    shippingAddress: {
      street: '',
      city: '',
      zipCode: '',
      country: 'Italia'
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionProducts();
    loadUserAddress();
  }, []);

  const fetchSubscriptionProducts = async () => {
    try {
      const response = await fetch('/api/products?subscription=true');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products.filter((p: Product) => p.subscription?.enabled));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const loadUserAddress = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        if (userData.address) {
          setFormData(prev => ({
            ...prev,
            shippingAddress: userData.address
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user address:', error);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData(prev => ({ ...prev, productId: product.id }));
    setStep(2);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const subscriptionData = {
        productId: formData.productId,
        quantity: formData.quantity,
        frequency: formData.useCustomFrequency ? 'custom' : formData.frequency,
        customFrequency: formData.useCustomFrequency ? formData.customFrequency : undefined,
        startDate: formData.startDate || undefined,
        shippingAddress: formData.shippingAddress
      };

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        const newSubscription = await response.json();

        trackEvent('subscription_created', {
          subscription_id: newSubscription.id,
          product_id: formData.productId,
          frequency: formData.frequency,
          value: newSubscription.totalPrice
        });

        onSuccess(newSubscription);
      } else {
        const error = await response.json();
        alert(error.error || 'Errore nella creazione dell\'abbonamento');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Errore nella creazione dell\'abbonamento');
    } finally {
      setIsLoading(false);
    }
  };

  const getDiscountedPrice = () => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * (1 - (selectedProduct.subscription?.discount || 0) / 100);
  };

  const getFrequencyText = () => {
    if (formData.useCustomFrequency) {
      const interval = formData.customFrequency.interval === 'day' ? 'giorni' :
                     formData.customFrequency.interval === 'week' ? 'settimane' : 'mesi';
      return `Ogni ${formData.customFrequency.count} ${interval}`;
    }

    switch (formData.frequency) {
      case 'weekly': return 'Settimanale';
      case 'biweekly': return 'Ogni 2 settimane';
      case 'monthly': return 'Mensile';
      case 'bimonthly': return 'Ogni 2 mesi';
      case 'quarterly': return 'Trimestrale';
      default: return formData.frequency;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Crea nuovo abbonamento</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className="w-12 h-0.5 bg-gray-200"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className="w-12 h-0.5 bg-gray-200"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Product Selection */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Scegli il prodotto per l'abbonamento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="flex space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            📦
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 line-clamp-2">
                          {product.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-lg font-bold text-gray-900">
                            €{(product.price * (1 - (product.subscription?.discount || 0) / 100)).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            €{product.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            -{product.subscription?.discount}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && selectedProduct && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configura l'abbonamento
              </h3>

              {/* Selected Product */}
              <Card className="mb-6">
                <div className="flex space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {selectedProduct.images.length > 0 && (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
                    <div className="text-lg font-bold text-orange-600">
                      €{getDiscountedPrice().toFixed(2)} / consegna
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantità per consegna
                  </label>
                  <select
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequenza di consegna
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.useCustomFrequency}
                        onChange={() => setFormData(prev => ({ ...prev, useCustomFrequency: false }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2">Frequenza standard</span>
                    </label>

                    {!formData.useCustomFrequency && (
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      >
                        <option value="weekly">Settimanale</option>
                        <option value="biweekly">Ogni 2 settimane</option>
                        <option value="monthly">Mensile</option>
                        <option value="bimonthly">Ogni 2 mesi</option>
                        <option value="quarterly">Trimestrale</option>
                      </select>
                    )}

                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.useCustomFrequency}
                        onChange={() => setFormData(prev => ({ ...prev, useCustomFrequency: true }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2">Frequenza personalizzata</span>
                    </label>

                    {formData.useCustomFrequency && (
                      <div className="flex space-x-2">
                        <span className="self-center">Ogni</span>
                        <select
                          value={formData.customFrequency.count}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            customFrequency: { ...prev.customFrequency, count: Number(e.target.value) }
                          }))}
                          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                        <select
                          value={formData.customFrequency.interval}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            customFrequency: { ...prev.customFrequency, interval: e.target.value as any }
                          }))}
                          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        >
                          <option value="day">Giorni</option>
                          <option value="week">Settimane</option>
                          <option value="month">Mesi</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data prima consegna (opzionale)
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Se non specificata, la prima consegna avverrà secondo la frequenza selezionata
                  </div>
                </div>

                {/* Summary */}
                <Card className="bg-orange-50">
                  <h4 className="font-semibold text-gray-900 mb-2">Riepilogo abbonamento</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Prodotto:</span>
                      <span>{selectedProduct.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantità:</span>
                      <span>{formData.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frequenza:</span>
                      <span>{getFrequencyText()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Totale per consegna:</span>
                      <span>€{(getDiscountedPrice() * formData.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Risparmio per consegna:</span>
                      <span>€{((selectedProduct.price - getDiscountedPrice()) * formData.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
                >
                  Indietro
                </Button>
                <Button
                  onClick={() => setStep(3)}
                >
                  Continua
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Shipping Address */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Indirizzo di spedizione
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    label="Indirizzo *"
                    value={formData.shippingAddress.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                    }))}
                    placeholder="Via Roma 123"
                  />
                </div>

                <Input
                  label="Città *"
                  value={formData.shippingAddress.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                  }))}
                  placeholder="Milano"
                />

                <Input
                  label="CAP *"
                  value={formData.shippingAddress.zipCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                  }))}
                  placeholder="20100"
                />

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paese *
                  </label>
                  <select
                    value={formData.shippingAddress.country}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shippingAddress: { ...prev.shippingAddress, country: e.target.value }
                    }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  >
                    <option value="Italia">Italia</option>
                    <option value="Francia">Francia</option>
                    <option value="Germania">Germania</option>
                    <option value="Spagna">Spagna</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setStep(2)}
                >
                  Indietro
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.shippingAddress.street || !formData.shippingAddress.city || !formData.shippingAddress.zipCode}
                >
                  {isLoading ? 'Creazione...' : 'Crea abbonamento'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}