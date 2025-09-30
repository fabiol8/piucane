'use client';

/**
 * useConsent Hook
 * Hook personalizzato per gestire lo stato dei consensi GDPR
 * Fornisce accesso in tempo reale ai consensi dell'utente
 */

import { useState, useEffect } from 'react';

export interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  functional: boolean;
}

export interface ConsentData {
  consent: ConsentState;
  timestamp: string;
  version: string;
}

/**
 * Hook per accedere allo stato dei consensi
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { consent, hasConsent, updateConsent } = useConsent();
 *
 *   if (!hasConsent('analytics')) {
 *     return <div>Analytics disabled</div>;
 *   }
 *
 *   return <AnalyticsComponent />;
 * }
 * ```
 */
export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
    functional: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    loadConsent();

    // Listen for consent changes from banner/settings
    const handleConsentUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setConsent(event.detail);
      }
    };

    window.addEventListener('piucane_consent_updated', handleConsentUpdate as EventListener);

    return () => {
      window.removeEventListener('piucane_consent_updated', handleConsentUpdate as EventListener);
    };
  }, []);

  const loadConsent = () => {
    try {
      const saved = localStorage.getItem('piucane_consent');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConsent(parsed);
        setHasGivenConsent(true);
      }
    } catch (error) {
      console.error('Error loading consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if a specific consent category is granted
   */
  const hasConsent = (category: keyof ConsentState): boolean => {
    return consent[category] === true;
  };

  /**
   * Update consent for a specific category
   */
  const updateConsent = (category: keyof ConsentState, granted: boolean) => {
    const newConsent = { ...consent, [category]: granted };
    setConsent(newConsent);

    const consentData = {
      ...newConsent,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    localStorage.setItem('piucane_consent', JSON.stringify(consentData));

    // Dispatch event for other listeners
    window.dispatchEvent(new CustomEvent('piucane_consent_updated', {
      detail: newConsent
    }));

    // Update GA4 Consent Mode
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: newConsent.analytics ? 'granted' : 'denied',
        ad_storage: newConsent.marketing ? 'granted' : 'denied',
        ad_user_data: newConsent.marketing ? 'granted' : 'denied',
        ad_personalization: newConsent.personalization ? 'granted' : 'denied',
        functionality_storage: newConsent.functional ? 'granted' : 'denied',
        personalization_storage: newConsent.personalization ? 'granted' : 'denied'
      });
    }
  };

  /**
   * Grant all consents
   */
  const acceptAll = () => {
    const allGranted: ConsentState = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      functional: true
    };

    setConsent(allGranted);
    localStorage.setItem('piucane_consent', JSON.stringify({
      ...allGranted,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }));

    window.dispatchEvent(new CustomEvent('piucane_consent_updated', {
      detail: allGranted
    }));

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        functionality_storage: 'granted',
        personalization_storage: 'granted'
      });
    }
  };

  /**
   * Reject all optional consents (keep only necessary)
   */
  const rejectAll = () => {
    const minimalConsent: ConsentState = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      functional: false
    };

    setConsent(minimalConsent);
    localStorage.setItem('piucane_consent', JSON.stringify({
      ...minimalConsent,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }));

    window.dispatchEvent(new CustomEvent('piucane_consent_updated', {
      detail: minimalConsent
    }));

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied'
      });
    }
  };

  /**
   * Revoke consent (clear all consents)
   */
  const revokeConsent = () => {
    localStorage.removeItem('piucane_consent');
    localStorage.removeItem('piucane_consent_timestamp');
    setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      functional: false
    });
    setHasGivenConsent(false);

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied'
      });
    }
  };

  return {
    consent,
    isLoading,
    hasGivenConsent,
    hasConsent,
    updateConsent,
    acceptAll,
    rejectAll,
    revokeConsent
  };
}

/**
 * Hook per verificare se un determinato script/servizio può essere caricato
 * basato sui consensi dell'utente
 */
export function useConsentGate(requiredConsent: keyof ConsentState) {
  const { hasConsent, isLoading } = useConsent();

  return {
    isAllowed: hasConsent(requiredConsent),
    isLoading
  };
}

/**
 * Hook per ottenere la configurazione Google Consent Mode v2
 */
export function useConsentMode() {
  const { consent } = useConsent();

  return {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.personalization ? 'granted' : 'denied',
    functionality_storage: consent.functional ? 'granted' : 'denied',
    personalization_storage: consent.personalization ? 'granted' : 'denied',
    security_storage: 'granted' // Always granted
  } as const;
}