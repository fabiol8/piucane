import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';

// Product schema validation
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
  images: z.array(z.string()).min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  brand: z.string().min(1),
  tags: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
  stockQuantity: z.number().int().min(0),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0)
  }).optional(),
  targetSize: z.array(z.enum(['small', 'medium', 'large', 'giant'])),
  targetAge: z.array(z.enum(['puppy', 'adult', 'senior'])),
  ingredients: z.array(z.string()).optional(),
  nutritionalInfo: z.object({
    protein: z.number().min(0).max(100),
    fat: z.number().min(0).max(100),
    fiber: z.number().min(0).max(100),
    moisture: z.number().min(0).max(100),
    calories: z.number().min(0)
  }).optional(),
  subscription: z.object({
    enabled: z.boolean(),
    discount: z.number().min(0).max(100),
    frequencies: z.array(z.string())
  }).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      targetSize,
      targetAge,
      tags,
      search,
      sortBy = 'featured',
      page = 1,
      limit = 20
    } = req.query;

    let query = db.collection('products').where('isActive', '==', true);

    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }

    if (brand) {
      query = query.where('brand', '==', brand);
    }

    if (inStock === 'true') {
      query = query.where('inStock', '==', true);
    }

    if (targetSize) {
      query = query.where('targetSize', 'array-contains', targetSize);
    }

    if (targetAge) {
      query = query.where('targetAge', 'array-contains', targetAge);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.where('tags', 'array-contains-any', tagArray);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        query = query.orderBy('price', 'asc');
        break;
      case 'price-high':
        query = query.orderBy('price', 'desc');
        break;
      case 'rating':
        query = query.orderBy('rating', 'desc');
        break;
      case 'newest':
        query = query.orderBy('createdAt', 'desc');
        break;
      case 'featured':
      default:
        query = query.orderBy('isFeatured', 'desc').orderBy('sortOrder', 'asc');
        break;
    }

    // Apply pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    if (offset > 0) {
      // For pagination beyond first page, you'd need to implement cursor-based pagination
      // This is a simplified version
    }

    query = query.limit(limitNum);

    const snapshot = await query.get();
    let products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Apply client-side filters that can't be done in Firestore
    if (minPrice || maxPrice) {
      products = products.filter(product => {
        const price = product.discountPrice || product.price;
        return (!minPrice || price >= parseFloat(minPrice as string)) &&
               (!maxPrice || price <= parseFloat(maxPrice as string));
      });
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Get total count for pagination
    const totalQuery = db.collection('products').where('isActive', '==', true);
    const totalSnapshot = await totalQuery.get();
    const totalCount = totalSnapshot.size;

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Errore nel recuperare i prodotti' });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const productDoc = await db.collection('products').doc(id).get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const productData = productDoc.data();

    // Get reviews
    const reviewsSnapshot = await db.collection('reviews')
      .where('productId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Calculate average rating
    const rating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Get related products
    const relatedSnapshot = await db.collection('products')
      .where('category', '==', productData!.category)
      .where('isActive', '==', true)
      .limit(4)
      .get();

    const relatedProducts = relatedSnapshot.docs
      .filter(doc => doc.id !== id)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    const product = {
      id: productDoc.id,
      ...productData,
      rating,
      reviewCount: reviews.length,
      reviews,
      relatedProducts,
      createdAt: productData!.createdAt?.toDate(),
      updatedAt: productData!.updatedAt?.toDate()
    };

    res.json(product);

  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Errore nel recuperare il prodotto' });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    // Check admin permissions
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const validatedData = productSchema.parse(req.body);

    const productRef = db.collection('products').doc();
    const productData = {
      ...validatedData,
      id: productRef.id,
      rating: 0,
      reviewCount: 0,
      views: 0,
      purchases: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    await productRef.set(productData);

    logger.info('Product created', { productId: productRef.id, createdBy: userId });

    res.status(201).json({
      id: productRef.id,
      ...productData
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error creating product:', error);
    res.status(500).json({ error: 'Errore nella creazione del prodotto' });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    // Check admin permissions
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const productDoc = await db.collection('products').doc(id).get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const validatedData = productSchema.partial().parse(req.body);

    await db.collection('products').doc(id).update({
      ...validatedData,
      updatedAt: new Date(),
      updatedBy: userId
    });

    logger.info('Product updated', { productId: id, updatedBy: userId });

    res.json({ success: true, message: 'Prodotto aggiornato con successo' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error updating product:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del prodotto' });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    // Check admin permissions
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const productDoc = await db.collection('products').doc(id).get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    // Soft delete - mark as inactive
    await db.collection('products').doc(id).update({
      isActive: false,
      deletedAt: new Date(),
      deletedBy: userId
    });

    logger.info('Product deleted', { productId: id, deletedBy: userId });

    res.json({ success: true, message: 'Prodotto eliminato con successo' });

  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del prodotto' });
  }
};

export const updateStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { quantity, operation } = req.body; // operation: 'add', 'subtract', 'set'

    // Check admin permissions
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const productDoc = await db.collection('products').doc(id).get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const currentStock = productDoc.data()!.stockQuantity;
    let newStock: number;

    switch (operation) {
      case 'add':
        newStock = currentStock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, currentStock - quantity);
        break;
      case 'set':
        newStock = quantity;
        break;
      default:
        return res.status(400).json({ error: 'Operazione non valida' });
    }

    await db.collection('products').doc(id).update({
      stockQuantity: newStock,
      inStock: newStock > 0,
      updatedAt: new Date(),
      updatedBy: userId
    });

    // Log stock change
    await db.collection('stockMovements').add({
      productId: id,
      operation,
      quantity,
      previousStock: currentStock,
      newStock,
      userId,
      reason: req.body.reason || 'Manual adjustment',
      createdAt: new Date()
    });

    logger.info('Stock updated', {
      productId: id,
      operation,
      quantity,
      newStock,
      updatedBy: userId
    });

    res.json({
      success: true,
      message: 'Stock aggiornato con successo',
      newStock
    });

  } catch (error) {
    logger.error('Error updating stock:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dello stock' });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categoriesSnapshot = await db.collection('products')
      .where('isActive', '==', true)
      .get();

    const categories = new Set<string>();
    const subcategories: { [key: string]: Set<string> } = {};

    categoriesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      categories.add(data.category);

      if (!subcategories[data.category]) {
        subcategories[data.category] = new Set<string>();
      }
      subcategories[data.category].add(data.subcategory);
    });

    const result = Array.from(categories).map(category => ({
      name: category,
      subcategories: Array.from(subcategories[category] || [])
    }));

    res.json(result);

  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Errore nel recuperare le categorie' });
  }
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const brandsSnapshot = await db.collection('products')
      .where('isActive', '==', true)
      .get();

    const brands = new Set<string>();

    brandsSnapshot.docs.forEach(doc => {
      brands.add(doc.data().brand);
    });

    res.json(Array.from(brands).sort());

  } catch (error) {
    logger.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Errore nel recuperare i marchi' });
  }
};