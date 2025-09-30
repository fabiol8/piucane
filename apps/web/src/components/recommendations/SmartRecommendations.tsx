'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Star, ShoppingCart, TrendingUp, Clock, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getRecommendationsForDog,
  Recommendation,
  Product,
  Subscription,
  Dog
} from '@/lib/recommendations';
import { trackCTA } from '@/analytics/ga4';

interface SmartRecommendationsProps {
  dog: Dog;
  user: any;
  context?: 'dashboard' | 'profile' | 'shop' | 'checkout';
  maxItems?: number;
  categories?: ('products' | 'subscriptions' | 'health' | 'seasonal')[];
  className?: string;
}

export function SmartRecommendations({
  dog,
  user,
  context = 'dashboard',
  maxItems = 3,
  categories = ['products', 'subscriptions'],
  className = ''
}: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, [dog.id]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const allRecs = await getRecommendationsForDog(dog, user);

      // Combine and filter recommendations based on categories
      const filteredRecs = [];
      if (categories.includes('products')) filteredRecs.push(...allRecs.products);
      if (categories.includes('subscriptions')) filteredRecs.push(...allRecs.subscriptions);
      if (categories.includes('health')) filteredRecs.push(...allRecs.health);
      if (categories.includes('seasonal')) filteredRecs.push(...allRecs.seasonal);

      // Sort by confidence and urgency
      const sortedRecs = filteredRecs
        .sort((a, b) => {
          // Urgent items first
          if (a.urgency === 'high' && b.urgency !== 'high') return -1;
          if (b.urgency === 'high' && a.urgency !== 'high') return 1;

          // Then by confidence
          return b.confidence - a.confidence;
        })
        .slice(0, maxItems);

      setRecommendations(sortedRecs);

      trackCTA({
        ctaId: 'recommendations.smart.loaded',
        event: 'smart_recommendations_loaded',
        value: context,
        metadata: {
          dogId: dog.id,
          recommendationCount: sortedRecs.length,
          context
        }
      });
    } catch (error) {
      console.error('Error loading smart recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (recommendationId: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(recommendationId);
    setDismissed(newDismissed);

    trackCTA({
      ctaId: 'recommendations.smart.dismiss',
      event: 'recommendation_dismissed',
      value: recommendationId,
      metadata: { context }
    });
  };

  const handleAction = (recommendation: Recommendation, action: string) => {
    trackCTA({
      ctaId: `recommendations.smart.${action}`,
      event: 'recommendation_action',
      value: action,
      metadata: {
        recommendationId: recommendation.id,
        itemId: recommendation.item.id,
        context,
        confidence: recommendation.confidence
      }
    });

    // Handle different actions
    switch (action) {
      case 'add_to_cart':
        // Add to cart logic
        alert(`${recommendation.item.name} aggiunto al carrello!`);
        break;
      case 'view_details':
        // Navigate to product/subscription details
        window.location.href = recommendation.type === 'product'
          ? `/shop/products/${recommendation.item.id}`
          : `/subscriptions/${recommendation.item.id}`;
        break;
      case 'view_all':
        window.location.href = '/recommendations';
        break;
    }
  };

  const visibleRecommendations = recommendations.filter(rec => !dismissed.has(rec.id));

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
          <span className="text-sm text-gray-600">Caricamento raccomandazioni...</span>
        </div>
      </Card>
    );
  }

  if (visibleRecommendations.length === 0) {
    return null; // Don't show empty state for smart recommendations
  }

  return (
    <Card className={`${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">
              {getContextTitle(context)}
            </h3>
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(visibleRecommendations[0], 'view_all')}
            data-cta-id="recommendations.smart.view_all"
          >
            <span className="text-sm">Vedi tutte</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <p className="text-sm text-gray-600 mt-1">
          Personalizzato per {dog.name}
        </p>
      </div>

      {/* Recommendations */}
      <div className="divide-y">
        {visibleRecommendations.map((recommendation) => (
          <SmartRecommendationItem
            key={recommendation.id}
            recommendation={recommendation}
            onAction={(action) => handleAction(recommendation, action)}
            onDismiss={() => handleDismiss(recommendation.id)}
            compact={context !== 'dashboard'}
          />
        ))}
      </div>
    </Card>
  );
}

interface SmartRecommendationItemProps {
  recommendation: Recommendation;
  onAction: (action: string) => void;
  onDismiss: () => void;
  compact?: boolean;
}

function SmartRecommendationItem({
  recommendation,
  onAction,
  onDismiss,
  compact = false
}: SmartRecommendationItemProps) {
  const item = recommendation.item;
  const isProduct = recommendation.type === 'product';
  const product = isProduct ? item as Product : null;
  const subscription = !isProduct ? item as Subscription : null;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Product Image */}
        <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-product.jpg';
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                {recommendation.urgency === 'high' && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">
                    Urgente
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 ${getConfidenceColor(recommendation.confidence)}`}
                >
                  {Math.round(recommendation.confidence * 100)}% match
                </Badge>
              </div>

              <h4 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'} line-clamp-1`}>
                {item.name}
              </h4>

              {!compact && (
                <p className="text-sm text-gray-600 line-clamp-1 mb-1">
                  {item.description}
                </p>
              )}

              {/* Key reason */}
              <p className="text-xs text-gray-500 line-clamp-1">
                {recommendation.reasoning[0]}
              </p>

              {/* Price */}
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-bold text-green-600 ${compact ? 'text-sm' : 'text-base'}`}>
                  €{(recommendation.personalizedPrice || item.price).toFixed(2)}
                </span>

                {isProduct && product?.originalPrice && product.originalPrice > item.price && (
                  <span className="text-xs text-gray-500 line-through">
                    €{product.originalPrice.toFixed(2)}
                  </span>
                )}

                {recommendation.discount && (
                  <Badge variant="secondary" className="text-xs">
                    -{recommendation.discount.percentage}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="sm"
                onClick={() => onAction('add_to_cart')}
                className={compact ? 'px-2 py-1 text-xs' : ''}
                data-cta-id="recommendations.smart.add_to_cart"
              >
                <ShoppingCart className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} ${compact ? '' : 'mr-1'}`} />
                {!compact && (isProduct ? 'Aggiungi' : 'Abbonati')}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="p-1"
                data-cta-id="recommendations.smart.dismiss"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Context-specific widget for different pages
