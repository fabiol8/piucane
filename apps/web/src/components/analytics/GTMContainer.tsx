'use client';

/**
 * Google Tag Manager Container Component
 * Implements GTM with Consent Mode v2 support
 * Loads GTM only after user consent is handled
 */

import { useEffect } from 'react';
import Script from 'next/script';
import { useConsentMode } from '@/hooks/useConsent';

interface GTMContainerProps {
  /** GTM Container ID (format: GTM-XXXXXX) */
  gtmId: string;
  /** Additional GTM config */
  config?: {
    /** Enable GTM debug mode */
    debug?: boolean;
    /** Custom data layer name */
    dataLayerName?: string;
    /** GTM environment auth */
    auth?: string;
    /** GTM environment preview */
    preview?: string;
  };
}

/**
 * Google Tag Manager Container with Consent Mode v2
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * <GTMContainer gtmId="GTM-XXXXXX" />
 * ```
 */
export function GTMContainer({ gtmId, config = {} }: GTMContainerProps) {
  const consentMode = useConsentMode();
  const dataLayerName = config.dataLayerName || 'dataLayer';

  useEffect(() => {
    // Initialize dataLayer
    if (typeof window !== 'undefined') {
      (window as any)[dataLayerName] = (window as any)[dataLayerName] || [];

      // Push consent mode configuration BEFORE GTM loads
      (window as any)[dataLayerName].push({
        event: 'consent_default',
        ...consentMode
      });

      console.log('[GTM] Consent Mode initialized:', consentMode);
    }
  }, [dataLayerName, consentMode]);

  // Build GTM URL with optional auth/preview for environments
  const gtmUrl = (() => {
    let url = `https://www.googletagmanager.com/gtm.js?id=${gtmId}&l=${dataLayerName}`;
    if (config.auth) url += `&gtm_auth=${config.auth}`;
    if (config.preview) url += `&gtm_preview=${config.preview}&gtm_cookies_win=x`;
    return url;
  })();

  return (
    <>
      {/* GTM Script - Head */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            '${gtmUrl}';
            f.parentNode.insertBefore(j,f);
            })(window,document,'script','${dataLayerName}','${gtmId}');

            ${config.debug ? `
            // Enable GTM Debug Mode
            window['${dataLayerName}'].push({
              'gtm.debug': true
            });
            console.log('[GTM] Debug mode enabled');
            ` : ''}
          `
        }}
      />

      {/* GTM NoScript - Body (must be added manually to body in layout.tsx) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}${config.auth ? `&gtm_auth=${config.auth}` : ''}${config.preview ? `&gtm_preview=${config.preview}&gtm_cookies_win=x` : ''}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}

/**
 * Helper component to push custom events to GTM dataLayer
 *
 * @example
 * ```tsx
 * function MyButton() {
 *   const pushEvent = useGTMEvent();
 *
 *   const handleClick = () => {
 *     pushEvent({
 *       event: 'button_click',
 *       button_name: 'subscribe',
 *       value: 29.99
 *     });
 *   };
 *
 *   return <button onClick={handleClick}>Subscribe</button>;
 * }
 * ```
 */
export function useGTMEvent() {
  const pushEvent = (event: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push(event);
      console.log('[GTM] Event pushed:', event);
    } else {
      console.warn('[GTM] dataLayer not available');
    }
  };

  return pushEvent;
}

/**
 * Helper component to update GTM consent state
 * Automatically syncs with useConsent hook
 */
export function GTMConsentSync() {
  const consentMode = useConsentMode();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'consent_update',
        ...consentMode
      });

      console.log('[GTM] Consent updated:', consentMode);
    }
  }, [consentMode]);

  return null;
}

/**
 * Push user properties to GTM
 *
 * @example
 * ```tsx
 * const setUserProperties = useGTMUserProperties();
 *
 * useEffect(() => {
 *   if (user) {
 *     setUserProperties({
 *       user_id: user.uid,
 *       user_type: 'subscriber',
 *       subscription_tier: 'premium'
 *     });
 *   }
 * }, [user]);
 * ```
 */
export function useGTMUserProperties() {
  const setUserProperties = (properties: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'user_properties',
        user_properties: properties
      });

      console.log('[GTM] User properties set:', properties);
    }
  };

  return setUserProperties;
}

/**
 * Enhanced E-commerce event helpers for GTM
 */
export const GTMEcommerce = {
  /**
   * Track product view
   */
  viewItem: (item: {
    item_id: string;
    item_name: string;
    price: number;
    item_category?: string;
    item_brand?: string;
  }) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'view_item',
        ecommerce: {
          items: [item]
        }
      });
    }
  },

  /**
   * Track add to cart
   */
  addToCart: (item: {
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          items: [item]
        }
      });
    }
  },

  /**
   * Track begin checkout
   */
  beginCheckout: (items: any[], value: number) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          value,
          currency: 'EUR',
          items
        }
      });
    }
  },

  /**
   * Track purchase
   */
  purchase: (transaction: {
    transaction_id: string;
    value: number;
    currency?: string;
    tax?: number;
    shipping?: number;
    items: any[];
  }) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'purchase',
        ecommerce: {
          ...transaction,
          currency: transaction.currency || 'EUR'
        }
      });
    }
  }
};

// Type declarations
declare global {
  interface Window {
    dataLayer: any[];
  }
}