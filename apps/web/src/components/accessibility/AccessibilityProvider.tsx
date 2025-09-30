/**
 * Accessibility Provider
 * Comprehensive accessibility features and WCAG compliance
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { trackAnalyticsEvent } from '@/analytics/ga4';

interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  contrast: 'normal' | 'high' | 'dark';
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  audioDescriptions: boolean;
  colorBlindFriendly: boolean;
}

interface AccessibilityContext {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusElement: (elementId: string) => void;
  skipToContent: () => void;
}

const AccessibilityContext = createContext<AccessibilityContext | null>(null);

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  contrast: 'normal',
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: true,
  focusIndicators: true,
  audioDescriptions: false,
  colorBlindFriendly: false
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [screenReaderElement, setScreenReaderElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }

    // Detect system preferences
    detectSystemPreferences();

    // Initialize screen reader announcement element
    initializeScreenReaderElement();

    // Setup keyboard navigation
    setupKeyboardNavigation();

    // Setup focus management
    setupFocusManagement();
  }, []);

  useEffect(() => {
    // Apply settings to DOM
    applyAccessibilitySettings();

    // Save settings to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));

    // Track accessibility usage
    trackAnalyticsEvent('accessibility_settings_changed', {
      settings: settings
    });
  }, [settings]);

  const detectSystemPreferences = () => {
    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    // Detect dark mode preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersReducedMotion || prefersHighContrast || prefersDarkMode) {
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion,
        contrast: prefersHighContrast ? 'high' : prefersDarkMode ? 'dark' : prev.contrast
      }));
    }
  };

  const initializeScreenReaderElement = () => {
    // Create or find screen reader announcement element
    let element = document.getElementById('screen-reader-announcements');

    if (!element) {
      element = document.createElement('div');
      element.id = 'screen-reader-announcements';
      element.setAttribute('aria-live', 'polite');
      element.setAttribute('aria-atomic', 'true');
      element.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(element);
    }

    setScreenReaderElement(element);
  };

  const setupKeyboardNavigation = () => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Skip links navigation (Tab + S)
      if (event.key === 's' && event.altKey) {
        event.preventDefault();
        skipToContent();
      }

      // Focus visible outline on Tab navigation
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  };

  const setupFocusManagement = () => {
    // Trap focus in modals
    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleFocusTrap);

    return () => {
      document.removeEventListener('keydown', handleFocusTrap);
    };
  };

  const applyAccessibilitySettings = () => {
    const root = document.documentElement;

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);

    // Apply contrast theme
    root.setAttribute('data-contrast', settings.contrast);

    // Apply reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // Apply keyboard navigation styles
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation-enabled');
    } else {
      root.classList.remove('keyboard-navigation-enabled');
    }

    // Apply focus indicators
    if (settings.focusIndicators) {
      root.classList.add('focus-indicators-visible');
    } else {
      root.classList.remove('focus-indicators-visible');
    }

    // Apply color blind friendly mode
    if (settings.colorBlindFriendly) {
      root.classList.add('color-blind-friendly');
    } else {
      root.classList.remove('color-blind-friendly');
    }
  };

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!screenReaderElement) return;

    screenReaderElement.setAttribute('aria-live', priority);
    screenReaderElement.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      screenReaderElement.textContent = '';
    }, 1000);
  };

  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const skipToContent = () => {
    const mainContent = document.getElementById('main-content') || document.querySelector('main');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
      announceToScreenReader('Navigato al contenuto principale');
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings,
      announceToScreenReader,
      focusElement,
      skipToContent
    }}>
      {children}
      <AccessibilityControls />
    </AccessibilityContext.Provider>
  );
}

function AccessibilityControls() {
  const context = useContext(AccessibilityContext);
  const [isOpen, setIsOpen] = useState(false);

  if (!context) return null;

  const { settings, updateSettings } = context;

  return (
    <>
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        onClick={(e) => {
          e.preventDefault();
          context.skipToContent();
        }}
      >
        Salta al contenuto principale
      </a>

      {/* Accessibility controls toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Apri controlli accessibilità"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </button>

      {/* Accessibility controls panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 z-40 bg-white rounded-lg shadow-xl border p-4 max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Accessibilità</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="Chiudi controlli accessibilità"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-2">Dimensione testo</label>
              <select
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="small">Piccolo</option>
                <option value="medium">Normale</option>
                <option value="large">Grande</option>
                <option value="xlarge">Extra grande</option>
              </select>
            </div>

            {/* Contrast */}
            <div>
              <label className="block text-sm font-medium mb-2">Contrasto</label>
              <select
                value={settings.contrast}
                onChange={(e) => updateSettings({ contrast: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="normal">Normale</option>
                <option value="high">Alto contrasto</option>
                <option value="dark">Modalità scura</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              {[
                { key: 'reducedMotion', label: 'Riduci animazioni' },
                { key: 'focusIndicators', label: 'Indicatori di focus' },
                { key: 'colorBlindFriendly', label: 'Modalità daltonici' },
                { key: 'keyboardNavigation', label: 'Navigazione da tastiera' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings[key as keyof AccessibilitySettings] as boolean}
                    onChange={(e) => updateSettings({ [key]: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }

  return context;
}

export default AccessibilityProvider;