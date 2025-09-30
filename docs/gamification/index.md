# Gamification — Index
**Owner:** Product + Backend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Sistema gamification completo: missioni, badge, rewards, XP, livelli utente per aumentare engagement e retention.

## Contenuti
- [missions.md](./missions.md) — Sistema missioni (daily, weekly, milestone)
- [badges.md](./badges.md) — Badge collection e unlock conditions
- [rewards.md](./rewards.md) — Rewards riscattabili (sconti, prodotti gratis, spedizione gratis)

## Architecture

### Firestore Collections
```
missions/ - Definizioni missioni (template)
badges/ - Definizioni badge
rewards/ - Rewards disponibili
userProgress/{uid} - Progresso utente (XP, livello, missioni attive)
userBadges/{uid}/badges/{badgeId} - Badge sbloccati
userRewards/{uid}/rewards/{rewardId} - Rewards claimed
```

## Core Concepts

### XP (Experience Points)
Utente guadagna XP completando azioni:
- Completa profilo cane: **+50 XP**
- Primo ordine: **+100 XP**
- Attiva abbonamento: **+200 XP**
- Completa missione: **+variabile XP**
- Scrivi review: **+30 XP**
- Condividi app: **+20 XP**

### Livelli
```ts
const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Novizio' },
  { level: 2, xpRequired: 100, title: 'Apprendista' },
  { level: 3, xpRequired: 250, title: 'Esperto' },
  { level: 4, xpRequired: 500, title: 'Veterano' },
  { level: 5, xpRequired: 1000, title: 'Maestro' },
  { level: 6, xpRequired: 2000, title: 'Leggenda' }
];
```

### Missioni (Missions)
Task che utente può completare per guadagnare ricompense.

**Tipi**:
- **Daily**: Reset ogni giorno (es. "Apri app oggi")
- **Weekly**: Reset ogni settimana (es. "Completa 5 daily missions")
- **Milestone**: One-time (es. "Fai primo ordine")

**Stati**: `available`, `in_progress`, `completed`, `claimed`

### Badge
Achievement permanenti sbloccati completando milestone.

**Esempi**:
- 🐕 **First Paw**: Primo ordine completato
- 🎓 **Trainer**: Completa 10 missioni educatore
- 🏆 **VIP**: Raggiungi €500 LTV
- 💎 **Loyal**: Abbonamento attivo 365 giorni

### Rewards
Premi tangibili riscattabili con XP o completando missioni.

**Tipi**:
- **Discount**: 10% sconto prossimo ordine
- **Free Product**: Snack gratis (addon ordine)
- **Free Shipping**: Spedizione gratis
- **Voucher**: €5 voucher

## User Progress Schema

```ts
// userProgress/{uid}
interface UserProgress {
  userId: string;

  // XP & Level
  totalXP: number;
  currentLevel: number;
  xpToNextLevel: number;

  // Missions
  activeMissions: string[]; // missionIds
  completedMissionsCount: number;

  // Badges
  badgesCount: number;

  // Rewards
  availableRewards: number;
  redeemedRewardsCount: number;

  // Streaks
  dailyStreak: number; // giorni consecutivi con login
  longestStreak: number;
  lastActiveDate: Date;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Mission System

Vedi [missions.md](./missions.md) per dettagli completi.

### Mission Schema
```ts
// missions/{missionId}
interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji o URL icon

  type: 'daily' | 'weekly' | 'milestone';
  category: 'onboarding' | 'shopping' | 'engagement' | 'social';

  // Completion criteria
  action: string; // 'order.created', 'profile.completed', etc.
  targetCount: number; // es. 3 ordini

  // Rewards
  xpReward: number;
  rewardIds?: string[]; // optional badge/reward unlock

  // Availability
  isActive: boolean;
  startDate?: Timestamp;
  endDate?: Timestamp;

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string; // "5 min", "1 ora"
  completionCount: number; // analytics
}
```

### User Mission Progress
```ts
// userProgress/{uid}/missions/{missionId}
interface UserMission {
  missionId: string;
  status: 'available' | 'in_progress' | 'completed' | 'claimed';

  progress: number; // 0-targetCount
  targetCount: number;

