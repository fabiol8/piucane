/**
 * Performance Monitoring & Optimization
 * Real-time performance tracking, optimization, and alerting
 */

import { z } from 'zod';

// Core performance types
export interface PerformanceMetrics {
  timestamp: Date;
  system: SystemMetrics;
  application: ApplicationMetrics;
  database: DatabaseMetrics;
  api: ApiMetrics;
  user: UserExperienceMetrics;
  business: BusinessMetrics;
}

export interface SystemMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  uptime: number;
  loadAverage: number[];
}

export interface ApplicationMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
  queueLength: number;
  gcMetrics: GarbageCollectionMetrics;
}

export interface DatabaseMetrics {
  connectionPool: ConnectionPoolMetrics;
  queryPerformance: QueryPerformanceMetrics;
  transactionMetrics: TransactionMetrics;
  indexEfficiency: IndexEfficiencyMetrics;
}

export interface ApiMetrics {
  endpoints: EndpointMetrics[];
  totalRequests: number;
  averageResponseTime: number;
  errorsByCode: Record<string, number>;
  rateLimitHits: number;
}

export interface UserExperienceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  bounce: { rate: number, duration: number[] };
}

export interface BusinessMetrics {
  conversion: ConversionMetrics;
  revenue: RevenueMetrics;
  engagement: EngagementMetrics;
  satisfaction: SatisfactionMetrics;
}

export interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue: number;
  triggered: Date;
  resolved?: Date;
  actions: AlertAction[];
  metadata: Record<string, any>;
}

export interface OptimizationRecommendation {
  id: string;
  category: OptimizationCategory;
  priority: OptimizationPriority;
  title: string;
  description: string;
  impact: ImpactEstimate;
  effort: EffortEstimate;
  implementation: ImplementationGuide;
  monitoring: MonitoringPlan;
  createdAt: Date;
}

export interface PerformanceBenchmark {
  id: string;
  name: string;
  category: BenchmarkCategory;
  metrics: BenchmarkMetric[];
  baseline: Record<string, number>;
  target: Record<string, number>;
  current: Record<string, number>;
  trend: TrendDirection;
  lastUpdated: Date;
}

