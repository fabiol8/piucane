/**
 * Onboarding Step 6: Consent and Notification Preferences
 */

'use client';

import React, { useState } from 'react';
import { Form, FormField, FormLabel, FormCheckbox } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentManager } from '@/components/ui/consent-manager';
import { notificationPrefsSchema, consentSchema } from '@/lib/validations';
import { trackEvent } from '@/analytics/ga4';

interface ConsentStepProps {
  data: any;
  onNext: (data: any) => void;
  onPrev: () => void;
  loading?: boolean;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({
  data,
  onNext,
  onPrev,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    consent: {
      marketing: data.user?.consent?.marketing || false,
      transactional: true, // Always true for app functionality
      profiling: data.user?.consent?.profiling || false,
      aiTraining: data.user?.consent?.aiTraining || false,
    },
    notificationPrefs: {
      channels: {
        email: data.user?.notificationPrefs?.channels?.email || true,
        push: data.user?.notificationPrefs?.channels?.push || true,
        whatsapp: data.user?.notificationPrefs?.channels?.whatsapp || false,
        sms: data.user?.notificationPrefs?.channels?.sms || false,
      },
      categories: {
        orders: data.user?.notificationPrefs?.categories?.orders || true,
        health: data.user?.notificationPrefs?.categories?.health || true,
        missions: data.user?.notificationPrefs?.categories?.missions || false,
        promos: data.user?.notificationPrefs?.categories?.promos || false,
      },
      quietHours: {
        start: data.user?.notificationPrefs?.quietHours?.start || '22:00',
        end: data.user?.notificationPrefs?.quietHours?.end || '08:00',
        timezone: 'Europe/Rome',
      },
    },
  });

  const handleConsentChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      consent: { ...prev.consent, [field]: value },
    }));
  };

  const handleChannelChange = (channel: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs,
        channels: { ...prev.notificationPrefs.channels, [channel]: value },
      },
    }));
  };

  const handleCategoryChange = (category: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs,
        categories: { ...prev.notificationPrefs.categories, [category]: value },
      },
    }));
  };

  const handleQuietHoursChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs,
        quietHours: { ...prev.notificationPrefs.quietHours, [field]: value },
      },
    }));
  };

  const handleSubmit = () => {
    const consentData = {
      ...formData.consent,
      policyVersion: '1.0',
      timestamp: Date.now(),
    };

    trackEvent('consent_preferences_set', {
      marketing_consent: formData.consent.marketing,
      profiling_consent: formData.consent.profiling,
      ai_training_consent: formData.consent.aiTraining,
      notification_channels: Object.entries(formData.notificationPrefs.channels)
        .filter(([_, enabled]) => enabled)
        .map(([channel]) => channel),
    });

    onNext({
      user: {
        ...data.user,
        consent: consentData,
        notificationPrefs: formData.notificationPrefs,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Consensi e Notifiche
        </h2>
        <p className="text-gray-600">
          Personalizza come ricevere le comunicazioni e come utilizziamo i tuoi dati per offrirti la migliore esperienza.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Privacy Consents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Privacy e Consensi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <FormCheckbox
                  label="Comunicazioni di servizio"
                  checked={true}
                  disabled={true}
                  hint="Necessarie per il funzionamento dell'app (conferme ordini, aggiornamenti account, supporto)"
                />
              </div>

              <FormCheckbox
                label="Marketing e offerte promozionali"
                checked={formData.consent.marketing}
                onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                hint="Ricevi offerte personalizzate, sconti esclusivi e novità sui prodotti"
              />

              <FormCheckbox
                label="Profilazione per contenuti personalizzati"
                checked={formData.consent.profiling}
                onChange={(e) => handleConsentChange('profiling', e.target.checked)}
                hint="Analizza le tue preferenze per suggerimenti più accurati su prodotti e contenuti"
              />

              <FormCheckbox
                label="Miglioramento dell'intelligenza artificiale"
                checked={formData.consent.aiTraining}
                onChange={(e) => handleConsentChange('aiTraining', e.target.checked)}
                hint="Le tue interazioni anonime aiutano a migliorare i nostri consigli veterinari AI"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Canali di notifica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormCheckbox
                label="📧 Email"
                checked={formData.notificationPrefs.channels.email}
                onChange={(e) => handleChannelChange('email', e.target.checked)}
                hint="Per aggiornamenti dettagliati e documenti"
              />

              <FormCheckbox
                label="🔔 Notifiche push"
                checked={formData.notificationPrefs.channels.push}
                onChange={(e) => handleChannelChange('push', e.target.checked)}
                hint="Notifiche immediate sull'app"
              />

              <FormCheckbox
                label="💬 WhatsApp"
                checked={formData.notificationPrefs.channels.whatsapp}
                onChange={(e) => handleChannelChange('whatsapp', e.target.checked)}
                hint="Promemoria rapidi e aggiornamenti urgenti"
              />

              <FormCheckbox
                label="📱 SMS"
                checked={formData.notificationPrefs.channels.sms}
                onChange={(e) => handleChannelChange('sms', e.target.checked)}
                hint="Solo per comunicazioni critiche"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipi di notifiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <FormCheckbox
                  label="Ordini e spedizioni"
                  checked={true}
                  disabled={true}
                  hint="Aggiornamenti essenziali su ordini, spedizioni e consegne"
                />
              </div>

              <FormCheckbox
                label="Salute e promemoria veterinari"
                checked={formData.notificationPrefs.categories.health}
                onChange={(e) => handleCategoryChange('health', e.target.checked)}
                hint="Promemoria per vaccini, visite e controlli sanitari"
              />

              <FormCheckbox
                label="Missioni e gamification"
                checked={formData.notificationPrefs.categories.missions}
                onChange={(e) => handleCategoryChange('missions', e.target.checked)}
                hint="Nuove missioni, badge sbloccati e ricompense"
              />

              <FormCheckbox
                label="Offerte e promozioni"
                checked={formData.notificationPrefs.categories.promos}
                onChange={(e) => handleCategoryChange('promos', e.target.checked)}
                hint="Sconti, codici promozionali e offerte speciali"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orari di silenzio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Durante questi orari non riceverai notifiche push (eccetto emergenze).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="quietStart">Inizio silenzio</FormLabel>
                  <input
                    id="quietStart"
                    type="time"
                    value={formData.notificationPrefs.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="quietEnd">Fine silenzio</FormLabel>
                  <input
                    id="quietEnd"
                    type="time"
                    value={formData.notificationPrefs.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg">
          <p>
            🔒 <strong>La tua privacy è importante:</strong> Puoi modificare questi consensi in qualsiasi momento
            dalle impostazioni del tuo account. Per maggiori dettagli, consulta la nostra{' '}
            <a href="/privacy" className="text-primary hover:underline" target="_blank">
              Informativa sulla Privacy
            </a>
            {' '}e la{' '}
            <a href="/cookie-policy" className="text-primary hover:underline" target="_blank">
              Cookie Policy
            </a>
            .
          </p>
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