/**
 * GA4 Tracking Implementation for PiuCane Platform
 *
 * Implements PROMPTMASTER.md requirements for GA4 tracking with:
 * - CTA Registry integration
 * - Event schema validation
 * - Consent Mode v2 compliance
 * - Enhanced e-commerce tracking
 */

import { validateEvent, type GA4Event, type EventName } from './events.schema';
import { getConsentState } from './consent';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

let isInitialized = false;
let sessionId: string = '';

/**
 * Initialize GA4 with Consent Mode v2
 */
export const initGA4 = () => {
  if (typeof window === 'undefined' || !GA4_ID || isInitialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Configure Consent Mode v2 before initialization
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
  });

  window.gtag('js', new Date());

  // Initialize GA4
  window.gtag('config', GA4_ID, {
    page_title: document.title,
    page_location: window.location.href,
    debug_mode: process.env.NODE_ENV === 'development',
    send_page_view: false // We'll handle page views manually
  });

  // Initialize GTM if available
  if (GTM_ID) {
    window.gtag('config', GTM_ID);
  }

  // Generate session ID
  sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  isInitialized = true;
};

/**
 * Update consent state
 */
export const updateConsent = (consentState: {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', {
    analytics_storage: consentState.analytics ? 'granted' : 'denied',
    ad_storage: consentState.marketing ? 'granted' : 'denied',
    ad_user_data: consentState.marketing ? 'granted' : 'denied',
    ad_personalization: consentState.marketing ? 'granted' : 'denied',
    functionality_storage: consentState.functional ? 'granted' : 'denied'
  });
};

/**
 * Track page view with enhanced parameters
 */
export const trackPageView = (
  page_title: string,
  page_location: string,
  content_group1?: string,
  content_group2?: string
) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  const consentState = getConsentState();
  if (!consentState.analytics) {
    console.log('Analytics tracking disabled by consent');
    return;
  }

  window.gtag('event', 'page_view', {
    page_title,
    page_location,
    content_group1,
    content_group2,
    session_id: sessionId,
    timestamp: Date.now()
  });
};

/**
 * Track event with validation and CTA integration
 */
export const trackEvent = <T extends EventName>(
  eventName: T,
  eventData: Omit<Extract<GA4Event, { event_name: T }>, 'event_name'>,
  ctaId?: string
) => {
  if (typeof window === 'undefined' || !window.gtag) {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('GA4 Event (dev):', eventName, eventData, ctaId);
    }
    return;
  }

  const consentState = getConsentState();

  // Check if event type requires consent
  const requiresMarketingConsent = [
    'subscribe_click',
    'subscription_started',
    'purchase',
    'add_to_cart'
  ].includes(eventName);

  if (requiresMarketingConsent && !consentState.marketing) {
    console.log(`Event ${eventName} requires marketing consent`);
    return;
  }

  if (!consentState.analytics) {
    console.log('Analytics tracking disabled by consent');
    return;
  }

  // Validate event data
  const fullEventData = {
    event_name: eventName,
    ...eventData,
    session_id: sessionId,
    timestamp: Date.now(),
    cta_id: ctaId,
    page_location: window.location.href,
    page_title: document.title
  };

  if (process.env.NODE_ENV === 'development') {
    const isValid = validateEvent(eventName, fullEventData);
    if (!isValid) {
      console.error(`Invalid event data for ${eventName}:`, fullEventData);
      return;
    }
  }

  // Send to GA4
  window.gtag('event', eventName, fullEventData);

  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('GA4 Event tracked:', eventName, fullEventData);
  }
};

/**
 * Track CTA click from registry
 */
export const trackCTAClick = (ctaId: string, additionalData?: Record<string, any>) => {
  // CTA tracking is handled by individual trackEvent calls
  // This is a utility function for generic CTA clicks
  trackEvent('navigation_click', {
    link_text: ctaId,
    link_url: window.location.href,
    section: 'cta',
    ...additionalData
  }, ctaId);
};

/**
 * Enhanced E-commerce tracking
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string = 'EUR',
  items: any[],
  paymentMethod: string,
  isSubscription: boolean = false,
  tax?: number,
  shipping?: number,
  coupon?: string
) => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value,
    items,
    payment_method: paymentMethod,
    is_subscription: isSubscription,
    tax,
    shipping,
    coupon
  });
};

/**
 * Track subscription events
 */
