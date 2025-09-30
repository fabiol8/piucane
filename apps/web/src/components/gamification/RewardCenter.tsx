'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Star,
  Tag,
  Zap,
  Calendar,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Package,
  CreditCard,
  Crown,
  AlertCircle
} from 'lucide-react';
import type {
  EarnedReward,
  RewardType,
  DiscountReward
} from '@/types/gamification';

interface RewardCenterProps {
  userId: string;
  className?: string;
}

interface RewardWithDetails extends EarnedReward {
  discountDetails?: DiscountReward;
  canClaim: boolean;
  isExpiringSoon: boolean;
}

export default function RewardCenter({ userId, className }: RewardCenterProps) {
  const [rewards, setRewards] = useState<RewardWithDetails[]>([]);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'claimed' | 'expired'>('pending');
  const [selectedReward, setSelectedReward] = useState<RewardWithDetails | null>(null);
  const [claimingReward, setClaimingReward] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRewards();
  }, [userId]);

  const loadRewards = async () => {
    try {
      setLoading(true);

      // Mock rewards data - in production, load from RewardSystem
      const mockRewards: RewardWithDetails[] = [
        {
          id: 'reward_001',
          type: 'discount',
          title: '15% di Sconto',
          description: 'Sconto su tutti i prodotti per aver completato la missione settimanale',
          value: 15,
          status: 'pending',
          earnedAt: new Date('2024-01-28'),
          expiresAt: new Date('2024-03-28'),
          sourceType: 'mission',
          sourceId: 'mission_weekly_001',
          sourceName: 'Missione Settimanale',
          canClaim: true,
          isExpiringSoon: false,
          discountDetails: {
            id: 'disc_001',
            code: 'PC15WEEKLY2024',
            type: 'percentage',
            value: 15,
            minOrderValue: 25,
            maxDiscount: 50,
            validForCategories: undefined,
            validForSkus: undefined,
            expiresAt: new Date('2024-03-28')
          }
        },
        {
          id: 'reward_002',
          type: 'free_item',
          title: 'Snack Gratuito Premium',
          description: 'Campione gratuito di snack premium per il tuo cane',
          value: 12.99,
          sku: 'SAMPLE_PREMIUM_001',
          status: 'pending',
          earnedAt: new Date('2024-01-26'),
          expiresAt: new Date('2024-02-15'),
          sourceType: 'badge',
          sourceId: 'badge_level_10',
          sourceName: 'Esperto Cinofilo',
          canClaim: true,
          isExpiringSoon: true
        },
        {
          id: 'reward_003',
          type: 'xp',
          title: 'Bonus XP Giornaliero',
          description: 'Bonus esperienza per la tua costanza',
          value: 150,
          status: 'claimed',
          earnedAt: new Date('2024-01-25'),
          claimedAt: new Date('2024-01-25'),
          sourceType: 'streak',
          sourceId: 'streak_7_days',
          sourceName: 'Striscia 7 giorni',
          canClaim: false,
          isExpiringSoon: false
        },
        {
          id: 'reward_004',
          type: 'discount',
          title: '25% di Sconto VIP',
          description: 'Sconto esclusivo per utenti di livello avanzato',
          value: 25,
          code: 'PC25VIP2024',
          status: 'claimed',
          earnedAt: new Date('2024-01-20'),
          claimedAt: new Date('2024-01-22'),
          usedAt: new Date('2024-01-24'),
          sourceType: 'level_up',
          sourceId: '12',
          sourceName: 'Livello 12',
          canClaim: false,
          isExpiringSoon: false,
          discountDetails: {
            id: 'disc_004',
            code: 'PC25VIP2024',
            type: 'percentage',
            value: 25,
            minOrderValue: 50,
            maxDiscount: 100,
            validForCategories: undefined,
            validForSkus: undefined,
            expiresAt: new Date('2024-04-20')
          }
        },
        {
          id: 'reward_005',
          type: 'exclusive_content',
          title: 'Guida Premium Addestramento',
          description: 'Accesso esclusivo alle guide avanzate di addestramento',
          value: 0,
          sku: 'CONTENT_TRAINING_ADV',
          status: 'expired',
          earnedAt: new Date('2023-12-15'),
          expiresAt: new Date('2024-01-15'),
          sourceType: 'special_event',
          sourceId: 'christmas_2023',
          sourceName: 'Evento Natalizio',
          canClaim: false,
          isExpiringSoon: false
        }
      ];

      setRewards(mockRewards);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRewards = rewards.filter(reward => {
    switch (selectedTab) {
      case 'pending':
        return reward.status === 'pending';
      case 'claimed':
        return reward.status === 'claimed';
      case 'expired':
        return reward.status === 'expired';
      default:
        return false;
    }
  });

  const handleClaimReward = async (rewardId: string) => {
    try {
      setClaimingReward(rewardId);

      // In production, call RewardSystem.claimReward
      await new Promise(resolve => setTimeout(resolve, 1500)); // Mock delay

      setRewards(prev => prev.map(reward => {
        if (reward.id === rewardId) {
          return {
            ...reward,
            status: 'claimed',
            claimedAt: new Date()
          };
        }
        return reward;
      }));

      // Refresh data
      await loadRewards();
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaimingReward(null);
    }
  };

  const copyDiscountCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getRewardIcon = (type: RewardType) => {
    const icons = {
      xp: <Zap className="text-purple-500" size={24} />,
      badge: <Star className="text-yellow-500" size={24} />,
      discount: <Tag className="text-green-500" size={24} />,
      free_item: <Package className="text-blue-500" size={24} />,
      exclusive_content: <Crown className="text-purple-500" size={24} />
    };
    return icons[type];
  };

  const getTypeLabel = (type: RewardType) => {
    const labels = {
      xp: 'Esperienza',
      badge: 'Badge',
      discount: 'Sconto',
      free_item: 'Oggetto Gratuito',
      exclusive_content: 'Contenuto Esclusivo'
    };
    return labels[type];
  };

  const formatExpiryDate = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Scaduto';
    if (diffDays === 0) return 'Scade oggi';
    if (diffDays === 1) return 'Scade domani';
    if (diffDays <= 7) return `Scade tra ${diffDays} giorni`;
    return `Scade il ${date.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
        <div className="flex items-center space-x-3 mb-4">
          <Gift className="text-green-500" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Centro Premi</h2>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'pending', label: 'Da Riscattare', count: rewards.filter(r => r.status === 'pending').length },
            { id: 'claimed', label: 'Riscattati', count: rewards.filter(r => r.status === 'claimed').length },
            { id: 'expired', label: 'Scaduti', count: rewards.filter(r => r.status === 'expired').length }
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
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  selectedTab === tab.id ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Rewards List */}
      <div className="p-6">
        {filteredRewards.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedTab === 'pending' ? 'Nessun Premio da Riscattare' :
               selectedTab === 'claimed' ? 'Nessun Premio Riscattato' :
               'Nessun Premio Scaduto'}
            </h3>
            <p className="text-gray-600">
              {selectedTab === 'pending' ? 'Completa missioni e guadagna badge per ottenere premi!' :
               selectedTab === 'claimed' ? 'I tuoi premi riscattati appariranno qui.' :
               'I premi scaduti appariranno qui.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRewards.map(reward => (
              <motion.div
                key={reward.id}
                className={`border rounded-xl p-6 transition-all cursor-pointer ${
                  reward.isExpiringSoon ? 'border-orange-200 bg-orange-50' :
                  reward.status === 'pending' ? 'border-green-200 bg-green-50 hover:bg-green-100' :
                  reward.status === 'claimed' ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                }`}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedReward(reward)}
                layout
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Reward Icon */}
                    <div className={`p-3 rounded-full ${
                      reward.status === 'pending' ? 'bg-white shadow-sm' :
                      reward.status === 'claimed' ? 'bg-white shadow-sm' :
                      'bg-gray-100'
                    }`}>
                      {getRewardIcon(reward.type)}
                    </div>

                    {/* Reward Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{reward.title}</h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          {getTypeLabel(reward.type)}
                        </span>
                        {reward.isExpiringSoon && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium flex items-center space-x-1">
                            <AlertCircle size={12} />
                            <span>In Scadenza</span>
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 mb-3">{reward.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Valore:</span>
                          <div className="font-semibold text-gray-900">
                            {reward.type === 'xp' ? `${reward.value} XP` :
                             reward.type === 'discount' ? `${reward.value}%` :
                             reward.value > 0 ? `€${reward.value}` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Origine:</span>
                          <div className="font-semibold text-gray-900">{reward.sourceName}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Guadagnato:</span>
                          <div className="font-semibold text-gray-900">
                            {reward.earnedAt.toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {reward.status === 'pending' ? 'Scadenza:' :
                             reward.status === 'claimed' ? 'Riscattato:' :
                             'Scaduto:'}
                          </span>
                          <div className={`font-semibold ${
                            reward.isExpiringSoon ? 'text-orange-600' :
                            reward.status === 'claimed' ? 'text-green-600' :
                            reward.status === 'expired' ? 'text-red-600' :
                            'text-gray-900'
                          }`}>
                            {reward.status === 'claimed' && reward.claimedAt
                              ? reward.claimedAt.toLocaleDateString()
                              : reward.expiresAt ? formatExpiryDate(reward.expiresAt) : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Discount Code Preview */}
                      {reward.type === 'discount' && reward.status === 'claimed' && reward.code && (
                        <div className="mt-4 p-3 bg-white rounded-lg border-2 border-dashed border-gray-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-500">Codice Sconto:</span>
                              <div className="font-mono font-bold text-lg text-gray-900">{reward.code}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyDiscountCode(reward.code!);
                              }}
                              className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              {copiedCode === reward.code ? <Check size={16} /> : <Copy size={16} />}
                              <span className="text-sm font-medium">
                                {copiedCode === reward.code ? 'Copiato!' : 'Copia'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    {reward.status === 'pending' && reward.canClaim && (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimReward(reward.id);
                        }}
                        disabled={claimingReward === reward.id}
                        className="bg-gradient-to-r from-green-600 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-orange-700 disabled:opacity-50 transition-all flex items-center space-x-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {claimingReward === reward.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            <span>Riscatto...</span>
                          </>
                        ) : (
                          <>
                            <Gift size={16} />
                            <span>Riscatta</span>
                          </>
                        )}
                      </motion.button>
                    )}

                    {reward.status === 'claimed' && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <Check size={20} />
                        <span className="font-semibold">Riscattato</span>
                      </div>
                    )}

                    {reward.status === 'expired' && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <Clock size={20} />
                        <span className="font-semibold">Scaduto</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reward Detail Modal */}
      <AnimatePresence>
        {selectedReward && (
          <RewardDetailModal
            reward={selectedReward}
            onClose={() => setSelectedReward(null)}
            onClaim={selectedReward.status === 'pending' ? () => handleClaimReward(selectedReward.id) : undefined}
            onCopyCode={selectedReward.code ? () => copyDiscountCode(selectedReward.code!) : undefined}
            isClaimingReward={claimingReward === selectedReward.id}
            copiedCode={copiedCode === selectedReward.code}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Reward Detail Modal
function RewardDetailModal({
  reward,
  onClose,
  onClaim,
  onCopyCode,
  isClaimingReward,
  copiedCode
}: {
  reward: RewardWithDetails;
  onClose: () => void;
  onClaim?: () => void;
  onCopyCode?: () => void;
  isClaimingReward?: boolean;
  copiedCode?: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-block p-4 rounded-full mb-4 ${
            reward.status === 'pending' ? 'bg-blue-100' :
            reward.status === 'claimed' ? 'bg-green-100' :
            'bg-gray-100'
          }`}>
            {getRewardIcon(reward.type)}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{reward.title}</h2>
          <p className="text-gray-600 mb-4">{reward.description}</p>

          <div className="flex items-center justify-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              reward.status === 'pending' ? 'bg-blue-100 text-blue-800' :
              reward.status === 'claimed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {reward.status === 'pending' ? 'Da Riscattare' :
               reward.status === 'claimed' ? 'Riscattato' :
               'Scaduto'}
            </span>

            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
              {getTypeLabel(reward.type)}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {reward.type === 'xp' ? `${reward.value} XP` :
                 reward.type === 'discount' ? `${reward.value}%` :
                 reward.value > 0 ? `€${reward.value}` : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Valore</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{reward.sourceName}</div>
              <div className="text-sm text-gray-500">Origine</div>
            </div>
          </div>

          {reward.expiresAt && (
            <div className="text-center">
              <div className={`text-lg font-bold ${
                reward.isExpiringSoon ? 'text-orange-600' :
                reward.status === 'expired' ? 'text-red-600' :
                'text-gray-900'
              }`}>
                {formatExpiryDate(reward.expiresAt)}
              </div>
              <div className="text-sm text-gray-500">
                {reward.status === 'expired' ? 'Data di scadenza' : 'Scade'}
              </div>
            </div>
          )}
        </div>

        {/* Discount Details */}
        {reward.type === 'discount' && reward.discountDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Dettagli Sconto:</h3>
            <div className="space-y-2 text-sm">
              {reward.discountDetails.minOrderValue && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ordine minimo:</span>
                  <span className="font-medium">€{reward.discountDetails.minOrderValue}</span>
                </div>
              )}
              {reward.discountDetails.maxDiscount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sconto massimo:</span>
                  <span className="font-medium">€{reward.discountDetails.maxDiscount}</span>
                </div>
              )}
              {reward.discountDetails.validForCategories && (
                <div>
                  <span className="text-gray-600">Valido per:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {reward.discountDetails.validForCategories.map(category => (
                      <span key={category} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Discount Code */}
        {reward.type === 'discount' && reward.status === 'claimed' && reward.code && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">Il tuo codice sconto:</div>
              <div className="font-mono text-xl font-bold text-gray-900 mb-3">{reward.code}</div>
              {onCopyCode && (
                <motion.button
                  onClick={onCopyCode}
                  className="flex items-center justify-center space-x-2 mx-auto px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Copiato!' : 'Copia Codice'}</span>
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          {onClaim && (
            <motion.button
              onClick={onClaim}
              disabled={isClaimingReward}
              className="flex-1 bg-gradient-to-r from-green-600 to-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-orange-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isClaimingReward ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Riscatto...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Riscatta Premio</span>
                </>
              )}
            </motion.button>
          )}

          <motion.button
            onClick={onClose}
            className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Chiudi
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function getRewardIcon(type: RewardType) {
  const icons = {
    xp: <Zap className="text-green-500" size={24} />,
    badge: <Star className="text-orange-500" size={24} />,
    discount: <Tag className="text-green-500" size={24} />,
    free_item: <Package className="text-orange-500" size={24} />,
    exclusive_content: <Crown className="text-orange-500" size={24} />
  };
  return icons[type];
}

function getTypeLabel(type: RewardType) {
  const labels = {
    xp: 'Esperienza',
    badge: 'Badge',
    discount: 'Sconto',
    free_item: 'Oggetto Gratuito',
    exclusive_content: 'Contenuto Esclusivo'
  };
  return labels[type];
}