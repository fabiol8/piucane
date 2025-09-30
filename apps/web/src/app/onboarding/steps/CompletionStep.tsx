/**
 * Onboarding Step 7: Completion and Initial Mission Setup
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trackEvent } from '@/analytics/ga4';
import { computeCadenceDays } from '@/lib/validations';

interface CompletionStepProps {
  data: any;
  onPrev: () => void;
  onComplete: (data: any) => void;
  loading?: boolean;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  data,
  onPrev,
  onComplete,
  loading = false,
}) => {
  const [showingRecommendations, setShowingRecommendations] = useState(false);
  const currentDog = data.dogs?.[data.currentDogIndex] || {};

  // Calculate product recommendations based on dog profile
  const calculateRecommendations = () => {
    const recommendations = [];

    // Basic food recommendation based on weight and activity
    const dailyCalories = calculateDailyCalories(currentDog);
    const foodRecommendation = {
      type: 'food',
      name: 'Cibo secco premium',
      reason: `Basato su peso (${currentDog.weightKg}kg) e livello di attività`,
      cadenceDays: computeCadenceDays(currentDog.weightKg, 3000, 30), // 3kg bag, 30g per kg
      monthlyPrice: calculateMonthlyPrice(dailyCalories),
    };
    recommendations.push(foodRecommendation);

    // Health-specific recommendations
    if (currentDog.health?.conditions?.includes('joint_issues')) {
      recommendations.push({
        type: 'supplement',
        name: 'Integratore per articolazioni',
        reason: 'Supporto per problemi articolari',
        cadenceDays: 30,
        monthlyPrice: 25,
      });
    }

    if (currentDog.allergies?.food?.length > 0) {
      recommendations.push({
        type: 'food',
        name: 'Cibo ipoallergenico',
        reason: `Evita allergeni: ${currentDog.allergies.food.join(', ')}`,
        cadenceDays: computeCadenceDays(currentDog.weightKg, 2500, 25),
        monthlyPrice: calculateMonthlyPrice(dailyCalories, true),
      });
    }

    return recommendations;
  };

  const calculateDailyCalories = (dog: any) => {
    const baseCalories = dog.weightKg * 30; // Base formula
    const activityMultiplier = {
      low: 1.2,
      moderate: 1.5,
      high: 1.8,
    }[dog.habits?.activityLevel] || 1.5;

    const neuteredMultiplier = dog.neutered ? 0.9 : 1.0;

    return Math.round(baseCalories * activityMultiplier * neuteredMultiplier);
  };

  const calculateMonthlyPrice = (dailyCalories: number, premium = false) => {
    const basePrice = dailyCalories * 0.02; // €0.02 per calorie
    const premiumMultiplier = premium ? 1.3 : 1.0;
    return Math.round(basePrice * premiumMultiplier * 30);
  };

  const recommendations = calculateRecommendations();

  const handleComplete = () => {
    const completionData = {
      ...data,
      recommendations,
      initialMission: {
        type: 'profile_photo',
        title: 'Aggiungi una foto del tuo cane',
        description: 'Personalizza il profilo con una bella foto',
        xpReward: 50,
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      completedAt: new Date(),
    };

    trackEvent('onboarding_completed', {
      dogs_count: data.dogs.length,
      has_vet: !!currentDog.vetRef,
      health_conditions: currentDog.health?.conditions?.length || 0,
      marketing_consent: data.user?.consent?.marketing || false,
    });

    onComplete(completionData);
  };

  const handleAddAnotherDog = () => {
    trackEvent('dog_add_intent', {
      source: 'onboarding_completion',
      current_dogs_count: data.dogs.length,
    }, 'onboarding.add_dog.button.click');

    // Add new dog to the list and restart from dog basics step
    const newDogs = [...data.dogs, {}];
    const newData = {
      ...data,
      dogs: newDogs,
      currentDogIndex: newDogs.length - 1,
    };

    // Navigate back to dog basics step with new dog
    window.location.href = '/onboarding?step=1&dog=' + (newDogs.length - 1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">
          Perfetto! Sei pronto per iniziare
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Abbiamo configurato tutto per te e {currentDog.name}. Ecco cosa abbiamo preparato
          per offrirvi la migliore esperienza possibile.
        </p>
      </div>

      {/* Dog Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl">
              🐕
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentDog.name}
              </h3>
              <p className="text-gray-600">
                {currentDog.breed} • {currentDog.weightKg}kg • {currentDog.sex === 'male' ? 'Maschio' : 'Femmina'}
              </p>
              <p className="text-sm text-gray-500">
                {currentDog.health?.conditions?.length > 0 && (
                  <>Condizioni monitorate: {currentDog.health.conditions.length}</>
                )}
                {currentDog.allergies?.food?.length > 0 && (
                  <> • Allergie alimentari: {currentDog.allergies.food.length}</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 Raccomandazioni personalizzate
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{rec.name}</h4>
                  <p className="text-sm text-gray-600">{rec.reason}</p>
                  <p className="text-xs text-gray-500">
                    Consegna ogni {rec.cadenceDays} giorni
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-600">
                    €{rec.monthlyPrice}/mese
                  </div>
                  <div className="text-xs text-gray-500">
                    Risparmia il 15%
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Potrai esplorare questi prodotti e attivare gli abbonamenti dalla dashboard.
              Riceverai anche consigli personalizzati basati sul profilo di {currentDog.name}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Initial Mission */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎮 La tua prima missione
          </h3>
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl">
              📸
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">
                Aggiungi una foto del profilo di {currentDog.name}
              </h4>
              <p className="text-sm text-gray-600">
                Personalizza il profilo con una bella foto del tuo amico a quattro zampe
              </p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">+50 XP</div>
              <div className="text-xs text-gray-500">Ricompensa</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-4">
        {data.dogs.length === 1 && (
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddAnotherDog}
              ctaId="onboarding.add_dog.button.click"
              rightIcon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              Aggiungi un altro cane
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Hai più cani? Puoi aggiungere tutti i profili che vuoi
            </p>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onPrev}
            ctaId="onboarding.prev.button.click"
            leftIcon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            }
          >
            Indietro
          </Button>

          <Button
            variant="primary"
            size="xl"
            loading={loading}
            onClick={handleComplete}
            ctaId="onboarding.finish.button.click"
            rightIcon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            Inizia l'avventura!
          </Button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>
          🔒 I tuoi dati sono al sicuro e protetti secondo il GDPR.{' '}
          <a href="/privacy" className="text-primary hover:underline" target="_blank">
            Informativa Privacy
          </a>
        </p>
      </div>
    </div>
  );
};