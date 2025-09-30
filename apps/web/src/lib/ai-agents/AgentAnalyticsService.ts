import type {
  AgentAnalytics,
  AnalyticsEvent,
  AgentPerformance,
  AgentType,
  ChatSession,
  ChatMessage,
  SessionContext,
  SafetyLevel
} from '@/types/ai-agents';

export class AgentAnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private sessionMetrics: Map<string, SessionMetrics> = new Map();
  private performanceCache: Map<string, AgentPerformance> = new Map();

  constructor() {
    // Initialize periodic analytics reporting
    this.startPeriodicReporting();
  }

  async trackSessionStart(
    sessionId: string,
    userId: string,
    agentType: AgentType,
    context: SessionContext
  ): Promise<void> {

    const event: AnalyticsEvent = {
      type: 'session_start',
      timestamp: new Date(),
      data: {
        sessionId,
        userId: this.anonymizeUserId(userId),
        agentType,
        dogId: context.dog?.id ? this.anonymizeDogId(context.dog.id) : undefined,
        entryPoint: context.entryPoint?.source,
        hasMultipleDogs: context.user?.hasMultipleDogs,
        experienceLevel: context.user?.experienceLevel,
        dogBreed: context.dog?.breed,
        dogAge: context.dog?.age ? `${context.dog.age.value}_${context.dog.age.unit}` : undefined,
        dogSize: context.dog?.size
      },
      anonymized: true,
      containsPII: false
    };

    await this.recordEvent(event);

    // Initialize session metrics
    this.sessionMetrics.set(sessionId, {
      sessionId,
      agentType,
      startTime: new Date(),
      messageCount: 0,
      actionsPerformed: 0,
      safetyFlags: 0,
      commercialInteractions: 0,
      userSatisfaction: null,
      completedSuccessfully: false
    });

    // Track with GA4
    this.trackGA4Event('ai_session_start', {
      agent_type: agentType,
      entry_point: context.entryPoint?.source,
      has_multiple_dogs: context.user?.hasMultipleDogs,
      dog_breed: context.dog?.breed,
      experience_level: context.user?.experienceLevel
    });
  }

  async trackMessage(
    sessionId: string,
    message: ChatMessage,
    processingTimeMs?: number,
    safetyLevel?: SafetyLevel
  ): Promise<void> {

    const event: AnalyticsEvent = {
      type: message.role === 'user' ? 'message_sent' : 'message_received',
      timestamp: message.timestamp,
      data: {
        sessionId,
        agentType: message.agentType,
        messageLength: message.content.length,
        processingTime: processingTimeMs,
        safetyLevel,
        hasActions: message.suggestedActions?.length || 0,
        hasCommercialContent: message.hasCommercialContent,
        tokensUsed: message.metadata?.tokens
      },
      anonymized: true,
      containsPII: false
    };

    await this.recordEvent(event);

    // Update session metrics
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (sessionMetrics) {
      sessionMetrics.messageCount++;
      if (safetyLevel && safetyLevel !== 'ok') {
        sessionMetrics.safetyFlags++;
      }
      if (message.hasCommercialContent) {
        sessionMetrics.commercialInteractions++;
      }
    }

    // Track with GA4
    this.trackGA4Event(message.role === 'user' ? 'ai_message_user' : 'ai_message_assistant', {
      agent_type: message.agentType,
      message_length_category: this.categorizeMessageLength(message.content.length),
      safety_level: safetyLevel,
      processing_time_category: processingTimeMs ? this.categorizeProcessingTime(processingTimeMs) : undefined,
      has_actions: (message.suggestedActions?.length || 0) > 0,
      has_commercial_content: message.hasCommercialContent
    });
  }

  async trackActionPerformed(
    sessionId: string,
    agentType: AgentType,
    actionType: string,
    actionParams: any,
    success: boolean,
    errorCode?: string
  ): Promise<void> {

    const event: AnalyticsEvent = {
      type: 'action_performed',
      timestamp: new Date(),
      data: {
        sessionId,
        agentType,
        actionType,
        success,
        errorCode,
        // Anonymize action params
        actionCategory: this.categorizeAction(actionType),
        hasProductInteraction: actionType.includes('product') || actionType.includes('suggest'),
        hasExternalRedirect: actionType.includes('open') || actionType.includes('search')
      },
      anonymized: true,
      containsPII: false
    };

    await this.recordEvent(event);

    // Update session metrics
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (sessionMetrics) {
      sessionMetrics.actionsPerformed++;
    }

    // Track with GA4
    this.trackGA4Event('ai_action_performed', {
      agent_type: agentType,
      action_type: actionType,
      action_category: this.categorizeAction(actionType),
      success: success,
      error_code: errorCode
    });
  }

  async trackSafetyIncident(
    sessionId: string,
    agentType: AgentType,
    safetyLevel: SafetyLevel,
    flagTypes: string[],
    isEmergency: boolean
  ): Promise<void> {

    const event: AnalyticsEvent = {
      type: 'safety_triggered',
      timestamp: new Date(),
      data: {
        sessionId,
        agentType,
        safetyLevel,
        flagCount: flagTypes.length,
        isEmergency,
        flagTypes: flagTypes.join(','),
        handled: true
      },
      anonymized: true,
      containsPII: false
    };

    await this.recordEvent(event);

    // Track with GA4
    this.trackGA4Event('ai_safety_triggered', {
      agent_type: agentType,
      safety_level: safetyLevel,
      flag_count: flagTypes.length,
      is_emergency: isEmergency,
      flag_types: flagTypes.join(',')
    });

    // Alert monitoring system for critical safety events
    if (isEmergency || safetyLevel === 'urgent') {
      await this.alertMonitoringSystem({
        type: 'safety_incident',
        sessionId,
        agentType,
        safetyLevel,
        isEmergency,
        timestamp: new Date()
      });
    }
  }

  async trackSessionEnd(
    sessionId: string,
    reason: 'user_ended' | 'timeout' | 'error' | 'completed',
    userSatisfaction?: number
  ): Promise<void> {

    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (!sessionMetrics) return;

    const duration = Date.now() - sessionMetrics.startTime.getTime();

    const event: AnalyticsEvent = {
      type: 'session_end',
      timestamp: new Date(),
      data: {
        sessionId,
        agentType: sessionMetrics.agentType,
        duration: Math.round(duration / 1000), // seconds
        messageCount: sessionMetrics.messageCount,
        actionsPerformed: sessionMetrics.actionsPerformed,
        safetyFlags: sessionMetrics.safetyFlags,
        commercialInteractions: sessionMetrics.commercialInteractions,
        endReason: reason,
        userSatisfaction,
        completedSuccessfully: reason === 'completed'
      },
      anonymized: true,
      containsPII: false
    };

    await this.recordEvent(event);

    // Update session metrics
    sessionMetrics.userSatisfaction = userSatisfaction;
    sessionMetrics.completedSuccessfully = reason === 'completed';

    // Track with GA4
    this.trackGA4Event('ai_session_end', {
      agent_type: sessionMetrics.agentType,
      duration_category: this.categorizeDuration(duration),
      message_count: sessionMetrics.messageCount,
      actions_performed: sessionMetrics.actionsPerformed,
      end_reason: reason,
      user_satisfaction: userSatisfaction,
      completed_successfully: reason === 'completed'
    });

    // Clean up session metrics after recording
    this.sessionMetrics.delete(sessionId);
  }

  async generatePerformanceReport(
    agentType: AgentType,
    period: { start: Date; end: Date }
  ): Promise<AgentPerformance> {

    const cacheKey = `${agentType}_${period.start.toISOString()}_${period.end.toISOString()}`;

    // Check cache first
    const cached = this.performanceCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Filter events for the specified period and agent
    const relevantEvents = this.eventQueue.filter(event =>
      event.timestamp >= period.start &&
      event.timestamp <= period.end &&
      event.data.agentType === agentType
    );

    // Calculate metrics
    const sessionEvents = relevantEvents.filter(e => e.type === 'session_start');
    const endEvents = relevantEvents.filter(e => e.type === 'session_end');
    const messageEvents = relevantEvents.filter(e => e.type === 'message_received');
    const actionEvents = relevantEvents.filter(e => e.type === 'action_performed');
    const safetyEvents = relevantEvents.filter(e => e.type === 'safety_triggered');

    const performance: AgentPerformance = {
      agentType,
      period,
      metrics: {
        totalSessions: sessionEvents.length,
        averageSessionDuration: this.calculateAverageSessionDuration(endEvents),
        messagesPerSession: sessionEvents.length > 0 ? messageEvents.length / sessionEvents.length : 0,
        userSatisfactionScore: this.calculateAverageUserSatisfaction(endEvents),
        taskCompletionRate: this.calculateTaskCompletionRate(endEvents),
        followUpRate: this.calculateFollowUpRate(sessionEvents, endEvents),
        safetyIncidents: safetyEvents.length,
        emergencyReferrals: safetyEvents.filter(e => e.data.isEmergency).length,
        falsePositives: this.calculateFalsePositives(safetyEvents),
        productViewRate: this.calculateProductViewRate(actionEvents),
        conversionRate: this.calculateConversionRate(actionEvents),
        revenueAttribution: this.calculateRevenueAttribution(actionEvents)
      }
    };

    // Cache the result for 1 hour
    this.performanceCache.set(cacheKey, performance);
    setTimeout(() => {
      this.performanceCache.delete(cacheKey);
    }, 60 * 60 * 1000);

    return performance;
  }

  async generateAnalyticsDashboard(
    agentTypes: AgentType[],
    period: { start: Date; end: Date }
  ): Promise<{
    overview: {
      totalSessions: number;
      totalMessages: number;
      totalActions: number;
      averageUserSatisfaction: number;
    };
    agentComparison: Array<{
      agentType: AgentType;
      sessions: number;
      satisfaction: number;
      completionRate: number;
      safetyIncidents: number;
    }>;
    trends: {
      dailySessions: Array<{ date: string; count: number }>;
      popularActions: Array<{ action: string; count: number }>;
      safetyTrends: Array<{ date: string; incidents: number }>;
    };
  }> {

    const relevantEvents = this.eventQueue.filter(event =>
      event.timestamp >= period.start &&
      event.timestamp <= period.end &&
      agentTypes.includes(event.data.agentType as AgentType)
    );

    // Calculate overview metrics
    const sessionEvents = relevantEvents.filter(e => e.type === 'session_start');
    const messageEvents = relevantEvents.filter(e => e.type === 'message_received');
    const actionEvents = relevantEvents.filter(e => e.type === 'action_performed');
    const endEvents = relevantEvents.filter(e => e.type === 'session_end');

    const overview = {
      totalSessions: sessionEvents.length,
      totalMessages: messageEvents.length,
      totalActions: actionEvents.length,
      averageUserSatisfaction: this.calculateAverageUserSatisfaction(endEvents)
    };

    // Calculate agent comparison
    const agentComparison = await Promise.all(
      agentTypes.map(async agentType => {
        const agentEvents = relevantEvents.filter(e => e.data.agentType === agentType);
        const agentSessionEvents = agentEvents.filter(e => e.type === 'session_start');
        const agentEndEvents = agentEvents.filter(e => e.type === 'session_end');
        const agentSafetyEvents = agentEvents.filter(e => e.type === 'safety_triggered');

        return {
          agentType,
          sessions: agentSessionEvents.length,
          satisfaction: this.calculateAverageUserSatisfaction(agentEndEvents),
          completionRate: this.calculateTaskCompletionRate(agentEndEvents),
          safetyIncidents: agentSafetyEvents.length
        };
      })
    );

    // Calculate trends
    const trends = {
      dailySessions: this.calculateDailySessions(sessionEvents, period),
      popularActions: this.calculatePopularActions(actionEvents),
      safetyTrends: this.calculateSafetyTrends(
        relevantEvents.filter(e => e.type === 'safety_triggered'),
        period
      )
    };

    return {
      overview,
      agentComparison,
      trends
    };
  }

  private async recordEvent(event: AnalyticsEvent): Promise<void> {
    // Add to local queue
    this.eventQueue.push(event);

    // Keep queue size manageable
    if (this.eventQueue.length > 10000) {
      this.eventQueue = this.eventQueue.slice(-5000);
    }

    // In production, also send to analytics backend
    await this.sendToAnalyticsBackend(event);
  }

  private async sendToAnalyticsBackend(event: AnalyticsEvent): Promise<void> {
    // In production, send to analytics service
    console.log('Analytics event:', event);
  }

  private trackGA4Event(eventName: string, parameters: Record<string, any>): void {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'ai_agents',
        ...parameters,
        // Ensure no PII in GA4
        anonymized: true
      });
    }
  }

  private anonymizeUserId(userId: string): string {
    // Simple hash for user privacy
    return `user_${this.simpleHash(userId).toString(16)}`;
  }

  private anonymizeDogId(dogId: string): string {
    return `dog_${this.simpleHash(dogId).toString(16)}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private categorizeMessageLength(length: number): string {
    if (length < 50) return 'short';
    if (length < 200) return 'medium';
    if (length < 500) return 'long';
    return 'very_long';
  }

  private categorizeProcessingTime(timeMs: number): string {
    if (timeMs < 1000) return 'fast';
    if (timeMs < 3000) return 'medium';
    if (timeMs < 10000) return 'slow';
    return 'very_slow';
  }

  private categorizeDuration(durationMs: number): string {
    const minutes = durationMs / (1000 * 60);
    if (minutes < 2) return 'very_short';
    if (minutes < 5) return 'short';
    if (minutes < 15) return 'medium';
    if (minutes < 30) return 'long';
    return 'very_long';
  }

  private categorizeAction(actionType: string): string {
    if (actionType.includes('mission')) return 'mission';
    if (actionType.includes('reminder')) return 'reminder';
    if (actionType.includes('product')) return 'product';
    if (actionType.includes('vet') || actionType.includes('search')) return 'search';
    if (actionType.includes('note')) return 'note';
    return 'other';
  }

  private calculateAverageSessionDuration(endEvents: AnalyticsEvent[]): number {
    const durations = endEvents
      .map(e => e.data.duration)
      .filter(d => typeof d === 'number');

    return durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;
  }

  private calculateAverageUserSatisfaction(endEvents: AnalyticsEvent[]): number {
    const satisfactionScores = endEvents
      .map(e => e.data.userSatisfaction)
      .filter(s => typeof s === 'number');

    return satisfactionScores.length > 0
      ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length
      : 0;
  }

  private calculateTaskCompletionRate(endEvents: AnalyticsEvent[]): number {
    const completedSessions = endEvents.filter(e => e.data.completedSuccessfully).length;
    return endEvents.length > 0 ? completedSessions / endEvents.length : 0;
  }

  private calculateFollowUpRate(sessionEvents: AnalyticsEvent[], endEvents: AnalyticsEvent[]): number {
    // Calculate percentage of users who return for another session
    // This would require user ID tracking across sessions
    return 0.15; // Mock 15% follow-up rate
  }

  private calculateFalsePositives(safetyEvents: AnalyticsEvent[]): number {
    // In production, this would track when safety flags were incorrectly triggered
    return Math.floor(safetyEvents.length * 0.05); // Mock 5% false positive rate
  }

  private calculateProductViewRate(actionEvents: AnalyticsEvent[]): number {
    const productActions = actionEvents.filter(e =>
      e.data.actionCategory === 'product' || e.data.hasProductInteraction
    );
    return actionEvents.length > 0 ? productActions.length / actionEvents.length : 0;
  }

  private calculateConversionRate(actionEvents: AnalyticsEvent[]): number {
    // Mock conversion rate calculation
    const productViews = actionEvents.filter(e => e.data.hasProductInteraction).length;
    return productViews > 0 ? productViews * 0.12 : 0; // Mock 12% conversion rate
  }

  private calculateRevenueAttribution(actionEvents: AnalyticsEvent[]): number {
    // Mock revenue attribution
    const productActions = actionEvents.filter(e => e.data.hasProductInteraction).length;
    return productActions * 25.50; // Mock €25.50 average order value
  }

  private calculateDailySessions(
    sessionEvents: AnalyticsEvent[],
    period: { start: Date; end: Date }
  ): Array<{ date: string; count: number }> {
    const dailyCounts = new Map<string, number>();

    sessionEvents.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    return Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count }));
  }

  private calculatePopularActions(actionEvents: AnalyticsEvent[]): Array<{ action: string; count: number }> {
    const actionCounts = new Map<string, number>();

    actionEvents.forEach(event => {
      const action = event.data.actionType;
      if (action) {
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      }
    });

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateSafetyTrends(
    safetyEvents: AnalyticsEvent[],
    period: { start: Date; end: Date }
  ): Array<{ date: string; incidents: number }> {
    const dailyIncidents = new Map<string, number>();

    safetyEvents.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      dailyIncidents.set(date, (dailyIncidents.get(date) || 0) + 1);
    });

    return Array.from(dailyIncidents.entries()).map(([date, incidents]) => ({ date, incidents }));
  }

  private async alertMonitoringSystem(alert: any): Promise<void> {
    // In production, send critical alerts to monitoring service
    console.warn('Critical alert:', alert);
  }

  private startPeriodicReporting(): void {
    // Send periodic analytics reports
    setInterval(async () => {
      await this.generateAndSendPeriodicReport();
    }, 60 * 60 * 1000); // Every hour
  }

  private async generateAndSendPeriodicReport(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const agentTypes: AgentType[] = ['veterinary', 'trainer', 'groomer'];

    try {
      const dashboard = await this.generateAnalyticsDashboard(agentTypes, {
        start: oneHourAgo,
        end: now
      });

      console.log('Hourly analytics report:', {
        timestamp: now.toISOString(),
        totalSessions: dashboard.overview.totalSessions,
        totalMessages: dashboard.overview.totalMessages,
        averageSatisfaction: dashboard.overview.averageUserSatisfaction,
        agentBreakdown: dashboard.agentComparison
      });

    } catch (error) {
      console.error('Failed to generate periodic report:', error);
    }
  }
}

// Supporting interface
interface SessionMetrics {
  sessionId: string;
  agentType: AgentType;
  startTime: Date;
  messageCount: number;
  actionsPerformed: number;
  safetyFlags: number;
  commercialInteractions: number;
  userSatisfaction: number | null;
  completedSuccessfully: boolean;
}