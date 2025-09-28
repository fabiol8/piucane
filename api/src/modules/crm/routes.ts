import express from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = express.Router();

router.get('/customers', authMiddleware, requireRole(['admin', 'operator']), (req, res) => {
  res.json({ message: 'Customer list endpoint' });
});

router.get('/segments', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Customer segments endpoint' });
});

router.post('/journeys', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Create customer journey endpoint' });
});

export default router;