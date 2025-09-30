import type {
  GamificationProfile,
  GamificationEvent
} from '@/types/gamification';

// Rate limiting and anti-abuse configuration
interface RateLimitRule {
  action: string;
  windowMs: number; // Time window in milliseconds
  maxAttempts: number;
  punishment?: {
    type: 'temporary_ban' | 'xp_penalty' | 'feature_restriction';
    duration?: number; // minutes
    severity: 'low' | 'medium' | 'high';
  };
}

interface SuspiciousActivity {
  userId: string;
  activityType: string;
  timestamp: Date;
  metadata: any;
  riskScore: number; // 0-1
  autoBlocked: boolean;
}

interface UserTrustScore {
  userId: string;
  trustScore: number; // 0-1, higher is better
  lastUpdated: Date;
  flags: string[];
  restrictions: UserRestriction[];
}

interface UserRestriction {
  type: 'mission_cooldown' | 'reward_limit' | 'badge_progress_freeze' | 'xp_cap';
  expiresAt: Date;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  metadata?: any;
}

export class AntiAbuseSystem {
  private rateLimits: Map<string, RateLimitRule>;
  private userAttempts: Map<string, Map<string, number[]>>; // userId -> action -> timestamps
  private suspiciousActivities: Map<string, SuspiciousActivity[]>; // userId -> activities
  private userTrustScores: Map<string, UserTrustScore>;
  private blockedActions: Map<string, Set<string>>; // userId -> blocked actions

  constructor() {
    this.rateLimits = this.initializeRateLimits();
    this.userAttempts = new Map();
    this.suspiciousActivities = new Map();
    this.userTrustScores = new Map();
    this.blockedActions = new Map();
  }

