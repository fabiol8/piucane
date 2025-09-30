import { Metadata } from "next";
import { OrderHistory } from '@/components/orders';

export const metadata: Metadata = {
  title: "Ordini & Resi - PiùCane",
  description: "Gestisci i tuoi ordini, tracking spedizioni e richieste di reso",
};

export default function OrdersPage() {
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">📦 Ordini & Resi</h1>
          <p className="text-gray-600">
            Traccia i tuoi ordini, richiedi resi e gestisci tutte le spedizioni dal tuo account.
          </p>
        </div>

        <OrderHistory userId={userId} />
      </div>
    </div>
  );
}
