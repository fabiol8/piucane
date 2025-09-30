/**
 * Consent Management Platform (CMP) component with Consent Mode v2
 */

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Modal } from './modal';
import { FormCheckbox } from './form';
import { updateConsent } from '@/analytics/ga4';
import { trackEvent } from '@/analytics/ga4';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  necessary: boolean;
}

interface ConsentManagerProps {
  showBanner?: boolean;
  onConsentUpdate?: (consent: ConsentState) => void;
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  showBanner = true,
  onConsentUpdate,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    analytics: false,
    marketing: false,
    functional: true,
    necessary: true,
  });

  // Check if consent has been given before
  useEffect(() => {
    const savedConsent = localStorage.getItem('piucane_consent');
    if (!savedConsent && showBanner) {
      setIsVisible(true);
    } else if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed);
        updateConsent(parsed);
      } catch (error) {
        console.error('Error parsing saved consent:', error);
        setIsVisible(true);
      }
    }
  }, [showBanner]);

  const saveConsent = (newConsent: ConsentState) => {
    const consentData = {
      ...newConsent,
      timestamp: Date.now(),
      version: '1.0',
    };

    localStorage.setItem('piucane_consent', JSON.stringify(consentData));
    setConsent(newConsent);
    updateConsent(newConsent);
    onConsentUpdate?.(newConsent);

    // Track consent decision
    trackEvent('consent_update', {
      analytics_granted: newConsent.analytics,
      marketing_granted: newConsent.marketing,
      functional_granted: newConsent.functional,
    });
  };

  const handleAcceptAll = () => {
    const allConsent = {
      analytics: true,
      marketing: true,
      functional: true,
      necessary: true,
    };
    saveConsent(allConsent);
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const minimalConsent = {
      analytics: false,
      marketing: false,
      functional: true,
      necessary: true,
    };
    saveConsent(minimalConsent);
    setIsVisible(false);
  };

  const handleCustomConsent = () => {
    saveConsent(consent);
    setShowPreferences(false);
    setIsVisible(false);
  };

  const openPreferences = () => {
    setShowPreferences(true);
  };

  if (!isVisible && !showPreferences) return null;

  return (
    <>
      {/* Consent Banner */}
      {isVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
          role="dialog"
          aria-labelledby="consent-title"
          aria-describedby="consent-description"
        >
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h3 id="consent-title" className="text-lg font-semibold text-gray-900 mb-2">
                  Rispettiamo la tua privacy
                </h3>
                <p id="consent-description" className="text-sm text-gray-600">
                  Utilizziamo cookie e tecnologie simili per migliorare la tua esperienza,
                  personalizzare i contenuti e analizzare il traffico. Puoi gestire le tue
                  preferenze in qualsiasi momento.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPreferences}
                  ctaId="consent.preferences.button.click"
                >
                  Personalizza
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  ctaId="consent.reject_all.button.click"
                >
                  Rifiuta tutti
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptAll}
                  ctaId="consent.accept_all.button.click"
                >
                  Accetta tutti
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <Modal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Gestisci le tue preferenze sui cookie"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowPreferences(false)}
            >
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={handleCustomConsent}
              ctaId="consent.save_preferences.button.click"
            >
              Salva preferenze
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Scegli quali cookie desideri accettare. Puoi modificare queste impostazioni
            in qualsiasi momento dal footer del nostro sito.
          </p>

          <div className="space-y-4">
            {/* Necessary Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Cookie necessari</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Essenziali per il funzionamento del sito web. Non possono essere disabilitati.
                  </p>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Sempre attivo
                </div>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <FormCheckbox
                label="Cookie funzionali"
                checked={consent.functional}
                onChange={(e) => setConsent(prev => ({ ...prev, functional: e.target.checked }))}
                hint="Permettono funzionalità avanzate come il salvataggio delle preferenze e il login automatico."
              />
            </div>

            {/* Analytics Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <FormCheckbox
                label="Cookie analitici"
                checked={consent.analytics}
                onChange={(e) => setConsent(prev => ({ ...prev, analytics: e.target.checked }))}
                hint="Ci aiutano a capire come interagisci con il sito per migliorare l'esperienza utente."
              />
            </div>

            {/* Marketing Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <FormCheckbox
                label="Cookie di marketing"
                checked={consent.marketing}
                onChange={(e) => setConsent(prev => ({ ...prev, marketing: e.target.checked }))}
                hint="Utilizzati per mostrarti annunci personalizzati e misurare l'efficacia delle campagne."
              />
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <p>
              Per maggiori informazioni sui cookie che utilizziamo, consulta la nostra{' '}
              <a href="/privacy" className="text-primary hover:underline">
                Informativa sulla Privacy
              </a>
              {' '}e la{' '}
              <a href="/cookie-policy" className="text-primary hover:underline">
                Cookie Policy
              </a>
              .
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

// Consent preferences widget for settings page
export const ConsentPreferences: React.FC = () => {
  const [consent, setConsent] = useState<ConsentState>({
    analytics: false,
    marketing: false,
    functional: true,
    necessary: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedConsent = localStorage.getItem('piucane_consent');
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed);
      } catch (error) {
        console.error('Error loading consent preferences:', error);
      }
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const consentData = {
        ...consent,
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorage.setItem('piucane_consent', JSON.stringify(consentData));
      updateConsent(consent);

      trackEvent('consent_update', {
        analytics_granted: consent.analytics,
        marketing_granted: consent.marketing,
        functional_granted: consent.functional,
        source: 'settings_page',
      });

      // Show success message
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Preferenze sui cookie aggiornate con successo',
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error saving consent preferences:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nel salvare le preferenze. Riprova.',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Preferenze sui Cookie</h3>
        <p className="text-sm text-gray-600 mt-1">
          Gestisci le tue preferenze sulla privacy e sui cookie.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-900">Cookie necessari</h4>
          <p className="text-sm text-gray-600 mt-1">
            Sempre attivi - Essenziali per il funzionamento del sito
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <FormCheckbox
            label="Cookie funzionali"
            checked={consent.functional}
            onChange={(e) => setConsent(prev => ({ ...prev, functional: e.target.checked }))}
            hint="Salvataggio preferenze, login automatico, personalizzazione"
          />
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <FormCheckbox
            label="Cookie analitici"
            checked={consent.analytics}
            onChange={(e) => setConsent(prev => ({ ...prev, analytics: e.target.checked }))}
            hint="Google Analytics, statistiche di utilizzo, miglioramento del servizio"
          />
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <FormCheckbox
            label="Cookie di marketing"
            checked={consent.marketing}
            onChange={(e) => setConsent(prev => ({ ...prev, marketing: e.target.checked }))}
            hint="Pubblicità personalizzata, retargeting, campagne promozionali"
          />
        </div>
      </div>

      <Button
        variant="primary"
        onClick={handleSave}
        loading={loading}
        ctaId="account.consent.save.button.click"
      >
        Salva preferenze
      </Button>
    </div>
  );
};