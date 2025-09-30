/**
 * Onboarding Step 5: Veterinarian Information (Optional)
 */

'use client';

import React, { useState } from 'react';
import { Form, FormField, FormLabel, FormInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { vetSchema } from '@/lib/validations';
import { vetsApi } from '@/lib/api-client';
import { trackEvent } from '@/analytics/ga4';

interface VetStepProps {
  data: any;
  onNext: (data: any) => void;
  onPrev: () => void;
  loading?: boolean;
}

export const VetStep: React.FC<VetStepProps> = ({
  data,
  onNext,
  onPrev,
  loading = false,
}) => {
  const currentDog = data.dogs?.[data.currentDogIndex] || {};
  const [formData, setFormData] = useState({
    vet: {
      name: currentDog.vetRef?.name || '',
      clinicName: currentDog.vetRef?.clinicName || '',
      phone: currentDog.vetRef?.phone || '',
      email: currentDog.vetRef?.email || '',
      address: currentDog.vetRef?.address || '',
      city: currentDog.vetRef?.city || '',
    },
    skipVet: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      vet: { ...prev.vet, [field]: value },
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-search for vets when typing clinic name
    if (field === 'clinicName' && value.length > 2) {
      searchVets(value);
    }
  };

  const searchVets = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await vetsApi.search(query);
      if (response.success) {
        setSearchResults(response.data || []);
      }
    } catch (error) {
      console.error('Error searching vets:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectVet = (vet: any) => {
    setFormData(prev => ({
      ...prev,
      vet: {
        name: vet.name,
        clinicName: vet.clinicName,
        phone: vet.phone,
        email: vet.email || '',
        address: vet.address,
        city: vet.city,
      },
    }));
    setSearchResults([]);
  };

  const validateForm = () => {
    if (formData.skipVet) return true;

    try {
      vetSchema.parse(formData.vet);
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

  const handleSubmit = () => {
    if (!formData.skipVet && !validateForm()) {
      trackEvent('form_error', {
        form_name: 'vet_step',
        error_fields: Object.keys(errors),
      });
      return;
    }

    trackEvent('vet_info_completed', {
      dog_id: `temp_${data.currentDogIndex}`,
      has_vet: !formData.skipVet,
      vet_source: searchResults.length > 0 ? 'search' : 'manual',
    });

    const updatedDogs = [...data.dogs];
    updatedDogs[data.currentDogIndex] = {
      ...currentDog,
      vetRef: formData.skipVet ? null : formData.vet,
    };

    onNext({
      dogs: updatedDogs,
    });
  };

  const handleSkip = () => {
    setFormData(prev => ({ ...prev, skipVet: true }));
    trackEvent('vet_step_skipped', {
      dog_id: `temp_${data.currentDogIndex}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Veterinario di {currentDog.name || 'il tuo cane'}
        </h2>
        <p className="text-gray-600">
          Aggiungere il veterinario ci permette di sincronizzare i dati sanitari e inviare promemoria per visite e vaccini.
          <span className="text-sm text-gray-500 block mt-1">
            Questo passaggio è opzionale - puoi aggiungerlo anche in seguito.
          </span>
        </p>
      </div>

      {!formData.skipVet ? (
        <Form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField>
                    <FormLabel htmlFor="vetName" required>
                      Nome del veterinario
                    </FormLabel>
                    <FormInput
                      id="vetName"
                      type="text"
                      value={formData.vet.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={errors.name}
                      placeholder="Dr. Mario Rossi"
                      required
                    />
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="clinicName" required>
                      Nome della clinica
                    </FormLabel>
                    <div className="relative">
                      <FormInput
                        id="clinicName"
                        type="text"
                        value={formData.vet.clinicName}
                        onChange={(e) => handleInputChange('clinicName', e.target.value)}
                        error={errors.clinicName}
                        placeholder="Clinica Veterinaria Roma"
                        hint="Inizia a digitare per cercare cliniche esistenti"
                        required
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                          {searchResults.map((vet, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              onClick={() => selectVet(vet)}
                            >
                              <div className="font-medium">{vet.clinicName}</div>
                              <div className="text-sm text-gray-600">
                                Dr. {vet.name} - {vet.city}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField>
                    <FormLabel htmlFor="vetPhone" required>
                      Telefono
                    </FormLabel>
                    <FormInput
                      id="vetPhone"
                      type="tel"
                      value={formData.vet.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      error={errors.phone}
                      placeholder="+39 06 123 4567"
                      required
                    />
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="vetEmail">
                      Email
                    </FormLabel>
                    <FormInput
                      id="vetEmail"
                      type="email"
                      value={formData.vet.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      error={errors.email}
                      placeholder="info@clinica.it"
                      hint="Opzionale"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField>
                    <FormLabel htmlFor="vetAddress" required>
                      Indirizzo
                    </FormLabel>
                    <FormInput
                      id="vetAddress"
                      type="text"
                      value={formData.vet.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      error={errors.address}
                      placeholder="Via Roma 123"
                      required
                    />
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="vetCity" required>
                      Città
                    </FormLabel>
                    <FormInput
                      id="vetCity"
                      type="text"
                      value={formData.vet.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      error={errors.city}
                      placeholder="Roma"
                      required
                    />
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              ctaId="onboarding.skip_vet.button.click"
            >
              Salta questo passaggio
            </Button>
          </div>
        </Form>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">🏥</div>
              <h3 className="text-lg font-medium text-gray-900">
                Nessun problema!
              </h3>
              <p className="text-gray-600">
                Potrai aggiungere il tuo veterinario in qualsiasi momento dal profilo del cane.
                Questo ti permetterà di ricevere promemoria per visite e vaccini.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData(prev => ({ ...prev, skipVet: false }))}
              >
                Voglio aggiungere il veterinario
              </Button>
            </div>
          </CardContent>
        </Card>
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
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          onClick={handleSubmit}
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
    </div>
  );
};