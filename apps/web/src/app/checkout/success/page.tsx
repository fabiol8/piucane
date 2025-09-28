'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import Link from 'next/link';

interface OrderData {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      fetchOrderData(sessionId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchOrderData = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/checkout/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);

        // Track purchase event
        trackEvent('purchase', {
          transaction_id: data.order.id,
          currency: 'EUR',
          value: data.order.totalAmount,
          items: data.order.items?.map((item: any) => ({
            item_id: item.productId,
            item_name: item.productName,
            price: item.price,
            quantity: item.quantity
          })) || []
        });
      }
    } catch (error) {
      console.error('Error fetching order data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✅</span>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Ordine completato con successo!
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Grazie per il tuo acquisto. Riceverai una email di conferma a breve.
            </p>

            {/* Order Details */}
            {order && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Dettagli ordine
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Numero ordine:</span>
                    <span className="font-medium">#{order.id.slice(-8).toUpperCase()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Data ordine:</span>
                    <span className="font-medium">
                      {new Date(order.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Totale:</span>
                    <span className="font-semibold text-lg">€{order.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Stato:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      Confermato
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Prossimi passi:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-1">📧</span>
                  <span>Riceverai una email di conferma con i dettagli dell'ordine</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-1">📦</span>
                  <span>I tuoi prodotti verranno preparati e spediti entro 24-48 ore</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-1">🚚</span>
                  <span>Riceverai il numero di tracciamento per seguire la spedizione</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-1">🎁</span>
                  <span>Hai guadagnato punti fedeltà per questo acquisto!</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/orders" className="block">
                  <Button
                    variant="secondary"
                    className="w-full"
                    data-cta-id="checkout_success.view_orders.click"
                  >
                    📋 Visualizza i tuoi ordini
                  </Button>
                </Link>

                <Link href="/shop" className="block">
                  <Button
                    className="w-full"
                    data-cta-id="checkout_success.continue_shopping.click"
                  >
                    🛒 Continua lo shopping
                  </Button>
                </Link>
              </div>

              <Link href="/dogs" className="block">
                <Button
                  variant="secondary"
                  className="w-full"
                  data-cta-id="checkout_success.manage_dogs.click"
                >
                  🐕 Gestisci i profili dei tuoi cani
                </Button>
              </Link>
            </div>

            {/* Support */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Hai domande sul tuo ordine?
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/support" className="text-orange-600 hover:text-orange-800 text-sm">
                  📞 Contatta il supporto
                </Link>
                <Link href="/faq" className="text-orange-600 hover:text-orange-800 text-sm">
                  ❓ FAQ
                </Link>
              </div>
            </div>
          </Card>

          {/* Recommended Products */}
          <Card className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Ti potrebbero interessare anche
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Mock recommended products */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2">
                    <img
                      src={`/api/placeholder/150/150`}
                      alt={`Prodotto ${i}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                    Prodotto consigliato {i}
                  </h3>
                  <p className="text-sm text-orange-600 font-semibold">€19.99</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <Link href="/shop">
                <Button
                  variant="secondary"
                  data-cta-id="checkout_success.view_all_products.click"
                >
                  Vedi tutti i prodotti
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}