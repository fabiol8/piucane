import express from 'express';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

router.post('/vet-chat', authMiddleware, (req, res) => {
  res.json({ message: 'AI Vet consultation endpoint' });
});

router.post('/educator-chat', authMiddleware, (req, res) => {
  res.json({ message: 'AI Educator consultation endpoint' });
});

router.post('/groomer-chat', authMiddleware, (req, res) => {
  res.json({ message: 'AI Groomer consultation endpoint' });
});

router.post('/generate-mission', authMiddleware, (req, res) => {
  res.json({ message: 'Generate smart mission endpoint' });
});

export default router;