import type {
  Mission,
  MissionStep,
  UserMissionProgress,
  GamificationProfile,
  DifficultyLevel,
  MissionStatus,
  EarnedReward,
  DDAdjustment
} from '@/types/gamification';
import { DDAEngine } from './DDAEngine';

export class MissionEngine {
  private ddaEngine: DDAEngine;

  constructor(ddaEngine: DDAEngine) {
    this.ddaEngine = ddaEngine;
  }

  async createMission(
    baseMission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt' | 'stats'>,
    createdBy: 'system' | 'ai_agent' | 'admin' = 'system'
  ): Promise<Mission> {
    const mission: Mission = {
      ...baseMission,
      id: this.generateMissionId(),
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        timesStarted: 0,
        timesCompleted: 0,
        averageCompletionTime: 0,
        completionRate: 0,
        averageRating: 0
      }
    };

    // Validate mission structure
    this.validateMission(mission);

    // Apply DDA adjustments if enabled
    if (mission.ddaEnabled) {
      await this.applyDDAToMission(mission);
    }

    console.log(`Created mission: ${mission.title} (${mission.id})`);
    return mission;
  }

  async startMission(
    userId: string,
    missionId: string,
    userProfile: GamificationProfile
  ): Promise<UserMissionProgress> {
    // Check if user can start this mission
    const mission = await this.getMission(missionId);
    const canStart = await this.canUserStartMission(userId, mission, userProfile);

    if (!canStart.allowed) {
      throw new Error(`Cannot start mission: ${canStart.reason}`);
    }

    // Get current difficulty for user
    const currentDifficulty = mission.ddaEnabled
      ? await this.ddaEngine.getDifficultyForUser(userId)
      : mission.difficulty;

    // Adapt mission for current difficulty
    const adaptedMission = await this.adaptMissionForDifficulty(mission, currentDifficulty);

    const progress: UserMissionProgress = {
      userId,
      missionId,
      status: 'active',
      currentStep: 0,
      completedSteps: 0,
      totalSteps: adaptedMission.totalSteps,
      progressPercentage: 0,
      stepProgress: adaptedMission.steps.map((step, index) => ({
        stepId: step.id,
        status: index === 0 ? 'active' : 'pending',
        timeSpent: 0,
        rating: undefined,
        completedAt: undefined,
        verification: undefined
      })),
      startedAt: new Date(),
      lastActiveAt: new Date(),
      estimatedCompletionAt: new Date(Date.now() + adaptedMission.estimatedDuration * 60000),
      timeSpent: 0,
      efficiency: 0,
      qualityScore: 0,
      currentDifficulty,
      ddaAdjustments: [],
      earnedRewards: [],
      pendingRewards: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Update mission stats
    await this.updateMissionStats(missionId, { timesStarted: 1 });

    console.log(`User ${userId} started mission ${missionId} at difficulty ${currentDifficulty}`);
    return progress;
  }

  async updateStepProgress(
    userId: string,
    missionId: string,
    stepId: string,
    verification: any,
    timeSpent: number,
    rating?: number
  ): Promise<{
    stepCompleted: boolean;
    missionCompleted: boolean;
    xpEarned: number;
    progress: UserMissionProgress;
  }> {
    const progress = await this.getUserMissionProgress(userId, missionId);
    const mission = await this.getMission(missionId);

    const stepIndex = progress.stepProgress.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found in mission ${missionId}`);
    }

    const step = mission.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in mission definition`);
    }

    // Validate step completion
    const isStepComplete = await this.validateStepCompletion(step, verification);

    if (!isStepComplete) {
      throw new Error(`Step verification failed for ${stepId}`);
    }

    // Update step progress
    progress.stepProgress[stepIndex] = {
      ...progress.stepProgress[stepIndex],
      status: 'completed',
      completedAt: new Date(),
      timeSpent: timeSpent,
      verification,
      rating
    };

    // Calculate XP for step
    const xpEarned = this.calculateStepXP(step, progress.currentDifficulty, rating);

    // Update overall progress
    progress.completedSteps += 1;
    progress.timeSpent += timeSpent;
    progress.progressPercentage = progress.completedSteps / progress.totalSteps;
    progress.lastActiveAt = new Date();
    progress.updatedAt = new Date();

    // Check if mission is completed
    const missionCompleted = progress.completedSteps === progress.totalSteps;

    if (missionCompleted) {
      await this.completeMission(progress, mission);
    } else {
      // Activate next step
      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex < progress.stepProgress.length) {
        progress.stepProgress[nextStepIndex].status = 'active';
        progress.currentStep = nextStepIndex;
      }
    }

    // Update DDA if enabled and enough data
    if (mission.ddaEnabled && progress.completedSteps >= 3) {
      await this.updateDDABasedOnProgress(userId, progress, mission);
    }

    console.log(`Step ${stepId} completed for user ${userId}, XP earned: ${xpEarned}`);

    return {
      stepCompleted: true,
      missionCompleted,
      xpEarned,
      progress
    };
  }

  async pauseMission(userId: string, missionId: string): Promise<UserMissionProgress> {
    const progress = await this.getUserMissionProgress(userId, missionId);
    progress.status = 'paused';
    progress.updatedAt = new Date();

    console.log(`Mission ${missionId} paused for user ${userId}`);
    return progress;
  }

  async resumeMission(userId: string, missionId: string): Promise<UserMissionProgress> {
    const progress = await this.getUserMissionProgress(userId, missionId);
    progress.status = 'active';
    progress.lastActiveAt = new Date();
    progress.updatedAt = new Date();

    console.log(`Mission ${missionId} resumed for user ${userId}`);
    return progress;
  }

  async abandonMission(
    userId: string,
    missionId: string,
    reason: 'user_quit' | 'expired' | 'too_difficult' | 'technical_issue' = 'user_quit'
  ): Promise<void> {
    const progress = await this.getUserMissionProgress(userId, missionId);
    progress.status = 'failed';
    progress.updatedAt = new Date();

    // Update DDA if abandoned due to difficulty
    if (reason === 'too_difficult') {
      await this.ddaEngine.recordDifficultyFeedback(userId, 'too_hard', {
        missionId,
        completionPercentage: progress.progressPercentage,
        timeSpent: progress.timeSpent
      });
    }

    console.log(`Mission ${missionId} abandoned by user ${userId}, reason: ${reason}`);
  }

  private async completeMission(
    progress: UserMissionProgress,
    mission: Mission
  ): Promise<void> {
    progress.status = 'completed';
    progress.completedAt = new Date();
    progress.progressPercentage = 1;

    // Calculate efficiency and quality scores
    const estimatedTime = mission.estimatedDuration;
    progress.efficiency = estimatedTime > 0 ? Math.min(1, estimatedTime / (progress.timeSpent / 60)) : 1;

    const averageRating = progress.stepProgress
      .filter(s => s.rating)
      .reduce((sum, s) => sum + (s.rating || 0), 0) /
      progress.stepProgress.filter(s => s.rating).length || 1;
    progress.qualityScore = averageRating / 5; // Normalize to 0-1

    // Award mission rewards
    const missionXP = this.calculateMissionXP(mission, progress.currentDifficulty, progress.qualityScore);
    const rewards = await this.awardMissionRewards(progress.userId, mission, progress);

    progress.earnedRewards = [...progress.earnedRewards, ...rewards];
    progress.updatedAt = new Date();

    // Update mission stats
    await this.updateMissionStats(mission.id, {
      timesCompleted: 1,
      averageCompletionTime: progress.timeSpent,
      averageRating: averageRating
    });

    // Update DDA based on completion
    if (mission.ddaEnabled) {
      await this.ddaEngine.updatePerformanceMetrics(progress.userId, {
        completedMission: true,
        timeToComplete: progress.timeSpent,
        qualityScore: progress.qualityScore,
        efficiency: progress.efficiency
      });
    }

    console.log(`Mission ${mission.id} completed by user ${progress.userId}, total XP: ${missionXP}`);
  }

  private async canUserStartMission(
    userId: string,
    mission: Mission,
    userProfile: GamificationProfile
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check level requirement
    if (userProfile.currentLevel < mission.minLevel) {
      return { allowed: false, reason: `Requires level ${mission.minLevel}` };
    }

    // Check prerequisite missions
    if (mission.prerequisites.length > 0) {
      const completedMissions = await this.getUserCompletedMissions(userId);
      const hasPrerequisites = mission.prerequisites.every(prereq =>
        completedMissions.includes(prereq)
      );
      if (!hasPrerequisites) {
        return { allowed: false, reason: 'Missing prerequisite missions' };
      }
    }

    // Check required badges
    if (mission.requiredBadges.length > 0) {
      const hasRequiredBadges = mission.requiredBadges.every(badge =>
        userProfile.badges.includes(badge)
      );
      if (!hasRequiredBadges) {
        return { allowed: false, reason: 'Missing required badges' };
      }
    }

    // Check if mission is expired
    if (mission.expiresAt && mission.expiresAt < new Date()) {
      return { allowed: false, reason: 'Mission has expired' };
    }

    // Check if mission is active
    if (!mission.isActive) {
      return { allowed: false, reason: 'Mission is not currently active' };
    }

    return { allowed: true };
  }

  private async adaptMissionForDifficulty(
    mission: Mission,
    difficulty: DifficultyLevel
  ): Promise<Mission> {
    if (!mission.ddaEnabled) {
      return mission;
    }

    const adaptedMission = { ...mission };

    // Adapt each step based on difficulty
    adaptedMission.steps = mission.steps.map(step => {
      const difficultyModifier = step.difficultyModifiers[difficulty];
      return {
        ...step,
        ...difficultyModifier,
        xpReward: this.adjustXPForDifficulty(step.xpReward, difficulty)
      };
    });

    // Adjust overall mission properties
    switch (difficulty) {
      case 'easy':
        adaptedMission.estimatedDuration *= 0.8;
        break;
      case 'hard':
        adaptedMission.estimatedDuration *= 1.3;
        break;
      case 'adaptive':
        // Difficulty will be adjusted dynamically
        break;
      default:
        // medium - no adjustment
        break;
    }

    return adaptedMission;
  }

  private async validateStepCompletion(step: MissionStep, verification: any): Promise<boolean> {
    if (!step.verification || !step.verification.required) {
      return true;
    }

    switch (step.verification.type) {
      case 'photo':
        return this.validatePhotoSubmission(verification);
      case 'quiz':
        return this.validateQuizSubmission(verification, step.verification.data);
      case 'checklist':
        return this.validateChecklistSubmission(verification, step.verification.data);
      case 'timer':
        return this.validateTimerSubmission(verification, step.verification.data);
      case 'none':
      default:
        return true;
    }
  }

  private validatePhotoSubmission(verification: any): boolean {
    return verification && verification.photoUrl && verification.photoUrl.length > 0;
  }

  private validateQuizSubmission(verification: any, quizData: any): boolean {
    if (!verification.answers || !quizData.questions) return false;

    const requiredScore = quizData.passingScore || 0.7;
    const correctAnswers = verification.answers.filter((answer: any, index: number) =>
      answer === quizData.questions[index].correctAnswer
    ).length;

    const score = correctAnswers / quizData.questions.length;
    return score >= requiredScore;
  }

  private validateChecklistSubmission(verification: any, checklistData: any): boolean {
    if (!verification.checkedItems || !checklistData.items) return false;

    const requiredItems = checklistData.items.filter((item: any) => item.required);
    const checkedRequiredItems = requiredItems.filter((item: any) =>
      verification.checkedItems.includes(item.id)
    );

    return checkedRequiredItems.length === requiredItems.length;
  }

  private validateTimerSubmission(verification: any, timerData: any): boolean {
    const requiredMinutes = timerData.requiredMinutes || 1;
    return verification.timeSpent >= requiredMinutes;
  }

  private calculateStepXP(
    step: MissionStep,
    difficulty: DifficultyLevel,
    rating?: number
  ): number {
    let baseXP = step.xpReward;

    // Difficulty multiplier
    const difficultyMultipliers = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.5,
      adaptive: 1.2
    };

    baseXP *= difficultyMultipliers[difficulty];

    // Quality bonus based on rating
    if (rating && rating >= 4) {
      baseXP *= 1.2; // 20% bonus for high ratings
    }

    return Math.round(baseXP);
  }

  private calculateMissionXP(
    mission: Mission,
    difficulty: DifficultyLevel,
    qualityScore: number
  ): number {
    const baseXP = mission.rewards.xp;

    const difficultyMultipliers = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.5,
      adaptive: 1.2
    };

    let totalXP = baseXP * difficultyMultipliers[difficulty];

    // Quality bonus
    if (qualityScore > 0.8) {
      totalXP *= 1.3; // 30% bonus for excellent quality
    } else if (qualityScore > 0.6) {
      totalXP *= 1.1; // 10% bonus for good quality
    }

    return Math.round(totalXP);
  }

  private adjustXPForDifficulty(baseXP: number, difficulty: DifficultyLevel): number {
    const multipliers = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.5,
      adaptive: 1.2
    };
    return Math.round(baseXP * multipliers[difficulty]);
  }

  private async awardMissionRewards(
    userId: string,
    mission: Mission,
    progress: UserMissionProgress
  ): Promise<EarnedReward[]> {
    const rewards: EarnedReward[] = [];

    // Mission XP reward
    const missionXP = this.calculateMissionXP(mission, progress.currentDifficulty, progress.qualityScore);
    rewards.push({
      id: this.generateRewardId(),
      type: 'xp',
      title: 'Mission XP',
      description: `Completed ${mission.title}`,
      value: missionXP,
      status: 'pending',
      earnedAt: new Date(),
      sourceType: 'mission',
      sourceId: mission.id,
      sourceName: mission.title
    });

    // Badge rewards
    if (mission.rewards.badges) {
      for (const badgeId of mission.rewards.badges) {
        rewards.push({
          id: this.generateRewardId(),
          type: 'badge',
          title: 'Badge Earned',
          description: `Earned badge: ${badgeId}`,
          value: 0,
          status: 'pending',
          earnedAt: new Date(),
          sourceType: 'mission',
          sourceId: mission.id,
          sourceName: mission.title
        });
      }
    }

    // Item rewards
    if (mission.rewards.items) {
      for (const item of mission.rewards.items) {
        rewards.push({
          id: this.generateRewardId(),
          type: item.type,
          title: item.title,
          description: item.description,
          value: item.value,
          sku: item.sku,
          status: 'pending',
          earnedAt: new Date(),
          expiresAt: item.expiresAt,
          sourceType: 'mission',
          sourceId: mission.id,
          sourceName: mission.title
        });
      }
    }

    // Bonus rewards for exceptional performance
    if (progress.qualityScore > 0.9 && progress.efficiency > 0.8) {
      rewards.push({
        id: this.generateRewardId(),
        type: 'xp',
        title: 'Excellence Bonus',
        description: 'Bonus for exceptional mission completion',
        value: Math.round(missionXP * 0.5),
        status: 'pending',
        earnedAt: new Date(),
        sourceType: 'mission',
        sourceId: mission.id,
        sourceName: mission.title
      });
    }

    return rewards;
  }

  private async updateDDABasedOnProgress(
    userId: string,
    progress: UserMissionProgress,
    mission: Mission
  ): Promise<void> {
    // Calculate current performance indicators
    const completionRate = progress.progressPercentage;
    const averageStepTime = progress.timeSpent / progress.completedSteps;
    const expectedStepTime = mission.estimatedDuration / mission.totalSteps;
    const timeEfficiency = expectedStepTime / averageStepTime;

    // Update DDA metrics
    await this.ddaEngine.updatePerformanceMetrics(userId, {
      partialCompletion: true,
      completionPercentage: completionRate,
      averageStepTime,
      timeEfficiency
    });

    // Check if difficulty adjustment is needed
    const shouldAdjust = await this.ddaEngine.shouldAdjustDifficulty(userId);
    if (shouldAdjust.adjust) {
      const adjustment: DDAdjustment = {
        timestamp: new Date(),
        fromDifficulty: progress.currentDifficulty,
        toDifficulty: shouldAdjust.newDifficulty,
        reason: shouldAdjust.reason,
        performanceScore: shouldAdjust.performanceScore,
        adjustmentFactors: shouldAdjust.factors
      };

      progress.ddaAdjustments.push(adjustment);
      progress.currentDifficulty = shouldAdjust.newDifficulty;

      console.log(`DDA adjustment for user ${userId}: ${adjustment.fromDifficulty} -> ${adjustment.toDifficulty}`);
    }
  }

  private validateMission(mission: Mission): void {
    if (!mission.title || mission.title.length === 0) {
      throw new Error('Mission title is required');
    }

    if (!mission.steps || mission.steps.length === 0) {
      throw new Error('Mission must have at least one step');
    }

    if (mission.totalSteps !== mission.steps.length) {
      throw new Error('Mission totalSteps must match actual steps count');
    }

    // Validate each step
    mission.steps.forEach((step, index) => {
      if (step.order !== index) {
        throw new Error(`Step order mismatch at index ${index}`);
      }
      if (!step.title || step.title.length === 0) {
        throw new Error(`Step ${index} must have a title`);
      }
    });
  }

  private async applyDDAToMission(mission: Mission): Promise<void> {
    // Add adaptive adjustments to the mission
    mission.adaptiveAdjustments = [{
      timestamp: new Date(),
      fromDifficulty: mission.difficulty,
      toDifficulty: 'adaptive',
      reason: 'Mission enabled for DDA',
      performanceScore: 0.5,
      adjustmentFactors: {
        completionRate: 0,
        streakFactor: 0,
        engagementRate: 0,
        dropRate: 0
      }
    }];
  }

  // Utility methods
  private generateMissionId(): string {
    return `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRewardId(): string {
    return `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock data access methods (replace with actual database calls)
  private async getMission(missionId: string): Promise<Mission> {
    // Mock implementation - replace with actual database query
    console.log(`Getting mission ${missionId}`);
    throw new Error('getMission not implemented - replace with database query');
  }

  private async getUserMissionProgress(userId: string, missionId: string): Promise<UserMissionProgress> {
    // Mock implementation - replace with actual database query
    console.log(`Getting mission progress for user ${userId}, mission ${missionId}`);
    throw new Error('getUserMissionProgress not implemented - replace with database query');
  }

  private async getUserCompletedMissions(userId: string): Promise<string[]> {
    // Mock implementation - replace with actual database query
    console.log(`Getting completed missions for user ${userId}`);
    return [];
  }

  private async updateMissionStats(
    missionId: string,
    updates: Partial<Mission['stats']>
  ): Promise<void> {
    // Mock implementation - replace with actual database update
    console.log(`Updating mission ${missionId} stats:`, updates);
  }
}