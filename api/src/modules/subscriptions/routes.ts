import express from 'express';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'User subscriptions endpoint' });
});

router.post('/', authMiddleware, (req, res) => {
  res.json({ message: 'Create subscription endpoint' });
});

router.put('/:id/date', authMiddleware, (req, res) => {
  res.json({ message: 'Change subscription date endpoint' });
});

export default router;