'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Star,
  Crown,
  Zap,
  Target,
  Calendar,
  Users,
  Lock,
  Eye,
  EyeOff,
  Filter,
  Search,
  Trophy,
  Gift
} from 'lucide-react';
import type {
  Badge,
  UserBadge,
  BadgeRarity,
  GamificationProfile
} from '@/types/gamification';

interface BadgeShowcaseProps {
  userId: string;
  userProfile: GamificationProfile;
  className?: string;
}

interface BadgeWithProgress extends Badge {
  userBadge?: UserBadge;
  progress?: number;
  isEarned: boolean;
  requirements: Array<{
    requirement: any;
    completed: boolean;
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
  }>;
}

export default function BadgeShowcase({ userId, userProfile, className }: BadgeShowcaseProps) {
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'available' | 'locked'>('all');
  const [rarityFilter, setRarityFilter] = useState<BadgeRarity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId]);

  const loadBadges = async () => {
    try {
      setLoading(true);

      // Mock badges data - in production, load from BadgeEngine
      const mockBadges: BadgeWithProgress[] = [
        {
          id: 'first_mission',
          name: 'Prima Missione',
          description: 'Hai completato la tua prima missione!',
          iconUrl: '🎯',
          rarity: 'common',
          category: 'milestone',
          requirements: [
            {
              type: 'missions_completed',
              description: 'Completa 1 missione',
              target: 1
            }
          ],
          xpBonus: 50,
          displayOrder: 1,
          isHidden: false,
          isLimited: false,
          createdAt: new Date(),
          totalEarned: 1250,
          averageTimeToEarn: 2,
          isEarned: true,
          userBadge: {
            userId,
            badgeId: 'first_mission',
            earnedAt: new Date('2024-01-16'),
            progress: 1,
            isDisplayed: true
          },
          requirements: [
            {
              requirement: { type: 'missions_completed', target: 1 },
              completed: true,
              currentValue: 34,
              targetValue: 1,
              progressPercentage: 1
            }
          ]
        },
        {
          id: 'streak_week',
          name: 'Settimana Perfetta',
          description: 'Mantieni una striscia di 7 giorni consecutivi',
          iconUrl: '🔥',
          rarity: 'rare',
          category: 'consistency',
          requirements: [
            {
              type: 'streak_days',
              description: 'Mantieni una striscia di 7 giorni',
              target: 7
            }
          ],
          xpBonus: 200,
          displayOrder: 2,
          isHidden: false,
          isLimited: false,
          createdAt: new Date(),
          totalEarned: 450,
          averageTimeToEarn: 14,
          isEarned: true,
          userBadge: {
            userId,
            badgeId: 'streak_week',
            earnedAt: new Date('2024-01-20'),
            progress: 1,
            isDisplayed: true
          },
          requirements: [
            {
              requirement: { type: 'streak_days', target: 7 },
              completed: true,
              currentValue: 8,
              targetValue: 7,
              progressPercentage: 1
            }
          ]
        },
        {
          id: 'level_10',
          name: 'Esperto Cinofilo',
          description: 'Raggiungi il livello 10',
          iconUrl: '⭐',
          rarity: 'epic',
          category: 'level',
          requirements: [
            {
              type: 'level_reached',
              description: 'Raggiungi il livello 10',
              target: 10
            }
          ],
          xpBonus: 500,
          items: [
            {
              type: 'discount',
              title: '20% di sconto',
              description: 'Sconto speciale per esperti',
              value: 20,
              quantity: 1
            }
          ],
          displayOrder: 3,
          isHidden: false,
          isLimited: false,
          createdAt: new Date(),
          totalEarned: 180,
          averageTimeToEarn: 30,
          isEarned: true,
          userBadge: {
            userId,
            badgeId: 'level_10',
            earnedAt: new Date('2024-02-05'),
            progress: 1,
            isDisplayed: true
          },
          requirements: [
            {
              requirement: { type: 'level_reached', target: 10 },
              completed: true,
              currentValue: 12,
              targetValue: 10,
              progressPercentage: 1
            }
          ]
        },
        {
          id: 'perfectionist',
          name: 'Perfezionista',
          description: 'Completa una missione con punteggio perfetto',
          iconUrl: '💎',
          rarity: 'legendary',
          category: 'achievement',
          requirements: [
            {
              type: 'custom',
              description: 'Completa una missione con punteggio perfetto',
              target: 'perfect_mission'
            }
          ],
          xpBonus: 1000,
          items: [
            {
              type: 'exclusive_content',
              title: 'Contenuto Esclusivo',
              description: 'Accesso a guide premium',
              value: 0,
              quantity: 1
            }
          ],
          displayOrder: 99,
          isHidden: true,
          isLimited: false,
          createdAt: new Date(),
          totalEarned: 12,
          averageTimeToEarn: 45,
          isEarned: false,
          progress: 0.3,
          requirements: [
            {
              requirement: { type: 'custom', target: 'perfect_mission' },
              completed: false,
              currentValue: 0,
              targetValue: 1,
              progressPercentage: 0.3
            }
          ]
        },
        {
          id: 'social_butterfly',
          name: 'Farfalla Sociale',
          description: 'Partecipa a 5 sfide della comunità',
          iconUrl: '🦋',
          rarity: 'rare',
          category: 'community',
          requirements: [
            {
              type: 'custom',
              description: 'Partecipa a 5 sfide della comunità',
              target: 5
            }
          ],
          xpBonus: 300,
          displayOrder: 10,
          isHidden: false,
          isLimited: false,
          createdAt: new Date(),
          totalEarned: 85,
          averageTimeToEarn: 21,
          isEarned: false,
          progress: 0.6,
          requirements: [
            {
              requirement: { type: 'custom', target: 5 },
              completed: false,
              currentValue: 3,
              targetValue: 5,
              progressPercentage: 0.6
            }
          ]
        }
      ];

      setBadges(mockBadges);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    // Status filter
    if (filter === 'earned' && !badge.isEarned) return false;
    if (filter === 'available' && (badge.isEarned || badge.isHidden)) return false;
    if (filter === 'locked' && !badge.isHidden) return false;

    // Rarity filter
    if (rarityFilter !== 'all' && badge.rarity !== rarityFilter) return false;

    // Search filter
    if (searchQuery && !badge.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !badge.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const toggleBadgeDisplay = async (badgeId: string, isDisplayed: boolean) => {
    setBadges(prev => prev.map(badge => {
      if (badge.id === badgeId && badge.userBadge) {
        return {
          ...badge,
          userBadge: { ...badge.userBadge, isDisplayed }
        };
      }
      return badge;
    }));

    // In production, call BadgeEngine.updateBadgeDisplayPreferences
    console.log(`Badge ${badgeId} display preference updated: ${isDisplayed}`);
  };

  const getBadgeIcon = (badge: Badge) => {
    if (badge.iconUrl.startsWith('http')) {
      return <img src={badge.iconUrl} alt={badge.name} className="w-8 h-8" />;
    }
    return <span className="text-2xl">{badge.iconUrl}</span>;
  };

  const getRarityColor = (rarity: BadgeRarity) => {
    const colors = {
      common: 'border-gray-300 bg-gray-50',
      rare: 'border-green-300 bg-green-50',
      epic: 'border-orange-300 bg-orange-50',
      legendary: 'border-orange-400 bg-orange-100'
    };
    return colors[rarity];
  };

  const getRarityGlow = (rarity: BadgeRarity) => {
    const glows = {
      common: 'shadow-sm',
      rare: 'shadow-green-200 shadow-lg',
      epic: 'shadow-orange-200 shadow-lg',
      legendary: 'shadow-orange-300 shadow-xl'
    };
    return glows[rarity];
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Trophy className="text-orange-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">I Tuoi Badge</h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {badges.filter(b => b.isEarned).length}/{badges.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cerca badge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Tutti</option>
            <option value="earned">Ottenuti</option>
            <option value="available">Disponibili</option>
            <option value="locked">Segreti</option>
          </select>

          {/* Rarity Filter */}
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Tutte le Rarità</option>
            <option value="common">Comune</option>
            <option value="rare">Raro</option>
            <option value="epic">Epico</option>
            <option value="legendary">Leggendario</option>
          </select>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="p-6">
        {filteredBadges.length === 0 ? (
          <div className="text-center py-12">
            <Award className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun Badge Trovato</h3>
            <p className="text-gray-600">Prova a modificare i filtri di ricerca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredBadges.map(badge => (
              <motion.div
                key={badge.id}
                className={`relative cursor-pointer rounded-xl p-4 text-center transition-all ${getRarityColor(badge.rarity)} ${getRarityGlow(badge.rarity)} ${
                  badge.isEarned ? 'opacity-100' : 'opacity-75'
                }`}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBadge(badge)}
                layout
              >
                {/* Badge Icon */}
                <div className={`relative mx-auto w-16 h-16 mb-3 flex items-center justify-center rounded-full ${
                  badge.isEarned ? 'bg-white shadow-sm' : 'bg-gray-200'
                }`}>
                  {getBadgeIcon(badge)}

                  {!badge.isEarned && badge.isHidden && (
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-full flex items-center justify-center">
                      <Lock className="text-white" size={20} />
                    </div>
                  )}
                </div>

                {/* Badge Name */}
                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                  {badge.name}
                </h3>

                {/* Progress or Status */}
                {badge.isEarned ? (
                  <div className="flex items-center justify-center space-x-1">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-xs text-green-600 font-medium">Ottenuto</span>
                  </div>
                ) : badge.progress !== undefined && badge.progress > 0 ? (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-blue-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${badge.progress * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {Math.round(badge.progress * 100)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">
                    {badge.isHidden ? 'Segreto' : 'Disponibile'}
                  </span>
                )}

                {/* Rarity Indicator */}
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                  badge.rarity === 'legendary' ? 'bg-yellow-400' :
                  badge.rarity === 'epic' ? 'bg-purple-400' :
                  badge.rarity === 'rare' ? 'bg-blue-400' :
                  'bg-gray-400'
                }`} />

                {/* Display Toggle for Earned Badges */}
                {badge.isEarned && badge.userBadge && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBadgeDisplay(badge.id, !badge.userBadge!.isDisplayed);
                    }}
                    className={`absolute bottom-2 right-2 p-1 rounded-full transition-colors ${
                      badge.userBadge.isDisplayed ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {badge.userBadge.isDisplayed ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <BadgeDetailModal
            badge={selectedBadge}
            onClose={() => setSelectedBadge(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Badge Detail Modal
function BadgeDetailModal({ badge, onClose }: { badge: BadgeWithProgress; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl max-w-md w-full p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-block p-4 rounded-full mb-4 ${
            badge.isEarned ? 'bg-gradient-to-br from-orange-100 to-orange-200' : 'bg-gray-100'
          }`}>
            <span className="text-4xl">{badge.iconUrl}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{badge.name}</h2>
          <p className="text-gray-600 mb-4">{badge.description}</p>

          {/* Rarity and Status */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              badge.rarity === 'legendary' ? 'bg-orange-100 text-orange-800' :
              badge.rarity === 'epic' ? 'bg-orange-100 text-orange-800' :
              badge.rarity === 'rare' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {badge.rarity}
            </span>

            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              badge.isEarned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {badge.isEarned ? 'Ottenuto' : 'Non Ottenuto'}
            </span>
          </div>
        </div>

        {/* Requirements */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Requisiti:</h3>
          <div className="space-y-3">
            {badge.requirements.map((req, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{req.requirement.description}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {req.currentValue}/{req.targetValue}
                  </span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full ${req.completed ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${req.progressPercentage * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rewards */}
        {(badge.xpBonus > 0 || badge.items) && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Ricompense:</h3>
            <div className="space-y-2">
              {badge.xpBonus > 0 && (
                <div className="flex items-center space-x-2">
                  <Zap className="text-green-500" size={16} />
                  <span className="text-sm text-gray-700">+{badge.xpBonus} XP</span>
                </div>
              )}
              {badge.items?.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Gift className="text-orange-500" size={16} />
                  <span className="text-sm text-gray-700">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{badge.totalEarned.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Utenti che l'hanno ottenuto</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{badge.averageTimeToEarn} giorni</div>
            <div className="text-xs text-gray-500">Tempo medio per ottenerlo</div>
          </div>
        </div>

        {/* Earned Date */}
        {badge.isEarned && badge.userBadge && (
          <div className="text-center text-sm text-gray-600 mb-6">
            Ottenuto il {badge.userBadge.earnedAt.toLocaleDateString()}
          </div>
        )}

        {/* Close Button */}
        <motion.button
          onClick={onClose}
          className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Chiudi
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function CheckCircle({ className, size }: { className?: string; size: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}