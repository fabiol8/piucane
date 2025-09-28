'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import SubscriptionCard from './SubscriptionCard';
import CreateSubscriptionModal from './CreateSubscriptionModal';

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

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [nextDeliveries, setNextDeliveries] = useState<NextDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchSubscriptions();
  }, [filterStatus]);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/subscriptions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions);
        setNextDeliveries(data.nextDeliveries);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionUpdate = (subscriptionId: string, updates: Partial<Subscription>) => {
    setSubscriptions(prev =>
      prev.map(sub =>
        sub.id === subscriptionId ? { ...sub, ...updates } : sub
      )
    );
  };

  const handleSubscriptionDelete = (subscriptionId: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
  };

  const getTotalMonthlySavings = () => {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => {
        const monthlySavings = (sub.basePrice - sub.discountedPrice) * sub.quantity;
        return total + monthlySavings;
      }, 0);
  };

  const getUpcomingDeliveries = () => {
    return nextDeliveries
      .filter(delivery => {
        const deliveryDate = new Date(delivery.scheduledDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return deliveryDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filterStatus === 'all') return true;
    return sub.status === filterStatus;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse max-w-6xl mx-auto">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
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
          <h1 className="text-3xl font-bold text-gray-900">I miei abbonamenti</h1>
          <p className="text-gray-600 mt-2">
            Gestisci i tuoi abbonamenti ricorrenti e ottimizza le consegne
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          data-cta-id="subscriptions.create.button.click"
        >
          ➕ Nuovo abbonamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {subscriptions.filter(sub => sub.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Abbonamenti attivi</div>
        </Card>

        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">
            €{getTotalMonthlySavings().toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Risparmio mensile</div>
        </Card>

        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {getUpcomingDeliveries().length}
          </div>
          <div className="text-sm text-gray-600">Consegne prossime</div>
        </Card>

        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {subscriptions.reduce((total, sub) => total + sub.totalDeliveries, 0)}
          </div>
          <div className="text-sm text-gray-600">Consegne totali</div>
        </Card>
      </div>

      {/* Upcoming Deliveries */}
      {getUpcomingDeliveries().length > 0 && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Prossime consegne (30 giorni)
          </h2>

          <div className="space-y-3">
            {getUpcomingDeliveries().map((delivery) => {
              const subscription = subscriptions.find(sub => sub.id === delivery.subscriptionId);
              if (!subscription) return null;

              const deliveryDate = new Date(delivery.scheduledDate);
              const daysUntil = Math.ceil((deliveryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div key={delivery.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                      {subscription.productImage && (
                        <img
                          src={subscription.productImage}
                          alt={subscription.productName}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{subscription.productName}</h3>
                      <p className="text-sm text-gray-600">Quantità: {delivery.quantity}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {deliveryDate.toLocaleDateString('it-IT')}
                    </div>
                    <div className={`text-sm ${
                      daysUntil <= 3 ? 'text-orange-600' :
                      daysUntil <= 7 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {daysUntil === 0 ? 'Oggi' :
                       daysUntil === 1 ? 'Domani' :
                       `Fra ${daysUntil} giorni`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <span className="text-sm font-medium text-gray-700">Filtra per stato:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        >
          <option value="all">Tutti</option>
          <option value="active">Attivi</option>
          <option value="paused">In pausa</option>
          <option value="cancelling">In cancellazione</option>
          <option value="cancelled">Cancellati</option>
        </select>

        <div className="text-sm text-gray-600">
          {filteredSubscriptions.length} abbonamenti trovati
        </div>
      </div>

      {/* Subscriptions Grid */}
      {filteredSubscriptions.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filterStatus === 'all' ? 'Nessun abbonamento' : `Nessun abbonamento ${filterStatus}`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filterStatus === 'all'
              ? 'Crea il tuo primo abbonamento per ricevere i prodotti del tuo cane automaticamente.'
              : 'Prova a cambiare i filtri per vedere altri abbonamenti.'
            }
          </p>
          {filterStatus === 'all' && (
            <Button
              onClick={() => setShowCreateModal(true)}
              data-cta-id="subscriptions.empty_create.button.click"
            >
              Crea primo abbonamento
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onUpdate={handleSubscriptionUpdate}
              onDelete={handleSubscriptionDelete}
              nextDelivery={nextDeliveries.find(d => d.subscriptionId === subscription.id)}
            />
          ))}
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newSubscription) => {
            setSubscriptions(prev => [newSubscription, ...prev]);
            setShowCreateModal(false);
            fetchSubscriptions(); // Refresh to get updated data
          }}
        />
      )}
    </div>
  );
}