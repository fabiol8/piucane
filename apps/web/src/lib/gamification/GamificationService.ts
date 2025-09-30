import type {
  GamificationProfile,
  Mission,
  UserMissionProgress,
  Badge,
  UserBadge,
  EarnedReward,
  GamificationEvent,
  Level,
  StreakTracker,
  GamificationAnalytics
} from '@/types/gamification';

import { DDAEngine } from './DDAEngine';
import { MissionEngine } from './MissionEngine';
import { BadgeEngine } from './BadgeEngine';

export class GamificationService {
  private ddaEngine: DDAEngine;
  private missionEngine: MissionEngine;
  private badgeEngine: BadgeEngine;

  constructor() {
    this.ddaEngine = new DDAEngine();
    this.missionEngine = new MissionEngine(this.ddaEngine);
    this.badgeEngine = new BadgeEngine();
  }

  // User Profile Management
  async getUserProfile(userId: string): Promise<GamificationProfile> {
    // In production, fetch from database
    const profile = await this.fetchUserProfile(userId);
    return profile;
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<GamificationProfile>
  ): Promise<GamificationProfile> {
    const profile = await this.getUserProfile(userId);
    const updatedProfile = { ...profile, ...updates, updatedAt: new Date() };

    // Save to database
    await this.saveUserProfile(userId, updatedProfile);

    console.log(`User profile updated for ${userId}`);
    return updatedProfile;
  }

  async calculateLevelProgress(currentXP: number): Promise<{
    currentLevel: number;
    xpToNextLevel: number;
    levelProgress: number;
    nextLevelInfo: Level;
  }> {
    const levels = await this.getLevelDefinitions();

    let currentLevel = 1;
    for (const level of levels) {
      if (currentXP >= level.requiredXP) {
        currentLevel = level.level;
      } else {
        break;
      }
    }

    const nextLevel = levels.find(l => l.level === currentLevel + 1);
    if (!nextLevel) {
      // Max level reached
      return {
        currentLevel,
        xpToNextLevel: 0,
        levelProgress: 1,
        nextLevelInfo: levels[levels.length - 1]
      };
    }

    const currentLevelXP = levels.find(l => l.level === currentLevel)?.requiredXP || 0;
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevel.requiredXP - currentLevelXP;
    const levelProgress = xpInCurrentLevel / xpNeededForNextLevel;
    const xpToNextLevel = nextLevel.requiredXP - currentXP;

    return {
      currentLevel,
      xpToNextLevel,
      levelProgress,
      nextLevelInfo: nextLevel
    };
  }

  // Mission Management
  async startMission(userId: string, missionId: string): Promise<{
    progress: UserMissionProgress;
    profileUpdates: Partial<GamificationProfile>;
  }> {
    const userProfile = await this.getUserProfile(userId);
    const progress = await this.missionEngine.startMission(userId, missionId, userProfile);

    // Update user profile
    const profileUpdates: Partial<GamificationProfile> = {
      currentActiveMissions: [...userProfile.currentActiveMissions, missionId],
      totalMissionsStarted: userProfile.totalMissionsStarted + 1,
      lastActivityAt: new Date()
    };

    await this.updateUserProfile(userId, profileUpdates);

    // Log event
    await this.logGamificationEvent(userId, 'mission_started', {
      missionId,
      difficulty: progress.currentDifficulty
    });

    return { progress, profileUpdates };
  }

