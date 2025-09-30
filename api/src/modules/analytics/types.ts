/**
 * Advanced Analytics & Insights
 * Comprehensive analytics across all platform modules
 */

import { z } from 'zod';

// Core analytics types
export interface AnalyticsQuery {
  modules: AnalyticsModule[];
  timeRange: TimeRange;
  granularity: TimeGranularity;
  filters?: AnalyticsFilters;
  groupBy?: string[];
  metrics: string[];
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: AnalyticsDataPoint[];
  summary: AnalyticsSummary;
  insights: AnalyticsInsight[];
  metadata: AnalyticsMetadata;
}

export interface AnalyticsDataPoint {
  timestamp: Date;
  metrics: Record<string, number>;
  dimensions: Record<string, string>;
  segments?: Record<string, any>;
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalRevenue: number;
  totalUsers: number;
  conversionRate: number;
  averageOrderValue: number;
  trends: TrendAnalysis[];
  comparisons: ComparisonData[];
}

export interface AnalyticsInsight {
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  data: any;
  createdAt: Date;
}

export interface BusinessIntelligence {
  revenue: RevenueAnalytics;
  users: UserAnalytics;
  products: ProductAnalytics;
  pets: PetAnalytics;
  engagement: EngagementAnalytics;
  health: HealthAnalytics;
  predictions: PredictionAnalytics;
}

export interface Dashboard {
  id: string;
  name: string;
  type: DashboardType;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  permissions: DashboardPermission[];
  refreshInterval: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
export enum AnalyticsModule {
  USER_SERVICE = 'user_service',
  PET_SERVICE = 'pet_service',
  COMMERCE = 'commerce',
  PAYMENTS = 'payments',
  RECOMMENDATIONS = 'recommendations',
  MESSAGING = 'messaging',
  HEALTH = 'health',
  GAMIFICATION = 'gamification'
}

export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
  PREDICTION = 'prediction',
  SEGMENTATION = 'segmentation',
  OPTIMIZATION = 'optimization'
}

export enum InsightCategory {
  REVENUE = 'revenue',
  USER_BEHAVIOR = 'user_behavior',
  PRODUCT_PERFORMANCE = 'product_performance',
  OPERATIONAL = 'operational',
  ENGAGEMENT = 'engagement',
  HEALTH = 'health'
}

export enum InsightImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DashboardType {
  EXECUTIVE = 'executive',
  OPERATIONAL = 'operational',
  PRODUCT = 'product',
  MARKETING = 'marketing',
  FINANCE = 'finance',
  HEALTH = 'health'
}

export enum MetricType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  PERCENTAGE = 'percentage',
  RATIO = 'ratio',
  RATE = 'rate'
}

// Supporting interfaces
export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
}

export interface AnalyticsFilters {
  userSegments?: string[];
  petBreeds?: string[];
  productCategories?: string[];
  geographies?: string[];
  channels?: string[];
  customFilters?: Record<string, any>;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  significance: number;
  periodComparison: PeriodComparison;
}

export interface ComparisonData {
  dimension: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
}

export interface PeriodComparison {
  previous: number;
  current: number;
  change: number;
  changePercent: number;
}

export interface AnalyticsMetadata {
  generatedAt: Date;
  queryTime: number;
  dataFreshness: Date;
  samplingRate: number;
  confidence: number;
  limitations: string[];
}

// Module-specific analytics
export interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  monthlyRecurringRevenue: number;
  customerLifetimeValue: number;
  revenueByCategory: CategoryBreakdown[];
  revenueBySegment: SegmentBreakdown[];
  cohortAnalysis: CohortData[];
  churnAnalysis: ChurnData;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
  retentionRate: number;
  engagementScore: number;
  userSegments: UserSegment[];
  userJourney: JourneyAnalytics;
  behaviorPatterns: BehaviorPattern[];
}

export interface ProductAnalytics {
  totalProducts: number;
  topSellingProducts: ProductPerformance[];
  categoryPerformance: CategoryPerformance[];
  inventoryTurnover: number;
  stockoutRate: number;
  crossSellSuccess: number;
  recommendationPerformance: RecommendationPerformance;
}

