/**
 * AI-Powered Product Recommendations
 * Smart recommendation engine based on pet characteristics, health data, and user behavior
 */

import { z } from 'zod';

// Core recommendation types
export interface RecommendationRequest {
  petId: string;
  userId: string;
  context: RecommendationContext;
  preferences?: UserPreferences;
  budget?: BudgetConstraints;
  excludeProducts?: string[];
}

export interface ProductRecommendation {
  productId: string;
  score: number;
  confidence: number;
  reasons: RecommendationReason[];
  category: ProductCategory;
  pricing: ProductPricing;
  compatibility: CompatibilityScore;
  urgency: UrgencyLevel;
  alternatives: string[];
  metadata: RecommendationMetadata;
}

export interface RecommendationEngine {
  type: EngineType;
  version: string;
  config: EngineConfig;
  performance: EnginePerformance;
}

export interface PetProfile {
  id: string;
  breed: string;
  age: number;
  weight: number;
  size: DogSize;
  activityLevel: ActivityLevel;
  healthConditions: HealthCondition[];
  allergies: Allergy[];
  dietaryRestrictions: DietaryRestriction[];
  behaviorTraits: BehaviorTrait[];
  preferences: PetPreferences;
}

export interface UserBehavior {
  userId: string;
  purchaseHistory: PurchaseHistory[];
  browsingHistory: BrowsingHistory[];
  searchPatterns: SearchPattern[];
  engagementMetrics: EngagementMetrics;
  seasonalPatterns: SeasonalPattern[];
}

export interface RecommendationMetrics {
  accuracy: number;
  conversionRate: number;
  clickThroughRate: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  revenueImpact: number;
}

// Enums
export enum RecommendationContext {
  HOMEPAGE = 'homepage',
  PRODUCT_PAGE = 'product_page',
  CART = 'cart',
  CHECKOUT = 'checkout',
  POST_PURCHASE = 'post_purchase',
  EMAIL_CAMPAIGN = 'email_campaign',
  PUSH_NOTIFICATION = 'push_notification',
  HEALTH_ALERT = 'health_alert',
  SEASONAL = 'seasonal'
}

export enum EngineType {
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  CONTENT_BASED = 'content_based',
  HYBRID = 'hybrid',
  DEEP_LEARNING = 'deep_learning',
  RULE_BASED = 'rule_based'
}

export enum ProductCategory {
  FOOD = 'food',
  TREATS = 'treats',
  HEALTH = 'health',
  SUPPLEMENTS = 'supplements',
  TOYS = 'toys',
  ACCESSORIES = 'accessories',
  GROOMING = 'grooming',
  TRAINING = 'training'
}

export enum DogSize {
  TOY = 'toy',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  GIANT = 'giant'
}

export enum ActivityLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecommendationReason {
  PET_BREED_MATCH = 'pet_breed_match',
  AGE_APPROPRIATE = 'age_appropriate',
  SIZE_APPROPRIATE = 'size_appropriate',
  HEALTH_CONDITION = 'health_condition',
  ALLERGY_SAFE = 'allergy_safe',
  ACTIVITY_LEVEL = 'activity_level',
  SEASONAL_NEED = 'seasonal_need',
  REPLENISHMENT = 'replenishment',
  TRENDING = 'trending',
  HIGH_RATED = 'high_rated',
  PRICE_MATCH = 'price_match',
  SIMILAR_CUSTOMERS = 'similar_customers',
  COMPLEMENTARY = 'complementary',
  PREVENTIVE_CARE = 'preventive_care'
}

// Supporting interfaces
export interface UserPreferences {
  preferredBrands: string[];
  priceRange: PriceRange;
  organicPreference: boolean;
  localPreference: boolean;
  subscriptionPreference: boolean;
  deliveryPreference: DeliveryPreference;
}

export interface BudgetConstraints {
  minPrice?: number;
  maxPrice?: number;
  monthlyBudget?: number;
  priorityCategories: ProductCategory[];
}

export interface ProductPricing {
  basePrice: number;
  discountPrice?: number;
  subscriptionDiscount?: number;
  bundleOptions: BundleOption[];
  pricePerUnit?: number;
}

export interface CompatibilityScore {
  overall: number;
  breed: number;
  age: number;
  size: number;
  health: number;
  behavior: number;
  dietary: number;
}

export interface RecommendationMetadata {
  generatedAt: Date;
  engineUsed: EngineType;
  modelVersion: string;
  trainingData: Date;
  abTestGroup?: string;
  personalizedFactors: string[];
  businessRules: string[];
}

export interface HealthCondition {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  treatmentType: string;
  dietaryImpact: boolean;
  exerciseImpact: boolean;
}

export interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  type: 'food' | 'environmental' | 'contact';
  symptoms: string[];
}

export interface DietaryRestriction {
  type: string;
  reason: string;
  alternatives: string[];
}

export interface BehaviorTrait {
  trait: string;
  intensity: number;
  impact: string[];
}

export interface PetPreferences {
  favoriteFlavors: string[];
  texturePreferences: string[];
  treatMotivation: number;
  toyPreferences: string[];
  activityPreferences: string[];
}

