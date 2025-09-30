'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Crown,
  Zap,
  ChevronRight,
  Target,
  Award
} from 'lucide-react';
import type { GamificationProfile, Level } from '@/types/gamification';

interface LevelProgressBarProps {
  profile: GamificationProfile;
  currentLevelInfo?: Level;
  nextLevelInfo?: Level;
  showDetails?: boolean;
  className?: string;
}

interface LevelMilestone {
  level: number;
  title: string;
  xpRequired: number;
  isUnlocked: boolean;
  isCurrent: boolean;
  icon: React.ReactNode;
  color: string;
}

export default function LevelProgressBar({
  profile,
  currentLevelInfo,
  nextLevelInfo,
  showDetails = true,
  className
}: LevelProgressBarProps) {
  // Calculate progress percentage
  const progressPercentage = profile.levelProgress * 100;

  // Calculate XP values
  const currentLevelXP = profile.totalXP - profile.xpToNextLevel;
  const nextLevelXP = profile.totalXP + profile.xpToNextLevel;

  // Generate milestones for visual representation
  const generateMilestones = (): LevelMilestone[] => {
    const milestones: LevelMilestone[] = [];

    // Previous level
    if (profile.currentLevel > 1) {
      milestones.push({
        level: profile.currentLevel - 1,
        title: `Livello ${profile.currentLevel - 1}`,
        xpRequired: currentLevelXP - 500, // Mock previous level XP
        isUnlocked: true,
        isCurrent: false,
        icon: <Award size={16} />,
        color: 'text-gray-500'
      });
    }

    // Current level
    milestones.push({
      level: profile.currentLevel,
      title: currentLevelInfo?.title || `Livello ${profile.currentLevel}`,
      xpRequired: currentLevelXP,
      isUnlocked: true,
      isCurrent: true,
      icon: getLevelIcon(profile.currentLevel),
      color: 'text-green-600'
    });

    // Next level
    milestones.push({
      level: profile.currentLevel + 1,
      title: nextLevelInfo?.title || `Livello ${profile.currentLevel + 1}`,
      xpRequired: nextLevelXP,
      isUnlocked: false,
      isCurrent: false,
      icon: getLevelIcon(profile.currentLevel + 1),
      color: 'text-orange-600'
    });

    // Future levels (2-3 more)
    for (let i = 2; i <= 3; i++) {
      milestones.push({
        level: profile.currentLevel + i,
        title: `Livello ${profile.currentLevel + i}`,
        xpRequired: nextLevelXP + (i * 1000), // Mock future level XP
        isUnlocked: false,
        isCurrent: false,
        icon: getLevelIcon(profile.currentLevel + i),
        color: 'text-gray-400'
      });
    }

    return milestones;
  };

  const getLevelIcon = (level: number) => {
    if (level >= 50) return <Crown className="text-orange-500" size={16} />;
    if (level >= 25) return <Trophy className="text-orange-500" size={16} />;
    if (level >= 10) return <Star className="text-green-500" size={16} />;
    return <Target className="text-green-500" size={16} />;
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-orange-500 to-red-500';
    if (level >= 25) return 'from-orange-400 to-orange-600';
    if (level >= 10) return 'from-green-400 to-green-600';
    return 'from-green-300 to-green-500';
  };

  const milestones = generateMilestones();

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full bg-gradient-to-r ${getLevelColor(profile.currentLevel)}`}>
            {getLevelIcon(profile.currentLevel)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Livello {profile.currentLevel}
            </h3>
            <p className="text-sm text-gray-600">
              {currentLevelInfo?.title || 'Compagno Fedele'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {profile.totalXP.toLocaleString()} XP
          </div>
          <p className="text-sm text-gray-500">
            {profile.xpToNextLevel} XP al prossimo livello
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progresso Livello {profile.currentLevel + 1}
          </span>
          <span className="text-sm font-bold text-green-600">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Main Progress Bar */}
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Progress indicator */}
          <motion.div
            className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-green-500 rounded-full shadow-lg"
            initial={{ left: '0%' }}
            animate={{ left: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ marginLeft: '-6px' }}
          />
        </div>

        {/* XP Range */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{currentLevelXP.toLocaleString()} XP</span>
          <span>{nextLevelXP.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Level Milestones */}
      {showDetails && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Traguardi di Livello
          </h4>

          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.level}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  milestone.isCurrent
                    ? 'border-green-200 bg-green-50'
                    : milestone.isUnlocked
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-gray-100 bg-gray-25'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    milestone.isCurrent
                      ? 'bg-green-100'
                      : milestone.isUnlocked
                      ? 'bg-gray-100'
                      : 'bg-gray-50'
                  }`}>
                    {milestone.icon}
                  </div>
                  <div>
                    <div className={`font-semibold ${
                      milestone.isCurrent
                        ? 'text-green-700'
                        : milestone.isUnlocked
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}>
                      {milestone.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      {milestone.xpRequired.toLocaleString()} XP
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {milestone.isCurrent && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Attuale
                    </span>
                  )}
                  {milestone.isUnlocked && !milestone.isCurrent && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      Completato
                    </span>
                  )}
                  {!milestone.isUnlocked && (
                    <ChevronRight className="text-gray-400" size={16} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Next Level Rewards Preview */}
      {nextLevelInfo && (
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-green-50 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-3 mb-3">
            <Crown className="text-orange-500" size={20} />
            <h4 className="font-semibold text-gray-900">
              Ricompense Livello {profile.currentLevel + 1}
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">
                +{nextLevelInfo.rewards?.xp || 200} XP
              </div>
              <div className="text-xs text-gray-600">Bonus XP</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">
                {nextLevelInfo.rewards?.badges?.length || 1}
              </div>
              <div className="text-xs text-gray-600">Nuovi Badge</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {nextLevelInfo.unlockedFeatures?.length || 2}
              </div>
              <div className="text-xs text-gray-600">Funzioni</div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Streak */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 text-gray-600">
          <Zap className="text-orange-500" size={16} />
          <span>Striscia: {profile.streakDays} giorni</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <Award className="text-green-500" size={16} />
          <span>{profile.badgeCount} badge ottenuti</span>
        </div>
      </div>
    </div>
  );
}