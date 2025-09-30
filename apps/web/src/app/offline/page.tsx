'use client';

import React from 'react';
import { WifiOff, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <WifiOff className="w-20 h-20 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sei offline
          </h1>
          <p className="text-gray-600">
            Non è possibile connettersi a Internet. Verifica la tua connessione e riprova.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleRetry}
            className="w-full"
            variant="default"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Riprova
          </Button>

          <Button
            onClick={goHome}
            variant="outline"
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Torna alla home
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">
            <strong>Modalità offline limitata:</strong>
          </p>
          <ul className="text-left space-y-1">
            <li>• Le notifiche locali funzionano</li>
            <li>• I dati precedenti sono visibili</li>
            <li>• Le modifiche saranno sincronizzate quando tornerai online</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}