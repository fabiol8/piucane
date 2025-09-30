/**
 * Service Worker Manager
 * Handles PWA service worker registration and lifecycle
 */

'use client';

import { useEffect, useState } from 'react';
import { trackAnalyticsEvent } from '@/analytics/ga4';

interface ServiceWorkerManagerProps {
  children?: React.ReactNode;
}

interface UpdateAvailableInfo {
  registration: ServiceWorkerRegistration;
  waiting: ServiceWorker;
}

export function ServiceWorkerManager({ children }: ServiceWorkerManagerProps) {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isInstallPromptAvailable, setIsInstallPromptAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      registerServiceWorker();
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for online/offline status
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Listen for app installed
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
              trackAnalyticsEvent('pwa_update_available', {
                version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown'
              });
            }
          });
        }
      });

      // Listen for waiting service worker
      if (registration.waiting) {
        setIsUpdateAvailable(true);
      }

      trackAnalyticsEvent('service_worker_registered', {
        scope: registration.scope
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
      trackAnalyticsEvent('service_worker_registration_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    setDeferredPrompt(e);
    setIsInstallPromptAvailable(true);

    trackAnalyticsEvent('pwa_install_prompt_shown', {
      source: 'browser'
    });
  };

  const handleAppInstalled = () => {
    setIsInstalled(true);
    setIsInstallPromptAvailable(false);
    setDeferredPrompt(null);

    trackAnalyticsEvent('pwa_installed', {
      source: 'user_action'
    });
  };

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      trackAnalyticsEvent('pwa_install_prompted', {
        outcome,
        source: 'manual'
      });

      if (outcome === 'accepted') {
        setIsInstallPromptAvailable(false);
        setDeferredPrompt(null);
      }
    }
  };

  const updateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  const showOfflineBanner = !isOnline;
  const showUpdateBanner = isUpdateAvailable;
  const showInstallBanner = isInstallPromptAvailable && !isInstalled;

  return (
    <>
      {children}

      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm z-50">
          🔌 Modalità offline attiva. Alcune funzionalità potrebbero essere limitate.
        </div>
      )}

      {/* Update Available Banner */}
      {showUpdateBanner && (
        <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg p-4 shadow-lg z-50 md:left-auto md:w-96">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Aggiornamento disponibile</h4>
              <p className="text-sm opacity-90">Nuove funzionalità e miglioramenti</p>
            </div>
            <button
              onClick={updateApp}
              className="bg-white text-blue-600 px-4 py-2 rounded font-medium text-sm hover:bg-blue-50 transition-colors"
            >
              Aggiorna
            </button>
          </div>
        </div>
      )}

      {/* Install App Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-600 text-white rounded-lg p-4 shadow-lg z-50 md:left-auto md:w-96">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Installa PiùCane</h4>
              <p className="text-sm opacity-90">Accesso rapido dalla home</p>
            </div>
            <button
              onClick={installApp}
              className="bg-white text-green-600 px-4 py-2 rounded font-medium text-sm hover:bg-green-50 transition-colors"
            >
              Installa
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ServiceWorkerManager;