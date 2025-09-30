'use client'

/**
 * ProductCatalog - Main product listing component with smart filtering
 * Features: Grid/list view, smart dog-based filtering, category filters, search
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Grid3X3, List, Star, Heart, ShoppingCart, Dog, AlertCircle, CheckCircle, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackCTA } from '@/analytics/ga4'
import { piuCaneProducts, ProductData, calculateCompatibilityScore, getProductsForDog } from '@/lib/products-data'
import { ProductCard } from './ProductCard'
import { ProductFilters } from './ProductFilters'

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

interface ProductCatalogProps {
  selectedDog?: Dog
  onDogChange?: (dogId: string) => void
  availableDogs?: Dog[]
  initialCategory?: string
  showDogSelector?: boolean
  maxProducts?: number
  className?: string
}

interface Filters {
  ageGroup: 'all' | 'puppy' | 'adult' | 'senior'
  size: 'all' | 'small' | 'medium' | 'large'
  priceRange: { min: number; max: number }
  allergyFree: string[]
  inStock: boolean
  subscriberOnly: boolean
  brands: string[]
  tags: string[]
  minRating: number
}

export function ProductCatalog({
  selectedDog,
  onDogChange,
  availableDogs = [],
  initialCategory = 'all',
  showDogSelector = true,
  maxProducts,
  className = ''
}: ProductCatalogProps) {
  const [products, setProducts] = useState<ProductData[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<Filters>({
    ageGroup: 'all',
    size: 'all',
    priceRange: { min: 0, max: 100 },
    allergyFree: [],
    inStock: true,
    subscriberOnly: false,
    brands: [],
    tags: [],
    minRating: 0
  })

  // Load products and apply dog-based filtering
  useEffect(() => {
    setLoading(true)
    try {
      let productList = [...piuCaneProducts]

      // Apply dog-based smart filtering if dog is selected
      if (selectedDog) {
        productList = productList.map(product => ({
          ...product,
          compatibilityScore: calculateCompatibilityScore(product, selectedDog),
          isRecommended: getProductsForDog(selectedDog).some(p => p.id === product.id)
        }))
      }

      setProducts(productList)
      trackCTA({
        ctaId: 'catalog.loaded',
        event: 'page_view',
        metadata: {
          productCount: productList.length,
          dogId: selectedDog?.id,
          category: selectedCategory
        }
      })
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDog, selectedCategory])

  // Apply filters and search
  const applyFiltersAndSearch = useMemo(() => {
    let filtered = [...products]

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query)) ||
        product.ingredients.some(ingredient => ingredient.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Age group filter
    if (filters.ageGroup !== 'all') {
      const ageRanges = {
        puppy: [0, 12],
        adult: [12, 84],
        senior: [84, 200]
      }
      const [minAge, maxAge] = ageRanges[filters.ageGroup]
      filtered = filtered.filter(product =>
        !product.suitableFor.ageMin || !product.suitableFor.ageMax ||
        (product.suitableFor.ageMin <= maxAge && product.suitableFor.ageMax >= minAge)
      )
    }

    // Size filter (based on weight)
    if (filters.size !== 'all') {
      const sizeRanges = {
        small: [0, 10],
        medium: [10, 25],
        large: [25, 100]
      }
      const [minWeight, maxWeight] = sizeRanges[filters.size]
      filtered = filtered.filter(product =>
        !product.suitableFor.weightMin || !product.suitableFor.weightMax ||
        (product.suitableFor.weightMin <= maxWeight && product.suitableFor.weightMax >= minWeight)
      )
    }

    // Price range filter
    filtered = filtered.filter(product =>
      product.price >= filters.priceRange.min && product.price <= filters.priceRange.max
    )

    // Allergy-free filter
    if (filters.allergyFree.length > 0) {
      filtered = filtered.filter(product =>
        !filters.allergyFree.some(allergen => product.allergens.includes(allergen))
      )
    }

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product =>
        product.formats.some(format => format.inStock)
      )
    }

    // Subscriber only filter
    if (filters.subscriberOnly) {
      filtered = filtered.filter(product => product.subscriberPrice < product.price)
    }

    // Brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => filters.brands.includes(product.brand))
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(product =>
        filters.tags.some(tag => product.tags.includes(tag))
      )
    }

    // Minimum rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(product => product.rating >= filters.minRating)
    }

    // Apply sorting
    switch (sortBy) {
      case 'recommended':
        if (selectedDog) {
          filtered.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0))
        } else {
          filtered.sort((a, b) => b.rating - a.rating)
        }
        break
      case 'price_low':
        filtered.sort((a, b) => a.subscriberPrice - b.subscriberPrice)
        break
      case 'price_high':
        filtered.sort((a, b) => b.subscriberPrice - a.subscriberPrice)
        break
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
        // For now, keep original order (in real app would sort by creation date)
        break
    }

    // Apply max products limit
    if (maxProducts && filtered.length > maxProducts) {
      filtered = filtered.slice(0, maxProducts)
    }

    return filtered
  }, [products, searchQuery, selectedCategory, filters, sortBy, selectedDog, maxProducts])

  useEffect(() => {
    setFilteredProducts(applyFiltersAndSearch)
  }, [applyFiltersAndSearch])

  const handleDogChange = (dogId: string) => {
    if (onDogChange) {
      onDogChange(dogId)
      trackCTA({
        ctaId: 'catalog.dog.switched',
        event: 'dog_switched',
        value: dogId,
        metadata: { fromDog: selectedDog?.id, toDog: dogId }
      })
    }
  }

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites)
    if (favorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)

    trackCTA({
      ctaId: 'catalog.favorite.toggle',
      event: 'toggle_favorite',
      value: favorites.has(productId) ? 'remove' : 'add',
      metadata: { productId }
    })
  }

  const resetFilters = () => {
    setFilters({
      ageGroup: 'all',
      size: 'all',
      priceRange: { min: 0, max: 100 },
      allergyFree: [],
      inStock: true,
      subscriberOnly: false,
      brands: [],
      tags: [],
      minRating: 0
    })
    setSearchQuery('')
    setSelectedCategory('all')
    setSortBy('recommended')

    trackCTA({
      ctaId: 'catalog.filters.reset',
      event: 'filters_reset',
      value: 'all_filters_cleared'
    })
  }

  const categories = [
    { id: 'all', name: 'Tutti i prodotti', icon: '🐕' },
    { id: 'food', name: 'Alimentazione', icon: '🥘' },
    { id: 'treats', name: 'Snack e premi', icon: '🦴' },
    { id: 'toys', name: 'Giocattoli', icon: '🎾' },
    { id: 'accessories', name: 'Accessori', icon: '🎀' },
    { id: 'health', name: 'Salute e cura', icon: '💊' },
    { id: 'grooming', name: 'Toelettatura', icon: '🧴' }
  ]

  const sortOptions = [
    { id: 'recommended', name: selectedDog ? `Consigliati per ${selectedDog.name}` : 'Più apprezzati' },
    { id: 'price_low', name: 'Prezzo crescente' },
    { id: 'price_high', name: 'Prezzo decrescente' },
    { id: 'rating', name: 'Migliori recensioni' },
    { id: 'name', name: 'Nome A-Z' },
    { id: 'newest', name: 'Novità' }
  ]

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Dog Selector */}
      {showDogSelector && selectedDog && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Dog className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-medium text-gray-900">
                  Risultati personalizzati per {selectedDog.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedDog.breed} • {selectedDog.weight}kg • {Math.floor(selectedDog.age / 12)} anni
                  {selectedDog.allergies.length > 0 && (
                    <span className="text-orange-600 ml-2">
                      • Allergico a: {selectedDog.allergies.join(', ')}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {availableDogs.length > 1 && (
              <select
                value={selectedDog.id}
                onChange={(e) => handleDogChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {availableDogs.map(dog => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name} ({dog.breed})
                  </option>
                ))}
              </select>
            )}
          </div>
        </Card>
      )}

      {/* Search and Quick Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Cerca prodotti, ingredienti, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="text-xs"
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>

          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>

              {/* Advanced Filters Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-cta-id="catalog.filters.toggle"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtri
                {Object.values(filters).some(v =>
                  (Array.isArray(v) && v.length > 0) ||
                  (typeof v === 'object' && v !== null && 'min' in v && (v.min > 0 || v.max < 100)) ||
                  (typeof v === 'boolean' && v) ||
                  (typeof v === 'number' && v > 0) ||
                  (typeof v === 'string' && v !== 'all')
                ) && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    !
                  </Badge>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  data-cta-id="catalog.view.grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  data-cta-id="catalog.view.list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Results Count */}
              <span className="text-sm text-gray-600">
                {filteredProducts.length} prodotti
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <ProductFilters
          filters={filters}
          onFiltersChange={setFilters}
          selectedDog={selectedDog}
          onReset={resetFilters}
        />
      )}

      {/* Results */}
      {filteredProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nessun prodotto trovato
          </h3>
          <p className="text-gray-600 mb-4">
            Prova a modificare i filtri o i termini di ricerca
          </p>
          <Button onClick={resetFilters} data-cta-id="catalog.filters.reset">
            Resetta filtri
          </Button>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selectedDog={selectedDog}
              viewMode={viewMode}
              isFavorite={favorites.has(product.id)}
              onToggleFavorite={() => toggleFavorite(product.id)}
              showCompatibility={!!selectedDog}
            />
          ))}
        </div>
      )}

      {/* Load More (if maxProducts is set and there are more products) */}
      {maxProducts && filteredProducts.length === maxProducts && (
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">
            Stai visualizzando i primi {maxProducts} prodotti
          </p>
          <Button
            variant="outline"
            onClick={() => {
              // In a real app, this would load more products or navigate to full catalog
              window.location.href = '/shop'
            }}
            data-cta-id="catalog.load_more"
          >
            Vedi tutti i prodotti
          </Button>
        </Card>
      )}
    </div>
  )
}