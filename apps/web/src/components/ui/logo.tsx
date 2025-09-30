'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'md', className, showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Logo PiùCane - Fungo verde/arancione */}
      <div className={cn('relative inline-block', sizeClasses[size])}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Logo PiùCane - P stilizzata verde/arancione */}

          {/* Cappello verde della P */}
          <path
            d="M15 15 C15 8, 22 5, 35 5 L75 5 C85 5, 90 10, 90 20 C90 30, 85 35, 75 35 L45 35 C40 35, 38 38, 38 42 L38 50 C38 52, 40 54, 42 54 L65 54 C75 54, 80 59, 80 69 C80 79, 75 84, 65 84 L35 84 C25 84, 20 79, 20 69 L20 25 C20 20, 17 15, 15 15 Z"
            fill="#9ACD32"
            stroke="#000000"
            strokeWidth="4"
          />

          {/* Corpo arancione della P */}
          <path
            d="M25 25 L25 75 C25 78, 27 80, 30 80 L50 80 C58 80, 62 76, 62 68 C62 60, 58 56, 50 56 L35 56 C32 56, 30 54, 30 51 L30 45 C30 42, 32 40, 35 40 L55 40 C63 40, 67 36, 67 28 C67 20, 63 16, 55 16 L30 16 C27 16, 25 18, 25 21 L25 25 Z"
            fill="#FFA500"
            stroke="#000000"
            strokeWidth="3"
          />

          {/* Gambo bianco della P */}
          <rect
            x="25"
            y="70"
            width="8"
            height="25"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="2"
            rx="2"
          />

          {/* Highlight superiore */}
          <ellipse
            cx="60"
            cy="22"
            rx="8"
            ry="4"
            fill="#FFFFFF"
            opacity="0.4"
          />

          {/* Highlight corpo */}
          <ellipse
            cx="45"
            cy="50"
            rx="6"
            ry="3"
            fill="#FFFFFF"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Testo PiùCane */}
      {showText && (
        <span className={cn(
          'font-bold text-gray-800 tracking-tight',
          textSizeClasses[size]
        )}>
          PiùCane
        </span>
      )}
    </div>
  );
}

export default Logo;