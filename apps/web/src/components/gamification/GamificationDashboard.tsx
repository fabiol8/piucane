'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Star,
  Target,
  Gift,
  Zap,
  Calendar,
  TrendingUp,
  Award,
  ChevronRight,
  Flame
} from 'lucide-react';
import type {
  GamificationProfile,
  UserMissionProgress,
  UserBadge,
  Badge,
  EarnedReward,
  StreakTracker
} from '@/types/gamification';

interface GamificationDashboardProps {
  userId: string;
  className?: string;
}

interface DashboardData {
  profile: GamificationProfile;
  activeMissions: UserMissionProgress[];
  displayBadges: Array<UserBadge & { badge: Badge }>;
  recentRewards: EarnedReward[];
  streakInfo: StreakTracker;
  levelProgress: {
    currentLevel: number;
    xpToNextLevel: number;
    levelProgress: number;
    nextLevelInfo: any;
  };
  weeklyProgress: {
    xpEarned: number;
    missionsCompleted: number;
    badgesEarned: number;
    streakDays: number;
  };
}

export default function GamificationDashboard({ userId, className }: GamificationDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'missions' | 'badges' | 'rewards'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // In production, load from GamificationService
      const mockData: DashboardData = {
        profile: {
          userId,
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
          preferredDifficulty: 'medium',
          notificationPreferences: {
            dailyReminders: true,
            weeklyProgress: true,
            achievementAlerts: true
          },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date()
        } as GamificationProfile,
        activeMissions: [
          {
            userId,
            missionId: 'mission_health_001',
            status: 'active',
            currentStep: 2,
            completedSteps: 2,
            totalSteps: 5,
            progressPercentage: 0.4,
            stepProgress: [],
            startedAt: new Date(),
            lastActiveAt: new Date(),
            estimatedCompletionAt: new Date(),
            timeSpent: 35,
            efficiency: 0.95,
            qualityScore: 0.88,
            currentDifficulty: 'medium',
            ddaAdjustments: [],
            earnedRewards: [],
            pendingRewards: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        displayBadges: [
          {
            userId,
            badgeId: 'first_mission',
            earnedAt: new Date(),
            progress: 1,
            isDisplayed: true,
            badge: {
              id: 'first_mission',
              name: 'Prima Missione',
              description: 'Hai completato la tua prima missione!',
              iconUrl: '🎯',
              rarity: 'common',
              requirements: [],
              category: 'milestone',
              xpBonus: 50,
              displayOrder: 1,
              isHidden: false,
              isLimited: false,
              createdAt: new Date(),
              totalEarned: 1250,
              averageTimeToEarn: 2
            }
          }
        ],
        recentRewards: [
          {
            id: 'reward_001',
            type: 'discount',
            title: '15% di sconto',
            description: 'Sconto per aver completato la missione settimanale',
            value: 15,
            status: 'pending',
            earnedAt: new Date(),
            sourceType: 'mission',
            sourceId: 'mission_001',
            sourceName: 'Missione Settimanale'
          }
        ],
        streakInfo: {
          userId,
          currentStreak: 8,
          longestStreak: 15,
          lastActivityDate: new Date(),
          streaks: { daily: 8, weekly: 2, monthly: 1 },
          milestones: [
            { days: 7, reward: { xp: 100, items: [], badges: [] }, achieved: true, achievedAt: new Date() },
            { days: 14, reward: { xp: 300, items: [], badges: [] }, achieved: false }
          ],
          freezeCards: 3,
          freezeCardsUsed: 0
        },
        levelProgress: {
          currentLevel: 12,
          xpToNextLevel: 450,
          levelProgress: 0.73,
          nextLevelInfo: {
            level: 13,
            title: 'Compagno Esperto',
            rewards: { xp: 200, items: [], badges: [] }
          }
        },
        weeklyProgress: {
          xpEarned: 380,
          missionsCompleted: 3,
          badgesEarned: 1,
          streakDays: 8
        }
      };

      setDashboardData(mockData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <p className="text-gray-500">Impossibile caricare i dati di gamification</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-green-50 to-orange-50 rounded-xl shadow-lg ${className}`}>
      {/* Header with Level and XP */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Livello {dashboardData.profile.currentLevel}
            </h2>
            <p className="text-gray-600">{dashboardData.levelProgress.nextLevelInfo.title}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {dashboardData.profile.totalXP.toLocaleString()} XP
            </div>
            <p className="text-sm text-gray-500">
              {dashboardData.levelProgress.xpToNextLevel} XP al prossimo livello
            </p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="relative">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${dashboardData.levelProgress.levelProgress * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-white drop-shadow">
              {Math.round(dashboardData.levelProgress.levelProgress * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Panoramica', icon: TrendingUp },
            { id: 'missions', label: 'Missioni', icon: Target },
            { id: 'badges', label: 'Badge', icon: Award },
            { id: 'rewards', label: 'Premi', icon: Gift }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
                selectedTab === tab.id
                  ? 'bg-white shadow-sm text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {selectedTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <OverviewTab dashboardData={dashboardData} />
            </motion.div>
          )}

          {selectedTab === 'missions' && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MissionsTab missions={dashboardData.activeMissions} />
            </motion.div>
          )}

          {selectedTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <BadgesTab badges={dashboardData.displayBadges} />
            </motion.div>
          )}

          {selectedTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RewardsTab rewards={dashboardData.recentRewards} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ dashboardData }: { dashboardData: DashboardData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Streak Card */}
      <motion.div
        className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-6 text-white"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="flex items-center justify-between mb-4">
          <Flame size={32} />
          <span className="text-2xl font-bold">{dashboardData.streakInfo.currentStreak}</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">Striscia Attuale</h3>
        <p className="text-orange-100 text-sm">
          Record: {dashboardData.streakInfo.longestStreak} giorni
        </p>
      </motion.div>

      {/* Weekly Progress */}
      <motion.div
        className="bg-white rounded-xl p-6 shadow-sm border"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="flex items-center justify-between mb-4">
          <Calendar className="text-green-500" size={32} />
          <span className="text-2xl font-bold text-gray-900">
            {dashboardData.weeklyProgress.xpEarned}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">XP Settimanali</h3>
        <p className="text-gray-600 text-sm">
          {dashboardData.weeklyProgress.missionsCompleted} missioni completate
        </p>
      </motion.div>

      {/* Performance Score */}
      <motion.div
        className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="flex items-center justify-between mb-4">
          <Trophy size={32} />
          <span className="text-2xl font-bold">
            {Math.round(dashboardData.profile.performanceScore * 100)}%
          </span>
        </div>
        <h3 className="text-lg font-semibold mb-2">Punteggio Performance</h3>
        <p className="text-green-100 text-sm">
          {Math.round(dashboardData.profile.completionRate * 100)}% completamento
        </p>
      </motion.div>
    </div>
  );
}

// Missions Tab Component
function MissionsTab({ missions }: { missions: UserMissionProgress[] }) {
  return (
    <div className="space-y-4">
      {missions.length === 0 ? (
        <div className="text-center py-8">
          <Target className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna Missione Attiva</h3>
          <p className="text-gray-600">Inizia una nuova missione per guadagnare XP e premi!</p>
        </div>
      ) : (
        missions.map(mission => (
          <motion.div
            key={mission.missionId}
            className="bg-white rounded-xl p-6 shadow-sm border"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Missione {mission.missionId}
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {mission.completedSteps}/{mission.totalSteps} completati
                </span>
                <ChevronRight className="text-gray-400" size={16} />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${mission.progressPercentage * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <span className="absolute top-2 left-0 text-xs text-gray-600">
                {Math.round(mission.progressPercentage * 100)}% completato
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Tempo speso: {mission.timeSpent} min</span>
              <span>Efficienza: {Math.round(mission.efficiency * 100)}%</span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

// Badges Tab Component
function BadgesTab({ badges }: { badges: Array<UserBadge & { badge: Badge }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map(userBadge => (
        <motion.div
          key={userBadge.badgeId}
          className={`bg-white rounded-xl p-4 shadow-sm border text-center cursor-pointer ${
            userBadge.badge.rarity === 'legendary' ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50' :
            userBadge.badge.rarity === 'epic' ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' :
            userBadge.badge.rarity === 'rare' ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50' :
            'border-gray-300'
          }`}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="text-3xl mb-2">{userBadge.badge.iconUrl}</div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {userBadge.badge.name}
          </h3>
          <p className="text-xs text-gray-600 mb-2">
            {userBadge.badge.description}
          </p>
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            userBadge.badge.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
            userBadge.badge.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
            userBadge.badge.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {userBadge.badge.rarity}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Rewards Tab Component
function RewardsTab({ rewards }: { rewards: EarnedReward[] }) {
  return (
    <div className="space-y-4">
      {rewards.length === 0 ? (
        <div className="text-center py-8">
          <Gift className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun Premio Disponibile</h3>
          <p className="text-gray-600">Completa missioni e guadagna badge per ottenere premi!</p>
        </div>
      ) : (
        rewards.map(reward => (
          <motion.div
            key={reward.id}
            className="bg-white rounded-xl p-6 shadow-sm border"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${
                  reward.type === 'discount' ? 'bg-green-100 text-green-600' :
                  reward.type === 'free_item' ? 'bg-blue-100 text-blue-600' :
                  reward.type === 'xp' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {reward.type === 'discount' ? <Star size={20} /> :
                   reward.type === 'free_item' ? <Gift size={20} /> :
                   reward.type === 'xp' ? <Zap size={20} /> :
                   <Trophy size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{reward.title}</h3>
                  <p className="text-gray-600 text-sm">{reward.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Da: {reward.sourceName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {reward.type === 'xp' ? `${reward.value} XP` :
                   reward.type === 'discount' ? `${reward.value}%` :
                   `€${reward.value}`}
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  reward.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  reward.status === 'claimed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {reward.status === 'pending' ? 'Da Riscattare' :
                   reward.status === 'claimed' ? 'Riscattato' :
                   'Scaduto'}
                </span>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}