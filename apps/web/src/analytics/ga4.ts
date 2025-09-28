declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';

export const initGA4 = () => {
  if (typeof window === 'undefined' || !GA4_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, {
    page_title: document.title,
    page_location: window.location.href
  });
};

export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', eventName, parameters);
};

export const setUserId = (userId: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA4_ID, {
    user_id: userId
  });
};

export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('set', { user_properties: properties });
};