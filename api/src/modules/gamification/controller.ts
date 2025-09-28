import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';

// Gamification schemas
const missionCompletionSchema = z.object({
  missionId: z.string(),
  data: z.record(z.any()).optional()
});

const badgeClaimSchema = z.object({
  badgeId: z.string(),
  evidenceData: z.record(z.any()).optional()
});

export const getUserProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    // Get user progress
    const progressDoc = await db.collection('userProgress').doc(userId).get();

    let progress;
    if (!progressDoc.exists) {
      // Initialize progress for new user
      progress = await initializeUserProgress(userId);
    } else {
      progress = {
        id: progressDoc.id,
        ...progressDoc.data(),
        createdAt: progressDoc.data()!.createdAt?.toDate(),
        updatedAt: progressDoc.data()!.updatedAt?.toDate()
      };
    }

    // Get active missions
    const activeMissionsSnapshot = await db.collection('userMissions')
      .where('userId', '==', userId)
      .where('status', 'in', ['available', 'in_progress'])
      .orderBy('createdAt', 'desc')
      .get();

    const activeMissions = activeMissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Get recent achievements
    const recentAchievementsSnapshot = await db.collection('userAchievements')
      .where('userId', '==', userId)
      .orderBy('unlockedAt', 'desc')
      .limit(5)
      .get();

    const recentAchievements = recentAchievementsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      unlockedAt: doc.data().unlockedAt?.toDate()
    }));

    // Get available rewards
    const availableRewardsSnapshot = await db.collection('rewards')
      .where('isActive', '==', true)
      .where('requiredLevel', '<=', progress.level)
      .orderBy('requiredLevel', 'asc')
      .get();

    const availableRewards = availableRewardsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate level progress
    const currentLevelXp = calculateLevelXp(progress.level);
    const nextLevelXp = calculateLevelXp(progress.level + 1);
    const levelProgress = ((progress.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    res.json({
      progress: {
        ...progress,
        levelProgress: Math.min(100, Math.max(0, levelProgress)),
        xpToNextLevel: Math.max(0, nextLevelXp - progress.xp)
      },
      activeMissions,
      recentAchievements,
      availableRewards
    });

  } catch (error) {
    logger.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Errore nel recuperare i progressi' });
  }
};

export const getAvailableMissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { category, difficulty } = req.query;

    // Get user progress to check eligibility
    const progressDoc = await db.collection('userProgress').doc(userId).get();
    const userProgress = progressDoc.data();

    if (!userProgress) {
      return res.status(404).json({ error: 'Progressi utente non trovati' });
    }

    // Get all missions
    let missionsQuery = db.collection('missions').where('isActive', '==', true);

    if (category) {
      missionsQuery = missionsQuery.where('category', '==', category);
    }

    if (difficulty) {
      missionsQuery = missionsQuery.where('difficulty', '==', difficulty);
    }

    const missionsSnapshot = await missionsQuery.get();
    const allMissions = missionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get user's mission history
    const userMissionsSnapshot = await db.collection('userMissions')
      .where('userId', '==', userId)
      .get();

    const userMissionMap = new Map();
    userMissionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      userMissionMap.set(data.missionId, data);
    });

    // Filter missions based on user eligibility and status
    const availableMissions = allMissions.filter(mission => {
      // Check level requirement
      if (mission.requiredLevel > userProgress.level) {
        return false;
      }

      // Check prerequisites
      if (mission.prerequisites && mission.prerequisites.length > 0) {
        const completedMissions = userMissionsSnapshot.docs
          .filter(doc => doc.data().status === 'completed')
          .map(doc => doc.data().missionId);

        const hasPrerequisites = mission.prerequisites.every((prereq: string) =>
          completedMissions.includes(prereq)
        );

        if (!hasPrerequisites) {
          return false;
        }
      }

      // Check if mission is already completed (unless repeatable)
      const userMission = userMissionMap.get(mission.id);
      if (userMission && userMission.status === 'completed' && !mission.repeatable) {
        return false;
      }

      return true;
    });

    // Add user mission status to each mission
    const missionsWithStatus = availableMissions.map(mission => {
      const userMission = userMissionMap.get(mission.id);
      return {
        ...mission,
        userStatus: userMission?.status || 'available',
        userProgress: userMission?.progress || {},
        startedAt: userMission?.startedAt?.toDate() || null,
        completedAt: userMission?.completedAt?.toDate() || null
      };
    });

    res.json({
      missions: missionsWithStatus,
      userLevel: userProgress.level,
      userXp: userProgress.xp
    });

  } catch (error) {
    logger.error('Error fetching available missions:', error);
    res.status(500).json({ error: 'Errore nel recuperare le missioni' });
  }
};

