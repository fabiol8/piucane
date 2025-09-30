/**
 * Onboarding flow - 7 steps with progressive saving and analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Stepper, StepData, StepProgress } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trackEvent } from '@/analytics/ga4';
import { onboardingApi } from '@/lib/api-client';
import { ConsentManager } from '@/components/ui/consent-manager';

// Import step components
import { AccountStep } from './steps/AccountStep';
import { DogBasicsStep } from './steps/DogBasicsStep';
import { HealthStep } from './steps/HealthStep';
import { HabitsStep } from './steps/HabitsStep';
import { VetStep } from './steps/VetStep';
import { ConsentStep } from './steps/ConsentStep';
import { CompletionStep } from './steps/CompletionStep';

interface OnboardingData {
  user: any;
  dogs: any[];
  currentDogIndex: number;
  completedSteps: number[];
}

const steps: StepData[] = [
  {
    id: 'account',
    title: 'Il tuo account',
    description: 'Informazioni personali',
    status: 'current',
  },
  {
    id: 'dog-basics',
    title: 'Il tuo cane',
    description: 'Informazioni di base',
    status: 'pending',
  },
  {
    id: 'health',
    title: 'Salute',
    description: 'Condizioni e allergie',
    status: 'pending',
  },
  {
    id: 'habits',
    title: 'Abitudini',
    description: 'Alimentazione e attività',
    status: 'pending',
  },
  {
    id: 'vet',
    title: 'Veterinario',
    description: 'Il tuo veterinario di fiducia',
    status: 'pending',
    optional: true,
  },
  {
    id: 'consent',
    title: 'Consensi',
    description: 'Privacy e notifiche',
    status: 'pending',
  },
  {
    id: 'completion',
    title: 'Completamento',
    description: 'Configurazione finale',
    status: 'pending',
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    user: {},
    dogs: [{}],
    currentDogIndex: 0,
    completedSteps: [],
  });
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());

  // Initialize onboarding
  useEffect(() => {
    const initOnboarding = async () => {
      try {
        // Check for existing draft
        const draftResponse = await onboardingApi.getDraft();
        if (draftResponse.success && draftResponse.data) {
          setData(draftResponse.data);
          setCurrentStep(draftResponse.data.currentStep || 0);
        } else {
          // Start new onboarding
          await onboardingApi.start();
        }

        // Track onboarding start
        trackEvent('onboarding_start', {
          step: currentStep + 1,
          total_steps: steps.length,
        });
      } catch (error) {
        console.error('Error initializing onboarding:', error);
      }
    };

    initOnboarding();
  }, []);

  // Update step status based on current step
  const updateStepStatus = (stepIndex: number): StepData[] => {
    return steps.map((step, index) => ({
      ...step,
      status: index < stepIndex ? 'completed' :
             index === stepIndex ? 'current' : 'pending'
    }));
  };

  // Save draft progress
  const saveDraft = async (stepData: any, stepIndex: number) => {
    try {
      await onboardingApi.saveStep(stepIndex, {
        ...data,
        ...stepData,
        currentStep: stepIndex,
        lastSaved: Date.now(),
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Handle step completion
  const handleStepComplete = async (stepData: any) => {
    const completionTime = Date.now() - stepStartTime;
    const newData = { ...data, ...stepData };

    // Mark step as completed
    const newCompletedSteps = [...data.completedSteps];
    if (!newCompletedSteps.includes(currentStep)) {
      newCompletedSteps.push(currentStep);
    }

    newData.completedSteps = newCompletedSteps;
    setData(newData);

    // Save progress
    await saveDraft(newData, currentStep);

    // Track step completion
    trackEvent('onboarding_step_next', {
      step: currentStep + 1,
      step_name: steps[currentStep].id,
      completion_time: completionTime,
    }, 'onboarding.next.button.click');

    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setStepStartTime(Date.now());
    }
  };

  // Handle going back
  const handlePrevStep = () => {
    if (currentStep > 0) {
      trackEvent('onboarding_step_back', {
        step: currentStep + 1,
        step_name: steps[currentStep].id,
      }, 'onboarding.prev.button.click');

      setCurrentStep(currentStep - 1);
      setStepStartTime(Date.now());
    }
  };

  // Handle onboarding completion
  const handleComplete = async (finalData: any) => {
    setLoading(true);
    try {
      const completionTime = Date.now() - startTime;
      const completeData = { ...data, ...finalData };

      // Complete onboarding
      const response = await onboardingApi.complete(completeData);

      if (response.success) {
        // Track completion
        trackEvent('onboarding_complete', {
          dogs_count: completeData.dogs.length,
          completion_time: completionTime,
          total_steps: steps.length,
        }, 'onboarding.finish.button.click');

        // Redirect to dashboard or next step
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    const stepProps = {
      data: data,
      onNext: handleStepComplete,
      onPrev: handlePrevStep,
      loading: loading,
    };

    switch (currentStep) {
      case 0:
        return <AccountStep {...stepProps} />;
      case 1:
        return <DogBasicsStep {...stepProps} />;
      case 2:
        return <HealthStep {...stepProps} />;
      case 3:
        return <HabitsStep {...stepProps} />;
      case 4:
        return <VetStep {...stepProps} />;
      case 5:
        return <ConsentStep {...stepProps} />;
      case 6:
        return <CompletionStep {...stepProps} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Benvenuto in PiùCane! 🐕
              </h1>
              <p className="text-gray-600">
                Configuriamo insieme il profilo perfetto per te e il tuo cane
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Tempo stimato: &lt; 5 minuti
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <StepProgress
            currentStep={currentStep}
            totalSteps={steps.length}
          />
        </div>

        <div className="mb-8">
          <Stepper
            steps={updateStepStatus(currentStep)}
            currentStep={currentStep}
            orientation="horizontal"
            showNumbers={false}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-12">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{steps[currentStep]?.title}</span>
              <span className="text-sm font-normal text-gray-500">
                Passo {currentStep + 1} di {steps.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Hai bisogno di aiuto?{' '}
            <a
              href="/support"
              className="text-primary hover:underline"
              onClick={() => trackEvent('navigation_click', {
                link_text: 'support',
                link_url: '/support',
                section: 'onboarding_help',
              })}
            >
              Contatta il supporto
            </a>
          </p>
        </div>
      </main>

      {/* Consent Manager */}
      {currentStep !== 5 && <ConsentManager showBanner={false} />}
    </div>
  );
}