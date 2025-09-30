'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  CheckCircle,
  Clock,
  Star,
  Camera,
  FileText,
  Timer,
  Award,
  Zap,
  AlertCircle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import type {
  Mission,
  MissionStep,
  UserMissionProgress,
  DifficultyLevel
} from '@/types/gamification';

interface MissionProgressProps {
  missionProgress: UserMissionProgress;
  mission: Mission;
  onStepComplete: (stepId: string, verification: any, timeSpent: number, rating?: number) => Promise<void>;
  onMissionPause: () => Promise<void>;
  onMissionResume: () => Promise<void>;
  className?: string;
}

interface StepVerificationProps {
  step: MissionStep;
  onVerify: (verification: any, timeSpent: number, rating?: number) => Promise<void>;
  isActive: boolean;
}

export default function MissionProgress({
  missionProgress,
  mission,
  onStepComplete,
  onMissionPause,
  onMissionResume,
  className
}: MissionProgressProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [activeStepTime, setActiveStepTime] = useState(0);
  const [stepStartTime, setStepStartTime] = useState<Date | null>(null);

  // Timer for active step
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (missionProgress.status === 'active' && stepStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - stepStartTime.getTime()) / 1000);
        setActiveStepTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [missionProgress.status, stepStartTime]);

  // Set step start time when mission becomes active
  useEffect(() => {
    if (missionProgress.status === 'active' && !stepStartTime) {
      setStepStartTime(new Date());
    } else if (missionProgress.status !== 'active') {
      setStepStartTime(null);
      setActiveStepTime(0);
    }
  }, [missionProgress.status]);

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    const colors = {
      easy: 'text-green-600 bg-green-100',
      medium: 'text-blue-600 bg-blue-100',
      hard: 'text-red-600 bg-red-100',
      adaptive: 'text-purple-600 bg-purple-100'
    };
    return colors[difficulty];
  };

  const getStatusColor = (status: UserMissionProgress['status']) => {
    const colors = {
      active: 'text-blue-600 bg-blue-100',
      paused: 'text-yellow-600 bg-yellow-100',
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      expired: 'text-gray-600 bg-gray-100',
      available: 'text-gray-600 bg-gray-100'
    };
    return colors[status];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStepExpand = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border ${className}`}>
      {/* Mission Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">{mission.title}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(missionProgress.currentDifficulty)}`}>
                {missionProgress.currentDifficulty}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(missionProgress.status)}`}>
                {missionProgress.status === 'active' ? 'In Corso' :
                 missionProgress.status === 'paused' ? 'In Pausa' :
                 missionProgress.status === 'completed' ? 'Completata' :
                 missionProgress.status}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{mission.description}</p>

            {/* Progress Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {missionProgress.completedSteps}/{missionProgress.totalSteps}
                </div>
                <div className="text-sm text-gray-600">Passi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(missionProgress.progressPercentage * 100)}%
                </div>
                <div className="text-sm text-gray-600">Completamento</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(missionProgress.timeSpent)} min
                </div>
                <div className="text-sm text-gray-600">Tempo Speso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {Math.round(missionProgress.efficiency * 100)}%
                </div>
                <div className="text-sm text-gray-600">Efficienza</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {missionProgress.status === 'active' && (
              <motion.button
                onClick={onMissionPause}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Pause size={16} />
                <span>Pausa</span>
              </motion.button>
            )}

            {missionProgress.status === 'paused' && (
              <motion.button
                onClick={onMissionResume}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play size={16} />
                <span>Riprendi</span>
              </motion.button>
            )}

            {activeStepTime > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
                <Timer size={16} className="text-gray-600" />
                <span className="text-sm font-mono text-gray-700">
                  {formatTime(activeStepTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-6">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${missionProgress.progressPercentage * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Mission Steps */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Passi della Missione</h3>
        <div className="space-y-3">
          {mission.steps.map((step, index) => {
            const stepProgress = missionProgress.stepProgress.find(sp => sp.stepId === step.id);
            const isCurrentStep = missionProgress.currentStep === index;
            const isCompleted = stepProgress?.status === 'completed';
            const isActive = stepProgress?.status === 'active';
            const isExpanded = expandedStep === step.id;

            return (
              <motion.div
                key={step.id}
                className={`border rounded-lg transition-all ${
                  isCompleted ? 'border-green-200 bg-green-50' :
                  isActive ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200 bg-white'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => handleStepExpand(step.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Step Status Icon */}
                      {isCompleted ? (
                        <CheckCircle className="text-green-500" size={24} />
                      ) : isActive ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                      )}

                      {/* Step Info */}
                      <div>
                        <h4 className={`font-semibold ${isCompleted ? 'text-green-700' : isActive ? 'text-green-700' : 'text-gray-700'}`}>
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-600">{step.description}</p>

                        {/* Step Metadata */}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>~{step.estimatedMinutes} min</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Zap size={12} />
                            <span>{step.xpReward} XP</span>
                          </div>
                          {step.verification?.required && (
                            <div className="flex items-center space-x-1">
                              <AlertCircle size={12} />
                              <span>Verifica richiesta</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {stepProgress?.rating && (
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={16}
                              className={star <= stepProgress.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                      )}

                      {isExpanded ? (
                        <ChevronDown className="text-gray-400" size={20} />
                      ) : (
                        <ChevronRight className="text-gray-400" size={20} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Step Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200"
                    >
                      <div className="p-4">
                        {/* Step Instructions */}
                        <div className="mb-4">
                          <h5 className="font-semibold text-gray-900 mb-2">Istruzioni:</h5>
                          <p className="text-gray-700 mb-3">{step.instructions}</p>

                          {step.tips && step.tips.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-3 mb-3">
                              <h6 className="font-semibold text-green-900 mb-2">💡 Suggerimenti:</h6>
                              <ul className="text-sm text-green-700 space-y-1">
                                {step.tips.map((tip, tipIndex) => (
                                  <li key={tipIndex}>• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {step.materials && step.materials.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <h6 className="font-semibold text-gray-900 mb-2">📋 Materiali necessari:</h6>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {step.materials.map((material, materialIndex) => (
                                  <li key={materialIndex}>• {material}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Step Verification */}
                        {isActive && !isCompleted && (
                          <StepVerification
                            step={step}
                            onVerify={async (verification, timeSpent, rating) => {
                              await onStepComplete(step.id, verification, timeSpent, rating);
                              setExpandedStep(null);
                            }}
                            isActive={true}
                          />
                        )}

                        {/* Completed Step Info */}
                        {isCompleted && stepProgress && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h6 className="font-semibold text-green-900 mb-1">✅ Passo Completato!</h6>
                                <p className="text-sm text-green-700">
                                  Completato il {stepProgress.completedAt?.toLocaleDateString()}
                                  in {Math.round(stepProgress.timeSpent)} minuti
                                </p>
                              </div>
                              {stepProgress.rating && (
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      size={16}
                                      className={star <= stepProgress.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mission Rewards Preview */}
      {missionProgress.status !== 'completed' && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🎁 Premi alla Completazione</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mission.rewards.xp} XP</div>
              <div className="text-sm text-gray-600">Punti Esperienza</div>
            </div>
            {mission.rewards.badges && mission.rewards.badges.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{mission.rewards.badges.length}</div>
                <div className="text-sm text-gray-600">Badge</div>
              </div>
            )}
            {mission.rewards.items && mission.rewards.items.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{mission.rewards.items.length}</div>
                <div className="text-sm text-gray-600">Premi Speciali</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Step Verification Component
function StepVerification({ step, onVerify, isActive }: StepVerificationProps) {
  const [verification, setVerification] = useState<any>({});
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    // Mock time tracking
    setTimeSpent(step.estimatedMinutes * 60); // seconds
  }, [step.estimatedMinutes]);

  const handleSubmit = async () => {
    if (!isActive) return;

    setLoading(true);
    try {
      await onVerify(verification, timeSpent / 60, rating > 0 ? rating : undefined); // Convert to minutes
    } catch (error) {
      console.error('Failed to verify step:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationInput = () => {
    if (!step.verification) {
      return (
        <motion.button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? 'Completamento...' : 'Segna come Completato'}
        </motion.button>
      );
    }

    switch (step.verification.type) {
      case 'photo':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-gray-600 mb-4">Carica una foto per verificare il completamento</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setVerification({ ...verification, photoUrl: URL.createObjectURL(file) });
                  }
                }}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors inline-block"
              >
                Scegli Foto
              </label>
            </div>
            {verification.photoUrl && (
              <div className="text-center">
                <img
                  src={verification.photoUrl}
                  alt="Verifica"
                  className="mx-auto h-32 w-32 object-cover rounded-lg"
                />
                <p className="text-sm text-green-600 mt-2">Foto caricata con successo!</p>
              </div>
            )}
          </div>
        );

      case 'timer':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-green-600">
                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-gray-600">Tempo minimo richiesto: {step.verification.data?.requiredMinutes || 1} minuti</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <textarea
              placeholder="Descrivi brevemente come hai completato questo passo..."
              className="w-full p-3 border border-gray-300 rounded-lg"
              rows={3}
              onChange={(e) => setVerification({ ...verification, description: e.target.value })}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderVerificationInput()}

      {/* Rating System */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Come è andata? (facoltativo)</p>
        <div className="flex justify-center space-x-1">
          {[1, 2, 3, 4, 5].map(star => (
            <motion.button
              key={star}
              onClick={() => setRating(star)}
              className={`p-1 ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Star size={24} className={star <= rating ? 'fill-current' : ''} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <motion.button
        onClick={handleSubmit}
        disabled={loading || (step.verification?.required && !verification.photoUrl && !verification.description)}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? 'Verifica in corso...' : 'Completa Passo'}
      </motion.button>
    </div>
  );
}