export const startMission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { missionId } = req.params;

    // Get mission details
    const missionDoc = await db.collection('missions').doc(missionId).get();

    if (!missionDoc.exists) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }

    const mission = missionDoc.data()!;

    if (!mission.isActive) {
      return res.status(400).json({ error: 'Missione non disponibile' });
    }

    // Check if user already has this mission
    const existingMissionDoc = await db.collection('userMissions')
      .where('userId', '==', userId)
      .where('missionId', '==', missionId)
      .limit(1)
      .get();

    if (!existingMissionDoc.empty) {
      const existingMission = existingMissionDoc.docs[0].data();
      if (existingMission.status === 'completed' && !mission.repeatable) {
        return res.status(400).json({ error: 'Missione già completata' });
      }
      if (existingMission.status === 'in_progress') {
        return res.status(400).json({ error: 'Missione già in corso' });
      }
    }

    // Create user mission
    const userMissionRef = db.collection('userMissions').doc();
    const userMissionData = {
      id: userMissionRef.id,
      userId,
      missionId,
      status: 'in_progress',
      progress: initializeMissionProgress(mission),
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await userMissionRef.set(userMissionData);

    logger.info('Mission started', { userId, missionId, userMissionId: userMissionRef.id });

    res.status(201).json({
      id: userMissionRef.id,
      ...userMissionData,
      mission: {
        id: missionDoc.id,
        ...mission
      }
    });

  } catch (error) {
    logger.error('Error starting mission:', error);
    res.status(500).json({ error: 'Errore nell\'avviare la missione' });
  }
};

export const completeMission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const validatedData = missionCompletionSchema.parse(req.body);

    // Get user mission
    const userMissionSnapshot = await db.collection('userMissions')
      .where('userId', '==', userId)
      .where('missionId', '==', validatedData.missionId)
      .where('status', '==', 'in_progress')
      .limit(1)
      .get();

    if (userMissionSnapshot.empty) {
      return res.status(404).json({ error: 'Missione non trovata o non in corso' });
    }

    const userMissionDoc = userMissionSnapshot.docs[0];
    const userMission = userMissionDoc.data();

    // Get mission details
    const missionDoc = await db.collection('missions').doc(validatedData.missionId).get();
    const mission = missionDoc.data()!;

    // Validate mission completion
    const isValid = await validateMissionCompletion(mission, userMission, validatedData.data);

    if (!isValid) {
      return res.status(400).json({ error: 'Requisiti della missione non soddisfatti' });
    }

    // Complete mission
    const batch = db.batch();

    // Update user mission
    batch.update(userMissionDoc.ref, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      completionData: validatedData.data
    });

    // Update user progress
    const progressRef = db.collection('userProgress').doc(userId);
    const xpGained = mission.xpReward || 0;
    const pointsGained = mission.pointsReward || 0;

    batch.update(progressRef, {
      xp: db.FieldValue.increment(xpGained),
      totalPoints: db.FieldValue.increment(pointsGained),
      missionsCompleted: db.FieldValue.increment(1),
      updatedAt: new Date()
    });

    // Check for level up
    const progressDoc = await progressRef.get();
    const currentProgress = progressDoc.data()!;
    const newXp = currentProgress.xp + xpGained;
    const newLevel = calculateLevel(newXp);

    if (newLevel > currentProgress.level) {
      batch.update(progressRef, {
        level: newLevel
      });

      // Award level up rewards
      await awardLevelUpRewards(userId, newLevel, batch);
    }

    // Award mission rewards
    if (mission.rewards && mission.rewards.length > 0) {
      await awardMissionRewards(userId, mission.rewards, batch);
    }

    // Check for badge unlocks
    await checkBadgeUnlocks(userId, validatedData.missionId, batch);

    await batch.commit();

    logger.info('Mission completed', {
      userId,
      missionId: validatedData.missionId,
      xpGained,
      pointsGained,
      newLevel: newLevel > currentProgress.level ? newLevel : currentProgress.level
    });

    res.json({
      success: true,
      xpGained,
      pointsGained,
      levelUp: newLevel > currentProgress.level,
      newLevel: newLevel > currentProgress.level ? newLevel : null,
      message: 'Missione completata con successo!'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error completing mission:', error);
    res.status(500).json({ error: 'Errore nel completare la missione' });
  }
};

