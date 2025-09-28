import express from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = express.Router();

router.get('/stock', authMiddleware, requireRole(['admin', 'warehouse']), (req, res) => {
  res.json({ message: 'Stock levels endpoint' });
});

router.post('/reservations', authMiddleware, requireRole(['admin', 'warehouse']), (req, res) => {
  res.json({ message: 'Create stock reservation endpoint' });
});

router.get('/lots', authMiddleware, requireRole(['admin', 'warehouse']), (req, res) => {
  res.json({ message: 'Product lots (FEFO) endpoint' });
});

router.post('/pick-pack', authMiddleware, requireRole(['warehouse']), (req, res) => {
  res.json({ message: 'Pick and pack orders endpoint' });
});

export default router;