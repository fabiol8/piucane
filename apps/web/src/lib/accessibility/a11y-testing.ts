/**
 * Accessibility testing utilities for automated a11y checks
 */

import { CONTRAST_RATIOS, getContrastRatio } from './a11y-utils';

export interface A11yViolation {
  type: 'error' | 'warning';
  rule: string;
  description: string;
  element?: Element;
  selector?: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

export interface A11yTestResult {
  passed: boolean;
  violations: A11yViolation[];
  warnings: A11yViolation[];
  elementsChecked: number;
  timestamp: Date;
}

export class AccessibilityTester {
  private violations: A11yViolation[] = [];
  private warnings: A11yViolation[] = [];
  private elementsChecked = 0;

  /**
   * Run comprehensive accessibility tests on a container
   */
  public async testContainer(container: Element = document.body): Promise<A11yTestResult> {
    this.reset();

    // Run all accessibility tests
    this.checkHeadingStructure(container);
    this.checkImages(container);
    this.checkLinks(container);
    this.checkButtons(container);
    this.checkFormElements(container);
    this.checkColorContrast(container);
    this.checkFocusableElements(container);
    this.checkLandmarks(container);
    this.checkAriaLabels(container);
    this.checkKeyboardNavigation(container);

    return {
      passed: this.violations.length === 0,
      violations: this.violations,
      warnings: this.warnings,
      elementsChecked: this.elementsChecked,
      timestamp: new Date(),
    };
  }

  private reset(): void {
    this.violations = [];
    this.warnings = [];
    this.elementsChecked = 0;
  }

