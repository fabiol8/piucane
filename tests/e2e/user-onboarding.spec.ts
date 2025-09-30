import { test, expect } from '@playwright/test'

test.describe('User Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/')
  })

  test('should complete full onboarding flow', async ({ page }) => {
    // Navigate to onboarding
    await page.getByRole('link', { name: /inizia/i }).click()
    await expect(page).toHaveURL(/onboarding/)

    // Step 1: Welcome
    await expect(page.getByText('Benvenuto in PiùCane')).toBeVisible()
    await page.getByRole('button', { name: /continua/i }).click()

    // Step 2: User Info
    await expect(page.getByText('I tuoi dati')).toBeVisible()
    await page.getByLabel(/nome/i).fill('Mario')
    await page.getByLabel(/cognome/i).fill('Rossi')
    await page.getByLabel(/email/i).fill('mario.rossi@example.com')
    await page.getByLabel(/telefono/i).fill('+39 123 456 7890')
    await page.getByRole('button', { name: /continua/i }).click()

    // Step 3: Dog Profile
    await expect(page.getByText('Il tuo cane')).toBeVisible()
    await page.getByLabel(/nome del cane/i).fill('Luna')
    await page.getByLabel(/razza/i).click()
    await page.getByText('Labrador Retriever').click()

    // Select gender
    await page.getByLabel(/femmina/i).check()

    // Enter birth date
    await page.getByLabel(/data di nascita/i).fill('2020-03-15')

    // Enter weight
    await page.getByLabel(/peso/i).fill('28.5')

    await page.getByRole('button', { name: /continua/i }).click()

    // Step 4: Photo Upload (optional)
    await expect(page.getByText('Foto del tuo cane')).toBeVisible()
    await page.getByRole('button', { name: /salta/i }).click()

    // Step 5: Completion
    await expect(page.getByText('Profilo completato!')).toBeVisible()
    await page.getByRole('button', { name: /inizia/i }).click()

    // Should redirect to main app
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Ciao Mario!')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('link', { name: /inizia/i }).click()

    // Skip welcome
    await page.getByRole('button', { name: /continua/i }).click()

    // Try to continue without filling required fields
    await page.getByRole('button', { name: /continua/i }).click()

    // Should show validation errors
    await expect(page.getByText('Il nome è obbligatorio')).toBeVisible()
    await expect(page.getByText('Il cognome è obbligatorio')).toBeVisible()
    await expect(page.getByText('L\'email è obbligatoria')).toBeVisible()
  })

  test('should handle photo upload', async ({ page }) => {
    // Complete steps until photo upload
    await page.getByRole('link', { name: /inizia/i }).click()
    await page.getByRole('button', { name: /continua/i }).click()

    // Fill user info
    await page.getByLabel(/nome/i).fill('Mario')
    await page.getByLabel(/cognome/i).fill('Rossi')
    await page.getByLabel(/email/i).fill('mario.rossi@example.com')
    await page.getByLabel(/telefono/i).fill('+39 123 456 7890')
    await page.getByRole('button', { name: /continua/i }).click()

    // Fill dog info
    await page.getByLabel(/nome del cane/i).fill('Luna')
    await page.getByLabel(/razza/i).click()
    await page.getByText('Labrador Retriever').click()
    await page.getByLabel(/femmina/i).check()
    await page.getByLabel(/data di nascita/i).fill('2020-03-15')
    await page.getByLabel(/peso/i).fill('28.5')
    await page.getByRole('button', { name: /continua/i }).click()

    // Photo upload step
    await expect(page.getByText('Foto del tuo cane')).toBeVisible()

    // Mock file upload
    const fileInput = page.getByRole('button', { name: /carica foto/i })
    await fileInput.setInputFiles({
      name: 'dog-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    })

    // Should show uploaded photo preview
    await expect(page.getByAltText('Anteprima foto')).toBeVisible()

    await page.getByRole('button', { name: /continua/i }).click()
    await expect(page.getByText('Profilo completato!')).toBeVisible()
  })

  test('should allow going back to previous steps', async ({ page }) => {
    await page.getByRole('link', { name: /inizia/i }).click()
    await page.getByRole('button', { name: /continua/i }).click()

    // Fill some data
    await page.getByLabel(/nome/i).fill('Mario')
    await page.getByRole('button', { name: /continua/i }).click()

    // Go back
    await page.getByRole('button', { name: /indietro/i }).click()

    // Should preserve data
    await expect(page.getByLabel(/nome/i)).toHaveValue('Mario')
  })

  test('should track analytics events', async ({ page }) => {
    // Listen for gtag calls
    await page.addInitScript(() => {
      window.gtagCalls = []
      window.gtag = (...args) => {
        window.gtagCalls.push(args)
      }
    })

    await page.getByRole('link', { name: /inizia/i }).click()

    // Check onboarding started event
    const gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual(['event', 'onboarding_started', expect.any(Object)])
  })

  test('should be accessible', async ({ page }) => {
    await page.getByRole('link', { name: /inizia/i }).click()

    // Check for skip link
    await expect(page.getByRole('link', { name: /salta al contenuto/i })).toBeVisible()

    // Check heading structure
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()

    // Check form labels
    await page.getByRole('button', { name: /continua/i }).click()
    const nameInput = page.getByLabel(/nome/i)
    await expect(nameInput).toBeVisible()

    // Test keyboard navigation
    await nameInput.focus()
    await expect(nameInput).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/cognome/i)).toBeFocused()
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.getByRole('link', { name: /inizia/i }).click()

    // Should have mobile-friendly layout
    await expect(page.getByText('Benvenuto in PiùCane')).toBeVisible()

    // Navigation should work
    await page.getByRole('button', { name: /continua/i }).click()
    await expect(page.getByText('I tuoi dati')).toBeVisible()

    // Form should be usable on mobile
    await page.getByLabel(/nome/i).fill('Mario')
    await expect(page.getByLabel(/nome/i)).toHaveValue('Mario')
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/users', route => route.abort())

    await page.getByRole('link', { name: /inizia/i }).click()
    await page.getByRole('button', { name: /continua/i }).click()

    // Fill form
    await page.getByLabel(/nome/i).fill('Mario')
    await page.getByLabel(/cognome/i).fill('Rossi')
    await page.getByLabel(/email/i).fill('mario.rossi@example.com')
    await page.getByLabel(/telefono/i).fill('+39 123 456 7890')

    await page.getByRole('button', { name: /continua/i }).click()

    // Should show error message
    await expect(page.getByText(/errore di connessione/i)).toBeVisible()

    // Should allow retry
    await expect(page.getByRole('button', { name: /riprova/i })).toBeVisible()
  })

  test('should save progress automatically', async ({ page }) => {
    await page.getByRole('link', { name: /inizia/i }).click()
    await page.getByRole('button', { name: /continua/i }).click()

    // Fill user info
    await page.getByLabel(/nome/i).fill('Mario')
    await page.getByLabel(/cognome/i).fill('Rossi')
    await page.getByLabel(/email/i).fill('mario.rossi@example.com')

    // Refresh page
    await page.reload()

    // Should preserve progress
    await expect(page.getByLabel(/nome/i)).toHaveValue('Mario')
    await expect(page.getByLabel(/cognome/i)).toHaveValue('Rossi')
    await expect(page.getByLabel(/email/i)).toHaveValue('mario.rossi@example.com')
  })

  test('should validate email format', async ({ page }) => {
    await page.getByRole('link', { name: /inizia/i }).click()
    await page.getByRole('button', { name: /continua/i }).click()

    // Enter invalid email
    await page.getByLabel(/email/i).fill('invalid-email')
    await page.getByRole('button', { name: /continua/i }).click()

    await expect(page.getByText(/formato email non valido/i)).toBeVisible()

    // Enter valid email
    await page.getByLabel(/email/i).fill('valid@example.com')
    await expect(page.getByText(/formato email non valido/i)).not.toBeVisible()
  })

  test('should validate phone number format', async ({ page }) => {
    await page.getByRole('link', { name: /inizia/i }).click()
    await page.getByRole('button', { name: /continua/i }).click()

    // Enter invalid phone
    await page.getByLabel(/telefono/i).fill('123')
    await page.getByRole('button', { name: /continua/i }).click()

    await expect(page.getByText(/numero di telefono non valido/i)).toBeVisible()

    // Enter valid phone
    await page.getByLabel(/telefono/i).fill('+39 123 456 7890')
    await expect(page.getByText(/numero di telefono non valido/i)).not.toBeVisible()
  })
})