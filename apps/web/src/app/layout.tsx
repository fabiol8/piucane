/**
 * PiuCane Root Layout
 * Integra PWA completa, SEO, e service worker
 */

import type { Metadata, Viewport } from 'next'
import { PWAInstaller } from '@/components/pwa/PWAInstaller'
import { NotificationToast } from '@/components/notifications/NotificationToast'
import { SkipLinks } from '@/components/ui/SkipLinks'
import AppLayout from '@/components/layout/AppLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import { PetProvider } from '@/contexts/PetContext'
import { CommerceProvider } from '@/contexts/CommerceContext'
import { ConsentBanner } from '@/components/privacy/ConsentBanner'
import { GTMContainer, GTMConsentSync } from '@/components/analytics/GTMContainer'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'PiùCane - La tua app per il benessere del tuo cane',
  description: 'L\'app completa per la salute, alimentazione e benessere del tuo cane. Onboarding personalizzato, AI veterinario, gamification e abbonamenti smart.',
  keywords: ['cani', 'veterinario', 'salute animali', 'alimentazione cani', 'AI veterinario', 'app cani'],
  authors: [{ name: 'PiùCane Team' }],
  creator: 'PiùCane',
  publisher: 'PiùCane',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://piucane.com'),
  alternates: {
    canonical: '/',
    languages: {
      'it-IT': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: '/',
    title: 'PiùCane - La tua app per il benessere del tuo cane',
    description: 'L\'app completa per la salute, alimentazione e benessere del tuo cane. Onboarding personalizzato, AI veterinario, gamification e abbonamenti smart.',
    siteName: 'PiùCane',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PiùCane - App per il benessere del tuo cane',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PiùCane - La tua app per il benessere del tuo cane',
    description: 'L\'app completa per la salute, alimentazione e benessere del tuo cane.',
    images: ['/twitter-image.png'],
    creator: '@piucane_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'PiùCane',
    statusBarStyle: 'default',
    capable: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || '',
  },
}

export const viewport: Viewport = {
  themeColor: '#9ACD32',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* PWA Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9ACD32" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PiùCane" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#9ACD32" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#9ACD32" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Critical CSS inline for faster loading */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary-green: #9ACD32;
              --primary-orange: #FFA500;
              --text-dark: #2F4F2F;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html {
              scroll-behavior: smooth;
            }
            @media (prefers-reduced-motion: reduce) {
              html {
                scroll-behavior: auto;
              }
              *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
            .sr-only {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border: 0;
            }
            .focus-visible:focus-visible {
              outline: 2px solid #3b82f6;
              outline-offset: 2px;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: var(--text-dark);
              background: linear-gradient(135deg, #F0F9FF 0%, #FEF3C7 100%);
              min-height: 100vh;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .loading-screen {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: var(--primary-green);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              transition: opacity 0.5s ease;
            }
            .loading-screen.hidden {
              opacity: 0;
              pointer-events: none;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid rgba(255,255,255,0.3);
              border-top: 4px solid white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </head>
      <body suppressHydrationWarning>
        {/* Skip Links for accessibility */}
        <SkipLinks />

        {/* Loading screen */}
        <div id="loading-screen" className="loading-screen" aria-label="Caricamento applicazione">
          <div className="spinner" aria-hidden="true"></div>
          <span className="sr-only">Caricamento in corso...</span>
        </div>

        {/* Main app */}
        <div id="root">
          <AuthProvider>
            <PetProvider>
              <AppLayout>
                <main id="main-content" tabIndex={-1}>
                  {children}
                </main>
              </AppLayout>
            </PetProvider>
          </AuthProvider>
        </div>

        {/* PWA Installer Component */}
        <PWAInstaller />

        {/* Notification Toast System */}
        <NotificationToast position="top-right" maxToasts={5} />

        {/* Consent Management Platform (GDPR) */}
        <ConsentBanner />

        {/* Google Tag Manager with Consent Mode v2 */}
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <>
            <GTMContainer
              gtmId={process.env.NEXT_PUBLIC_GTM_ID}
              config={{
                debug: process.env.NODE_ENV === 'development'
              }}
            />
            <GTMConsentSync />
          </>
        )}

        {/* Service Worker Registration */}
        <Script
          id="sw-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);

                      // Check for updates
                      registration.addEventListener('updatefound', function() {
                        console.log('SW update found');
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New content is available, prompt user to refresh
                              if (confirm('È disponibile una nuova versione dell\\'app. Vuoi aggiornare?')) {
                                newWorker.postMessage({type: 'SKIP_WAITING'});
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });

                // Listen for controlling service worker change
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  window.location.reload();
                });
              }

              // Hide loading screen when DOM is ready
              document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                  const loadingScreen = document.getElementById('loading-screen');
                  if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                    setTimeout(function() {
                      loadingScreen.remove();
                    }, 500);
                  }
                }, 100);
              });

              // Handle PWA install prompt
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                console.log('PWA install prompt triggered');
                e.preventDefault();
                deferredPrompt = e;

                // Show custom install button
                const installButton = document.querySelector('[data-pwa-install]');
                if (installButton) {
                  installButton.style.display = 'block';
                }
              });

              // Handle PWA install
              window.addEventListener('appinstalled', (evt) => {
                console.log('PWA was installed');
                // Track install event
                if (window.gtag) {
                  window.gtag('event', 'pwa_installed', {
                    event_category: 'engagement',
                    event_label: 'PWA Installation'
                  });
                }
              });

              // Global error handling
              window.addEventListener('error', function(e) {
                console.error('Global error:', e.error);
                if (window.trackError) {
                  window.trackError(e.error, {
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno
                  });
                }
              });

              // Unhandled promise rejection
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
                if (window.trackError) {
                  window.trackError(new Error(e.reason), {
                    type: 'unhandled_promise_rejection'
                  });
                }
              });
            `
          }}
        />

        {/* Performance monitoring */}
        <Script
          id="performance-monitor"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Monitor Core Web Vitals
              new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  console.log('Performance metric:', entry.name, entry.value);
                  if (window.trackPerformance) {
                    window.trackPerformance(entry.name, entry.value);
                  }
                }
              }).observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']});

              // Monitor resource loading
              window.addEventListener('load', function() {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation && window.trackPerformance) {
                  window.trackPerformance('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
                  window.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
                }
              });
            `
          }}
        />

        {/* Schema.org structured data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "PiùCane",
              "description": "L'app completa per la salute, alimentazione e benessere del tuo cane",
              "url": process.env.NEXT_PUBLIC_APP_URL || "https://piucane.com",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              },
              "author": {
                "@type": "Organization",
                "@id": "https://piucane.com/#organization"
              },
              "publisher": {
                "@type": "Organization",
                "@id": "https://piucane.com/#organization"
              }
            })
          }}
        />
      </body>
    </html>
  )
}