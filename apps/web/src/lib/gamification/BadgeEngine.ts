import type {
  Badge,
  BadgeRequirement,
  UserBadge,
  GamificationProfile,
  BadgeRarity,
  EarnedReward,
  UserMissionProgress,
  GamificationEvent
} from '@/types/gamification';

export class BadgeEngine {
  private badgeDefinitions: Map<string, Badge>;
  private userBadges: Map<string, UserBadge[]>;

  constructor() {
    this.badgeDefinitions = new Map();
    this.userBadges = new Map();
    this.initializeSystemBadges();
  }

  async createBadge(badgeData: Omit<Badge, 'id' | 'createdAt' | 'totalEarned' | 'averageTimeToEarn'>): Promise<Badge> {
    const badge: Badge = {
      ...badgeData,
      id: this.generateBadgeId(),
      createdAt: new Date(),
      totalEarned: 0,
      averageTimeToEarn: 0
    };

    this.validateBadge(badge);
    this.badgeDefinitions.set(badge.id, badge);

    console.log(`Created badge: ${badge.name} (${badge.id})`);
    return badge;
  }

  async checkBadgeEligibility(
    userId: string,
    userProfile: GamificationProfile,
    trigger?: {
      type: 'mission_completed' | 'xp_earned' | 'streak_achieved' | 'level_up';
      data: any;
    }
  ): Promise<{
    newBadges: Badge[];
    progressUpdates: Array<{ badgeId: string; progress: number; description: string }>;
  }> {
    const userBadges = await this.getUserBadges(userId);
    const earnedBadgeIds = userBadges.map(ub => ub.badgeId);
    const newBadges: Badge[] = [];
    const progressUpdates: Array<{ badgeId: string; progress: number; description: string }> = [];

    // Check all badge definitions
    for (const badge of this.badgeDefinitions.values()) {
      // Skip if user already has this badge
      if (earnedBadgeIds.includes(badge.id)) {
        continue;
      }

      // Skip if badge is hidden and not triggered by specific action
      if (badge.isHidden && !trigger) {
        continue;
      }

      // Check if badge requirements are met
      const eligibilityResult = await this.evaluateBadgeRequirements(
        badge,
        userId,
        userProfile,
        trigger
      );

      if (eligibilityResult.isEligible) {
        // Award badge
        await this.awardBadge(userId, badge.id);
        newBadges.push(badge);

        console.log(`Badge awarded: ${badge.name} to user ${userId}`);
      } else if (eligibilityResult.progress > 0) {
        // Update progress for partially completed badges
        progressUpdates.push({
          badgeId: badge.id,
          progress: eligibilityResult.progress,
          description: eligibilityResult.nextRequirement || 'Continue your progress'
        });
      }
    }

    return { newBadges, progressUpdates };
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    const badge = this.badgeDefinitions.get(badgeId);
    if (!badge) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    // Check if user already has this badge
    const userBadges = await this.getUserBadges(userId);
    if (userBadges.some(ub => ub.badgeId === badgeId)) {
      throw new Error(`User ${userId} already has badge ${badgeId}`);
    }

    const userBadge: UserBadge = {
      userId,
      badgeId,
      earnedAt: new Date(),
      progress: 1,
      isDisplayed: this.shouldDisplayBadgeByDefault(badge.rarity)
    };

    // Add to user badges
    const currentBadges = userBadges;
    currentBadges.push(userBadge);
    this.userBadges.set(userId, currentBadges);

    // Update badge statistics
    await this.updateBadgeStats(badgeId);

    // Process badge rewards (XP bonus, unlocks, etc.)
    await this.processBadgeRewards(userId, badge);

    console.log(`Badge ${badge.name} awarded to user ${userId}`);
    return userBadge;
  }

