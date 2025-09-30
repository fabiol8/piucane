'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('demo@piucane.com');
  const [password, setPassword] = useState('password123');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    try {
      const result = await login(email, password);
      if (result.success) {
        // Track CTA interaction
        if (typeof gtag !== 'undefined') {
          gtag('event', 'cta_interaction', {
            cta_id: 'auth.login.button.click',
            element_type: 'button',
            location: 'login_page'
          });
        }
        router.push('/');
      } else {
        setError(result.error || 'Credenziali non valide. Usa le credenziali demo.');
      }
    } catch (err) {
      setError('Errore durante l\'accesso. Riprova.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 px-4">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Benvenuto su PiùCane</h2>
          <p className="text-gray-600">Accedi per iniziare a prenderti cura del tuo cane</p>
        </div>

        {/* Demo Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <div className="text-2xl mr-3">🚀</div>
            <h3 className="font-semibold text-green-800">Demo Account</h3>
          </div>
          <p className="text-green-700 text-sm mb-3">
            Usa queste credenziali per accedere alla demo completa:
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center">
              <span className="font-mono bg-white px-2 py-1 rounded border text-green-700">
                demo@piucane.com
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-mono bg-white px-2 py-1 rounded border text-green-700">
                password123
              </span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="La tua email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="La tua password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        {/* Features Preview */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">🎯 Cosa troverai nell'app:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-lg mr-2">🎮</span>
              <span className="text-gray-700">Sistema Gamification</span>
            </div>
            <div className="flex items-center">
              <span className="text-lg mr-2">🤖</span>
              <span className="text-gray-700">AI Agents Hub</span>
            </div>
            <div className="flex items-center">
              <span className="text-lg mr-2">🏥</span>
              <span className="text-gray-700">Area Veterinaria</span>
            </div>
            <div className="flex items-center">
              <span className="text-lg mr-2">🛍️</span>
              <span className="text-gray-700">Shop Intelligente</span>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-green-600 hover:text-green-700 text-sm">
            ← Torna alla homepage
          </Link>
        </div>
      </div>
    </div>
  );
}