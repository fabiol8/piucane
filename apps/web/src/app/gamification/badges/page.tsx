import { Metadata } from 'next';
import BadgeShowcase from '@/components/gamification/BadgeShowcase';

export const metadata: Metadata = {
  title: 'Badge - PiùCane',
  description: 'Colleziona badge e mostra i tuoi achievements nella community PiùCane',
};

// Mock user profile data
const mockUserProfile = {
  userId: 'demo-user-123',
  totalXP: 2850,
  currentLevel: 12,
  xpToNextLevel: 450,
  levelProgress: 0.73,
  streakDays: 8,
  longestStreak: 15,
  lastActivityAt: new Date(),
  totalActiveDays: 45,
  badges: ['first_mission', 'week_streak', 'level_10'],
  achievements: ['perfectionist', 'early_bird'],
  badgeCount: 8,
  performanceScore: 0.82,
  completionRate: 0.91,
  dropRate: 0.05,
  engagementRate: 0.88,
  averageTimeToComplete: 25,
  totalMissionsCompleted: 34,
  totalMissionsStarted: 37,
  currentActiveMissions: ['mission_health_001', 'mission_training_003'],
  preferredDifficulty: 'medium' as const,
  notificationPreferences: {
    dailyReminders: true,
    weeklyProgress: true,
    achievementAlerts: true
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date()
};

export default function BadgesPage() {
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🏆 I Tuoi Badge</h1>
          <p className="text-gray-600 mt-2">
            Colleziona badge completando missioni e raggiungendo traguardi speciali!
          </p>
        </div>

        <BadgeShowcase
          userId={userId}
          userProfile={mockUserProfile}
        />
      </div>
    </div>
  );
}