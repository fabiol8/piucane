type ConsentStatus = 'granted' | 'denied';

interface ConsentSettings {
  analytics_storage: ConsentStatus;
  ad_storage: ConsentStatus;
  ad_user_data: ConsentStatus;
  ad_personalization: ConsentStatus;
  functionality_storage: ConsentStatus;
  personalization_storage: ConsentStatus;
  security_storage: ConsentStatus;
}

export const initConsentMode = () => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted'
  });
};

export const updateConsent = (consent: Partial<ConsentSettings>) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', consent);
};

export const getConsentStatus = (): ConsentSettings | null => {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('piucane_consent');
  return stored ? JSON.parse(stored) : null;
};

export const setConsentStatus = (consent: ConsentSettings) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem('piucane_consent', JSON.stringify(consent));
  updateConsent(consent);
};

/**
 * Get current consent state for use in components
 * Returns simplified boolean state for common categories
 */
export const getConsentState = (): { analytics: boolean; marketing: boolean; functional: boolean } => {
  if (typeof window === 'undefined') {
    return { analytics: false, marketing: false, functional: false };
  }

  const stored = localStorage.getItem('piucane_consent');
  if (!stored) {
    return { analytics: false, marketing: false, functional: false };
  }

  try {
    const consent = JSON.parse(stored);
    return {
      analytics: consent.analytics_storage === 'granted' || consent.analytics === true,
      marketing: consent.ad_storage === 'granted' || consent.marketing === true,
      functional: consent.functionality_storage === 'granted' || consent.functional === true
    };
  } catch (error) {
    console.error('Error parsing consent state:', error);
    return { analytics: false, marketing: false, functional: false };
  }
};