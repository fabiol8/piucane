import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/shop/ProductDetail';

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  // In production, fetch product data for metadata
  return {
    title: 'Prodotto - PiuCane Shop',
    description: 'Dettagli del prodotto selezionato'
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const productId = params.id;

  if (!productId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProductDetail productId={productId} />
    </div>
  );
}