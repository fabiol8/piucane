/**
 * Onboarding Step 2: Dog Basic Information
 */

'use client';

import React, { useState } from 'react';
import { Form, FormField, FormLabel, FormInput, FormSelect, FormRadioGroup } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { dogProfileSchema, dogBreeds } from '@/lib/validations';
import { trackEvent } from '@/analytics/ga4';

interface DogBasicsStepProps {
  data: any;
  onNext: (data: any) => void;
  onPrev: () => void;
  loading?: boolean;
}

export const DogBasicsStep: React.FC<DogBasicsStepProps> = ({
  data,
  onNext,
  onPrev,
  loading = false,
}) => {
  const currentDog = data.dogs?.[data.currentDogIndex] || {};
  const [formData, setFormData] = useState({
    name: currentDog.name || '',
    breed: currentDog.breed || '',
    isMixed: currentDog.isMixed || false,
    birthDate: currentDog.birthDate ? new Date(currentDog.birthDate).toISOString().split('T')[0] : '',
    sex: currentDog.sex || '',
    neutered: currentDog.neutered || false,
    weightKg: currentDog.weightKg || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      // Convert form data for validation
      const validationData = {
        ...formData,
        birthDate: new Date(formData.birthDate),
        weightKg: parseFloat(formData.weightKg),
        neutered: formData.neutered === 'true' || formData.neutered === true,
        isMixed: formData.breed === 'Meticcio',
      };

      dogProfileSchema.pick({
        name: true,
        breed: true,
        isMixed: true,
        birthDate: true,
        sex: true,
        neutered: true,
        weightKg: true,
      }).parse(validationData);

      setErrors({});
      return true;
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        if (err.path?.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

    if (months < 12) {
      return `${months} mesi`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years} anni e ${remainingMonths} mesi` : `${years} anni`;
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      trackEvent('form_error', {
        form_name: 'dog_basics_step',
        error_fields: Object.keys(errors),
      });
      return;
    }

    const dogData = {
      ...formData,
      birthDate: new Date(formData.birthDate),
      weightKg: parseFloat(formData.weightKg),
      neutered: formData.neutered === 'true' || formData.neutered === true,
      isMixed: formData.breed === 'Meticcio',
    };

    // Track dog creation
    trackEvent('dog_created', {
      dog_id: `temp_${Date.now()}`,
      breed: dogData.breed,
      age_group: calculateAge(formData.birthDate).includes('mesi') ? 'puppy' : 'adult',
      weight_category: dogData.weightKg < 10 ? 'small' : dogData.weightKg < 25 ? 'medium' : 'large',
    });

    const updatedDogs = [...data.dogs];
    updatedDogs[data.currentDogIndex] = {
      ...currentDog,
      ...dogData,
    };

    onNext({
      dogs: updatedDogs,
    });
  };

  const breedOptions = dogBreeds.map(breed => ({
    value: breed,
    label: breed,
  }));

  const sexOptions = [
    { value: 'male', label: 'Maschio' },
    { value: 'female', label: 'Femmina' },
  ];

  const neuteredOptions = [
    { value: 'true', label: 'Sì, è sterilizzato/castrato' },
    { value: 'false', label: 'No, non è sterilizzato/castrato' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Parlaci del tuo cane
        </h2>
        <p className="text-gray-600">
          Queste informazioni ci aiuteranno a personalizzare i consigli e i prodotti per il tuo amico a quattro zampe.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        <FormField>
          <FormLabel htmlFor="name" required>
            Nome del cane
          </FormLabel>
          <FormInput
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            placeholder="Rex"
            hint="Come chiami il tuo cane?"
            required
          />
        </FormField>

        <FormField>
          <FormLabel htmlFor="breed" required>
            Razza
          </FormLabel>
          <FormSelect
            id="breed"
            value={formData.breed}
            onChange={(e) => handleInputChange('breed', e.target.value)}
            options={breedOptions}
            error={errors.breed}
            placeholder="Seleziona la razza"
            hint="Non trovi la razza? Seleziona 'Meticcio'"
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField>
            <FormLabel htmlFor="birthDate" required>
              Data di nascita
            </FormLabel>
            <FormInput
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              error={errors.birthDate}
              max={new Date().toISOString().split('T')[0]}
              hint={formData.birthDate ? `Età: ${calculateAge(formData.birthDate)}` : 'Se non sai la data esatta, usa una stima'}
              required
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="weightKg" required>
              Peso (kg)
            </FormLabel>
            <FormInput
              id="weightKg"
              type="number"
              step="0.1"
              min="0.5"
              max="120"
              value={formData.weightKg}
              onChange={(e) => handleInputChange('weightKg', e.target.value)}
              error={errors.weightKg}
              placeholder="15.5"
              hint="Peso attuale in chilogrammi"
              required
            />
          </FormField>
        </div>

        <FormField>
          <FormLabel required>Sesso</FormLabel>
          <FormRadioGroup
            name="sex"
            options={sexOptions}
            value={formData.sex}
            onChange={(value) => handleInputChange('sex', value)}
            error={errors.sex}
          />
        </FormField>

        <FormField>
          <FormLabel required>Sterilizzazione</FormLabel>
          <FormRadioGroup
            name="neutered"
            options={neuteredOptions}
            value={formData.neutered.toString()}
            onChange={(value) => handleInputChange('neutered', value)}
            error={errors.neutered}
            hint="La sterilizzazione influisce sul fabbisogno nutrizionale"
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