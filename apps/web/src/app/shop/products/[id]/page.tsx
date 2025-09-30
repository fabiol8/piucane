'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Star, Heart, ShoppingCart, Share2, AlertCircle, CheckCircle,
  Info, Calculator, Calendar, Package, Truck, Shield,
  ChevronLeft, ChevronRight, Plus, Minus, Dog, Award,
  Clock, Users, Verified, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { trackCTA } from '@/analytics/ga4';
import { smartCart } from '@/lib/smart-cart';

interface ProductDetail {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  subscriberPrice: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  longDescription: string;
  ingredients: string[];
  allergens: string[];
  benefits: string[];
  analyticalConstituents: {
    protein: number;
    fat: number;
    fiber: number;
    moisture: number;
    ash: number;
    calcium?: number;
    phosphorus?: number;
    calories: number;
  };
  feedingGuidelines: {
    weight: number;
    dailyAmount: number;
  }[];
  formats: {
    id: string;
    size: string;
    weight: number;
    price: number;
    subscriberPrice: number;
    inStock: boolean;
    stockLevel: number;
    estimatedDuration: number; // days for average dog
  }[];
  images: string[];
  videos?: string[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  tags: string[];
  certifications: string[];
  awards: string[];
  suitableFor: {
    ageMin?: number;
    ageMax?: number;
    weightMin?: number;
    weightMax?: number;
    breeds?: string[];
    activityLevel?: string[];
    conditions?: string[];
  };
  compatibility?: {
    score: number;
    reasons: string[];
    warnings: string[];
  };
  relatedProducts: string[];
  frequentlyBoughtTogether: string[];
  subscriptionOptions: {
    available: boolean;
    recommendedFrequency: number; // weeks
    frequencies: number[];
    firstOrderDiscount?: number;
  };
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  dogName?: string;
  dogBreed?: string;
  helpfulCount: number;
  images?: string[];
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  weight: number;
  age: number;
  allergies: string[];
  activityLevel: 'low' | 'medium' | 'high';
}

const mockDog: Dog = {
  id: 'dog1',
  name: 'Luna',
  breed: 'Golden Retriever',
  weight: 28,
  age: 48,
  allergies: ['pollo', 'grano'],
  activityLevel: 'high'
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedDog, setSelectedDog] = useState<Dog>(mockDog);
  const [selectedFormat, setSelectedFormat] = useState<ProductDetail['formats'][0] | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<'single' | 'subscription'>('single');
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<number>(6);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [loading, setLoading] = useState(true);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [showDosageCalculator, setShowDosageCalculator] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  useEffect(() => {
    if (product) {
      // Calculate recommended frequency based on product and dog
      const recommended = calculateRecommendedFrequency(product, selectedDog);
      setSubscriptionFrequency(recommended);
    }
  }, [product, selectedDog]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      // Mock product data - in real app would fetch from API
      const mockProduct: ProductDetail = {
        id: productId,
        name: 'Crocchette Premium Adult Agnello & Riso',
        brand: 'NutriCanine',
        category: 'food',
        subcategory: 'dry-food',
        price: 45.90,
        subscriberPrice: 39.02,
        originalPrice: 52.90,
        description: 'Alimento completo per cani adulti con agnello fresco e riso integrale.',
        shortDescription: 'Agnello fresco e riso, formula ipoallergenica',
        longDescription: 'Le nostre crocchette Premium Adult sono formulate con agnello fresco di alta qualità e riso integrale, perfette per cani adulti con sensibilità alimentari. La ricetta ipoallergenica è arricchita con glucosamina e condroitina per il supporto delle articolazioni, omega-3 per un pelo lucido e probiotici per la salute digestiva.',
        ingredients: [
          'Agnello fresco disossato (32%)',
          'Riso integrale (18%)',
          'Patate dolci',
          'Piselli',
          'Farina di agnello',
          'Olio di salmone',
          'Barbabietola da zucchero',
          'Glucosamina (500 mg/kg)',
          'Condroitina (300 mg/kg)',
          'Probiotici (1x10^9 CFU/kg)',
          'Vitamine e minerali'
        ],
        allergens: [],
        benefits: [
          'Formula ipoallergenica - ideale per cani sensibili',
          'Proteine di alta qualità per muscoli forti',
          'Glucosamina e condroitina per articolazioni sane',
          'Omega-3 per pelo lucido e pelle sana',
          'Probiotici per digestione ottimale',
          'Antiossidanti naturali per il sistema immunitario',
          'Senza cereali problematici (grano, mais, soia)'
        ],
        analyticalConstituents: {
          protein: 28,
          fat: 16,
          fiber: 3.5,
          moisture: 8,
          ash: 7.5,
          calcium: 1.2,
          phosphorus: 0.9,
          calories: 3650
        },
        feedingGuidelines: [
          { weight: 5, dailyAmount: 80 },
          { weight: 10, dailyAmount: 140 },
          { weight: 15, dailyAmount: 190 },
          { weight: 20, dailyAmount: 240 },
          { weight: 25, dailyAmount: 285 },
          { weight: 30, dailyAmount: 330 },
          { weight: 35, dailyAmount: 370 },
          { weight: 40, dailyAmount: 410 },
          { weight: 50, dailyAmount: 485 }
        ],
        formats: [
          {
            id: 'format-3kg',
            size: '3kg',
            weight: 3,
            price: 24.90,
            subscriberPrice: 21.17,
            inStock: true,
            stockLevel: 15,
            estimatedDuration: 18
          },
          {
            id: 'format-12kg',
            size: '12kg',
            weight: 12,
            price: 45.90,
            subscriberPrice: 39.02,
            inStock: true,
            stockLevel: 8,
            estimatedDuration: 75
          },
          {
            id: 'format-20kg',
            size: '20kg',
            weight: 20,
            price: 72.90,
            subscriberPrice: 61.97,
            inStock: true,
            stockLevel: 3,
            estimatedDuration: 125
          }
        ],
        images: [
          '/products/food-premium-lamb-1.jpg',
          '/products/food-premium-lamb-2.jpg',
          '/products/food-premium-lamb-3.jpg',
          '/products/food-premium-lamb-ingredients.jpg'
        ],
        rating: 4.8,
        reviewCount: 324,
        reviews: [
          {
            id: 'review-1',
            userId: 'user-1',
            userName: 'Marco R.',
            rating: 5,
            title: 'Ottimo prodotto per il mio Golden',
            comment: 'Luna lo adora! Dal passaggio a queste crocchette il suo pelo è diventato molto più lucido e non ha più problemi digestivi.',
            date: '2024-01-15',
            verified: true,
            dogName: 'Luna',
            dogBreed: 'Golden Retriever',
            helpfulCount: 12
          },
          {
            id: 'review-2',
            userId: 'user-2',
            userName: 'Alessia M.',
            rating: 4,
            title: 'Buona qualità, prezzo giusto',
            comment: 'Prodotto di buona qualità. Il mio cane gradisce e digerisce bene. Con l\'abbonamento il prezzo diventa molto conveniente.',
            date: '2024-01-10',
            verified: true,
            dogName: 'Max',
            dogBreed: 'Labrador',
            helpfulCount: 8
          }
        ],
        tags: ['grain-free', 'hypoallergenic', 'joint-support', 'made-in-italy', 'premium'],
        certifications: ['FEDIAF', 'ISO 22000', 'Made in Italy'],
        awards: ['Best Premium Food 2023', 'Vet Recommended'],
        suitableFor: {
          ageMin: 12,
          ageMax: 84,
          weightMin: 10,
          weightMax: 50,
          activityLevel: ['medium', 'high'],
          conditions: ['joint-support', 'sensitive-stomach', 'skin-allergies']
        },
        compatibility: {
          score: 0.95,
          reasons: [
            'Perfetto per Golden Retriever attivi come Luna',
            'Non contiene allergeni noti (pollo, grano)',
            'Adatto all\'età e peso di Luna',
            'Include glucosamina per il supporto articolare',
            'Formula ipoallergenica ideale per cani sensibili'
          ],
          warnings: []
        },
        relatedProducts: ['food-2', 'treats-1', 'supplement-1'],
        frequentlyBoughtTogether: ['treats-dental', 'supplement-omega3'],
        subscriptionOptions: {
          available: true,
          recommendedFrequency: 6,
          frequencies: [4, 6, 8, 10, 12],
          firstOrderDiscount: 15
        }
      };

      setProduct(mockProduct);
      setSelectedFormat(mockProduct.formats[1]); // Default to 12kg

      trackCTA({
        ctaId: 'pdp.view',
        event: 'view_item',
        value: productId,
        metadata: {
          product_name: mockProduct.name,
          product_category: mockProduct.category,
          product_brand: mockProduct.brand,
          dog_id: selectedDog.id,
          compatibility_score: mockProduct.compatibility?.score
        }
      });
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyDosage = (dog: Dog, product: ProductDetail) => {
    if (!product.feedingGuidelines) return null;

    // Find the closest weight guideline
    const guideline = product.feedingGuidelines.reduce((prev, curr) =>
      Math.abs(curr.weight - dog.weight) < Math.abs(prev.weight - dog.weight) ? curr : prev
    );

    let dailyAmount = guideline.dailyAmount;

    // Adjust for activity level
    switch (dog.activityLevel) {
      case 'low': dailyAmount *= 0.8; break;
      case 'high': dailyAmount *= 1.2; break;
    }

    // Adjust for age
    if (dog.age < 12) dailyAmount *= 1.3; // Puppy
    if (dog.age > 84) dailyAmount *= 0.9; // Senior

    return Math.round(dailyAmount);
  };

  const calculateRecommendedFrequency = (product: ProductDetail, dog: Dog): number => {
    if (!selectedFormat) return 6;

    const dailyDosage = calculateDailyDosage(dog, product);
    if (!dailyDosage) return 6;

    const durationDays = Math.floor((selectedFormat.weight * 1000) / dailyDosage);
    const weeks = Math.floor(durationDays / 7);

    // Round to nearest available frequency
    const frequencies = product.subscriptionOptions.frequencies;
    return frequencies.reduce((prev, curr) =>
      Math.abs(curr - weeks) < Math.abs(prev - weeks) ? curr : prev
    );
  };

  const handleAddToCart = () => {
    if (!product || !selectedFormat) return;

    const item = {
      ...product,
      price: orderType === 'subscription' ? selectedFormat.subscriberPrice : selectedFormat.price,
      format: selectedFormat
    };

    trackCTA({
      ctaId: `pdp.add_to_cart.${orderType}`,
      event: orderType === 'subscription' ? 'subscribe_click' : 'add_to_cart',
      value: product.id,
      metadata: {
        product_name: product.name,
        format_size: selectedFormat.size,
        quantity,
        order_type: orderType,
        subscription_frequency: orderType === 'subscription' ? subscriptionFrequency : undefined,
        price: item.price,
        dog_id: selectedDog.id
      }
    });

    if (orderType === 'subscription') {
      // Handle subscription logic
      alert(`Abbonamento creato! ${product.name} (${selectedFormat.size}) ogni ${subscriptionFrequency} settimane.`);
    } else {
      smartCart.addItem(item as any, quantity);
      alert(`${product.name} (${selectedFormat.size}) aggiunto al carrello!`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.shortDescription,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiato negli appunti!');
    }

    trackCTA({
      ctaId: 'pdp.share',
      event: 'share',
      value: product?.id,
      metadata: { method: navigator.share ? 'native' : 'clipboard' }
    });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);

    trackCTA({
      ctaId: 'pdp.favorite.toggle',
      event: 'toggle_favorite',
      value: isFavorite ? 'remove' : 'add',
      metadata: { product_id: product?.id }
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Prodotto non trovato</h2>
          <p className="text-gray-600 mb-4">Il prodotto che stai cercando non esiste o non è più disponibile.</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna indietro
          </Button>
        </Card>
      </div>
    );
  }

  const dailyDosage = calculateDailyDosage(selectedDog, product);
  const durationDays = selectedFormat ? Math.floor((selectedFormat.weight * 1000) / (dailyDosage || 100)) : 0;
  const durationWeeks = Math.floor(durationDays / 7);

  const hasWarnings = product.compatibility?.warnings.length > 0;
  const isOutOfStock = !selectedFormat?.inStock;
  const isLowStock = selectedFormat?.stockLevel && selectedFormat.stockLevel < 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button onClick={() => window.history.back()} className="hover:text-green-600">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span>/</span>
          <button onClick={() => window.location.href = '/shop'} className="hover:text-green-600">
            Shop
          </button>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.jpg';
                }}
              />
            </div>