export const getUserBadges = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    // Get user achievements (earned badges)
    const achievementsSnapshot = await db.collection('userAchievements')
      .where('userId', '==', userId)
      .orderBy('unlockedAt', 'desc')
      .get();

    const earnedBadgeIds = achievementsSnapshot.docs.map(doc => doc.data().badgeId);

    // Get all badges
    const badgesSnapshot = await db.collection('badges')
      .where('isActive', '==', true)
      .orderBy('category', 'asc')
      .orderBy('tier', 'asc')
      .get();

    const badges = badgesSnapshot.docs.map(doc => {
      const badgeData = doc.data();
      const achievement = achievementsSnapshot.docs.find(
        achieveDoc => achieveDoc.data().badgeId === doc.id
      );

      return {
        id: doc.id,
        ...badgeData,
        earned: earnedBadgeIds.includes(doc.id),
        unlockedAt: achievement?.data().unlockedAt?.toDate() || null,
        progress: achievement?.data().progress || null
      };
    });

    // Group badges by category
    const badgesByCategory = badges.reduce((acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate stats
    const stats = {
      totalBadges: badges.length,
      earnedBadges: earnedBadgeIds.length,
      completionPercentage: (earnedBadgeIds.length / badges.length) * 100,
      categoriesCompleted: Object.keys(badgesByCategory).filter(category =>
        badgesByCategory[category].every(badge => badge.earned)
      ).length
    };

    res.json({
      badges,
      badgesByCategory,
      stats
    });

  } catch (error) {
    logger.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Errore nel recuperare i badge' });
  }
};

