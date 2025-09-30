import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { db } from '../config/firebase';
import { z } from 'zod';

const router = Router();

const completeMissionSchema = z.object({
  missionId: z.string(),
  data: z.object({}).optional()
});

const redeemRewardSchema = z.object({
  rewardId: z.string(),
  shippingAddress: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }).optional()
});

router.get('/profile', auth, requireAuth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() || {};

    const gamificationData = userData.gamification || {
      points: 0,
      level: 1,
      badges: [],
      completedMissions: [],
      streak: {
        current: 0,
        longest: 0,
        lastCheckIn: null
      }
    };

    // Calculate level based on points
    const level = calculateLevel(gamificationData.points);
    const { currentLevelPoints, nextLevelPoints, pointsToNext } = getLevelProgress(gamificationData.points);

    // Get recent transactions
    const transactionsSnapshot = await db.collection('pointsTransactions')
      .where('userId', '==', req.user!.uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const recentTransactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get available missions
    const missionsSnapshot = await db.collection('missions')
      .where('active', '==', true)
      .get();

    const availableMissions = missionsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(mission => !gamificationData.completedMissions.includes(mission.id))
      .map(mission => ({
        ...mission,
        progress: calculateMissionProgress(mission, userData, req.user!.uid)
      }));

    // Get user badges with details
    const badgesSnapshot = await db.collection('badges')
      .where('id', 'in', gamificationData.badges.length > 0 ? gamificationData.badges : ['dummy'])
      .get();

    const badges = badgesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      earnedAt: gamificationData.badgeEarnedDates?.[doc.id] || null
    }));

    res.json({
      points: gamificationData.points,
      level,
      levelProgress: {
        current: currentLevelPoints,
        next: nextLevelPoints,
        pointsToNext
      },
      badges,
      streak: gamificationData.streak,
      recentTransactions,
      availableMissions
    });
  } catch (error) {
    console.error('Error fetching gamification profile:', error);
    res.status(500).json({ error: 'Failed to fetch gamification profile' });
  }
});

