'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@piucane/ui';
import DogBreedSelector from '../components/DogBreedSelector';
import PhotoUpload from '../components/PhotoUpload';

const dogProfileSchema = z.object({
  name: z.string().min(1, 'Nome del cane richiesto'),
  breed: z.string().min(1, 'Razza richiesta'),
  birthDate: z.string().min(1, 'Data di nascita richiesta'),
  gender: z.enum(['male', 'female'], { required_error: 'Sesso richiesto' }),
  weight: z.number().min(0.5, 'Peso deve essere maggiore di 0.5 kg').max(100, 'Peso troppo alto'),
  activityLevel: z.enum(['low', 'medium', 'high'], { required_error: 'Livello di attività richiesto' }),
  isNeutered: z.boolean().default(false),
  photos: z.array(z.string()).optional()
});

type DogProfileData = z.infer<typeof dogProfileSchema>;

interface DogProfileStepProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export default function DogProfileStep({ data, onNext, onBack }: DogProfileStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState<string>(data.dog?.breed || '');
  const [photos, setPhotos] = useState<string[]>(data.dog?.photos || []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<DogProfileData>({
    resolver: zodResolver(dogProfileSchema),
    defaultValues: data.dog || {}
  });

  const watchWeight = watch('weight');
  const watchBirthDate = watch('birthDate');

  useEffect(() => {
    setValue('breed', selectedBreed);
  }, [selectedBreed, setValue]);

  useEffect(() => {
    setValue('photos', photos);
  }, [photos, setValue]);

  // Calculate size based on weight
  const calculateSize = (weight: number): string => {
    if (weight < 10) return 'Piccola';
    if (weight < 25) return 'Media';
    if (weight < 45) return 'Grande';
    return 'Gigante';
  };

  // Calculate age
  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();

    if (months < 12) return `${months} mesi`;
    const years = Math.floor(months / 12);
    return `${years} anni`;
  };

  const onSubmit = async (formData: DogProfileData) => {
    setIsLoading(true);

    // Calculate derived fields
    const size = calculateSize(formData.weight);
    const age = calculateAge(formData.birthDate);

    const enrichedData = {
      ...formData,
      size: size.toLowerCase(),
      age,
      photos
    };

    await new Promise(resolve => setTimeout(resolve, 500));

    onNext({ dog: enrichedData });
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Profilo del tuo cane
        </h2>
        <p className="text-gray-600">
          Raccontaci del tuo amico a quattro zampe per personalizzare tutto
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo Upload */}
        <div className="text-center">
          <PhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={3}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Nome del cane"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Buddy"
          />

          <DogBreedSelector
            value={selectedBreed}
            onChange={setSelectedBreed}
            error={errors.breed?.message}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Data di nascita"
            type="date"
            {...register('birthDate')}
            error={errors.birthDate?.message}
            max={new Date().toISOString().split('T')[0]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sesso
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  {...register('gender')}
                  value="male"
                  className="mr-2"
                />
                <span>🐕 Maschio</span>
              </label>
              <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  {...register('gender')}
                  value="female"
                  className="mr-2"
                />
                <span>🐕‍🦺 Femmina</span>
              </label>
            </div>
            {errors.gender && (
              <p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Peso (kg)"
              type="number"
              step="0.1"
              min="0.5"
              max="100"
              {...register('weight', { valueAsNumber: true })}
              error={errors.weight?.message}
              placeholder="15.5"
            />
            {watchWeight && (
              <p className="text-sm text-gray-600 mt-1">
                Taglia: {calculateSize(watchWeight)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Livello di attività
            </label>
            <select
              {...register('activityLevel')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary"
            >
              <option value="">Seleziona...</option>
              <option value="low">🛋️ Basso - Principalmente indoor, passeggiate brevi</option>
              <option value="medium">🚶 Medio - Passeggiate regolari, gioco moderato</option>
              <option value="high">🏃 Alto - Corsa, sport, molto attivo</option>
            </select>
            {errors.activityLevel && (
              <p className="text-sm text-red-600 mt-1">{errors.activityLevel.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('isNeutered')}
            className="mr-2 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <label className="text-sm text-gray-700">
            È sterilizzato/castrato
          </label>
        </div>

        {watchBirthDate && (
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-orange-600 mr-2">🎂</span>
              <div className="text-sm text-orange-800">
                <strong>Età:</strong> {calculateAge(watchBirthDate)}
                {calculateAge(watchBirthDate).includes('mesi') && calculateAge(watchBirthDate) !== '0 mesi' && (
                  <span className="ml-2">- Ancora un cucciolo! 🐶</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            data-cta-id="onboarding.dog_profile.back.click"
          >
            Indietro
          </Button>

          <Button
            type="submit"
            loading={isLoading}
            data-cta-id="onboarding.dog_profile.continue.click"
          >
            Continua
          </Button>
        </div>
      </form>
    </div>
  );
}