export interface PurchaseHistory {
  productId: string;
  category: ProductCategory;
  purchaseDate: Date;
  quantity: number;
  price: number;
  satisfaction?: number;
  repurchased: boolean;
}

export interface BrowsingHistory {
  productId: string;
  category: ProductCategory;
  viewedAt: Date;
  timeSpent: number;
  interactions: string[];
  converted: boolean;
}

export interface SearchPattern {
  query: string;
  category?: ProductCategory;
  frequency: number;
  lastSearched: Date;
  clickedResults: string[];
}

export interface EngagementMetrics {
  sessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  timeOnProduct: number;
  wishlistActivity: number;
  reviewActivity: number;
}

export interface SeasonalPattern {
  season: string;
  categoryPreferences: ProductCategory[];
  spendingPattern: number;
  urgencyPattern: UrgencyLevel;
}

export interface PriceRange {
  min: number;
  max: number;
  preferred: number;
}

export interface DeliveryPreference {
  speed: 'standard' | 'fast' | 'express';
  scheduling: boolean;
  subscriptionFrequency?: number;
}

export interface BundleOption {
  products: string[];
  discountPercentage: number;
  savings: number;
}

export interface EngineConfig {
  weightsConfig: RecommendationWeights;
  thresholds: RecommendationThresholds;
  abTestConfig?: ABTestConfig;
  businessRules: BusinessRule[];
}

export interface EnginePerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latency: number;
  throughput: number;
}

export interface RecommendationWeights {
  petProfile: number;
  userBehavior: number;
  productPopularity: number;
  seasonality: number;
  inventory: number;
  margin: number;
}

export interface RecommendationThresholds {
  minScore: number;
  minConfidence: number;
  maxRecommendations: number;
  diversityThreshold: number;
}

export interface ABTestConfig {
  testName: string;
  groups: string[];
  trafficSplit: number[];
  metrics: string[];
}

export interface BusinessRule {
  name: string;
  condition: string;
  action: string;
  priority: number;
  active: boolean;
}

// Machine Learning Models
export interface MLModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  accuracy: number;
  trainingData: TrainingDataset;
  features: ModelFeature[];
  hyperparameters: Record<string, any>;
  performance: ModelPerformance;
  deployedAt: Date;
  lastUpdated: Date;
}

export enum ModelType {
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  MATRIX_FACTORIZATION = 'matrix_factorization',
  DEEP_NEURAL_NETWORK = 'deep_neural_network',
  GRADIENT_BOOSTING = 'gradient_boosting',
  RANDOM_FOREST = 'random_forest',
  SVM = 'svm',
  CLUSTERING = 'clustering'
}

export interface TrainingDataset {
  size: number;
  features: number;
  timeRange: DateRange;
  quality: DataQuality;
}

export interface ModelFeature {
  name: string;
  type: 'categorical' | 'numerical' | 'text' | 'boolean';
  importance: number;
  source: string;
}

export interface ModelPerformance {
  trainingAccuracy: number;
  validationAccuracy: number;
  testAccuracy: number;
  auc: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DataQuality {
  completeness: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
}

// Zod validation schemas
export const RecommendationRequestSchema = z.object({
  petId: z.string().min(1),
  userId: z.string().min(1),
  context: z.nativeEnum(RecommendationContext),
  preferences: z.object({
    preferredBrands: z.array(z.string()).optional(),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().positive(),
      preferred: z.number().positive()
    }).optional(),
    organicPreference: z.boolean().optional(),
    localPreference: z.boolean().optional(),
    subscriptionPreference: z.boolean().optional()
  }).optional(),
  budget: z.object({
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().positive().optional(),
    monthlyBudget: z.number().positive().optional(),
    priorityCategories: z.array(z.nativeEnum(ProductCategory))
  }).optional(),
  excludeProducts: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).default(10)
});

export const UpdateModelSchema = z.object({
  modelId: z.string().min(1),
  hyperparameters: z.record(z.any()).optional(),
  features: z.array(z.object({
    name: z.string(),
    type: z.enum(['categorical', 'numerical', 'text', 'boolean']),
    importance: z.number().min(0).max(1)
  })).optional(),
  trainingConfig: z.object({
    epochs: z.number().int().positive().optional(),
    batchSize: z.number().int().positive().optional(),
    learningRate: z.number().positive().optional(),
    validationSplit: z.number().min(0).max(1).optional()
  }).optional()
});

export const RecommendationFeedbackSchema = z.object({
  recommendationId: z.string().min(1),
  userId: z.string().min(1),
  feedback: z.enum(['clicked', 'purchased', 'dismissed', 'liked', 'disliked']),
  rating: z.number().int().min(1).max(5).optional(),
  timestamp: z.date().default(() => new Date())
});

// Service error types
export class RecommendationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

export class ModelError extends RecommendationError {
  constructor(message: string, details?: any) {
    super(message, 'MODEL_ERROR', 500, details);
    this.name = 'ModelError';
  }
}

export class DataError extends RecommendationError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_ERROR', 400, details);
    this.name = 'DataError';
  }
}

// Type exports for validation
export type RecommendationRequestType = z.infer<typeof RecommendationRequestSchema>;
export type UpdateModelType = z.infer<typeof UpdateModelSchema>;
export type RecommendationFeedbackType = z.infer<typeof RecommendationFeedbackSchema>;