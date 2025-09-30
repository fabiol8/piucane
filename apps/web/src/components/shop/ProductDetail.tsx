'use client'

/**
 * ProductDetail - Detailed product page component
 * Features: Image gallery, detailed info, compatibility analysis, reviews, related products
 */

import React, { useState, useEffect } from 'react'
import { Star, Heart, ShoppingCart, Package, Truck, Shield, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Info, Award, Users, Calendar, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { trackCTA } from '@/analytics/ga4'
import { ProductData, piuCaneProducts, calculateCompatibilityScore } from '@/lib/products-data'
import { useCart } from '@/hooks/useCart'

interface Dog {
  id: string
  name: string
  breed: string
  weight: number
  age: number // in months
  allergies: string[]
  specialNeeds: string[]
  activityLevel: 'low' | 'medium' | 'high'
}

interface ProductDetailProps {
  productId: string
  selectedDog?: Dog
  className?: string
}

interface Review {
  id: string
  userName: string
  rating: number
  title: string
  comment: string
  date: string
  verified: boolean
  helpful: number
  dogInfo?: {
    name: string
    breed: string
    age: number
  }
}

export function ProductDetail({
  productId,
  selectedDog,
  className = ''
}: ProductDetailProps) {
  const [product, setProduct] = useState<ProductData | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<ProductData['formats'][0] | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<'none' | 'monthly' | 'bimonthly' | 'quarterly'>('none')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'ingredients' | 'feeding' | 'reviews'>('description')
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<ProductData[]>([])
  const [compatibilityInfo, setCompatibilityInfo] = useState<any>(null)

  const { addItem } = useCart()

  useEffect(() => {
    const foundProduct = piuCaneProducts.find(p => p.id === productId)
    if (foundProduct) {
      setProduct(foundProduct)
      setSelectedFormat(foundProduct.formats[0])

      // Calculate compatibility if dog is selected
      if (selectedDog) {
        const score = calculateCompatibilityScore(foundProduct, selectedDog)
        setCompatibilityInfo({
          score,
          isHighlyCompatible: score >= 0.8,
          isCompatible: score >= 0.6,
          recommendations: generateRecommendations(foundProduct, selectedDog),
          warnings: generateWarnings(foundProduct, selectedDog)
        })
      }

      // Load mock reviews
      setReviews(generateMockReviews(foundProduct))

      // Load related products
      const related = piuCaneProducts
        .filter(p => p.id !== productId && (p.category === foundProduct.category || p.tags.some(tag => foundProduct.tags.includes(tag))))
        .slice(0, 4)
      setRelatedProducts(related)

      trackCTA({
        ctaId: 'product_detail.viewed',
        event: 'view_item',
        value: productId,
        metadata: {
          product_name: foundProduct.name,
          product_category: foundProduct.category,
          dog_id: selectedDog?.id
        }
      })
    }
  }, [productId, selectedDog])

  const generateRecommendations = (product: ProductData, dog: Dog): string[] => {
    const recommendations: string[] = []

    if (product.category === 'food') {
      const dailyAmount = calculateDailyAmount(product, dog)
      if (dailyAmount) {
        recommendations.push(`Dose giornaliera consigliata: ${dailyAmount}g`)
      }
    }

    if (product.subscriptionOptions.available) {
      recommendations.push(`Risparmia il 15% con l'abbonamento ogni ${product.subscriptionOptions.recommendedFrequency} settimane`)
    }

    if (product.suitableFor.conditions && dog.specialNeeds.some(need => product.suitableFor.conditions!.includes(need))) {
      recommendations.push('Specifico per le esigenze del tuo cane')
    }

    return recommendations
  }

  const generateWarnings = (product: ProductData, dog: Dog): string[] => {
    const warnings: string[] = []

    // Check allergies
    const allergicIngredients = product.allergens.filter(allergen =>
      dog.allergies.some(dogAllergy =>
        allergen.toLowerCase().includes(dogAllergy.toLowerCase()) ||
        dogAllergy.toLowerCase().includes(allergen.toLowerCase())
      )
    )

    if (allergicIngredients.length > 0) {
      warnings.push(`Contiene ${allergicIngredients.join(', ')} - allergeni per ${dog.name}`)
    }

    // Check age suitability
    if (product.suitableFor.ageMin && dog.age < product.suitableFor.ageMin) {
      warnings.push('Prodotto consigliato per cani più grandi')
    }

    if (product.suitableFor.ageMax && dog.age > product.suitableFor.ageMax) {
      warnings.push('Prodotto consigliato per cani più giovani')
    }

    return warnings
  }

  const calculateDailyAmount = (product: ProductData, dog: Dog): number | null => {
    if (product.category !== 'food') return null

    const guideline = product.feedingGuidelines.find(g => dog.weight <= g.weight) ||
                     product.feedingGuidelines[product.feedingGuidelines.length - 1]

    if (!guideline) return null

    let amount = guideline.dailyAmount

    // Adjust for activity level
    switch (dog.activityLevel) {
      case 'low': amount *= 0.85; break
      case 'high': amount *= 1.15; break
    }

    return Math.round(amount)
  }

  const generateMockReviews = (product: ProductData): Review[] => {
    // Mock reviews - in real app would come from API
    return [
      {
        id: '1',
        userName: 'Maria R.',
        rating: 5,
        title: 'Ottimo prodotto!',
        comment: 'Il mio Golden Retriever lo adora. Qualità eccellente e consegna veloce.',
        date: '2024-01-15',
        verified: true,
        helpful: 12,
        dogInfo: { name: 'Rex', breed: 'Golden Retriever', age: 36 }
      },
      {
        id: '2',
        userName: 'Giuseppe M.',
        rating: 4,
        title: 'Buona qualità',
        comment: 'Prodotto di qualità, anche se il prezzo è un po\' alto. Ne vale la pena.',
        date: '2024-01-10',
        verified: true,
        helpful: 8,
        dogInfo: { name: 'Luna', breed: 'Labrador', age: 24 }
      }
    ]
  }

  const handleAddToCart = async () => {
    if (!product || !selectedFormat || isAddingToCart) return

    setIsAddingToCart(true)

    try {
      addItem(product.id, selectedFormat.id, quantity, {
        subscriptionFrequency,
        personalizedDosage: selectedDog && product.category === 'food' ? {
          dailyAmount: calculateDailyAmount(product, selectedDog) || 0,
          duration: selectedFormat.estimatedDuration
        } : undefined
      })

      trackCTA({
        ctaId: 'product_detail.add_to_cart',
        event: 'add_to_cart',
        value: product.id,
        metadata: {
          product_name: product.name,
          format_size: selectedFormat.size,
          quantity,
          subscription: subscriptionFrequency !== 'none',
          price: selectedFormat.subscriberPrice * quantity
        }
      })

      setTimeout(() => setIsAddingToCart(false), 1000)
    } catch (error) {
      console.error('Error adding to cart:', error)
      setIsAddingToCart(false)
    }
  }

  const handleSubscriptionSetup = () => {
    setShowSubscriptionModal(true)
    trackCTA({
      ctaId: 'product_detail.subscription.setup',
      event: 'subscription_interest',
      value: product?.id || '',
      metadata: { source: 'product_detail' }
    })
  }

  if (!product) {
    return (
      <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={product.images[selectedImageIndex] || '/placeholder-product.jpg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />

            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={() => setSelectedImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={() => setSelectedImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFavorite(!isFavorite)}
              className="absolute top-4 right-4 bg-white/80 hover:bg-white"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </Button>
          </div>

          {/* Thumbnail Gallery */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                    selectedImageIndex === index ? 'border-green-500' : 'border-transparent'
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
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{product.brand}</Badge>
              {product.certifications.map(cert => (
                <Badge key={cert} variant="outline" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  {cert}
                </Badge>
              ))}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-lg text-gray-600">{product.shortDescription}</p>

            {/* Rating and Reviews */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= product.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
              </div>
              <button
                onClick={() => setActiveTab('reviews')}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                {product.reviewCount} recensioni
              </button>
            </div>
          </div>

          {/* Compatibility Info */}
          {selectedDog && compatibilityInfo && (
            <Card className={`${compatibilityInfo.warnings.length > 0 ? 'border-red-200 bg-red-50' :
                            compatibilityInfo.isHighlyCompatible ? 'border-green-200 bg-green-50' :
                            'border-blue-200 bg-blue-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {compatibilityInfo.warnings.length > 0 ? (
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  ) : compatibilityInfo.isHighlyCompatible ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  )}

                  <div className="flex-1">
                    <h3 className={`font-medium mb-2 ${
                      compatibilityInfo.warnings.length > 0 ? 'text-red-800' :
                      compatibilityInfo.isHighlyCompatible ? 'text-green-800' :
                      'text-blue-800'
                    }`}>
                      {compatibilityInfo.warnings.length > 0 ? `⚠️ Attenzione per ${selectedDog.name}` :
                       compatibilityInfo.isHighlyCompatible ? `✅ Perfetto per ${selectedDog.name}` :
                       `ℹ️ Informazioni per ${selectedDog.name}`}
                    </h3>

                    {compatibilityInfo.warnings.length > 0 ? (
                      <ul className="text-sm text-red-700 space-y-1">
                        {compatibilityInfo.warnings.map((warning: string, index: number) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {compatibilityInfo.recommendations.map((rec: string, index: number) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Format Selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Scegli il formato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.formats.map(format => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedFormat?.id === format.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{format.size}</div>
                  <div className="text-sm text-gray-600">
                    €{format.subscriberPrice.toFixed(2)}
                    {format.price > format.subscriberPrice && (
                      <span className="line-through ml-2">€{format.price.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format.inStock ? `${format.stockLevel} disponibili` : 'Esaurito'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Price and Subscription */}
          <div className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-green-600">
                €{((selectedFormat?.subscriberPrice || 0) * quantity).toFixed(2)}
              </div>
              {selectedFormat && selectedFormat.price > selectedFormat.subscriberPrice && (
                <div className="text-lg text-gray-500 line-through">
                  €{(selectedFormat.price * quantity).toFixed(2)}
                </div>
              )}
              <div className="text-sm text-gray-600">
                Prezzo per abbonati • Spedizione gratuita sopra €49
              </div>
            </div>

            {/* Subscription Options */}
            {product.subscriptionOptions.available && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Risparmia con l'abbonamento</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Ricevi automaticamente ogni {product.subscriptionOptions.recommendedFrequency} settimane
                  e risparmia il 15% su ogni ordine
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['none', 'monthly', 'bimonthly', 'quarterly'].map(freq => (
                    <button
                      key={freq}
                      onClick={() => setSubscriptionFrequency(freq as any)}
                      className={`p-2 text-sm rounded ${
                        subscriptionFrequency === freq
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-blue-200 text-blue-700'
                      }`}
                    >
                      {freq === 'none' ? 'Una volta' :
                       freq === 'monthly' ? 'Ogni mese' :
                       freq === 'bimonthly' ? 'Ogni 2 mesi' :
                       'Ogni 3 mesi'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantità
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!selectedFormat?.inStock || isAddingToCart}
                loading={isAddingToCart}
              >
                {isAddingToCart ? (
                  'Aggiungendo...'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Aggiungi al carrello
                  </>
                )}
              </Button>

              {product.subscriptionOptions.available && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSubscriptionSetup}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Abbonamento
                </Button>
              )}
            </div>
          </div>

          {/* Shipping Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span>Spedizione in 24-48h</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Soddisfatti o rimborsati</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'description', label: 'Descrizione' },
            { id: 'ingredients', label: 'Ingredienti' },
            { id: 'feeding', label: 'Dosaggio' },
            { id: 'reviews', label: 'Recensioni' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'description' && (
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-6">{product.longDescription}</p>

              <h3 className="text-xl font-semibold mb-4">Benefici principali</h3>
              <ul className="space-y-2">
                {product.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Lista ingredienti</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Ingredienti</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {product.ingredients.map((ingredient, index) => (
                      <li key={index}>• {ingredient}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Valori nutrizionali</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Proteine:</span>
                      <span className="font-medium">{product.analyticalConstituents.protein}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Grassi:</span>
                      <span className="font-medium">{product.analyticalConstituents.fat}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fibre:</span>
                      <span className="font-medium">{product.analyticalConstituents.fiber}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Umidità:</span>
                      <span className="font-medium">{product.analyticalConstituents.moisture}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ceneri:</span>
                      <span className="font-medium">{product.analyticalConstituents.ash}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calorie:</span>
                      <span className="font-medium">{product.analyticalConstituents.calories} kcal/kg</span>
                    </div>
                  </div>
                </div>
              </div>

              {product.allergens.length > 0 && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">Allergeni</h4>
                  <p className="text-sm text-orange-700">
                    Contiene: {product.allergens.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feeding' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Guida al dosaggio</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        Peso del cane
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        Dose giornaliera
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {product.feedingGuidelines.map((guideline, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {guideline.weight}kg
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {guideline.dailyAmount}g
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedDog && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Dose personalizzata per {selectedDog.name}
                  </h4>
                  <p className="text-sm text-blue-700">
                    Basata su peso ({selectedDog.weight}kg) e livello di attività ({selectedDog.activityLevel}):
                    <span className="font-medium ml-1">
                      {calculateDailyAmount(product, selectedDog)}g al giorno
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Recensioni clienti</h3>
                <Button variant="outline" size="sm">
                  Scrivi una recensione
                </Button>
              </div>

              <div className="space-y-6">
                {reviews.map(review => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{review.userName}</span>
                            {review.verified && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verificato
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>

                      <h4 className="font-medium mb-2">{review.title}</h4>
                      <p className="text-gray-700 mb-4">{review.comment}</p>

                      {review.dogInfo && (
                        <div className="text-sm text-gray-500 mb-4">
                          Cane: {review.dogInfo.name} • {review.dogInfo.breed} • {Math.floor(review.dogInfo.age / 12)} anni
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <button className="hover:text-gray-700">
                          👍 Utile ({review.helpful})
                        </button>
                        <button className="hover:text-gray-700">
                          Rispondi
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prodotti correlati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {relatedProducts.map(relatedProduct => (
                <div key={relatedProduct.id} className="flex gap-3">
                  <img
                    src={relatedProduct.images[0]}
                    alt={relatedProduct.name}
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">
                      {relatedProduct.name}
                    </h4>
                    <p className="text-sm text-green-600 font-medium">
                      €{relatedProduct.subscriberPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Product Guarantees */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Garanzie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Soddisfatti o rimborsati</div>
                  <div className="text-xs text-gray-600">30 giorni per il reso</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Spedizione veloce</div>
                  <div className="text-xs text-gray-600">Consegna in 24-48h</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Supporto specializzato</div>
                  <div className="text-xs text-gray-600">Team di esperti disponibile</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Setup Modal */}
      <Modal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title="Configura abbonamento"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Configura il tuo abbonamento per ricevere automaticamente {product.name}
            e risparmiare il 15% su ogni ordine.
          </p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Frequenza di consegna
            </label>
            {product.subscriptionOptions.frequencies.map(weeks => (
              <div key={weeks} className="flex items-center">
                <input
                  type="radio"
                  id={`freq-${weeks}`}
                  name="frequency"
                  className="mr-3"
                />
                <label htmlFor={`freq-${weeks}`} className="flex-1">
                  Ogni {weeks} settimane
                </label>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Button className="w-full" onClick={() => setShowSubscriptionModal(false)}>
              Avvia abbonamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}