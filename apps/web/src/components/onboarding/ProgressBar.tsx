'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: { id: string; title: string }[];
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {steps[currentStep].title}
        </h2>
        <span className="text-sm text-gray-500">
          {currentStep + 1} di {totalSteps}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-brand-primary h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`text-xs ${
              index <= currentStep ? 'text-brand-primary' : 'text-gray-400'
            }`}
          >
            {index <= currentStep ? '●' : '○'}
          </div>
        ))}
      </div>
    </div>
  );
}