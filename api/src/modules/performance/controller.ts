/**
 * Performance Monitoring Controller
 * Real-time performance tracking and optimization
 */

import { Request, Response } from 'express';
import { auth, db } from '../../config/firebase';
import {
  PerformanceMetricsSchema,
  AlertConfigurationSchema,
  OptimizationRequestSchema,
  PerformanceMetrics,
  PerformanceAlert,
  OptimizationRecommendation,
  AlertSeverity,
  AlertType,
  OptimizationCategory,
  OptimizationPriority,
  MetricStatus,
  TrendDirection,
  PerformanceError,
  MetricsCollectionError,
  AlertingError
} from './types';
import { trackAnalyticsEvent } from '../../utils/analytics';
import { logger } from '../../utils/logger';
import os from 'os';
import process from 'process';

/**
 * Get current performance metrics
 */
export const getCurrentMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await collectCurrentMetrics();

    // Store metrics for historical tracking
    await storeMetrics(metrics);

    // Check for alerts
    const alerts = await checkAlerts(metrics);

    res.json({
      success: true,
      metrics,
      alerts: alerts.filter(alert => !alert.resolved),
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting current metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle metriche'
    });
  }
};

/**
 * Get performance history
 */
export const getPerformanceHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, granularity = 'hour' } = req.query;

    const history = await getMetricsHistory({
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as string
    });

    const trends = analyzeTrends(history);

    res.json({
      success: true,
      history,
      trends,
      summary: generateHistorySummary(history)
    });
  } catch (error) {
    logger.error('Error getting performance history', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dello storico performance'
    });
  }
};

/**
 * Get optimization recommendations
 */
export const getOptimizations = async (req: Request, res: Response) => {
  try {
    const validatedRequest = OptimizationRequestSchema.parse(req.body);

    const recommendations = await generateOptimizationRecommendations(validatedRequest);

    await trackAnalyticsEvent('optimization_recommendations_generated', {
      category: validatedRequest.category,
      recommendation_count: recommendations.length,
      timeframe_days: Math.ceil(
        (validatedRequest.timeframe.end.getTime() - validatedRequest.timeframe.start.getTime()) /
        (1000 * 60 * 60 * 24)
      )
    });

    res.json({
      success: true,
      recommendations,
      metadata: {
        generatedAt: new Date(),
        timeframe: validatedRequest.timeframe,
        category: validatedRequest.category
      }
    });
  } catch (error) {
    logger.error('Error generating optimizations', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nella generazione delle ottimizzazioni'
    });
  }
};

/**
 * Get active alerts
 */
export const getActiveAlerts = async (req: Request, res: Response) => {
  try {
    const alertsQuery = await db.collection('performanceAlerts')
      .where('resolved', '==', false)
      .orderBy('triggered', 'desc')
      .limit(50)
      .get();

    const alerts = alertsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        warning: alerts.filter(a => a.severity === AlertSeverity.WARNING).length
      }
    });
  } catch (error) {
    logger.error('Error getting active alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero degli alert'
    });
  }
};

/**
 * Configure alert thresholds
 */
export const configureAlerts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non autorizzato' });
    }

    const { alerts } = req.body;

    for (const alertConfig of alerts) {
      const validatedConfig = AlertConfigurationSchema.parse(alertConfig);

      await db.collection('alertConfigurations').doc(validatedConfig.metric).set({
        ...validatedConfig,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await trackAnalyticsEvent('alert_configuration_updated', {
      user_id: userId,
      alerts_configured: alerts.length
    });

    res.json({
      success: true,
      message: 'Configurazione alert aggiornata con successo'
    });
  } catch (error) {
    logger.error('Error configuring alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nella configurazione degli alert'
    });
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const health = await assessSystemHealth();

    res.json({
      success: true,
      health,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting system health', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nel controllo della salute del sistema'
    });
  }
};

/**
 * Get performance report
 */