export const trackSubscription = {
  click: (sku: string, location: string, dogId?: string, productName?: string) => {
    trackEvent('subscribe_click', {
      sku,
      location,
      dog_id: dogId,
      product_name: productName || sku
    });
  },

  started: (subscriptionId: string, planName: string, frequency: 'weekly' | 'biweekly' | 'monthly', dogId: string, value: number) => {
    trackEvent('subscription_started', {
      subscription_id: subscriptionId,
      plan_name: planName,
      frequency,
      dog_id: dogId,
      value,
      currency: 'EUR'
    });
  },

  confirmed: (subscriptionId: string, cadenceDays: number, value: number, firstDeliveryDate: string) => {
    trackEvent('subscription_confirmed', {
      subscription_id: subscriptionId,
      cadence_days: cadenceDays,
      value,
      currency: 'EUR',
      first_delivery_date: firstDeliveryDate
    });
  },

  dateChanged: (subscriptionId: string, daysDelta: number, newDeliveryDate: string, reason?: string) => {
    trackEvent('subscription_date_change', {
      subscription_id: subscriptionId,
      days_delta: daysDelta,
      new_delivery_date: newDeliveryDate,
      reason
    });
  },

  paused: (subscriptionId: string, pauseDuration?: number, reason?: string) => {
    trackEvent('subscription_paused', {
      subscription_id: subscriptionId,
      pause_duration: pauseDuration,
      reason
    });
  },

  cancelled: (subscriptionId: string, cancellationReason: string, refundAmount?: number) => {
    trackEvent('subscription_cancelled', {
      subscription_id: subscriptionId,
      cancellation_reason: cancellationReason,
      refund_amount: refundAmount
    });
  }
};

/**
 * Track AI Agent interactions
 */
export const trackAI = {
  chatStarted: (agentType: 'vet' | 'educator' | 'groomer', conversationId: string, dogId?: string) => {
    trackEvent('ai_chat_started', {
      agent_type: agentType,
      conversation_id: conversationId,
      dog_id: dogId
    });
  },

  messageSent: (agentType: 'vet' | 'educator' | 'groomer', conversationId: string, messageLength: number, containsUrgency?: boolean, containsProductMention?: boolean) => {
    trackEvent('ai_message_sent', {
      agent_type: agentType,
      conversation_id: conversationId,
      message_length: messageLength,
      contains_urgency: containsUrgency,
      contains_product_mention: containsProductMention
    });
  },

  responseReceived: (agentType: 'vet' | 'educator' | 'groomer', conversationId: string, responseTime: number, flaggedUrgent?: boolean, productsSuggested?: number, toolsUsed?: string[]) => {
    trackEvent('ai_response_received', {
      agent_type: agentType,
      conversation_id: conversationId,
      response_time: responseTime,
      flagged_urgent: flaggedUrgent,
      products_suggested: productsSuggested,
      tools_used: toolsUsed
    });
  }
};

/**
 * Track gamification events
 */
export const trackGamification = {
  missionStarted: (missionId: string, missionType: 'daily' | 'weekly' | 'monthly' | 'special', difficulty: 'easy' | 'medium' | 'hard', xpReward: number) => {
    trackEvent('mission_started', {
      mission_id: missionId,
      mission_type: missionType,
      difficulty,
      xp_reward: xpReward
    });
  },

  missionCompleted: (missionId: string, xp: number, rewardType: 'xp' | 'badge' | 'coupon' | 'points', completionTime: number, dogId?: string) => {
    trackEvent('mission_completed', {
      mission_id: missionId,
      xp,
      reward_type: rewardType,
      completion_time: completionTime,
      dog_id: dogId
    });
  },

  badgeUnlocked: (badgeId: string, badgeName: string, badgeCategory: string, totalBadges: number) => {
    trackEvent('badge_unlocked', {
      badge_id: badgeId,
      badge_name: badgeName,
      badge_category: badgeCategory,
      total_badges: totalBadges
    });
  },

  rewardRedeemed: (rewardId: string, orderId: string, discountAmount: number) => {
    trackEvent('reward_redeemed', {
      reward_id: rewardId,
      order_id: orderId,
      discount_amount: discountAmount,
      currency: 'EUR'
    });
  }
};

/**
 * Set user properties
 */
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

/**
 * Debug function for development
 */
export const debugGA4 = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;

  console.log('GA4 Debug Info:', {
    GA4_ID,
    GTM_ID,
    isInitialized,
    sessionId,
    dataLayer: window.dataLayer?.slice(-10), // Last 10 events
    consentState: getConsentState()
  });
};