  async getBadgeProgress(userId: string, badgeId: string): Promise<{
    badge: Badge;
    progress: number;
    requirements: Array<{
      requirement: BadgeRequirement;
      completed: boolean;
      currentValue: number;
      targetValue: number;
      progressPercentage: number;
    }>;
    isEarned: boolean;
  }> {
    const badge = this.badgeDefinitions.get(badgeId);
    if (!badge) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    const userBadges = await this.getUserBadges(userId);
    const isEarned = userBadges.some(ub => ub.badgeId === badgeId);

    if (isEarned) {
      return {
        badge,
        progress: 1,
        requirements: badge.requirements.map(req => ({
          requirement: req,
          completed: true,
          currentValue: typeof req.target === 'number' ? req.target : 1,
          targetValue: typeof req.target === 'number' ? req.target : 1,
          progressPercentage: 1
        })),
        isEarned: true
      };
    }

    // Calculate progress for each requirement
    const userProfile = await this.getUserProfile(userId);
    const requirements = await Promise.all(
      badge.requirements.map(async req => {
        const progress = await this.evaluateRequirementProgress(req, userId, userProfile);
        return {
          requirement: req,
          completed: progress.completed,
          currentValue: progress.currentValue,
          targetValue: progress.targetValue,
          progressPercentage: progress.percentage
        };
      })
    );

    const overallProgress = requirements.every(r => r.completed) ? 1 :
      requirements.reduce((sum, r) => sum + r.progressPercentage, 0) / requirements.length;

    return {
      badge,
      progress: overallProgress,
      requirements,
      isEarned: false
    };
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return this.userBadges.get(userId) || [];
  }

  async getUserDisplayBadges(userId: string, limit: number = 6): Promise<Array<UserBadge & { badge: Badge }>> {
    const userBadges = await this.getUserBadges(userId);
    const displayBadges = userBadges
      .filter(ub => ub.isDisplayed)
      .sort((a, b) => {
        const badgeA = this.badgeDefinitions.get(a.badgeId)!;
        const badgeB = this.badgeDefinitions.get(b.badgeId)!;

        // Sort by rarity (legendary first) then by earned date (newest first)
        const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
        const rarityDiff = rarityOrder[badgeB.rarity] - rarityOrder[badgeA.rarity];

        if (rarityDiff !== 0) return rarityDiff;
        return b.earnedAt.getTime() - a.earnedAt.getTime();
      })
      .slice(0, limit);

    return displayBadges.map(ub => ({
      ...ub,
      badge: this.badgeDefinitions.get(ub.badgeId)!
    }));
  }

  async updateBadgeDisplayPreferences(
    userId: string,
    badgeId: string,
    isDisplayed: boolean
  ): Promise<void> {
    const userBadges = await this.getUserBadges(userId);
    const badgeIndex = userBadges.findIndex(ub => ub.badgeId === badgeId);

    if (badgeIndex === -1) {
      throw new Error(`User ${userId} does not have badge ${badgeId}`);
    }

    userBadges[badgeIndex].isDisplayed = isDisplayed;
    this.userBadges.set(userId, userBadges);

    console.log(`Badge display preference updated: ${badgeId} -> ${isDisplayed} for user ${userId}`);
  }

