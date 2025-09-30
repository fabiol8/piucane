import { test, expect } from '@playwright/test'

test.describe('Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated user
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Accedi' }).click()
    await expect(page).toHaveURL('/')
  })

  test('should complete full shopping flow', async ({ page }) => {
    // Navigate to shop
    await page.getByRole('link', { name: 'Shop' }).click()
    await expect(page).toHaveURL('/shop')

    // Browse products
    await expect(page.getByText('Catalogo Prodotti')).toBeVisible()
    await expect(page.getByRole('link', { name: /cibo secco/i }).first()).toBeVisible()

    // View product details
    await page.getByRole('link', { name: /cibo secco/i }).first().click()
    await expect(page).toHaveURL(/\/shop\/products\//)

    // Add to cart
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).click()
    await expect(page.getByText('Prodotto aggiunto al carrello')).toBeVisible()

    // View cart
    await page.getByRole('button', { name: /carrello/i }).click()
    await expect(page.getByText('Il tuo carrello')).toBeVisible()
    await expect(page.getByText(/cibo secco/i)).toBeVisible()

    // Proceed to checkout
    await page.getByRole('button', { name: 'Procedi al Checkout' }).click()
    await expect(page).toHaveURL('/checkout')

    // Fill shipping address
    await expect(page.getByText('Indirizzo di Spedizione')).toBeVisible()
    await page.getByLabel('Via').fill('Via Roma 123')
    await page.getByLabel('Città').fill('Milano')
    await page.getByLabel('CAP').fill('20100')
    await page.getByLabel('Provincia').fill('MI')

    // Select payment method
    await page.getByText('Metodo di Pagamento').click()
    await page.getByLabel('Carta di Credito').check()

    // Fill payment details (mock)
    await page.getByLabel('Numero Carta').fill('4242424242424242')
    await page.getByLabel('Scadenza').fill('12/25')
    await page.getByLabel('CVV').fill('123')
    await page.getByLabel('Nome Titolare').fill('Mario Rossi')

    // Place order
    await page.getByRole('button', { name: 'Conferma Ordine' }).click()

    // Should redirect to success page
    await expect(page).toHaveURL('/checkout/success')
    await expect(page.getByText('Ordine Confermato!')).toBeVisible()
    await expect(page.getByText(/numero ordine/i)).toBeVisible()
  })

  test('should filter products correctly', async ({ page }) => {
    await page.goto('/shop')

    // Apply category filter
    await page.getByText('Cibo Secco').click()
    await expect(page.getByText(/risultati per "cibo secco"/i)).toBeVisible()

    // Apply price filter
    await page.getByLabel('Prezzo massimo').fill('50')
    await page.getByRole('button', { name: 'Applica Filtri' }).click()

    // Products should be filtered
    const products = page.getByTestId('product-card')
    const count = await products.count()
    expect(count).toBeGreaterThan(0)

    // All visible products should be under €50
    for (let i = 0; i < count; i++) {
      const product = products.nth(i)
      const priceText = await product.getByTestId('product-price').textContent()
      const price = parseFloat(priceText?.replace('€', '').replace(',', '.') || '0')
      expect(price).toBeLessThanOrEqual(50)
    }
  })

  test('should handle product search', async ({ page }) => {
    await page.goto('/shop')

    // Search for products
    await page.getByPlaceholder('Cerca prodotti...').fill('crocchette')
    await page.getByRole('button', { name: 'Cerca' }).click()

    // Should show search results
    await expect(page.getByText(/risultati per "crocchette"/i)).toBeVisible()

    // Should highlight search terms
    await expect(page.getByText('crocchette').first()).toBeVisible()
  })

  test('should manage cart items', async ({ page }) => {
    await page.goto('/shop')

    // Add multiple products
    const products = page.getByRole('button', { name: 'Aggiungi al Carrello' })
    await products.first().click()
    await expect(page.getByText('Prodotto aggiunto al carrello')).toBeVisible()

    await products.nth(1).click()
    await expect(page.getByText('Prodotto aggiunto al carrello')).toBeVisible()

    // Open cart
    await page.getByRole('button', { name: /carrello/i }).click()

    // Should show multiple items
    const cartItems = page.getByTestId('cart-item')
    const itemCount = await cartItems.count()
    expect(itemCount).toBe(2)

    // Update quantity
    const quantityInput = cartItems.first().getByLabel('Quantità')
    await quantityInput.fill('3')
    await quantityInput.blur()

    // Should update total
    await expect(page.getByTestId('cart-total')).toContainText('€')

    // Remove item
    await cartItems.first().getByRole('button', { name: 'Rimuovi' }).click()

    // Should confirm removal
    await expect(page.getByText('Articolo rimosso dal carrello')).toBeVisible()

    // Cart should have one less item
    const newItemCount = await page.getByTestId('cart-item').count()
    expect(newItemCount).toBe(1)
  })

  test('should calculate shipping costs correctly', async ({ page }) => {
    await page.goto('/shop')

    // Add product to cart
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).first().click()
    await page.getByRole('button', { name: /carrello/i }).click()
    await page.getByRole('button', { name: 'Procedi al Checkout' }).click()

    // Fill address for shipping calculation
    await page.getByLabel('Via').fill('Via Roma 123')
    await page.getByLabel('Città').fill('Milano')
    await page.getByLabel('CAP').fill('20100')
    await page.getByLabel('Provincia').fill('MI')

    // Should show shipping options
    await expect(page.getByText('Opzioni di Spedizione')).toBeVisible()

    // Select standard shipping
    await page.getByLabel('Spedizione Standard (€4.99)').check()

    // Should update total
    await expect(page.getByText('Spedizione: €4.99')).toBeVisible()

    // Try express shipping
    await page.getByLabel('Spedizione Express (€9.99)').check()
    await expect(page.getByText('Spedizione: €9.99')).toBeVisible()

    // Free shipping for orders over threshold
    await page.goto('/shop')

    // Add expensive product for free shipping
    const expensiveProduct = page.getByTestId('product-card').filter({ hasText: '€' })
    await expensiveProduct.first().click()

    // Add multiple to reach free shipping threshold
    await page.getByLabel('Quantità').fill('10')
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).click()

    await page.getByRole('button', { name: /carrello/i }).click()
    await page.getByRole('button', { name: 'Procedi al Checkout' }).click()

    // Should show free shipping
    await expect(page.getByText('Spedizione Gratuita')).toBeVisible()
  })

  test('should handle payment errors', async ({ page }) => {
    await page.goto('/shop')
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).first().click()
    await page.getByRole('button', { name: /carrello/i }).click()
    await page.getByRole('button', { name: 'Procedi al Checkout' }).click()

    // Fill address
    await page.getByLabel('Via').fill('Via Roma 123')
    await page.getByLabel('Città').fill('Milano')
    await page.getByLabel('CAP').fill('20100')
    await page.getByLabel('Provincia').fill('MI')

    // Use invalid card number
    await page.getByLabel('Carta di Credito').check()
    await page.getByLabel('Numero Carta').fill('4000000000000002') // Declined card
    await page.getByLabel('Scadenza').fill('12/25')
    await page.getByLabel('CVV').fill('123')
    await page.getByLabel('Nome Titolare').fill('Mario Rossi')

    await page.getByRole('button', { name: 'Conferma Ordine' }).click()

    // Should show payment error
    await expect(page.getByText(/carta rifiutata/i)).toBeVisible()

    // Should allow retry
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible()
  })

  test('should apply discount codes', async ({ page }) => {
    await page.goto('/shop')
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).first().click()
    await page.getByRole('button', { name: /carrello/i }).click()

    // Apply discount code
    await page.getByLabel('Codice Sconto').fill('WELCOME10')
    await page.getByRole('button', { name: 'Applica' }).click()

    // Should show discount applied
    await expect(page.getByText('Sconto Applicato')).toBeVisible()
    await expect(page.getByText('WELCOME10')).toBeVisible()

    // Should update total
    await expect(page.getByText('Sconto: -€')).toBeVisible()

    // Try invalid code
    await page.getByLabel('Codice Sconto').clear()
    await page.getByLabel('Codice Sconto').fill('INVALID')
    await page.getByRole('button', { name: 'Applica' }).click()

    await expect(page.getByText('Codice sconto non valido')).toBeVisible()
  })

  test('should save products to wishlist', async ({ page }) => {
    await page.goto('/shop')

    // Add to wishlist
    const wishlistButton = page.getByRole('button', { name: 'Aggiungi ai Preferiti' }).first()
    await wishlistButton.click()

    await expect(page.getByText('Aggiunto ai preferiti')).toBeVisible()

    // Go to wishlist
    await page.getByRole('link', { name: 'Preferiti' }).click()
    await expect(page).toHaveURL('/wishlist')

    // Should show wishlist items
    await expect(page.getByTestId('wishlist-item')).toBeVisible()

    // Remove from wishlist
    await page.getByRole('button', { name: 'Rimuovi dai Preferiti' }).click()
    await expect(page.getByText('Rimosso dai preferiti')).toBeVisible()
  })

  test('should handle product variations', async ({ page }) => {
    await page.goto('/shop')

    // Find product with variations (size, flavor, etc.)
    await page.getByText('Cibo Secco').click()
    await page.getByRole('link').first().click()

    // Select variation
    await page.getByText('Taglia').click()
    await page.getByText('2kg').click()

    await page.getByText('Gusto').click()
    await page.getByText('Pollo').click()

    // Should update price and availability
    await expect(page.getByTestId('product-price')).toBeVisible()
    await expect(page.getByText('Disponibile')).toBeVisible()

    // Add to cart with selected variations
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).click()

    // Check cart shows correct variation
    await page.getByRole('button', { name: /carrello/i }).click()
    await expect(page.getByText('2kg')).toBeVisible()
    await expect(page.getByText('Pollo')).toBeVisible()
  })

  test('should track analytics events during shopping', async ({ page }) => {
    // Listen for gtag calls
    await page.addInitScript(() => {
      window.gtagCalls = []
      window.gtag = (...args) => {
        window.gtagCalls.push(args)
      }
    })

    await page.goto('/shop')

    // View item event
    await page.getByRole('link').first().click()

    let gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual([
      'event',
      'view_item',
      expect.objectContaining({
        currency: 'EUR',
        value: expect.any(Number),
        items: expect.any(Array)
      })
    ])

    // Add to cart event
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).click()

    gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual([
      'event',
      'add_to_cart',
      expect.objectContaining({
        currency: 'EUR',
        value: expect.any(Number),
        items: expect.any(Array)
      })
    ])

    // Begin checkout event
    await page.getByRole('button', { name: /carrello/i }).click()
    await page.getByRole('button', { name: 'Procedi al Checkout' }).click()

    gtagCalls = await page.evaluate(() => window.gtagCalls)
    expect(gtagCalls).toContainEqual([
      'event',
      'begin_checkout',
      expect.objectContaining({
        currency: 'EUR',
        value: expect.any(Number),
        items: expect.any(Array)
      })
    ])
  })

  test('should be accessible throughout shopping flow', async ({ page }) => {
    await page.goto('/shop')

    // Check skip links
    await expect(page.getByRole('link', { name: /salta al contenuto/i })).toBeVisible()

    // Check heading structure
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should focus on first product
    const firstProduct = page.getByRole('link').first()
    await expect(firstProduct).toBeFocused()

    // Navigate to product with Enter
    await page.keyboard.press('Enter')

    // Should open product details
    await expect(page).toHaveURL(/\/shop\/products\//)

    // Test add to cart with keyboard
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByText('Prodotto aggiunto al carrello')).toBeVisible()
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/shop')

    // Should show mobile-friendly layout
    await expect(page.getByText('Catalogo Prodotti')).toBeVisible()

    // Products should be in mobile grid
    const products = page.getByTestId('product-card')
    const firstProduct = products.first()
    const bbox = await firstProduct.boundingBox()
    expect(bbox?.width).toBeLessThanOrEqual(375)

    // Mobile cart should work
    await page.getByRole('button', { name: 'Aggiungi al Carrello' }).first().click()
    await page.getByRole('button', { name: /carrello/i }).click()

    // Should show mobile cart layout
    await expect(page.getByText('Il tuo carrello')).toBeVisible()

    // Mobile checkout should work
    await page.getByRole('button', { name: 'Procedi al Checkout' }).click()
    await expect(page).toHaveURL('/checkout')

    // Form should be usable on mobile
    await page.getByLabel('Via').fill('Via Roma 123')
    await expect(page.getByLabel('Via')).toHaveValue('Via Roma 123')
  })
})