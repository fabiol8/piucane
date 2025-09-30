'use client';

/**
 * ScriptGate Component
 * Carica script di terze parti solo se l'utente ha dato il consenso appropriato
 * Implementa script gating per GDPR compliance
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useConsentGate, ConsentState } from '@/hooks/useConsent';

interface ScriptGateProps {
  /** Script source URL */
  src: string;
  /** Consent category required to load this script */
  requiredConsent: keyof ConsentState;
  /** Strategy for loading the script */
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload' | 'worker';
  /** Additional attributes to pass to the script tag */
  attrs?: Record<string, string>;
  /** Callback when script loads successfully */
  onLoad?: () => void;
  /** Callback when script fails to load */
  onError?: (error: Error) => void;
  /** Callback when consent is denied */
  onConsentDenied?: () => void;
}

/**
 * Component that gates script loading based on user consent
 *
 * @example
 * ```tsx
 * // Load Google Analytics only if analytics consent is granted
 * <ScriptGate
 *   src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
 *   requiredConsent="analytics"
 *   strategy="afterInteractive"
 *   onLoad={() => console.log('GA loaded')}
 *   onConsentDenied={() => console.log('Analytics consent denied')}
 * />
 * ```
 */
export function ScriptGate({
  src,
  requiredConsent,
  strategy = 'afterInteractive',
  attrs = {},
  onLoad,
  onError,
  onConsentDenied
}: ScriptGateProps) {
  const { isAllowed, isLoading } = useConsentGate(requiredConsent);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (isAllowed) {
      setShouldLoad(true);
      console.log(`[ScriptGate] Loading script: ${src} (consent: ${requiredConsent})`);
    } else {
      setShouldLoad(false);
      onConsentDenied?.();
      console.log(`[ScriptGate] Script blocked: ${src} (missing consent: ${requiredConsent})`);
    }
  }, [isAllowed, isLoading, src, requiredConsent, onConsentDenied]);

  if (isLoading || !shouldLoad) {
    return null;
  }

  return (
    <Script
      src={src}
      strategy={strategy}
      onLoad={onLoad}
      onError={(e) => {
        const error = new Error(`Failed to load script: ${src}`);
        console.error('[ScriptGate]', error);
        onError?.(error);
      }}
      {...attrs}
    />
  );
}

/**
 * Google Analytics Script Gate
 * Pre-configured for GA4 with Consent Mode v2
 */
export function GoogleAnalyticsScript({ measurementId }: { measurementId: string }) {
  return (
    <>
      <ScriptGate
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        requiredConsent="analytics"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[GA4] Script loaded successfully');
        }}
      />
    </>
  );
}

/**
 * Google Ads Script Gate
 * Pre-configured for Google Ads with Consent Mode v2
 */
export function GoogleAdsScript({ conversionId }: { conversionId: string }) {
  return (
    <ScriptGate
      src={`https://www.googletagmanager.com/gtag/js?id=${conversionId}`}
      requiredConsent="marketing"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('[Google Ads] Script loaded successfully');
      }}
    />
  );
}

/**
 * Meta Pixel Script Gate
 * Pre-configured for Facebook Pixel
 */
export function MetaPixelScript({ pixelId }: { pixelId: string }) {
  useEffect(() => {
    const { isAllowed } = useConsentGate('marketing');

    if (isAllowed) {
      // Initialize Meta Pixel
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      if (window.fbq) {
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
      }

      console.log('[Meta Pixel] Initialized with ID:', pixelId);
    }
  }, [pixelId]);

  return null;
}

/**
 * Hotjar Script Gate
 * Pre-configured for Hotjar analytics
 */
export function HotjarScript({ hjid, hjsv }: { hjid: number; hjsv: number }) {
  useEffect(() => {
    const { isAllowed } = useConsentGate('analytics');

    if (isAllowed) {
      (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
        h.hj = h.hj || function() { (h.hj.q = h.hj.q || []).push(arguments); };
        h._hjSettings = { hjid, hjsv };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script');
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

      console.log('[Hotjar] Initialized with ID:', hjid);
    }
  }, [hjid, hjsv]);

  return null;
}

/**
 * LinkedIn Insight Tag Script Gate
 */
export function LinkedInInsightScript({ partnerId }: { partnerId: string }) {
  return (
    <>
      <ScriptGate
        src="https://snap.licdn.com/li.lms-analytics/insight.min.js"
        requiredConsent="marketing"
        strategy="afterInteractive"
        onLoad={() => {
          if (window._linkedin_data_partner_ids) {
            window._linkedin_data_partner_ids.push(partnerId);
          } else {
            window._linkedin_data_partner_ids = [partnerId];
          }
          console.log('[LinkedIn Insight] Initialized');
        }}
      />
    </>
  );
}

/**
 * Intercom Chat Widget Script Gate
 * Pre-configured for Intercom live chat
 */
export function IntercomScript({ appId }: { appId: string }) {
  useEffect(() => {
    const { isAllowed } = useConsentGate('functional');

    if (isAllowed) {
      (function() {
        const w = window as any;
        const ic = w.Intercom;
        if (typeof ic === 'function') {
          ic('reattach_activator');
          ic('update', w.intercomSettings);
        } else {
          const d = document;
          const i = function() {
            // @ts-ignore
            i.c(arguments);
          };
          // @ts-ignore
          i.q = [];
          // @ts-ignore
          i.c = function(args: any) {
            // @ts-ignore
            i.q.push(args);
          };
          w.Intercom = i;
          const l = function() {
            const s = d.createElement('script');
            s.type = 'text/javascript';
            s.async = true;
            s.src = `https://widget.intercom.io/widget/${appId}`;
            const x = d.getElementsByTagName('script')[0];
            x.parentNode!.insertBefore(s, x);
          };
          if (document.readyState === 'complete') {
            l();
          } else if (w.attachEvent) {
            w.attachEvent('onload', l);
          } else {
            w.addEventListener('load', l, false);
          }
        }
      })();

      console.log('[Intercom] Initialized with App ID:', appId);
    }
  }, [appId]);

  return null;
}

// Type declarations for third-party scripts
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
    _fbq?: (...args: any[]) => void;
    hj?: (...args: any[]) => void;
    _hjSettings?: { hjid: number; hjsv: number };
    _linkedin_data_partner_ids?: string[];
    Intercom?: any;
    intercomSettings?: any;
  }
}