/**
 * Commerce Integration Tests
 * Comprehensive testing for commerce service functionality
 */

import request from 'supertest';
import { app } from '../../index';
import { auth, db } from '../../config/firebase';

describe('Commerce Service Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testProductId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Setup test user and authentication
    const testUser = await auth.createUser({
      email: 'test@piucane.com',
      password: 'testPassword123',
      displayName: 'Test User'
    });
    testUserId = testUser.uid;

    // Create auth token
    authToken = await auth.createCustomToken(testUserId);

    // Create test product
    const productRef = await db.collection('products').add({
      name: 'Test Product',
      brand: 'Test Brand',
      category: 'food',
      price: 29.99,
      status: 'active',
      inventory: 100,
      formats: [{
        id: 'format1',
        size: '1kg',
        price: 29.99,
        inventory: 100
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    testProductId = productRef.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await auth.deleteUser(testUserId);
    await db.collection('products').doc(testProductId).delete();
    if (testOrderId) {
      await db.collection('orders').doc(testOrderId).delete();
    }
  });

  describe('Product Management', () => {
    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/commerce/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
    });

    it('should get product by id', async () => {
      const response = await request(app)
        .get(`/api/commerce/products/${testProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product.id).toBe(testProductId);
      expect(response.body.product.name).toBe('Test Product');
    });

    it('should search products', async () => {
      const response = await request(app)
        .get('/api/commerce/products/search')
        .query({ q: 'Test', category: 'food' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should get products by category', async () => {
      const response = await request(app)
        .get('/api/commerce/products/category/food')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.products)).toBe(true);
    });
  });

  describe('Cart Management', () => {
    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/commerce/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          formatId: 'format1',
          quantity: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cart).toBeDefined();
      expect(response.body.cart.items).toHaveLength(1);
      expect(response.body.cart.items[0].quantity).toBe(2);
    });

    it('should get cart', async () => {
      const response = await request(app)
        .get('/api/commerce/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cart).toBeDefined();
      expect(response.body.cart.items).toHaveLength(1);
    });

    it('should update cart item quantity', async () => {
      const response = await request(app)
        .put(`/api/commerce/cart/items/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formatId: 'format1',
          quantity: 3
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cart.items[0].quantity).toBe(3);
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/commerce/cart/items/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ formatId: 'format1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cart.items).toHaveLength(0);
    });
  });

  describe('Order Management', () => {
    beforeEach(async () => {
      // Add item to cart for order tests
      await request(app)
        .post('/api/commerce/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          formatId: 'format1',
          quantity: 1
        });
    });

    it('should create order', async () => {
      const response = await request(app)
        .post('/api/commerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            productId: testProductId,
            formatId: 'format1',
            quantity: 1,
            price: 29.99
          }],
          shippingAddress: {
            name: 'Test User',
            street: 'Via Test 123',
            city: 'Roma',
            province: 'RM',
            postalCode: '00100',
            country: 'IT'
          },
          paymentMethodId: 'pm_test_payment_method',
          shippingMethod: 'standard'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order).toBeDefined();
      expect(response.body.order.status).toBe('confirmed');
      testOrderId = response.body.order.id;
    });

    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/commerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThan(0);
    });

    it('should get order by id', async () => {
      const response = await request(app)
        .get(`/api/commerce/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order.id).toBe(testOrderId);
    });

    it('should cancel order', async () => {
      const response = await request(app)
        .put(`/api/commerce/orders/${testOrderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order.status).toBe('cancelled');
    });
  });

  describe('Subscription Management', () => {
    let testSubscriptionId: string;

    it('should create subscription', async () => {
      const response = await request(app)
        .post('/api/commerce/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          formatId: 'format1',
          quantity: 1,
          frequency: 30,
          shippingAddress: {
            name: 'Test User',
            street: 'Via Test 123',
            city: 'Roma',
            province: 'RM',
            postalCode: '00100',
            country: 'IT'
          },
          paymentMethodId: 'pm_test_payment_method'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription).toBeDefined();
      expect(response.body.subscription.status).toBe('active');
      testSubscriptionId = response.body.subscription.id;
    });

    it('should get user subscriptions', async () => {
      const response = await request(app)
        .get('/api/commerce/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.subscriptions)).toBe(true);
      expect(response.body.subscriptions.length).toBeGreaterThan(0);
    });

    it('should update subscription', async () => {
      const response = await request(app)
        .put(`/api/commerce/subscriptions/${testSubscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 2,
          frequency: 45
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.quantity).toBe(2);
      expect(response.body.subscription.frequency).toBe(45);
    });

    it('should pause subscription', async () => {
      const response = await request(app)
        .put(`/api/commerce/subscriptions/${testSubscriptionId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.status).toBe('paused');
    });

    it('should resume subscription', async () => {
      const response = await request(app)
        .put(`/api/commerce/subscriptions/${testSubscriptionId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.status).toBe('active');
    });

    it('should cancel subscription', async () => {
      const response = await request(app)
        .put(`/api/commerce/subscriptions/${testSubscriptionId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.status).toBe('cancelled');
    });
  });

  describe('Payment Methods', () => {
    it('should add payment method', async () => {
      const response = await request(app)
        .post('/api/commerce/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_test_new_method',
          isDefault: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentMethod).toBeDefined();
    });

    it('should get payment methods', async () => {
      const response = await request(app)
        .get('/api/commerce/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.paymentMethods)).toBe(true);
    });
  });

  describe('Discount Codes', () => {
    beforeAll(async () => {
      // Create test discount code
      await db.collection('discountCodes').add({
        code: 'TEST10',
        type: 'percentage',
        value: 10,
        minimumOrder: 20,
        maxUses: 100,
        usedCount: 0,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date()
      });
    });

    it('should validate discount code', async () => {
      const response = await request(app)
        .post('/api/commerce/discount-codes/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST10',
          orderTotal: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.discount).toBeDefined();
      expect(response.body.discount.value).toBe(10);
    });

    it('should reject invalid discount code', async () => {
      const response = await request(app)
        .post('/api/commerce/discount-codes/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'INVALID',
          orderTotal: 50
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Codice sconto non valido');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/commerce/cart')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('autorizzato');
    });

    it('should handle invalid product ID', async () => {
      const response = await request(app)
        .get('/api/commerce/products/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Prodotto non trovato');
    });

    it('should handle invalid cart operations', async () => {
      const response = await request(app)
        .post('/api/commerce/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'invalid-product',
          formatId: 'invalid-format',
          quantity: 'invalid-quantity'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent cart operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/commerce/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            productId: testProductId,
            formatId: 'format1',
            quantity: 1
          })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should complete product search in reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/commerce/products/search')
        .query({ q: 'test' })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});