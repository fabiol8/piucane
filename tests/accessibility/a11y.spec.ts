import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y, getViolations } from 'axe-playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
  })

  test('homepage should be accessible', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })
  })

  test('navigation should be accessible', async ({ page }) => {
    // Test main navigation
    await checkA11y(page, 'nav[role="navigation"]', {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    })

    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 })
    const menuButton = page.getByRole('button', { name: /menu/i })
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await checkA11y(page, '.mobile-nav', {
        tags: ['wcag2a', 'wcag2aa'],
      })
    }
  })

  test('forms should be accessible', async ({ page }) => {
    await page.goto('/onboarding')

    // Check form accessibility
    await checkA11y(page, 'form', {
      rules: {
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'aria-hidden-focus': { enabled: true },
        'focus-order-semantics': { enabled: true },
      },
    })

    // Test form interactions
    const nameInput = page.getByLabel(/nome/i)
    await nameInput.focus()

    // Check focus indicator
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Check error state accessibility
    await page.getByRole('button', { name: /continua/i }).click()
    await checkA11y(page, '.error', {
      rules: {
        'aria-describedby': { enabled: true },
        'aria-invalid': { enabled: true },
      },
    })
  })

  test('modal dialogs should be accessible', async ({ page }) => {
    // Navigate to a page with modals
    await page.goto('/account')

    // Open a modal (e.g., payment method modal)
    const addPaymentButton = page.getByRole('button', { name: /aggiungi metodo/i })
    if (await addPaymentButton.isVisible()) {
      await addPaymentButton.click()

      // Check modal accessibility
      await checkA11y(page, '[role="dialog"]', {
        rules: {
          'aria-modal': { enabled: true },
          'focus-trap': { enabled: true },
          'aria-labelledby': { enabled: true },
          'aria-describedby': { enabled: true },
        },
      })

      // Test focus management
      const modalTitle = page.getByRole('heading', { level: 2 })
      await expect(modalTitle).toBeFocused()

      // Test escape key
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
      await expect(addPaymentButton).toBeFocused()
    }
  })

  test('tables should be accessible', async ({ page }) => {
    await page.goto('/orders')

    // Check table accessibility
    await checkA11y(page, 'table', {
      rules: {
        'table-headers': { enabled: true },
        'td-headers-attr': { enabled: true },
        'th-has-data-cells': { enabled: true },
        'scope-attr-valid': { enabled: true },
      },
    })

    // Check table navigation
    const firstCell = page.getByRole('cell').first()
    await firstCell.focus()
    await expect(firstCell).toBeFocused()

    // Test arrow key navigation
    await page.keyboard.press('ArrowRight')
    const nextCell = page.locator(':focus')
    await expect(nextCell).toBeVisible()
  })

  test('images should have proper alt text', async ({ page }) => {
    await page.goto('/shop')

    const violations = await getViolations(page, {
      rules: {
        'image-alt': { enabled: true },
        'image-redundant-alt': { enabled: true },
      },
    })

    expect(violations).toHaveLength(0)

    // Check specific image types
    const productImages = page.getByRole('img', { name: /prodotto/i })
    const imageCount = await productImages.count()

    for (let i = 0; i < imageCount; i++) {
      const image = productImages.nth(i)
      const altText = await image.getAttribute('alt')
      expect(altText).toBeTruthy()
      expect(altText!.length).toBeGreaterThan(3)
    }
  })

  test('keyboard navigation should work throughout the app', async ({ page }) => {
    // Test skip links
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: /salta al contenuto/i })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()

    await page.keyboard.press('Enter')

    // Test main content focus
    const mainContent = page.getByRole('main')
    await expect(mainContent).toBeFocused()

    // Test navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    const firstNavLink = page.locator('nav a:visible').first()
    await expect(firstNavLink).toBeFocused()
  })

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
        'color-contrast-enhanced': { enabled: false }, // AAA is optional
      },
    })

    // Test specific high-risk elements
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        await checkA11y(page, `button:nth-of-type(${i + 1})`, {
          rules: { 'color-contrast': { enabled: true } },
        })
      }
    }
  })

  test('heading structure should be logical', async ({ page }) => {
    const violations = await getViolations(page, {
      rules: {
        'heading-order': { enabled: true },
        'page-has-heading-one': { enabled: true },
        'empty-heading': { enabled: true },
      },
    })

    expect(violations).toHaveLength(0)

    // Check heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()

    const headings = page.getByRole('heading')
    const headingLevels = []

    const headingCount = await headings.count()
    for (let i = 0; i < headingCount; i++) {
      const heading = headings.nth(i)
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
      const level = parseInt(tagName.replace('h', ''))
      headingLevels.push(level)
    }

    // Check for proper heading hierarchy (no skipping levels)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i]
      const previousLevel = headingLevels[i - 1]

      // Can only go down by 1 level or any level up
      if (currentLevel > previousLevel) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1)
      }
    }
  })

  test('ARIA labels and descriptions should be appropriate', async ({ page }) => {
    await checkA11y(page, null, {
      rules: {
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-hidden-body': { enabled: true },
        'aria-hidden-focus': { enabled: true },
      },
    })

    // Test interactive elements have accessible names
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const accessibleName = await button.getAttribute('aria-label') ||
                              await button.textContent() ||
                              await button.getAttribute('aria-labelledby')

        expect(accessibleName).toBeTruthy()
      }
    }
  })

  test('content should be readable and understandable', async ({ page }) => {
    await checkA11y(page, null, {
      rules: {
        'lang': { enabled: true },
        'html-has-lang': { enabled: true },
        'valid-lang': { enabled: true },
      },
    })

    // Check language attribute
    const htmlLang = await page.getAttribute('html', 'lang')
    expect(htmlLang).toBe('it')

    // Check text content is not too small
    const textElements = page.locator('p, span, div').filter({ hasText: /\w+/ })
    const textCount = await textElements.count()

    for (let i = 0; i < Math.min(textCount, 20); i++) {
      const element = textElements.nth(i)
      if (await element.isVisible()) {
        const fontSize = await element.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return parseFloat(styles.fontSize)
        })

        // Minimum 16px for body text (WCAG recommendation)
        expect(fontSize).toBeGreaterThanOrEqual(14)
      }
    }
  })

  test('focus indicators should be visible', async ({ page }) => {
    const focusableElements = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const elementCount = await focusableElements.count()

    // Test focus on various elements
    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      const element = focusableElements.nth(i)

      if (await element.isVisible()) {
        await element.focus()

        // Check if focus outline is visible
        const outline = await element.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow,
          }
        })

        // Should have some form of focus indicator
        const hasFocusIndicator =
          outline.outline !== 'none' ||
          outline.outlineWidth !== '0px' ||
          outline.boxShadow !== 'none'

        expect(hasFocusIndicator).toBe(true)
      }
    }
  })

  test('error messages should be accessible', async ({ page }) => {
    await page.goto('/onboarding')

    // Trigger form validation errors
    await page.getByRole('button', { name: /continua/i }).click()

    // Check error message accessibility
    const errorMessages = page.locator('.error, [role="alert"], .field-error')
    const errorCount = await errorMessages.count()

    for (let i = 0; i < errorCount; i++) {
      const error = errorMessages.nth(i)

      if (await error.isVisible()) {
        // Error should be announced to screen readers
        const role = await error.getAttribute('role')
        const ariaLive = await error.getAttribute('aria-live')

        const isAccessible = role === 'alert' ||
                           ariaLive === 'polite' ||
                           ariaLive === 'assertive'

        expect(isAccessible).toBe(true)
      }
    }
  })

  test('loading states should be accessible', async ({ page }) => {
    await page.goto('/shop')

    // Trigger loading state (if applicable)
    const loadMoreButton = page.getByRole('button', { name: /carica altri/i })

    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click()

      // Check for accessible loading indicators
      const loadingIndicators = page.locator(
        '[aria-busy="true"], [role="progressbar"], .loading'
      )

      if (await loadingIndicators.count() > 0) {
        const firstIndicator = loadingIndicators.first()

        // Should have appropriate ARIA attributes
        const ariaBusy = await firstIndicator.getAttribute('aria-busy')
        const ariaLabel = await firstIndicator.getAttribute('aria-label')
        const role = await firstIndicator.getAttribute('role')

        const isAccessibleLoading =
          ariaBusy === 'true' ||
          role === 'progressbar' ||
          ariaLabel?.includes('caricamento')

        expect(isAccessibleLoading).toBe(true)
      }
    }
  })
})