// Enums
export enum AlertType {
  THRESHOLD = 'threshold',
  ANOMALY = 'anomaly',
  PREDICTION = 'prediction',
  PATTERN = 'pattern',
  DEPENDENCY = 'dependency'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum OptimizationCategory {
  PERFORMANCE = 'performance',
  SCALABILITY = 'scalability',
  RELIABILITY = 'reliability',
  SECURITY = 'security',
  COST = 'cost',
  USER_EXPERIENCE = 'user_experience'
}

export enum OptimizationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BenchmarkCategory {
  API_PERFORMANCE = 'api_performance',
  DATABASE_PERFORMANCE = 'database_performance',
  USER_EXPERIENCE = 'user_experience',
  BUSINESS_METRICS = 'business_metrics',
  SYSTEM_RESOURCES = 'system_resources'
}

export enum TrendDirection {
  IMPROVING = 'improving',
  DEGRADING = 'degrading',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export enum PerformanceReportType {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// Supporting interfaces
export interface CPUMetrics {
  usage: number;
  cores: number;
  frequency: number;
  processes: number;
  threads: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  buffers: number;
  cached: number;
  swapTotal: number;
  swapUsed: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  readOps: number;
  writeOps: number;
  readBytes: number;
  writeBytes: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errors: number;
  dropped: number;
}

export interface GarbageCollectionMetrics {
  collections: number;
  timeSpent: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
  averageWaitTime: number;
}

export interface QueryPerformanceMetrics {
  slowQueries: SlowQuery[];
  averageQueryTime: number;
  queriesPerSecond: number;
  cacheHitRate: number;
  lockContention: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  database: string;
  collection?: string;
}

export interface TransactionMetrics {
  totalTransactions: number;
  committedTransactions: number;
  abortedTransactions: number;
  averageTransactionTime: number;
  deadlocks: number;
}

export interface IndexEfficiencyMetrics {
  totalIndexes: number;
  unusedIndexes: string[];
  duplicateIndexes: string[];
  indexHitRate: number;
  indexScanRatio: number;
}

export interface EndpointMetrics {
  path: string;
  method: string;
  requestCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
}

export interface ConversionMetrics {
  rate: number;
  funnel: FunnelStage[];
  dropoffPoints: DropoffPoint[];
  attribution: AttributionData[];
}

export interface FunnelStage {
  stage: string;
  users: number;
  conversionRate: number;
  averageTime: number;
}

export interface DropoffPoint {
  stage: string;
  dropoffRate: number;
  reasons: string[];
}

export interface AttributionData {
  source: string;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
}

export interface RevenueMetrics {
  total: number;
  growth: number;
  perUser: number;
  perSession: number;
  byChannel: Record<string, number>;
  byProduct: Record<string, number>;
}

export interface EngagementMetrics {
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  returnRate: number;
  stickiness: number;
}

export interface SatisfactionMetrics {
  nps: number;
  csat: number;
  ces: number;
  reviews: ReviewMetrics;
  complaints: ComplaintMetrics;
}

export interface ReviewMetrics {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
  sentiment: SentimentAnalysis;
}

export interface ComplaintMetrics {
  total: number;
  resolved: number;
  averageResolutionTime: number;
  categories: Record<string, number>;
}

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  score: number;
}

export interface AlertAction {
  type: ActionType;
  description: string;
  automated: boolean;
  parameters: Record<string, any>;
  executed: boolean;
  executedAt?: Date;
  result?: ActionResult;
}

export enum ActionType {
  SCALE_UP = 'scale_up',
  SCALE_DOWN = 'scale_down',
  RESTART_SERVICE = 'restart_service',
  CLEAR_CACHE = 'clear_cache',
  NOTIFY_TEAM = 'notify_team',
  EXECUTE_SCRIPT = 'execute_script',
  THROTTLE_REQUESTS = 'throttle_requests'
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface ImpactEstimate {
  performance: number;
  cost: number;
  userExperience: number;
  reliability: number;
  confidence: number;
}

export interface EffortEstimate {
  development: number;
  testing: number;
  deployment: number;
  total: number;
  complexity: ComplexityLevel;
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface ImplementationGuide {
  steps: ImplementationStep[];
  requirements: string[];
  risks: Risk[];
  rollbackPlan: string;
}

export interface ImplementationStep {
  order: number;
  description: string;
  duration: number;
  dependencies: string[];
  validation: string;
}

export interface Risk {
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
}

export interface MonitoringPlan {
  metrics: string[];
  alerts: AlertConfiguration[];
  dashboards: string[];
  reportingFrequency: string;
}

export interface AlertConfiguration {
  metric: string;
  threshold: number;
  condition: string;
  severity: AlertSeverity;
  recipients: string[];
}

export interface BenchmarkMetric {
  name: string;
  unit: string;
  weight: number;
  direction: 'higher_better' | 'lower_better';
}

export interface PerformanceReport {
  id: string;
  type: PerformanceReportType;
  period: ReportPeriod;
  metrics: PerformanceMetrics[];
  summary: ReportSummary;
  recommendations: OptimizationRecommendation[];
  alerts: PerformanceAlert[];
  trends: TrendAnalysis[];
  comparisons: PeriodComparison[];
  createdAt: Date;
}

export interface ReportPeriod {
  start: Date;
  end: Date;
  duration: number;
}

export interface ReportSummary {
  overallHealth: HealthScore;
  keyMetrics: KeyMetricSummary[];
  improvements: string[];
  degradations: string[];
  recommendations: string[];
}

export interface HealthScore {
  overall: number;
  categories: Record<string, number>;
  trend: TrendDirection;
}

export interface KeyMetricSummary {
  metric: string;
  current: number;
  baseline: number;
  change: number;
  status: MetricStatus;
}

export enum MetricStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface TrendAnalysis {
  metric: string;
  direction: TrendDirection;
  magnitude: number;
  significance: number;
  forecast: ForecastData;
}

export interface ForecastData {
  predictions: number[];
  confidence: number;
  timeframe: string;
}

export interface PeriodComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  significance: number;
}

// Zod validation schemas
export const PerformanceMetricsSchema = z.object({
  timestamp: z.date(),
  system: z.object({
    cpu: z.object({
      usage: z.number().min(0).max(100),
      cores: z.number().positive(),
      frequency: z.number().positive(),
      processes: z.number().min(0),
      threads: z.number().min(0)
    }),
    memory: z.object({
      total: z.number().positive(),
      used: z.number().min(0),
      free: z.number().min(0),
      buffers: z.number().min(0),
      cached: z.number().min(0),
      swapTotal: z.number().min(0),
      swapUsed: z.number().min(0)
    }),
    uptime: z.number().min(0),
    loadAverage: z.array(z.number().min(0))
  }),
  application: z.object({
    responseTime: z.number().min(0),
    throughput: z.number().min(0),
    errorRate: z.number().min(0).max(100),
    activeConnections: z.number().min(0),
    queueLength: z.number().min(0)
  })
});

export const AlertConfigurationSchema = z.object({
  metric: z.string().min(1),
  threshold: z.number(),
  condition: z.enum(['>', '<', '>=', '<=', '==', '!=']),
  severity: z.nativeEnum(AlertSeverity),
  recipients: z.array(z.string().email()),
  enabled: z.boolean().default(true),
  cooldown: z.number().positive().default(300) // 5 minutes
});

export const OptimizationRequestSchema = z.object({
  category: z.nativeEnum(OptimizationCategory).optional(),
  priority: z.nativeEnum(OptimizationPriority).optional(),
  timeframe: z.object({
    start: z.date(),
    end: z.date()
  }),
  includeEstimates: z.boolean().default(true),
  maxRecommendations: z.number().positive().default(10)
});

// Service error types
export class PerformanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'PerformanceError';
  }
}

export class MetricsCollectionError extends PerformanceError {
  constructor(message: string, details?: any) {
    super(message, 'METRICS_COLLECTION_ERROR', 500, details);
    this.name = 'MetricsCollectionError';
  }
}

export class AlertingError extends PerformanceError {
  constructor(message: string, details?: any) {
    super(message, 'ALERTING_ERROR', 500, details);
    this.name = 'AlertingError';
  }
}

// Type exports for validation
export type PerformanceMetricsType = z.infer<typeof PerformanceMetricsSchema>;
export type AlertConfigurationType = z.infer<typeof AlertConfigurationSchema>;
export type OptimizationRequestType = z.infer<typeof OptimizationRequestSchema>;