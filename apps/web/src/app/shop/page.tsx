import { Metadata } from 'next';
import ProductCatalog from '@/components/shop/ProductCatalog';

export const metadata: Metadata = {
  title: 'Shop - PiuCane',
  description: 'Scopri i migliori prodotti per il tuo cane. Cibo, accessori, giocattoli e molto altro.',
  keywords: 'cibo cani, accessori cani, giocattoli cani, prodotti per cani'
};

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProductCatalog />
    </div>
  );
}