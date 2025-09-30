'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const { user, isAuthenticated, loading } = useApp();
  const router = useRouter();

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">PiùCane</h1>
              </div>
              <Link
                href="/login"
                data-cta-id="home.header.login.click"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Accedi
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-8">
              <span className="text-white font-bold text-4xl">P</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Benvenuto su <span className="text-green-600">PiùCane</span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              L'app completa per la salute, alimentazione e benessere del tuo cane.
              Con AI veterinario, gamification e shop intelligente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/login"
                data-cta-id="home.hero.start.click"
                className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors"
              >
                Inizia Ora
              </Link>
              <Link
                href="/demo"
                data-cta-id="home.hero.demo.click"
                className="bg-white text-green-600 px-8 py-3 rounded-lg text-lg font-medium border-2 border-green-600 hover:bg-green-50 transition-colors"
              >
                Vedi Demo
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Veterinario</h3>
                <p className="text-gray-600">Consulenza AI 24/7 con tre agenti specializzati: veterinario, trainer e groomer</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="text-4xl mb-4">🎮</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gamification</h3>
                <p className="text-gray-600">Missioni, badge e ricompense per mantenere il tuo cane in salute</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="text-4xl mb-4">🛍️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Shop Intelligente</h3>
                <p className="text-gray-600">Prodotti personalizzati con AI e compatibilità allergie</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated user dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PiùCane</h1>
                <p className="text-xs text-gray-500">Ciao, {user?.name}!</p>
              </div>
            </div>

            <nav className="hidden md:flex space-x-8">
              <Link
                href="/chat"
                data-cta-id="home.nav.ai_chat.click"
                className="text-gray-700 hover:text-green-600 transition-colors"
              >
                AI Chat
              </Link>
              <Link
                href="/missions"
                data-cta-id="home.nav.missions.click"
                className="text-gray-700 hover:text-green-600 transition-colors"
              >
                Missioni
              </Link>
              <Link
                href="/shop"
                data-cta-id="home.nav.shop.click"
                className="text-gray-700 hover:text-green-600 transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/account"
                data-cta-id="home.nav.account.click"
                className="text-gray-700 hover:text-green-600 transition-colors"
              >
                Account
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                Livello {user?.gamification?.level || 1}
              </div>
              <button
                onClick={() => router.push('/account')}
                data-cta-id="home.header.settings.click"
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <section className="bg-gradient-to-r from-green-50 to-orange-50 rounded-2xl p-8 mb-8 border border-green-200">
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Benvenuto nella tua dashboard PiùCane!
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Gestisci la salute del tuo cane, chatta con gli AI, completa missioni e acquista prodotti personalizzati.
            </p>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🎮</div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {user?.gamification?.xp || 0}
                </div>
                <div className="text-sm text-gray-600">Punti XP</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🏆</div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {user?.gamification?.badges?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Badge</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🐕</div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {user?.dogs?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Cani</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📦</div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {user?.subscriptions?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Abbonamenti</div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Features */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* AI Chat */}
          <Link
            href="/chat"
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">🤖</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  AI Chat
                </h3>
                <p className="text-sm text-green-600">3 Agenti Disponibili</p>
              </div>
            </div>
            <p className="text-gray-600">
              Chatta con i nostri AI specializzati per consigli su salute, training e grooming
            </p>
          </Link>

          {/* Missioni */}
          <Link
            href="/missions"
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">🎯</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Missioni
                </h3>
                <p className="text-sm text-orange-600">Guadagna XP</p>
              </div>
            </div>
            <p className="text-gray-600">
              Completa missioni quotidiane per migliorare la salute del tuo cane
            </p>
          </Link>

          {/* Shop */}
          <Link
            href="/shop"
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">🛍️</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Shop
                </h3>
                <p className="text-sm text-blue-600">AI Personalizzato</p>
              </div>
            </div>
            <p className="text-gray-600">
              Prodotti selezionati dall'AI compatibili con il tuo cane
            </p>
          </Link>

          {/* Salute Cane */}
          <Link
            href="/dogs"
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">🏥</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Salute Cane
                </h3>
                <p className="text-sm text-red-500">Tracking Avanzato</p>
              </div>
            </div>
            <p className="text-gray-600">
              Monitora la salute e prenota visite veterinarie
            </p>
          </Link>

          {/* Abbonamenti */}
          <Link
            href="/subscriptions"
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">📦</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Abbonamenti
                </h3>
                <p className="text-sm text-purple-600">Consegne Automatiche</p>
              </div>
            </div>
            <p className="text-gray-600">
              Gestisci i tuoi abbonamenti per cibo e prodotti
            </p>
          </Link>

          {/* Account */}
          <Link
            href="/account"
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">⚙️</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Account
                </h3>
                <p className="text-sm text-gray-500">Impostazioni</p>
              </div>
            </div>
            <p className="text-gray-600">
              Gestisci profilo, privacy e impostazioni dell'app
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
