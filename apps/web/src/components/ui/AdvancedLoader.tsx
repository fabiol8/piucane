/**
 * Advanced Loader Component
 * Sophisticated loading states with animations and progress tracking
 */

'use client';

import { useEffect, useState } from 'react';

interface AdvancedLoaderProps {
  type?: 'spinner' | 'skeleton' | 'progress' | 'pulse' | 'dots' | 'bone';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'accent' | 'gray';
  progress?: number;
  message?: string;
  showProgress?: boolean;
  animated?: boolean;
  className?: string;
}

export function AdvancedLoader({
  type = 'spinner',
  size = 'md',
  color = 'primary',
  progress = 0,
  message,
  showProgress = false,
  animated = true,
  className = ''
}: AdvancedLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (type === 'dots' && animated) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [type, animated]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'text-green-500 border-green-500',
    secondary: 'text-blue-500 border-blue-500',
    accent: 'text-purple-500 border-purple-500',
    gray: 'text-gray-500 border-gray-500'
  };

  const renderSpinner = () => (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-transparent border-t-current ${sizeClasses[size]}`} />
    </div>
  );

  const renderSkeleton = () => (
    <div className={`space-y-3 ${className}`}>
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className={`w-full ${className}`}>
      <div className="bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color].replace('text-', 'bg-').replace('border-', 'bg-')}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {showProgress && (
        <div className="text-sm text-gray-600 mt-1 text-center">
          {progress.toFixed(0)}%
        </div>
      )}
    </div>
  );

  const renderPulse = () => (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className={`rounded-full animate-pulse ${colorClasses[color].replace('text-', 'bg-').replace('border-', 'bg-')}`} />
    </div>
  );

  const renderDots = () => (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className={`${colorClasses[color]} font-medium`}>Caricamento</span>
      <span className={`${colorClasses[color]} w-8 inline-block`}>{dots}</span>
    </div>
  );

  const renderBone = () => (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="animate-pulse">
        <svg
          className={`${sizeClasses[size]} ${colorClasses[color]}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C21.1 4 22 4.9 22 6V8C22 9.1 21.1 10 20 10H17V14H20C21.1 14 22 14.9 22 16V18C22 19.1 21.1 20 20 20H17V22C17 22.55 16.55 23 16 23H8C7.45 23 7 22.55 7 22V20H4C2.9 20 2 19.1 2 18V16C2 14.9 2.9 14 4 14H7V10H4C2.9 10 2 9.1 2 8V6C2 4.9 2.9 4 4 4H7Z" />
        </svg>
      </div>
    </div>
  );

  const renderLoader = () => {
    switch (type) {
      case 'skeleton':
        return renderSkeleton();
      case 'progress':
        return renderProgress();
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
      case 'bone':
        return renderBone();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderLoader()}
      {message && (
        <div className={`text-sm ${colorClasses[color]} text-center`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default AdvancedLoader;