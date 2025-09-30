import type {
  GamificationProfile,
  Level,
  EarnedReward,
  DifficultyLevel
} from '@/types/gamification';

export class XPSystem {
  private levelDefinitions: Level[];
  private xpMultipliers: Map<string, number>;

  constructor() {
    this.levelDefinitions = this.initializeLevelDefinitions();
    this.xpMultipliers = this.initializeXPMultipliers();
  }

  // XP Calculation and Award
  async awardXP(
    userId: string,
    amount: number,
    source: {
      type: 'mission' | 'badge' | 'streak' | 'special_event' | 'daily_bonus';
      sourceId: string;
      sourceName: string;
      difficulty?: DifficultyLevel;
      qualityBonus?: number;
    }
  ): Promise<{
    xpAwarded: number;
    levelChange: {
      leveledUp: boolean;
      previousLevel: number;
      newLevel: number;
      levelRewards: EarnedReward[];
    };
    profile: Partial<GamificationProfile>;
  }> {
    // Calculate final XP amount with multipliers
    let finalXP = amount;

    // Apply source-specific multipliers
    const sourceMultiplier = this.xpMultipliers.get(source.type) || 1;
    finalXP *= sourceMultiplier;

    // Apply difficulty multiplier if applicable
    if (source.difficulty) {
      const difficultyMultiplier = this.getDifficultyMultiplier(source.difficulty);
      finalXP *= difficultyMultiplier;
    }

    // Apply quality bonus if applicable
    if (source.qualityBonus) {
      finalXP *= (1 + source.qualityBonus);
    }

    // Apply user-specific multipliers (premium membership, special events, etc.)
    const userMultiplier = await this.getUserMultiplier(userId);
    finalXP *= userMultiplier;

    // Round final XP
    finalXP = Math.round(finalXP);

    // Get current user profile
    const currentProfile = await this.getUserProfile(userId);
    const previousLevel = currentProfile.currentLevel;
    const newTotalXP = currentProfile.totalXP + finalXP;

    // Calculate level progression
    const levelInfo = this.calculateLevelFromXP(newTotalXP);
    const leveledUp = levelInfo.level > previousLevel;

    // Generate level up rewards if applicable
    let levelRewards: EarnedReward[] = [];
    if (leveledUp) {
      levelRewards = await this.generateLevelUpRewards(userId, previousLevel, levelInfo.level);
    }

    // Update profile
    const profileUpdates: Partial<GamificationProfile> = {
      totalXP: newTotalXP,
      currentLevel: levelInfo.level,
      xpToNextLevel: levelInfo.xpToNextLevel,
      levelProgress: levelInfo.levelProgress,
      updatedAt: new Date()
    };

    // Log XP award
    await this.logXPAward(userId, finalXP, source);

    console.log(`Awarded ${finalXP} XP to user ${userId} from ${source.type}: ${source.sourceName}`);

    if (leveledUp) {
      console.log(`User ${userId} leveled up: ${previousLevel} -> ${levelInfo.level}`);
    }

    return {
      xpAwarded: finalXP,
      levelChange: {
        leveledUp,
        previousLevel,
        newLevel: levelInfo.level,
        levelRewards
      },
      profile: profileUpdates
    };
  }

  // Level Calculations
  calculateLevelFromXP(totalXP: number): {
    level: number;
    xpToNextLevel: number;
    levelProgress: number;
    currentLevelXP: number;
    nextLevelXP: number;
  } {
    let currentLevel = 1;
    let currentLevelXP = 0;

    // Find current level
    for (const levelDef of this.levelDefinitions) {
      if (totalXP >= levelDef.requiredXP) {
        currentLevel = levelDef.level;
        currentLevelXP = levelDef.requiredXP;
      } else {
        break;
      }
    }

    // Find next level
    const nextLevelDef = this.levelDefinitions.find(l => l.level === currentLevel + 1);
    const nextLevelXP = nextLevelDef ? nextLevelDef.requiredXP : currentLevelXP;

    // Calculate progress within current level
    const xpInCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const levelProgress = xpNeededForNextLevel > 0 ? xpInCurrentLevel / xpNeededForNextLevel : 1;
    const xpToNextLevel = Math.max(0, nextLevelXP - totalXP);

    return {
      level: currentLevel,
      xpToNextLevel,
      levelProgress: Math.min(1, levelProgress),
      currentLevelXP,
      nextLevelXP
    };
  }

