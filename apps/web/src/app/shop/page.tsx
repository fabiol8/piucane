import { Metadata } from 'next';
import { ProductCatalog } from '@/components/shop';

export const metadata: Metadata = {
  title: 'Shop - PiùCane',
  description: 'Scopri il nostro catalogo di prodotti per cani: cibo, snack, giocattoli e accessori',
};

export default function ShopPage() {
  const selectedDogId = 'demo-dog-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🛍️ Shop PiùCane</h1>
          <p className="text-gray-600">
            Trova i prodotti perfetti per il tuo cane con i nostri consigli personalizzati basati sul suo profilo.
          </p>
        </div>

        <ProductCatalog selectedDogId={selectedDogId} />
      </div>
    </div>
  );
}