export function DashboardRecommendations({ dog, user }: { dog: Dog; user: any }) {
  return (
    <SmartRecommendations
      dog={dog}
      user={user}
      context="dashboard"
      maxItems={4}
      categories={['health', 'products', 'subscriptions']}
      className="mb-6"
    />
  );
}

export function ProfileRecommendations({ dog, user }: { dog: Dog; user: any }) {
  return (
    <SmartRecommendations
      dog={dog}
      user={user}
      context="profile"
      maxItems={3}
      categories={['health', 'products']}
      className="mt-6"
    />
  );
}

export function ShopRecommendations({ dog, user }: { dog: Dog; user: any }) {
  return (
    <SmartRecommendations
      dog={dog}
      user={user}
      context="shop"
      maxItems={4}
      categories={['products', 'seasonal']}
      className="sticky top-4"
    />
  );
}

export function CheckoutRecommendations({ dog, user }: { dog: Dog; user: any }) {
  return (
    <SmartRecommendations
      dog={dog}
      user={user}
      context="checkout"
      maxItems={2}
      categories={['products']}
      className="mt-4"
    />
  );
}

// Floating recommendation banner
export function FloatingRecommendationBanner({ dog, user }: { dog: Dog; user: any }) {
  const [visible, setVisible] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    // Show urgent recommendations as floating banners
    loadUrgentRecommendation();
  }, [dog.id]);

  const loadUrgentRecommendation = async () => {
    try {
      const allRecs = await getRecommendationsForDog(dog, user);
      const urgentRecs = [
        ...allRecs.health,
        ...allRecs.products,
        ...allRecs.subscriptions
      ].filter(rec => rec.urgency === 'high' && rec.confidence > 0.8);

      if (urgentRecs.length > 0) {
        setRecommendation(urgentRecs[0]);
        setVisible(true);
      }
    } catch (error) {
      console.error('Error loading urgent recommendation:', error);
    }
  };

  if (!visible || !recommendation) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="p-4 shadow-lg border-l-4 border-l-red-500 bg-red-50">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <img
              src={recommendation.item.image}
              alt={recommendation.item.name}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-product.jpg';
              }}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <Badge variant="destructive" className="text-xs">
                Urgente
              </Badge>
            </div>

            <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
              {recommendation.item.name}
            </h4>

            <p className="text-xs text-gray-600 line-clamp-1 mt-1">
              {recommendation.reasoning[0]}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => {
                  trackCTA({
                    ctaId: 'recommendations.floating.action',
                    event: 'floating_recommendation_action',
                    value: recommendation.item.id
                  });
                  setVisible(false);
                }}
                className="text-xs px-2 py-1"
              >
                Visualizza
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisible(false)}
                className="text-xs px-2 py-1"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helper functions
function getContextTitle(context: string): string {
  switch (context) {
    case 'dashboard': return 'Raccomandazioni per te';
    case 'profile': return 'Prodotti consigliati';
    case 'shop': return 'Perfetto per te';
    case 'checkout': return 'Aggiungi al tuo ordine';
    default: return 'Raccomandazioni AI';
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence > 0.8) return 'border-green-500 text-green-700';
  if (confidence > 0.6) return 'border-yellow-500 text-yellow-700';
  return 'border-gray-500 text-gray-700';
}