  async updateMissionStep(
    userId: string,
    missionId: string,
    stepId: string,
    verification: any,
    timeSpent: number,
    rating?: number
  ): Promise<{
    stepResult: any;
    badgeUpdates: { newBadges: Badge[]; progressUpdates: any[] };
    profileUpdates: Partial<GamificationProfile>;
    rewards: EarnedReward[];
  }> {
    // Update step progress
    const stepResult = await this.missionEngine.updateStepProgress(
      userId,
      missionId,
      stepId,
      verification,
      timeSpent,
      rating
    );

    // Update user profile with XP and activity
    const userProfile = await this.getUserProfile(userId);
    const profileUpdates: Partial<GamificationProfile> = {
      totalXP: userProfile.totalXP + stepResult.xpEarned,
      lastActivityAt: new Date()
    };

    // Check for level up
    const levelProgress = await this.calculateLevelProgress(profileUpdates.totalXP!);
    if (levelProgress.currentLevel > userProfile.currentLevel) {
      profileUpdates.currentLevel = levelProgress.currentLevel;

      // Award level up rewards
      await this.processLevelUpRewards(userId, levelProgress.currentLevel);

      // Log level up event
      await this.logGamificationEvent(userId, 'level_up', {
        newLevel: levelProgress.currentLevel,
        previousLevel: userProfile.currentLevel
      });
    }

    profileUpdates.xpToNextLevel = levelProgress.xpToNextLevel;
    profileUpdates.levelProgress = levelProgress.levelProgress;

    // If mission completed, update mission-related profile data
    if (stepResult.missionCompleted) {
      profileUpdates.totalMissionsCompleted = userProfile.totalMissionsCompleted + 1;
      profileUpdates.currentActiveMissions = userProfile.currentActiveMissions.filter(id => id !== missionId);

      // Update completion rate
      profileUpdates.completionRate = (userProfile.totalMissionsCompleted + 1) / userProfile.totalMissionsStarted;

      // Update streak
      const streakUpdate = await this.updateStreak(userId);
      Object.assign(profileUpdates, streakUpdate);
    }

    await this.updateUserProfile(userId, profileUpdates);

    // Check badge eligibility
    const badgeUpdates = await this.badgeEngine.checkBadgeEligibility(
      userId,
      { ...userProfile, ...profileUpdates } as GamificationProfile,
      {
        type: stepResult.missionCompleted ? 'mission_completed' : undefined,
        data: stepResult
      }
    );

    // Award badge XP bonuses
    let badgeXP = 0;
    for (const badge of badgeUpdates.newBadges) {
      badgeXP += badge.xpBonus;
      await this.logGamificationEvent(userId, 'badge_earned', {
        badgeId: badge.id,
        badgeName: badge.name,
        rarity: badge.rarity
      });
    }

    if (badgeXP > 0) {
      await this.updateUserProfile(userId, {
        totalXP: (profileUpdates.totalXP || userProfile.totalXP) + badgeXP
      });
    }

    // Collect all rewards
    const rewards: EarnedReward[] = [
      ...stepResult.progress.earnedRewards,
      ...stepResult.progress.pendingRewards
    ];

    // Log step completion event
    await this.logGamificationEvent(userId, 'step_completed', {
      missionId,
      stepId,
      xpEarned: stepResult.xpEarned,
      missionCompleted: stepResult.missionCompleted,
      timeSpent,
      rating
    });

    return {
      stepResult,
      badgeUpdates,
      profileUpdates,
      rewards
    };
  }

