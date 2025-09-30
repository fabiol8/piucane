import { Router } from 'express';
import { auth, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { db } from '../config/firebase';
import { z } from 'zod';

const router = Router();

// Apply admin role requirement to all admin routes
router.use(requireRole(['admin', 'super_admin']));

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().min(0),
  category: z.string(),
  brand: z.string(),
  tags: z.array(z.string()),
  images: z.array(z.string()),
  active: z.boolean(),
  featured: z.boolean().optional(),
  stock: z.number().min(0),
  sku: z.string(),
  weight: z.number().min(0),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number()
  }),
  dosage: z.array(z.object({
    minWeight: z.number(),
    maxWeight: z.number(),
    dailyAmount: z.number(),
    instructions: z.string()
  })),
  allergens: z.array(z.string()),
  ingredients: z.array(z.string()),
  nutritionalInfo: z.object({
    protein: z.number(),
    fat: z.number(),
    fiber: z.number(),
    moisture: z.number(),
    ash: z.number()
  }),
  servingsPerPackage: z.number().min(1),
  unit: z.string()
});

const userUpdateSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
  active: z.boolean().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }).optional()
});

// Dashboard statistics
router.get('/dashboard', auth, requireAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Get statistics in parallel
    const [
      totalUsersSnapshot,
      newUsersSnapshot,
      totalOrdersSnapshot,
      ordersInPeriodSnapshot,
      totalDogsSnapshot,
      activeSubscriptionsSnapshot,
      totalRevenueSnapshot
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('users').where('createdAt', '>=', startDate).get(),
      db.collection('orders').get(),
      db.collection('orders').where('createdAt', '>=', startDate).get(),
      db.collection('dogs').get(),
      db.collection('subscriptions').where('status', '==', 'active').get(),
      db.collection('orders')
        .where('status', 'in', ['delivered', 'confirmed'])
        .where('createdAt', '>=', startDate)
        .get()
    ]);

    // Calculate revenue
    let totalRevenue = 0;
    totalRevenueSnapshot.docs.forEach(doc => {
      const order = doc.data();
      totalRevenue += order.billing?.total || 0;
    });

    // Get top products
    const productStats: { [key: string]: { count: number; revenue: number; name: string } } = {};
    ordersInPeriodSnapshot.docs.forEach(doc => {
      const order = doc.data();
      order.items?.forEach((item: any) => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            count: 0,
            revenue: 0,
            name: item.name || 'Unknown Product'
          };
        }
        productStats[item.productId].count += item.quantity;
        productStats[item.productId].revenue += item.total || 0;
      });
    });

    const topProducts = Object.entries(productStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([id, stats]) => ({ productId: id, ...stats }));

    // Get recent activity
    const recentOrdersSnapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const recentOrders = recentOrdersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const stats = {
      users: {
        total: totalUsersSnapshot.size,
        new: newUsersSnapshot.size,
        growth: totalUsersSnapshot.size > 0 ? (newUsersSnapshot.size / totalUsersSnapshot.size) * 100 : 0
      },
      orders: {
        total: totalOrdersSnapshot.size,
        period: ordersInPeriodSnapshot.size,
        growth: totalOrdersSnapshot.size > 0 ? (ordersInPeriodSnapshot.size / totalOrdersSnapshot.size) * 100 : 0
      },
      dogs: {
        total: totalDogsSnapshot.size
      },
      subscriptions: {
        active: activeSubscriptionsSnapshot.size
      },
      revenue: {
        total: totalRevenue,
        average: ordersInPeriodSnapshot.size > 0 ? totalRevenue / ordersInPeriodSnapshot.size : 0
      },
      topProducts,
      recentOrders
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Product management
router.get('/products', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, active } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    let query = db.collection('products');

    if (category) {
      query = query.where('category', '==', category);
    }

    if (active !== undefined) {
      query = query.where('active', '==', active === 'true');
    }

    let snapshot = await query.orderBy('createdAt', 'desc').get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const total = products.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = products.slice(startIndex, startIndex + limitNum);

    res.json({
      products: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products', auth, requireAuth, validateBody(productSchema), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user!.uid
    };

    const productRef = await db.collection('products').add(productData);

    res.json({
      id: productRef.id,
      ...productData
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', auth, requireAuth, validateBody(productSchema), async (req, res) => {
  try {
    const productDoc = await db.collection('products').doc(req.params.id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user!.uid
    };

    await db.collection('products').doc(req.params.id).update(updateData);

    res.json({
      id: req.params.id,
      ...updateData
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', auth, requireAuth, async (req, res) => {
  try {
    const productDoc = await db.collection('products').doc(req.params.id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete - mark as inactive instead of deleting
    await db.collection('products').doc(req.params.id).update({
      active: false,
      deletedAt: new Date(),
      deletedBy: req.user!.uid
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// User management
router.get('/users', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, active } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    let query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role);
    }

    if (active !== undefined) {
      query = query.where('active', '==', active === 'true');
    }

    let snapshot = await query.orderBy('createdAt', 'desc').get();
    let users = snapshot.docs.map(doc => {
      const data = doc.data();
      // Remove sensitive information
      const { password, ...safeData } = data;
      return { id: doc.id, ...safeData };
    });

    // Apply search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      users = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const total = users.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedUsers = users.slice(startIndex, startIndex + limitNum);

    res.json({
      users: paginatedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id', auth, requireAuth, validateBody(userUpdateSchema), async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only super_admin can change roles
    if (req.body.role && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Insufficient permissions to change user role' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user!.uid
    };

    await db.collection('users').doc(req.params.id).update(updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Order management
router.get('/orders', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    let query = db.collection('orders');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (startDate && endDate) {
      query = query
        .where('createdAt', '>=', new Date(startDate as string))
        .where('createdAt', '<=', new Date(endDate as string));
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum)
      .get();

    const orders = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Get user info
        const userDoc = await db.collection('users').doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        return {
          id: doc.id,
          ...data,
          user: userData ? {
            id: data.userId,
            name: userData.displayName || userData.email,
            email: userData.email
          } : null
        };
      })
    );

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: orders.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.put('/orders/:id/status', auth, requireAuth, async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body;

    const orderDoc = await db.collection('orders').doc(req.params.id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
      updatedBy: req.user!.uid
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (notes) {
      updateData.adminNotes = notes;
    }

    if (status === 'processing') {
      updateData.processingStartedAt = new Date();
    } else if (status === 'shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    await db.collection('orders').doc(req.params.id).update(updateData);

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Content management
router.get('/content/:type', auth, requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['missions', 'badges', 'rewards', 'notifications'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const snapshot = await db.collection(type).orderBy('createdAt', 'desc').get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.post('/content/:type', auth, requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['missions', 'badges', 'rewards', 'notifications'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const data = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user!.uid
    };

    const ref = await db.collection(type).add(data);

    res.json({
      id: ref.id,
      ...data
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Analytics
router.get('/analytics/revenue', auth, requireAuth, async (req, res) => {
  try {
    const { period = '30d', granularity = 'day' } = req.query;

    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const ordersSnapshot = await db.collection('orders')
      .where('status', 'in', ['delivered', 'confirmed'])
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'asc')
      .get();

    // Group by period
    const revenueData: { [key: string]: number } = {};
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data();
      const date = order.createdAt.toDate();
      let key: string;

      if (granularity === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      revenueData[key] = (revenueData[key] || 0) + (order.billing?.total || 0);
    });

    const chartData = Object.entries(revenueData).map(([date, revenue]) => ({
      date,
      revenue
    }));

    res.json({ data: chartData });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

export default router;