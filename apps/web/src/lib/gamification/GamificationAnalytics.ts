import type {
  GamificationEvent,
  GamificationAnalytics,
  GamificationProfile,
  Mission,
  Badge,
  EarnedReward,
  UserMissionProgress
} from '@/types/gamification';

interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: string;
  timestamp: Date;
  data: any;
  sessionId?: string;
  source: 'app' | 'web' | 'api';
}

interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'rate';
  description: string;
  dimensions?: string[];
}

interface AnalyticsReport {
  reportId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  metrics: Record<string, any>;
  insights: string[];
  recommendations: string[];
}

export class GamificationAnalyticsSystem {
  private events: Map<string, AnalyticsEvent[]>; // userId -> events
  private metrics: Map<string, MetricDefinition>;
  private aggregatedData: Map<string, any>;

  constructor() {
    this.events = new Map();
    this.metrics = this.initializeMetrics();
    this.aggregatedData = new Map();
  }

  // Event Tracking
  async trackEvent(event: Omit<AnalyticsEvent, 'id'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId()
    };

    // Store event
    const userEvents = this.events.get(event.userId) || [];
    userEvents.push(fullEvent);

    // Keep only last 10000 events per user
    if (userEvents.length > 10000) {
      userEvents.shift();
    }

    this.events.set(event.userId, userEvents);

    // Update real-time aggregations
    await this.updateAggregations(fullEvent);

    // Send to external analytics (GA4, etc.)
    await this.sendToExternalAnalytics(fullEvent);

