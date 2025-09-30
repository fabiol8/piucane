'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PersonalizationEngine } from '@/lib/content/PersonalizationEngine';
import type { ContentFeed, ContentFeedItem } from '@/types/content';

export default function NewsPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<ContentFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'personalized' | 'trending' | 'latest'>('personalized');
  const [error, setError] = useState<string | null>(null);

  const personalizationEngine = new PersonalizationEngine();

  useEffect(() => {
    loadFeed();
  }, [selectedFilter, user]);

  const loadFeed = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const algorithmMap = {
        personalized: 'personalized' as const,
        trending: 'trending' as const,
        latest: 'chronological' as const
      };

      const newFeed = await personalizationEngine.generatePersonalizedFeed(
        user.uid,
        {
          algorithm: algorithmMap[selectedFilter],
          limit: 20,
          freshness: true
        }
      );

      setFeed(newFeed);
    } catch (err) {
      console.error('Failed to load feed:', err);
      setError('Errore nel caricamento del feed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: 'personalized' | 'trending' | 'latest') => {
    setSelectedFilter(filter);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="max-w-md mx-auto pt-20 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Richiesto</h2>
            <p className="text-gray-600 mb-6">
              Effettua il login per accedere ai contenuti personalizzati di PiùCane
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-orange-700 transition-colors"
            >
              Accedi ora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              📰 News & Contenuti
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleFilterChange('personalized')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'personalized'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Per te
              </button>
              <button
                onClick={() => handleFilterChange('trending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'trending'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => handleFilterChange('latest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'latest'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Recenti
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Errore di caricamento</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadFeed}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Riprova
            </button>
          </div>
        )}

        {/* Feed Content */}
        {!loading && !error && feed && (
          <>
            {/* Feed Info */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  {feed.items.length} contenuti • Algoritmo: {feed.algorithm}
                  {feed.abTestVariant && ` • Variante: ${feed.abTestVariant}`}
                </span>
                <span>
                  Aggiornato: {feed.lastUpdated.toLocaleTimeString('it-IT')}
                </span>
              </div>
            </div>

            {/* Content Feed */}
            <div className="space-y-6">
              {feed.items.map((item) => (
                <ContentCard key={item.contentId} item={item} />
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-8">
              <button
                onClick={loadFeed}
                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors"
              >
                Carica altri contenuti
              </button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && feed && feed.items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nessun contenuto disponibile</h3>
            <p className="text-gray-600 mb-6">
              Non ci sono contenuti corrispondenti ai tuoi criteri di ricerca
            </p>
            <button
              onClick={() => handleFilterChange('latest')}
              className="bg-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors"
            >
              Mostra contenuti recenti
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContentCard({ item }: { item: ContentFeedItem }) {
  // Mock content data for display purposes
  const mockContent = {
    title: `Articolo di esempio ${item.contentId.slice(-6)}`,
    excerpt: 'Questo è un estratto del contenuto che verrebbe mostrato nella card...',
    readingTime: Math.floor(Math.random() * 10) + 3,
    author: 'Dr. Veterinario',
    publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    type: 'article' as const,
    thumbnail: null,
    tags: ['salute', 'nutrizione', 'addestramento'][Math.floor(Math.random() * 3)]
  };

  const handleClick = () => {
    window.location.href = `/news/${item.contentId}`;
  };

  const getPersonalizationIcon = (reason: string) => {
    switch (reason) {
      case 'breed_match':
        return '🐕';
      case 'interest_match':
        return '❤️';
      case 'trending':
        return '🔥';
      case 'age_match':
        return '📅';
      default:
        return '✨';
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex space-x-4">
        {/* Thumbnail */}
        <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">📝</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
              {mockContent.title}
            </h3>
            <div className="ml-2 text-right text-xs text-gray-500 flex-shrink-0">
              <div>#{item.position}</div>
              <div>Score: {(item.score * 100).toFixed(0)}%</div>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {mockContent.excerpt}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <span>{mockContent.author}</span>
              <span>•</span>
              <span>{mockContent.readingTime} min lettura</span>
              <span>•</span>
              <span>{mockContent.publishedAt.toLocaleDateString('it-IT')}</span>
            </div>
            <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
              {mockContent.tags}
            </div>
          </div>

          {/* Personalization Reasons */}
          {item.reason.length > 0 && (
            <div className="flex items-center space-x-2 mt-3">
              {item.reason.slice(0, 2).map((reason, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs"
                  title={reason.description}
                >
                  <span>{getPersonalizationIcon(reason.type)}</span>
                  <span>{reason.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}