import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Routes
import authRoutes from './modules/auth/routes';
import petsRoutes from './routes/pets';
import commerceRoutes from './routes/commerce';
import ecommerceRoutes from './modules/ecommerce/routes';
import subscriptionsRoutes from './modules/subscriptions/routes';
import crmRoutes from './modules/crm/routes';
import healthRoutes from './modules/health/routes';
import aiRoutes from './modules/ai/routes';
import messagingRoutes from './modules/messaging/routes';
import warehouseRoutes from './modules/warehouse/routes';
import paymentsRoutes from './modules/payments/routes';
import recommendationsRoutes from './modules/ai-recommendations/routes';
import analyticsRoutes from './modules/analytics/routes';
import performanceRoutes from './modules/performance/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Firebase Admin
initializeFirebase();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/commerce', commerceRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/performance', performanceRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`PiuCane API server running on port ${PORT}`);
  });
}

export default app;
