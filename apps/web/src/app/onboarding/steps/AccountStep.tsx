/**
 * Onboarding Step 1: Account Information
 */

'use client';

import React, { useState } from 'react';
import { Form, FormField, FormLabel, FormInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { userProfileSchema } from '@/lib/validations';
import { trackEvent } from '@/analytics/ga4';

interface AccountStepProps {
  data: any;
  onNext: (data: any) => void;
  onPrev?: () => void;
  loading?: boolean;
}

export const AccountStep: React.FC<AccountStepProps> = ({
  data,
  onNext,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    firstName: data.user?.firstName || '',
    lastName: data.user?.lastName || '',
    email: data.user?.email || '',
    phone: data.user?.phone || '',
    locale: data.user?.locale || 'it-IT',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      userProfileSchema.parse(formData);
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
    if (!validateForm()) {
      trackEvent('form_error', {
        form_name: 'account_step',
        error_fields: Object.keys(errors),
      });
      return;
    }

    // Track successful form submission
    trackEvent('form_submit', {
      form_name: 'account_step',
      completion_time: Date.now(),
    });

    onNext({
      user: {
        ...data.user,
        ...formData,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Iniziamo con le tue informazioni
        </h2>
        <p className="text-gray-600">
          Questi dati ci aiuteranno a personalizzare la tua esperienza e a contattarti quando necessario.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField>
            <FormLabel htmlFor="firstName" required>
              Nome
            </FormLabel>
            <FormInput
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              error={errors.firstName}
              placeholder="Mario"
              autoComplete="given-name"
              required
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="lastName" required>
              Cognome
            </FormLabel>
            <FormInput
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              error={errors.lastName}
              placeholder="Rossi"
              autoComplete="family-name"
              required
            />
          </FormField>
        </div>

        <FormField>
          <FormLabel htmlFor="email" required>
            Email
          </FormLabel>
          <FormInput
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={errors.email}
            placeholder="mario.rossi@example.com"
            autoComplete="email"
            hint="Useremo questa email per inviarti aggiornamenti importanti"
            required
          />
        </FormField>

        <FormField>
          <FormLabel htmlFor="phone">
            Telefono
          </FormLabel>
          <FormInput
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            error={errors.phone}
            placeholder="+39 123 456 7890"
            autoComplete="tel"
            hint="Opzionale - Per notifiche urgenti via SMS"
          />
        </FormField>

        <div className="flex justify-end pt-6">
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

      <div className="text-xs text-gray-500">
        <p>
          Continuando, accetti i nostri{' '}
          <a href="/terms" className="text-primary hover:underline" target="_blank">
            Termini di Servizio
          </a>
          {' '}e l'{' '}
          <a href="/privacy" className="text-primary hover:underline" target="_blank">
            Informativa sulla Privacy
          </a>
          .
        </p>
      </div>
    </div>
  );
};