  /**
   * Check heading structure (h1-h6) for proper hierarchy
   */
  private checkHeadingStructure(container: Element): void {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    this.elementsChecked += headings.length;

    if (headings.length === 0) {
      this.addWarning('no-headings', 'Nessun heading trovato nella pagina', undefined, 'moderate');
      return;
    }

    const h1Count = container.querySelectorAll('h1').length;
    if (h1Count === 0) {
      this.addViolation('missing-h1', 'Manca l\'heading principale (h1)', undefined, 'serious');
    } else if (h1Count > 1) {
      this.addViolation('multiple-h1', 'Più di un h1 trovato nella pagina', undefined, 'moderate');
    }

    let lastLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (level > lastLevel + 1) {
        this.addViolation(
          'heading-skip',
          `Salto di livello nell'heading: da h${lastLevel} a h${level}`,
          heading,
          'moderate'
        );
      }

      if (!heading.textContent?.trim()) {
        this.addViolation('empty-heading', 'Heading vuoto trovato', heading, 'serious');
      }

      lastLevel = level;
    });
  }

  /**
   * Check images for alt text and accessibility
   */
  private checkImages(container: Element): void {
    const images = container.querySelectorAll('img');
    this.elementsChecked += images.length;

    images.forEach((img) => {
      const alt = img.getAttribute('alt');

      if (alt === null) {
        this.addViolation('missing-alt', 'Immagine senza attributo alt', img, 'critical');
      } else if (alt === '' && !img.hasAttribute('aria-hidden')) {
        // Empty alt is okay for decorative images, but should have aria-hidden
        this.addWarning(
          'decorative-image',
          'Immagine decorativa dovrebbe avere aria-hidden="true"',
          img,
          'minor'
        );
      } else if (alt && alt.length > 150) {
        this.addWarning('long-alt', 'Testo alternativo troppo lungo (>150 caratteri)', img, 'minor');
      }

      // Check for redundant text
      if (alt && (alt.toLowerCase().includes('immagine') || alt.toLowerCase().includes('foto'))) {
        this.addWarning(
          'redundant-alt',
          'Il testo alternativo non dovrebbe contenere "immagine" o "foto"',
          img,
          'minor'
        );
      }
    });
  }

  /**
   * Check links for accessibility
   */
  private checkLinks(container: Element): void {
    const links = container.querySelectorAll('a');
    this.elementsChecked += links.length;

    links.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim() || '';
      const ariaLabel = link.getAttribute('aria-label');

      if (!href) {
        this.addViolation('link-no-href', 'Link senza attributo href', link, 'serious');
      }

      if (!text && !ariaLabel) {
        this.addViolation('link-no-text', 'Link senza testo o aria-label', link, 'critical');
      }

      if (text && ['clicca qui', 'leggi di più', 'vai', 'link'].includes(text.toLowerCase())) {
        this.addWarning(
          'link-generic-text',
          'Testo del link non descrittivo',
          link,
          'moderate'
        );
      }

      // Check for external links
      if (href && (href.startsWith('http') || href.startsWith('//')) && !link.getAttribute('rel')) {
        this.addWarning(
          'external-link-no-rel',
          'Link esterno senza attributo rel',
          link,
          'minor'
        );
      }
    });
  }

  /**
   * Check buttons for accessibility
   */
  private checkButtons(container: Element): void {
    const buttons = container.querySelectorAll('button, [role="button"]');
    this.elementsChecked += buttons.length;

    buttons.forEach((button) => {
      const text = button.textContent?.trim() || '';
      const ariaLabel = button.getAttribute('aria-label');

      if (!text && !ariaLabel) {
        this.addViolation('button-no-text', 'Button senza testo o aria-label', button, 'critical');
      }

      if (button.hasAttribute('disabled') && !button.hasAttribute('aria-disabled')) {
        this.addWarning(
          'button-disabled-no-aria',
          'Button disabilitato dovrebbe avere aria-disabled',
          button,
          'minor'
        );
      }
    });
  }

  /**
   * Check form elements for proper labeling
   */
  private checkFormElements(container: Element): void {
    const inputs = container.querySelectorAll('input, select, textarea');
    this.elementsChecked += inputs.length;

    inputs.forEach((input) => {
      const type = input.getAttribute('type');
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      // Skip hidden inputs
      if (type === 'hidden') return;

      const hasLabel = id && container.querySelector(`label[for="${id}"]`);

      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        this.addViolation('form-no-label', 'Campo form senza label associata', input, 'critical');
      }

      if (input.hasAttribute('required') && !input.hasAttribute('aria-required')) {
        this.addWarning(
          'form-required-no-aria',
          'Campo obbligatorio dovrebbe avere aria-required',
          input,
          'moderate'
        );
      }

      // Check for placeholder as label (anti-pattern)
      const placeholder = input.getAttribute('placeholder');
      if (placeholder && !hasLabel && !ariaLabel) {
        this.addViolation(
          'placeholder-as-label',
          'Placeholder non dovrebbe essere usato come label',
          input,
          'serious'
        );
      }
    });
  }

  /**
   * Check color contrast ratios
   */
  private checkColorContrast(container: Element): void {
    const elements = container.querySelectorAll('*');

    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = getContrastRatio(color, backgroundColor);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;

        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const requiredRatio = isLargeText ? CONTRAST_RATIOS.AA_LARGE : CONTRAST_RATIOS.AA_NORMAL;

        if (contrast < requiredRatio) {
          this.addViolation(
            'color-contrast',
            `Contrasto insufficiente: ${contrast.toFixed(2)}:1 (richiesto: ${requiredRatio}:1)`,
            element,
            'serious'
          );
        }
      }
    });
  }

  /**
   * Check focusable elements
   */
  private checkFocusableElements(container: Element): void {
    const focusableElements = container.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    this.elementsChecked += focusableElements.length;

    focusableElements.forEach((element) => {
      // Check if element is visible
      const styles = window.getComputedStyle(element);
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return;
      }

      // Check for focus indicators
      const hasFocusStyles = styles.outline !== 'none' ||
                           styles.boxShadow !== 'none' ||
                           element.classList.contains('focus:ring') ||
                           element.classList.contains('focus-visible:ring');

      if (!hasFocusStyles) {
        this.addWarning(
          'no-focus-indicator',
          'Elemento focusabile senza indicatore di focus visibile',
          element,
          'moderate'
        );
      }

      // Check tabindex usage
      const tabindex = element.getAttribute('tabindex');
      if (tabindex && parseInt(tabindex) > 0) {
        this.addWarning(
          'positive-tabindex',
          'Evitare tabindex positivi',
          element,
          'moderate'
        );
      }
    });
  }

  /**
   * Check page landmarks
   */
  private checkLandmarks(container: Element): void {
    const landmarks = container.querySelectorAll('main, nav, header, footer, aside, section[aria-labelledby], [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"]');

    if (landmarks.length === 0) {
      this.addWarning('no-landmarks', 'Nessun landmark trovato nella pagina', undefined, 'moderate');
    }

    const mainElements = container.querySelectorAll('main, [role="main"]');
    if (mainElements.length === 0) {
      this.addViolation('no-main', 'Manca l\'elemento main nella pagina', undefined, 'serious');
    } else if (mainElements.length > 1) {
      this.addViolation('multiple-main', 'Più di un elemento main trovato', undefined, 'serious');
    }
  }

  /**
   * Check ARIA labels and descriptions
   */
  private checkAriaLabels(container: Element): void {
    const elementsWithAria = container.querySelectorAll('[aria-labelledby], [aria-describedby]');

    elementsWithAria.forEach((element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const describedBy = element.getAttribute('aria-describedby');

      if (labelledBy) {
        const labelIds = labelledBy.split(' ');
        labelIds.forEach(id => {
          if (!container.querySelector(`#${id}`)) {
            this.addViolation(
              'aria-labelledby-invalid',
              `aria-labelledby riferisce a un ID inesistente: ${id}`,
              element,
              'serious'
            );
          }
        });
      }

      if (describedBy) {
        const descIds = describedBy.split(' ');
        descIds.forEach(id => {
          if (!container.querySelector(`#${id}`)) {
            this.addViolation(
              'aria-describedby-invalid',
              `aria-describedby riferisce a un ID inesistente: ${id}`,
              element,
              'serious'
            );
          }
        });
      }
    });
  }

  /**
   * Check keyboard navigation
   */
  private checkKeyboardNavigation(container: Element): void {
    // This is a basic check - in a real implementation, you'd need actual keyboard testing
    const interactiveElements = container.querySelectorAll(
      'button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex="0"]'
    );

    interactiveElements.forEach((element) => {
      const tabindex = element.getAttribute('tabindex');

      if (tabindex === '-1' && !element.hasAttribute('aria-hidden')) {
        this.addWarning(
          'keyboard-inaccessible',
          'Elemento interattivo non accessibile da tastiera',
          element,
          'serious'
        );
      }
    });
  }

  private addViolation(rule: string, description: string, element?: Element, impact: A11yViolation['impact'] = 'serious'): void {
    this.violations.push({
      type: 'error',
      rule,
      description,
      element,
      selector: element ? this.getSelector(element) : undefined,
      impact,
    });
  }

  private addWarning(rule: string, description: string, element?: Element, impact: A11yViolation['impact'] = 'minor'): void {
    this.warnings.push({
      type: 'warning',
      rule,
      description,
      element,
      selector: element ? this.getSelector(element) : undefined,
      impact,
    });
  }

  private getSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const classes = Array.from(element.classList).slice(0, 2).join('.');
    if (classes) {
      return `${element.tagName.toLowerCase()}.${classes}`;
    }

    return element.tagName.toLowerCase();
  }
}

// Export singleton instance
export const a11yTester = new AccessibilityTester();

// Helper function for quick testing
export async function runAccessibilityTest(container?: Element): Promise<A11yTestResult> {
  return a11yTester.testContainer(container);
}

// Development helper to run tests and log results
export async function logAccessibilityIssues(container?: Element): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;

  const result = await runAccessibilityTest(container);

  console.group('🔍 Accessibility Test Results');
  console.log(`Elements checked: ${result.elementsChecked}`);
  console.log(`Passed: ${result.passed ? '✅' : '❌'}`);

  if (result.violations.length > 0) {
    console.group('❌ Violations');
    result.violations.forEach(violation => {
      console.error(`[${violation.impact}] ${violation.rule}: ${violation.description}`);
      if (violation.element) {
        console.log('Element:', violation.element);
      }
    });
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ Warnings');
    result.warnings.forEach(warning => {
      console.warn(`[${warning.impact}] ${warning.rule}: ${warning.description}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}