  // Streak Management
  async updateStreak(userId: string): Promise<Partial<GamificationProfile>> {
    const streakTracker = await this.getStreakTracker(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivityDate = new Date(streakTracker.lastActivityDate);
    lastActivityDate.setHours(0, 0, 0, 0);

    const daysDifference = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    let updates: Partial<GamificationProfile> = {
      lastActivityAt: new Date()
    };

    if (daysDifference === 0) {
      // Same day activity - no streak change
      return updates;
    } else if (daysDifference === 1) {
      // Consecutive day - increment streak
      const newStreak = streakTracker.currentStreak + 1;
      updates.streakDays = newStreak;
      updates.longestStreak = Math.max(streakTracker.longestStreak, newStreak);

      // Check for streak milestones
      await this.checkStreakMilestones(userId, newStreak);

      await this.updateStreakTracker(userId, {
        currentStreak: newStreak,
        lastActivityDate: new Date(),
        longestStreak: updates.longestStreak!
      });

      console.log(`Streak updated for user ${userId}: ${newStreak} days`);
    } else {
      // Streak broken
      updates.streakDays = 1; // Start new streak

      await this.updateStreakTracker(userId, {
        currentStreak: 1,
        lastActivityDate: new Date()
      });

      await this.logGamificationEvent(userId, 'streak_broken', {
        previousStreak: streakTracker.currentStreak,
        daysMissed: daysDifference - 1
      });

      console.log(`Streak broken for user ${userId}, starting new streak`);
    }

    return updates;
  }

  private async checkStreakMilestones(userId: string, streakDays: number): Promise<void> {
    const milestones = [3, 7, 14, 30, 60, 100, 365];

    if (milestones.includes(streakDays)) {
      // Award streak milestone badge
      await this.badgeEngine.checkBadgeEligibility(
        userId,
        await this.getUserProfile(userId),
        {
          type: 'streak_achieved',
          data: { streakDays }
        }
      );

      // Award streak rewards
      const rewards = await this.getStreakMilestoneRewards(streakDays);
      if (rewards.length > 0) {
        await this.awardRewards(userId, rewards);
      }

      console.log(`Streak milestone ${streakDays} reached for user ${userId}`);
    }
  }

  // Analytics and Reporting
  async getUserAnalytics(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<GamificationAnalytics> {
    // In production, query analytics database
    return {
      userId,
      period,
      totalXPEarned: await this.getXPEarnedInPeriod(userId, period),
      missionsCompleted: await this.getMissionsCompletedInPeriod(userId, period),
      badgesEarned: await this.getBadgesEarnedInPeriod(userId, period),
      levelsGained: await this.getLevelsGainedInPeriod(userId, period),
      streakDays: await this.getMaxStreakInPeriod(userId, period),
      dailyActiveDays: await this.getActiveDaysInPeriod(userId, period),
      averageSessionTime: await this.getAverageSessionTime(userId, period),
      missionCompletionRate: await this.getMissionCompletionRate(userId, period),
      retentionRate: await this.getRetentionRate(userId, period),
      averageMissionRating: await this.getAverageMissionRating(userId, period),
      averageTimeToComplete: await this.getAverageTimeToComplete(userId, period),
      difficultyPreference: await this.getDifficultyPreference(userId),
      dropRate: await this.getDropRate(userId, period),
      rewardsClaimed: await this.getRewardsClaimed(userId, period),
      discountsUsed: await this.getDiscountsUsed(userId, period),
      totalRewardValue: await this.getTotalRewardValue(userId, period)
    };
  }

  // Dashboard Data
  async getUserDashboard(userId: string): Promise<{
    profile: GamificationProfile;
    activeMissions: UserMissionProgress[];
    displayBadges: Array<UserBadge & { badge: Badge }>;
    recentRewards: EarnedReward[];
    streakInfo: StreakTracker;
    levelProgress: Awaited<ReturnType<typeof this.calculateLevelProgress>>;
    weeklyProgress: {
      xpEarned: number;
      missionsCompleted: number;
      badgesEarned: number;
      streakDays: number;
    };
  }> {
    const profile = await this.getUserProfile(userId);
    const activeMissions = await this.getUserActiveMissions(userId);
    const displayBadges = await this.badgeEngine.getUserDisplayBadges(userId);
    const recentRewards = await this.getRecentRewards(userId, 10);
    const streakInfo = await this.getStreakTracker(userId);
    const levelProgress = await this.calculateLevelProgress(profile.totalXP);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyProgress = {
      xpEarned: await this.getXPEarnedInPeriod(userId, { start: weekStart, end: new Date() }),
      missionsCompleted: await this.getMissionsCompletedInPeriod(userId, { start: weekStart, end: new Date() }),
      badgesEarned: await this.getBadgesEarnedInPeriod(userId, { start: weekStart, end: new Date() }),
      streakDays: profile.streakDays
    };

    return {
      profile,
      activeMissions,
      displayBadges,
      recentRewards,
      streakInfo,
      levelProgress,
      weeklyProgress
    };
  }

  // Event Logging
  private async logGamificationEvent(
    userId: string,
    type: GamificationEvent['type'],
    data: any
  ): Promise<void> {
    const event: GamificationEvent = {
      id: this.generateEventId(),
      userId,
      type,
      data,
      timestamp: new Date(),
      source: 'app',
      anonymized: false,
      containsPII: false
    };

    // In production, save to analytics database
    console.log(`Gamification event: ${type} for user ${userId}`, data);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'gamification_action', {
        action: type,
        user_id: userId,
        custom_parameters: data
      });
    }
  }

  // Reward Management
  private async awardRewards(userId: string, rewards: EarnedReward[]): Promise<void> {
    for (const reward of rewards) {
      await this.logGamificationEvent(userId, 'reward_claimed', {
        rewardId: reward.id,
        rewardType: reward.type,
        rewardValue: reward.value
      });
    }

    // In production, save rewards to database
    console.log(`Awarded ${rewards.length} rewards to user ${userId}`);
  }

