'use client';

import { useState } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import SubscriptionEditModal from './SubscriptionEditModal';

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
  lastDeliveryDate?: string;
  totalDeliveries: number;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  pausedUntil?: string;
}

interface NextDelivery {
  id: string;
  subscriptionId: string;
  scheduledDate: string;
  quantity: number;
  status: string;
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onUpdate: (subscriptionId: string, updates: Partial<Subscription>) => void;
  onDelete: (subscriptionId: string) => void;
  nextDelivery?: NextDelivery;
}

export default function SubscriptionCard({
  subscription,
  onUpdate,
  onDelete,
  nextDelivery
}: SubscriptionCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'paused': return 'text-yellow-600 bg-yellow-50';
      case 'cancelling': return 'text-orange-600 bg-orange-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Attivo';
      case 'paused': return 'In pausa';
      case 'cancelling': return 'In cancellazione';
      case 'cancelled': return 'Cancellato';
      default: return status;
    }
  };

  const getFrequencyText = (frequency: string, customFrequency?: any) => {
    if (customFrequency) {
      const interval = customFrequency.interval === 'day' ? 'giorni' :
                     customFrequency.interval === 'week' ? 'settimane' : 'mesi';
      return `Ogni ${customFrequency.count} ${interval}`;
    }

    switch (frequency) {
      case 'weekly': return 'Settimanale';
      case 'biweekly': return 'Ogni 2 settimane';
      case 'monthly': return 'Mensile';
      case 'bimonthly': return 'Ogni 2 mesi';
      case 'quarterly': return 'Trimestrale';
      default: return frequency;
    }
  };

  const handlePauseResume = async () => {
    setIsProcessing(true);
    try {
      const endpoint = subscription.status === 'active' ? 'pause' : 'resume';
      const response = await fetch(`/api/subscriptions/${subscription.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          endpoint === 'pause' ? {
            pauseUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          } : {}
        )
      });

      if (response.ok) {
        const newStatus = subscription.status === 'active' ? 'paused' : 'active';
        onUpdate(subscription.id, { status: newStatus });

        trackEvent('subscription_status_changed', {
          subscription_id: subscription.id,
          product_id: subscription.productId,
          new_status: newStatus,
          action: endpoint
        });
      }
    } catch (error) {
      console.error('Error updating subscription status:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Sei sicuro di voler cancellare questo abbonamento?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User cancellation',
          immediate: false
        })
      });

      if (response.ok) {
        onUpdate(subscription.id, { status: 'cancelling' });

        trackEvent('subscription_cancelled', {
          subscription_id: subscription.id,
          product_id: subscription.productId,
          reason: 'User cancellation'
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysUntilNextDelivery = () => {
    if (!nextDelivery) return null;
    const deliveryDate = new Date(nextDelivery.scheduledDate);
    const now = new Date();
    const diffTime = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const nextDeliveryDays = getDaysUntilNextDelivery();

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {subscription.productImage ? (
                <img
                  src={subscription.productImage}
                  alt={subscription.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  📦
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 line-clamp-2">
                {subscription.productName}
              </h3>
              <div className="text-sm text-gray-600">
                Quantità: {subscription.quantity}
              </div>
            </div>
          </div>

          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
            {getStatusText(subscription.status)}
          </span>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">
              €{subscription.totalPrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 line-through">
              €{(subscription.basePrice * subscription.quantity).toFixed(2)}
            </span>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              -{subscription.discountPercentage}%
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {getFrequencyText(subscription.frequency, subscription.customFrequency)}
          </div>
        </div>

        {/* Next Delivery */}
        {subscription.status === 'active' && nextDelivery && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900">Prossima consegna</div>
            <div className="text-sm text-blue-700">
              {new Date(nextDelivery.scheduledDate).toLocaleDateString('it-IT')}
              {nextDeliveryDays !== null && (
                <span className={`ml-2 ${
                  nextDeliveryDays <= 3 ? 'text-orange-600' :
                  nextDeliveryDays <= 7 ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  ({nextDeliveryDays === 0 ? 'Oggi' :
                    nextDeliveryDays === 1 ? 'Domani' :
                    `Fra ${nextDeliveryDays} giorni`})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pause Info */}
        {subscription.status === 'paused' && subscription.pausedUntil && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <div className="text-sm font-medium text-yellow-900">In pausa fino al</div>
            <div className="text-sm text-yellow-700">
              {new Date(subscription.pausedUntil).toLocaleDateString('it-IT')}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-900">{subscription.totalDeliveries}</div>
            <div className="text-gray-600">Consegne</div>
          </div>
          <div>
            <div className="font-semibold text-green-600">
              €{((subscription.basePrice - subscription.discountedPrice) * subscription.quantity).toFixed(2)}
            </div>
            <div className="text-gray-600">Risparmio</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {subscription.status === 'active' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEditModal(true)}
                data-cta-id={`subscription_${subscription.id}.edit.click`}
              >
                ✏️ Modifica
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePauseResume}
                disabled={isProcessing}
                data-cta-id={`subscription_${subscription.id}.pause.click`}
              >
                ⏸️ Pausa
              </Button>
            </div>
          )}

          {subscription.status === 'paused' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={handlePauseResume}
                disabled={isProcessing}
                data-cta-id={`subscription_${subscription.id}.resume.click`}
              >
                ▶️ Riprendi
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEditModal(true)}
                data-cta-id={`subscription_${subscription.id}.edit.click`}
              >
                ✏️ Modifica
              </Button>
            </div>
          )}

          {(subscription.status === 'active' || subscription.status === 'paused') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full text-red-600 hover:text-red-800"
              data-cta-id={`subscription_${subscription.id}.cancel.click`}
            >
              🗑️ Cancella abbonamento
            </Button>
          )}

          {subscription.status === 'cancelled' && (
            <div className="text-center text-sm text-gray-500 py-2">
              Abbonamento cancellato
            </div>
          )}
        </div>

        {/* Created Date */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Creato il {new Date(subscription.createdAt).toLocaleDateString('it-IT')}
        </div>
      </Card>

      {/* Edit Modal */}
      {showEditModal && (
        <SubscriptionEditModal
          subscription={subscription}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) => {
            onUpdate(subscription.id, updates);
            setShowEditModal(false);
          }}
        />
      )}
    </>
  );
}