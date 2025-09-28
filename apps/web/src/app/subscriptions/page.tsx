import { Metadata } from 'next';
import SubscriptionManager from '@/components/subscriptions/SubscriptionManager';

export const metadata: Metadata = {
  title: 'I miei abbonamenti - PiuCane',
  description: 'Gestisci i tuoi abbonamenti attivi e ricorrenti su PiuCane'
};

export default function SubscriptionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriptionManager />
    </div>
  );
}