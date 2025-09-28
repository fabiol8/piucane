import { Metadata } from 'next';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Benvenuto in PiuCane - Onboarding',
  description: 'Completa il profilo del tuo cane per iniziare il percorso personalizzato'
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <OnboardingFlow />
        </div>
      </div>
    </div>
  );
}