export const getPerformanceReport = async (req: Request, res: Response) => {
  try {
    const { type = 'daily', startDate, endDate } = req.query;

    const report = await generatePerformanceReport({
      type: type as string,
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date()
    });

    res.json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Error generating performance report', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nella generazione del report'
    });
  }
};

/**
 * Resolve alert
 */
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolution } = req.body;
    const userId = req.user?.uid;

    await db.collection('performanceAlerts').doc(alertId).update({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution: resolution || 'Manually resolved'
    });

    await trackAnalyticsEvent('alert_resolved', {
      user_id: userId,
      alert_id: alertId
    });

    res.json({
      success: true,
      message: 'Alert risolto con successo'
    });
  } catch (error) {
    logger.error('Error resolving alert', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nella risoluzione dell\'alert'
    });
  }
};

// Helper functions

/**
 * Collect current system and application metrics
 */
async function collectCurrentMetrics(): Promise<PerformanceMetrics> {
  try {
    const systemMetrics = collectSystemMetrics();
    const applicationMetrics = await collectApplicationMetrics();
    const databaseMetrics = await collectDatabaseMetrics();
    const apiMetrics = await collectApiMetrics();
    const userMetrics = await collectUserExperienceMetrics();
    const businessMetrics = await collectBusinessMetrics();

    return {
      timestamp: new Date(),
      system: systemMetrics,
      application: applicationMetrics,
      database: databaseMetrics,
      api: apiMetrics,
      user: userMetrics,
      business: businessMetrics
    };
  } catch (error) {
    logger.error('Error collecting metrics', { error });
    throw new MetricsCollectionError('Errore nella raccolta delle metriche');
  }
}

/**
 * Collect system-level metrics
 */
function collectSystemMetrics(): any {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpu: {
      usage: calculateCpuUsage(),
      cores: cpus.length,
      frequency: cpus[0]?.speed || 0,
      processes: 1, // Simplified
      threads: 1
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      buffers: 0,
      cached: 0,
      swapTotal: 0,
      swapUsed: 0
    },
    disk: {
      total: 0,
      used: 0,
      free: 0,
      readOps: 0,
      writeOps: 0,
      readBytes: 0,
      writeBytes: 0
    },
    network: {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
      errors: 0,
      dropped: 0
    },
    uptime: os.uptime(),
    loadAverage: os.loadavg()
  };
}

/**
 * Calculate CPU usage
 */
function calculateCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);

  return Math.max(0, Math.min(100, usage));
}

/**
 * Collect application-level metrics
 */
async function collectApplicationMetrics(): Promise<any> {
  const memUsage = process.memoryUsage();

  return {
    responseTime: await calculateAverageResponseTime(),
    throughput: await calculateThroughput(),
    errorRate: await calculateErrorRate(),
    activeConnections: 0, // Would need to track this
    queueLength: 0, // Would need to track this
    gcMetrics: {
      collections: 0,
      timeSpent: 0,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    }
  };
}

/**
 * Collect database metrics
 */
async function collectDatabaseMetrics(): Promise<any> {
  return {
    connectionPool: {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxConnections: 100,
      averageWaitTime: 0
    },
    queryPerformance: {
      slowQueries: [],
      averageQueryTime: 0,
      queriesPerSecond: 0,
      cacheHitRate: 0.95,
      lockContention: 0
    },
    transactionMetrics: {
      totalTransactions: 0,
      committedTransactions: 0,
      abortedTransactions: 0,
      averageTransactionTime: 0,
      deadlocks: 0
    },
    indexEfficiency: {
      totalIndexes: 0,
      unusedIndexes: [],
      duplicateIndexes: [],
      indexHitRate: 0.95,
      indexScanRatio: 0.1
    }
  };
}

/**
 * Collect API metrics
 */
async function collectApiMetrics(): Promise<any> {
  return {
    endpoints: [],
    totalRequests: 0,
    averageResponseTime: 0,
    errorsByCode: {},
    rateLimitHits: 0
  };
}

/**
 * Collect user experience metrics
 */
async function collectUserExperienceMetrics(): Promise<any> {
  return {
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    timeToInteractive: 0,
    bounce: { rate: 0, duration: [] }
  };
}

