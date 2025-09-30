import { useEffect, useRef, useCallback } from 'react';

interface FocusManagerOptions {
  restoreOnUnmount?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

export const useFocusManager = (
  isActive: boolean,
  options: FocusManagerOptions = {}
) => {
  const {
    restoreOnUnmount = true,
    trapFocus = false,
    autoFocus = true,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  const focusableSelector = [
    'button:not([disabled]):not([aria-hidden="true"])',
    'a[href]:not([aria-hidden="true"])',
    'input:not([disabled]):not([aria-hidden="true"])',
    'select:not([disabled]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([aria-hidden="true"])',
    '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
    '[contenteditable="true"]:not([aria-hidden="true"])',
    'summary:not([aria-hidden="true"])',
    'details:not([aria-hidden="true"])',
  ].join(', ');

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ) as HTMLElement[];

    return elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }, [focusableSelector]);

  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElementsRef.current = focusableElements;

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLastElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElementsRef.current = focusableElements;

    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!trapFocus || !containerRef.current) return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.key === 'Tab') {
        if (focusableElements.length === 1) {
          event.preventDefault();
          return;
        }

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
      }

      if (event.key === 'Escape') {
        containerRef.current?.dispatchEvent(
          new CustomEvent('escape-key', { bubbles: true })
        );
      }
    },
    [trapFocus, getFocusableElements]
  );

  const restoreFocus = useCallback(() => {
    if (restoreOnUnmount && previouslyFocusedElement.current) {
      try {
        previouslyFocusedElement.current.focus();
      } catch (error) {
        console.warn('Failed to restore focus:', error);
      }
    }
  }, [restoreOnUnmount]);

  // Set up focus management when component becomes active
  useEffect(() => {
    if (!isActive) return;

    // Store currently focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Auto-focus first element if enabled
    if (autoFocus) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(focusFirstElement, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, autoFocus, focusFirstElement]);

  // Set up keyboard event listeners for focus trapping
  useEffect(() => {
    if (!isActive || !trapFocus || !containerRef.current) return;

    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, trapFocus, handleKeyDown]);

  // Restore focus on unmount or when becoming inactive
  useEffect(() => {
    return () => {
      if (isActive) {
        restoreFocus();
      }
    };
  }, [isActive, restoreFocus]);

  return {
    containerRef,
    focusFirstElement,
    focusLastElement,
    getFocusableElements,
    restoreFocus,
  };
};

// Hook for managing focus within lists/grids
export const useListFocus = <T>(
  items: T[],
  onActivate?: (item: T, index: number) => void,
  orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical'
) => {
  const currentIndex = useRef(0);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const setItemRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  const focusItem = useCallback((index: number) => {
    const element = itemRefs.current.get(index);
    if (element) {
      element.focus();
      currentIndex.current = index;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      let newIndex = currentIndex.current;

      if (orientation === 'vertical') {
        if (key === 'ArrowDown') {
          event.preventDefault();
          newIndex = Math.min(currentIndex.current + 1, items.length - 1);
        } else if (key === 'ArrowUp') {
          event.preventDefault();
          newIndex = Math.max(currentIndex.current - 1, 0);
        }
      } else if (orientation === 'horizontal') {
        if (key === 'ArrowRight') {
          event.preventDefault();
          newIndex = Math.min(currentIndex.current + 1, items.length - 1);
        } else if (key === 'ArrowLeft') {
          event.preventDefault();
          newIndex = Math.max(currentIndex.current - 1, 0);
        }
      } else if (orientation === 'grid') {
        // Grid navigation requires knowing columns count
        // For now, fallback to vertical navigation
        if (key === 'ArrowDown') {
          event.preventDefault();
          newIndex = Math.min(currentIndex.current + 1, items.length - 1);
        } else if (key === 'ArrowUp') {
          event.preventDefault();
          newIndex = Math.max(currentIndex.current - 1, 0);
        } else if (key === 'ArrowRight') {
          event.preventDefault();
          newIndex = Math.min(currentIndex.current + 1, items.length - 1);
        } else if (key === 'ArrowLeft') {
          event.preventDefault();
          newIndex = Math.max(currentIndex.current - 1, 0);
        }
      }

      if (key === 'Home') {
        event.preventDefault();
        newIndex = 0;
      } else if (key === 'End') {
        event.preventDefault();
        newIndex = items.length - 1;
      }

      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        const currentItem = items[currentIndex.current];
        if (currentItem && onActivate) {
          onActivate(currentItem, currentIndex.current);
        }
      }

      if (newIndex !== currentIndex.current) {
        focusItem(newIndex);
      }
    },
    [items, onActivate, orientation, focusItem]
  );

  return {
    currentIndex: currentIndex.current,
    setCurrentIndex: (index: number) => {
      currentIndex.current = Math.max(0, Math.min(index, items.length - 1));
    },
    setItemRef,
    focusItem,
    handleKeyDown,
  };
};

// Roving tabindex management
export const useRovingTabIndex = (isActive: boolean) => {
  const getTabIndex = useCallback(
    (isCurrent: boolean) => (isActive && isCurrent ? 0 : -1),
    [isActive]
  );

  const getProps = useCallback(
    (isCurrent: boolean) => ({
      tabIndex: getTabIndex(isCurrent),
      'data-roving-tabindex': isActive,
    }),
    [getTabIndex, isActive]
  );

  return { getTabIndex, getProps };
};

// Focus visible management
export const useFocusVisible = () => {
  const [focusVisible, setFocusVisible] = React.useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => setFocusVisible(true);
    const handleBlur = () => setFocusVisible(false);
    const handleMouseDown = () => setFocusVisible(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { ref, focusVisible };
};

export { React } from 'react';