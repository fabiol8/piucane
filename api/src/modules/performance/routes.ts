/**
 * Performance Monitoring Routes
 * RESTful API endpoints for performance monitoring and optimization
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  getCurrentMetrics,
  getPerformanceHistory,
  getOptimizations,
  getActiveAlerts,
  configureAlerts,
  getSystemHealth,
  getPerformanceReport,
  resolveAlert
} from './controller';

const router = Router();

// Real-time metrics
router.get('/metrics/current', authMiddleware, getCurrentMetrics);
router.get('/metrics/history', authMiddleware, getPerformanceHistory);

// System health
router.get('/health', authMiddleware, getSystemHealth);

// Optimization recommendations
router.post('/optimizations', authMiddleware, getOptimizations);

// Alerts management
router.get('/alerts', authMiddleware, getActiveAlerts);
router.post('/alerts/configure', authMiddleware, configureAlerts);
router.put('/alerts/:alertId/resolve', authMiddleware, resolveAlert);

// Reporting
router.get('/reports', authMiddleware, getPerformanceReport);

export default router;