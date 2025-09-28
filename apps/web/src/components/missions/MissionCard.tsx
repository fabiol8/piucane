'use client';

import { useState } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';

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

interface MissionCardProps {
  mission: Mission;
  userLevel: number;
  onStart: (missionId: string) => void;
  onComplete: (missionId: string, data?: any) => void;
}

export default function MissionCard({ mission, userLevel, onStart, onComplete }: MissionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-orange-600 bg-orange-50';
      case 'expert': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Medio';
      case 'hard': return 'Difficile';
      case 'expert': return 'Esperto';
      default: return difficulty;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-orange-600 bg-orange-50';
      case 'completed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponibile';
      case 'in_progress': return 'In corso';
      case 'completed': return 'Completata';
      default: return status;
    }
  };

  const canStart = mission.userStatus === 'available' && userLevel >= mission.requiredLevel;
  const canComplete = mission.userStatus === 'in_progress' &&
    mission.objectives.every(obj => obj.current >= obj.target);
  const isLocked = userLevel < mission.requiredLevel;

  const handleStart = async () => {
    if (!canStart || isProcessing) return;

    setIsProcessing(true);
    try {
      await onStart(mission.id);

      trackEvent('mission_start_click', {
        mission_id: mission.id,
        mission_category: mission.category,
        mission_difficulty: mission.difficulty
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete || isProcessing) return;

    setIsProcessing(true);
    try {
      await onComplete(mission.id);

      trackEvent('mission_complete_click', {
        mission_id: mission.id,
        mission_category: mission.category,
        mission_difficulty: mission.difficulty
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getObjectiveProgress = (objective: any) => {
    const percentage = Math.min(100, (objective.current / objective.target) * 100);
    return percentage;
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      isLocked ? 'opacity-60' : 'hover:shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{mission.icon}</div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold line-clamp-2 ${
              isLocked ? 'text-gray-500' : 'text-gray-900'
            }`}>
              {mission.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(mission.difficulty)}`}>
                {getDifficultyText(mission.difficulty)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mission.userStatus)}`}>
                {getStatusText(mission.userStatus)}
              </span>
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="text-gray-400">
            🔒 Lv.{mission.requiredLevel}
          </div>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 ${isLocked ? 'text-gray-500' : 'text-gray-600'}`}>
        {mission.description}
      </p>

      {/* Objectives */}
      {mission.objectives && mission.objectives.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Obiettivi:</h4>
          <div className="space-y-2">
            {mission.objectives.map((objective) => (
              <div key={objective.id}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{objective.description}</span>
                  <span>{objective.current}/{objective.target}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getObjectiveProgress(objective)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewards */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-blue-600">⭐</span>
            <span className={isLocked ? 'text-gray-500' : 'text-gray-700'}>
              +{mission.xpReward} XP
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-orange-600">🔥</span>
            <span className={isLocked ? 'text-gray-500' : 'text-gray-700'}>
              +{mission.pointsReward} Punti
            </span>
          </div>
        </div>
        <div className={`text-xs ${isLocked ? 'text-gray-500' : 'text-gray-600'}`}>
          ⏱️ {mission.estimatedTime}
        </div>
      </div>

      {/* Action Button */}
      <div className="space-y-2">
        {isLocked && (
          <div className="text-center text-xs text-gray-500 py-2">
            Raggiungi il livello {mission.requiredLevel} per sbloccare
          </div>
        )}

        {mission.userStatus === 'available' && !isLocked && (
          <Button
            onClick={handleStart}
            disabled={isProcessing}
            className="w-full"
            data-cta-id={`mission_${mission.id}.start.click`}
          >
            {isProcessing ? 'Avvio...' : '🚀 Inizia Missione'}
          </Button>
        )}

        {mission.userStatus === 'in_progress' && (
          <div className="space-y-2">
            {canComplete ? (
              <Button
                onClick={handleComplete}
                disabled={isProcessing}
                className="w-full"
                data-cta-id={`mission_${mission.id}.complete.click`}
              >
                {isProcessing ? 'Completamento...' : '✅ Completa Missione'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled
                className="w-full"
              >
                📋 In corso...
              </Button>
            )}

            {mission.startedAt && (
              <div className="text-xs text-gray-500 text-center">
                Iniziata il {new Date(mission.startedAt).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
        )}

        {mission.userStatus === 'completed' && (
          <div className="space-y-2">
            <div className="text-center text-green-600 font-medium py-2">
              ✅ Missione Completata!
            </div>
            {mission.completedAt && (
              <div className="text-xs text-gray-500 text-center">
                Completata il {new Date(mission.completedAt).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Badge */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className={`px-2 py-1 rounded-full ${isLocked ? 'text-gray-500 bg-gray-100' : 'text-orange-600 bg-orange-50'}`}>
            {mission.category}
          </span>
          {mission.userStatus === 'in_progress' && (
            <span className="text-orange-600 animate-pulse">
              ⚡ Attiva
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}