// Gamification & Rewarding System - Type Definitions

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive';
export type MissionType = 'training' | 'grooming' | 'health' | 'content' | 'community';
export type MissionStatus = 'available' | 'active' | 'paused' | 'completed' | 'failed' | 'expired';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RewardType = 'xp' | 'badge' | 'discount' | 'free_item' | 'exclusive_content';

// Core Gamification User Profile
export interface GamificationProfile {
  userId: string;
  dogId?: string;

  // Progression
  totalXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  levelProgress: number; // 0-1

  // Activity tracking
  streakDays: number;
  longestStreak: number;
  lastActivityAt: Date;
  totalActiveDays: number;

  // Badges and achievements
  badges: string[];
  achievements: string[];
  badgeCount: number;

  // Performance metrics for DDA
  performanceScore: number; // 0-1
  completionRate: number;
  dropRate: number;
  engagementRate: number;
  averageTimeToComplete: number; // minutes

  // Mission history
  totalMissionsCompleted: number;
  totalMissionsStarted: number;
  currentActiveMissions: string[];

  // Preferences
  preferredDifficulty: DifficultyLevel;
  notificationPreferences: {
    dailyReminders: boolean;
    weeklyProgress: boolean;
    achievementAlerts: boolean;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Mission System
export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  category: string;

  // Difficulty and adaptation
  difficulty: DifficultyLevel;
  ddaEnabled: boolean;
  adaptiveAdjustments: DDAdjustment[];

  // Structure
  steps: MissionStep[];
  totalSteps: number;
  estimatedDuration: number; // minutes
  recommendedSchedule: 'daily' | 'every_other_day' | 'weekly' | 'flexible';

  // Requirements
  prerequisites: string[];
  minLevel: number;
  requiredBadges: string[];

  // Targeting
  targetAudience: {
    dogAges?: Array<{ min: number; max: number; unit: 'months' | 'years' }>;
    dogBreeds?: string[];
    experienceLevels?: string[];
    userLevels?: Array<{ min: number; max: number }>;
  };

  // Rewards
  rewards: MissionReward;
  bonusRewards?: MissionReward[];

  // Metadata
  createdBy: 'system' | 'ai_agent' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  expiresAt?: Date;

  // Analytics
  stats: {
    timesStarted: number;
    timesCompleted: number;
    averageCompletionTime: number;
    completionRate: number;
    averageRating: number;
  };
}

export interface MissionStep {
  id: string;
  order: number;
  title: string;
  description: string;

  // Requirements
  type: 'action' | 'verification' | 'quiz' | 'timer' | 'photo';
  requirements: StepRequirement[];
  estimatedMinutes: number;

  // Content
  instructions: string;
  tips?: string[];
  materials?: string[];

  // Verification
  verification?: {
    type: 'photo' | 'quiz' | 'checklist' | 'timer' | 'none';
    data?: any;
    required: boolean;
  };

  // Rewards
  xpReward: number;
  itemRewards?: string[];

  // Adaptation
  difficultyModifiers: {
    easy: Partial<MissionStep>;
    medium: Partial<MissionStep>;
    hard: Partial<MissionStep>;
  };
}

export interface StepRequirement {
  type: 'time' | 'photo' | 'quiz_score' | 'checklist' | 'location';
  description: string;
  data: any;
  optional: boolean;
}

export interface MissionReward {
  xp: number;
  badges?: string[];
  items?: RewardItem[];
  discounts?: DiscountReward[];
  exclusiveContent?: string[];
}

export interface RewardItem {
  type: RewardType;
  sku?: string;
  title: string;
  description: string;
  value: number;
  quantity: number;
  expiresAt?: Date;
  conditions?: string[];
}

export interface DiscountReward {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validForCategories?: string[];
  validForSkus?: string[];
  expiresAt: Date;
}

// User Mission Progress
export interface UserMissionProgress {
  userId: string;
  missionId: string;
  status: MissionStatus;

  // Progress tracking
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  progressPercentage: number;

  // Steps progress
  stepProgress: Array<{
    stepId: string;
    status: 'pending' | 'active' | 'completed' | 'skipped';
    completedAt?: Date;
    timeSpent: number;
    verification?: any;
    rating?: number;
  }>;

  // Timing
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  estimatedCompletionAt: Date;

  // Performance
  timeSpent: number; // total minutes
  efficiency: number; // 0-1 (actual time vs estimated)
  qualityScore: number; // 0-1 based on verifications and ratings

