/**
 * Google Analytics 4 & CTA Registry Implementation
 * Implementa COMPLETAMENTE il punto 2 del PROMPTMASTER.md
 *
 * Funzionalità:
 * - GA4 tracking completo con eventi personalizzati
 * - CTA Registry per tracciamento di ogni call-to-action
 * - Metriche business avanzate
 * - Compliance GDPR
 * - Tracking offline/online
 * - Performance monitoring
 */

// GA4 Configuration
interface GA4Config {
  measurementId: string;
  sendPageView: boolean;
  cookieFlags: string;
  allowAdPersonalizationSignals: boolean;
  allowGoogleSignals: boolean;
}

// Event tracking types
interface TrackingEvent {
  event_name: string;
  event_category?: string;
  event_label?: string;
  value?: number;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
  custom_parameters?: Record<string, any>;
}

// CTA Registry types
interface CTADefinition {
  id: string;
  name: string;
  category: 'navigation' | 'conversion' | 'engagement' | 'onboarding' | 'subscription' | 'ai-interaction' | 'gamification';
  description: string;
  expectedOutcome: string;
  businessValue: 'high' | 'medium' | 'low';
  trackingEnabled: boolean;
  abTestVariant?: string;
}

interface CTAEvent {
  cta_id: string;
  event_type: 'click' | 'impression' | 'conversion' | 'abandon';
  user_id?: string;
  session_id: string;
  timestamp: string;
  context: {
    page_path: string;
    element_position?: string;
    user_journey_stage?: string;
    ab_test_variant?: string;
  };
  metadata?: Record<string, any>;
}

// Global variables
declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
  }
}

// Configuration
const GA4_CONFIG: GA4Config = {
  measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX',
  sendPageView: true,
  cookieFlags: 'secure;samesite=strict',
  allowAdPersonalizationSignals: false, // GDPR compliance
  allowGoogleSignals: false
};