  // Main validation method
  async validateAction(
    userId: string,
    action: string,
    metadata?: any
  ): Promise<{
    allowed: boolean;
    reason?: string;
    cooldownMs?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    trustScoreImpact?: number;
  }> {
    // Check if user is temporarily blocked for this action
    if (this.isActionBlocked(userId, action)) {
      return {
        allowed: false,
        reason: 'Action temporarily blocked due to suspicious activity',
        riskLevel: 'high'
      };
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(userId, action);
    if (!rateLimitResult.allowed) {
      return rateLimitResult;
    }

    // Check suspicious activity patterns
    const suspiciousResult = await this.checkSuspiciousActivity(userId, action, metadata);
    if (!suspiciousResult.allowed) {
      return suspiciousResult;
    }

    // Check trust score thresholds
    const trustResult = await this.checkTrustScore(userId, action);
    if (!trustResult.allowed) {
      return trustResult;
    }

    // Action is allowed - log it
    await this.logAction(userId, action, metadata);

    return { allowed: true };
  }

  // Rate limiting implementation
  private async checkRateLimit(
    userId: string,
    action: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    cooldownMs?: number;
    riskLevel?: 'low' | 'medium' | 'high';
  }> {
    const rule = this.rateLimits.get(action);
    if (!rule) return { allowed: true };

    const userAttempts = this.getUserAttempts(userId, action);
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Clean old attempts
    const recentAttempts = userAttempts.filter(timestamp => timestamp > windowStart);
    this.setUserAttempts(userId, action, recentAttempts);

    if (recentAttempts.length >= rule.maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const cooldownMs = rule.windowMs - (now - oldestAttempt);

      // Apply punishment if configured
      if (rule.punishment) {
        await this.applyPunishment(userId, action, rule.punishment);
      }

      return {
        allowed: false,
        reason: `Rate limit exceeded: ${rule.maxAttempts} attempts per ${rule.windowMs / 1000} seconds`,
        cooldownMs,
        riskLevel: rule.punishment?.severity || 'medium'
      };
    }

    return { allowed: true };
  }

  // Suspicious activity detection
  private async checkSuspiciousActivity(
    userId: string,
    action: string,
    metadata?: any
  ): Promise<{
    allowed: boolean;
    reason?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    trustScoreImpact?: number;
  }> {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Pattern detection algorithms
    riskScore += await this.detectUnusualTiming(userId, action);
    if (riskScore > 0.1) riskFactors.push('unusual_timing');

    riskScore += await this.detectRepeatedPatterns(userId, action);
    if (riskScore > 0.2) riskFactors.push('repeated_patterns');

    riskScore += await this.detectVelocityAnomalies(userId, action);
    if (riskScore > 0.3) riskFactors.push('velocity_anomalies');

    riskScore += await this.detectMetadataManipulation(userId, action, metadata);
    if (riskScore > 0.4) riskFactors.push('metadata_manipulation');

    riskScore += await this.detectCoordinatedActivity(userId, action);
    if (riskScore > 0.5) riskFactors.push('coordinated_activity');

    // Normalize risk score
    riskScore = Math.min(1, riskScore);

    if (riskScore > 0.7) {
      // High risk - block immediately
      await this.blockUserAction(userId, action, 60, 'High risk activity detected');

      await this.logSuspiciousActivity({
        userId,
        activityType: action,
        timestamp: new Date(),
        metadata: { ...metadata, riskFactors },
        riskScore,
        autoBlocked: true
      });

      return {
        allowed: false,
        reason: 'Suspicious activity detected',
        riskLevel: 'high',
        trustScoreImpact: -0.2
      };
    } else if (riskScore > 0.4) {
      // Medium risk - log and continue with trust score impact
      await this.logSuspiciousActivity({
        userId,
        activityType: action,
        timestamp: new Date(),
        metadata: { ...metadata, riskFactors },
        riskScore,
        autoBlocked: false
      });

      return {
        allowed: true,
        riskLevel: 'medium',
        trustScoreImpact: -0.1
      };
    } else if (riskScore > 0.2) {
      // Low risk - just log
      return {
        allowed: true,
        riskLevel: 'low',
        trustScoreImpact: -0.05
      };
    }

    return { allowed: true };
  }

  // Trust score checking
  private async checkTrustScore(
    userId: string,
    action: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  }> {
    const trustScore = await this.getUserTrustScore(userId);

    // Define action-specific trust thresholds
    const thresholds = {
      'mission_complete': 0.3,
      'badge_claim': 0.4,
      'reward_claim': 0.5,
      'discount_generate': 0.6,
      'level_up': 0.2
    };

    const requiredTrust = thresholds[action as keyof typeof thresholds] || 0.1;

    if (trustScore.trustScore < requiredTrust) {
      return {
        allowed: false,
        reason: `Trust score too low for this action (${trustScore.trustScore.toFixed(2)} < ${requiredTrust})`,
        riskLevel: 'medium'
      };
    }

    return { allowed: true };
  }

  // Suspicious activity detection algorithms
  private async detectUnusualTiming(userId: string, action: string): Promise<number> {
    const attempts = this.getUserAttempts(userId, action);
    if (attempts.length < 3) return 0;

    const now = Date.now();
    const intervals = [];

    for (let i = 1; i < attempts.length; i++) {
      intervals.push(attempts[i] - attempts[i - 1]);
    }

    // Check for too-regular intervals (bot behavior)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);

    // Very low variance suggests automated behavior
    if (standardDeviation < avgInterval * 0.1 && avgInterval < 5000) {
      return 0.3; // High suspicion for bot behavior
    }

    // Check for burst activity (too many actions too quickly)
    const last5Minutes = attempts.filter(t => now - t < 300000); // 5 minutes
    if (last5Minutes.length > 20) {
      return 0.2; // Medium suspicion for burst activity
    }

    return 0;
  }

  private async detectRepeatedPatterns(userId: string, action: string): Promise<number> {
    const userActivities = this.suspiciousActivities.get(userId) || [];
    const recentActivities = userActivities.filter(
      a => Date.now() - a.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentActivities.length < 5) return 0;

    // Look for repeated metadata patterns
    const metadataPatterns = new Map<string, number>();

    for (const activity of recentActivities) {
      const pattern = JSON.stringify(activity.metadata);
      metadataPatterns.set(pattern, (metadataPatterns.get(pattern) || 0) + 1);
    }

    const maxRepeats = Math.max(...metadataPatterns.values());
    if (maxRepeats > 5) {
      return Math.min(0.4, maxRepeats * 0.08);
    }

    return 0;
  }

  private async detectVelocityAnomalies(userId: string, action: string): Promise<number> {
    const attempts = this.getUserAttempts(userId, action);
    const now = Date.now();

    // Calculate attempts in different time windows
    const last1Min = attempts.filter(t => now - t < 60000).length;
    const last5Min = attempts.filter(t => now - t < 300000).length;
    const last1Hour = attempts.filter(t => now - t < 3600000).length;

    // Define suspicious velocity thresholds per action type
    const thresholds = {
      mission_complete: { min1: 3, min5: 10, hour1: 30 },
      reward_claim: { min1: 2, min5: 5, hour1: 15 },
      badge_progress: { min1: 5, min5: 20, hour1: 50 }
    };

    const threshold = thresholds[action as keyof typeof thresholds] || { min1: 2, min5: 8, hour1: 25 };

    let riskScore = 0;

    if (last1Min > threshold.min1) riskScore += 0.3;
    if (last5Min > threshold.min5) riskScore += 0.2;
    if (last1Hour > threshold.hour1) riskScore += 0.1;

    return Math.min(0.6, riskScore);
  }

  private async detectMetadataManipulation(userId: string, action: string, metadata?: any): Promise<number> {
    if (!metadata) return 0;

    let riskScore = 0;

    // Check for impossible values
    if (metadata.timeSpent !== undefined && metadata.timeSpent < 5) {
      riskScore += 0.2; // Too fast completion
    }

    if (metadata.qualityScore !== undefined && metadata.qualityScore === 1.0) {
      // Perfect scores are rare, check if user has many perfect scores
      const recentPerfectScores = (this.suspiciousActivities.get(userId) || [])
        .filter(a => a.metadata?.qualityScore === 1.0 && Date.now() - a.timestamp.getTime() < 86400000)
        .length;

      if (recentPerfectScores > 3) {
        riskScore += 0.25;
      }
    }

    // Check for client-side manipulation indicators
    if (metadata.clientTimestamp && metadata.serverTimestamp) {
      const timeDiff = Math.abs(metadata.serverTimestamp - metadata.clientTimestamp);
      if (timeDiff > 5000) { // More than 5 seconds difference
        riskScore += 0.15;
      }
    }

    return Math.min(0.5, riskScore);
  }

  private async detectCoordinatedActivity(userId: string, action: string): Promise<number> {
    // This would check for coordinated activity across multiple users
    // For now, return 0 as it requires cross-user analysis
    return 0;
  }

  // Trust score management
  async updateTrustScore(
    userId: string,
    impact: number,
    reason: string
  ): Promise<void> {
    const current = await this.getUserTrustScore(userId);
    const newScore = Math.max(0, Math.min(1, current.trustScore + impact));

    const updated: UserTrustScore = {
      ...current,
      trustScore: newScore,
      lastUpdated: new Date()
    };

    if (impact < 0) {
      updated.flags.push(`${reason} (${impact.toFixed(2)})`);
    }

    this.userTrustScores.set(userId, updated);

    console.log(`Trust score updated for user ${userId}: ${current.trustScore.toFixed(2)} -> ${newScore.toFixed(2)} (${reason})`);
  }

  // Punishment system
  private async applyPunishment(
    userId: string,
    action: string,
    punishment: RateLimitRule['punishment']
  ): Promise<void> {
    if (!punishment) return;

    const restriction: UserRestriction = {
      type: this.mapPunishmentToRestriction(punishment.type),
      expiresAt: new Date(Date.now() + (punishment.duration || 30) * 60000),
      reason: `Rate limit violation: ${action}`,
      severity: punishment.severity
    };

    const trustScore = await this.getUserTrustScore(userId);
    trustScore.restrictions.push(restriction);
    this.userTrustScores.set(userId, trustScore);

    // Apply immediate effects
    switch (punishment.type) {
      case 'temporary_ban':
        await this.blockUserAction(userId, action, punishment.duration || 30, 'Temporary ban for rate limit violation');
        break;
      case 'xp_penalty':
        await this.applyXPPenalty(userId, 0.1); // 10% XP penalty
        break;
      case 'feature_restriction':
        await this.restrictFeature(userId, action, punishment.duration || 60);
        break;
    }

    console.log(`Punishment applied to user ${userId}: ${punishment.type} for ${punishment.duration || 30} minutes`);
  }

  private mapPunishmentToRestriction(punishmentType: string): UserRestriction['type'] {
    const mapping = {
      temporary_ban: 'mission_cooldown',
      xp_penalty: 'xp_cap',
      feature_restriction: 'badge_progress_freeze'
    };
    return mapping[punishmentType as keyof typeof mapping] as UserRestriction['type'] || 'mission_cooldown';
  }

  // Action blocking
  private async blockUserAction(
    userId: string,
    action: string,
    durationMinutes: number,
    reason: string
  ): Promise<void> {
    const userBlocked = this.blockedActions.get(userId) || new Set();
    userBlocked.add(action);
    this.blockedActions.set(userId, userBlocked);

    // Auto-unblock after duration
    setTimeout(() => {
      const stillBlocked = this.blockedActions.get(userId);
      if (stillBlocked) {
        stillBlocked.delete(action);
        if (stillBlocked.size === 0) {
          this.blockedActions.delete(userId);
        }
      }
      console.log(`User ${userId} unblocked for action ${action}`);
    }, durationMinutes * 60000);

    console.log(`User ${userId} blocked from action ${action} for ${durationMinutes} minutes: ${reason}`);
  }

  private isActionBlocked(userId: string, action: string): boolean {
    const userBlocked = this.blockedActions.get(userId);
    return userBlocked?.has(action) || false;
  }

  // Penalty applications
  private async applyXPPenalty(userId: string, penaltyPercentage: number): Promise<void> {
    // In production, reduce user's XP by the penalty percentage
    console.log(`XP penalty applied to user ${userId}: ${penaltyPercentage * 100}%`);
  }

  private async restrictFeature(userId: string, feature: string, durationMinutes: number): Promise<void> {
    // In production, restrict specific features for the user
    console.log(`Feature ${feature} restricted for user ${userId} for ${durationMinutes} minutes`);
  }

  // Utility methods
  private getUserAttempts(userId: string, action: string): number[] {
    const userAttempts = this.userAttempts.get(userId) || new Map();
    return userAttempts.get(action) || [];
  }

  private setUserAttempts(userId: string, action: string, attempts: number[]): void {
    const userAttempts = this.userAttempts.get(userId) || new Map();
    userAttempts.set(action, attempts);
    this.userAttempts.set(userId, userAttempts);
  }

  private async logAction(userId: string, action: string, metadata?: any): Promise<void> {
    const userAttempts = this.getUserAttempts(userId, action);
    userAttempts.push(Date.now());
    this.setUserAttempts(userId, action, userAttempts);

    // Update trust score positively for legitimate actions
    await this.updateTrustScore(userId, 0.01, 'legitimate_action');
  }

  private async logSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    const userActivities = this.suspiciousActivities.get(activity.userId) || [];
    userActivities.push(activity);

    // Keep only last 100 activities per user
    if (userActivities.length > 100) {
      userActivities.shift();
    }

    this.suspiciousActivities.set(activity.userId, userActivities);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'suspicious_activity', {
        activity_type: activity.activityType,
        risk_score: activity.riskScore,
        auto_blocked: activity.autoBlocked
      });
    }

    console.log(`Suspicious activity logged for user ${activity.userId}: ${activity.activityType} (risk: ${activity.riskScore.toFixed(2)})`);
  }

  private async getUserTrustScore(userId: string): Promise<UserTrustScore> {
    const existing = this.userTrustScores.get(userId);
    if (existing) return existing;

    // Initialize new user with default trust score
    const newTrustScore: UserTrustScore = {
      userId,
      trustScore: 0.8, // Start with high trust
      lastUpdated: new Date(),
      flags: [],
      restrictions: []
    };

    this.userTrustScores.set(userId, newTrustScore);
    return newTrustScore;
  }

  // Configuration
  private initializeRateLimits(): Map<string, RateLimitRule> {
    const limits = new Map<string, RateLimitRule>();

    // Mission-related limits
    limits.set('mission_start', {
      action: 'mission_start',
      windowMs: 60000, // 1 minute
      maxAttempts: 3
    });

    limits.set('mission_complete', {
      action: 'mission_complete',
      windowMs: 300000, // 5 minutes
      maxAttempts: 2,
      punishment: {
        type: 'temporary_ban',
        duration: 15,
        severity: 'medium'
      }
    });

    limits.set('step_complete', {
      action: 'step_complete',
      windowMs: 30000, // 30 seconds
      maxAttempts: 5
    });

    // Reward-related limits
    limits.set('reward_claim', {
      action: 'reward_claim',
      windowMs: 60000, // 1 minute
      maxAttempts: 2,
      punishment: {
        type: 'feature_restriction',
        duration: 30,
        severity: 'high'
      }
    });

    limits.set('discount_generate', {
      action: 'discount_generate',
      windowMs: 300000, // 5 minutes
      maxAttempts: 1,
      punishment: {
        type: 'temporary_ban',
        duration: 60,
        severity: 'high'
      }
    });

    // Badge-related limits
    limits.set('badge_progress', {
      action: 'badge_progress',
      windowMs: 60000, // 1 minute
      maxAttempts: 10
    });

    // XP-related limits
    limits.set('xp_earn', {
      action: 'xp_earn',
      windowMs: 60000, // 1 minute
      maxAttempts: 20,
      punishment: {
        type: 'xp_penalty',
        duration: 30,
        severity: 'medium'
      }
    });

    return limits;
  }

  // Admin methods for monitoring
  async getSuspiciousUsers(limit: number = 50): Promise<Array<{
    userId: string;
    trustScore: number;
    recentFlags: string[];
    riskLevel: 'low' | 'medium' | 'high';
    totalSuspiciousActivities: number;
  }>> {
    const users = [];

    for (const [userId, trustScore] of this.userTrustScores.entries()) {
      const activities = this.suspiciousActivities.get(userId) || [];
      const recentActivities = activities.filter(
        a => Date.now() - a.timestamp.getTime() < 86400000 // Last 24 hours
      );

      const riskLevel = trustScore.trustScore < 0.3 ? 'high' :
                       trustScore.trustScore < 0.6 ? 'medium' : 'low';

      users.push({
        userId,
        trustScore: trustScore.trustScore,
        recentFlags: trustScore.flags.slice(-5),
        riskLevel,
        totalSuspiciousActivities: recentActivities.length
      });
    }

    return users
      .sort((a, b) => a.trustScore - b.trustScore)
      .slice(0, limit);
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    blockedUsers: number;
    averageTrustScore: number;
    suspiciousActivitiesToday: number;
    rateLimitViolations: number;
  }> {
    const totalUsers = this.userTrustScores.size;
    const blockedUsers = this.blockedActions.size;

    const trustScores = Array.from(this.userTrustScores.values()).map(u => u.trustScore);
    const averageTrustScore = trustScores.reduce((a, b) => a + b, 0) / trustScores.length || 0;

    const today = Date.now() - 86400000; // 24 hours ago
    let suspiciousActivitiesToday = 0;

    for (const activities of this.suspiciousActivities.values()) {
      suspiciousActivitiesToday += activities.filter(a => a.timestamp.getTime() > today).length;
    }

    // Mock rate limit violations count
    const rateLimitViolations = Math.floor(suspiciousActivitiesToday * 0.3);

    return {
      totalUsers,
      blockedUsers,
      averageTrustScore,
      suspiciousActivitiesToday,
      rateLimitViolations
    };
  }
}