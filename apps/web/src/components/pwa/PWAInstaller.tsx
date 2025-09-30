/**
 * PWA Installer Component
 * Gestisce l'installazione della PWA PiuCane
 */

'use client';

import { useState, useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/ga4';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;

      setIsInstalled(isInstalled);

      // Show promo banner if not installed and user hasn't dismissed it
      const promoDismissed = localStorage.getItem('piucane_pwa_promo_dismissed');
      if (!isInstalled && !promoDismissed) {
        setTimeout(() => setShowPromoBanner(true), 5000); // Show after 5 seconds
      }
    };

    checkInstalled();

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallButton(true);

      trackEvent('pwa_install_prompt_shown', {
        event_category: 'pwa',
        timestamp: new Date().toISOString()
      });
    };

    // Listen for successful app install
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      setIsInstalled(true);
      setShowPromoBanner(false);

      trackEvent('pwa_installed', {
        event_category: 'pwa',
        event_label: 'Installation Completed'
      });

      // Show success message
      showNotification('🎉 PiùCane installata con successo!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user's choice
      const choiceResult = await deferredPrompt.userChoice;

      trackEvent('pwa_install_prompt_response', {
        event_category: 'pwa',
        choice: choiceResult.outcome,
        event_label: choiceResult.outcome === 'accepted' ? 'Install Accepted' : 'Install Dismissed'
      });

      if (choiceResult.outcome === 'dismissed') {
        showNotification('Puoi installare PiùCane in qualsiasi momento dal menu del browser', 'info');
      }

      // Reset the deferred prompt
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('Install prompt failed:', error);
      trackEvent('pwa_install_error', {
        event_category: 'pwa',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handlePromoBannerDismiss = () => {
    setShowPromoBanner(false);
    localStorage.setItem('piucane_pwa_promo_dismissed', 'true');

    trackEvent('pwa_promo_banner_dismissed', {
      event_category: 'pwa',
      event_label: 'Promo Banner Dismissed'
    });
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    // Simple notification - in real app would use a toast library
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('PiùCane', {
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      });
    } else {
      alert(message);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();

      trackEvent('notification_permission_request', {
        event_category: 'pwa',
        permission_result: permission
      });

      if (permission === 'granted') {
        showNotification('Riceverai notifiche per reminder e aggiornamenti importanti', 'success');
      }
    }
  };

  if (isInstalled) {
    return null; // Don't show anything if already installed
  }

  return (
    <>
      {/* Install Button */}
      {showInstallButton && (
        <button
          onClick={handleInstallClick}
          data-pwa-install
          className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 transition-all duration-300 hover:scale-105"
          style={{ display: 'flex' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-semibold">Installa App</span>
        </button>
      )}

      {/* Promo Banner */}
      {showPromoBanner && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-green-500 to-orange-500 text-white p-4 shadow-lg transform transition-transform duration-500">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📱</div>
              <div>
                <h3 className="font-bold text-lg">Installa PiùCane</h3>
                <p className="text-sm opacity-90">
                  Accesso rapido, notifiche e funzionalità offline
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Installa
                </button>
              )}

              <button
                onClick={requestNotificationPermission}
                className="bg-white/20 text-white px-3 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors"
              >
                🔔 Notifiche
              </button>

              <button
                onClick={handlePromoBannerDismiss}
                className="text-white/80 hover:text-white p-1"
                aria-label="Chiudi banner"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Install Instructions */}
      {showPromoBanner && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-xl shadow-2xl p-6 border-l-4 border-green-500">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🍎</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Installa su iOS</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Tocca il pulsante <strong>Condividi</strong> ⬆️</li>
                <li>2. Scorri e tocca <strong>"Aggiungi alla schermata Home"</strong></li>
                <li>3. Tocca <strong>"Aggiungi"</strong> per confermare</li>
              </ol>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    trackEvent('ios_install_instructions_understood', {
                      event_category: 'pwa',
                      platform: 'ios'
                    });
                    setShowPromoBanner(false);
                  }}
                  className="text-green-600 font-semibold text-sm"
                >
                  Ho capito ✓
                </button>

                <button
                  onClick={handlePromoBannerDismiss}
                  className="text-gray-400 text-sm"
                >
                  Non ora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Android Chrome Install Instructions */}
      {showPromoBanner && /Android/.test(navigator.userAgent) && !showInstallButton && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-xl shadow-2xl p-6 border-l-4 border-green-500">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🤖</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Installa su Android</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Tocca il menu <strong>⋮</strong> in alto a destra</li>
                <li>2. Tocca <strong>"Aggiungi alla schermata Home"</strong></li>
                <li>3. Tocca <strong>"Aggiungi"</strong> per confermare</li>
              </ol>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    trackEvent('android_install_instructions_understood', {
                      event_category: 'pwa',
                      platform: 'android'
                    });
                    setShowPromoBanner(false);
                  }}
                  className="text-green-600 font-semibold text-sm"
                >
                  Ho capito ✓
                </button>

                <button
                  onClick={handlePromoBannerDismiss}
                  className="text-gray-400 text-sm"
                >
                  Non ora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />
    </>
  );
}

// Offline Indicator Component
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 bg-yellow-500 text-white p-3 rounded-lg shadow-lg flex items-center space-x-2">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      <span className="text-sm font-medium">
        Modalità offline - Alcune funzionalità potrebbero essere limitate
      </span>
    </div>
  );
}