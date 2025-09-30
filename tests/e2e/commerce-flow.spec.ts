/**
 * Commerce Flow E2E Tests
 * End-to-end testing for complete commerce user journey
 */

import { test, expect } from '@playwright/test';

test.describe('Commerce Flow E2E Tests', () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeAll(async () => {
    // Generate unique test user credentials
    const timestamp = Date.now();
    userEmail = `test-user-${timestamp}@piucane.com`;
    userPassword = 'TestPassword123!';
  });

  test.beforeEach(async ({ page }) => {
    // Start each test from the homepage
    await page.goto('/');

    // Wait for initial page load
    await page.waitForLoadState('networkidle');
  });

  test.describe('User Registration and Authentication', () => {
    test('should complete user registration flow', async ({ page }) => {
      // Click register button
      await page.click('text=Registrati');

      // Fill registration form
      await page.fill('[data-testid="email-input"]', userEmail);
      await page.fill('[data-testid="password-input"]', userPassword);
      await page.fill('[data-testid="confirm-password-input"]', userPassword);
      await page.fill('[data-testid="name-input"]', 'Test User');

      // Accept terms and conditions
      await page.check('[data-testid="terms-checkbox"]');

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Verify successful registration
      await expect(page).toHaveURL('/onboarding');
      await expect(page.locator('text=Benvenuto in PiùCane!')).toBeVisible();
    });

    test('should complete onboarding flow', async ({ page }) => {
      // Login with test user
      await loginTestUser(page, userEmail, userPassword);

      // Navigate to onboarding if not already there
      if (!page.url().includes('/onboarding')) {
        await page.goto('/onboarding');
      }

      // Step 1: Welcome
      await expect(page.locator('text=Iniziamo!')).toBeVisible();
      await page.click('[data-testid="onboarding-next"]');

      // Step 2: User Information
      await page.fill('[data-testid="phone-input"]', '+39 333 1234567');
      await page.selectOption('[data-testid="province-select"]', 'RM');
      await page.click('[data-testid="onboarding-next"]');

      // Step 3: Dog Profile
      await page.fill('[data-testid="dog-name-input"]', 'Buddy');
      await page.selectOption('[data-testid="dog-breed-select"]', 'Labrador Retriever');
      await page.fill('[data-testid="dog-age-input"]', '3');
      await page.fill('[data-testid="dog-weight-input"]', '30');
      await page.click('[data-testid="dog-gender-male"]');
      await page.click('[data-testid="onboarding-next"]');

      // Step 4: Health Information
      await page.click('[data-testid="health-excellent"]');
      await page.click('[data-testid="onboarding-next"]');

      // Step 5: Completion
      await page.click('[data-testid="complete-onboarding"]');

      // Verify onboarding completion
      await expect(page).toHaveURL('/dogs');
      await expect(page.locator('text=Buddy')).toBeVisible();
    });
  });

  test.describe('Product Discovery and Shopping', () => {
    test.beforeEach(async ({ page }) => {
      await loginTestUser(page, userEmail, userPassword);
    });

    test('should browse and search products', async ({ page }) => {
      // Navigate to shop
      await page.click('[data-testid="nav-shop"]');
      await expect(page).toHaveURL('/shop');

      // Verify products are displayed
      await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();

      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'cibo');
      await page.press('[data-testid="search-input"]', 'Enter');

      // Wait for search results
      await page.waitForLoadState('networkidle');

      // Verify search results
      const productCards = page.locator('[data-testid="product-card"]');
      await expect(productCards).toHaveCount.greaterThan(0);

      // Test category filter
      await page.click('[data-testid="category-food"]');
      await page.waitForLoadState('networkidle');

      // Verify filtered results
      await expect(page.locator('text=Risultati per categoria: Cibo')).toBeVisible();
    });

    test('should view product details', async ({ page }) => {
      await page.goto('/shop');

      // Click on first product
      await page.click('[data-testid="product-card"]');

      // Verify product detail page
      await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-to-cart-button"]')).toBeVisible();

      // Test format selection
      const formatSelector = page.locator('[data-testid="format-selector"]');
      if (await formatSelector.isVisible()) {
        await formatSelector.selectOption({ index: 1 });
        // Verify price updates
        await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
      }
    });

    test('should add products to cart', async ({ page }) => {
      await page.goto('/shop');

      // Add first product to cart
      await page.click('[data-testid="product-card"] [data-testid="add-to-cart"]');

      // Verify cart notification
      await expect(page.locator('text=Prodotto aggiunto al carrello')).toBeVisible();

      // Verify cart badge updates
      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');

      // Add another product
      const productCards = page.locator('[data-testid="product-card"]');
      await productCards.nth(1).locator('[data-testid="add-to-cart"]').click();

      // Verify cart count
      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('2');
    });

    test('should manage cart items', async ({ page }) => {
      // Add products to cart first
      await page.goto('/shop');
      await page.click('[data-testid="product-card"] [data-testid="add-to-cart"]');

      // Navigate to cart
      await page.click('[data-testid="cart-icon"]');
      await expect(page).toHaveURL('/cart');

      // Verify cart items
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);

      // Update quantity
      await page.click('[data-testid="quantity-increase"]');
      await expect(page.locator('[data-testid="item-quantity"]')).toHaveValue('2');

      // Verify total updates
      await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();

      // Remove item
      await page.click('[data-testid="remove-item"]');
      await expect(page.locator('text=Il tuo carrello è vuoto')).toBeVisible();
    });
  });

  test.describe('Checkout Process', () => {
    test.beforeEach(async ({ page }) => {
      await loginTestUser(page, userEmail, userPassword);

      // Add product to cart
      await page.goto('/shop');
      await page.click('[data-testid="product-card"] [data-testid="add-to-cart"]');
    });

    test('should complete checkout process', async ({ page }) => {
      // Navigate to cart and start checkout
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="checkout-button"]');

      // Verify checkout page
      await expect(page).toHaveURL('/checkout');

      // Step 1: Shipping Information
      await page.fill('[data-testid="shipping-name"]', 'Test User');
      await page.fill('[data-testid="shipping-street"]', 'Via Test 123');
      await page.fill('[data-testid="shipping-city"]', 'Roma');
      await page.selectOption('[data-testid="shipping-province"]', 'RM');
      await page.fill('[data-testid="shipping-postal-code"]', '00100');
      await page.click('[data-testid="shipping-next"]');

      // Step 2: Shipping Method
      await page.click('[data-testid="shipping-method-standard"]');
      await page.click('[data-testid="shipping-method-next"]');

      // Step 3: Payment Method
      await page.click('[data-testid="add-payment-method"]');

      // Fill payment details (test card)
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.fill('[data-testid="card-name"]', 'Test User');
      await page.click('[data-testid="save-payment-method"]');

      // Continue to review
      await page.click('[data-testid="payment-next"]');

      // Step 4: Order Review
      await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();

      // Place order
      await page.click('[data-testid="place-order"]');

      // Verify order confirmation
      await expect(page).toHaveURL(/\/orders\/.*\/success/);
      await expect(page.locator('text=Ordine confermato!')).toBeVisible();
      await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
    });

    test('should handle payment failures gracefully', async ({ page }) => {
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="checkout-button"]');

      // Fill shipping info quickly
      await fillShippingInfo(page);
      await page.click('[data-testid="shipping-next"]');

      // Select shipping method
      await page.click('[data-testid="shipping-method-standard"]');
      await page.click('[data-testid="shipping-method-next"]');

      // Use declining test card
      await page.click('[data-testid="add-payment-method"]');
      await page.fill('[data-testid="card-number"]', '4000000000000002'); // Declining card
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.fill('[data-testid="card-name"]', 'Test User');
      await page.click('[data-testid="save-payment-method"]');

      await page.click('[data-testid="payment-next"]');
      await page.click('[data-testid="place-order"]');

      // Verify error handling
      await expect(page.locator('text=Pagamento rifiutato')).toBeVisible();
      await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
    });
  });

  test.describe('Subscription Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginTestUser(page, userEmail, userPassword);
    });

    test('should create and manage subscription', async ({ page }) => {
      // Navigate to product detail
      await page.goto('/shop');
      await page.click('[data-testid="product-card"]');

      // Create subscription
      await page.click('[data-testid="subscribe-button"]');

      // Configure subscription
      await page.selectOption('[data-testid="subscription-frequency"]', '30');
      await page.click('[data-testid="subscription-discount-apply"]');

      // Add to cart as subscription
      await page.click('[data-testid="add-subscription-to-cart"]');

      // Complete checkout with subscription
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="checkout-button"]');

      // Fill checkout details (abbreviated for subscription test)
      await fillShippingInfo(page);
      await completeCheckout(page);

      // Navigate to subscriptions
      await page.goto('/subscriptions');

      // Verify subscription created
      await expect(page.locator('[data-testid="subscription-card"]')).toBeVisible();

      // Test subscription management
      await page.click('[data-testid="manage-subscription"]');

      // Pause subscription
      await page.click('[data-testid="pause-subscription"]');
      await expect(page.locator('text=Abbonamento in pausa')).toBeVisible();

      // Resume subscription
      await page.click('[data-testid="resume-subscription"]');
      await expect(page.locator('text=Abbonamento attivo')).toBeVisible();
    });
  });

  test.describe('AI Recommendations', () => {
    test.beforeEach(async ({ page }) => {
      await loginTestUser(page, userEmail, userPassword);
    });

    test('should display personalized recommendations', async ({ page }) => {
      await page.goto('/shop');

      // Verify recommendations section
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible();
      await expect(page.locator('text=Consigliati per te')).toBeVisible();

      // Verify recommendations are personalized
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount.greaterThan(0);

      // Test recommendation interaction
      await page.click('[data-testid="recommendation-card"]');

      // Verify product detail shows recommendation context
      await expect(page.locator('text=Consigliato per il tuo cane')).toBeVisible();
    });

    test('should provide feedback on recommendations', async ({ page }) => {
      await page.goto('/shop');

      // Interact with recommendation
      await page.click('[data-testid="recommendation-like"]');

      // Verify feedback is recorded
      await expect(page.locator('text=Grazie per il feedback!')).toBeVisible();

      // Test dislike feedback
      const recommendationCards = page.locator('[data-testid="recommendation-card"]');
      await recommendationCards.nth(1).locator('[data-testid="recommendation-dislike"]').click();

      // Verify recommendation is hidden
      await expect(page.locator('text=Nasconderemo consigli simili')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone size

    test('should work correctly on mobile devices', async ({ page }) => {
      await loginTestUser(page, userEmail, userPassword);

      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // Test mobile shop interface
      await page.click('[data-testid="mobile-nav-shop"]');
      await expect(page).toHaveURL('/shop');

      // Verify mobile product grid
      await expect(page.locator('[data-testid="product-grid"]')).toHaveClass(/grid-cols-2/);

      // Test mobile cart
      await page.click('[data-testid="product-card"] [data-testid="add-to-cart"]');
      await page.click('[data-testid="mobile-cart-icon"]');

      // Verify mobile cart interface
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible via keyboard navigation', async ({ page }) => {
      await page.goto('/shop');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="category-filter"]')).toBeFocused();

      // Test product navigation
      let tabCount = 0;
      while (tabCount < 10) {
        await page.keyboard.press('Tab');
        tabCount++;

        const focusedElement = page.locator(':focus');
        if (await focusedElement.getAttribute('data-testid') === 'product-card') {
          break;
        }
      }

      // Test product selection via keyboard
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/shop\/products\/.*/);
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/shop');

      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="cart-icon"]')).toHaveAttribute('aria-label');

      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="product-card"] h3')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      // Test homepage load time
      const homeStartTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const homeLoadTime = Date.now() - homeStartTime;
      expect(homeLoadTime).toBeLessThan(3000); // 3 seconds

      // Test shop page load time
      const shopStartTime = Date.now();
      await page.goto('/shop');
      await page.waitForLoadState('networkidle');
      const shopLoadTime = Date.now() - shopStartTime;
      expect(shopLoadTime).toBeLessThan(5000); // 5 seconds
    });

    test('should handle large product catalogs efficiently', async ({ page }) => {
      await page.goto('/shop');

      // Load many products via infinite scroll
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
      }

      // Verify products are still responsive
      await page.click('[data-testid="product-card"]');
      await expect(page).toHaveURL(/\/shop\/products\/.*/);
    });
  });

  // Helper functions
  async function loginTestUser(page: any, email: string, password: string) {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dogs');
  }

  async function fillShippingInfo(page: any) {
    await page.fill('[data-testid="shipping-name"]', 'Test User');
    await page.fill('[data-testid="shipping-street"]', 'Via Test 123');
    await page.fill('[data-testid="shipping-city"]', 'Roma');
    await page.selectOption('[data-testid="shipping-province"]', 'RM');
    await page.fill('[data-testid="shipping-postal-code"]', '00100');
  }

  async function completeCheckout(page: any) {
    await page.click('[data-testid="shipping-next"]');
    await page.click('[data-testid="shipping-method-standard"]');
    await page.click('[data-testid="shipping-method-next"]');

    // Add payment method if not exists
    if (await page.locator('[data-testid="add-payment-method"]').isVisible()) {
      await page.click('[data-testid="add-payment-method"]');
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.fill('[data-testid="card-name"]', 'Test User');
      await page.click('[data-testid="save-payment-method"]');
    }

    await page.click('[data-testid="payment-next"]');
    await page.click('[data-testid="place-order"]');
  }
});