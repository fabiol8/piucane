import { trackEvent } from './ga4';
import { EventParams } from './events.schema';

export interface CTAClickData {
  cta_id: string;
  element_type: 'button' | 'link' | 'card';
  location: string;
  timestamp: number;
}

export const trackCTAClick = (ctaId: string, additionalData?: Record<string, any>) => {
  const data: CTAClickData = {
    cta_id: ctaId,
    element_type: 'button',
    location: window.location.pathname,
    timestamp: Date.now(),
    ...additionalData
  };

  trackEvent('cta_click', data);
};

export const trackPageView = (pageName: string, additionalData?: Record<string, any>) => {
  trackEvent('page_view', {
    page_title: pageName,
    page_location: window.location.href,
    page_path: window.location.pathname,
    ...additionalData
  });
};

export const trackUserAction = (action: string, category: string, label?: string, value?: number) => {
  trackEvent('user_action', {
    action,
    category,
    label,
    value
  });
};

export const trackEcommerceEvent = (eventName: string, params: EventParams) => {
  trackEvent(eventName, {
    ...params,
    timestamp: Date.now()
  });
};