export interface PetAnalytics {
  totalPets: number;
  breedDistribution: BreedDistribution[];
  ageDistribution: AgeDistribution[];
  healthMetrics: HealthMetrics;
  vaccinationRates: VaccinationRates;
  activityPatterns: ActivityPattern[];
  nutritionCompliance: NutritionCompliance;
}

export interface EngagementAnalytics {
  sessionDuration: number;
  pageViews: number;
  clickThroughRates: Record<string, number>;
  conversionFunnels: ConversionFunnel[];
  featureUsage: FeatureUsage[];
  contentEngagement: ContentEngagement;
}

export interface HealthAnalytics {
  preventiveCareRate: number;
  healthConditionPrevalence: ConditionPrevalence[];
  treatmentEffectiveness: TreatmentEffectiveness[];
  healthOutcomes: HealthOutcome[];
  riskAssessments: RiskAssessment[];
}

export interface PredictionAnalytics {
  customerChurnProbability: number;
  lifetimeValuePrediction: number;
  demandForecasting: DemandForecast[];
  healthRiskPredictions: HealthRiskPrediction[];
  inventoryOptimization: InventoryOptimization[];
}

// Dashboard components
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  configuration: WidgetConfiguration;
  dataSource: DataSource;
  refreshRate: number;
}

export enum WidgetType {
  CHART = 'chart',
  TABLE = 'table',
  METRIC = 'metric',
  MAP = 'map',
  FUNNEL = 'funnel',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge'
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfiguration {
  chartType?: string;
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  styling: WidgetStyling;
}

export interface DataSource {
  module: AnalyticsModule;
  table: string;
  query: string;
  parameters: Record<string, any>;
}

export interface WidgetStyling {
  colors: string[];
  theme: string;
  fontSize: number;
  showLegend: boolean;
  showGrid: boolean;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
  breakpoints: LayoutBreakpoint[];
}

export interface LayoutBreakpoint {
  size: string;
  columns: number;
  margin: number;
}

export interface DashboardFilter {
  name: string;
  type: FilterType;
  values: any[];
  defaultValue: any;
  required: boolean;
}

export enum FilterType {
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  DATE_RANGE = 'date_range',
  TEXT = 'text',
  NUMBER_RANGE = 'number_range'
}

export interface DashboardPermission {
  userId: string;
  role: string;
  permissions: string[];
}

// Detailed analytics interfaces
export interface CategoryBreakdown {
  category: string;
  revenue: number;
  percentage: number;
  growth: number;
}

export interface SegmentBreakdown {
  segment: string;
  revenue: number;
  users: number;
  averageOrderValue: number;
}

export interface CohortData {
  cohort: string;
  size: number;
  retentionRates: number[];
  revenuePerUser: number[];
}

export interface ChurnData {
  churnRate: number;
  churnReasons: ChurnReason[];
  riskFactors: RiskFactor[];
  preventionStrategies: string[];
}

export interface ChurnReason {
  reason: string;
  percentage: number;
  impact: number;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface UserSegment {
  name: string;
  size: number;
  characteristics: Record<string, any>;
  behavior: SegmentBehavior;
  value: number;
}

export interface SegmentBehavior {
  avgSessionDuration: number;
  avgOrderValue: number;
  purchaseFrequency: number;
  engagementScore: number;
}

export interface JourneyAnalytics {
  stages: JourneyStage[];
  conversionRates: number[];
  dropoffPoints: DropoffPoint[];
  optimizationOpportunities: string[];
}

export interface JourneyStage {
  name: string;
  users: number;
  conversionRate: number;
  avgTimeSpent: number;
}

export interface DropoffPoint {
  stage: string;
  dropoffRate: number;
  reasons: string[];
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  userSegments: string[];
  impact: string;
}

export interface ProductPerformance {
  productId: string;
  name: string;
  revenue: number;
  units: number;
  margin: number;
  rating: number;
  category: string;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  units: number;
  growth: number;
  margin: number;
}

export interface RecommendationPerformance {
  clickThroughRate: number;
  conversionRate: number;
  revenueGenerated: number;
  accuracyScore: number;
  userSatisfaction: number;
}

export interface BreedDistribution {
  breed: string;
  count: number;
  percentage: number;
}

export interface AgeDistribution {
  ageGroup: string;
  count: number;
  percentage: number;
}

export interface HealthMetrics {
  averageWeight: number;
  vaccinationRate: number;
  conditionPrevalence: number;
  preventiveCareRate: number;
}

export interface VaccinationRates {
  overall: number;
  byBreed: Record<string, number>;
  byAge: Record<string, number>;
  upToDate: number;
}

export interface ActivityPattern {
  activityType: string;
  frequency: number;
  duration: number;
  engagement: number;
}

export interface NutritionCompliance {
  overallCompliance: number;
  byDietType: Record<string, number>;
  supplementUsage: number;
  customDiets: number;
}

export interface ConversionFunnel {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface FeatureUsage {
  feature: string;
  users: number;
  usageFrequency: number;
  satisfaction: number;
}

export interface ContentEngagement {
  viewTime: number;
  interactionRate: number;
  shareRate: number;
  completionRate: number;
}

export interface ConditionPrevalence {
  condition: string;
  prevalence: number;
  byBreed: Record<string, number>;
  byAge: Record<string, number>;
}

export interface TreatmentEffectiveness {
  treatment: string;
  successRate: number;
  duration: number;
  cost: number;
}

export interface HealthOutcome {
  metric: string;
  baseline: number;
  current: number;
  improvement: number;
}

export interface RiskAssessment {
  riskType: string;
  riskLevel: string;
  affectedPopulation: number;
  mitigationStrategies: string[];
}

export interface DemandForecast {
  product: string;
  forecastedDemand: number;
  confidence: number;
  seasonality: SeasonalityData;
}

export interface SeasonalityData {
  pattern: string;
  amplitude: number;
  peak: string;
  trough: string;
}

export interface HealthRiskPrediction {
  petId: string;
  riskType: string;
  probability: number;
  timeframe: string;
  preventionRecommendations: string[];
}

export interface InventoryOptimization {
  product: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  costSavings: number;
}

// Zod validation schemas
export const AnalyticsQuerySchema = z.object({
  modules: z.array(z.nativeEnum(AnalyticsModule)),
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
    timezone: z.string().optional()
  }),
  granularity: z.nativeEnum(TimeGranularity),
  filters: z.object({
    userSegments: z.array(z.string()).optional(),
    petBreeds: z.array(z.string()).optional(),
    productCategories: z.array(z.string()).optional(),
    geographies: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    customFilters: z.record(z.any()).optional()
  }).optional(),
  groupBy: z.array(z.string()).optional(),
  metrics: z.array(z.string()).min(1)
});

export const DashboardSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(DashboardType),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.nativeEnum(WidgetType),
    title: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    size: z.object({
      width: z.number().positive(),
      height: z.number().positive()
    }),
    configuration: z.object({
      chartType: z.string().optional(),
      metrics: z.array(z.string()),
      dimensions: z.array(z.string()),
      filters: z.record(z.any()),
      styling: z.object({
        colors: z.array(z.string()),
        theme: z.string(),
        fontSize: z.number().positive(),
        showLegend: z.boolean(),
        showGrid: z.boolean()
      })
    }),
    dataSource: z.object({
      module: z.nativeEnum(AnalyticsModule),
      table: z.string(),
      query: z.string(),
      parameters: z.record(z.any())
    }),
    refreshRate: z.number().positive()
  })),
  layout: z.object({
    columns: z.number().positive(),
    rows: z.number().positive(),
    responsive: z.boolean(),
    breakpoints: z.array(z.object({
      size: z.string(),
      columns: z.number().positive(),
      margin: z.number().min(0)
    }))
  }),
  filters: z.array(z.object({
    name: z.string(),
    type: z.nativeEnum(FilterType),
    values: z.array(z.any()),
    defaultValue: z.any(),
    required: z.boolean()
  })),
  refreshInterval: z.number().positive()
});

// Service error types
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export class QueryError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'QUERY_ERROR', 400, details);
    this.name = 'QueryError';
  }
}

export class DataAccessError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_ACCESS_ERROR', 500, details);
    this.name = 'DataAccessError';
  }
}

// Type exports for validation
export type AnalyticsQueryType = z.infer<typeof AnalyticsQuerySchema>;
export type DashboardType = z.infer<typeof DashboardSchema>;