// CTA Registry Database
const CTA_REGISTRY: Record<string, CTADefinition> = {
  // Navigation CTAs
  'nav.dashboard': {
    id: 'nav.dashboard',
    name: 'Navigation Dashboard',
    category: 'navigation',
    description: 'Click on main dashboard navigation',
    expectedOutcome: 'User navigates to main dashboard',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'nav.health': {
    id: 'nav.health',
    name: 'Navigation Health Section',
    category: 'navigation',
    description: 'Click on health section navigation',
    expectedOutcome: 'User views health tracking features',
    businessValue: 'high',
    trackingEnabled: true
  },
  'nav.shop': {
    id: 'nav.shop',
    name: 'Navigation Shop',
    category: 'conversion',
    description: 'Click on shop navigation',
    expectedOutcome: 'User browses products for purchase',
    businessValue: 'high',
    trackingEnabled: true
  },
  'nav.ai-agents': {
    id: 'nav.ai-agents',
    name: 'Navigation AI Agents',
    category: 'ai-interaction',
    description: 'Click on AI assistants navigation',
    expectedOutcome: 'User engages with AI features',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Onboarding CTAs
  'onboarding.step-1.next.button': {
    id: 'onboarding.step-1.next.button',
    name: 'Onboarding Step 1 Continue',
    category: 'onboarding',
    description: 'Continue from personal info to dog info',
    expectedOutcome: 'User progresses in onboarding',
    businessValue: 'high',
    trackingEnabled: true
  },
  'onboarding.step-2.next.button': {
    id: 'onboarding.step-2.next.button',
    name: 'Onboarding Step 2 Continue',
    category: 'onboarding',
    description: 'Continue from dog info to goals selection',
    expectedOutcome: 'User completes dog profile',
    businessValue: 'high',
    trackingEnabled: true
  },
  'onboarding.step-3.next.button': {
    id: 'onboarding.step-3.next.button',
    name: 'Onboarding Step 3 Continue',
    category: 'onboarding',
    description: 'Continue from goals to final setup',
    expectedOutcome: 'User finalizes goal selection',
    businessValue: 'high',
    trackingEnabled: true
  },
  'onboarding.step-4.complete.button': {
    id: 'onboarding.step-4.complete.button',
    name: 'Onboarding Complete',
    category: 'onboarding',
    description: 'Complete entire onboarding process',
    expectedOutcome: 'User becomes fully onboarded',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Goal selection CTAs
  'onboarding.goal.nutrition.toggle': {
    id: 'onboarding.goal.nutrition.toggle',
    name: 'Select Nutrition Goal',
    category: 'onboarding',
    description: 'Toggle nutrition goal during onboarding',
    expectedOutcome: 'User interested in nutrition features',
    businessValue: 'high',
    trackingEnabled: true
  },
  'onboarding.goal.health.toggle': {
    id: 'onboarding.goal.health.toggle',
    name: 'Select Health Goal',
    category: 'onboarding',
    description: 'Toggle health goal during onboarding',
    expectedOutcome: 'User interested in health tracking',
    businessValue: 'high',
    trackingEnabled: true
  },
  'onboarding.goal.activity.toggle': {
    id: 'onboarding.goal.activity.toggle',
    name: 'Select Activity Goal',
    category: 'onboarding',
    description: 'Toggle activity goal during onboarding',
    expectedOutcome: 'User interested in activity tracking',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'onboarding.goal.training.toggle': {
    id: 'onboarding.goal.training.toggle',
    name: 'Select Training Goal',
    category: 'onboarding',
    description: 'Toggle training goal during onboarding',
    expectedOutcome: 'User interested in dog training',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'onboarding.goal.grooming.toggle': {
    id: 'onboarding.goal.grooming.toggle',
    name: 'Select Grooming Goal',
    category: 'onboarding',
    description: 'Toggle grooming goal during onboarding',
    expectedOutcome: 'User interested in grooming services',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'onboarding.goal.social.toggle': {
    id: 'onboarding.goal.social.toggle',
    name: 'Select Social Goal',
    category: 'onboarding',
    description: 'Toggle social goal during onboarding',
    expectedOutcome: 'User interested in social features',
    businessValue: 'low',
    trackingEnabled: true
  },

  // Dashboard CTAs
  'dashboard.add-dog.button': {
    id: 'dashboard.add-dog.button',
    name: 'Add New Dog',
    category: 'engagement',
    description: 'Add additional dog to profile',
    expectedOutcome: 'User adds another dog profile',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Dog-specific CTAs
  'dog.health-check.button': {
    id: 'dog.health-check.button',
    name: 'Dog Health Check',
    category: 'engagement',
    description: 'Access health check for specific dog',
    expectedOutcome: 'User performs health assessment',
    businessValue: 'high',
    trackingEnabled: true
  },
  'dog.subscription.button': {
    id: 'dog.subscription.button',
    name: 'Dog Subscription',
    category: 'conversion',
    description: 'Setup subscription for specific dog',
    expectedOutcome: 'User considers subscription',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Mission CTAs
  'mission.complete.button': {
    id: 'mission.complete.button',
    name: 'Complete Mission',
    category: 'gamification',
    description: 'Mark mission as completed',
    expectedOutcome: 'User engages with gamification',
    businessValue: 'medium',
    trackingEnabled: true
  },

  // Quick Actions CTAs
  'quick-actions.ai-chat.button': {
    id: 'quick-actions.ai-chat.button',
    name: 'Quick AI Chat',
    category: 'ai-interaction',
    description: 'Quick access to AI chat',
    expectedOutcome: 'User engages with AI assistant',
    businessValue: 'high',
    trackingEnabled: true
  },
  'quick-actions.health-check.button': {
    id: 'quick-actions.health-check.button',
    name: 'Quick Health Check',
    category: 'engagement',
    description: 'Quick access to health check',
    expectedOutcome: 'User performs health assessment',
    businessValue: 'high',
    trackingEnabled: true
  },
  'quick-actions.shop.button': {
    id: 'quick-actions.shop.button',
    name: 'Quick Shop Access',
    category: 'conversion',
    description: 'Quick access to shop',
    expectedOutcome: 'User browses products',
    businessValue: 'high',
    trackingEnabled: true
  },
  'quick-actions.subscription.button': {
    id: 'quick-actions.subscription.button',
    name: 'Quick Subscription Access',
    category: 'conversion',
    description: 'Quick access to subscription setup',
    expectedOutcome: 'User considers subscription',
    businessValue: 'high',
    trackingEnabled: true
  },

  // AI Chat CTAs
  'ai-chat.agent-select.vet.button': {
    id: 'ai-chat.agent-select.vet.button',
    name: 'Select Veterinarian AI',
    category: 'ai-interaction',
    description: 'Switch to veterinarian AI agent',
    expectedOutcome: 'User gets veterinary advice',
    businessValue: 'high',
    trackingEnabled: true
  },
  'ai-chat.agent-select.educator.button': {
    id: 'ai-chat.agent-select.educator.button',
    name: 'Select Educator AI',
    category: 'ai-interaction',
    description: 'Switch to educator AI agent',
    expectedOutcome: 'User gets training advice',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'ai-chat.agent-select.groomer.button': {
    id: 'ai-chat.agent-select.groomer.button',
    name: 'Select Groomer AI',
    category: 'ai-interaction',
    description: 'Switch to groomer AI agent',
    expectedOutcome: 'User gets grooming advice',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'ai-chat.send-message.vet.button': {
    id: 'ai-chat.send-message.vet.button',
    name: 'Send Message to Vet AI',
    category: 'ai-interaction',
    description: 'Send message to veterinarian AI',
    expectedOutcome: 'User receives veterinary guidance',
    businessValue: 'high',
    trackingEnabled: true
  },
  'ai-chat.send-message.educator.button': {
    id: 'ai-chat.send-message.educator.button',
    name: 'Send Message to Educator AI',
    category: 'ai-interaction',
    description: 'Send message to educator AI',
    expectedOutcome: 'User receives training guidance',
    businessValue: 'medium',
    trackingEnabled: true
  },
  'ai-chat.send-message.groomer.button': {
    id: 'ai-chat.send-message.groomer.button',
    name: 'Send Message to Groomer AI',
    category: 'ai-interaction',
    description: 'Send message to groomer AI',
    expectedOutcome: 'User receives grooming guidance',
    businessValue: 'medium',
    trackingEnabled: true
  },

  // Shop CTAs
  'shop.product.add-to-cart.button': {
    id: 'shop.product.add-to-cart.button',
    name: 'Add Product to Cart',
    category: 'conversion',
    description: 'Add product to shopping cart',
    expectedOutcome: 'User moves toward purchase',
    businessValue: 'high',
    trackingEnabled: true
  },
  'shop.upgrade-to-subscription.button': {
    id: 'shop.upgrade-to-subscription.button',
    name: 'Upgrade to Subscription',
    category: 'conversion',
    description: 'Upgrade from one-time purchase to subscription',
    expectedOutcome: 'User considers subscription model',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Subscription CTAs
  'subscription.plan-base.subscribe.button': {
    id: 'subscription.plan-base.subscribe.button',
    name: 'Subscribe to Base Plan',
    category: 'conversion',
    description: 'Subscribe to base subscription plan',
    expectedOutcome: 'User converts to paying customer',
    businessValue: 'high',
    trackingEnabled: true
  },
  'subscription.plan-premium.subscribe.button': {
    id: 'subscription.plan-premium.subscribe.button',
    name: 'Subscribe to Premium Plan',
    category: 'conversion',
    description: 'Subscribe to premium subscription plan',
    expectedOutcome: 'User converts to high-value customer',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Health Check CTAs
  'health-check.submit.button': {
    id: 'health-check.submit.button',
    name: 'Submit Health Check',
    category: 'engagement',
    description: 'Submit health observation for dog',
    expectedOutcome: 'User actively tracks dog health',
    businessValue: 'high',
    trackingEnabled: true
  },

  // Add Dog CTAs
  'add-dog.submit.button': {
    id: 'add-dog.submit.button',
    name: 'Submit New Dog',
    category: 'engagement',
    description: 'Submit new dog profile',
    expectedOutcome: 'User expands their account usage',
    businessValue: 'high',
    trackingEnabled: true
  }
};

// Session and user management
let sessionId: string = '';
let userId: string = '';
let consentGranted: boolean = false;

// Initialize GA4
export function initializeGA4(): void {
  // Check for consent
  const consent = localStorage.getItem('piucane_analytics_consent');
  consentGranted = consent === 'granted';

  if (!consentGranted) {
    console.log('GA4: Analytics consent not granted');
    return;
  }

  // Generate session ID if not exists
  if (!sessionId) {
    sessionId = generateSessionId();
  }

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_CONFIG.measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA4_CONFIG.measurementId, {
    send_page_view: GA4_CONFIG.sendPageView,
    cookie_flags: GA4_CONFIG.cookieFlags,
    allow_ad_personalization_signals: GA4_CONFIG.allowAdPersonalizationSignals,
    allow_google_signals: GA4_CONFIG.allowGoogleSignals,
    anonymize_ip: true, // GDPR compliance
    custom_map: {
      custom_parameter_1: 'user_journey_stage',
      custom_parameter_2: 'dog_breed',
      custom_parameter_3: 'subscription_tier'
    }
  });

  console.log('GA4: Initialized successfully');
}

// Generate unique session ID
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Set user ID
export function setUserId(id: string): void {
  userId = id;
  if (consentGranted && window.gtag) {
    window.gtag('config', GA4_CONFIG.measurementId, {
      user_id: id
    });
  }
}

// Track generic event
export function trackEvent(eventName: string, parameters: Record<string, any> = {}): void {
  if (!consentGranted) {
    console.log('GA4: Event not tracked - consent not granted', eventName);
    return;
  }

  const event: TrackingEvent = {
    event_name: eventName,
    user_id: userId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    custom_parameters: {
      ...parameters,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Send to GA4
  if (window.gtag) {
    window.gtag('event', eventName, {
      event_category: parameters.category || 'general',
      event_label: parameters.label || '',
      value: parameters.value || 0,
      user_id: userId,
      session_id: sessionId,
      ...parameters
    });
  }

  // Store locally for offline support
  storeEventLocally(event);

  console.log('GA4: Event tracked', event);
}

// Track CTA interaction
export function trackCTA(ctaId: string, eventType: 'click' | 'impression' | 'conversion' | 'abandon' = 'click', metadata: Record<string, any> = {}): void {
  const ctaDefinition = CTA_REGISTRY[ctaId];

  if (!ctaDefinition) {
    console.warn('GA4: Unknown CTA ID', ctaId);
    return;
  }

  if (!ctaDefinition.trackingEnabled) {
    console.log('GA4: CTA tracking disabled', ctaId);
    return;
  }

  const ctaEvent: CTAEvent = {
    cta_id: ctaId,
    event_type: eventType,
    user_id: userId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    context: {
      page_path: window.location.pathname,
      element_position: metadata.position || '',
      user_journey_stage: metadata.journey_stage || '',
      ab_test_variant: ctaDefinition.abTestVariant || ''
    },
    metadata
  };

  // Track specific CTA event
  trackEvent('cta_interaction', {
    cta_id: ctaId,
    cta_name: ctaDefinition.name,
    cta_category: ctaDefinition.category,
    event_type: eventType,
    business_value: ctaDefinition.businessValue,
    expected_outcome: ctaDefinition.expectedOutcome,
    ...metadata
  });

  // Store CTA event locally
  storeCTAEventLocally(ctaEvent);

  console.log('GA4: CTA tracked', ctaEvent);
}

// Business metric tracking
export function trackBusinessMetric(metricName: string, value: number, currency: string = 'EUR', metadata: Record<string, any> = {}): void {
  trackEvent('business_metric', {
    metric_name: metricName,
    value: value,
    currency: currency,
    ...metadata
  });
}

// User journey tracking
export function trackUserJourney(stage: string, action: string, metadata: Record<string, any> = {}): void {
  trackEvent('user_journey', {
    journey_stage: stage,
    journey_action: action,
    ...metadata
  });
}

// E-commerce tracking
export function trackPurchase(transactionId: string, value: number, currency: string = 'EUR', items: any[] = []): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items
  });
}

export function trackAddToCart(itemId: string, itemName: string, value: number, currency: string = 'EUR'): void {
  trackEvent('add_to_cart', {
    currency: currency,
    value: value,
    items: [{
      item_id: itemId,
      item_name: itemName,
      currency: currency,
      price: value,
      quantity: 1
    }]
  });
}

// Subscription tracking
export function trackSubscription(action: 'subscribe' | 'unsubscribe' | 'upgrade' | 'downgrade', planName: string, value: number): void {
  trackEvent('subscription_action', {
    action: action,
    plan_name: planName,
    value: value,
    currency: 'EUR'
  });
}

// AI interaction tracking
export function trackAIInteraction(agent: string, action: string, messageLength?: number, urgentFlags?: boolean): void {
  trackEvent('ai_interaction', {
    ai_agent: agent,
    action: action,
    message_length: messageLength || 0,
    urgent_flags: urgentFlags || false
  });
}

// Gamification tracking
export function trackGamification(action: string, xpEarned?: number, level?: number, badge?: string): void {
  trackEvent('gamification', {
    action: action,
    xp_earned: xpEarned || 0,
    user_level: level || 0,
    badge_earned: badge || ''
  });
}

// Health tracking
export function trackHealthRecord(dogId: string, recordType: string, urgency: string, aiTriageFlags?: boolean): void {
  trackEvent('health_record', {
    dog_id: dogId,
    record_type: recordType,
    urgency: urgency,
    ai_triage_flags: aiTriageFlags || false
  });
}

// Store events locally for offline support
function storeEventLocally(event: TrackingEvent): void {
  try {
    const storedEvents = JSON.parse(localStorage.getItem('piucane_analytics_queue') || '[]');
    storedEvents.push(event);

    // Keep only last 100 events
    if (storedEvents.length > 100) {
      storedEvents.splice(0, storedEvents.length - 100);
    }

    localStorage.setItem('piucane_analytics_queue', JSON.stringify(storedEvents));
  } catch (error) {
    console.error('GA4: Failed to store event locally', error);
  }
}

// Store CTA events locally
function storeCTAEventLocally(event: CTAEvent): void {
  try {
    const storedEvents = JSON.parse(localStorage.getItem('piucane_cta_queue') || '[]');
    storedEvents.push(event);

    // Keep only last 50 CTA events
    if (storedEvents.length > 50) {
      storedEvents.splice(0, storedEvents.length - 50);
    }

    localStorage.setItem('piucane_cta_queue', JSON.stringify(storedEvents));
  } catch (error) {
    console.error('GA4: Failed to store CTA event locally', error);
  }
}

// Sync offline events when online
export function syncOfflineEvents(): void {
  if (!navigator.onLine || !consentGranted) return;

  try {
    // Sync analytics events
    const analyticsQueue = JSON.parse(localStorage.getItem('piucane_analytics_queue') || '[]');
    analyticsQueue.forEach((event: TrackingEvent) => {
      if (window.gtag) {
        window.gtag('event', event.event_name, event.custom_parameters);
      }
    });
    localStorage.removeItem('piucane_analytics_queue');

    // Sync CTA events
    const ctaQueue = JSON.parse(localStorage.getItem('piucane_cta_queue') || '[]');
    ctaQueue.forEach((event: CTAEvent) => {
      trackEvent('cta_interaction_offline', {
        cta_id: event.cta_id,
        event_type: event.event_type,
        timestamp: event.timestamp,
        ...event.metadata
      });
    });
    localStorage.removeItem('piucane_cta_queue');

    console.log('GA4: Offline events synced');
  } catch (error) {
    console.error('GA4: Failed to sync offline events', error);
  }
}

// Consent management
export function grantConsent(): void {
  consentGranted = true;
  localStorage.setItem('piucane_analytics_consent', 'granted');
  initializeGA4();
  syncOfflineEvents();
}

export function revokeConsent(): void {
  consentGranted = false;
  localStorage.setItem('piucane_analytics_consent', 'revoked');
  localStorage.removeItem('piucane_analytics_queue');
  localStorage.removeItem('piucane_cta_queue');
}

// Get CTA registry for debugging
export function getCTARegistry(): Record<string, CTADefinition> {
  return CTA_REGISTRY;
}

// Performance monitoring
export function trackPerformance(metricName: string, value: number, unit: string = 'ms'): void {
  trackEvent('performance_metric', {
    metric_name: metricName,
    value: value,
    unit: unit
  });
}

// Error tracking
export function trackError(error: Error, context?: Record<string, any>): void {
  trackEvent('error', {
    error_name: error.name,
    error_message: error.message,
    error_stack: error.stack?.substring(0, 500) || '',
    ...context
  });
}

// Initialize online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineEvents);
  window.addEventListener('beforeunload', () => {
    // Sync any pending events before page unload
    syncOfflineEvents();
  });
}

// Auto-initialize if consent was previously granted
if (typeof window !== 'undefined') {
  const consent = localStorage.getItem('piucane_analytics_consent');
  if (consent === 'granted') {
    initializeGA4();
  }
}