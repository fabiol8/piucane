'use client';

import { useState } from 'react';
import { Button, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';

interface Subscription {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  frequency: string;
  customFrequency?: {
    interval: string;
    count: number;
  };
  basePrice: number;
  discountedPrice: number;
  totalPrice: number;
  discountPercentage: number;
  status: 'active' | 'paused' | 'cancelled' | 'cancelling';
  nextDeliveryDate: string;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
}

interface SubscriptionEditModalProps {
  subscription: Subscription;
  onClose: () => void;
  onSave: (updates: Partial<Subscription>) => void;
}

export default function SubscriptionEditModal({ subscription, onClose, onSave }: SubscriptionEditModalProps) {
  const [formData, setFormData] = useState({
    quantity: subscription.quantity,
    frequency: subscription.frequency,
    customFrequency: subscription.customFrequency || {
      interval: 'month' as 'day' | 'week' | 'month',
      count: 1
    },
    useCustomFrequency: !!subscription.customFrequency,
    nextDeliveryDate: subscription.nextDeliveryDate.split('T')[0], // Format for date input
    shippingAddress: { ...subscription.shippingAddress }
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updates = {
        quantity: formData.quantity,
        frequency: formData.useCustomFrequency ? 'custom' : formData.frequency,
        customFrequency: formData.useCustomFrequency ? formData.customFrequency : undefined,
        nextDeliveryDate: formData.nextDeliveryDate,
        shippingAddress: formData.shippingAddress
      };

      const response = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Calculate new total price
        const newTotalPrice = subscription.discountedPrice * formData.quantity;

        trackEvent('subscription_updated', {
          subscription_id: subscription.id,
          product_id: subscription.productId,
          changes: Object.keys(updates)
        });

        onSave({
          quantity: formData.quantity,
          frequency: formData.useCustomFrequency ? 'custom' : formData.frequency,
          customFrequency: formData.useCustomFrequency ? formData.customFrequency : undefined,
          totalPrice: newTotalPrice,
          nextDeliveryDate: formData.nextDeliveryDate,
          shippingAddress: formData.shippingAddress
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Errore nell\'aggiornamento dell\'abbonamento');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Errore nell\'aggiornamento dell\'abbonamento');
    } finally {
      setIsLoading(false);
    }
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

  const getTotalPrice = () => {
    return subscription.discountedPrice * formData.quantity;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Modifica abbonamento</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Product Info */}
          <div className="flex space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              {subscription.productImage && (
                <img
                  src={subscription.productImage}
                  alt={subscription.productName}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{subscription.productName}</h3>
              <div className="text-sm text-orange-600">
                €{subscription.discountedPrice.toFixed(2)} per unità
              </div>
            </div>
          </div>

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

            {/* Next Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data prossima consegna
              </label>
              <Input
                type="date"
                value={formData.nextDeliveryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, nextDeliveryDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Shipping Address */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Indirizzo di spedizione</h4>
              <div className="space-y-3">
                <Input
                  label="Indirizzo"
                  value={formData.shippingAddress.street}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                  }))}
                  placeholder="Via Roma 123"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Città"
                    value={formData.shippingAddress.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                    }))}
                    placeholder="Milano"
                  />

                  <Input
                    label="CAP"
                    value={formData.shippingAddress.zipCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                    }))}
                    placeholder="20100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paese
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
            </div>

            {/* Summary */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Riepilogo modifiche</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Quantità:</span>
                  <span>{formData.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frequenza:</span>
                  <span>{getFrequencyText()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prossima consegna:</span>
                  <span>{new Date(formData.nextDeliveryDate).toLocaleDateString('it-IT')}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Nuovo totale per consegna:</span>
                  <span>€{getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}