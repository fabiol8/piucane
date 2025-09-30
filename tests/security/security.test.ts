import { test, expect } from '@playwright/test'

test.describe('Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have proper Content Security Policy headers', async ({ page }) => {
    const response = await page.goto('/')
    const cspHeader = response?.headers()['content-security-policy']

    expect(cspHeader).toBeDefined()
    expect(cspHeader).toContain("default-src 'self'")
    expect(cspHeader).toContain("script-src 'self'")
    expect(cspHeader).toContain("style-src 'self'")
    expect(cspHeader).toContain("img-src 'self' data: https:")
  })

  test('should have secure headers', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers()

    // X-Frame-Options
    expect(headers?.['x-frame-options']).toBe('DENY')

    // X-Content-Type-Options
    expect(headers?.['x-content-type-options']).toBe('nosniff')

    // X-XSS-Protection
    expect(headers?.['x-xss-protection']).toBe('1; mode=block')

    // Strict-Transport-Security (if HTTPS)
    if (page.url().startsWith('https://')) {
      expect(headers?.['strict-transport-security']).toContain('max-age=')
    }

    // Referrer-Policy
    expect(headers?.['referrer-policy']).toBeTruthy()
  })

  test('should not expose sensitive information in HTML', async ({ page }) => {
    const content = await page.content()

    // Should not contain API keys or secrets
    expect(content).not.toMatch(/sk_[a-zA-Z0-9_]{24,}/) // Stripe secret keys
    expect(content).not.toMatch(/AIza[0-9A-Za-z_-]{35}/) // Google API keys
    expect(content).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/) // Passwords
    expect(content).not.toMatch(/secret\s*[:=]\s*["'][^"']+["']/) // Secrets
    expect(content).not.toMatch(/key\s*[:=]\s*["'][^"']+["']/) // Generic keys

    // Should not contain development artifacts
    expect(content).not.toContain('console.log')
    expect(content).not.toContain('debugger')
    expect(content).not.toContain('TODO')
    expect(content).not.toContain('FIXME')
  })

  test('should properly validate form inputs', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByRole('button', { name: /continua/i }).click()

    // Test XSS prevention in text inputs
    const nameInput = page.getByLabel(/nome/i)
    await nameInput.fill('<script>alert("xss")</script>')

    // Submit form
    await page.getByRole('button', { name: /continua/i }).click()

    // Check that script was not executed
    const alertDialogs: string[] = []
    page.on('dialog', dialog => {
      alertDialogs.push(dialog.message())
      dialog.dismiss()
    })

    await page.waitForTimeout(1000)
    expect(alertDialogs).toHaveLength(0)

    // Check that input was sanitized or escaped
    const inputValue = await nameInput.inputValue()
    expect(inputValue).not.toContain('<script>')
  })

  test('should prevent SQL injection in search', async ({ page }) => {
    await page.goto('/shop')

    const searchInput = page.getByPlaceholder('Cerca prodotti...')

    // Test various SQL injection patterns
    const sqlInjectionAttempts = [
      "'; DROP TABLE products; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO products VALUES('evil'); --",
    ]

    for (const attempt of sqlInjectionAttempts) {
      await searchInput.fill(attempt)
      await page.getByRole('button', { name: 'Cerca' }).click()

      // Should either show no results or normal search results
      // Should not cause a server error or expose database info
      const errorText = await page.textContent('body')
      expect(errorText).not.toContain('SQL')
      expect(errorText).not.toContain('database')
      expect(errorText).not.toContain('syntax error')
      expect(errorText).not.toContain('mysql')
      expect(errorText).not.toContain('postgresql')
    }
  })

  test('should handle file upload security', async ({ page }) => {
    await page.goto('/onboarding')

    // Navigate to photo upload step
    await page.getByRole('button', { name: /continua/i }).click()

    // Fill required fields
    await page.getByLabel(/nome/i).fill('Mario')
    await page.getByLabel(/cognome/i).fill('Rossi')
    await page.getByLabel(/email/i).fill('mario@example.com')
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

    // Test malicious file uploads
    const fileInput = page.getByRole('button', { name: /carica foto/i })

    // Try to upload executable file
    try {
      await fileInput.setInputFiles({
        name: 'malicious.exe',
        mimeType: 'application/x-executable',
        buffer: Buffer.from('MZ'), // PE header
      })

      // Should show error or reject file
      const errorMessage = await page.textContent('body')
      expect(errorMessage).toMatch(/formato.*non.*supportato|file.*non.*valido/i)
    } catch (error) {
      // File input rejection is also acceptable
      expect(error.message).toContain('file')
    }

    // Try to upload script file
    try {
      await fileInput.setInputFiles({
        name: 'script.js',
        mimeType: 'application/javascript',
        buffer: Buffer.from('alert("xss")'),
      })

      const errorMessage = await page.textContent('body')
      expect(errorMessage).toMatch(/formato.*non.*supportato|file.*non.*valido/i)
    } catch (error) {
      expect(error.message).toContain('file')
    }
  })

  test('should protect against CSRF attacks', async ({ page }) => {
    await page.goto('/login')

    // Check for CSRF token in forms
    const form = page.locator('form').first()
    const formHtml = await form.innerHTML()

    // Should have CSRF token or other protection mechanism
    const hasCsrfToken = formHtml.includes('csrf') ||
                        formHtml.includes('_token') ||
                        formHtml.includes('authenticity_token')

    // Or check for SameSite cookies
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(cookie =>
      cookie.name.includes('auth') ||
      cookie.name.includes('session') ||
      cookie.name.includes('token')
    )

    const hasSecureCookies = authCookies.some(cookie =>
      cookie.sameSite === 'Strict' || cookie.sameSite === 'Lax'
    )

    expect(hasCsrfToken || hasSecureCookies).toBe(true)
  })

  test('should handle authentication properly', async ({ page }) => {
    // Test unauthorized access to protected pages
    const protectedPages = [
      '/account',
      '/orders',
      '/admin',
      '/api/user/profile',
    ]

    for (const pagePath of protectedPages) {
      const response = await page.goto(pagePath)

      if (response) {
        const status = response.status()
        // Should redirect to login or return 401/403
        expect([200, 302, 401, 403]).toContain(status)

        if (status === 200) {
          // If page loads, should be redirected to login
          expect(page.url()).toMatch(/login|auth/)
        }
      }
    }
  })

  test('should sanitize user-generated content', async ({ page }) => {
    // Test in areas where users can input content
    await page.goto('/chat')

    const chatInput = page.getByPlaceholder(/scrivi un messaggio/i)
    if (await chatInput.isVisible()) {
      // Test XSS in chat
      await chatInput.fill('<img src=x onerror="alert(1)">')
      await page.keyboard.press('Enter')

      // Wait and check that script didn't execute
      await page.waitForTimeout(1000)

      const pageContent = await page.content()
      expect(pageContent).not.toContain('onerror="alert(1)"')
      expect(pageContent).not.toContain('<img src=x')
    }
  })

  test('should have secure cookie settings', async ({ page }) => {
    await page.goto('/login')

    // Log in to generate cookies
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Accedi' }).click()

    const cookies = await page.context().cookies()

    // Check security attributes
    const securityCookies = cookies.filter(cookie =>
      cookie.name.includes('auth') ||
      cookie.name.includes('session') ||
      cookie.name.includes('token')
    )

    securityCookies.forEach(cookie => {
      // Should be HttpOnly for security cookies
      expect(cookie.httpOnly).toBe(true)

      // Should be Secure if on HTTPS
      if (page.url().startsWith('https://')) {
        expect(cookie.secure).toBe(true)
      }

      // Should have SameSite attribute
      expect(['Strict', 'Lax', 'None']).toContain(cookie.sameSite || 'Lax')
    })
  })

  test('should rate limit form submissions', async ({ page }) => {
    await page.goto('/contact')

    // If contact form exists, test rate limiting
    const contactForm = page.locator('form')
    if (await contactForm.isVisible()) {
      const submitButton = page.getByRole('button', { name: /invia/i })

      // Submit form multiple times rapidly
      for (let i = 0; i < 10; i++) {
        await submitButton.click()
        await page.waitForTimeout(100)
      }

      // Should show rate limit message or prevent further submissions
      const pageContent = await page.textContent('body')
      const isRateLimited = pageContent?.includes('limite') ||
                           pageContent?.includes('troppi') ||
                           pageContent?.includes('attendi') ||
                           await submitButton.isDisabled()

      expect(isRateLimited).toBe(true)
    }
  })

  test('should not leak sensitive data in errors', async ({ page }) => {
    // Test various error conditions
    const errorPages = [
      '/nonexistent-page',
      '/api/nonexistent-endpoint',
      '/admin/secret',
    ]

    for (const errorPage of errorPages) {
      const response = await page.goto(errorPage)

      if (response && response.status() >= 400) {
        const content = await page.content()

        // Should not contain sensitive info
        expect(content).not.toMatch(/\/[a-zA-Z]:\//) // File paths
        expect(content).not.toContain('stack trace')
        expect(content).not.toContain('database')
        expect(content).not.toContain('connection string')
        expect(content).not.toContain('internal server error')
        expect(content).not.toMatch(/line \d+/) // Line numbers
      }
    }
  })

  test('should validate and sanitize URLs', async ({ page }) => {
    // Test URL manipulation
    const maliciousUrls = [
      '/?redirect=javascript:alert(1)',
      '/?next=//evil.com',
      '/?return_to=file:///etc/passwd',
    ]

    for (const url of maliciousUrls) {
      await page.goto(url)

      // Should not execute JavaScript or redirect to external sites
      expect(page.url()).not.toContain('javascript:')
      expect(page.url()).not.toContain('evil.com')
      expect(page.url()).not.toContain('file:///')
    }
  })
})