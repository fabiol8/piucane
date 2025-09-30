/**
 * Onboarding Step 4: Dog Habits and Lifestyle
 */

'use client';

import React, { useState } from 'react';
import { Form, FormField, FormLabel, FormSelect, FormRadioGroup } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trackEvent } from '@/analytics/ga4';

interface HabitsStepProps {
  data: any;
  onNext: (data: any) => void;
  onPrev: () => void;
  loading?: boolean;
}

export const HabitsStep: React.FC<HabitsStepProps> = ({
  data,
  onNext,
  onPrev,
  loading = false,
}) => {
  const currentDog = data.dogs?.[data.currentDogIndex] || {};
  const [formData, setFormData] = useState({
    habits: {
      mealsPerDay: currentDog.habits?.mealsPerDay || 2,
      walkFrequency: currentDog.habits?.walkFrequency || '',
      activityLevel: currentDog.habits?.activityLevel || '',
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      habits: {
        ...prev.habits,
        [field]: value,
      },
    }));
  };

  const handleSubmit = () => {
    trackEvent('habits_info_completed', {
      dog_id: `temp_${data.currentDogIndex}`,
      meals_per_day: formData.habits.mealsPerDay,
      walk_frequency: formData.habits.walkFrequency,
      activity_level: formData.habits.activityLevel,
    });

    const updatedDogs = [...data.dogs];
    updatedDogs[data.currentDogIndex] = {
      ...currentDog,
      ...formData,
    };

    onNext({
      dogs: updatedDogs,
    });
  };

  const mealOptions = [
    { value: '1', label: '1 volta al giorno' },
    { value: '2', label: '2 volte al giorno' },
    { value: '3', label: '3 volte al giorno' },
    { value: '4', label: '4 volte al giorno' },
    { value: '5', label: '5+ volte al giorno' },
  ];

  const walkOptions = [
    { value: 'daily', label: '1 volta al giorno' },
    { value: 'twice_daily', label: '2 volte al giorno' },
    { value: 'multiple_daily', label: '3+ volte al giorno' },
    { value: 'few_times_week', label: 'Poche volte a settimana' },
  ];

  const activityOptions = [
    { value: 'low', label: 'Bassa - Preferisce riposare, passeggiate brevi' },
    { value: 'moderate', label: 'Moderata - Passeggiate regolari, gioco occasionale' },
    { value: 'high', label: 'Alta - Molto attivo, esercizio intenso quotidiano' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Abitudini di {currentDog.name || 'il tuo cane'}
        </h2>
        <p className="text-gray-600">
          Conoscere le abitudini del tuo cane ci aiuta a calcolare il fabbisogno nutrizionale e la cadenza degli abbonamenti.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel htmlFor="mealsPerDay" required>
                Quanti pasti al giorno?
              </FormLabel>
              <FormSelect
                id="mealsPerDay"
                value={formData.habits.mealsPerDay.toString()}
                onChange={(e) => handleInputChange('mealsPerDay', parseInt(e.target.value))}
                options={mealOptions}
                hint="Il numero di pasti influenza il dosaggio giornaliero"
                required
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel required>Frequenza delle passeggiate</FormLabel>
              <FormRadioGroup
                name="walkFrequency"
                options={walkOptions}
                value={formData.habits.walkFrequency}
                onChange={(value) => handleInputChange('walkFrequency', value)}
                hint="Quanto spesso porti fuori il tuo cane?"
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel required>Livello di attività</FormLabel>
              <FormRadioGroup
                name="activityLevel"
                options={activityOptions}
                value={formData.habits.activityLevel}
                onChange={(value) => handleInputChange('activityLevel', value)}
                hint="Il livello di attività influenza il fabbisogno calorico"
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                💡 Lo sapevi?
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Useremo queste informazioni per calcolare automaticamente la cadenza perfetta per il tuo abbonamento,
                così non rimarrai mai senza cibo!
              </p>
            </div>
          </div>
        </div>

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
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            ctaId="onboarding.next.button.click"
            rightIcon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            }
          >
            Continua
          </Button>
        </div>
      </Form>
    </div>
  );
};