  startedAt?: Timestamp;
  completedAt?: Timestamp;
  claimedAt?: Timestamp;
  expiresAt?: Timestamp; // per daily/weekly
}
```

### Mission Examples
```json
{
  "id": "mission_first_order",
  "title": "Primo acquisto",
  "description": "Completa il tuo primo ordine su PiùCane",
  "type": "milestone",
  "action": "order.created",
  "targetCount": 1,
  "xpReward": 100,
  "rewardIds": ["badge_first_paw"]
}

{
  "id": "mission_daily_login",
  "title": "Login giornaliero",
  "description": "Accedi all'app oggi",
  "type": "daily",
  "action": "user.login",
  "targetCount": 1,
  "xpReward": 10
}

{
  "id": "mission_weekly_shopper",
  "title": "Shopping frequente",
  "description": "Fai 3 acquisti questa settimana",
  "type": "weekly",
  "action": "order.created",
  "targetCount": 3,
  "xpReward": 150,
  "rewardIds": ["reward_free_shipping"]
}
```

## Badge System

Vedi [badges.md](./badges.md) per collezione completa.

### Badge Schema
```ts
// badges/{badgeId}
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Unlock criteria
  unlockType: 'mission' | 'milestone' | 'streak' | 'ltv';
  unlockCriteria: {
    missionId?: string;
    orderCount?: number;
    ltv?: number;
    streak?: number;
  };

  // Rarity
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  // Stats
  totalUnlocked: number;
  percentageUnlocked: number; // % utenti con badge

  isActive: boolean;
}
```

### Badge Examples
```json
[
  {
    "id": "badge_first_paw",
    "name": "🐕 First Paw",
    "description": "Hai completato il tuo primo ordine!",
    "rarity": "common",
    "unlockType": "milestone",
    "unlockCriteria": { "orderCount": 1 }
  },
  {
    "id": "badge_subscriber",
    "name": "💎 Subscriber",
    "description": "Hai attivato un abbonamento",
    "rarity": "rare",
    "unlockType": "milestone",
    "unlockCriteria": { "hasSubscription": true }
  },
  {
    "id": "badge_vip",
    "name": "👑 VIP",
    "description": "Hai raggiunto €500 di LTV",
    "rarity": "epic",
    "unlockType": "ltv",
    "unlockCriteria": { "ltv": 500 }
  },
  {
    "id": "badge_streak_30",
    "name": "🔥 Fuoco!",
    "description": "30 giorni di streak consecutivi",
    "rarity": "legendary",
    "unlockType": "streak",
    "unlockCriteria": { "streak": 30 }
  }
]
```

## Reward System

Vedi [rewards.md](./rewards.md) per catalogo completo.

### Reward Schema
```ts
// rewards/{rewardId}
interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Type
  type: 'discount' | 'free_product' | 'free_shipping' | 'voucher';

  // Value
  discountPercent?: number; // 10, 15, 20
  freeProductId?: string;
  voucherAmount?: number; // € value

  // Cost
  xpCost?: number; // se acquistabile con XP

  // Claim limits
  claimLimit: number; // max volte riscattabile per utente
  globalLimit?: number; // max totale riscatti

  // Expiry
  validDays: number; // giorni validità dopo claim
  expiresAt?: Timestamp; // scadenza globale

  // Availability
  isActive: boolean;

  // Stats
  totalClaimed: number;
  redemptionRate: number; // % claimed → redeemed
}
```

### Reward Redemption Flow
```
1. User claims reward (da dashboard o mission completion)
2. Reward added to `userRewards/{uid}/rewards/{rewardId}`
3. Status: `claimed`, `validUntil: +validDays`
4. User applies reward in checkout
5. Status: `redeemed`, order updated
```

### API Endpoints
```ts
// Claim reward
POST /api/rewards/{rewardId}/claim
Response: { rewardId, validUntil, code }

// List user rewards
GET /api/user/rewards
Response: { claimed: [...], available: [...] }

// Redeem in order
POST /api/orders/{orderId}/apply-reward
{ rewardCode: "REWARD_ABC123" }
```

## Event Tracking (Mission Progress)

### Cloud Function Triggers
```ts
// api/src/functions/gamification-triggers.ts

