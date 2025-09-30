/**
 * Gamification System - Missions, Badges and Rewards
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { trackEvent } from '@/analytics/ga4';
import { missionsApi, dogsApi } from '@/lib/api-client';

interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement' | 'seasonal';
  category: 'health' | 'care' | 'engagement' | 'social' | 'learning';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  coinReward?: number;
  badgeReward?: string;
  requirements: {
    action: string;
    target?: number;
    dogId?: string;
    timeframe?: string;
  }[];
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  status: 'available' | 'in_progress' | 'completed' | 'expired' | 'locked';
  deadline?: Date;
  unlockConditions?: string[];
  completedAt?: Date;
  createdAt: Date;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'health' | 'care' | 'engagement' | 'achievement' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
  };
}

interface UserStats {
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  totalCoins: number;
  completedMissions: number;
  badges: Badge[];
  streak: {
    current: number;
    longest: number;
    type: 'daily' | 'weekly';
  };
  rankings: {
    global: number;
    weekly: number;
    friends?: number;
  };
}

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  missionCounts: Record<string, number>;
}

const MissionTabs: React.FC<TabProps> = ({ activeTab, setActiveTab, missionCounts }) => {
  const tabs = [
    { id: 'active', label: 'Attive', icon: '🎯', count: missionCounts.active || 0 },
    { id: 'daily', label: 'Giornaliere', icon: '📅', count: missionCounts.daily || 0 },
    { id: 'weekly', label: 'Settimanali', icon: '📆', count: missionCounts.weekly || 0 },
    { id: 'achievements', label: 'Obiettivi', icon: '🏆', count: missionCounts.achievements || 0 },
    { id: 'completed', label: 'Completate', icon: '✅', count: missionCounts.completed || 0 },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              trackEvent('navigation_click', {
                link_text: tab.label,
                section: 'missions_tabs',
                tab_name: tab.id,
              }, 'navigation.tab.click');
            }}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMissions();
  }, [missions, activeTab]);

  const loadData = async () => {
    try {
      const [missionsResponse, statsResponse] = await Promise.all([
        missionsApi.getMissions(),
        missionsApi.getUserStats(),
      ]);

      if (missionsResponse.success) {
        setMissions(missionsResponse.data || []);
      }
      if (statsResponse.success) {
        setUserStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading missions data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMissions = () => {
    let filtered = missions;

    switch (activeTab) {
      case 'active':
        filtered = missions.filter(m => ['available', 'in_progress'].includes(m.status));
        break;
      case 'daily':
        filtered = missions.filter(m => m.type === 'daily' && m.status !== 'completed');
        break;
      case 'weekly':
        filtered = missions.filter(m => m.type === 'weekly' && m.status !== 'completed');
        break;
      case 'achievements':
        filtered = missions.filter(m => m.type === 'achievement');
        break;
      case 'completed':
        filtered = missions.filter(m => m.status === 'completed');
        break;
      default:
        filtered = missions;
    }

    setFilteredMissions(filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return b.xpReward - a.xpReward;
    }));
  };

  const getMissionCounts = () => {
    return {
      active: missions.filter(m => ['available', 'in_progress'].includes(m.status)).length,
      daily: missions.filter(m => m.type === 'daily' && m.status !== 'completed').length,
      weekly: missions.filter(m => m.type === 'weekly' && m.status !== 'completed').length,
      achievements: missions.filter(m => m.type === 'achievement').length,
      completed: missions.filter(m => m.status === 'completed').length,
    };
  };

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
    setIsMissionModalOpen(true);
    trackEvent('mission_details_viewed', {
      mission_id: mission.id,
      mission_type: mission.type,
      mission_status: mission.status,
    }, 'missions.view_details.click');
  };

  const handleStartMission = async (mission: Mission) => {
    try {
      const response = await missionsApi.startMission(mission.id);
      if (response.success) {
        setMissions(prev => prev.map(m =>
          m.id === mission.id ? { ...m, status: 'in_progress' as const } : m
        ));

        trackEvent('mission_started', {
          mission_id: mission.id,
          mission_type: mission.type,
          xp_reward: mission.xpReward,
        }, 'missions.start.button.click');

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: `Missione "${mission.title}" avviata!`,
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  const handleClaimReward = async (mission: Mission) => {
    try {
      const response = await missionsApi.claimReward(mission.id);
      if (response.success) {
        setMissions(prev => prev.map(m =>
          m.id === mission.id ? { ...m, status: 'completed' as const } : m
        ));

        if (userStats) {
          setUserStats(prev => prev ? {
            ...prev,
            totalXP: prev.totalXP + mission.xpReward,
            totalCoins: prev.totalCoins + (mission.coinReward || 0),
          } : null);
        }

        trackEvent('mission_reward_claimed', {
          mission_id: mission.id,
          xp_gained: mission.xpReward,
          coins_gained: mission.coinReward || 0,
        }, 'missions.claim_reward.button.click');

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: `Ricompensa ottenuta! +${mission.xpReward} XP`,
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Missioni e Ricompense</h1>
              <p className="text-gray-600 mt-1">
                Completa missioni, guadagna XP e sblocca badge esclusivi
              </p>
            </div>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setIsBadgesModalOpen(true)}
                ctaId="missions.view_badges.button.click"
              >
                I tuoi badge
              </Button>
              <Link href="/shop/rewards">
                <Button variant="primary">
                  Negozio ricompense
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Stats */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">⭐</div>
                  <div className="text-2xl font-bold text-yellow-600">Livello {userStats.level}</div>
                  <div className="text-sm text-gray-600">{userStats.totalXP} XP totali</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (userStats.xpToNextLevel / (userStats.xpToNextLevel + 100)) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🪙</div>
                  <div className="text-2xl font-bold text-orange-600">{userStats.totalCoins}</div>
                  <div className="text-sm text-gray-600">Monete PiùCane</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="text-2xl font-bold text-red-600">{userStats.streak.current}</div>
                  <div className="text-sm text-gray-600">Giorni consecutivi</div>
                  <div className="text-xs text-gray-500">Record: {userStats.streak.longest}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="text-2xl font-bold text-purple-600">{userStats.badges.filter(b => b.unlockedAt).length}</div>
                  <div className="text-sm text-gray-600">Badge sbloccati</div>
                  <div className="text-xs text-gray-500">su {userStats.badges.length} totali</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Missions List */}
        <Card>
          <MissionTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            missionCounts={getMissionCounts()}
          />
          <CardContent className="p-0">
            {filteredMissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'completed' ? 'Nessuna missione completata' : 'Nessuna missione disponibile'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'completed'
                    ? 'Completa le tue prime missioni per vederle qui'
                    : 'Nuove missioni vengono aggiunte regolarmente'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMissions.map(mission => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onClick={() => handleMissionClick(mission)}
                    onStart={() => handleStartMission(mission)}
                    onClaim={() => handleClaimReward(mission)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <MissionModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          mission={selectedMission}
          onStart={handleStartMission}
          onClaim={handleClaimReward}
        />

        <BadgesModal
          isOpen={isBadgesModalOpen}
          onClose={() => setIsBadgesModalOpen(false)}
          badges={userStats?.badges || []}
        />
      </div>
    </div>
  );
}

interface MissionCardProps {
  mission: Mission;
  onClick: () => void;
  onStart: () => void;
  onClaim: () => void;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission, onClick, onStart, onClaim }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'hard': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'achievement': return '🏆';
      case 'seasonal': return '🎄';
      default: return '🎯';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'health': return '🏥';
      case 'care': return '❤️';
      case 'engagement': return '🎮';
      case 'social': return '👥';
      case 'learning': return '📚';
      default: return '🎯';
    }
  };

  const formatTimeLeft = (deadline?: Date) => {
    if (!deadline) return null;
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

    if (hoursLeft < 0) return 'Scaduta';
    if (hoursLeft < 24) return `${hoursLeft}h rimaste`;
    const daysLeft = Math.floor(hoursLeft / 24);
    return `${daysLeft}g rimasti`;
  };

  return (
    <div className={`p-6 hover:bg-gray-50 transition-colors ${
      mission.status === 'completed' ? 'opacity-75' : ''
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1" onClick={onClick}>
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">{getTypeIcon(mission.type)}</span>
            <h3 className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-primary">
              {mission.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(mission.difficulty)}`}>
              {mission.difficulty}
            </span>
            <span className="text-lg">{getCategoryIcon(mission.category)}</span>
            {mission.status === 'completed' && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                ✅ Completata
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-3 cursor-pointer">{mission.description}</p>

          {/* Progress Bar */}
          {mission.status === 'in_progress' && (
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progresso</span>
                <span>{mission.progress.current}/{mission.progress.target}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${mission.progress.percentage}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <span>⭐</span>
              <span>{mission.xpReward} XP</span>
            </div>
            {mission.coinReward && (
              <div className="flex items-center space-x-1">
                <span>🪙</span>
                <span>{mission.coinReward} monete</span>
              </div>
            )}
            {mission.badgeReward && (
              <div className="flex items-center space-x-1">
                <span>🏆</span>
                <span>Badge speciale</span>
              </div>
            )}
            {mission.deadline && (
              <div className="flex items-center space-x-1">
                <span>⏰</span>
                <span>{formatTimeLeft(mission.deadline)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-6">
          {mission.status === 'available' && (
            <Button
              variant="primary"
              size="sm"
              onClick={onStart}
              ctaId="missions.start.button.click"
            >
              Inizia
            </Button>
          )}
          {mission.status === 'in_progress' && mission.progress.percentage === 100 && (
            <Button
              variant="primary"
              size="sm"
              onClick={onClaim}
              ctaId="missions.claim_reward.button.click"
            >
              Riscuoti
            </Button>
          )}
          {mission.status === 'in_progress' && mission.progress.percentage < 100 && (
            <Button
              variant="outline"
              size="sm"
              disabled
            >
              In corso...
            </Button>
          )}
          {mission.status === 'locked' && (
            <Button
              variant="outline"
              size="sm"
              disabled
            >
              Bloccata
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onStart: (mission: Mission) => void;
  onClaim: (mission: Mission) => void;
}

const MissionModal: React.FC<MissionModalProps> = ({ isOpen, onClose, mission, onStart, onClaim }) => {
  if (!mission) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'achievement': return '🏆';
      case 'seasonal': return '🎄';
      default: return '🎯';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTypeIcon(mission.type)}</span>
          <span>{mission.title}</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-700 mb-4">{mission.description}</p>

          {mission.status === 'in_progress' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso attuale</span>
                <span>{mission.progress.current}/{mission.progress.target}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${mission.progress.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Requisiti</h4>
          <ul className="space-y-2">
            {mission.requirements.map((req, index) => (
              <li key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>{req.action}</span>
                {req.target && <span className="font-medium">({req.target}x)</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">Ricompense</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-green-700">
              <span>⭐</span>
              <span>{mission.xpReward} XP</span>
            </div>
            {mission.coinReward && (
              <div className="flex items-center space-x-2 text-sm text-green-700">
                <span>🪙</span>
                <span>{mission.coinReward} monete PiùCane</span>
              </div>
            )}
            {mission.badgeReward && (
              <div className="flex items-center space-x-2 text-sm text-green-700">
                <span>🏆</span>
                <span>Badge "{mission.badgeReward}"</span>
              </div>
            )}
          </div>
        </div>

        {mission.unlockConditions && mission.unlockConditions.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3">Condizioni di sblocco</h4>
            <ul className="space-y-1">
              {mission.unlockConditions.map((condition, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {condition}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onClose}>
          Chiudi
        </Button>
        {mission.status === 'available' && (
          <Button
            variant="primary"
            onClick={() => {
              onStart(mission);
              onClose();
            }}
            ctaId="missions.modal.start.button.click"
          >
            Inizia missione
          </Button>
        )}
        {mission.status === 'in_progress' && mission.progress.percentage === 100 && (
          <Button
            variant="primary"
            onClick={() => {
              onClaim(mission);
              onClose();
            }}
            ctaId="missions.modal.claim.button.click"
          >
            Riscuoti ricompensa
          </Button>
        )}
      </div>
    </Modal>
  );
};

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
}

const BadgesModal: React.FC<BadgesModalProps> = ({ isOpen, onClose, badges }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-700 bg-gray-100';
      case 'rare': return 'text-blue-700 bg-blue-100';
      case 'epic': return 'text-purple-700 bg-purple-100';
      case 'legendary': return 'text-yellow-700 bg-yellow-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="I tuoi badge"
      size="xl"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {unlockedBadges.length} badge sbloccati
          </h3>
          <p className="text-gray-600">
            su {badges.length} totali disponibili
          </p>
        </div>

        {unlockedBadges.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Badge sbloccati</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {unlockedBadges.map(badge => (
                <div key={badge.id} className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <h5 className="font-medium text-gray-900 mb-1">{badge.name}</h5>
                  <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRarityColor(badge.rarity)}`}>
                    {badge.rarity}
                  </span>
                  {badge.unlockedAt && (
                    <div className="text-xs text-gray-500 mt-2">
                      Sbloccato il {new Date(badge.unlockedAt).toLocaleDateString('it-IT')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {lockedBadges.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Badge da sbloccare</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {lockedBadges.slice(0, 6).map(badge => (
                <div key={badge.id} className="text-center p-4 border border-gray-200 rounded-lg opacity-50">
                  <div className="text-3xl mb-2 filter grayscale">🏆</div>
                  <h5 className="font-medium text-gray-900 mb-1">{badge.name}</h5>
                  <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRarityColor(badge.rarity)}`}>
                    {badge.rarity}
                  </span>
                  {badge.progress && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${(badge.progress.current / badge.progress.target) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {badge.progress.current}/{badge.progress.target}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {lockedBadges.length > 6 && (
              <p className="text-center text-gray-500 text-sm mt-4">
                ... e altri {lockedBadges.length - 6} badge da scoprire
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button variant="outline" onClick={onClose}>
          Chiudi
        </Button>
      </div>
    </Modal>
  );
};