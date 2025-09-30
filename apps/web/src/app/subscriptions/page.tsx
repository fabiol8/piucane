import { Metadata } from 'next';
import { SubscriptionManager } from '@/components/subscriptions';

export const metadata: Metadata = {
  title: 'I Tuoi Abbonamenti - PiùCane',
  description: 'Gestisci i tuoi abbonamenti: modifica frequenze, quantità e date di consegna',
};

export default function SubscriptionsPage() {
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">📦 I Tuoi Abbonamenti</h1>
          <p className="text-gray-600">
            Gestisci tutti i tuoi abbonamenti: modifica frequenze, quantità, date di consegna e molto altro.
          </p>
        </div>

        <SubscriptionManager userId={userId} />
      </div>
    </div>
  );
}