  // Difficulty adaptation
  currentDifficulty: DifficultyLevel;
  ddaAdjustments: DDAdjustment[];

  // Rewards
  earnedRewards: EarnedReward[];
  pendingRewards: EarnedReward[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface DDAdjustment {
  timestamp: Date;
  fromDifficulty: DifficultyLevel;
  toDifficulty: DifficultyLevel;
  reason: string;
  performanceScore: number;
  adjustmentFactors: {
    completionRate: number;
    streakFactor: number;
    engagementRate: number;
    dropRate: number;
  };
}

export interface EarnedReward {
  id: string;
  type: RewardType;
  title: string;
  description: string;
  value: number;
  sku?: string;
  code?: string;

  // Status
  status: 'pending' | 'claimed' | 'expired' | 'used';
  earnedAt: Date;
  claimedAt?: Date;
  usedAt?: Date;
  expiresAt?: Date;

  // Source
  sourceType: 'mission' | 'badge' | 'level_up' | 'streak' | 'special_event';
  sourceId: string;
  sourceName: string;
}

// Badge System
export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: BadgeRarity;

  // Requirements
  requirements: BadgeRequirement[];
  category: string;

  // Rewards
  xpBonus: number;
  items?: RewardItem[];
  unlocks?: string[]; // Other badges or content this unlocks

  // Display
  displayOrder: number;
  isHidden: boolean; // Secret badges
  isLimited: boolean; // Time-limited availability

  // Metadata
  createdAt: Date;
  totalEarned: number;
  averageTimeToEarn: number; // days
}

export interface BadgeRequirement {
  type: 'missions_completed' | 'streak_days' | 'xp_earned' | 'specific_mission' | 'level_reached' | 'custom';
  description: string;
  target: number | string;
  category?: string;
  timeframe?: number; // days, null for all-time
}

export interface UserBadge {
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress?: number; // 0-1 for partially completed badges
  isDisplayed: boolean; // User chooses to display on profile
}

// Level System
export interface Level {
  level: number;
  requiredXP: number;
  title: string;
  description: string;
  iconUrl?: string;

  // Rewards
  rewards: MissionReward;

  // Unlocks
  unlockedFeatures: string[];
  unlockedMissions: string[];
  unlockedBadges: string[];

  // Display
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Dynamic Difficulty Adjustment
export interface DDAEngine {
  userId: string;
  currentPerformanceScore: number;

  // Metrics tracking
  metrics: {
    completionRate: number;
    averageTimeToComplete: number;
    streakDays: number;
    dropRate: number;
    engagementRate: number;
    sessionFrequency: number;
  };

  // Adaptation settings
  adaptationSensitivity: number; // 0-1
  minDifficulty: DifficultyLevel;
  maxDifficulty: DifficultyLevel;

  // History
  adjustmentHistory: DDAdjustment[];
  lastAdjustmentAt: Date;

  // Configuration
  thresholds: {
    decreaseDifficulty: number; // < 0.4
    maintainDifficulty: { min: number; max: number }; // 0.4-0.7
    increaseDifficulty: number; // > 0.7
  };
}

// Streak System
export interface StreakTracker {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;

  // Streak types
  streaks: {
    daily: number;
    weekly: number;
    monthly: number;
  };

  // Streak milestones
  milestones: Array<{
    days: number;
    reward: MissionReward;
    achieved: boolean;
    achievedAt?: Date;
  }>;

  // Freeze cards (allow missing days without breaking streak)
  freezeCards: number;
  freezeCardsUsed: number;
}

// Challenge System
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'community' | 'seasonal' | 'limited_time' | 'personal';

  // Timing
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;

  // Requirements
  requirements: ChallengeRequirement[];
  minLevel: number;
  maxParticipants?: number;

  // Rewards
  rewards: {
    first: MissionReward;
    top10?: MissionReward;
    top100?: MissionReward;
    participation: MissionReward;
  };

  // Progress tracking
  leaderboard: ChallengeLeaderboard[];
  participants: number;
  completions: number;