            {/* Thumbnail Gallery */}
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-green-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">{product.brand}</Badge>
                {product.certifications.map(cert => (
                  <Badge key={cert} variant="secondary" className="text-xs">{cert}</Badge>
                ))}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600 mb-4">{product.shortDescription}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-gray-500">({product.reviewCount} recensioni)</span>
              </div>

              {/* Compatibility */}
              {product.compatibility && (
                <div className="mb-4">
                  {hasWarnings ? (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-red-900">Non adatto a {selectedDog.name}</p>
                        <p className="text-sm text-red-700">{product.compatibility.warnings[0]}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-900">
                          Perfetto per {selectedDog.name} ({Math.round(product.compatibility.score * 100)}% compatibile)
                        </p>
                        <button
                          onClick={() => setShowCompatibilityModal(true)}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          Vedi perché →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato
              </label>
              <div className="grid grid-cols-1 gap-2">
                {product.formats.map((format) => {
                  const isSelected = selectedFormat?.id === format.id;
                  const formatDosage = calculateDailyDosage(selectedDog, product);
                  const formatDuration = formatDosage ? Math.floor((format.weight * 1000) / formatDosage) : 0;
                  const formatWeeks = Math.floor(formatDuration / 7);

                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format)}
                      disabled={!format.inStock}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : format.inStock
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{format.size}</span>
                          {formatWeeks > 0 && (
                            <span className="text-sm text-gray-600 ml-2">
                              (~{formatWeeks} settimane per {selectedDog.name})
                            </span>
                          )}
                          {!format.inStock && (
                            <span className="text-sm text-red-600 ml-2">Esaurito</span>
                          )}
                          {format.stockLevel < 5 && format.inStock && (
                            <span className="text-sm text-orange-600 ml-2">
                              Solo {format.stockLevel} rimasti
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            €{format.subscriberPrice.toFixed(2)}
                          </div>
                          {format.price > format.subscriberPrice && (
                            <div className="text-sm text-gray-500 line-through">
                              €{format.price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dosage Calculator */}
            {dailyDosage && selectedFormat && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Dosaggio personalizzato per {selectedDog.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Dose giornaliera consigliata:</span>
                    <span className="font-medium">{dailyDosage}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Durata confezione ({selectedFormat.size}):</span>
                    <span className="font-medium">{durationWeeks} settimane</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequenza abbonamento consigliata:</span>
                    <span className="font-medium">Ogni {subscriptionFrequency} settimane</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDosageCalculator(true)}
                  className="mt-3 text-blue-600 border-blue-200"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Calcola dosaggio dettagliato
                </Button>
              </Card>
            )}

            {/* Order Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo di ordine
              </label>
              <div className="grid grid-cols-1 gap-3">
                {/* Single Purchase */}
                <button
                  onClick={() => setOrderType('single')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    orderType === 'single'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Acquisto singolo</div>
                      <div className="text-sm text-gray-600">Ordina quando vuoi</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">€{selectedFormat?.price.toFixed(2)}</div>
                    </div>
                  </div>
                </button>

                {/* Subscription */}
                {product.subscriptionOptions.available && (
                  <button
                    onClick={() => setOrderType('subscription')}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      orderType === 'subscription'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Abbonamento</span>
                          <Badge variant="secondary" className="text-xs">
                            -{Math.round(((selectedFormat?.price || 0) - (selectedFormat?.subscriberPrice || 0)) / (selectedFormat?.price || 1) * 100)}% risparmio
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Consegna automatica ogni {subscriptionFrequency} settimane
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Puoi saltare, cambiare data o annullare quando vuoi
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          €{selectedFormat?.subscriberPrice.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          €{selectedFormat?.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {/* Subscription Frequency */}
              {orderType === 'subscription' && product.subscriptionOptions.available && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequenza di consegna
                  </label>
                  <Select
                    value={subscriptionFrequency.toString()}
                    onValueChange={(value) => setSubscriptionFrequency(parseInt(value))}
                  >
                    {product.subscriptionOptions.frequencies.map(freq => (
                      <option key={freq} value={freq.toString()}>
                        Ogni {freq} settimane
                        {freq === subscriptionFrequency && ' (consigliato)'}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantità
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="font-medium w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= (selectedFormat?.stockLevel || 0)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || hasWarnings}
                  data-cta-id={`pdp.add_to_cart.${orderType}`}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isOutOfStock
                    ? 'Non disponibile'
                    : hasWarnings
                    ? 'Non adatto al tuo cane'
                    : orderType === 'subscription'
                    ? 'Abbonati & Risparmia'
                    : 'Aggiungi al carrello'
                  }
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={toggleFavorite}
                    data-cta-id="pdp.favorite.toggle"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    {isFavorite ? 'Salvato' : 'Salva'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleShare}
                    data-cta-id="pdp.share"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Condividi
                  </Button>
                </div>
              </div>

              {/* Trust Signals */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Spedizione gratuita da €50</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Pagamenti sicuri</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Consegna in 2-3 giorni</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Garanzia qualità</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b">
              <div className="flex space-x-8 px-6">
                {[
                  { id: 'ingredients', label: 'Ingredienti & Analitica' },
                  { id: 'benefits', label: 'Benefici' },
                  { id: 'feeding', label: 'Come usare' },
                  { id: 'reviews', label: `Recensioni (${product.reviewCount})` },
                  { id: 'faq', label: 'FAQ' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'ingredients' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Ingredienti</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <ul className="space-y-2">
                          {product.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{ingredient}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Analisi Garantita</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Proteine grezze:</span>
                            <span>{product.analyticalConstituents.protein}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Grassi grezzi:</span>
                            <span>{product.analyticalConstituents.fat}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fibre grezze:</span>
                            <span>{product.analyticalConstituents.fiber}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Umidità:</span>
                            <span>{product.analyticalConstituents.moisture}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ceneri grezze:</span>
                            <span>{product.analyticalConstituents.ash}%</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Energia metabolizzabile:</span>
                            <span>{product.analyticalConstituents.calories} kcal/kg</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'benefits' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Benefici principali</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'feeding' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Guida alimentazione</h3>
                    <p className="text-gray-600 mb-4">
                      Le quantità indicate sono indicative e possono variare in base all'età, attività fisica e condizioni del cane.
                      Consultare sempre il veterinario per un piano alimentare personalizzato.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 p-3 text-left">Peso del cane</th>
                            <th className="border border-gray-300 p-3 text-left">Quantità giornaliera</th>
                            <th className="border border-gray-300 p-3 text-left">Numero pasti</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.feedingGuidelines.map((guideline, index) => (
                            <tr key={index} className={guideline.weight === selectedDog.weight ? 'bg-green-50' : ''}>
                              <td className="border border-gray-300 p-3">{guideline.weight}kg</td>
                              <td className="border border-gray-300 p-3">{guideline.dailyAmount}g</td>
                              <td className="border border-gray-300 p-3">
                                {guideline.weight < 15 ? '2-3 pasti' : '2 pasti'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Consigli per il passaggio</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Effettua il cambio gradualmente in 7-10 giorni</li>
                        <li>• Mescola il nuovo alimento con quello precedente aumentando progressivamente la proporzione</li>
                        <li>• Assicurati che abbia sempre acqua fresca a disposizione</li>
                        <li>• Monitora la reazione del cane durante il periodo di transizione</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Rating Summary */}
                    <div className="md:col-span-1">
                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-gray-900">{product.rating}</div>
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < Math.floor(product.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600">{product.reviewCount} recensioni</div>
                      </div>

                      <Button className="w-full mb-4">
                        Scrivi una recensione
                      </Button>
                    </div>

                    {/* Reviews List */}
                    <div className="md:col-span-2 space-y-4">
                      {product.reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-200 pb-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {review.userName[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{review.userName}</span>
                                  {review.verified && (
                                    <Verified className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                                {review.dogName && (
                                  <div className="text-xs text-gray-500">
                                    <Dog className="w-3 h-3 inline mr-1" />
                                    {review.dogName} • {review.dogBreed}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(review.date).toLocaleDateString('it-IT')}
                              </div>
                            </div>
                          </div>

                          <h4 className="font-medium mb-2">{review.title}</h4>
                          <p className="text-gray-600 text-sm mb-3">{review.comment}</p>

                          <div className="flex items-center justify-between">
                            <button className="text-xs text-gray-500 hover:text-gray-700">
                              👍 Utile ({review.helpfulCount})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Domande frequenti</h3>
                  {[
                    {
                      question: 'Questo alimento è adatto a cani con allergie?',
                      answer: 'Sì, è una formula ipoallergenica senza gli allergeni più comuni come pollo, manzo e cereali problematici. Tuttavia, consulta sempre il veterinario per allergie specifiche.'
                    },
                    {
                      question: 'Posso cambiare la frequenza dell\'abbonamento?',
                      answer: 'Assolutamente sì! Puoi modificare la frequenza, saltare una consegna o annullare l\'abbonamento in qualsiasi momento dalla tua area personale.'
                    },
                    {
                      question: 'Come devo conservare il prodotto?',
                      answer: 'Conserva in luogo fresco e asciutto, al riparo dalla luce solare diretta. Dopo l\'apertura, richiudi bene la confezione e consuma entro 6 settimane.'
                    }
                  ].map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium mb-2">{faq.question}</h4>
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </Card>

        {/* Compatibility Modal */}
        {showCompatibilityModal && product.compatibility && (
          <Modal
            isOpen={showCompatibilityModal}
            onClose={() => setShowCompatibilityModal(false)}
            title={`Compatibilità con ${selectedDog.name}`}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {selectedDog.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedDog.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedDog.breed} • {selectedDog.weight}kg • {Math.floor(selectedDog.age / 12)} anni
                  </p>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-900">
                    Compatibilità: {Math.round(product.compatibility.score * 100)}%
                  </span>
                </div>
                <ul className="space-y-1">
                  {product.compatibility.reasons.map((reason, index) => (
                    <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {product.compatibility.warnings.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-900">Attenzioni</span>
                  </div>
                  <ul className="space-y-1">
                    {product.compatibility.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="text-red-500 mt-1">⚠</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Dosage Calculator Modal */}
        {showDosageCalculator && (
          <Modal
            isOpen={showDosageCalculator}
            onClose={() => setShowDosageCalculator(false)}
            title="Calcolatore dosaggio personalizzato"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso attuale
                  </label>
                  <div className="text-lg font-bold">{selectedDog.weight}kg</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Livello di attività
                  </label>
                  <div className="text-lg font-bold capitalize">{selectedDog.activityLevel}</div>
                </div>
              </div>

              {dailyDosage && selectedFormat && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-3">Raccomandazioni per {selectedDog.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Dose giornaliera:</span>
                        <span className="font-medium">{dailyDosage}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Numero di pasti:</span>
                        <span className="font-medium">{selectedDog.weight < 15 ? '2-3 pasti' : '2 pasti'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per pasto:</span>
                        <span className="font-medium">
                          {Math.round(dailyDosage / (selectedDog.weight < 15 ? 3 : 2))}g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Durata {selectedFormat.size}:</span>
                        <span className="font-medium">{durationWeeks} settimane</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frequenza abbonamento:</span>
                        <span className="font-medium">Ogni {subscriptionFrequency} settimane</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      <Info className="w-4 h-4 inline mr-1" />
                      Nota importante
                    </h4>
                    <p className="text-sm text-yellow-800">
                      Questi calcoli sono indicativi. La quantità esatta può variare in base al metabolismo,
                      alla salute e alle specifiche esigenze del cane. Consulta sempre il veterinario per
                      un piano alimentare personalizzato.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}