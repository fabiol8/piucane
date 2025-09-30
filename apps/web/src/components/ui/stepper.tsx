/**
 * Stepper component for multi-step processes like onboarding
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface StepData {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  optional?: boolean;
}

interface StepperProps {
  steps: StepData[];
  currentStep: number;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  showNumbers?: boolean;
  onStepClick?: (stepIndex: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  className,
  orientation = 'horizontal',
  showNumbers = true,
  onStepClick,
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <nav
      className={cn(
        'flex',
        isHorizontal ? 'flex-row space-x-4' : 'flex-col space-y-4',
        className
      )}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isClickable = onStepClick && step.status !== 'pending';
        const isCurrent = index === currentStep;
        const isCompleted = step.status === 'completed';
        const isError = step.status === 'error';

        return (
          <div
            key={step.id}
            className={cn(
              'relative flex items-center',
              isHorizontal ? 'flex-1' : 'flex-row',
              isClickable && 'cursor-pointer'
            )}
            onClick={isClickable ? () => onStepClick(index) : undefined}
          >
            {/* Step indicator */}
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isCompleted && 'border-green-500 bg-green-500 text-white',
                isError && 'border-red-500 bg-red-500 text-white',
                step.status === 'pending' && 'border-gray-300 bg-white text-gray-500'
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCompleted ? (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : isError ? (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : showNumbers ? (
                index + 1
              ) : (
                <div className="h-2 w-2 rounded-full bg-current" />
              )}
            </div>

            {/* Step content */}
            <div className={cn('ml-4 min-w-0', isHorizontal ? 'flex-1' : '')}>
              <div
                className={cn(
                  'text-sm font-medium',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-green-600',
                  isError && 'text-red-600',
                  step.status === 'pending' && 'text-gray-500'
                )}
              >
                {step.title}
                {step.optional && (
                  <span className="ml-1 text-xs text-gray-400">(Opzionale)</span>
                )}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>

            {/* Connection line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute',
                  isHorizontal
                    ? 'left-full top-5 h-0.5 w-full bg-gray-300'
                    : 'left-5 top-full h-full w-0.5 bg-gray-300',
                  isCompleted && 'bg-green-500'
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
};

// Step progress bar
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  className,
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-xs text-gray-600 mb-2">
        <span>Passo {currentStep + 1} di {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Passo ${currentStep + 1} di ${totalSteps}`}
        />
      </div>
    </div>
  );
};