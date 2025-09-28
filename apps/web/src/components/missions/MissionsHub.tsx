'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import MissionCard from './MissionCard';
import ProgressOverview from './ProgressOverview';
import BadgeCollection from './BadgeCollection';
import RewardsShop from './RewardsShop';

interface UserProgress {
  level: number;
  xp: number;
  totalPoints: number;
  missionsCompleted: number;
  badgesEarned: string[];
  levelProgress: number;
  xpToNextLevel: number;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xpReward: number;
  pointsReward: number;
  icon: string;
  requiredLevel: number;
  estimatedTime: string;
  objectives: Array<{
    id: string;
    description: string;
    target: number;
    current: number;
  }>;
  userStatus: 'available' | 'in_progress' | 'completed';
  userProgress?: any;
  startedAt?: string;
  completedAt?: string;
}

interface Achievement {
  id: string;
  badgeId: string;
  badgeName: string;
  badgeDescription: string;
  unlockedAt: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  type: string;
  value: number;
  requiredLevel: number;
  requiredPoints: number;
  icon: string;
  isActive: boolean;
}

export default function MissionsHub() {
  const [activeTab, setActiveTab] = useState('missions');
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'missions') {
      fetchMissions();
    }
  }, [activeTab, filterCategory, filterDifficulty, filterStatus]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gamification/progress');
      if (response.ok) {
        const data = await response.json();
        setUserProgress(data.progress);
        setRecentAchievements(data.recentAchievements);
        setAvailableRewards(data.availableRewards);

        // Track page view
        trackEvent('view_missions_hub', {
          user_level: data.progress.level,
          user_xp: data.progress.xp,
          missions_completed: data.progress.missionsCompleted
        });
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterDifficulty !== 'all') params.append('difficulty', filterDifficulty);

      const response = await fetch(`/api/gamification/missions?${params}`);
      if (response.ok) {
        const data = await response.json();
        let filteredMissions = data.missions;

        // Apply status filter client-side
        if (filterStatus !== 'all') {
          filteredMissions = filteredMissions.filter((mission: Mission) =>
            mission.userStatus === filterStatus
          );
        }

        setMissions(filteredMissions);
      }
    } catch (error) {
      console.error('Error fetching missions:', error);
    }
  };

  const handleMissionStart = async (missionId: string) => {
    try {
      const response = await fetch(`/api/gamification/missions/${missionId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        await fetchMissions(); // Refresh missions
        trackEvent('mission_started', {
          mission_id: missionId,
          user_level: userProgress?.level
        });
      }
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  const handleMissionComplete = async (missionId: string, completionData?: any) => {
    try {
      const response = await fetch('/api/gamification/missions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId,
          data: completionData
        })
      });

      if (response.ok) {
        const result = await response.json();
        await fetchData(); // Refresh all data
        await fetchMissions(); // Refresh missions

        // Show completion notification
        if (result.levelUp) {
          alert(`🎉 Missione completata! Livello ${result.newLevel} raggiunto! XP: +${result.xpGained}, Punti: +${result.pointsGained}`);
        } else {
          alert(`✅ Missione completata! XP: +${result.xpGained}, Punti: +${result.pointsGained}`);
        }

        trackEvent('mission_completed', {
          mission_id: missionId,
          xp_gained: result.xpGained,
          points_gained: result.pointsGained,
          level_up: result.levelUp
        });
      }
    } catch (error) {
      console.error('Error completing mission:', error);
    }
  };

  const tabs = [
    { id: 'missions', label: 'Missioni', icon: '🎯' },
    { id: 'badges', label: 'Badge', icon: '🏆' },
    { id: 'rewards', label: 'Ricompense', icon: '🎁' }
  ];

  const categories = [
    { id: 'all', label: 'Tutte' },
    { id: 'onboarding', label: 'Primi passi' },
    { id: 'care', label: 'Cura' },
    { id: 'health', label: 'Salute' },
    { id: 'nutrition', label: 'Alimentazione' },
    { id: 'social', label: 'Social' },
    { id: 'shopping', label: 'Shopping' }
  ];

  const difficulties = [
    { id: 'all', label: 'Tutte' },
    { id: 'easy', label: 'Facile' },
    { id: 'medium', label: 'Medio' },
    { id: 'hard', label: 'Difficile' },
    { id: 'expert', label: 'Esperto' }
  ];

  const statuses = [
    { id: 'all', label: 'Tutte' },
    { id: 'available', label: 'Disponibili' },
    { id: 'in_progress', label: 'In corso' },
    { id: 'completed', label: 'Completate' }
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse max-w-6xl mx-auto">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro Missioni</h1>
        <p className="text-gray-600">
          Completa missioni, guadagna XP e sblocca ricompense per il tuo cane
        </p>
      </div>

      {/* Progress Overview */}
      {userProgress && (
        <ProgressOverview
          progress={userProgress}
          recentAchievements={recentAchievements}
        />
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              trackEvent('missions_tab_click', {
                tab: tab.id,
                user_level: userProgress?.level
              });
            }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-cta-id={`missions.tab_${tab.id}.click`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'missions' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Categoria:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Difficoltà:</span>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty.id} value={difficulty.id}>
                    {difficulty.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Stato:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-gray-600">
              {missions.length} missioni trovate
            </div>
          </div>

          {/* Missions Grid */}
          {missions.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessuna missione trovata
              </h3>
              <p className="text-gray-600 mb-6">
                Prova a modificare i filtri per vedere altre missioni.
              </p>
              <Button
                onClick={() => {
                  setFilterCategory('all');
                  setFilterDifficulty('all');
                  setFilterStatus('all');
                }}
                data-cta-id="missions.clear_filters.click"
              >
                Rimuovi filtri
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {missions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  userLevel={userProgress?.level || 1}
                  onStart={handleMissionStart}
                  onComplete={handleMissionComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <BadgeCollection userLevel={userProgress?.level || 1} />
      )}

      {activeTab === 'rewards' && (
        <RewardsShop
          userLevel={userProgress?.level || 1}
          userPoints={userProgress?.totalPoints || 0}
          onRewardClaim={fetchData}
        />
      )}
    </div>
  );
}