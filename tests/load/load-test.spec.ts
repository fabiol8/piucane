import { test, expect } from '@playwright/test'

test.describe('Load Testing', () => {
  test('homepage should handle concurrent users', async ({ page, context }) => {
    const startTime = Date.now()

    // Simulate multiple concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      context.newPage().then(async newPage => {
        await newPage.goto('/')
        await newPage.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        await newPage.close()
        return loadTime
      })
    )

    const loadTimes = await Promise.all(promises)

    // All pages should load within reasonable time
    loadTimes.forEach(time => {
      expect(time).toBeLessThan(5000) // 5 seconds max
    })

    // Average load time should be reasonable
    const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
    expect(averageLoadTime).toBeLessThan(3000) // 3 seconds average
  })

  test('shop page should handle product filtering load', async ({ page }) => {
    await page.goto('/shop')

    const startTime = Date.now()

    // Apply multiple filters quickly
    await page.getByText('Cibo Secco').click()
    await page.getByLabel('Prezzo massimo').fill('50')
    await page.getByRole('button', { name: 'Applica Filtri' }).click()

    // Wait for results to load
    await page.waitForSelector('[data-testid="product-card"]')

    const filterTime = Date.now() - startTime
    expect(filterTime).toBeLessThan(2000) // Should filter quickly

    // Check that filtering actually worked
    const productCount = await page.getByTestId('product-card').count()
    expect(productCount).toBeGreaterThan(0)
  })

  test('form submission should be responsive under load', async ({ page, context }) => {
    await page.goto('/onboarding')

    // Skip to form step
    await page.getByRole('button', { name: /continua/i }).click()

    // Simulate multiple form submissions
    const submissions = Array.from({ length: 5 }, async (_, i) => {
      const newPage = await context.newPage()
      await newPage.goto('/onboarding')
      await newPage.getByRole('button', { name: /continua/i }).click()

      const startTime = Date.now()

      await newPage.getByLabel(/nome/i).fill(`User${i}`)
      await newPage.getByLabel(/cognome/i).fill(`Test${i}`)
      await newPage.getByLabel(/email/i).fill(`user${i}@example.com`)
      await newPage.getByLabel(/telefono/i).fill(`+39 123 456 78${i}0`)

      await newPage.getByRole('button', { name: /continua/i }).click()

      // Wait for next step or error
      await newPage.waitForSelector('text="Il tuo cane", text="errore"')

      const submissionTime = Date.now() - startTime
      await newPage.close()

      return submissionTime
    })

    const submissionTimes = await Promise.all(submissions)

    // All submissions should complete within reasonable time
    submissionTimes.forEach(time => {
      expect(time).toBeLessThan(3000) // 3 seconds max
    })
  })

  test('API endpoints should handle concurrent requests', async ({ request }) => {
    const apiCalls = [
      '/api/products',
      '/api/categories',
      '/api/user/profile',
      '/api/orders',
      '/api/recommendations',
    ]

    // Test each endpoint with concurrent requests
    for (const endpoint of apiCalls) {
      const promises = Array.from({ length: 20 }, () => {
        const startTime = Date.now()
        return request.get(endpoint).then(response => ({
          status: response.status(),
          time: Date.now() - startTime,
        }))
      })

      const results = await Promise.all(promises)

      // All requests should succeed or fail gracefully
      results.forEach(result => {
        expect([200, 401, 403, 404, 500]).toContain(result.status)
        expect(result.time).toBeLessThan(2000) // 2 seconds max
      })

      // Most requests should succeed (assuming proper auth)
      const successCount = results.filter(r => r.status === 200 || r.status === 401).length
      expect(successCount).toBeGreaterThan(results.length * 0.8) // 80% success rate
    }
  })

  test('image loading should be efficient', async ({ page }) => {
    await page.goto('/shop')

    // Monitor network requests
    const imageRequests: any[] = []
    page.on('request', request => {
      if (request.resourceType() === 'image') {
        imageRequests.push({
          url: request.url(),
          startTime: Date.now(),
        })
      }
    })

    page.on('response', response => {
      if (response.request().resourceType() === 'image') {
        const request = imageRequests.find(r => r.url === response.url())
        if (request) {
          request.endTime = Date.now()
          request.status = response.status()
          request.size = response.headers()['content-length']
        }
      }
    })

    // Wait for images to load
    await page.waitForLoadState('networkidle')

    // Check image loading performance
    const completedRequests = imageRequests.filter(r => r.endTime)

    completedRequests.forEach(request => {
      const loadTime = request.endTime - request.startTime
      expect(loadTime).toBeLessThan(3000) // 3 seconds max per image
      expect([200, 304]).toContain(request.status) // Should be successful or cached
    })

    // Should not load too many images at once
    expect(completedRequests.length).toBeLessThan(50)
  })

  test('search functionality should be performant', async ({ page }) => {
    await page.goto('/shop')

    const searchQueries = [
      'crocchette',
      'cibo',
      'giocattolo',
      'collare',
      'cane',
    ]

    for (const query of searchQueries) {
      const startTime = Date.now()

      await page.getByPlaceholder('Cerca prodotti...').fill(query)
      await page.getByRole('button', { name: 'Cerca' }).click()

      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"], text="Nessun risultato"')

      const searchTime = Date.now() - startTime
      expect(searchTime).toBeLessThan(2000) // 2 seconds max

      // Clear search for next iteration
      await page.getByPlaceholder('Cerca prodotti...').clear()
    }
  })

  test('cart operations should be responsive', async ({ page }) => {
    await page.goto('/shop')

    // Add multiple items quickly
    const addButtons = page.getByRole('button', { name: 'Aggiungi al Carrello' })
    const buttonCount = Math.min(await addButtons.count(), 5)

    const addTimes: number[] = []

    for (let i = 0; i < buttonCount; i++) {
      const startTime = Date.now()
      await addButtons.nth(i).click()

      // Wait for confirmation
      await page.waitForSelector('text="Prodotto aggiunto al carrello"')

      const addTime = Date.now() - startTime
      addTimes.push(addTime)

      expect(addTime).toBeLessThan(1500) // 1.5 seconds max
    }

    // Check cart operations
    await page.getByRole('button', { name: /carrello/i }).click()

    const startTime = Date.now()
    await page.waitForSelector('[data-testid="cart-item"]')
    const cartLoadTime = Date.now() - startTime

    expect(cartLoadTime).toBeLessThan(1000) // Cart should load quickly

    // Test quantity updates
    const quantityInputs = page.getByLabel('Quantità')
    if (await quantityInputs.count() > 0) {
      const updateStartTime = Date.now()
      await quantityInputs.first().fill('3')
      await quantityInputs.first().blur()

      // Wait for total to update
      await page.waitForFunction(() => {
        const total = document.querySelector('[data-testid="cart-total"]')
        return total && total.textContent !== ''
      })

      const updateTime = Date.now() - updateStartTime
      expect(updateTime).toBeLessThan(1000) // Updates should be fast
    }
  })

  test('memory usage should be reasonable', async ({ page }) => {
    await page.goto('/')

    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory ? {
        // @ts-ignore
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        // @ts-ignore
        totalJSHeapSize: performance.memory.totalJSHeapSize,
      } : null
    })

    if (initialMetrics) {
      // Navigate through several pages
      const pages = ['/shop', '/account', '/orders', '/chat', '/']

      for (const pagePath of pages) {
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
      }

      // Check final memory usage
      const finalMetrics = await page.evaluate(() => {
        // Force garbage collection if available
        // @ts-ignore
        if (window.gc) window.gc()

        // @ts-ignore
        return performance.memory ? {
          // @ts-ignore
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          // @ts-ignore
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        } : null
      })

      if (finalMetrics) {
        // Memory shouldn't grow excessively
        const memoryGrowth = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize
        const memoryGrowthMB = memoryGrowth / (1024 * 1024)

        expect(memoryGrowthMB).toBeLessThan(50) // Less than 50MB growth
        expect(finalMetrics.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024) // Less than 100MB total
      }
    }
  })

  test('CSS and JS bundle sizes should be reasonable', async ({ page }) => {
    // Monitor resource sizes
    const resources: any[] = []

    page.on('response', response => {
      const url = response.url()
      const resourceType = response.request().resourceType()

      if (resourceType === 'stylesheet' || resourceType === 'script') {
        resources.push({
          url,
          type: resourceType,
          size: response.headers()['content-length'],
          status: response.status(),
        })
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check CSS bundle sizes
    const cssResources = resources.filter(r => r.type === 'stylesheet')
    const totalCSSSize = cssResources.reduce((total, r) => total + (parseInt(r.size) || 0), 0)

    expect(totalCSSSize).toBeLessThan(500 * 1024) // Less than 500KB CSS

    // Check JS bundle sizes
    const jsResources = resources.filter(r => r.type === 'script')
    const totalJSSize = jsResources.reduce((total, r) => total + (parseInt(r.size) || 0), 0)

    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024) // Less than 2MB JS

    // All resources should load successfully
    resources.forEach(resource => {
      expect([200, 304]).toContain(resource.status)
    })
  })
})