  // Metadata
  isActive: boolean;
  category: string;
  difficulty: DifficultyLevel;
}

export interface ChallengeRequirement {
  type: 'missions_completed' | 'xp_earned' | 'streak_maintained' | 'specific_actions';
  description: string;
  target: number;
  timeframe: number; // days
}

export interface ChallengeLeaderboard {
  userId: string;
  userName: string;
  dogName?: string;
  score: number;
  progress: number; // 0-1
  rank: number;
  completedAt?: Date;
}

export interface UserChallengeProgress {
  userId: string;
  challengeId: string;
  registeredAt: Date;
  progress: number; // 0-1
  score: number;
  rank?: number;
  completedAt?: Date;
  rewards: EarnedReward[];
}

// Analytics
export interface GamificationAnalytics {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Activity metrics
  totalXPEarned: number;
  missionsCompleted: number;
  badgesEarned: number;
  levelsGained: number;
  streakDays: number;

  // Engagement metrics
  dailyActiveDays: number;
  averageSessionTime: number;
  missionCompletionRate: number;
  retentionRate: number;

  // Performance metrics
  averageMissionRating: number;
  averageTimeToComplete: number;
  difficultyPreference: DifficultyLevel;
  dropRate: number;

  // Reward metrics
  rewardsClaimed: number;
  discountsUsed: number;
  totalRewardValue: number;
}

// Leaderboard System
export interface Leaderboard {
  id: string;
  name: string;
  type: 'global' | 'friends' | 'local' | 'challenge';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';

  // Configuration
  metric: 'xp' | 'missions' | 'streak' | 'level' | 'badges';
  maxEntries: number;
  refreshFrequency: number; // minutes

  // Data
  entries: LeaderboardEntry[];
  lastUpdated: Date;

  // Rewards
  rewards: {
    first?: MissionReward;
    top3?: MissionReward;
    top10?: MissionReward;
  };
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  dogName?: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  change: number; // position change since last update
  badges: string[]; // displayed badges
  level: number;
}

// Notifications
export interface GamificationNotification {
  id: string;
  userId: string;
  type: 'xp_earned' | 'badge_earned' | 'level_up' | 'mission_reminder' | 'streak_warning' | 'reward_available';

  // Content
  title: string;
  message: string;
  iconUrl?: string;
  imageUrl?: string;

  // Action
  actionType?: 'open_mission' | 'claim_reward' | 'view_badge' | 'continue_streak';
  actionData?: any;

  // Timing
  scheduledAt: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;

  // Metadata
  priority: 'low' | 'medium' | 'high';
  category: string;
}

// Gamification Settings
export interface GamificationSettings {
  userId: string;

  // Feature toggles
  enableGamification: boolean;
  enableLeaderboards: boolean;
  enableNotifications: boolean;
  enableDDA: boolean;

  // Privacy settings
  showInLeaderboards: boolean;
  shareProgressWithFriends: boolean;
  allowDataAnalysis: boolean;

  // Preferences
  preferredDifficulty: DifficultyLevel;
  reminderFrequency: 'none' | 'daily' | 'weekly';
  motivationalStyle: 'encouraging' | 'competitive' | 'achievement_focused';

  // Accessibility
  reduceAnimations: boolean;
  highContrast: boolean;
  screenReaderOptimized: boolean;

  updatedAt: Date;
}

// Event System
export interface GamificationEvent {
  id: string;
  userId: string;
  type: 'mission_started' | 'mission_completed' | 'step_completed' | 'badge_earned' | 'level_up' | 'reward_claimed' | 'streak_broken' | 'dda_adjusted';

  // Event data
  data: {
    missionId?: string;
    stepId?: string;
    badgeId?: string;
    rewardId?: string;
    xpEarned?: number;
    levelGained?: number;
    streakDays?: number;
    difficultyChange?: string;
    [key: string]: any;
  };

  // Context
  sessionId?: string;
  source: 'app' | 'notification' | 'reminder' | 'ai_agent';

  // Timing
  timestamp: Date;
  processedAt?: Date;

  // Analytics
  anonymized: boolean;
  containsPII: boolean;
}

// Export all types
export type {
  GamificationProfile,
  Mission,
  MissionStep,
  StepRequirement,
  MissionReward,
  RewardItem,
  DiscountReward,
  UserMissionProgress,
  DDAdjustment,
  EarnedReward,
  Badge,
  BadgeRequirement,
  UserBadge,
  Level,
  DDAEngine,
  StreakTracker,
  Challenge,
  ChallengeRequirement,
  ChallengeLeaderboard,
  UserChallengeProgress,
  GamificationAnalytics,
  Leaderboard,
  LeaderboardEntry,
  GamificationNotification,
  GamificationSettings,
  GamificationEvent
};