  private async processLevelUpRewards(userId: string, newLevel: number): Promise<void> {
    const levelDefinition = (await this.getLevelDefinitions()).find(l => l.level === newLevel);
    if (!levelDefinition) return;

    const rewards: EarnedReward[] = [];

    // Level XP bonus
    if (levelDefinition.rewards.xp > 0) {
      rewards.push({
        id: this.generateRewardId(),
        type: 'xp',
        title: 'Level Up Bonus',
        description: `Reached level ${newLevel}`,
        value: levelDefinition.rewards.xp,
        status: 'pending',
        earnedAt: new Date(),
        sourceType: 'level_up',
        sourceId: newLevel.toString(),
        sourceName: levelDefinition.title
      });
    }

    // Level items
    if (levelDefinition.rewards.items) {
      for (const item of levelDefinition.rewards.items) {
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
          sourceType: 'level_up',
          sourceId: newLevel.toString(),
          sourceName: levelDefinition.title
        });
      }
    }

    if (rewards.length > 0) {
      await this.awardRewards(userId, rewards);
    }
  }

  private async getStreakMilestoneRewards(streakDays: number): Promise<EarnedReward[]> {
    const rewards: EarnedReward[] = [];

    // Streak-based rewards
    const rewardMap = {
      3: { xp: 100, title: 'Primo Traguardo' },
      7: { xp: 300, title: 'Una Settimana Perfetta' },
      14: { xp: 700, title: 'Due Settimane di Costanza' },
      30: { xp: 1500, title: 'Un Mese Fantastico' },
      60: { xp: 3000, title: 'Due Mesi Incredibili' },
      100: { xp: 5000, title: 'Cento Giorni di Dedizione' },
      365: { xp: 10000, title: 'Un Anno di Impegno' }
    };

    const reward = rewardMap[streakDays as keyof typeof rewardMap];
    if (reward) {
      rewards.push({
        id: this.generateRewardId(),
        type: 'xp',
        title: reward.title,
        description: `Striscia di ${streakDays} giorni consecutivi`,
        value: reward.xp,
        status: 'pending',
        earnedAt: new Date(),
        sourceType: 'streak',
        sourceId: streakDays.toString(),
        sourceName: `${streakDays} Day Streak`
      });
    }

    return rewards;
  }

  // Utility methods
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRewardId(): string {
    return `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock data access methods (replace with actual database calls)
  private async fetchUserProfile(userId: string): Promise<GamificationProfile> {
    // Mock implementation
    console.log(`Fetching user profile for ${userId}`);
    throw new Error('fetchUserProfile not implemented - replace with database query');
  }

  private async saveUserProfile(userId: string, profile: GamificationProfile): Promise<void> {
    console.log(`Saving user profile for ${userId}`);
    // Mock implementation
  }

  private async getLevelDefinitions(): Promise<Level[]> {
    // Mock level definitions - replace with database query
    return [
      {
        level: 1,
        requiredXP: 0,
        title: 'Cucciolo Curioso',
        description: 'Il primo passo nel mondo di PiùCane',
        rewards: { xp: 0, items: [], badges: [] },
        unlockedFeatures: [],
        unlockedMissions: [],
        unlockedBadges: [],
        colorScheme: { primary: '#E3F2FD', secondary: '#BBDEFB', accent: '#2196F3' }
      },
      {
        level: 2,
        requiredXP: 100,
        title: 'Amico a Quattro Zampe',
        description: 'Stai imparando le basi',
        rewards: { xp: 50, items: [], badges: [] },
        unlockedFeatures: [],
        unlockedMissions: [],
        unlockedBadges: [],
        colorScheme: { primary: '#E8F5E8', secondary: '#C8E6C9', accent: '#4CAF50' }
      }
      // Add more levels...
    ];
  }

  private async getStreakTracker(userId: string): Promise<StreakTracker> {
    console.log(`Getting streak tracker for ${userId}`);
    // Mock implementation
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date(),
      streaks: { daily: 0, weekly: 0, monthly: 0 },
      milestones: [],
      freezeCards: 3,
      freezeCardsUsed: 0
    };
  }

  private async updateStreakTracker(userId: string, updates: Partial<StreakTracker>): Promise<void> {
    console.log(`Updating streak tracker for ${userId}:`, updates);
  }

  private async getUserActiveMissions(userId: string): Promise<UserMissionProgress[]> {
    console.log(`Getting active missions for ${userId}`);
    return [];
  }

  private async getRecentRewards(userId: string, limit: number): Promise<EarnedReward[]> {
    console.log(`Getting recent rewards for ${userId}, limit: ${limit}`);
    return [];
  }

  // Analytics helper methods (mock implementations)
  private async getXPEarnedInPeriod(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getMissionsCompletedInPeriod(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getBadgesEarnedInPeriod(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getLevelsGainedInPeriod(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getMaxStreakInPeriod(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getActiveDaysInPeriod(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getAverageSessionTime(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getMissionCompletionRate(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getRetentionRate(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getAverageMissionRating(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getAverageTimeToComplete(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getDifficultyPreference(userId: string): Promise<any> { return 'medium'; }
  private async getDropRate(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getRewardsClaimed(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getDiscountsUsed(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
  private async getTotalRewardValue(userId: string, period: { start: Date; end: Date }): Promise<number> { return 0; }
}