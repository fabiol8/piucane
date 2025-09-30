'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  X,
  Shield,
  Cookie,
  BarChart3,
  Target,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Settings,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  functional: boolean;
}

interface ConsentBannerProps {
  className?: string;
}

export function ConsentBanner({ className }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
    personalization: false,
    functional: false
  });
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    // Check if user has already made consent choices
    const savedConsent = localStorage.getItem('piucane_consent');
    const consentTimestamp = localStorage.getItem('piucane_consent_timestamp');

    if (savedConsent && consentTimestamp) {
      const consentDate = new Date(consentTimestamp);
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

      // Show banner if consent is older than 13 months (GDPR requirement)
      if (consentDate < thirteenMonthsAgo) {
        setIsVisible(true);
      } else {
        const saved = JSON.parse(savedConsent);
        setPreferences(saved);
        setHasConsented(true);
        applyConsent(saved);
      }
    } else {
      // First visit - show banner after 2 seconds
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const applyConsent = (prefs: ConsentPreferences) => {
    // Apply Google Analytics consent
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': prefs.analytics ? 'granted' : 'denied',
        'ad_storage': prefs.marketing ? 'granted' : 'denied',
        'ad_user_data': prefs.marketing ? 'granted' : 'denied',
        'ad_personalization': prefs.personalization ? 'granted' : 'denied',
        'functionality_storage': prefs.functional ? 'granted' : 'denied',
        'personalization_storage': prefs.personalization ? 'granted' : 'denied'
      });
    }

    // Apply other tracking services
    if (prefs.analytics) {
      // Initialize analytics services
      console.log('Analytics enabled');
    }

    if (prefs.marketing) {
      // Initialize marketing pixels (Facebook, Google Ads, etc.)
      console.log('Marketing enabled');
    }

    if (prefs.personalization) {
      // Initialize personalization features
      console.log('Personalization enabled');
    }

    if (prefs.functional) {
      // Initialize functional cookies (chat widgets, etc.)
      console.log('Functional cookies enabled');
    }

    // Fire custom consent event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('piucane_consent_updated', {
        detail: prefs
      }));
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      functional: true
    };

    setPreferences(allAccepted);
    saveConsent(allAccepted);
    applyConsent(allAccepted);
    setIsVisible(false);
    setHasConsented(true);

    // Track consent acceptance
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'consent_accept_all', {
        event_category: 'privacy',
        event_label: 'banner'
      });
    }
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      functional: false
    };

    setPreferences(onlyNecessary);
    saveConsent(onlyNecessary);
    applyConsent(onlyNecessary);
    setIsVisible(false);
    setHasConsented(true);

    // Track consent rejection
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'consent_reject_all', {
        event_category: 'privacy',
        event_label: 'banner'
      });
    }
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
    applyConsent(preferences);
    setIsVisible(false);
    setShowSettings(false);
    setHasConsented(true);

    // Track custom consent preferences
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'consent_custom', {
        event_category: 'privacy',
        event_label: 'settings',
        custom_parameters: {
          analytics: preferences.analytics,
          marketing: preferences.marketing,
          personalization: preferences.personalization,
          functional: preferences.functional
        }
      });
    }
  };

  const saveConsent = (prefs: ConsentPreferences) => {
    localStorage.setItem('piucane_consent', JSON.stringify(prefs));
    localStorage.setItem('piucane_consent_timestamp', new Date().toISOString());
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === 'necessary') return; // Can't disable necessary cookies

    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isVisible && hasConsented) {
    return null;
  }

  return (
    <div className={cn(
      "fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300",
      className
    )}>
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {!showSettings ? (
            // Main consent banner
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">
                    Rispettiamo la tua privacy
                  </h3>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  Utilizziamo cookie e tecnologie simili per migliorare la tua esperienza,
                  personalizzare i contenuti e analizzare il traffico. Puoi scegliere quali
                  cookie accettare.
                </p>

                {showDetails && (
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Cookie Necessari</p>
                          <p className="text-gray-600">
                            Essenziali per il funzionamento del sito e la sicurezza
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Analytics</p>
                          <p className="text-gray-600">
                            Ci aiutano a migliorare il sito analizzando l'utilizzo
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Marketing</p>
                          <p className="text-gray-600">
                            Per mostrarti pubblicità rilevante sui tuoi interessi
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Smartphone className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Personalizzazione</p>
                          <p className="text-gray-600">
                            Per personalizzare contenuti e funzionalità
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  {showDetails ? (
                    <>Nascondi dettagli <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Mostra dettagli <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  className="text-xs"
                >
                  Rifiuta tutto
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Personalizza
                </Button>

                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="bg-orange-500 hover:bg-orange-600 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accetta tutto
                </Button>
              </div>

              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 p-1 hover:bg-gray-100 rounded"
                aria-label="Chiudi banner"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ) : (
            // Settings panel
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Impostazioni Privacy
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  {/* Necessary Cookies */}
                  <div className="flex items-start justify-between py-3 border-b border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-green-500" />
                        <h4 className="font-medium text-gray-900">Cookie Necessari</h4>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Sempre attivi
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Questi cookie sono essenziali per il funzionamento del sito web e
                        non possono essere disabilitati. Include cookie per la sicurezza,
                        l'autenticazione e le preferenze di base.
                      </p>
                    </div>
                    <Switch
                      checked={true}
                      disabled={true}
                      className="ml-4"
                    />
                  </div>

                  {/* Analytics */}
                  <div className="flex items-start justify-between py-3 border-b border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <h4 className="font-medium text-gray-900">Cookie Analytics</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Ci aiutano a capire come i visitatori interagiscono con il sito
                        raccogliendo informazioni in forma anonima. Include Google Analytics.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Provider: Google Analytics, Hotjar
                      </p>
                    </div>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={() => togglePreference('analytics')}
                      className="ml-4"
                    />
                  </div>

                  {/* Marketing */}
                  <div className="flex items-start justify-between py-3 border-b border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-purple-500" />
                        <h4 className="font-medium text-gray-900">Cookie Marketing</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Utilizzati per tracciare i visitatori sui siti web per mostrare
                        annunci rilevanti e coinvolgenti per i singoli utenti.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Provider: Facebook Pixel, Google Ads, LinkedIn
                      </p>
                    </div>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={() => togglePreference('marketing')}
                      className="ml-4"
                    />
                  </div>

                  {/* Personalization */}
                  <div className="flex items-start justify-between py-3 border-b border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="h-4 w-4 text-indigo-500" />
                        <h4 className="font-medium text-gray-900">Cookie Personalizzazione</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Permettono al sito di ricordare le scelte fatte dall'utente e
                        fornire funzionalità avanzate e personalizzate.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Provider: PiùCane, Intercom
                      </p>
                    </div>
                    <Switch
                      checked={preferences.personalization}
                      onCheckedChange={() => togglePreference('personalization')}
                      className="ml-4"
                    />
                  </div>

                  {/* Functional */}
                  <div className="flex items-start justify-between py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <h4 className="font-medium text-gray-900">Cookie Funzionali</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Abilitano funzionalità avanzate come chat dal vivo, video player
                        e altri servizi interattivi.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Provider: YouTube, Vimeo, Chat Widget
                      </p>
                    </div>
                    <Switch
                      checked={preferences.functional}
                      onCheckedChange={() => togglePreference('functional')}
                      className="ml-4"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <p>Le tue preferenze saranno salvate per 13 mesi.</p>
                    <p className="mt-1">
                      Puoi modificarle in qualsiasi momento nelle
                      <a href="/privacy-policy" className="text-orange-600 hover:text-orange-700 ml-1">
                        impostazioni privacy
                      </a>.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRejectAll}
                    >
                      Rifiuta tutto
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePreferences}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Salva preferenze
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}