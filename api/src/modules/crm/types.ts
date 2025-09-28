// CRM types and interfaces
export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  conditions: SegmentCondition[];
  isActive: boolean;
  estimatedSize?: number;
  lastCalculated?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'exists' | 'not_exists' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface CustomerProfile {
  userId: string;
  demographics: {
    age?: number;
    gender?: 'M' | 'F' | 'other';
    location?: {
      city: string;
      region: string;
      country: string;
      postalCode: string;
    };
    registrationDate: Date;
    source: 'web' | 'mobile' | 'referral' | 'social' | 'ads' | 'other';
  };
  behavioral: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    daysSinceLastOrder?: number;
    orderFrequency: number; // orders per month
    hasActiveSubscription: boolean;
    subscriptionValue?: number;
    favoriteCategories: string[];
    preferredChannel: 'email' | 'push' | 'whatsapp' | 'sms';
    engagementScore: number; // 0-100
    churnRisk: 'low' | 'medium' | 'high';
  };
  lifecycle: {
    stage: 'prospect' | 'new' | 'active' | 'loyal' | 'at_risk' | 'churned' | 'reactivated';
    customerLifetimeValue: number;
    predictedLifetimeValue: number;
    acquisitionCost?: number;
    daysSinceFirstPurchase?: number;
  };
  dogs: {
    totalDogs: number;
    breeds: string[];
    ages: number[];
    sizes: ('small' | 'medium' | 'large')[];
    healthConditions: string[];
  };
  preferences: {
    marketingConsent: boolean;
    emailFrequency: 'daily' | 'weekly' | 'monthly';
    productInterests: string[];
    priceRange: 'budget' | 'standard' | 'premium';
  };
  segments: string[]; // segment IDs
  lastUpdated: Date;
}

export interface CustomerJourney {
  id: string;
  name: string;
  description: string;
  triggerConditions: JourneyTrigger[];
  steps: JourneyStep[];
  isActive: boolean;
  settings: {
    maxParticipants?: number;
    endDate?: Date;
    timezone: string;
    workingHours?: {
      start: string;
      end: string;
    };
    blacklistDays?: string[]; // ISO day names
  };
  stats: {
    totalEntered: number;
    totalCompleted: number;
    totalDropped: number;
    conversionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface JourneyTrigger {
  type: 'segment_entry' | 'event' | 'date' | 'user_property' | 'order' | 'subscription';
  conditions: SegmentCondition[];
  cooldownHours?: number; // prevent re-entry
}

export interface JourneyStep {
  id: string;
  type: 'message' | 'wait' | 'condition' | 'action' | 'goal';
  name: string;
  settings: JourneyStepSettings;
  position: {
    x: number;
    y: number;
  };
  connections: string[]; // IDs of next steps
}

export type JourneyStepSettings =
  | MessageStepSettings
  | WaitStepSettings
  | ConditionStepSettings
  | ActionStepSettings
  | GoalStepSettings;

export interface MessageStepSettings {
  templateKey: string;
  channels: ('email' | 'push' | 'whatsapp' | 'sms' | 'inapp')[];
  personalization: Record<string, any>;
  sendingOptions: {
    respectQuietHours: boolean;
    maxRetries: number;
    fallbackChannel?: 'email' | 'push' | 'whatsapp' | 'sms' | 'inapp';
  };
}

export interface WaitStepSettings {
  duration: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  waitUntil?: {
    time?: string; // HH:mm
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
  };
}

export interface ConditionStepSettings {
  conditions: SegmentCondition[];
  trueStepId: string;
  falseStepId: string;
}

export interface ActionStepSettings {
  actionType: 'add_tag' | 'remove_tag' | 'update_property' | 'create_discount' | 'assign_mission' | 'add_to_segment' | 'remove_from_segment';
  parameters: Record<string, any>;
}

export interface GoalStepSettings {
  goalType: 'purchase' | 'subscription' | 'engagement' | 'custom';
  conditions: SegmentCondition[];
  value?: number;
  conversionWindow: number; // days
}

export interface JourneyParticipant {
  journeyId: string;
  userId: string;
  enteredAt: Date;
  currentStepId: string;
  stepHistory: {
    stepId: string;
    enteredAt: Date;
    completedAt?: Date;
    status: 'completed' | 'failed' | 'skipped';
    data?: Record<string, any>;
  }[];
  status: 'active' | 'completed' | 'dropped' | 'paused';
  completedAt?: Date;
  dropReason?: string;
  goalAchieved?: boolean;
  goalValue?: number;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  type: 'onboarding' | 'winback' | 'retention' | 'promotion' | 'education' | 'cross_sell' | 'upsell';
  description: string;
  estimatedDuration: number; // days
  template: Omit<CustomerJourney, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'stats'>;
  isPublic: boolean;
  tags: string[];
  previewImage?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SegmentInsights {
  segmentId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    size: number;
    growth: number; // percentage
    churnRate: number;
    averageLifetimeValue: number;
    conversionRate: number;
    engagementRate: number;
    topProducts: Array<{
      productId: string;
      name: string;
      revenue: number;
      orders: number;
    }>;
    topCategories: Array<{
      category: string;
      revenue: number;
      orders: number;
    }>;
    demographics: {
      ageDistribution: Record<string, number>;
      genderDistribution: Record<string, number>;
      locationDistribution: Record<string, number>;
    };
    behavioral: {
      orderFrequencyDistribution: Record<string, number>;
      spendingDistribution: Record<string, number>;
      channelPreferences: Record<string, number>;
    };
  };
}

export interface PersonalizationRule {
  id: string;
  name: string;
  description: string;
  conditions: SegmentCondition[];
  personalizations: {
    productRecommendations?: {
      categories: string[];
      brands: string[];
      priceRange?: {
        min: number;
        max: number;
      };
      excludeOwned: boolean;
    };
    contentPersonalization?: {
      tone: 'casual' | 'professional' | 'friendly';
      language: string;
      topics: string[];
    };
    offerPersonalization?: {
      discountType: 'percentage' | 'fixed' | 'free_shipping';
      discountValue: number;
      categories: string[];
      minOrderValue?: number;
    };
    messagePersonalization?: {
      channel: 'email' | 'push' | 'whatsapp' | 'sms' | 'inapp';
      frequency: 'low' | 'medium' | 'high';
      timeOfDay: 'morning' | 'afternoon' | 'evening';
    };
  };
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CRMEvent {
  id: string;
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  source: 'web' | 'mobile' | 'api' | 'system';
  sessionId?: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    location?: {
      city: string;
      country: string;
    };
  };
  processed: boolean;
  processedAt?: Date;
}

export interface CRMAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  overview: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    churnedCustomers: number;
    totalRevenue: number;
    averageLifetimeValue: number;
    customerAcquisitionCost: number;
    churnRate: number;
    retentionRate: number;
  };
  segments: Array<{
    segmentId: string;
    name: string;
    size: number;
    growth: number;
    revenue: number;
    conversionRate: number;
  }>;
  journeys: Array<{
    journeyId: string;
    name: string;
    participants: number;
    completionRate: number;
    dropRate: number;
    conversionRate: number;
    revenue: number;
  }>;
  channels: Array<{
    channel: string;
    reach: number;
    engagement: number;
    conversions: number;
    revenue: number;
    roi: number;
  }>;
}