export const claimReward = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { rewardId } = req.params;

    // Get reward details
    const rewardDoc = await db.collection('rewards').doc(rewardId).get();

    if (!rewardDoc.exists) {
      return res.status(404).json({ error: 'Ricompensa non trovata' });
    }

    const reward = rewardDoc.data()!;

    if (!reward.isActive) {
      return res.status(400).json({ error: 'Ricompensa non disponibile' });
    }

    // Get user progress
    const progressDoc = await db.collection('userProgress').doc(userId).get();
    const userProgress = progressDoc.data()!;

    // Check eligibility
    if (userProgress.level < reward.requiredLevel) {
      return res.status(400).json({ error: 'Livello insufficiente' });
    }

    if (userProgress.totalPoints < reward.requiredPoints) {
      return res.status(400).json({ error: 'Punti insufficienti' });
    }

    // Check if already claimed (if not repeatable)
    if (!reward.repeatable) {
      const existingClaimSnapshot = await db.collection('userRewards')
        .where('userId', '==', userId)
        .where('rewardId', '==', rewardId)
        .limit(1)
        .get();

      if (!existingClaimSnapshot.empty) {
        return res.status(400).json({ error: 'Ricompensa già riscattata' });
      }
    }

    // Check stock (if limited)
    if (reward.maxClaims && reward.maxClaims > 0) {
      const claimsSnapshot = await db.collection('userRewards')
        .where('rewardId', '==', rewardId)
        .get();

      if (claimsSnapshot.size >= reward.maxClaims) {
        return res.status(400).json({ error: 'Ricompensa esaurita' });
      }
    }

    // Process reward claim
    const batch = db.batch();

    // Create user reward record
    const userRewardRef = db.collection('userRewards').doc();
    batch.set(userRewardRef, {
      id: userRewardRef.id,
      userId,
      rewardId,
      rewardType: reward.type,
      rewardValue: reward.value,
      claimedAt: new Date(),
      status: 'claimed',
      data: {}
    });

    // Deduct points
    batch.update(progressDoc.ref, {
      totalPoints: db.FieldValue.increment(-reward.requiredPoints),
      updatedAt: new Date()
    });

    // Apply reward effects
    await applyRewardEffects(userId, reward, batch);

    await batch.commit();

    logger.info('Reward claimed', {
      userId,
      rewardId,
      rewardType: reward.type,
      pointsSpent: reward.requiredPoints
    });

    res.json({
      success: true,
      message: 'Ricompensa riscattata con successo!',
      reward: {
        id: rewardDoc.id,
        ...reward
      },
      pointsSpent: reward.requiredPoints
    });

  } catch (error) {
    logger.error('Error claiming reward:', error);
    res.status(500).json({ error: 'Errore nel riscattare la ricompensa' });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { period = 'all', limit = 50 } = req.query;

    let query = db.collection('userProgress')
      .orderBy('xp', 'desc')
      .limit(parseInt(limit as string, 10));

    // Apply period filter if needed
    if (period !== 'all') {
      // For monthly/weekly leaderboards, you'd need to track period-specific XP
      // This is a simplified version using total XP
    }

    const snapshot = await query.get();
    const leaderboard = [];

    for (const doc of snapshot.docs) {
      const progressData = doc.data();

      // Get user basic info
      const userDoc = await db.collection('users').doc(doc.id).get();
      const userData = userDoc.data();

      if (userData) {
        leaderboard.push({
          userId: doc.id,
          username: userData.name || 'Utente anonimo',
          avatar: userData.avatar || null,
          level: progressData.level,
          xp: progressData.xp,
          totalPoints: progressData.totalPoints,
          missionsCompleted: progressData.missionsCompleted || 0,
          badgesEarned: Object.keys(progressData.achievements || {}).length
        });
      }
    }

    res.json({
      leaderboard,
      period,
      lastUpdated: new Date()
    });

  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Errore nel recuperare la classifica' });
  }
};

// Helper functions

