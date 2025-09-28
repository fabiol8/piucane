'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@piucane/ui';

const userInfoSchema = z.object({
  name: z.string().min(2, 'Nome richiesto'),
  email: z.string().email('Email non valida'),
  phone: z.string().min(10, 'Numero di telefono richiesto'),
  address: z.object({
    street: z.string().min(5, 'Indirizzo richiesto'),
    city: z.string().min(2, 'Città richiesta'),
    zipCode: z.string().min(5, 'CAP richiesto'),
    country: z.string().default('Italia')
  })
});

type UserInfoData = z.infer<typeof userInfoSchema>;

interface UserInfoStepProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  isFirst: boolean;
}

export default function UserInfoStep({ data, onNext, onBack }: UserInfoStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UserInfoData>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: data.user || {}
  });

  const onSubmit = async (formData: UserInfoData) => {
    setIsLoading(true);

    // Simulate validation/verification
    await new Promise(resolve => setTimeout(resolve, 500));

    onNext({ user: formData });
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          I tuoi dati
        </h2>
        <p className="text-gray-600">
          Abbiamo bisogno di alcune informazioni per personalizzare l'esperienza
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Nome completo"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Mario Rossi"
          />

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="mario@example.com"
          />
        </div>

        <Input
          label="Telefono"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="+39 123 456 7890"
          helpText="Per comunicazioni urgenti e consegne"
        />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Indirizzo di consegna</h3>

          <Input
            label="Indirizzo"
            {...register('address.street')}
            error={errors.address?.street?.message}
            placeholder="Via Roma 123"
          />

          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Città"
              {...register('address.city')}
              error={errors.address?.city?.message}
              placeholder="Milano"
            />

            <Input
              label="CAP"
              {...register('address.zipCode')}
              error={errors.address?.zipCode?.message}
              placeholder="20121"
            />
          </div>

          <Input
            label="Paese"
            {...register('address.country')}
            error={errors.address?.country?.message}
            defaultValue="Italia"
            disabled
          />
        </div>

        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            data-cta-id="onboarding.user_info.back.click"
          >
            Indietro
          </Button>

          <Button
            type="submit"
            loading={isLoading}
            data-cta-id="onboarding.user_info.continue.click"
          >
            Continua
          </Button>
        </div>
      </form>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <span className="text-blue-600 mr-2">ℹ️</span>
          <div className="text-sm text-blue-800">
            <strong>Privacy:</strong> I tuoi dati sono protetti e utilizzati solo per migliorare
            l'esperienza del tuo cane. Leggi la nostra{' '}
            <a href="/privacy" className="underline">privacy policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}