    console.log(`Analytics event tracked: ${event.eventType} for user ${event.userId}`);
  }

  // User Analytics
  async getUserAnalytics(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<GamificationAnalytics> {
    const userEvents = this.getUserEventsInPeriod(userId, period);

    return {
      userId,
      period,
      totalXPEarned: this.calculateXPEarned(userEvents),
      missionsCompleted: this.calculateMissionsCompleted(userEvents),
      badgesEarned: this.calculateBadgesEarned(userEvents),
      levelsGained: this.calculateLevelsGained(userEvents),
      streakDays: this.calculateMaxStreak(userEvents),
      dailyActiveDays: this.calculateActiveDays(userEvents),
      averageSessionTime: this.calculateAverageSessionTime(userEvents),
      missionCompletionRate: this.calculateMissionCompletionRate(userEvents),
      retentionRate: await this.calculateRetentionRate(userId, period),
      averageMissionRating: this.calculateAverageMissionRating(userEvents),
      averageTimeToComplete: this.calculateAverageTimeToComplete(userEvents),
      difficultyPreference: this.calculateDifficultyPreference(userEvents),
      dropRate: this.calculateDropRate(userEvents),
      rewardsClaimed: this.calculateRewardsClaimed(userEvents),
      discountsUsed: this.calculateDiscountsUsed(userEvents),
      totalRewardValue: this.calculateTotalRewardValue(userEvents)
    };
  }

  // System-wide Analytics
  async getSystemAnalytics(period: { start: Date; end: Date }): Promise<{
    overview: {
      totalUsers: number;
      activeUsers: number;
      newUsers: number;
      retainedUsers: number;
      averageSessionTime: number;
      totalSessions: number;
    };
    engagement: {
      totalXPAwarded: number;
      totalMissionsCompleted: number;
      totalBadgesEarned: number;
      averageMissionCompletionRate: number;
      averageMissionRating: number;
      mostPopularMissions: Array<{ missionId: string; completions: number }>;
      mostEarnedBadges: Array<{ badgeId: string; earned: number }>;
    };
    monetization: {
      totalRewardsClaimed: number;
      totalDiscountsGenerated: number;
      totalDiscountsUsed: number;
      averageRewardValue: number;
      conversionRate: number;
    };
    technical: {
      averageLoadTime: number;
      errorRate: number;
      crashRate: number;
      averageResponseTime: number;
    };
    growth: {
      userGrowthRate: number;
      engagementTrend: number;
      retentionTrend: number;
      churnRate: number;
    };
  }> {
    const allEvents = this.getAllEventsInPeriod(period);
    const uniqueUsers = new Set(allEvents.map(e => e.userId));
    const activeUsers = this.getActiveUsersInPeriod(period);

    return {
      overview: {
        totalUsers: uniqueUsers.size,
        activeUsers: activeUsers.size,
        newUsers: await this.calculateNewUsers(period),
        retainedUsers: await this.calculateRetainedUsers(period),
        averageSessionTime: this.calculateGlobalAverageSessionTime(allEvents),
        totalSessions: this.calculateTotalSessions(allEvents)
      },
      engagement: {
        totalXPAwarded: this.calculateTotalXPAwarded(allEvents),
        totalMissionsCompleted: this.calculateTotalMissionsCompleted(allEvents),
        totalBadgesEarned: this.calculateTotalBadgesEarned(allEvents),
        averageMissionCompletionRate: await this.calculateGlobalMissionCompletionRate(allEvents),
        averageMissionRating: this.calculateGlobalAverageMissionRating(allEvents),
        mostPopularMissions: this.getMostPopularMissions(allEvents),
        mostEarnedBadges: this.getMostEarnedBadges(allEvents)
      },
      monetization: {
        totalRewardsClaimed: this.calculateTotalRewardsClaimed(allEvents),
        totalDiscountsGenerated: this.calculateTotalDiscountsGenerated(allEvents),
        totalDiscountsUsed: this.calculateTotalDiscountsUsed(allEvents),
        averageRewardValue: this.calculateAverageRewardValue(allEvents),
        conversionRate: this.calculateConversionRate(allEvents)
      },
      technical: {
        averageLoadTime: this.calculateAverageLoadTime(allEvents),
        errorRate: this.calculateErrorRate(allEvents),
        crashRate: this.calculateCrashRate(allEvents),
        averageResponseTime: this.calculateAverageResponseTime(allEvents)
      },
      growth: {
        userGrowthRate: await this.calculateUserGrowthRate(period),
        engagementTrend: await this.calculateEngagementTrend(period),
        retentionTrend: await this.calculateRetentionTrend(period),
        churnRate: await this.calculateChurnRate(period)
      }
    };
  }

  // Cohort Analysis
  async getCohortAnalysis(
    cohortBy: 'registration' | 'first_mission' | 'level_reached',
    period: { start: Date; end: Date }
  ): Promise<{
    cohorts: Array<{
      cohortId: string;
      cohortDate: Date;
      size: number;
      retention: {
        day1: number;
        day7: number;
        day14: number;
        day30: number;
        day60: number;
        day90: number;
      };
      engagement: {
        avgXPPerUser: number;
        avgMissionsPerUser: number;
        avgBadgesPerUser: number;
      };
      monetization: {
        rewardClaimRate: number;
        discountUsageRate: number;
        avgRewardValue: number;
      };
    }>;
  }> {
    // Mock implementation - in production, this would analyze real cohort data
    const cohorts = [];

    // Generate sample cohorts for the period
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);

    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 7)) {
      const cohortId = `cohort_${date.getFullYear()}_W${Math.ceil(date.getDate() / 7)}`;

      cohorts.push({
        cohortId,
        cohortDate: new Date(date),
        size: Math.floor(Math.random() * 100) + 20,
        retention: {
          day1: 0.85 + Math.random() * 0.1,
          day7: 0.45 + Math.random() * 0.15,
          day14: 0.30 + Math.random() * 0.15,
          day30: 0.20 + Math.random() * 0.15,
          day60: 0.15 + Math.random() * 0.10,
          day90: 0.10 + Math.random() * 0.10
        },
        engagement: {
          avgXPPerUser: 500 + Math.random() * 1000,
          avgMissionsPerUser: 3 + Math.random() * 7,
          avgBadgesPerUser: 1 + Math.random() * 3
        },
        monetization: {
          rewardClaimRate: 0.60 + Math.random() * 0.30,
          discountUsageRate: 0.25 + Math.random() * 0.20,
          avgRewardValue: 8 + Math.random() * 12
        }
      });
    }

    return { cohorts };
  }

  // Funnel Analysis
  async getFunnelAnalysis(
    funnelName: string,
    steps: string[],
    period: { start: Date; end: Date }
  ): Promise<{
    funnelName: string;
    period: { start: Date; end: Date };
    steps: Array<{
      stepName: string;
      users: number;
      conversionRate: number;
      dropoffRate: number;
      averageTimeToNext?: number;
    }>;
    overallConversionRate: number;
  }> {
    const allEvents = this.getAllEventsInPeriod(period);
    const funnelData = [];
    let previousStepUsers = 0;

    for (let i = 0; i < steps.length; i++) {
      const stepName = steps[i];
      const stepEvents = allEvents.filter(e => e.eventType === stepName);
      const uniqueUsers = new Set(stepEvents.map(e => e.userId)).size;

      const conversionRate = i === 0 ? 1 : previousStepUsers > 0 ? uniqueUsers / previousStepUsers : 0;
      const dropoffRate = 1 - conversionRate;

      // Calculate average time to next step
      let averageTimeToNext: number | undefined;
      if (i < steps.length - 1) {
        const nextStepEvents = allEvents.filter(e => e.eventType === steps[i + 1]);
        const timeDiffs = [];

        for (const currentEvent of stepEvents) {
          const nextEvent = nextStepEvents.find(
            e => e.userId === currentEvent.userId && e.timestamp > currentEvent.timestamp
          );
          if (nextEvent) {
            timeDiffs.push(nextEvent.timestamp.getTime() - currentEvent.timestamp.getTime());
          }
        }

        if (timeDiffs.length > 0) {
          averageTimeToNext = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length / 1000; // seconds
        }
      }

      funnelData.push({
        stepName,
        users: uniqueUsers,
        conversionRate,
        dropoffRate,
        averageTimeToNext
      });

      previousStepUsers = uniqueUsers;
    }

    const overallConversionRate = funnelData.length > 0 ?
      funnelData[funnelData.length - 1].users / funnelData[0].users : 0;

    return {
      funnelName,
      period,
      steps: funnelData,
      overallConversionRate
    };
  }

  // Real-time Metrics
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    ongoingMissions: number;
    rewardsPendingClaim: number;
    averageEngagementScore: number;
    systemHealth: {
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      errorRate: number;
      throughput: number;
    };
  }> {
    const last5Minutes = Date.now() - 300000; // 5 minutes ago
    const recentEvents = this.getAllEventsAfter(new Date(last5Minutes));

    const activeUsers = new Set(recentEvents.map(e => e.userId)).size;
    const ongoingMissions = recentEvents.filter(e => e.eventType === 'mission_started').length -
                           recentEvents.filter(e => e.eventType === 'mission_completed').length;
    const rewardsPendingClaim = recentEvents.filter(e => e.eventType === 'reward_earned').length -
                               recentEvents.filter(e => e.eventType === 'reward_claimed').length;

    // Mock system health metrics
    const systemHealth = {
      status: 'healthy' as const,
      responseTime: 150 + Math.random() * 50, // ms
      errorRate: 0.001 + Math.random() * 0.004, // 0.1-0.5%
      throughput: 45 + Math.random() * 10 // requests/second
    };

    return {
      activeUsers,
      ongoingMissions,
      rewardsPendingClaim,
      averageEngagementScore: 0.72 + Math.random() * 0.15,
      systemHealth
    };
  }

  // A/B Test Analytics
  async getABTestResults(
    testId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    testId: string;
    variants: Array<{
      variantId: string;
      name: string;
      users: number;
      conversionRate: number;
      averageEngagement: number;
      statisticalSignificance: number;
      confidenceInterval: { lower: number; upper: number };
    }>;
    winningVariant?: string;
    recommendation: string;
  }> {
    // Mock A/B test results - in production, this would analyze real test data
    const variants = [
      {
        variantId: 'control',
        name: 'Control',
        users: 1000,
        conversionRate: 0.12,
        averageEngagement: 0.65,
        statisticalSignificance: 0.95,
        confidenceInterval: { lower: 0.10, upper: 0.14 }
      },
      {
        variantId: 'variant_a',
        name: 'Enhanced Rewards UI',
        users: 1050,
        conversionRate: 0.18,
        averageEngagement: 0.78,
        statisticalSignificance: 0.98,
        confidenceInterval: { lower: 0.16, upper: 0.20 }
      }
    ];

    const winningVariant = variants.reduce((winner, variant) =>
      variant.conversionRate > winner.conversionRate ? variant : winner
    ).variantId;

    return {
      testId,
      variants,
      winningVariant,
      recommendation: winningVariant === 'control' ?
        'Continue with current design' :
        'Roll out winning variant to all users'
    };
  }

  // Automated Insights
  async generateInsights(period: { start: Date; end: Date }): Promise<{
    insights: Array<{
      type: 'opportunity' | 'warning' | 'success' | 'trend';
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      actionable: boolean;
      recommendation?: string;
      data: any;
    }>;
  }> {
    const systemAnalytics = await this.getSystemAnalytics(period);
    const insights = [];

    // Low engagement insight
    if (systemAnalytics.engagement.averageMissionCompletionRate < 0.6) {
      insights.push({
        type: 'warning',
        title: 'Low Mission Completion Rate',
        description: `Mission completion rate is ${(systemAnalytics.engagement.averageMissionCompletionRate * 100).toFixed(1)}%, which is below the target of 60%.`,
        impact: 'high',
        actionable: true,
        recommendation: 'Review mission difficulty and consider implementing better onboarding',
        data: { completionRate: systemAnalytics.engagement.averageMissionCompletionRate }
      });
    }

    // High churn warning
    if (systemAnalytics.growth.churnRate > 0.15) {
      insights.push({
        type: 'warning',
        title: 'High User Churn',
        description: `User churn rate is ${(systemAnalytics.growth.churnRate * 100).toFixed(1)}%, indicating retention issues.`,
        impact: 'high',
        actionable: true,
        recommendation: 'Implement retention campaigns and improve user onboarding experience',
        data: { churnRate: systemAnalytics.growth.churnRate }
      });
    }

    // Reward opportunity
    if (systemAnalytics.monetization.conversionRate < 0.1) {
      insights.push({
        type: 'opportunity',
        title: 'Low Reward Conversion',
        description: `Only ${(systemAnalytics.monetization.conversionRate * 100).toFixed(1)}% of rewards are being claimed and used.`,
        impact: 'medium',
        actionable: true,
        recommendation: 'Improve reward visibility and simplify the claiming process',
        data: { conversionRate: systemAnalytics.monetization.conversionRate }
      });
    }

    // Growth success
    if (systemAnalytics.growth.userGrowthRate > 0.2) {
      insights.push({
        type: 'success',
        title: 'Strong User Growth',
        description: `User growth rate is ${(systemAnalytics.growth.userGrowthRate * 100).toFixed(1)}%, exceeding targets.`,
        impact: 'high',
        actionable: false,
        data: { growthRate: systemAnalytics.growth.userGrowthRate }
      });
    }

    // Engagement trend
    if (systemAnalytics.growth.engagementTrend > 0.1) {
      insights.push({
        type: 'trend',
        title: 'Rising Engagement',
        description: `User engagement is trending upward by ${(systemAnalytics.growth.engagementTrend * 100).toFixed(1)}%.`,
        impact: 'medium',
        actionable: false,
        data: { engagementTrend: systemAnalytics.growth.engagementTrend }
      });
    }

    return { insights };
  }

  // Helper methods
  private getUserEventsInPeriod(userId: string, period: { start: Date; end: Date }): AnalyticsEvent[] {
    const userEvents = this.events.get(userId) || [];
    return userEvents.filter(e =>
      e.timestamp >= period.start && e.timestamp <= period.end
    );
  }

  private getAllEventsInPeriod(period: { start: Date; end: Date }): AnalyticsEvent[] {
    const allEvents = [];
    for (const userEvents of this.events.values()) {
      allEvents.push(...userEvents.filter(e =>
        e.timestamp >= period.start && e.timestamp <= period.end
      ));
    }
    return allEvents;
  }

  private getAllEventsAfter(timestamp: Date): AnalyticsEvent[] {
    const allEvents = [];
    for (const userEvents of this.events.values()) {
      allEvents.push(...userEvents.filter(e => e.timestamp >= timestamp));
    }
    return allEvents;
  }

  private getActiveUsersInPeriod(period: { start: Date; end: Date }): Set<string> {
    const events = this.getAllEventsInPeriod(period);
    return new Set(events.map(e => e.userId));
  }

  // Calculation methods
  private calculateXPEarned(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.eventType === 'xp_awarded')
      .reduce((total, e) => total + (e.data.amount || 0), 0);
  }

  private calculateMissionsCompleted(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'mission_completed').length;
  }

  private calculateBadgesEarned(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'badge_earned').length;
  }

  private calculateLevelsGained(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'level_up').length;
  }

  private calculateMaxStreak(events: AnalyticsEvent[]): number {
    const streakEvents = events.filter(e => e.eventType === 'streak_updated');
    return streakEvents.reduce((max, e) => Math.max(max, e.data.streakDays || 0), 0);
  }

  private calculateActiveDays(events: AnalyticsEvent[]): number {
    const uniqueDays = new Set();
    events.forEach(e => {
      const dateStr = e.timestamp.toISOString().split('T')[0];
      uniqueDays.add(dateStr);
    });
    return uniqueDays.size;
  }

  private calculateAverageSessionTime(events: AnalyticsEvent[]): number {
    const sessionEvents = events.filter(e => e.eventType === 'session_end');
    if (sessionEvents.length === 0) return 0;

    const totalTime = sessionEvents.reduce((total, e) => total + (e.data.duration || 0), 0);
    return totalTime / sessionEvents.length / 60; // Convert to minutes
  }

  private calculateMissionCompletionRate(events: AnalyticsEvent[]): number {
    const started = events.filter(e => e.eventType === 'mission_started').length;
    const completed = events.filter(e => e.eventType === 'mission_completed').length;
    return started > 0 ? completed / started : 0;
  }

  private async calculateRetentionRate(userId: string, period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, calculate actual retention
    return 0.65 + Math.random() * 0.2;
  }

  private calculateAverageMissionRating(events: AnalyticsEvent[]): number {
    const ratingEvents = events.filter(e => e.eventType === 'mission_rated' && e.data.rating);
    if (ratingEvents.length === 0) return 0;

    const totalRating = ratingEvents.reduce((total, e) => total + e.data.rating, 0);
    return totalRating / ratingEvents.length;
  }

  private calculateAverageTimeToComplete(events: AnalyticsEvent[]): number {
    const completionEvents = events.filter(e => e.eventType === 'mission_completed' && e.data.timeSpent);
    if (completionEvents.length === 0) return 0;

    const totalTime = completionEvents.reduce((total, e) => total + e.data.timeSpent, 0);
    return totalTime / completionEvents.length;
  }

  private calculateDifficultyPreference(events: AnalyticsEvent[]): any {
    const difficulties = events
      .filter(e => e.eventType === 'mission_started' && e.data.difficulty)
      .map(e => e.data.difficulty);

    const counts = difficulties.reduce((acc, diff) => {
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'medium');
  }

  private calculateDropRate(events: AnalyticsEvent[]): number {
    const started = events.filter(e => e.eventType === 'mission_started').length;
    const abandoned = events.filter(e => e.eventType === 'mission_abandoned').length;
    return started > 0 ? abandoned / started : 0;
  }

  private calculateRewardsClaimed(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'reward_claimed').length;
  }

  private calculateDiscountsUsed(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'discount_used').length;
  }

  private calculateTotalRewardValue(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.eventType === 'reward_claimed')
      .reduce((total, e) => total + (e.data.value || 0), 0);
  }

  // System-wide calculation methods
  private calculateTotalXPAwarded(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.eventType === 'xp_awarded')
      .reduce((total, e) => total + (e.data.amount || 0), 0);
  }

  private calculateTotalMissionsCompleted(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'mission_completed').length;
  }

  private calculateTotalBadgesEarned(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'badge_earned').length;
  }

  private async calculateGlobalMissionCompletionRate(events: AnalyticsEvent[]): Promise<number> {
    const started = events.filter(e => e.eventType === 'mission_started').length;
    const completed = events.filter(e => e.eventType === 'mission_completed').length;
    return started > 0 ? completed / started : 0;
  }

  private calculateGlobalAverageMissionRating(events: AnalyticsEvent[]): number {
    const ratingEvents = events.filter(e => e.eventType === 'mission_rated' && e.data.rating);
    if (ratingEvents.length === 0) return 0;

    const totalRating = ratingEvents.reduce((total, e) => total + e.data.rating, 0);
    return totalRating / ratingEvents.length;
  }

  private getMostPopularMissions(events: AnalyticsEvent[]): Array<{ missionId: string; completions: number }> {
    const missionCounts = events
      .filter(e => e.eventType === 'mission_completed')
      .reduce((acc, e) => {
        const missionId = e.data.missionId;
        acc[missionId] = (acc[missionId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(missionCounts)
      .map(([missionId, completions]) => ({ missionId, completions }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 10);
  }

  private getMostEarnedBadges(events: AnalyticsEvent[]): Array<{ badgeId: string; earned: number }> {
    const badgeCounts = events
      .filter(e => e.eventType === 'badge_earned')
      .reduce((acc, e) => {
        const badgeId = e.data.badgeId;
        acc[badgeId] = (acc[badgeId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(badgeCounts)
      .map(([badgeId, earned]) => ({ badgeId, earned }))
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);
  }

  private calculateTotalRewardsClaimed(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'reward_claimed').length;
  }

  private calculateTotalDiscountsGenerated(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'discount_generated').length;
  }

  private calculateTotalDiscountsUsed(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'discount_used').length;
  }

  private calculateAverageRewardValue(events: AnalyticsEvent[]): number {
    const rewardEvents = events.filter(e => e.eventType === 'reward_claimed' && e.data.value);
    if (rewardEvents.length === 0) return 0;

    const totalValue = rewardEvents.reduce((total, e) => total + e.data.value, 0);
    return totalValue / rewardEvents.length;
  }

  private calculateConversionRate(events: AnalyticsEvent[]): number {
    const generated = events.filter(e => e.eventType === 'discount_generated').length;
    const used = events.filter(e => e.eventType === 'discount_used').length;
    return generated > 0 ? used / generated : 0;
  }

  // Technical metrics
  private calculateAverageLoadTime(events: AnalyticsEvent[]): number {
    const loadEvents = events.filter(e => e.eventType === 'page_load' && e.data.loadTime);
    if (loadEvents.length === 0) return 0;

    const totalTime = loadEvents.reduce((total, e) => total + e.data.loadTime, 0);
    return totalTime / loadEvents.length;
  }

  private calculateErrorRate(events: AnalyticsEvent[]): number {
    const totalEvents = events.length;
    const errorEvents = events.filter(e => e.eventType === 'error').length;
    return totalEvents > 0 ? errorEvents / totalEvents : 0;
  }

  private calculateCrashRate(events: AnalyticsEvent[]): number {
    const sessionEvents = events.filter(e => e.eventType === 'session_start').length;
    const crashEvents = events.filter(e => e.eventType === 'crash').length;
    return sessionEvents > 0 ? crashEvents / sessionEvents : 0;
  }

  private calculateAverageResponseTime(events: AnalyticsEvent[]): number {
    const apiEvents = events.filter(e => e.eventType === 'api_call' && e.data.responseTime);
    if (apiEvents.length === 0) return 0;

    const totalTime = apiEvents.reduce((total, e) => total + e.data.responseTime, 0);
    return totalTime / apiEvents.length;
  }

  private calculateGlobalAverageSessionTime(events: AnalyticsEvent[]): number {
    const sessionEvents = events.filter(e => e.eventType === 'session_end');
    if (sessionEvents.length === 0) return 0;

    const totalTime = sessionEvents.reduce((total, e) => total + (e.data.duration || 0), 0);
    return totalTime / sessionEvents.length / 60; // Convert to minutes
  }

  private calculateTotalSessions(events: AnalyticsEvent[]): number {
    return events.filter(e => e.eventType === 'session_start').length;
  }

  // Growth metrics
  private async calculateNewUsers(period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, query user registration data
    return Math.floor(Math.random() * 200) + 50;
  }

  private async calculateRetainedUsers(period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, analyze user activity patterns
    return Math.floor(Math.random() * 150) + 30;
  }

  private async calculateUserGrowthRate(period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, calculate actual growth rate
    return 0.15 + Math.random() * 0.1;
  }

  private async calculateEngagementTrend(period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, analyze engagement over time
    return -0.02 + Math.random() * 0.1;
  }

  private async calculateRetentionTrend(period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, analyze retention trends
    return 0.03 + Math.random() * 0.05;
  }

  private async calculateChurnRate(period: { start: Date; end: Date }): Promise<number> {
    // Mock implementation - in production, calculate actual churn
    return 0.08 + Math.random() * 0.1;
  }

  // Utility methods
  private async updateAggregations(event: AnalyticsEvent): Promise<void> {
    // Update real-time aggregations based on event
    const metric = this.aggregatedData.get(event.eventType) || { count: 0, lastUpdate: new Date() };
    metric.count += 1;
    metric.lastUpdate = new Date();
    this.aggregatedData.set(event.eventType, metric);
  }

  private async sendToExternalAnalytics(event: AnalyticsEvent): Promise<void> {
    // Send to GA4
    if (typeof gtag !== 'undefined') {
      gtag('event', event.eventType, {
        user_id: event.userId,
        timestamp: event.timestamp.getTime(),
        session_id: event.sessionId,
        custom_parameters: event.data
      });
    }

    // Could also send to other analytics platforms
    console.log(`Analytics event sent to external systems: ${event.eventType}`);
  }

  private initializeMetrics(): Map<string, MetricDefinition> {
    const metrics = new Map<string, MetricDefinition>();

    // User metrics
    metrics.set('total_users', {
      name: 'Total Users',
      type: 'counter',
      description: 'Total number of registered users',
      dimensions: ['platform', 'source']
    });

    metrics.set('active_users', {
      name: 'Active Users',
      type: 'gauge',
      description: 'Number of active users in a given period',
      dimensions: ['period', 'platform']
    });

    // Engagement metrics
    metrics.set('mission_completion_rate', {
      name: 'Mission Completion Rate',
      type: 'rate',
      description: 'Percentage of started missions that are completed',
      dimensions: ['mission_type', 'difficulty']
    });

    metrics.set('session_duration', {
      name: 'Session Duration',
      type: 'histogram',
      description: 'Distribution of user session lengths',
      dimensions: ['platform', 'user_type']
    });

    // Monetization metrics
    metrics.set('reward_claim_rate', {
      name: 'Reward Claim Rate',
      type: 'rate',
      description: 'Percentage of earned rewards that are claimed',
      dimensions: ['reward_type', 'user_segment']
    });

    return metrics;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}