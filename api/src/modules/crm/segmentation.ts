import {
  CustomerSegment,
  SegmentCondition,
  CustomerProfile,
  SegmentInsights
} from './types';

export class CustomerSegmentationEngine {
  private segments: Map<string, CustomerSegment> = new Map();

  constructor() {
    this.initializeDefaultSegments();
  }

  private initializeDefaultSegments(): void {
    const defaultSegments = [
      this.createNewCustomersSegment(),
      this.createVIPCustomersSegment(),
      this.createAtRiskCustomersSegment(),
      this.createLoyalCustomersSegment(),
      this.createChurnedCustomersSegment(),
      this.createHighValueCustomersSegment(),
      this.createSubscriberSegment(),
      this.createPuppyOwnersSegment(),
      this.createSeniorDogOwnersSegment(),
      this.createHealthConsciousSegment(),
      this.createBudgetShoppersSegment(),
      this.createPremiumShoppersSegment(),
      this.createInactiveCustomersSegment(),
      this.createReactivationCandidatesSegment(),
      this.createEmailEngagedSegment(),
      this.createMobileUsersSegment()
    ];

    defaultSegments.forEach(segment => {
      this.segments.set(segment.id, segment);
    });
  }

  async evaluateCustomerSegments(profile: CustomerProfile): Promise<string[]> {
    const matchingSegments: string[] = [];

    for (const segment of this.segments.values()) {
      if (segment.isActive && await this.evaluateSegmentConditions(profile, segment.conditions)) {
        matchingSegments.push(segment.id);
      }
    }

    return matchingSegments;
  }

