'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/analytics/ga4';
import WelcomeStep from './steps/WelcomeStep';
import UserInfoStep from './steps/UserInfoStep';
import DogProfileStep from './steps/DogProfileStep';
import HealthInfoStep from './steps/HealthInfoStep';
import GoalsStep from './steps/GoalsStep';
import VetInfoStep from './steps/VetInfoStep';
import CompletionStep from './steps/CompletionStep';
import ProgressBar from './ProgressBar';

interface OnboardingData {
  user: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      zipCode: string;
      country: string;
    };
  };
  dog: {
    name: string;
    breed: string;
    birthDate: string;
    gender: 'male' | 'female';
    weight: number;
    activityLevel: 'low' | 'medium' | 'high';
    size: 'small' | 'medium' | 'large' | 'giant';
    isNeutered: boolean;
  };
  health: {
    allergies: string[];
    conditions: string[];
    medications: string[];
    lastVetVisit: string;
    vaccinations: {
      name: string;
      date: string;
      nextDue: string;
    }[];
  };
  goals: {
    primary: string[];
    weightGoal: 'maintain' | 'lose' | 'gain';
    specialNeeds: string[];
  };
  veterinarian: {
    name: string;
    clinic: string;
    phone: string;
    email: string;
    address: string;
  };
}

const STEPS = [
  { id: 'welcome', title: 'Benvenuto', component: WelcomeStep },
  { id: 'user-info', title: 'I tuoi dati', component: UserInfoStep },
  { id: 'dog-profile', title: 'Profilo del cane', component: DogProfileStep },
  { id: 'health-info', title: 'Informazioni salute', component: HealthInfoStep },
  { id: 'goals', title: 'Obiettivi', component: GoalsStep },
  { id: 'vet-info', title: 'Veterinario', component: VetInfoStep },
  { id: 'completion', title: 'Completamento', component: CompletionStep }
];

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Track onboarding start
    trackEvent('onboarding_start', { step: STEPS[0].id });
  }, []);

  const handleNext = async (stepData: any) => {
    const updatedData = { ...data, ...stepData };
    setData(updatedData);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      trackEvent('onboarding_step_completed', {
        step: STEPS[currentStep].id,
        next_step: STEPS[currentStep + 1].id
      });
    } else {
      // Complete onboarding
      await completeOnboarding(updatedData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async (finalData: any) => {
    setIsLoading(true);

    try {
      // Save onboarding data
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });

      if (response.ok) {
        const result = await response.json();

        // Track completion
        trackEvent('onboarding_completed', {
          dog_id: result.dogId,
          breed: finalData.dog?.breed,
          user_goals: finalData.goals?.primary?.join(',')
        });

        // Redirect to dashboard
        router.push('/dashboard?onboarding=completed');
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <ProgressBar
          currentStep={currentStep}
          totalSteps={STEPS.length}
          steps={STEPS}
        />
      </div>

      <div className="p-8">
        <CurrentStepComponent
          data={data}
          onNext={handleNext}
          onBack={handleBack}
          isFirst={currentStep === 0}
          isLast={currentStep === STEPS.length - 1}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}