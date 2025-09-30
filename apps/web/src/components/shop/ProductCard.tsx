'use client'

/**
 * ProductCard - Individual product display component
 * Features: Grid/list views, compatibility indicators, dosage info, cart integration
 */

import React, { useState } from 'react'
import { Star, Heart, ShoppingCart, AlertCircle, CheckCircle, Package, Zap, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackCTA } from '@/analytics/ga4'
import { ProductData } from '@/lib/products-data'
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

interface ProductCardProps {
  product: ProductData & { compatibilityScore?: number; isRecommended?: boolean }
  selectedDog?: Dog
  viewMode?: 'grid' | 'list'
  isFavorite?: boolean
  onToggleFavorite?: () => void
  showCompatibility?: boolean
  showActions?: boolean
  className?: string
}

export function ProductCard({
  product,
  selectedDog,
  viewMode = 'grid',
  isFavorite = false,
  onToggleFavorite,
  showCompatibility = true,
  showActions = true,
  className = ''
}: ProductCardProps) {
  const [selectedFormat, setSelectedFormat] = useState(product.formats[0])
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { addItem } = useCart()

  const compatibilityInfo = getCompatibilityInfo()
  const dosageInfo = getDosageInfo()
  const stockInfo = getStockInfo()

  function getCompatibilityInfo() {
    if (!selectedDog || !showCompatibility) return null

    const score = product.compatibilityScore || 0
    const warnings: string[] = []
    const benefits: string[] = []

    // Check allergies
    const hasAllergicIngredients = product.allergens.some(allergen =>
      selectedDog.allergies.some(dogAllergy =>
        allergen.toLowerCase().includes(dogAllergy.toLowerCase()) ||
        dogAllergy.toLowerCase().includes(allergen.toLowerCase())
      )
    )

    if (hasAllergicIngredients) {
      warnings.push(`Contiene ${product.allergens.join(', ')} - allergeni per ${selectedDog.name}`)
    }

    // Check age suitability
    if (product.suitableFor.ageMin && product.suitableFor.ageMax) {
      if (selectedDog.age >= product.suitableFor.ageMin && selectedDog.age <= product.suitableFor.ageMax) {
        benefits.push(`Perfetto per l'età di ${selectedDog.name}`)
      } else {
        warnings.push('Non adatto all\'età del tuo cane')
      }
    }

    // Check weight suitability
    if (product.suitableFor.weightMin && product.suitableFor.weightMax) {
      if (selectedDog.weight >= product.suitableFor.weightMin && selectedDog.weight <= product.suitableFor.weightMax) {
        benefits.push(`Adatto al peso di ${selectedDog.name} (${selectedDog.weight}kg)`)
      }
    }

    // Check special needs
    if (selectedDog.specialNeeds.length > 0 && product.suitableFor.conditions) {
      const matchingConditions = selectedDog.specialNeeds.filter(need =>
        product.suitableFor.conditions!.includes(need)
      )
      if (matchingConditions.length > 0) {
        benefits.push(`Supporta: ${matchingConditions.join(', ')}`)
      }
    }

    return {
      score,
      warnings,
      benefits,
      isHighlyCompatible: score >= 0.8,
      isCompatible: score >= 0.6,
      hasWarnings: warnings.length > 0
    }
  }

  function getDosageInfo() {
    if (product.category !== 'food' || !selectedDog) return null

    // Find matching feeding guideline
    const guideline = product.feedingGuidelines.find(g => selectedDog.weight <= g.weight) ||
                     product.feedingGuidelines[product.feedingGuidelines.length - 1]

    if (!guideline) return null

    let dailyAmount = guideline.dailyAmount

    // Adjust for activity level
    switch (selectedDog.activityLevel) {
      case 'low':
        dailyAmount *= 0.85
        break
      case 'high':
        dailyAmount *= 1.15
        break
    }

    const durationDays = Math.floor((selectedFormat.weight * 1000) / dailyAmount)
    const weeks = Math.floor(durationDays / 7)

    return {
      dailyAmount: Math.round(dailyAmount),
      durationDays,
      weeks,
      text: `~${Math.round(dailyAmount)}g/giorno • ${weeks > 0 ? `${weeks} settimane` : `${durationDays} giorni`}`
    }
  }

  function getStockInfo() {
    const inStock = selectedFormat.inStock
    const stockLevel = selectedFormat.stockLevel

    if (!inStock) {
      return { status: 'out', message: 'Esaurito', className: 'text-red-600' }
    }

    if (stockLevel <= 3) {
      return { status: 'low', message: `Solo ${stockLevel} disponibili`, className: 'text-orange-600' }
    }

    if (stockLevel <= 10) {
      return { status: 'medium', message: 'Disponibilità limitata', className: 'text-yellow-600' }
    }

    return { status: 'high', message: 'Disponibile', className: 'text-green-600' }
  }

  const handleAddToCart = async () => {
    if (!selectedFormat.inStock || isAddingToCart) return

    setIsAddingToCart(true)

    try {
      addItem(product.id, selectedFormat.id, 1)

      trackCTA({
        ctaId: 'product.add_to_cart',
        event: 'add_to_cart',
        value: product.id,
        metadata: {
          product_name: product.name,
          product_category: product.category,
          format_size: selectedFormat.size,
          price: selectedFormat.subscriberPrice,
          compatibility_score: product.compatibilityScore,
          dog_id: selectedDog?.id
        }
      })

      // Show success feedback (in real app would use toast)
      setTimeout(() => setIsAddingToCart(false), 1000)
    } catch (error) {
      console.error('Error adding to cart:', error)
      setIsAddingToCart(false)
    }
  }

  const handleViewDetails = () => {
    trackCTA({
      ctaId: 'product.view_details',
      event: 'select_item',
      value: product.id,
      metadata: {
        source: 'product_card',
        view_mode: viewMode,
        compatibility_score: product.compatibilityScore
      }
    })

    window.location.href = `/shop/products/${product.id}`
  }

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite()
      trackCTA({
        ctaId: 'product.favorite.toggle',
        event: 'toggle_favorite',
        value: isFavorite ? 'remove' : 'add',
        metadata: { product_id: product.id }
      })
    }
  }

  // Render based on view mode
  if (viewMode === 'list') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div
              className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 cursor-pointer overflow-hidden"
              onClick={handleViewDetails}
            >
              <img
                src={product.images[0] || '/placeholder-product.jpg'}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.jpg'
                }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {compatibilityInfo?.isHighlyCompatible && (
                      <Badge variant="default" className="bg-green-500 text-white text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Perfetto per {selectedDog?.name}
                      </Badge>
                    )}
                    {compatibilityInfo?.isCompatible && !compatibilityInfo.isHighlyCompatible && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Adatto
                      </Badge>
                    )}
                    {compatibilityInfo?.hasWarnings && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Attenzione
                      </Badge>
                    )}
                    {product.subscriberPrice < product.price && (
                      <Badge variant="secondary" className="text-xs">
                        -{Math.round(((product.price - product.subscriberPrice) / product.price) * 100)}% abbonati
                      </Badge>
                    )}
                    {product.isRecommended && (
                      <Badge className="bg-blue-500 text-white text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Consigliato
                      </Badge>
                    )}
                  </div>

                  {/* Title and Brand */}
                  <h3
                    className="font-semibold text-gray-900 hover:text-green-600 cursor-pointer line-clamp-2 mb-1"
                    onClick={handleViewDetails}
                  >
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{product.brand}</p>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{product.shortDescription}</p>

                  {/* Dosage Info */}
                  {dosageInfo && (
                    <p className="text-xs text-blue-600 mb-2">
                      <Package className="w-3 h-3 inline mr-1" />
                      {dosageInfo.text}
                    </p>
                  )}

                  {/* Rating and Reviews */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{product.rating}</span>
                    </div>
                    <span className="text-xs text-gray-500">({product.reviewCount} recensioni)</span>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="mb-3">
                    <div className="text-lg font-bold text-green-600">
                      €{selectedFormat.subscriberPrice.toFixed(2)}
                    </div>
                    {selectedFormat.price > selectedFormat.subscriberPrice && (
                      <div className="text-sm text-gray-500 line-through">
                        €{selectedFormat.price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Format Selector */}
                  {product.formats.length > 1 && (
                    <select
                      value={selectedFormat.size}
                      onChange={(e) => {
                        const format = product.formats.find(f => f.size === e.target.value)
                        if (format) setSelectedFormat(format)
                      }}
                      className="mb-3 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                    >
                      {product.formats.map(format => (
                        <option key={format.id} value={format.size}>
                          {format.size}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Stock Info */}
                  <p className={`text-xs mb-3 ${stockInfo.className}`}>
                    {stockInfo.message}
                  </p>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleFavorite}
                        className="p-2"
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleAddToCart}
                        disabled={!selectedFormat.inStock || isAddingToCart}
                        loading={isAddingToCart}
                        className="flex-1"
                      >
                        {isAddingToCart ? (
                          'Aggiungendo...'
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Aggiungi
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {compatibilityInfo?.hasWarnings && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-red-700">
                      {compatibilityInfo.warnings.map((warning, index) => (
                        <p key={index}>{warning}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Grid view
  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardContent className="p-4">
        {/* Image */}
        <div className="relative mb-4">
          <div
            className="aspect-square bg-gray-100 rounded-lg cursor-pointer overflow-hidden group"
            onClick={handleViewDetails}
          >
            <img
              src={product.images[0] || '/placeholder-product.jpg'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-product.jpg'
              }}
            />
          </div>

          {/* Favorite Button */}
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </Button>
          )}

          {/* Stock Badge */}
          {!selectedFormat.inStock && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              Esaurito
            </div>
          )}

          {/* Recommended Badge */}
          {product.isRecommended && (
            <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              Consigliato
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {compatibilityInfo?.isHighlyCompatible && (
              <Badge variant="default" className="bg-green-500 text-white text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Perfetto
              </Badge>
            )}
            {compatibilityInfo?.isCompatible && !compatibilityInfo.isHighlyCompatible && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Adatto
              </Badge>
            )}
            {compatibilityInfo?.hasWarnings && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Attenzione
              </Badge>
            )}
            {product.subscriberPrice < product.price && (
              <Badge variant="secondary" className="text-xs">
                -{Math.round(((product.price - product.subscriberPrice) / product.price) * 100)}%
              </Badge>
            )}
          </div>

          {/* Title and Brand */}
          <div>
            <h3
              className="font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-green-600 transition-colors"
              onClick={handleViewDetails}
            >
              {product.name}
            </h3>
            <p className="text-sm text-gray-600">{product.brand}</p>
          </div>

          {/* Dosage Info */}
          {dosageInfo && (
            <p className="text-xs text-blue-600">
              <Package className="w-3 h-3 inline mr-1" />
              {dosageInfo.text}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{product.rating}</span>
            </div>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>

          {/* Format Selector */}
          {product.formats.length > 1 && (
            <select
              value={selectedFormat.size}
              onChange={(e) => {
                const format = product.formats.find(f => f.size === e.target.value)
                if (format) setSelectedFormat(format)
              }}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              {product.formats.map(format => (
                <option key={format.id} value={format.size}>
                  {format.size} - €{format.subscriberPrice.toFixed(2)}
                </option>
              ))}
            </select>
          )}

          {/* Price */}
          <div>
            <div className="text-lg font-bold text-green-600">
              €{selectedFormat.subscriberPrice.toFixed(2)}
            </div>
            {selectedFormat.price > selectedFormat.subscriberPrice && (
              <div className="text-sm text-gray-500 line-through">
                €{selectedFormat.price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Stock Info */}
          <p className={`text-xs ${stockInfo.className}`}>
            {stockInfo.message}
          </p>

          {/* Add to Cart Button */}
          {showActions && (
            <Button
              className="w-full"
              onClick={handleAddToCart}
              disabled={!selectedFormat.inStock || isAddingToCart}
              loading={isAddingToCart}
            >
              {isAddingToCart ? (
                'Aggiungendo...'
              ) : !selectedFormat.inStock ? (
                'Non disponibile'
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Aggiungi al carrello
                </>
              )}
            </Button>
          )}

          {/* Warnings */}
          {compatibilityInfo?.hasWarnings && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-700">
                  {compatibilityInfo.warnings.map((warning, index) => (
                    <p key={index}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}