import type {
  DDAEngine,
  DDAdjustment,
  DifficultyLevel,
  GamificationProfile,
  UserMissionProgress,
  Mission
} from '@/types/gamification';

export class DynamicDifficultyAdjustment {
  private ddaEngines: Map<string, DDAEngine> = new Map();
  private adjustmentCooldown = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.initializeDefaultThresholds();
  }

  async initializeUserDDA(userId: string, profile: GamificationProfile): Promise<DDAEngine> {
    const ddaEngine: DDAEngine = {
      userId,
      currentPerformanceScore: this.calculateInitialPerformanceScore(profile),
      metrics: {
        completionRate: profile.completionRate || 0.5,
        averageTimeToComplete: profile.averageTimeToComplete || 30,
        streakDays: profile.streakDays || 0,
        dropRate: profile.dropRate || 0.3,
        engagementRate: profile.engagementRate || 0.5,
        sessionFrequency: this.calculateSessionFrequency(profile)
      },
      adaptationSensitivity: this.determineAdaptationSensitivity(profile),
      minDifficulty: 'easy',
      maxDifficulty: 'hard',
      adjustmentHistory: [],
      lastAdjustmentAt: new Date(0), // Initialize to epoch
      thresholds: {
        decreaseDifficulty: 0.4,
        maintainDifficulty: { min: 0.4, max: 0.7 },
        increaseDifficulty: 0.7
      }
    };

    this.ddaEngines.set(userId, ddaEngine);
    return ddaEngine;
  }

  async evaluateAndAdjustDifficulty(
    userId: string,
    missionProgress: UserMissionProgress
  ): Promise<DDAdjustment | null> {

    const ddaEngine = this.ddaEngines.get(userId);
    if (!ddaEngine) {
      console.warn(`DDA Engine not found for user ${userId}`);
      return null;
    }

    // Check if enough time has passed since last adjustment
    if (Date.now() - ddaEngine.lastAdjustmentAt.getTime() < this.adjustmentCooldown) {
      return null;
    }

    // Update metrics based on mission progress
    await this.updateMetrics(ddaEngine, missionProgress);

    // Calculate new performance score
    const newPerformanceScore = this.calculatePerformanceScore(ddaEngine);
    const oldDifficulty = missionProgress.currentDifficulty;

    // Determine if adjustment is needed
    const adjustmentNeeded = this.shouldAdjustDifficulty(newPerformanceScore, ddaEngine.thresholds);

    if (!adjustmentNeeded.adjust) {
      return null;
    }

    const newDifficulty = this.getNewDifficulty(
      oldDifficulty,
      adjustmentNeeded.direction,
      ddaEngine.minDifficulty,
      ddaEngine.maxDifficulty
    );

    if (newDifficulty === oldDifficulty) {
      return null; // No actual change needed
    }

    // Create adjustment record
    const adjustment: DDAdjustment = {
      timestamp: new Date(),
      fromDifficulty: oldDifficulty,
      toDifficulty: newDifficulty,
      reason: this.generateAdjustmentReason(adjustmentNeeded.direction, newPerformanceScore),
      performanceScore: newPerformanceScore,
      adjustmentFactors: {
        completionRate: ddaEngine.metrics.completionRate,
        streakFactor: this.calculateStreakFactor(ddaEngine.metrics.streakDays),
        engagementRate: ddaEngine.metrics.engagementRate,
        dropRate: ddaEngine.metrics.dropRate
      }
    };

    // Update DDA engine
    ddaEngine.currentPerformanceScore = newPerformanceScore;
    ddaEngine.adjustmentHistory.push(adjustment);
    ddaEngine.lastAdjustmentAt = new Date();

    // Keep history manageable
    if (ddaEngine.adjustmentHistory.length > 50) {
      ddaEngine.adjustmentHistory = ddaEngine.adjustmentHistory.slice(-25);
    }

    await this.logDDAEvent(userId, adjustment);

    return adjustment;
  }

  async adaptMissionForDifficulty(
    mission: Mission,
    targetDifficulty: DifficultyLevel,
    userProfile: GamificationProfile
  ): Promise<Mission> {

    const adaptedMission = { ...mission };

    switch (targetDifficulty) {
      case 'easy':
        adaptedMission.steps = this.adaptStepsForEasy(mission.steps);
        adaptedMission.estimatedDuration = Math.ceil(mission.estimatedDuration * 0.7);
        adaptedMission.rewards.xp = Math.ceil(mission.rewards.xp * 0.8);
        break;

      case 'medium':
        // Keep original mission as-is for medium difficulty
        break;

      case 'hard':
        adaptedMission.steps = this.adaptStepsForHard(mission.steps);
        adaptedMission.estimatedDuration = Math.ceil(mission.estimatedDuration * 1.3);
        adaptedMission.rewards.xp = Math.ceil(mission.rewards.xp * 1.2);
        break;

      case 'adaptive':
        const ddaEngine = this.ddaEngines.get(userProfile.userId);
        const recommendedDifficulty = ddaEngine
          ? this.recommendDifficultyLevel(ddaEngine.currentPerformanceScore)
          : 'medium';
        return this.adaptMissionForDifficulty(mission, recommendedDifficulty, userProfile);
    }

    adaptedMission.difficulty = targetDifficulty;
    return adaptedMission;
  }

  private calculateInitialPerformanceScore(profile: GamificationProfile): number {
    // Start with a baseline score for new users
    if (profile.totalMissionsCompleted === 0) {
      return 0.5; // Neutral starting point
    }

    // Calculate based on existing data
    const completionWeight = 0.4;
    const streakWeight = 0.3;
    const engagementWeight = 0.2;
    const experienceWeight = 0.1;

    const completionScore = profile.completionRate || 0.5;
    const streakScore = Math.min(profile.streakDays / 14, 1); // Max at 14 days
    const engagementScore = profile.engagementRate || 0.5;
    const experienceScore = Math.min(profile.currentLevel / 20, 1); // Max at level 20

    return (
      completionScore * completionWeight +
      streakScore * streakWeight +
      engagementScore * engagementWeight +
      experienceScore * experienceWeight
    );
  }

  private calculateSessionFrequency(profile: GamificationProfile): number {
    const daysSinceCreation = Math.max(
      1,
      Math.floor((Date.now() - profile.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    );

    return profile.totalActiveDays / daysSinceCreation;
  }

  private determineAdaptationSensitivity(profile: GamificationProfile): number {
    // Higher sensitivity for new users, lower for experienced users
    const experienceFactor = Math.min(profile.totalMissionsCompleted / 10, 1);
    return 0.8 - (experienceFactor * 0.3); // Range: 0.5 to 0.8
  }

  private async updateMetrics(ddaEngine: DDAEngine, progress: UserMissionProgress): Promise<void> {
    // Update completion rate
    const recentMissions = await this.getRecentMissionProgress(ddaEngine.userId, 10);
    ddaEngine.metrics.completionRate = this.calculateCompletionRate(recentMissions);

    // Update average time to complete
    ddaEngine.metrics.averageTimeToComplete = this.calculateAverageTimeToComplete(recentMissions);

    // Update drop rate
    ddaEngine.metrics.dropRate = this.calculateDropRate(recentMissions);

    // Update engagement rate (based on time spent vs estimated)
    ddaEngine.metrics.engagementRate = this.calculateEngagementRate(recentMissions);

    // Streak days should be updated by the streak tracker
    // Session frequency should be updated by activity tracker
  }

  private calculatePerformanceScore(ddaEngine: DDAEngine): number {
    const { metrics } = ddaEngine;

    // Weights for different metrics
    const weights = {
      completion: 0.4,
      streak: 0.3,
      engagement: 0.2,
      dropPenalty: -0.1
    };

    const completionScore = metrics.completionRate;
    const streakScore = this.calculateStreakFactor(metrics.streakDays);
    const engagementScore = metrics.engagementRate;
    const dropPenalty = metrics.dropRate;

    const rawScore = (
      completionScore * weights.completion +
      streakScore * weights.streak +
      engagementScore * weights.engagement +
      dropPenalty * weights.dropPenalty
    );

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, rawScore));
  }

  private calculateStreakFactor(streakDays: number): number {
    // Logarithmic scaling to prevent endless difficulty increases
    if (streakDays === 0) return 0;
    return Math.min(1, Math.log(streakDays + 1) / Math.log(15)); // Max at 15 days
  }

  private shouldAdjustDifficulty(
    performanceScore: number,
    thresholds: DDAEngine['thresholds']
  ): { adjust: boolean; direction?: 'up' | 'down' } {

    if (performanceScore < thresholds.decreaseDifficulty) {
      return { adjust: true, direction: 'down' };
    }

    if (performanceScore > thresholds.increaseDifficulty) {
      return { adjust: true, direction: 'up' };
    }

    return { adjust: false };
  }

  private getNewDifficulty(
    currentDifficulty: DifficultyLevel,
    direction: 'up' | 'down',
    minDifficulty: DifficultyLevel,
    maxDifficulty: DifficultyLevel
  ): DifficultyLevel {

    const difficultyOrder: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);
    const minIndex = difficultyOrder.indexOf(minDifficulty);
    const maxIndex = difficultyOrder.indexOf(maxDifficulty);

    let newIndex = currentIndex;

    if (direction === 'up' && currentIndex < maxIndex) {
      newIndex = currentIndex + 1;
    } else if (direction === 'down' && currentIndex > minIndex) {
      newIndex = currentIndex - 1;
    }

    return difficultyOrder[newIndex];
  }

  private generateAdjustmentReason(direction: 'up' | 'down', performanceScore: number): string {
    if (direction === 'up') {
      return `Performance excellent (${(performanceScore * 100).toFixed(1)}%) - increasing challenge`;
    } else {
      return `Performance needs support (${(performanceScore * 100).toFixed(1)}%) - providing easier tasks`;
    }
  }

  private recommendDifficultyLevel(performanceScore: number): DifficultyLevel {
    if (performanceScore < 0.4) return 'easy';
    if (performanceScore > 0.7) return 'hard';
    return 'medium';
  }

  private adaptStepsForEasy(steps: any[]): any[] {
    return steps.map(step => {
      const adapted = { ...step };

      // Reduce estimated time by 30%
      adapted.estimatedMinutes = Math.ceil(step.estimatedMinutes * 0.7);

      // Add more detailed instructions
      if (step.instructions) {
        adapted.instructions = step.instructions + '\n\n💡 Suggerimento: Prenditi tutto il tempo che ti serve e ricorda di premiare il tuo cane per ogni piccolo progresso!';
      }

      // Make verification optional
      if (adapted.verification && adapted.verification.required) {
        adapted.verification.required = false;
      }

      // Add more tips
      if (!adapted.tips) adapted.tips = [];
      adapted.tips.push('Se hai difficoltà, prova sessioni più brevi di 2-3 minuti');

      return adapted;
    });
  }

  private adaptStepsForHard(steps: any[]): any[] {
    return steps.map(step => {
      const adapted = { ...step };

      // Increase estimated time by 30%
      adapted.estimatedMinutes = Math.ceil(step.estimatedMinutes * 1.3);

      // Add complexity to instructions
      if (step.instructions) {
        adapted.instructions = step.instructions + '\n\n🎯 Sfida avanzata: Prova ad aggiungere una distrazione controllata per testare la solidità dell\'apprendimento.';
      }

      // Make verification required
      if (adapted.verification) {
        adapted.verification.required = true;
      }

      // Add advanced tips
      if (!adapted.tips) adapted.tips = [];
      adapted.tips.push('Mantieni sessioni più lunghe (10-15 minuti) per consolidare l\'apprendimento');

      return adapted;
    });
  }

  private async getRecentMissionProgress(userId: string, count: number): Promise<UserMissionProgress[]> {
    // In real implementation, fetch from database
    // For now, return mock data
    return [];
  }

  private calculateCompletionRate(missions: UserMissionProgress[]): number {
    if (missions.length === 0) return 0.5; // Default for new users

    const completed = missions.filter(m => m.status === 'completed').length;
    return completed / missions.length;
  }

  private calculateAverageTimeToComplete(missions: UserMissionProgress[]): number {
    const completedMissions = missions.filter(m => m.status === 'completed');
    if (completedMissions.length === 0) return 30; // Default 30 minutes

    const totalTime = completedMissions.reduce((sum, m) => sum + m.timeSpent, 0);
    return totalTime / completedMissions.length;
  }

  private calculateDropRate(missions: UserMissionProgress[]): number {
    if (missions.length === 0) return 0.3; // Default 30% drop rate

    const dropped = missions.filter(m => m.status === 'failed' ||
      (m.status === 'active' && this.isStagnant(m))).length;

    return dropped / missions.length;
  }

  private calculateEngagementRate(missions: UserMissionProgress[]): number {
    const completedMissions = missions.filter(m => m.status === 'completed');
    if (completedMissions.length === 0) return 0.5;

    // Calculate based on efficiency (actual time vs estimated time)
    const efficiencyScores = completedMissions.map(m => m.efficiency || 0.5);
    const averageEfficiency = efficiencyScores.reduce((sum, eff) => sum + eff, 0) / efficiencyScores.length;

    return Math.min(1, averageEfficiency);
  }

  private isStagnant(mission: UserMissionProgress): boolean {
    const daysSinceLastActivity = (Date.now() - mission.lastActiveAt.getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceLastActivity > 3; // Consider stagnant after 3 days of inactivity
  }

  private async logDDAEvent(userId: string, adjustment: DDAdjustment): Promise<void> {
    console.log('DDA Adjustment:', {
      userId: this.anonymizeUserId(userId),
      from: adjustment.fromDifficulty,
      to: adjustment.toDifficulty,
      reason: adjustment.reason,
      performanceScore: adjustment.performanceScore
    });

    // Track with analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'dda_adjustment', {
        event_category: 'gamification',
        from_difficulty: adjustment.fromDifficulty,
        to_difficulty: adjustment.toDifficulty,
        performance_score: Math.round(adjustment.performanceScore * 100),
        direction: adjustment.fromDifficulty === adjustment.toDifficulty ? 'none' :
          this.getDifficultyDirection(adjustment.fromDifficulty, adjustment.toDifficulty)
      });
    }
  }

  private getDifficultyDirection(from: DifficultyLevel, to: DifficultyLevel): 'up' | 'down' | 'none' {
    const order = { 'easy': 1, 'medium': 2, 'hard': 3, 'adaptive': 2 };
    const fromLevel = order[from];
    const toLevel = order[to];

    if (toLevel > fromLevel) return 'up';
    if (toLevel < fromLevel) return 'down';
    return 'none';
  }

  private anonymizeUserId(userId: string): string {
    // Simple hash for privacy
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `user_${Math.abs(hash).toString(16)}`;
  }

  // Public methods for external use
  async getUserDDAEngine(userId: string): Promise<DDAEngine | null> {
    return this.ddaEngines.get(userId) || null;
  }

  async getRecommendedDifficulty(userId: string): Promise<DifficultyLevel> {
    const ddaEngine = this.ddaEngines.get(userId);
    if (!ddaEngine) return 'medium';

    return this.recommendDifficultyLevel(ddaEngine.currentPerformanceScore);
  }

  async getDDAInsights(userId: string): Promise<{
    currentPerformanceScore: number;
    recommendedDifficulty: DifficultyLevel;
    recentAdjustments: DDAdjustment[];
    strengths: string[];
    improvementAreas: string[];
  }> {
    const ddaEngine = this.ddaEngines.get(userId);
    if (!ddaEngine) {
      return {
        currentPerformanceScore: 0.5,
        recommendedDifficulty: 'medium',
        recentAdjustments: [],
        strengths: [],
        improvementAreas: []
      };
    }

    const strengths = this.identifyStrengths(ddaEngine);
    const improvementAreas = this.identifyImprovementAreas(ddaEngine);

    return {
      currentPerformanceScore: ddaEngine.currentPerformanceScore,
      recommendedDifficulty: this.recommendDifficultyLevel(ddaEngine.currentPerformanceScore),
      recentAdjustments: ddaEngine.adjustmentHistory.slice(-5),
      strengths,
      improvementAreas
    };
  }

  private identifyStrengths(ddaEngine: DDAEngine): string[] {
    const strengths: string[] = [];
    const { metrics } = ddaEngine;

    if (metrics.completionRate > 0.8) {
      strengths.push('Eccellente tasso di completamento missioni');
    }
    if (metrics.streakDays > 7) {
      strengths.push('Costanza nell\'utilizzo dell\'app');
    }
    if (metrics.engagementRate > 0.7) {
      strengths.push('Alto livello di coinvolgimento');
    }
    if (metrics.dropRate < 0.2) {
      strengths.push('Ottima persistenza nelle attività');
    }

    return strengths;
  }

  private identifyImprovementAreas(ddaEngine: DDAEngine): string[] {
    const areas: string[] = [];
    const { metrics } = ddaEngine;

    if (metrics.completionRate < 0.5) {
      areas.push('Completamento delle missioni');
    }
    if (metrics.streakDays < 3) {
      areas.push('Costanza nell\'utilizzo quotidiano');
    }
    if (metrics.engagementRate < 0.5) {
      areas.push('Coinvolgimento nelle attività');
    }
    if (metrics.dropRate > 0.4) {
      areas.push('Persistenza nelle missioni difficili');
    }

    return areas;
  }

  private initializeDefaultThresholds(): void {
    // Could be loaded from configuration
    console.log('DDA Engine initialized with default thresholds');
  }
}