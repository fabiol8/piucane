import { Metadata } from 'next';
import CheckoutFlow from '@/components/checkout/CheckoutFlow';

export const metadata: Metadata = {
  title: 'Checkout - PiuCane',
  description: 'Completa il tuo ordine su PiuCane',
  robots: 'noindex'
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutFlow />
    </div>
  );
}