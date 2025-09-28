import express from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = express.Router();

router.get('/inbox', authMiddleware, (req, res) => {
  res.json({ message: 'User inbox endpoint' });
});

router.post('/send', authMiddleware, requireRole(['admin', 'operator']), (req, res) => {
  res.json({ message: 'Send message endpoint' });
});

router.post('/templates', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Create message template endpoint' });
});

router.post('/campaigns', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Create campaign endpoint' });
});

export default router;