  private async evaluateSegmentConditions(
    profile: CustomerProfile,
    conditions: SegmentCondition[]
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = await this.evaluateCondition(profile, conditions[0]);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = await this.evaluateCondition(profile, condition);

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private async evaluateCondition(
    profile: CustomerProfile,
    condition: SegmentCondition
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(profile, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);

      case 'less_than':
        return Number(fieldValue) < Number(condition.value);

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);

      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(item => String(item).includes(String(condition.value)));
        }
        return String(fieldValue).includes(String(condition.value));

      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.some(item => String(item).includes(String(condition.value)));
        }
        return !String(fieldValue).includes(String(condition.value));

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;

      case 'between':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const numValue = Number(fieldValue);
          return numValue >= Number(condition.value[0]) && numValue <= Number(condition.value[1]);
        }
        return false;

      default:
        return false;
    }
  }

  private getFieldValue(profile: CustomerProfile, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = profile;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Default segment definitions
  private createNewCustomersSegment(): CustomerSegment {
    return {
      id: 'new_customers',
      name: 'Nuovi Clienti',
      description: 'Clienti registrati negli ultimi 30 giorni',
      conditions: [
        {
          field: 'lifecycle.daysSinceFirstPurchase',
          operator: 'less_than',
          value: 30
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createVIPCustomersSegment(): CustomerSegment {
    return {
      id: 'vip_customers',
      name: 'Clienti VIP',
      description: 'Clienti con alto valore e fedeltà',
      conditions: [
        {
          field: 'behavioral.totalSpent',
          operator: 'greater_than',
          value: 1000
        },
        {
          field: 'behavioral.totalOrders',
          operator: 'greater_than',
          value: 10,
          logicalOperator: 'AND'
        },
        {
          field: 'behavioral.engagementScore',
          operator: 'greater_than',
          value: 80,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createAtRiskCustomersSegment(): CustomerSegment {
    return {
      id: 'at_risk_customers',
      name: 'Clienti a Rischio',
      description: 'Clienti con alto rischio di abbandono',
      conditions: [
        {
          field: 'behavioral.churnRisk',
          operator: 'in',
          value: ['medium', 'high']
        },
        {
          field: 'behavioral.daysSinceLastOrder',
          operator: 'greater_than',
          value: 60,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createLoyalCustomersSegment(): CustomerSegment {
    return {
      id: 'loyal_customers',
      name: 'Clienti Fedeli',
      description: 'Clienti con alta frequenza di acquisto e engagement',
      conditions: [
        {
          field: 'behavioral.orderFrequency',
          operator: 'greater_than',
          value: 2
        },
        {
          field: 'behavioral.engagementScore',
          operator: 'greater_than',
          value: 70,
          logicalOperator: 'AND'
        },
        {
          field: 'lifecycle.stage',
          operator: 'in',
          value: ['active', 'loyal'],
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createChurnedCustomersSegment(): CustomerSegment {
    return {
      id: 'churned_customers',
      name: 'Clienti Persi',
      description: 'Clienti che non acquistano da oltre 6 mesi',
      conditions: [
        {
          field: 'behavioral.daysSinceLastOrder',
          operator: 'greater_than',
          value: 180
        },
        {
          field: 'lifecycle.stage',
          operator: 'equals',
          value: 'churned',
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createHighValueCustomersSegment(): CustomerSegment {
    return {
      id: 'high_value_customers',
      name: 'Clienti Alto Valore',
      description: 'Clienti con alto lifetime value',
      conditions: [
        {
          field: 'lifecycle.customerLifetimeValue',
          operator: 'greater_than',
          value: 500
        },
        {
          field: 'behavioral.averageOrderValue',
          operator: 'greater_than',
          value: 80,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createSubscriberSegment(): CustomerSegment {
    return {
      id: 'subscribers',
      name: 'Abbonati Attivi',
      description: 'Clienti con abbonamento attivo',
      conditions: [
        {
          field: 'behavioral.hasActiveSubscription',
          operator: 'equals',
          value: true
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createPuppyOwnersSegment(): CustomerSegment {
    return {
      id: 'puppy_owners',
      name: 'Proprietari di Cuccioli',
      description: 'Clienti con cani di età inferiore a 1 anno',
      conditions: [
        {
          field: 'dogs.ages',
          operator: 'contains',
          value: 0
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createSeniorDogOwnersSegment(): CustomerSegment {
    return {
      id: 'senior_dog_owners',
      name: 'Proprietari di Cani Anziani',
      description: 'Clienti con cani di età superiore a 8 anni',
      conditions: [
        {
          field: 'dogs.ages',
          operator: 'greater_than',
          value: 8
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createHealthConsciousSegment(): CustomerSegment {
    return {
      id: 'health_conscious',
      name: 'Attenti alla Salute',
      description: 'Clienti interessati a prodotti per la salute',
      conditions: [
        {
          field: 'behavioral.favoriteCategories',
          operator: 'contains',
          value: 'salute'
        },
        {
          field: 'preferences.productInterests',
          operator: 'contains',
          value: 'integratori',
          logicalOperator: 'OR'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createBudgetShoppersSegment(): CustomerSegment {
    return {
      id: 'budget_shoppers',
      name: 'Acquirenti Budget',
      description: 'Clienti orientati al risparmio',
      conditions: [
        {
          field: 'preferences.priceRange',
          operator: 'equals',
          value: 'budget'
        },
        {
          field: 'behavioral.averageOrderValue',
          operator: 'less_than',
          value: 50,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createPremiumShoppersSegment(): CustomerSegment {
    return {
      id: 'premium_shoppers',
      name: 'Acquirenti Premium',
      description: 'Clienti che preferiscono prodotti premium',
      conditions: [
        {
          field: 'preferences.priceRange',
          operator: 'equals',
          value: 'premium'
        },
        {
          field: 'behavioral.averageOrderValue',
          operator: 'greater_than',
          value: 100,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createInactiveCustomersSegment(): CustomerSegment {
    return {
      id: 'inactive_customers',
      name: 'Clienti Inattivi',
      description: 'Clienti che non interagiscono da tempo',
      conditions: [
        {
          field: 'behavioral.daysSinceLastOrder',
          operator: 'between',
          value: [90, 180]
        },
        {
          field: 'behavioral.engagementScore',
          operator: 'less_than',
          value: 30,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createReactivationCandidatesSegment(): CustomerSegment {
    return {
      id: 'reactivation_candidates',
      name: 'Candidati Riattivazione',
      description: 'Ex-clienti con potenziale di riattivazione',
      conditions: [
        {
          field: 'behavioral.totalSpent',
          operator: 'greater_than',
          value: 200
        },
        {
          field: 'behavioral.daysSinceLastOrder',
          operator: 'between',
          value: [120, 365],
          logicalOperator: 'AND'
        },
        {
          field: 'behavioral.totalOrders',
          operator: 'greater_than',
          value: 3,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createEmailEngagedSegment(): CustomerSegment {
    return {
      id: 'email_engaged',
      name: 'Engaged via Email',
      description: 'Clienti attivi sulle email',
      conditions: [
        {
          field: 'behavioral.preferredChannel',
          operator: 'equals',
          value: 'email'
        },
        {
          field: 'preferences.marketingConsent',
          operator: 'equals',
          value: true,
          logicalOperator: 'AND'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createMobileUsersSegment(): CustomerSegment {
    return {
      id: 'mobile_users',
      name: 'Utenti Mobile',
      description: 'Clienti che utilizzano principalmente mobile',
      conditions: [
        {
          field: 'demographics.source',
          operator: 'equals',
          value: 'mobile'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  // Segment management methods
  getSegment(id: string): CustomerSegment | undefined {
    return this.segments.get(id);
  }

  getAllSegments(): CustomerSegment[] {
    return Array.from(this.segments.values());
  }

  getActiveSegments(): CustomerSegment[] {
    return Array.from(this.segments.values()).filter(s => s.isActive);
  }

  addSegment(segment: CustomerSegment): void {
    this.segments.set(segment.id, segment);
  }

  updateSegment(id: string, updates: Partial<CustomerSegment>): boolean {
    const segment = this.segments.get(id);
    if (!segment) return false;

    const updatedSegment = {
      ...segment,
      ...updates,
      updatedAt: new Date()
    };

    this.segments.set(id, updatedSegment);
    return true;
  }

  deleteSegment(id: string): boolean {
    return this.segments.delete(id);
  }

  async calculateSegmentSize(segmentId: string, profiles: CustomerProfile[]): Promise<number> {
    const segment = this.segments.get(segmentId);
    if (!segment) return 0;

    let count = 0;
    for (const profile of profiles) {
      if (await this.evaluateSegmentConditions(profile, segment.conditions)) {
        count++;
      }
    }

    // Update segment with calculated size
    segment.estimatedSize = count;
    segment.lastCalculated = new Date();

    return count;
  }

  async generateSegmentInsights(
    segmentId: string,
    profiles: CustomerProfile[],
    period: { start: Date; end: Date }
  ): Promise<SegmentInsights | null> {
    const segment = this.segments.get(segmentId);
    if (!segment) return null;

    const segmentProfiles = profiles.filter(async (profile) =>
      await this.evaluateSegmentConditions(profile, segment.conditions)
    );

    // Calculate insights
    const insights: SegmentInsights = {
      segmentId,
      period,
      metrics: {
        size: segmentProfiles.length,
        growth: 0, // TODO: Calculate based on historical data
        churnRate: this.calculateChurnRate(segmentProfiles),
        averageLifetimeValue: this.calculateAverageLifetimeValue(segmentProfiles),
        conversionRate: 0, // TODO: Calculate based on goals
        engagementRate: this.calculateEngagementRate(segmentProfiles),
        topProducts: [],
        topCategories: [],
        demographics: this.calculateDemographics(segmentProfiles),
        behavioral: this.calculateBehavioralMetrics(segmentProfiles)
      }
    };

    return insights;
  }

  private calculateChurnRate(profiles: CustomerProfile[]): number {
    const churnedCount = profiles.filter(p => p.lifecycle.stage === 'churned').length;
    return profiles.length > 0 ? (churnedCount / profiles.length) * 100 : 0;
  }

  private calculateAverageLifetimeValue(profiles: CustomerProfile[]): number {
    const totalLTV = profiles.reduce((sum, p) => sum + p.lifecycle.customerLifetimeValue, 0);
    return profiles.length > 0 ? totalLTV / profiles.length : 0;
  }

  private calculateEngagementRate(profiles: CustomerProfile[]): number {
    const totalEngagement = profiles.reduce((sum, p) => sum + p.behavioral.engagementScore, 0);
    return profiles.length > 0 ? totalEngagement / profiles.length : 0;
  }

  private calculateDemographics(profiles: CustomerProfile[]) {
    const ageDistribution: Record<string, number> = {};
    const genderDistribution: Record<string, number> = {};
    const locationDistribution: Record<string, number> = {};

    profiles.forEach(profile => {
      // Age distribution
      const ageGroup = this.getAgeGroup(profile.demographics.age);
      ageDistribution[ageGroup] = (ageDistribution[ageGroup] || 0) + 1;

      // Gender distribution
      const gender = profile.demographics.gender || 'unknown';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;

      // Location distribution
      const location = profile.demographics.location?.city || 'unknown';
      locationDistribution[location] = (locationDistribution[location] || 0) + 1;
    });

    return {
      ageDistribution,
      genderDistribution,
      locationDistribution
    };
  }

  private calculateBehavioralMetrics(profiles: CustomerProfile[]) {
    const orderFrequencyDistribution: Record<string, number> = {};
    const spendingDistribution: Record<string, number> = {};
    const channelPreferences: Record<string, number> = {};

    profiles.forEach(profile => {
      // Order frequency
      const freqGroup = this.getFrequencyGroup(profile.behavioral.orderFrequency);
      orderFrequencyDistribution[freqGroup] = (orderFrequencyDistribution[freqGroup] || 0) + 1;

      // Spending
      const spendGroup = this.getSpendingGroup(profile.behavioral.totalSpent);
      spendingDistribution[spendGroup] = (spendingDistribution[spendGroup] || 0) + 1;

      // Channel preferences
      const channel = profile.behavioral.preferredChannel;
      channelPreferences[channel] = (channelPreferences[channel] || 0) + 1;
    });

    return {
      orderFrequencyDistribution,
      spendingDistribution,
      channelPreferences
    };
  }

  private getAgeGroup(age?: number): string {
    if (!age) return 'unknown';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  private getFrequencyGroup(frequency: number): string {
    if (frequency < 0.5) return 'low';
    if (frequency < 2) return 'medium';
    return 'high';
  }

  private getSpendingGroup(totalSpent: number): string {
    if (totalSpent < 100) return 'low';
    if (totalSpent < 500) return 'medium';
    if (totalSpent < 1000) return 'high';
    return 'very_high';
  }
}