/**
 * Collect business metrics
 */
async function collectBusinessMetrics(): Promise<any> {
  return {
    conversion: {
      rate: 0,
      funnel: [],
      dropoffPoints: [],
      attribution: []
    },
    revenue: {
      total: 0,
      growth: 0,
      perUser: 0,
      perSession: 0,
      byChannel: {},
      byProduct: {}
    },
    engagement: {
      sessionDuration: 0,
      pageViews: 0,
      interactions: 0,
      returnRate: 0,
      stickiness: 0
    },
    satisfaction: {
      nps: 0,
      csat: 0,
      ces: 0,
      reviews: {
        averageRating: 0,
        totalReviews: 0,
        distribution: {},
        sentiment: {
          positive: 0,
          neutral: 0,
          negative: 0,
          score: 0
        }
      },
      complaints: {
        total: 0,
        resolved: 0,
        averageResolutionTime: 0,
        categories: {}
      }
    }
  };
}

/**
 * Calculate average response time
 */
async function calculateAverageResponseTime(): Promise<number> {
  // This would typically be tracked in middleware
  return 150; // placeholder
}

/**
 * Calculate throughput
 */
async function calculateThroughput(): Promise<number> {
  // This would typically be tracked in middleware
  return 100; // placeholder
}

/**
 * Calculate error rate
 */
async function calculateErrorRate(): Promise<number> {
  // This would typically be tracked in middleware
  return 0.5; // placeholder
}

/**
 * Store metrics for historical tracking
 */
async function storeMetrics(metrics: PerformanceMetrics): Promise<void> {
  try {
    await db.collection('performanceMetrics').add(metrics);
  } catch (error) {
    logger.error('Error storing metrics', { error });
  }
}

/**
 * Check metrics against alert thresholds
 */
async function checkAlerts(metrics: PerformanceMetrics): Promise<PerformanceAlert[]> {
  const alerts: PerformanceAlert[] = [];

  try {
    const alertConfigs = await db.collection('alertConfigurations').get();

    for (const configDoc of alertConfigs.docs) {
      const config = configDoc.data();
      const alert = evaluateAlert(config, metrics);
      if (alert) {
        alerts.push(alert);
        await storeAlert(alert);
      }
    }
  } catch (error) {
    logger.error('Error checking alerts', { error });
  }

  return alerts;
}

/**
 * Evaluate individual alert
 */
function evaluateAlert(config: any, metrics: PerformanceMetrics): PerformanceAlert | null {
  // Extract metric value from nested metrics object
  const metricValue = getMetricValue(metrics, config.metric);
  if (metricValue === null) return null;

  const thresholdExceeded = evaluateCondition(metricValue, config.condition, config.threshold);

  if (thresholdExceeded) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: AlertType.THRESHOLD,
      severity: config.severity,
      title: `${config.metric} threshold exceeded`,
      description: `${config.metric} value ${metricValue} ${config.condition} ${config.threshold}`,
      metric: config.metric,
      threshold: config.threshold,
      currentValue: metricValue,
      triggered: new Date(),
      actions: [],
      metadata: { config }
    };
  }

  return null;
}

/**
 * Get metric value from nested metrics object
 */
function getMetricValue(metrics: PerformanceMetrics, metricPath: string): number | null {
  const parts = metricPath.split('.');
  let value: any = metrics;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return null;
  }

  return typeof value === 'number' ? value : null;
}

/**
 * Evaluate condition
 */
function evaluateCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
    default: return false;
  }
}

/**
 * Store alert
 */
async function storeAlert(alert: PerformanceAlert): Promise<void> {
  try {
    await db.collection('performanceAlerts').doc(alert.id).set(alert);

    // Track alert in analytics
    await trackAnalyticsEvent('performance_alert_triggered', {
      alert_id: alert.id,
      severity: alert.severity,
      metric: alert.metric,
      current_value: alert.currentValue,
      threshold: alert.threshold
    });
  } catch (error) {
    logger.error('Error storing alert', { error });
  }
}

