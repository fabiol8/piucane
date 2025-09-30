import { test, expect } from '@playwright/test'

test.describe('Privacy Consent Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
  })

  test('should show consent banner on first visit', async ({ page }) => {
    // Wait for banner to appear after delay
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Should show all expected elements
    await expect(page.getByText('Utilizziamo cookie e tecnologie simili')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accetta tutto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rifiuta tutto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Personalizza' })).toBeVisible()
  })

  test('should not show banner if consent already given', async ({ page }) => {
    // Set consent in localStorage
    await page.evaluate(() => {
      localStorage.setItem('piucane_consent', JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        personalization: true,
        functional: true
      }))
      localStorage.setItem('piucane_consent_timestamp', new Date().toISOString())
    })

    await page.reload()

    // Banner should not appear
    await page.waitForTimeout(3000)
    await expect(page.getByText('Rispettiamo la tua privacy')).not.toBeVisible()
  })

  test('should handle accept all correctly', async ({ page }) => {
    // Listen for gtag calls
    await page.addInitScript(() => {
      window.gtagCalls = []
      window.gtag = (...args) => {
        window.gtagCalls.push(args)
      }
    })

    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Click accept all
    await page.getByRole('button', { name: 'Accetta tutto' }).click()

    // Banner should disappear
    await expect(page.getByText('Rispettiamo la tua privacy')).not.toBeVisible()

    // Check localStorage
    const consent = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('piucane_consent') || '{}')
    )
    expect(consent).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      functional: true
    })

    // Check analytics tracking
    const gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual([
      'consent',
      'update',
      {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'functionality_storage': 'granted',
        'personalization_storage': 'granted'
      }
    ])
  })

  test('should handle reject all correctly', async ({ page }) => {
    await page.addInitScript(() => {
      window.gtagCalls = []
      window.gtag = (...args) => {
        window.gtagCalls.push(args)
      }
    })

    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Click reject all
    await page.getByRole('button', { name: 'Rifiuta tutto' }).click()

    // Banner should disappear
    await expect(page.getByText('Rispettiamo la tua privacy')).not.toBeVisible()

    // Check localStorage - only necessary should be true
    const consent = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('piucane_consent') || '{}')
    )
    expect(consent).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      functional: false
    })

    // Check analytics tracking - should be denied
    const gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual([
      'consent',
      'update',
      {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'functionality_storage': 'denied',
        'personalization_storage': 'denied'
      }
    ])
  })

  test('should show detailed information', async ({ page }) => {
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Click show details
    await page.getByRole('button', { name: 'Mostra dettagli' }).click()

    // Should show cookie categories
    await expect(page.getByText('Cookie Necessari')).toBeVisible()
    await expect(page.getByText('Analytics')).toBeVisible()
    await expect(page.getByText('Marketing')).toBeVisible()
    await expect(page.getByText('Personalizzazione')).toBeVisible()

    // Should show descriptions
    await expect(page.getByText('Essenziali per il funzionamento del sito')).toBeVisible()
    await expect(page.getByText('Ci aiutano a migliorare il sito analizzando l\'utilizzo')).toBeVisible()

    // Should be able to hide details
    await page.getByRole('button', { name: 'Nascondi dettagli' }).click()
    await expect(page.getByText('Cookie Necessari')).not.toBeVisible()
  })

  test('should open settings panel', async ({ page }) => {
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Click customize
    await page.getByRole('button', { name: 'Personalizza' }).click()

    // Should show settings panel
    await expect(page.getByText('Impostazioni Privacy')).toBeVisible()

    // Should show all cookie categories with switches
    await expect(page.getByText('Cookie Necessari')).toBeVisible()
    await expect(page.getByText('Sempre attivi')).toBeVisible()

    // Should show provider information
    await expect(page.getByText('Provider: Google Analytics, Hotjar')).toBeVisible()
    await expect(page.getByText('Provider: Facebook Pixel, Google Ads, LinkedIn')).toBeVisible()

    // Necessary cookies switch should be disabled
    const switches = page.getByRole('switch')
    const necessarySwitch = switches.first()
    await expect(necessarySwitch).toBeDisabled()
    await expect(necessarySwitch).toBeChecked()
  })

  test('should handle custom preferences', async ({ page }) => {
    await page.addInitScript(() => {
      window.gtagCalls = []
      window.gtag = (...args) => {
        window.gtagCalls.push(args)
      }
    })

    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Open settings
    await page.getByRole('button', { name: 'Personalizza' }).click()

    // Toggle analytics switch (should be second switch, first is disabled necessary)
    const switches = page.getByRole('switch')
    const analyticsSwitch = switches.nth(1)
    await analyticsSwitch.click()

    // Toggle personalization switch
    const personalizationSwitch = switches.nth(3)
    await personalizationSwitch.click()

    // Save preferences
    await page.getByRole('button', { name: 'Salva preferenze' }).click()

    // Panel should close
    await expect(page.getByText('Impostazioni Privacy')).not.toBeVisible()

    // Check saved preferences
    const consent = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('piucane_consent') || '{}')
    )
    expect(consent.necessary).toBe(true)
    expect(consent.analytics).toBe(true)
    expect(consent.marketing).toBe(false)
    expect(consent.personalization).toBe(true)
    expect(consent.functional).toBe(false)

    // Check analytics event
    const gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual([
      'event',
      'consent_custom',
      expect.objectContaining({
        event_category: 'privacy',
        event_label: 'settings'
      })
    ])
  })

  test('should persist preferences after page reload', async ({ page }) => {
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Accept all
    await page.getByRole('button', { name: 'Accetta tutto' }).click()

    // Reload page
    await page.reload()

    // Banner should not appear
    await page.waitForTimeout(3000)
    await expect(page.getByText('Rispettiamo la tua privacy')).not.toBeVisible()
  })

  test('should show banner again after consent expiration', async ({ page }) => {
    // Set expired consent (15 months ago)
    const expiredDate = new Date()
    expiredDate.setMonth(expiredDate.getMonth() - 15)

    await page.evaluate((dateString) => {
      localStorage.setItem('piucane_consent', JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        personalization: true,
        functional: true
      }))
      localStorage.setItem('piucane_consent_timestamp', dateString)
    }, expiredDate.toISOString())

    await page.reload()

    // Banner should appear for expired consent
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible()
  })

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Tab through buttons
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Mostra dettagli' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Rifiuta tutto' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Personalizza' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Accetta tutto' })).toBeFocused()

    // Should activate with Enter
    await page.keyboard.press('Enter')
    await expect(page.getByText('Rispettiamo la tua privacy')).not.toBeVisible()
  })

  test('should work correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Should be properly sized for mobile
    const banner = page.getByText('Rispettiamo la tua privacy').locator('..').locator('..')
    const bbox = await banner.boundingBox()
    expect(bbox?.width).toBeLessThanOrEqual(375)

    // Buttons should be accessible on mobile
    await page.getByRole('button', { name: 'Personalizza' }).click()
    await expect(page.getByText('Impostazioni Privacy')).toBeVisible()

    // Settings panel should fit mobile screen
    const settingsPanel = page.getByText('Impostazioni Privacy').locator('..')
    const settingsBbox = await settingsPanel.boundingBox()
    expect(settingsBbox?.width).toBeLessThanOrEqual(375)
  })

  test('should close banner with X button', async ({ page }) => {
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Click close button
    await page.getByRole('button', { name: 'Chiudi banner' }).click()

    // Banner should disappear
    await expect(page.getByText('Rispettiamo la tua privacy')).not.toBeVisible()

    // No consent should be saved
    const consent = await page.evaluate(() => localStorage.getItem('piucane_consent'))
    expect(consent).toBeNull()
  })

  test('should dispatch custom consent event', async ({ page }) => {
    // Listen for custom event
    await page.addInitScript(() => {
      window.consentEvents = []
      window.addEventListener('piucane_consent_updated', (event) => {
        window.consentEvents.push(event.detail)
      })
    })

    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Accept all
    await page.getByRole('button', { name: 'Accetta tutto' }).click()

    // Check custom event was fired
    const consentEvents = await page.evaluate(() => window.consentEvents)
    expect(consentEvents).toHaveLength(1)
    expect(consentEvents[0]).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      functional: true
    })
  })

  test('should preserve settings when navigating between banner and settings', async ({ page }) => {
    await expect(page.getByText('Rispettiamo la tua privacy')).toBeVisible({ timeout: 5000 })

    // Open settings
    await page.getByRole('button', { name: 'Personalizza' }).click()

    // Toggle some switches
    const switches = page.getByRole('switch')
    await switches.nth(1).click() // Analytics
    await switches.nth(2).click() // Marketing

    // Close settings without saving
    await page.getByRole('button').filter({ hasText: '×' }).click()

    // Open settings again
    await page.getByRole('button', { name: 'Personalizza' }).click()

    // Settings should be preserved
    const newSwitches = page.getByRole('switch')
    await expect(newSwitches.nth(1)).toBeChecked() // Analytics
    await expect(newSwitches.nth(2)).toBeChecked() // Marketing
  })
})