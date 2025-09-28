import express from 'express';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

router.get('/dogs', authMiddleware, (req, res) => {
  res.json({ message: 'User dogs endpoint' });
});

router.post('/dogs', authMiddleware, (req, res) => {
  res.json({ message: 'Create dog profile endpoint' });
});

router.post('/dogs/:id/health-record', authMiddleware, (req, res) => {
  res.json({ message: 'Add health record endpoint' });
});

router.get('/reminders', authMiddleware, (req, res) => {
  res.json({ message: 'Health reminders endpoint' });
});

export default router;