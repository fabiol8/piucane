'use client';

import React from 'react';
import Link from 'next/link';

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <Link
        href="#main-content"
        className="fixed top-4 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Vai al contenuto principale
      </Link>
    </div>
  );
}