  getLevelDefinition(level: number): Level | undefined {
    return this.levelDefinitions.find(l => l.level === level);
  }

  getAllLevels(): Level[] {
    return [...this.levelDefinitions];
  }

  getNextLevelRequirements(currentLevel: number): {
    nextLevel?: Level;
    unlockedFeatures: string[];
    unlockedMissions: string[];
    unlockedBadges: string[];
    rewards: Level['rewards'];
  } | null {
    const nextLevel = this.levelDefinitions.find(l => l.level === currentLevel + 1);

    if (!nextLevel) {
      return null; // Max level reached
    }

    return {
      nextLevel,
      unlockedFeatures: nextLevel.unlockedFeatures,
      unlockedMissions: nextLevel.unlockedMissions,
      unlockedBadges: nextLevel.unlockedBadges,
      rewards: nextLevel.rewards
    };
  }

  // XP Multipliers and Bonuses
  private getDifficultyMultiplier(difficulty: DifficultyLevel): number {
    const multipliers = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.5,
      adaptive: 1.2
    };
    return multipliers[difficulty];
  }

  private async getUserMultiplier(userId: string): Promise<number> {
    // Check for premium membership, special events, etc.
    let multiplier = 1.0;

    // Premium membership bonus
    const isPremium = await this.isUserPremium(userId);
    if (isPremium) {
      multiplier *= 1.5;
    }

    // Weekend bonus
    const isWeekend = this.isWeekend();
    if (isWeekend) {
      multiplier *= 1.2;
    }

    // Happy hour bonus (certain times of day)
    const isHappyHour = this.isHappyHour();
    if (isHappyHour) {
      multiplier *= 1.1;
    }

    // Special event multipliers
    const eventMultiplier = await this.getEventMultiplier();
    multiplier *= eventMultiplier;

    return multiplier;
  }

  async setTemporaryXPMultiplier(
    userId: string,
    multiplier: number,
    duration: number, // minutes
    reason: string
  ): Promise<void> {
    // In production, store in database with expiration
    console.log(`Temporary XP multiplier set for user ${userId}: ${multiplier}x for ${duration} minutes (${reason})`);
  }

  // Level Up Rewards
  private async generateLevelUpRewards(
    userId: string,
    previousLevel: number,
    newLevel: number
  ): Promise<EarnedReward[]> {
    const rewards: EarnedReward[] = [];

    // Generate rewards for each level gained (in case of multiple level ups)
    for (let level = previousLevel + 1; level <= newLevel; level++) {
      const levelDef = this.getLevelDefinition(level);
      if (!levelDef) continue;

      // XP Bonus reward
      if (levelDef.rewards.xp > 0) {
        rewards.push({
          id: this.generateRewardId(),
          type: 'xp',
          title: `Level ${level} Bonus`,
          description: `Congratulations on reaching level ${level}!`,
          value: levelDef.rewards.xp,
          status: 'pending',
          earnedAt: new Date(),
          sourceType: 'level_up',
          sourceId: level.toString(),
          sourceName: levelDef.title
        });
      }

      // Item rewards
      if (levelDef.rewards.items) {
        for (const item of levelDef.rewards.items) {
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
            sourceId: level.toString(),
            sourceName: levelDef.title
          });
        }
      }

      // Badge rewards
      if (levelDef.rewards.badges) {
        for (const badgeId of levelDef.rewards.badges) {
          rewards.push({
            id: this.generateRewardId(),
            type: 'badge',
            title: 'Level Badge',
            description: `Badge earned for reaching level ${level}`,
            value: 0,
            status: 'pending',
            earnedAt: new Date(),
            sourceType: 'level_up',
            sourceId: level.toString(),
            sourceName: levelDef.title
          });
        }
      }
    }

    return rewards;
  }

  // XP Sources and Categories
  async calculateMissionXP(
    missionType: string,
    difficulty: DifficultyLevel,
    steps: number,
    qualityScore: number
  ): Promise<number> {
    // Base XP per mission type
    const baseXPByType = {
      training: 50,
      grooming: 40,
      health: 60,
      content: 30,
      community: 35
    };

    let baseXP = baseXPByType[missionType as keyof typeof baseXPByType] || 40;

    // Scale by number of steps
    baseXP += (steps - 1) * 10;

    // Apply difficulty multiplier
    baseXP *= this.getDifficultyMultiplier(difficulty);

    // Apply quality bonus
    const qualityMultiplier = 1 + (qualityScore - 0.5) * 0.5; // 0.75x to 1.25x
    baseXP *= Math.max(0.75, Math.min(1.25, qualityMultiplier));

    return Math.round(baseXP);
  }

  async calculateStreakXP(streakDays: number): Promise<number> {
    // Escalating XP for longer streaks
    if (streakDays <= 3) return 10;
    if (streakDays <= 7) return 25;
    if (streakDays <= 14) return 50;
    if (streakDays <= 30) return 100;
    if (streakDays <= 60) return 200;
    return 300; // For 60+ day streaks
  }

  async calculateBadgeXP(badgeRarity: string): Promise<number> {
    const xpByRarity = {
      common: 25,
      rare: 75,
      epic: 200,
      legendary: 500
    };

    return xpByRarity[badgeRarity as keyof typeof xpByRarity] || 25;
  }

  // Analytics and Progress Tracking
  async getUserXPAnalytics(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    totalXPEarned: number;
    xpBySource: Record<string, number>;
    xpByDay: Array<{ date: Date; xp: number }>;
    averageXPPerDay: number;
    levelsGained: number;
    rankingPosition?: number;
  }> {
    // In production, query analytics database
    return {
      totalXPEarned: 1500,
      xpBySource: {
        mission: 800,
        badge: 400,
        streak: 200,
        daily_bonus: 100
      },
      xpByDay: [], // Would contain daily XP data
      averageXPPerDay: 50,
      levelsGained: 2,
      rankingPosition: 42
    };
  }

  // Level System Configuration
  private initializeLevelDefinitions(): Level[] {
    const levels: Level[] = [];

    // Define progression curve: XP = level^2.2 * 100 (roughly)
    for (let level = 1; level <= 100; level++) {
      const requiredXP = level === 1 ? 0 : Math.round(Math.pow(level - 1, 2.2) * 100);

      levels.push({
        level,
        requiredXP,
        title: this.getLevelTitle(level),
        description: this.getLevelDescription(level),
        iconUrl: `/levels/level_${level}.svg`,
        rewards: this.getLevelRewards(level),
        unlockedFeatures: this.getUnlockedFeatures(level),
        unlockedMissions: this.getUnlockedMissions(level),
        unlockedBadges: this.getUnlockedBadges(level),
        colorScheme: this.getLevelColorScheme(level)
      });
    }

    return levels;
  }

  private getLevelTitle(level: number): string {
    if (level <= 5) return 'Cucciolo Curioso';
    if (level <= 10) return 'Amico a Quattro Zampe';
    if (level <= 15) return 'Compagno Fedele';
    if (level <= 20) return 'Cane Addestrato';
    if (level <= 25) return 'Esploratore Canino';
    if (level <= 30) return 'Cane Esperto';
    if (level <= 40) return 'Veterano Peloso';
    if (level <= 50) return 'Maestro Cinofilo';
    if (level <= 60) return 'Leggenda a Quattro Zampe';
    if (level <= 80) return 'Campione Canino';
    return 'Gran Maestro PiùCane';
  }

  private getLevelDescription(level: number): string {
    if (level <= 5) return 'Stai muovendo i primi passi nel mondo di PiùCane';
    if (level <= 10) return 'Hai imparato le basi della cura del tuo cane';
    if (level <= 20) return 'Sei diventato un proprietario esperto';
    if (level <= 30) return 'Il tuo cane e tu siete un team perfetto';
    if (level <= 50) return 'Sei un vero esperto nel mondo cinofilo';
    return 'Hai raggiunto la maestria assoluta';
  }

  private getLevelRewards(level: number): Level['rewards'] {
    const rewards: Level['rewards'] = { xp: 0, items: [], badges: [] };

    // XP bonus every 5 levels
    if (level % 5 === 0) {
      rewards.xp = level * 10;
    }

    // Special rewards at milestone levels
    if (level === 5) {
      rewards.items = [{
        type: 'discount',
        title: '10% di sconto',
        description: 'Primo traguardo raggiunto!',
        value: 10,
        quantity: 1
      }];
    }

    if (level === 10) {
      rewards.items = [{
        type: 'free_item',
        sku: 'WELCOME_TREATS',
        title: 'Snack di Benvenuto',
        description: 'Campione gratuito per il tuo cane',
        value: 8.99,
        quantity: 1
      }];
    }

    if (level === 25) {
      rewards.items = [{
        type: 'discount',
        title: '25% di sconto VIP',
        description: 'Sconto speciale per utenti esperti',
        value: 25,
        quantity: 1
      }];
    }

    return rewards;
  }

  private getUnlockedFeatures(level: number): string[] {
    const features: string[] = [];

    if (level >= 5) features.push('advanced_missions');
    if (level >= 10) features.push('premium_content');
    if (level >= 15) features.push('community_challenges');
    if (level >= 20) features.push('ai_agent_advanced');
    if (level >= 25) features.push('expert_mode');
    if (level >= 30) features.push('mentor_program');
    if (level >= 50) features.push('beta_features');

    return features;
  }

  private getUnlockedMissions(level: number): string[] {
    const missions: string[] = [];

    if (level >= 5) missions.push('intermediate_training');
    if (level >= 10) missions.push('advanced_health');
    if (level >= 15) missions.push('expert_grooming');
    if (level >= 20) missions.push('behavioral_specialist');
    if (level >= 30) missions.push('master_challenges');

    return missions;
  }

  private getUnlockedBadges(level: number): string[] {
    const badges: string[] = [];

    if (level >= 5) badges.push('level_5_champion');
    if (level >= 10) badges.push('dedicated_owner');
    if (level >= 25) badges.push('expert_trainer');
    if (level >= 50) badges.push('piucane_master');

    return badges;
  }

  private getLevelColorScheme(level: number): Level['colorScheme'] {
    // Color schemes progress from blue to green to purple to gold
    if (level <= 10) {
      return { primary: '#E3F2FD', secondary: '#BBDEFB', accent: '#2196F3' };
    }
    if (level <= 20) {
      return { primary: '#E8F5E8', secondary: '#C8E6C9', accent: '#4CAF50' };
    }
    if (level <= 40) {
      return { primary: '#F3E5F5', secondary: '#E1BEE7', accent: '#9C27B0' };
    }
    if (level <= 60) {
      return { primary: '#FFF3E0', secondary: '#FFE0B2', accent: '#FF9800' };
    }
    return { primary: '#FFFDE7', secondary: '#FFF9C4', accent: '#FFC107' };
  }

  private initializeXPMultipliers(): Map<string, number> {
    const multipliers = new Map<string, number>();

    multipliers.set('mission', 1.0);
    multipliers.set('badge', 1.2);
    multipliers.set('streak', 1.5);
    multipliers.set('special_event', 2.0);
    multipliers.set('daily_bonus', 0.8);

    return multipliers;
  }

  // Utility methods
  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private isHappyHour(): boolean {
    const hour = new Date().getHours();
    return hour >= 18 && hour <= 20; // 6 PM to 8 PM
  }

  private async isUserPremium(userId: string): Promise<boolean> {
    // Mock implementation - check user subscription status
    return false;
  }

  private async getEventMultiplier(): Promise<number> {
    // Check for active special events
    // Mock implementation
    return 1.0;
  }

  private async logXPAward(
    userId: string,
    amount: number,
    source: { type: string; sourceId: string; sourceName: string }
  ): Promise<void> {
    const logData = {
      userId,
      xpAmount: amount,
      sourceType: source.type,
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      timestamp: new Date()
    };

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'xp_awarded', {
        xp_amount: amount,
        source_type: source.type,
        source_name: source.sourceName
      });
    }

    console.log('XP award logged:', logData);
  }

  private async getUserProfile(userId: string): Promise<GamificationProfile> {
    // Mock implementation - replace with database query
    console.log(`Getting user profile for XP calculation: ${userId}`);
    throw new Error('getUserProfile not implemented - replace with database query');
  }

  private generateRewardId(): string {
    return `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}