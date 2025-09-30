'use client';

import React from 'react';
import MainNavigation from './MainNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <MainNavigation />

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}