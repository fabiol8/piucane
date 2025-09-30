import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeFirebase } from './config/firebase';
import { initializeRedis } from './config/redis';
import { setupCronJobs } from './services/scheduler';
import { logger } from './utils/logger';

// Routes
import webhookRoutes from './routes/webhooks';
import messageRoutes from './routes/messages';
import templateRoutes from './routes/templates';
import campaignRoutes from './routes/campaigns';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
  origin: [
    'https://app.piucane.it',
    'https://admin.piucane.it',
    'https://piucane-app-staging.web.app',
    'https://piucane-admin-staging.web.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'messaging-orchestrator',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/webhooks', webhookRoutes);
app.use('/messages', messageRoutes);
app.use('/templates', templateRoutes);
app.use('/campaigns', campaignRoutes);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    // Initialize services
    await initializeFirebase();
    await initializeRedis();

    // Setup scheduled jobs
    setupCronJobs();

    app.listen(PORT, () => {
      logger.info(`Messaging orchestrator started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();