/**
 * Get metrics history
 */
async function getMetricsHistory(params: {
  startDate: Date;
  endDate: Date;
  granularity: string;
}): Promise<any[]> {
  try {
    const query = db.collection('performanceMetrics')
      .where('timestamp', '>=', params.startDate)
      .where('timestamp', '<=', params.endDate)
      .orderBy('timestamp', 'asc');

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    logger.error('Error getting metrics history', { error });
    return [];
  }
}

/**
 * Analyze trends in performance metrics
 */
function analyzeTrends(history: any[]): any[] {
  if (history.length < 2) return [];

  const trends = [];
  const metrics = ['system.cpu.usage', 'system.memory.used', 'application.responseTime'];

  for (const metric of metrics) {
    const values = history.map(h => getMetricValue(h, metric)).filter(v => v !== null);
    if (values.length < 2) continue;

    const trend = calculateTrend(values);
    trends.push({
      metric,
      direction: trend.direction,
      magnitude: trend.magnitude,
      significance: trend.significance
    });
  }

  return trends;
}

/**
 * Calculate trend for a series of values
 */
function calculateTrend(values: number[]): any {
  const n = values.length;
  if (n < 2) return { direction: TrendDirection.STABLE, magnitude: 0, significance: 0 };

  // Simple linear regression
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgY = sumY / n;

  const direction = slope > 0.1 ? TrendDirection.IMPROVING :
                   slope < -0.1 ? TrendDirection.DEGRADING :
                   TrendDirection.STABLE;

  const magnitude = Math.abs(slope) / avgY;

  // Calculate R-squared for significance
  const intercept = (sumY - slope * sumX) / n;
  const predicted = x.map(xi => slope * xi + intercept);
  const totalSumSquares = values.reduce((acc, yi) => acc + Math.pow(yi - avgY, 2), 0);
  const residualSumSquares = values.reduce((acc, yi, i) => acc + Math.pow(yi - predicted[i], 2), 0);
  const rSquared = 1 - (residualSumSquares / totalSumSquares);

  return {
    direction,
    magnitude,
    significance: Math.max(0, rSquared)
  };
}

/**
 * Generate history summary
 */
function generateHistorySummary(history: any[]): any {
  if (history.length === 0) return {};

  const latest = history[history.length - 1];
  const earliest = history[0];

  return {
    timeRange: {
      start: earliest.timestamp,
      end: latest.timestamp,
      duration: latest.timestamp - earliest.timestamp
    },
    dataPoints: history.length,
    keyMetrics: {
      avgCpuUsage: calculateAverage(history, 'system.cpu.usage'),
      avgMemoryUsage: calculateAverage(history, 'system.memory.used'),
      avgResponseTime: calculateAverage(history, 'application.responseTime')
    }
  };
}

/**
 * Calculate average for a metric across history
 */