  async getBadgeLeaderboard(
    badgeId: string,
    limit: number = 100
  ): Promise<Array<{
    userId: string;
    userName: string;
    earnedAt: Date;
    rank: number;
  }>> {
    // Mock implementation - in production, query database
    const badge = this.badgeDefinitions.get(badgeId);
    if (!badge) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    // Collect all users who have earned this badge
    const badgeEarners: Array<{
      userId: string;
      userName: string;
      earnedAt: Date;
    }> = [];

    for (const [userId, userBadges] of this.userBadges.entries()) {
      const userBadge = userBadges.find(ub => ub.badgeId === badgeId);
      if (userBadge) {
        badgeEarners.push({
          userId,
          userName: await this.getUserName(userId),
          earnedAt: userBadge.earnedAt
        });
      }
    }

    // Sort by earned date (earliest first for rare achievements)
    badgeEarners.sort((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime());

    return badgeEarners.slice(0, limit).map((earner, index) => ({
      ...earner,
      rank: index + 1
    }));
  }

  private async evaluateBadgeRequirements(
    badge: Badge,
    userId: string,
    userProfile: GamificationProfile,
    trigger?: any
  ): Promise<{
    isEligible: boolean;
    progress: number;
    nextRequirement?: string;
  }> {
    let completedRequirements = 0;
    let nextRequirement: string | undefined;

    for (const requirement of badge.requirements) {
      const progress = await this.evaluateRequirementProgress(requirement, userId, userProfile, trigger);

      if (progress.completed) {
        completedRequirements++;
      } else if (!nextRequirement) {
        nextRequirement = this.getRequirementDescription(requirement, progress);
      }
    }

    const progress = completedRequirements / badge.requirements.length;
    const isEligible = completedRequirements === badge.requirements.length;

    return { isEligible, progress, nextRequirement };
  }

  private async evaluateRequirementProgress(
    requirement: BadgeRequirement,
    userId: string,
    userProfile: GamificationProfile,
    trigger?: any
  ): Promise<{
    completed: boolean;
    currentValue: number;
    targetValue: number;
    percentage: number;
  }> {
    const targetValue = typeof requirement.target === 'number' ? requirement.target : 1;
    let currentValue = 0;

    switch (requirement.type) {
      case 'missions_completed':
        currentValue = requirement.category
          ? await this.getUserMissionsCompletedByCategory(userId, requirement.category, requirement.timeframe)
          : userProfile.totalMissionsCompleted;
        break;

      case 'streak_days':
        currentValue = userProfile.streakDays;
        break;

      case 'xp_earned':
        currentValue = requirement.timeframe
          ? await this.getUserXPInTimeframe(userId, requirement.timeframe)
          : userProfile.totalXP;
        break;

      case 'level_reached':
        currentValue = userProfile.currentLevel;
        break;

      case 'specific_mission':
        const hasCompletedMission = await this.hasUserCompletedMission(userId, requirement.target as string);
        currentValue = hasCompletedMission ? 1 : 0;
        break;

      case 'custom':
        currentValue = await this.evaluateCustomRequirement(requirement, userId, userProfile, trigger);
        break;

      default:
        console.warn(`Unknown requirement type: ${requirement.type}`);
        currentValue = 0;
    }

    const completed = currentValue >= targetValue;
    const percentage = Math.min(1, currentValue / targetValue);

    return { completed, currentValue, targetValue, percentage };
  }

  private async evaluateCustomRequirement(
    requirement: BadgeRequirement,
    userId: string,
    userProfile: GamificationProfile,
    trigger?: any
  ): Promise<number> {
    // Custom requirement evaluation based on requirement.target
    const customType = requirement.target as string;

    switch (customType) {
      case 'perfect_mission':
        // Completed a mission with perfect score
        return trigger?.type === 'mission_completed' && trigger.data.qualityScore === 1 ? 1 : 0;

      case 'speed_demon':
        // Completed mission in record time
        return trigger?.type === 'mission_completed' && trigger.data.efficiency > 1.5 ? 1 : 0;

      case 'early_bird':
        // Completed mission in morning hours
        const now = new Date();
        return now.getHours() >= 6 && now.getHours() <= 9 ? 1 : 0;

      case 'weekend_warrior':
        // Active during weekends
        const day = new Date().getDay();
        return (day === 0 || day === 6) ? 1 : 0;

      case 'social_butterfly':
        // Shared achievements or participated in community features
        return await this.getUserSocialInteractions(userId);

      default:
        console.warn(`Unknown custom requirement: ${customType}`);
        return 0;
    }
  }

  private getRequirementDescription(
    requirement: BadgeRequirement,
    progress: { currentValue: number; targetValue: number }
  ): string {
    const remaining = progress.targetValue - progress.currentValue;

    switch (requirement.type) {
      case 'missions_completed':
        return `Completa ${remaining} ${requirement.category ? `missioni ${requirement.category}` : 'missioni'} in più`;

      case 'streak_days':
        return `Mantieni la striscia per ${remaining} giorni in più`;

      case 'xp_earned':
        return `Guadagna ${remaining} XP in più`;

      case 'level_reached':
        return `Raggiungi il livello ${progress.targetValue}`;

      case 'specific_mission':
        return `Completa la missione: ${requirement.target}`;

      case 'custom':
        return requirement.description;

      default:
        return requirement.description;
    }
  }

  private shouldDisplayBadgeByDefault(rarity: BadgeRarity): boolean {
    // More rare badges are displayed by default
    const displayProbability = {
      common: 0.3,
      rare: 0.6,
      epic: 0.8,
      legendary: 1.0
    };

    return Math.random() < displayProbability[rarity];
  }

  private async processBadgeRewards(userId: string, badge: Badge): Promise<void> {
    const rewards: EarnedReward[] = [];

    // XP bonus
    if (badge.xpBonus > 0) {
      rewards.push({
        id: this.generateRewardId(),
        type: 'xp',
        title: 'Badge XP Bonus',
        description: `Earned from ${badge.name} badge`,
        value: badge.xpBonus,
        status: 'pending',
        earnedAt: new Date(),
        sourceType: 'badge',
        sourceId: badge.id,
        sourceName: badge.name
      });
    }

    // Item rewards
    if (badge.items && badge.items.length > 0) {
      for (const item of badge.items) {
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
          sourceType: 'badge',
          sourceId: badge.id,
          sourceName: badge.name
        });
      }
    }

