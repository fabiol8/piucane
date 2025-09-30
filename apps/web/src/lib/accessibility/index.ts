/**
 * Accessibility library index
 * Exports all accessibility utilities, components, and hooks
 */

// Core utilities
export * from './a11y-utils';
export * from './focus-management';
export * from './color-system';
export * from './a11y-testing';

// Re-export commonly used utilities with convenience names
export {
  announceToScreenReader as announce,
  useFocusManager as useFocus,
  useListFocus as useListNavigation,
  useKeyboardNavigation as useKeyboardNav,
  prefersReducedMotion as reducedMotion,
  ariaLiveRegionManager as liveRegions,
  getFormFieldProps as formField,
  meetsContrastRequirement as checkContrast,
  runAccessibilityTest as testA11y,
} from './a11y-utils';

export {
  logAccessibilityIssues as logA11yIssues,
} from './a11y-testing';

// Accessibility configuration
export const a11yConfig = {
  // WCAG compliance level
  compliance: 'AA' as const,

  // Default settings
  defaults: {
    focusTrap: true,
    announceNavigation: true,
    respectReducedMotion: true,
    keyboardNavigation: true,
    colorContrastChecking: true,
  },

  // Animation settings
  animations: {
    duration: {
      short: 150,
      medium: 300,
      long: 500,
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      reduced: 'linear',
    },
  },

  // Focus management
  focus: {
    ringWidth: 2,
    ringOffset: 2,
    ringColor: '#3b82f6',
    restoreOnUnmount: true,
  },

  // Screen reader settings
  screenReader: {
    announceDelay: 100,
    politenessDefault: 'polite' as const,
    clearDelay: 1000,
  },

  // Keyboard navigation
  keyboard: {
    enableRovingTabindex: true,
    wrapNavigation: true,
    homeEndKeys: true,
  },
} as const;

// Accessibility status checker
export const getA11yStatus = () => {
  const features = {
    reducedMotion: prefersReducedMotion(),
    screenReader: isScreenReaderUser(),
    touchDevice: 'ontouchstart' in window,
    keyboardUser: document.body.classList.contains('keyboard-user'),
  };

  return {
    features,
    recommendations: getRecommendations(features),
  };
};

function getRecommendations(features: ReturnType<typeof getA11yStatus>['features']) {
  const recommendations = [];

  if (features.reducedMotion) {
    recommendations.push('Respect user preference for reduced motion');
  }

  if (features.screenReader) {
    recommendations.push('Ensure proper ARIA labels and live regions');
  }

  if (features.touchDevice) {
    recommendations.push('Increase touch target sizes to at least 44px');
  }

  if (features.keyboardUser) {
    recommendations.push('Ensure all interactive elements are keyboard accessible');
  }

  return recommendations;
}

// Re-export utilities
export {
  // Utils
  announceToScreenReader,
  useFocusManagement,
  useKeyboardNavigation,
  generateAriaId,
  getAriaDescribedBy,
  prefersReducedMotion,
  useReducedMotion,
  isScreenReaderUser,
  ariaLiveRegionManager,
  createSkipLink,
  getMotionPreferences,
  getFormFieldProps,

  // Focus management
  useFocusManager,
  useListFocus,
  useRovingTabIndex,
  useFocusVisible,

  // Color system
  colors,
  focusColors,
  textCombinations,
  buttonCombinations,
  getAccessibleTextColor,
  cssVariables,

  // Testing
  AccessibilityTester,
  a11yTester,
  runAccessibilityTest,
  logAccessibilityIssues,

  // Color contrast
  hexToRgb,
  getLuminance,
  getContrastRatio,
  meetsContrastRequirement,
  CONTRAST_RATIOS,
} from './a11y-utils';

export { React } from 'react';