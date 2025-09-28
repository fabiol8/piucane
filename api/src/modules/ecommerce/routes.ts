import express from 'express';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

router.get('/products', (req, res) => {
  res.json({ message: 'Ecommerce products endpoint' });
});

router.post('/cart', authMiddleware, (req, res) => {
  res.json({ message: 'Add to cart endpoint' });
});

router.post('/checkout', authMiddleware, (req, res) => {
  res.json({ message: 'Checkout endpoint' });
});

export default router;