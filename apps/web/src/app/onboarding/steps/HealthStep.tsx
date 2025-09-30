/**
 * Onboarding Step 3: Health Information
 */

'use client';

import React, { useState } from 'react';
import { Form, FormField, FormLabel, FormCheckbox, FormTextarea } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { allergens, healthConditions } from '@/lib/validations';
import { trackEvent } from '@/analytics/ga4';

interface HealthStepProps {
  data: any;
  onNext: (data: any) => void;
  onPrev: () => void;
  loading?: boolean;
}

export const HealthStep: React.FC<HealthStepProps> = ({
  data,
  onNext,
  onPrev,
  loading = false,
}) => {
  const currentDog = data.dogs?.[data.currentDogIndex] || {};
  const [formData, setFormData] = useState({
    health: {
      conditions: currentDog.health?.conditions || [],
      notes: currentDog.health?.notes || '',
    },
    allergies: {
      food: currentDog.allergies?.food || [],
      environmental: currentDog.allergies?.environmental || [],
    },
    bcs: currentDog.bcs || 3, // Body Condition Score
  });

  const handleConditionChange = (condition: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      health: {
        ...prev.health,
        conditions: checked
          ? [...prev.health.conditions, condition]
          : prev.health.conditions.filter(c => c !== condition),
      },
    }));
  };

  const handleAllergyChange = (type: 'food' | 'environmental', allergen: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allergies: {
        ...prev.allergies,
        [type]: checked
          ? [...prev.allergies[type], allergen]
          : prev.allergies[type].filter(a => a !== allergen),
      },
    }));
  };

  const handleBCSChange = (score: number) => {
    setFormData(prev => ({ ...prev, bcs: score }));
  };

  const handleSubmit = () => {
    // Track health information completion
    trackEvent('health_info_completed', {
      dog_id: `temp_${data.currentDogIndex}`,
      conditions_count: formData.health.conditions.length,
      food_allergies_count: formData.allergies.food.length,
      env_allergies_count: formData.allergies.environmental.length,
      bcs_score: formData.bcs,
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

  const foodAllergens = allergens.filter(a => !a.startsWith('environmental_'));
  const envAllergens = allergens.filter(a => a.startsWith('environmental_')).map(a => a.replace('environmental_', ''));

  const bcsDescriptions = {
    1: 'Sottopeso grave - Costole, spine e ossa pelviche facilmente visibili',
    2: 'Sottopeso - Costole facilmente palpabili, vita ben definita',
    3: 'Ideale - Costole palpabili, vita visibile, addome retratto',
    4: 'Sovrappeso - Costole difficili da palpare, vita poco definita',
    5: 'Obeso - Costole non palpabili, accumulo di grasso su collo e addome',
  };

  const conditionDescriptions = {
    dermatitis: 'Problemi della pelle, irritazioni, pruriti frequenti',
    joint_issues: 'Artrite, displasia, problemi di mobilità',
    kidney_disease: 'Problemi renali, insufficienza renale',
    gastrointestinal: 'Problemi digestivi, diarrea, vomito frequenti',
    diabetes: 'Diabete mellito',
    heart_condition: 'Malattie cardiache, soffi al cuore',
    allergies: 'Allergie alimentari o ambientali note',
    anxiety: 'Ansia da separazione, stress, fobie',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Salute di {currentDog.name || 'il tuo cane'}
        </h2>
        <p className="text-gray-600">
          Queste informazioni ci aiuteranno a suggerire i prodotti più adatti e a personalizzare i consigli nutrizionali.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Body Condition Score */}
        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel>Condizione corporea (BCS) *</FormLabel>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Valuta la forma fisica del tuo cane. Se non sei sicuro, consulta il tuo veterinario.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {[1, 2, 3, 4, 5].map(score => (
                    <label
                      key={score}
                      className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.bcs === score
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bcs"
                        value={score}
                        checked={formData.bcs === score}
                        onChange={() => handleBCSChange(score)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">BCS {score}</div>
                        <div className="text-sm text-gray-600">
                          {bcsDescriptions[score as keyof typeof bcsDescriptions]}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* Health Conditions */}
        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel>Condizioni di salute</FormLabel>
              <p className="text-sm text-gray-600 mb-4">
                Seleziona le condizioni di salute che riguardano il tuo cane (lascia vuoto se non applicabile).
              </p>
              <div className="space-y-3">
                {healthConditions.filter(c => c !== 'none').map(condition => (
                  <FormCheckbox
                    key={condition}
                    label={condition.charAt(0).toUpperCase() + condition.slice(1).replace('_', ' ')}
                    checked={formData.health.conditions.includes(condition)}
                    onChange={(e) => handleConditionChange(condition, e.target.checked)}
                    hint={conditionDescriptions[condition as keyof typeof conditionDescriptions]}
                  />
                ))}
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* Food Allergies */}
        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel>Allergie alimentari</FormLabel>
              <p className="text-sm text-gray-600 mb-4">
                Seleziona gli alimenti che causano reazioni allergiche al tuo cane.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {foodAllergens.map(allergen => (
                  <FormCheckbox
                    key={allergen}
                    label={allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                    checked={formData.allergies.food.includes(allergen)}
                    onChange={(e) => handleAllergyChange('food', allergen, e.target.checked)}
                  />
                ))}
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* Environmental Allergies */}
        <Card>
          <CardContent className="pt-6">
            <FormField>
              <FormLabel>Allergie ambientali</FormLabel>
              <p className="text-sm text-gray-600 mb-4">
                Seleziona gli elementi ambientali che causano reazioni allergiche.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {envAllergens.map(allergen => (
                  <FormCheckbox
                    key={allergen}
                    label={allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                    checked={formData.allergies.environmental.includes(allergen)}
                    onChange={(e) => handleAllergyChange('environmental', allergen, e.target.checked)}
                  />
                ))}
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <FormField>
          <FormLabel htmlFor="healthNotes">Note aggiuntive</FormLabel>
          <FormTextarea
            id="healthNotes"
            value={formData.health.notes}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              health: { ...prev.health, notes: e.target.value },
            }))}
            placeholder="Descrivi altre condizioni di salute, farmaci in corso, o informazioni rilevanti per il veterinario..."
            rows={4}
            hint="Queste informazioni rimarranno private e saranno condivise solo con il tuo veterinario"
          />
        </FormField>

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