    // Process unlocks (other badges, content, etc.)
    if (badge.unlocks && badge.unlocks.length > 0) {
      await this.processUnlocks(userId, badge.unlocks);
    }

    // Award all rewards
    if (rewards.length > 0) {
      await this.awardRewards(userId, rewards);
    }
  }

  private async processUnlocks(userId: string, unlocks: string[]): Promise<void> {
    for (const unlock of unlocks) {
      // Check if it's a badge unlock
      if (this.badgeDefinitions.has(unlock)) {
        console.log(`Badge ${unlock} unlocked for user ${userId}`);
        // In production, mark badge as available for the user
      } else {
        // Handle other types of unlocks (content, features, etc.)
        console.log(`Content/Feature ${unlock} unlocked for user ${userId}`);
      }
    }
  }

  private validateBadge(badge: Badge): void {
    if (!badge.name || badge.name.length === 0) {
      throw new Error('Badge name is required');
    }

    if (!badge.description || badge.description.length === 0) {
      throw new Error('Badge description is required');
    }

    if (!badge.iconUrl || badge.iconUrl.length === 0) {
      throw new Error('Badge icon URL is required');
    }

    if (!badge.requirements || badge.requirements.length === 0) {
      throw new Error('Badge must have at least one requirement');
    }

    // Validate each requirement
    badge.requirements.forEach((req, index) => {
      if (!req.type || !req.description) {
        throw new Error(`Badge requirement ${index} is incomplete`);
      }
      if (req.target === undefined || req.target === null) {
        throw new Error(`Badge requirement ${index} must have a target`);
      }
    });
  }

  private async updateBadgeStats(badgeId: string): Promise<void> {
    const badge = this.badgeDefinitions.get(badgeId);
    if (!badge) return;

    badge.totalEarned += 1;

    // Calculate average time to earn
    if (badge.totalEarned > 1) {
      // In production, calculate based on actual user data
      badge.averageTimeToEarn = 7; // Mock: 7 days average
    }

    this.badgeDefinitions.set(badgeId, badge);
  }

  private initializeSystemBadges(): void {
    // First Mission Badge
    this.createBadge({
      name: 'Prima Missione',
      description: 'Hai completato la tua prima missione!',
      iconUrl: '/badges/first-mission.svg',
      rarity: 'common',
      category: 'milestone',
      requirements: [{
        type: 'missions_completed',
        description: 'Completa 1 missione',
        target: 1
      }],
      xpBonus: 50,
      displayOrder: 1,
      isHidden: false,
      isLimited: false
    });

    // Streak Master Badge
    this.createBadge({
      name: 'Maestro delle Strisce',
      description: 'Hai mantenuto una striscia di 7 giorni consecutivi',
      iconUrl: '/badges/streak-master.svg',
      rarity: 'rare',
      category: 'consistency',
      requirements: [{
        type: 'streak_days',
        description: 'Mantieni una striscia di 7 giorni',
        target: 7
      }],
      xpBonus: 200,
      displayOrder: 2,
      isHidden: false,
      isLimited: false
    });

    // Level 10 Badge
    this.createBadge({
      name: 'Esperto Cinofilo',
      description: 'Hai raggiunto il livello 10!',
      iconUrl: '/badges/expert.svg',
      rarity: 'epic',
      category: 'level',
      requirements: [{
        type: 'level_reached',
        description: 'Raggiungi il livello 10',
        target: 10
      }],
      xpBonus: 500,
      items: [{
        type: 'discount',
        title: 'Sconto Esperto',
        description: '20% di sconto su tutti i prodotti',
        value: 20,
        quantity: 1
      }],
      displayOrder: 3,
      isHidden: false,
      isLimited: false
    });

    // Perfect Mission Badge (Hidden)
    this.createBadge({
      name: 'Perfezionista',
      description: 'Hai completato una missione con punteggio perfetto',
      iconUrl: '/badges/perfectionist.svg',
      rarity: 'legendary',
      category: 'achievement',
      requirements: [{
        type: 'custom',
        description: 'Completa una missione con punteggio perfetto',
        target: 'perfect_mission'
      }],
      xpBonus: 1000,
      items: [{
        type: 'exclusive_content',
        title: 'Accesso Premium',
        description: 'Accesso a contenuti esclusivi per esperti',
        value: 0,
        quantity: 1
      }],
      displayOrder: 99,
      isHidden: true,
      isLimited: false
    });

    console.log('System badges initialized');
  }

  // Utility methods
  private generateBadgeId(): string {
    return `badge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRewardId(): string {
    return `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock data access methods (replace with actual database calls)
  private async getUserProfile(userId: string): Promise<GamificationProfile> {
    console.log(`Getting user profile for ${userId}`);
    throw new Error('getUserProfile not implemented - replace with database query');
  }

  private async getUserMissionsCompletedByCategory(
    userId: string,
    category: string,
    timeframe?: number
  ): Promise<number> {
    console.log(`Getting completed missions for user ${userId}, category ${category}, timeframe ${timeframe}`);
    return 0; // Mock implementation
  }

  private async getUserXPInTimeframe(userId: string, days: number): Promise<number> {
    console.log(`Getting XP for user ${userId} in last ${days} days`);
    return 0; // Mock implementation
  }

  private async hasUserCompletedMission(userId: string, missionId: string): Promise<boolean> {
    console.log(`Checking if user ${userId} completed mission ${missionId}`);
    return false; // Mock implementation
  }

  private async getUserSocialInteractions(userId: string): Promise<number> {
    console.log(`Getting social interactions for user ${userId}`);
    return 0; // Mock implementation
  }

  private async getUserName(userId: string): Promise<string> {
    console.log(`Getting user name for ${userId}`);
    return `User_${userId.substr(0, 8)}`; // Mock implementation
  }

  private async awardRewards(userId: string, rewards: EarnedReward[]): Promise<void> {
    console.log(`Awarding ${rewards.length} rewards to user ${userId}`);
    // Mock implementation - in production, save to database and notify user
  }
}