// On order created
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const userId = order.userId;

    // Progress missions with action: 'order.created'
    await progressMissions(userId, 'order.created');

    // Award XP
    await awardXP(userId, 100, 'Primo ordine completato');

    // Check badge unlocks
    await checkBadgeUnlocks(userId);
  });

// On mission completed
export const onMissionCompleted = functions.firestore
  .document('userProgress/{uid}/missions/{missionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'completed' && after.status === 'completed') {
      const { uid } = context.params;
      const mission = await getMission(after.missionId);

      // Award XP
      await awardXP(uid, mission.xpReward, `Missione completata: ${mission.title}`);

      // Unlock rewards/badges
      if (mission.rewardIds) {
        for (const rewardId of mission.rewardIds) {
          await unlockReward(uid, rewardId);
        }
      }

      // Track GA4
      await trackEvent('mission_completed', {
        mission_id: mission.id,
        xp: mission.xpReward,
        reward_type: mission.rewardIds?.[0]
      });
    }
  });
```

## Daily Streak System

### Logic
```ts
function updateStreak(userId: string) {
  const userProgress = await getUserProgress(userId);
  const today = startOfDay(new Date());
  const lastActive = startOfDay(userProgress.lastActiveDate);

  const daysDiff = differenceInDays(today, lastActive);

  if (daysDiff === 0) {
    // Already active today, no change
    return;
  } else if (daysDiff === 1) {
    // Consecutive day → increment streak
    await updateUserProgress(userId, {
      dailyStreak: userProgress.dailyStreak + 1,
      longestStreak: Math.max(userProgress.longestStreak, userProgress.dailyStreak + 1),
      lastActiveDate: today
    });
  } else {
    // Streak broken → reset
    await updateUserProgress(userId, {
      dailyStreak: 1,
      lastActiveDate: today
    });
  }
}
```

### Streak Rewards
- **7 giorni**: Badge "Week Warrior" + 50 XP
- **14 giorni**: Badge "Two Weeks" + 100 XP
- **30 giorni**: Badge "🔥 Fuoco!" + 500 XP + reward free shipping

## Admin Dashboard

**Path**: `/apps/admin/src/modules/gamification/`

### Features
- [ ] Missions manager (create, edit, activate/deactivate)
- [ ] Badge manager
- [ ] Rewards catalog
- [ ] Analytics: Completion rates, popular missions, XP distribution
- [ ] User lookup (view progress, manually award XP/badge)

## Analytics & KPIs

### Engagement Metrics
- **Daily Active Users** con missione attiva
- **Mission completion rate**: % missioni started → completed
- **Average XP per user**
- **Badge unlock rate**: % utenti per badge
- **Reward redemption rate**: % claimed → redeemed

### GA4 Events
```ts
// Mission started
trackEvent('mission_started', { mission_id, mission_type });

// Mission completed
trackEvent('mission_completed', { mission_id, xp, reward_type });

// Badge unlocked
trackEvent('badge_unlocked', { badge_id, rarity });

// Reward claimed
trackEvent('reward_claimed', { reward_id, reward_type });

// Reward redeemed
trackEvent('reward_redeemed', { reward_id, order_id, value });
```

## Testing

```ts
// tests/integration/gamification.spec.ts
describe('Gamification System', () => {
  it('awards XP on order creation', async () => {
    const userId = 'test-user-123';
    await createOrder({ userId, total: 50 });

    const progress = await getUserProgress(userId);
    expect(progress.totalXP).toBeGreaterThanOrEqual(100);
  });

  it('completes mission when target reached', async () => {
    const userId = 'test-user-456';
    const missionId = 'mission_first_order';

    await createOrder({ userId, total: 50 });

    const mission = await getUserMission(userId, missionId);
    expect(mission.status).toBe('completed');
  });

  it('unlocks badge after mission completion', async () => {
    const userId = 'test-user-789';
    await completeMission(userId, 'mission_first_order');

    const badges = await getUserBadges(userId);
    expect(badges).toContainEqual(expect.objectContaining({ id: 'badge_first_paw' }));
  });
});
```

## Resources
- [Gamification Design Patterns](https://www.interaction-design.org/literature/article/gamification-design-patterns)
- [Duolingo Gamification Case Study](https://blog.duolingo.com/streaks-leaderboards-and-social-learning/)
- [Reward Psychology](https://www.nngroup.com/articles/gamification/)