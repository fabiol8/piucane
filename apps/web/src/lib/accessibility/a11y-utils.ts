import { useEffect, useRef } from 'react';

// WCAG 2.2 AA Color Contrast Ratios
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

// Screen Reader Announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus Management
export const useFocusManagement = () => {
  const focusableElementsSelector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  const getFocusableElements = (container: HTMLElement) => {
    return Array.from(container.querySelectorAll(focusableElementsSelector)) as HTMLElement[];
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        container.dispatchEvent(new CustomEvent('escape-key'));
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };

  const restoreFocus = (element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  };

  return {
    getFocusableElements,
    trapFocus,
    restoreFocus,
  };
};

// Keyboard Navigation Hook
export const useKeyboardNavigation = (
  items: unknown[],
  onSelect?: (index: number) => void,
  orientation: 'vertical' | 'horizontal' = 'vertical'
) => {
  const currentIndex = useRef(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        currentIndex.current = (currentIndex.current + 1) % items.length;
        break;
      case prevKey:
        e.preventDefault();
        currentIndex.current = currentIndex.current === 0 ? items.length - 1 : currentIndex.current - 1;
        break;
      case 'Home':
        e.preventDefault();
        currentIndex.current = 0;
        break;
      case 'End':
        e.preventDefault();
        currentIndex.current = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(currentIndex.current);
        break;
    }
  };

  return {
    currentIndex: currentIndex.current,
    setCurrentIndex: (index: number) => {
      currentIndex.current = Math.max(0, Math.min(index, items.length - 1));
    },
    handleKeyDown,
  };
};

// ARIA Utils
export const generateAriaId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getAriaDescribedBy = (ids: (string | undefined)[]): string | undefined => {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
};

// Color Contrast Utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: keyof typeof CONTRAST_RATIOS = 'AA_NORMAL'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= CONTRAST_RATIOS[level];
};

// Reduced Motion Detection
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const useReducedMotion = () => {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reduceMotion;
};

// Screen Reader Utilities
export const isScreenReaderUser = (): boolean => {
  // Check for common screen reader indicators
  return (
    'speechSynthesis' in window ||
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('JAWS') ||
    navigator.userAgent.includes('VoiceOver')
  );
};

// ARIA Live Region Manager
class AriaLiveRegionManager {
  private regions: Map<string, HTMLElement> = new Map();

  private createRegion(politeness: 'polite' | 'assertive' | 'off'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only absolute -top-px -left-px w-px h-px overflow-hidden';
    document.body.appendChild(region);
    return region;
  }

  announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
    let region = this.regions.get(politeness);

    if (!region) {
      region = this.createRegion(politeness);
      this.regions.set(politeness, region);
    }

    // Clear previous message and set new one
    region.textContent = '';
    setTimeout(() => {
      region!.textContent = message;
    }, 100);

    // Auto-clear after announcement
    setTimeout(() => {
      region!.textContent = '';
    }, 1000);
  }

  destroy() {
    this.regions.forEach((region) => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.regions.clear();
  }
}

export const ariaLiveRegionManager = new AriaLiveRegionManager();

// Form Accessibility Helpers
export const getFormFieldProps = (
  id: string,
  label?: string,
  error?: string,
  description?: string,
  required?: boolean
) => {
  const labelId = label ? `${id}-label` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;

  return {
    id,
    'aria-labelledby': labelId,
    'aria-describedby': getAriaDescribedBy([descriptionId, errorId]),
    'aria-invalid': !!error,
    'aria-required': required,
    labelId,
    errorId,
    descriptionId,
  };
};

// Skip Links Management
export const createSkipLink = (targetId: string, label: string): HTMLElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium';

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return skipLink;
};

// Motion Respect Utilities
export const getMotionPreferences = () => {
  const reduceMotion = prefersReducedMotion();

  return {
    duration: reduceMotion ? 0 : undefined,
    transition: reduceMotion ? 'none' : undefined,
    animation: reduceMotion ? 'none' : undefined,
  };
};

export { React } from 'react';