async function initializeUserProgress(userId: string) {
  const progressRef = db.collection('userProgress').doc(userId);
  const initialProgress = {
    userId,
    level: 1,
    xp: 0,
    totalPoints: 0,
    missionsCompleted: 0,
    badgesEarned: [],
    achievements: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await progressRef.set(initialProgress);
  return { id: progressRef.id, ...initialProgress };
}

function calculateLevel(xp: number): number {
  // Level progression: Level = floor(sqrt(XP / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function calculateLevelXp(level: number): number {
  // XP required for level: XP = (level - 1)² * 100
  return Math.pow(level - 1, 2) * 100;
}

function initializeMissionProgress(mission: any) {
  const progress: any = {};

  if (mission.objectives) {
    mission.objectives.forEach((objective: any) => {
      progress[objective.id] = {
        completed: false,
        current: 0,
        target: objective.target || 1
      };
    });
  }

  return progress;
}

async function validateMissionCompletion(mission: any, userMission: any, data?: any): Promise<boolean> {
  // Basic validation - in a real implementation, this would be much more sophisticated
  if (!mission.objectives) {
    return true; // No specific objectives
  }

  for (const objective of mission.objectives) {
    const progress = userMission.progress[objective.id];
    if (!progress || !progress.completed) {
      return false;
    }
  }

  return true;
}

async function awardLevelUpRewards(userId: string, newLevel: number, batch: any) {
  // Award level-up specific rewards
  const levelRewards = {
    5: { type: 'points', value: 100 },
    10: { type: 'badge', value: 'veteran' },
    20: { type: 'discount', value: 10 },
    50: { type: 'badge', value: 'master' }
  };

  const reward = levelRewards[newLevel as keyof typeof levelRewards];
  if (reward) {
    // Apply level up reward
  }
}

async function awardMissionRewards(userId: string, rewards: any[], batch: any) {
  for (const reward of rewards) {
    // Process each reward
    if (reward.type === 'points') {
      const progressRef = db.collection('userProgress').doc(userId);
      batch.update(progressRef, {
        totalPoints: db.FieldValue.increment(reward.value)
      });
    }
    // Handle other reward types
  }
}

async function checkBadgeUnlocks(userId: string, completedMissionId: string, batch: any) {
  // Check if completing this mission unlocks any badges
  const badgesSnapshot = await db.collection('badges')
    .where('isActive', '==', true)
    .where('criteria.type', '==', 'mission_completion')
    .get();

  for (const badgeDoc of badgesSnapshot.docs) {
    const badge = badgeDoc.data();

    // Check if user already has this badge
    const existingAchievement = await db.collection('userAchievements')
      .where('userId', '==', userId)
      .where('badgeId', '==', badgeDoc.id)
      .limit(1)
      .get();

    if (!existingAchievement.empty) {
      continue; // Already has this badge
    }

    // Check badge criteria
    if (await evaluateBadgeCriteria(userId, badge.criteria)) {
      // Award badge
      const achievementRef = db.collection('userAchievements').doc();
      batch.set(achievementRef, {
        id: achievementRef.id,
        userId,
        badgeId: badgeDoc.id,
        badgeName: badge.name,
        badgeDescription: badge.description,
        unlockedAt: new Date(),
        xpEarned: badge.xpReward || 0
      });

      // Update user progress
      const progressRef = db.collection('userProgress').doc(userId);
      batch.update(progressRef, {
        xp: db.FieldValue.increment(badge.xpReward || 0),
        badgesEarned: db.FieldValue.arrayUnion(badgeDoc.id)
      });
    }
  }
}

async function evaluateBadgeCriteria(userId: string, criteria: any): Promise<boolean> {
  // Simplified criteria evaluation
  // In a real implementation, this would be much more sophisticated
  return Math.random() > 0.8; // 20% chance for demo purposes
}

async function applyRewardEffects(userId: string, reward: any, batch: any) {
  switch (reward.type) {
    case 'discount_coupon':
      // Create discount coupon
      const couponRef = db.collection('userCoupons').doc();
      batch.set(couponRef, {
        id: couponRef.id,
        userId,
        code: generateCouponCode(),
        discountPercentage: reward.value,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        used: false,
        createdAt: new Date()
      });
      break;

    case 'free_shipping':
      // Grant free shipping credit
      const creditRef = db.collection('userCredits').doc();
      batch.set(creditRef, {
        id: creditRef.id,
        userId,
        type: 'free_shipping',
        value: reward.value,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        used: false,
        createdAt: new Date()
      });
      break;

    case 'premium_feature':
      // Grant premium feature access
      batch.update(db.collection('users').doc(userId), {
        premiumFeatures: db.FieldValue.arrayUnion(reward.value),
        updatedAt: new Date()
      });
      break;

    default:
      // Handle other reward types
      break;
  }
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}