function calculateAverage(history: any[], metricPath: string): number {
  const values = history.map(h => getMetricValue(h, metricPath)).filter(v => v !== null);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/**
 * Generate optimization recommendations
 */
async function generateOptimizationRecommendations(request: any): Promise<OptimizationRecommendation[]> {
  const recommendations: OptimizationRecommendation[] = [];

  // Get recent metrics for analysis
  const recentMetrics = await getMetricsHistory({
    startDate: request.timeframe.start,
    endDate: request.timeframe.end,
    granularity: 'hour'
  });

  // Analyze CPU usage
  const avgCpuUsage = calculateAverage(recentMetrics, 'system.cpu.usage');
  if (avgCpuUsage > 80) {
    recommendations.push({
      id: `opt_cpu_${Date.now()}`,
      category: OptimizationCategory.PERFORMANCE,
      priority: OptimizationPriority.HIGH,
      title: 'High CPU Usage Detected',
      description: `Average CPU usage is ${avgCpuUsage.toFixed(1)}%. Consider optimizing CPU-intensive operations.`,
      impact: {
        performance: 0.8,
        cost: 0.6,
        userExperience: 0.7,
        reliability: 0.6,
        confidence: 0.85
      },
      effort: {
        development: 5,
        testing: 3,
        deployment: 2,
        total: 10,
        complexity: 'medium' as any
      },
      implementation: {
        steps: [
          {
            order: 1,
            description: 'Profile application to identify CPU bottlenecks',
            duration: 4,
            dependencies: [],
            validation: 'CPU profiling reports show hotspots'
          },
          {
            order: 2,
            description: 'Optimize identified bottlenecks',
            duration: 8,
            dependencies: ['step_1'],
            validation: 'CPU usage reduced by at least 20%'
          }
        ],
        requirements: ['Profiling tools', 'Development environment'],
        risks: [
          {
            description: 'Performance regression in optimization attempt',
            probability: 0.2,
            impact: 0.6,
            mitigation: 'Thorough testing and gradual rollout'
          }
        ],
        rollbackPlan: 'Revert to previous version via deployment pipeline'
      },
      monitoring: {
        metrics: ['system.cpu.usage', 'application.responseTime'],
        alerts: [
          {
            metric: 'system.cpu.usage',
            threshold: 75,
            condition: '>',
            severity: AlertSeverity.WARNING,
            recipients: ['ops@piucane.com']
          }
        ],
        dashboards: ['system_performance'],
        reportingFrequency: 'daily'
      },
      createdAt: new Date()
    });
  }

  return recommendations;
}

/**
 * Assess overall system health
 */
async function assessSystemHealth(): Promise<any> {
  const currentMetrics = await collectCurrentMetrics();

  const cpuScore = calculateHealthScore(currentMetrics.system.cpu.usage, [0, 50, 80, 95]);
  const memoryScore = calculateHealthScore(
    (currentMetrics.system.memory.used / currentMetrics.system.memory.total) * 100,
    [0, 60, 85, 95]
  );
  const responseTimeScore = calculateHealthScore(currentMetrics.application.responseTime, [0, 200, 1000, 3000]);

  const overallScore = (cpuScore + memoryScore + responseTimeScore) / 3;

  return {
    overall: overallScore,
    status: getHealthStatus(overallScore),
    categories: {
      cpu: cpuScore,
      memory: memoryScore,
      responseTime: responseTimeScore
    },
    details: {
      cpu: {
        current: currentMetrics.system.cpu.usage,
        status: getMetricStatus(cpuScore)
      },
      memory: {
        current: (currentMetrics.system.memory.used / currentMetrics.system.memory.total) * 100,
        status: getMetricStatus(memoryScore)
      },
      responseTime: {
        current: currentMetrics.application.responseTime,
        status: getMetricStatus(responseTimeScore)
      }
    }
  };
}

/**
 * Calculate health score based on value and thresholds
 */
function calculateHealthScore(value: number, thresholds: number[]): number {
  const [excellent, good, warning] = thresholds;

  if (value <= excellent) return 100;
  if (value <= good) return 80;
  if (value <= warning) return 60;
  return 30;
}

/**
 * Get health status from score
 */
function getHealthStatus(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

/**
 * Get metric status from score
 */
function getMetricStatus(score: number): MetricStatus {
  if (score >= 90) return MetricStatus.EXCELLENT;
  if (score >= 70) return MetricStatus.GOOD;
  if (score >= 50) return MetricStatus.WARNING;
  return MetricStatus.CRITICAL;
}

/**
 * Generate performance report
 */
async function generatePerformanceReport(params: {
  type: string;
  startDate: Date;
  endDate: Date;
}): Promise<any> {
  const history = await getMetricsHistory(params);
  const trends = analyzeTrends(history);
  const summary = generateHistorySummary(history);

  return {
    id: `report_${Date.now()}`,
    type: params.type,
    period: {
      start: params.startDate,
      end: params.endDate,
      duration: params.endDate.getTime() - params.startDate.getTime()
    },
    summary,
    trends,
    recommendations: await generateOptimizationRecommendations({
      timeframe: { start: params.startDate, end: params.endDate }
    }),
    createdAt: new Date()
  };
}