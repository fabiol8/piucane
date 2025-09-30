'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Star, ShoppingBag, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getRecommendationsForDog,
  Recommendation,
  Product,
  Subscription
} from '@/lib/recommendations';
import { trackCTA } from '@/analytics/ga4';

interface RecommendationWidgetProps {
  dog: any;
  user: any;
  className?: string;
}

export function RecommendationWidget({ dog, user, className = '' }: RecommendationWidgetProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'trending' | 'personalized' | 'deals'>('personalized');

  useEffect(() => {
    loadRecommendations();
  }, [dog.id, selectedTab]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const allRecs = await getRecommendationsForDog(dog, user);

      let filteredRecs: Recommendation[] = [];

      switch (selectedTab) {
        case 'personalized':
          // High confidence recommendations
          filteredRecs = [
            ...allRecs.health,
            ...allRecs.products,
            ...allRecs.subscriptions
          ].filter(rec => rec.confidence > 0.7)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
          break;

        case 'trending':
          // Popular products
          filteredRecs = allRecs.products
            .filter(rec => {
              const product = rec.item as Product;
              return product.rating > 4.5 && product.reviewCount > 50;
            })
            .slice(0, 3);
          break;

        case 'deals':
          // Products with discounts
          filteredRecs = [
            ...allRecs.products,
            ...allRecs.subscriptions
          ].filter(rec => rec.discount || rec.item.originalPrice)
            .sort((a, b) => {
              const aSavings = rec => {
                if (rec.discount) return rec.discount.percentage;
                if (rec.item.originalPrice) return ((rec.item.originalPrice - rec.item.price) / rec.item.originalPrice) * 100;
                return 0;
              };
              return aSavings(b) - aSavings(a);
            })
            .slice(0, 3);
          break;
      }

      setRecommendations(filteredRecs);

      trackCTA({
        ctaId: 'recommendations.widget.loaded',
        event: 'widget_loaded',
        value: selectedTab,
        metadata: {
          dogId: dog.id,
          recommendationCount: filteredRecs.length,
          tab: selectedTab
        }
      });
    } catch (error) {
      console.error('Error loading recommendations widget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (recommendation: Recommendation) => {
    trackCTA({
      ctaId: 'recommendations.widget.item_click',
      event: 'widget_item_click',
      value: recommendation.item.id,
      metadata: {
        tab: selectedTab,
        confidence: recommendation.confidence,
        type: recommendation.type
      }
    });

    // Navigate to product/subscription page
    const path = recommendation.type === 'product'
      ? `/shop/products/${recommendation.item.id}`
      : `/subscriptions/${recommendation.item.id}`;

    window.location.href = path;
  };

  const handleViewAll = () => {
    trackCTA({
      ctaId: 'recommendations.widget.view_all',
      event: 'widget_view_all',
      value: selectedTab
    });

    window.location.href = '/recommendations';
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'personalized': return <Sparkles className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'deals': return <ShoppingBag className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'personalized': return 'Per te';
      case 'trending': return 'Trending';
      case 'deals': return 'Offerte';
      default: return 'Raccomandazioni';
    }
  };

  return (
    <Card className={`${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Raccomandazioni AI
          </h3>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadRecommendations}
              disabled={loading}
              data-cta-id="recommendations.widget.refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              data-cta-id="recommendations.widget.view_all"
            >
              <span className="text-sm">Vedi tutte</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['personalized', 'trending', 'deals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setSelectedTab(tab);
                trackCTA({
                  ctaId: `recommendations.widget.tab.${tab}`,
                  event: 'widget_tab_change',
                  value: tab
                });
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-md text-sm transition-colors ${
                selectedTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-cta-id={`recommendations.widget.tab.${tab}`}
            >
              {getTabIcon(tab)}
              {getTabTitle(tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="w-16 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              Nessuna raccomandazione per questa categoria
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <RecommendationItem
                key={recommendation.id}
                recommendation={recommendation}
                onClick={() => handleItemClick(recommendation)}
                tab={selectedTab}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recommendations.length > 0 && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Raccomandazioni basate su {dog.name} • {dog.breed} • {dog.weight}kg
          </p>
        </div>
      )}
    </Card>
  );
}

interface RecommendationItemProps {
  recommendation: Recommendation;
  onClick: () => void;
  tab: string;
}

function RecommendationItem({ recommendation, onClick, tab }: RecommendationItemProps) {
  const item = recommendation.item;
  const isProduct = recommendation.type === 'product';
  const product = isProduct ? item as Product : null;
  const subscription = !isProduct ? item as Subscription : null;

  const getSavingsInfo = () => {
    if (recommendation.discount) {
      return {
        percentage: recommendation.discount.percentage,
        amount: (item.price * recommendation.discount.percentage / 100).toFixed(2)
      };
    }

    if (item.originalPrice && item.originalPrice > item.price) {
      const percentage = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
      const amount = (item.originalPrice - item.price).toFixed(2);
      return { percentage, amount };
    }

    return null;
  };

  const savings = getSavingsInfo();

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
    >
      {/* Product Image */}
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
            <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
              {item.name}
            </h4>

            <div className="flex items-center gap-2 mt-1">
              {/* Tab-specific badges */}
              {tab === 'personalized' && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {Math.round(recommendation.confidence * 100)}% match
                </Badge>
              )}

              {tab === 'trending' && isProduct && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{product?.rating}</span>
                </div>
              )}

              {tab === 'deals' && savings && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  -{savings.percentage}%
                </Badge>
              )}

              {recommendation.urgency === 'high' && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  Urgente
                </Badge>
              )}
            </div>

            <p className="text-xs text-gray-500 line-clamp-1 mt-1">
              {isProduct ? product?.brand : subscription?.type} • {item.description}
            </p>
          </div>

          {/* Price */}
          <div className="text-right ml-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-green-600">
                €{(recommendation.personalizedPrice || item.price).toFixed(2)}
              </span>

              {savings && (
                <span className="text-xs text-gray-500 line-through">
                  €{item.originalPrice?.toFixed(2)}
                </span>
              )}
            </div>

            {savings && (
              <div className="text-xs text-green-600 font-medium">
                Risparmi €{savings.amount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}