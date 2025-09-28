'use client';

import { Button } from '@piucane/ui';
import Image from 'next/image';

interface WelcomeStepProps {
  onNext: (data: any) => void;
  isFirst: boolean;
}

export default function WelcomeStep({ onNext, isFirst }: WelcomeStepProps) {
  const handleContinue = () => {
    onNext({});
  };

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="mx-auto w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-6xl">🐕</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Benvenuto in PiuCane!
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Creiamo insieme il profilo perfetto per il tuo cane. Ci vorranno solo pochi minuti
          per personalizzare la sua alimentazione e iniziare il percorso verso il benessere.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
        <div className="text-center p-6 bg-orange-50 rounded-lg">
          <div className="text-3xl mb-3">🍽️</div>
          <h3 className="font-semibold text-gray-900 mb-2">Alimentazione Personalizzata</h3>
          <p className="text-sm text-gray-600">
            Piani nutrizionali studiati appositamente per il tuo cane
          </p>
        </div>

        <div className="text-center p-6 bg-orange-50 rounded-lg">
          <div className="text-3xl mb-3">🩺</div>
          <h3 className="font-semibold text-gray-900 mb-2">Consulenza Veterinaria</h3>
          <p className="text-sm text-gray-600">
            Supporto AI da veterinari ed educatori cinofili
          </p>
        </div>

        <div className="text-center p-6 bg-orange-50 rounded-lg">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold text-gray-900 mb-2">Missioni e Obiettivi</h3>
          <p className="text-sm text-gray-600">
            Gamification per rendere divertente la cura quotidiana
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          size="lg"
          className="px-8"
          data-cta-id="onboarding.welcome.continue.click"
        >
          Iniziamo! 🚀
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-6">
        ⏱️ Tempo stimato: 3-5 minuti
      </p>
    </div>
  );
}