router.get('/missions', auth, requireAuth, async (req, res) => {
  try {
    const { category, status = 'available' } = req.query;

    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() || {};
    const gamificationData = userData.gamification || {};

    let query = db.collection('missions').where('active', '==', true);

    if (category) {
      query = query.where('category', '==', category);
    }

    const missionsSnapshot = await query.get();
    let missions = missionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter based on status
    switch (status) {
      case 'available':
        missions = missions.filter(mission =>
          !gamificationData.completedMissions?.includes(mission.id)
        );
        break;
      case 'completed':
        missions = missions.filter(mission =>
          gamificationData.completedMissions?.includes(mission.id)
        );
        break;
    }

    // Add progress information
    const missionsWithProgress = missions.map(mission => ({
      ...mission,
      progress: calculateMissionProgress(mission, userData, req.user!.uid)
    }));

    res.json(missionsWithProgress);
  } catch (error) {
    console.error('Error fetching missions:', error);
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

router.post('/missions/:id/complete', auth, requireAuth, validateBody(completeMissionSchema), async (req, res) => {
  try {
    const { data } = req.body;

    const missionDoc = await db.collection('missions').doc(req.params.id).get();
    if (!missionDoc.exists) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const mission = missionDoc.data()!;
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() || {};
    const gamificationData = userData.gamification || {};

    // Check if mission is already completed
    if (gamificationData.completedMissions?.includes(req.params.id)) {
      return res.status(400).json({ error: 'Mission already completed' });
    }

    // Verify mission completion
    const isCompleted = await verifyMissionCompletion(mission, userData, req.user!.uid, data);
    if (!isCompleted) {
      return res.status(400).json({ error: 'Mission requirements not met' });
    }

    // Award points and update user
    const currentPoints = gamificationData.points || 0;
    const newPoints = currentPoints + mission.points;

    await db.collection('users').doc(req.user!.uid).update({
      'gamification.points': newPoints,
      'gamification.completedMissions': [
        ...(gamificationData.completedMissions || []),
        req.params.id
      ],
      'gamification.lastMissionCompletedAt': new Date()
    });

    // Record points transaction
    await db.collection('pointsTransactions').add({
      userId: req.user!.uid,
      type: 'earned',
      amount: mission.points,
      source: 'mission',
      sourceId: req.params.id,
      description: `Missione completata: ${mission.title}`,
      createdAt: new Date()
    });

    // Check for new badges
    await checkAndAwardBadges(req.user!.uid, {
      ...gamificationData,
      points: newPoints,
      completedMissions: [...(gamificationData.completedMissions || []), req.params.id]
    });

    res.json({
      message: 'Mission completed successfully',
      pointsEarned: mission.points,
      totalPoints: newPoints
    });
  } catch (error) {
    console.error('Error completing mission:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
});

router.get('/leaderboard', auth, requireAuth, async (req, res) => {
  try {
    const { period = 'all', limit = 100 } = req.query;
    const limitNum = parseInt(limit as string);

    let startDate: Date | null = null;

    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    if (startDate) {
      // For period-based leaderboards, aggregate recent transactions
      const transactionsSnapshot = await db.collection('pointsTransactions')
        .where('type', '==', 'earned')
        .where('createdAt', '>=', startDate)
        .get();

      const userPoints: { [key: string]: number } = {};
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        userPoints[data.userId] = (userPoints[data.userId] || 0) + data.amount;
      });

      const sortedUsers = Object.entries(userPoints)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limitNum);

      const leaderboard = await Promise.all(
        sortedUsers.map(async ([userId, points], index) => {
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data() || {};

          return {
            rank: index + 1,
            userId,
            name: userData.displayName || userData.email || 'Utente Anonimo',
            avatar: userData.photoURL,
            points,
            isCurrentUser: userId === req.user!.uid
          };
        })
      );

      res.json({ leaderboard, period });
    } else {
      // All-time leaderboard
      const usersSnapshot = await db.collection('users')
        .orderBy('gamification.points', 'desc')
        .limit(limitNum)
        .get();

      const leaderboard = usersSnapshot.docs.map((doc, index) => {
        const userData = doc.data();
        return {
          rank: index + 1,
          userId: doc.id,
          name: userData.displayName || userData.email || 'Utente Anonimo',
          avatar: userData.photoURL,
          points: userData.gamification?.points || 0,
          level: calculateLevel(userData.gamification?.points || 0),
          isCurrentUser: doc.id === req.user!.uid
        };
      });

      res.json({ leaderboard, period });
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/rewards', auth, requireAuth, async (req, res) => {
  try {
    const { category, available = true } = req.query;

    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() || {};
    const userPoints = userData.gamification?.points || 0;

    let query = db.collection('rewards').where('active', '==', true);

    if (category) {
      query = query.where('category', '==', category);
    }

    const rewardsSnapshot = await query.orderBy('pointsCost', 'asc').get();
    let rewards = rewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (available === 'true') {
      rewards = rewards.filter(reward => reward.pointsCost <= userPoints);
    }

    // Add user's redemption history
    const redemptionsSnapshot = await db.collection('rewardRedemptions')
      .where('userId', '==', req.user!.uid)
      .get();

    const userRedemptions = redemptionsSnapshot.docs.reduce((acc, doc) => {
      const data = doc.data();
      acc[data.rewardId] = (acc[data.rewardId] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const rewardsWithRedemptions = rewards.map(reward => ({
      ...reward,
      canRedeem: reward.pointsCost <= userPoints,
      redeemedCount: userRedemptions[reward.id] || 0,
      isLimited: reward.maxRedemptions > 0,
      remainingRedemptions: reward.maxRedemptions > 0
        ? Math.max(0, reward.maxRedemptions - (userRedemptions[reward.id] || 0))
        : null
    }));

    res.json(rewardsWithRedemptions);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

router.post('/rewards/:id/redeem', auth, requireAuth, validateBody(redeemRewardSchema), async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    const rewardDoc = await db.collection('rewards').doc(req.params.id).get();
    if (!rewardDoc.exists) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const reward = rewardDoc.data()!;
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() || {};
    const userPoints = userData.gamification?.points || 0;

    // Check if user has enough points
    if (userPoints < reward.pointsCost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Check redemption limits
    if (reward.maxRedemptions > 0) {
      const redemptionsSnapshot = await db.collection('rewardRedemptions')
        .where('userId', '==', req.user!.uid)
        .where('rewardId', '==', req.params.id)
        .get();

      if (redemptionsSnapshot.size >= reward.maxRedemptions) {
        return res.status(400).json({ error: 'Redemption limit reached' });
      }
    }

    // Deduct points
    const newPoints = userPoints - reward.pointsCost;
    await db.collection('users').doc(req.user!.uid).update({
      'gamification.points': newPoints
    });

    // Record redemption
    const redemptionData = {
      userId: req.user!.uid,
      rewardId: req.params.id,
      rewardName: reward.name,
      pointsCost: reward.pointsCost,
      status: 'pending',
      shippingAddress: shippingAddress || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const redemptionRef = await db.collection('rewardRedemptions').add(redemptionData);

    // Record points transaction
    await db.collection('pointsTransactions').add({
      userId: req.user!.uid,
      type: 'spent',
      amount: reward.pointsCost,
      source: 'reward',
      sourceId: req.params.id,
      description: `Premio riscattato: ${reward.name}`,
      createdAt: new Date()
    });

    res.json({
      redemptionId: redemptionRef.id,
      message: 'Reward redeemed successfully',
      pointsSpent: reward.pointsCost,
      remainingPoints: newPoints
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
});

router.get('/badges', auth, requireAuth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() || {};
    const userBadges = userData.gamification?.badges || [];

    // Get all badges
    const badgesSnapshot = await db.collection('badges').get();
    const allBadges = badgesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const badgesWithStatus = allBadges.map(badge => ({
      ...badge,
      earned: userBadges.includes(badge.id),
      earnedAt: userData.gamification?.badgeEarnedDates?.[badge.id] || null,
      progress: calculateBadgeProgress(badge, userData)
    }));

    res.json(badgesWithStatus);
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Helper functions

function calculateLevel(points: number): number {
  // Level calculation: 1000 points per level
  return Math.floor(points / 1000) + 1;
}

function getLevelProgress(points: number): { currentLevelPoints: number; nextLevelPoints: number; pointsToNext: number } {
  const currentLevel = calculateLevel(points);
  const currentLevelStart = (currentLevel - 1) * 1000;
  const nextLevelStart = currentLevel * 1000;

  return {
    currentLevelPoints: points - currentLevelStart,
    nextLevelPoints: 1000,
    pointsToNext: nextLevelStart - points
  };
}

function calculateMissionProgress(mission: any, userData: any, userId: string): any {
  // This would contain complex logic to calculate mission progress
  // based on user data and mission requirements

  switch (mission.type) {
    case 'daily_check_in':
      return {
        current: userData.gamification?.streak?.current || 0,
        target: mission.requirements.days,
        percentage: Math.min(100, ((userData.gamification?.streak?.current || 0) / mission.requirements.days) * 100)
      };

    case 'complete_profile':
      const profileCompletion = calculateProfileCompletion(userData);
      return {
        current: profileCompletion,
        target: 100,
        percentage: profileCompletion
      };

    case 'make_purchase':
      return {
        current: userData.gamification?.ordersCount || 0,
        target: mission.requirements.count,
        percentage: Math.min(100, ((userData.gamification?.ordersCount || 0) / mission.requirements.count) * 100)
      };

    default:
      return {
        current: 0,
        target: 1,
        percentage: 0
      };
  }
}

async function verifyMissionCompletion(mission: any, userData: any, userId: string, data?: any): Promise<boolean> {
  switch (mission.type) {
    case 'daily_check_in':
      return (userData.gamification?.streak?.current || 0) >= mission.requirements.days;

    case 'complete_profile':
      return calculateProfileCompletion(userData) >= 100;

    case 'make_purchase':
      return (userData.gamification?.ordersCount || 0) >= mission.requirements.count;

    case 'add_dog_photo':
      return userData.dogs?.some((dog: any) => dog.photos?.length > 0) || false;

    default:
      return false;
  }
}

function calculateProfileCompletion(userData: any): number {
  const fields = [
    'displayName',
    'email',
    'photoURL',
    'phone',
    'address'
  ];

  const completedFields = fields.filter(field => userData[field]).length;
  return Math.round((completedFields / fields.length) * 100);
}

function calculateBadgeProgress(badge: any, userData: any): any {
  // Calculate progress towards earning this badge
  switch (badge.type) {
    case 'points':
      return {
        current: userData.gamification?.points || 0,
        target: badge.requirements.points,
        percentage: Math.min(100, ((userData.gamification?.points || 0) / badge.requirements.points) * 100)
      };

    case 'orders':
      return {
        current: userData.gamification?.ordersCount || 0,
        target: badge.requirements.count,
        percentage: Math.min(100, ((userData.gamification?.ordersCount || 0) / badge.requirements.count) * 100)
      };

    default:
      return {
        current: 0,
        target: 1,
        percentage: 0
      };
  }
}

async function checkAndAwardBadges(userId: string, gamificationData: any) {
  try {
    const badgesSnapshot = await db.collection('badges').where('active', '==', true).get();
    const allBadges = badgesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    for (const badge of allBadges) {
      if (!gamificationData.badges?.includes(badge.id)) {
        const shouldAward = checkBadgeRequirements(badge, gamificationData);

        if (shouldAward) {
          await db.collection('users').doc(userId).update({
            'gamification.badges': [...(gamificationData.badges || []), badge.id],
            'gamification.points': gamificationData.points + badge.points,
            [`gamification.badgeEarnedDates.${badge.id}`]: new Date()
          });

          await db.collection('pointsTransactions').add({
            userId,
            type: 'earned',
            amount: badge.points,
            source: 'badge',
            sourceId: badge.id,
            description: `Badge sbloccato: ${badge.name}`,
            createdAt: new Date()
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}

function checkBadgeRequirements(badge: any, gamificationData: any): boolean {
  switch (badge.type) {
    case 'points':
      return gamificationData.points >= badge.requirements.points;

    case 'orders':
      return gamificationData.ordersCount >= badge.requirements.count;

    case 'streak':
      return gamificationData.streak?.longest >= badge.requirements.days;

    case 'missions':
      return gamificationData.completedMissions?.length >= badge.requirements.count;

    default:
      return false;
  }
}

export default router;