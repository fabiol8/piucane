'use client'

/**
 * ProductFilters - Advanced filtering component for product catalog
 * Features: Age, size, price, allergy, brand, rating filters with smart suggestions
 */

import React, { useState } from 'react'
import { X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackCTA } from '@/analytics/ga4'

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

interface ProductFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  selectedDog?: Dog
  onReset: () => void
  className?: string
}

const COMMON_ALLERGENS = [
  'pollo', 'manzo', 'agnello', 'pesce', 'maiale',
  'grano', 'mais', 'soia', 'uova', 'latticini'
]

const AVAILABLE_BRANDS = [
  'PiùCane', 'Royal Canin', 'Hill\'s', 'Eukanuba', 'Acana', 'Orijen'
]

const PRODUCT_TAGS = [
  'grain-free', 'hypoallergenic', 'organic', 'puppy', 'adult', 'senior',
  'small-breed', 'large-breed', 'weight-management', 'dental-care',
  'joint-support', 'sensitive-stomach', 'made-in-italy'
]

const TAG_LABELS: Record<string, string> = {
  'grain-free': 'Senza cereali',
  'hypoallergenic': 'Ipoallergenico',
  'organic': 'Biologico',
  'puppy': 'Cuccioli',
  'adult': 'Adulti',
  'senior': 'Senior',
  'small-breed': 'Taglia piccola',
  'large-breed': 'Taglia grande',
  'weight-management': 'Controllo peso',
  'dental-care': 'Igiene dentale',
  'joint-support': 'Supporto articolare',
  'sensitive-stomach': 'Stomaco sensibile',
  'made-in-italy': 'Made in Italy'
}

export function ProductFilters({
  filters,
  onFiltersChange,
  selectedDog,
  onReset,
  className = ''
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const newFilters = { ...filters, [key]: value }
    onFiltersChange(newFilters)

    trackCTA({
      ctaId: 'filters.changed',
      event: 'filter_applied',
      value: key,
      metadata: { filterValue: value, dogId: selectedDog?.id }
    })
  }

  const toggleArrayFilter = <K extends keyof Filters>(
    key: K,
    value: string,
    currentArray: string[]
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    updateFilter(key, newArray as Filters[K])
  }

  const handlePriceRangeChange = (min?: number, max?: number) => {
    updateFilter('priceRange', {
      min: min !== undefined ? min : filters.priceRange.min,
      max: max !== undefined ? max : filters.priceRange.max
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0

    if (filters.ageGroup !== 'all') count++
    if (filters.size !== 'all') count++
    if (filters.priceRange.min > 0 || filters.priceRange.max < 100) count++
    if (filters.allergyFree.length > 0) count++
    if (filters.brands.length > 0) count++
    if (filters.tags.length > 0) count++
    if (filters.minRating > 0) count++
    if (filters.subscriberOnly) count++

    return count
  }

  const getSuggestedFilters = () => {
    if (!selectedDog) return []

    const suggestions: Array<{ type: string; value: string; label: string; reason: string }> = []

    // Age-based suggestions
    if (selectedDog.age < 12 && filters.ageGroup === 'all') {
      suggestions.push({
        type: 'ageGroup',
        value: 'puppy',
        label: 'Prodotti per cuccioli',
        reason: `${selectedDog.name} è un cucciolo`
      })
    } else if (selectedDog.age >= 84 && filters.ageGroup === 'all') {
      suggestions.push({
        type: 'ageGroup',
        value: 'senior',
        label: 'Prodotti per cani senior',
        reason: `${selectedDog.name} è un cane anziano`
      })
    }

    // Size-based suggestions
    if (selectedDog.weight <= 10 && filters.size === 'all') {
      suggestions.push({
        type: 'size',
        value: 'small',
        label: 'Prodotti per taglia piccola',
        reason: `${selectedDog.name} è di taglia piccola`
      })
    } else if (selectedDog.weight >= 25 && filters.size === 'all') {
      suggestions.push({
        type: 'size',
        value: 'large',
        label: 'Prodotti per taglia grande',
        reason: `${selectedDog.name} è di taglia grande`
      })
    }

    // Allergy-based suggestions
    selectedDog.allergies.forEach(allergy => {
      if (!filters.allergyFree.includes(allergy) && COMMON_ALLERGENS.includes(allergy)) {
        suggestions.push({
          type: 'allergyFree',
          value: allergy,
          label: `Senza ${allergy}`,
          reason: `${selectedDog.name} è allergico al ${allergy}`
        })
      }
    })

    // Special needs suggestions
    selectedDog.specialNeeds.forEach(need => {
      const tagMapping: Record<string, string> = {
        'joint-support': 'joint-support',
        'weight-management': 'weight-management',
        'sensitive-stomach': 'sensitive-stomach',
        'dental-care': 'dental-care'
      }

      const tag = tagMapping[need]
      if (tag && !filters.tags.includes(tag)) {
        suggestions.push({
          type: 'tags',
          value: tag,
          label: TAG_LABELS[tag],
          reason: `Specifico per ${need.replace('-', ' ')}`
        })
      }
    })

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }

  const applySuggestion = (suggestion: { type: string; value: string }) => {
    switch (suggestion.type) {
      case 'ageGroup':
        updateFilter('ageGroup', suggestion.value as Filters['ageGroup'])
        break
      case 'size':
        updateFilter('size', suggestion.value as Filters['size'])
        break
      case 'allergyFree':
        toggleArrayFilter('allergyFree', suggestion.value, filters.allergyFree)
        break
      case 'tags':
        toggleArrayFilter('tags', suggestion.value, filters.tags)
        break
    }
  }

  const FilterSection: React.FC<{
    title: string
    id: string
    children: React.ReactNode
    badge?: number
  }> = ({ title, id, children, badge }) => {
    const isExpanded = expandedSections.has(id)

    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{title}</span>
            {badge && badge > 0 && (
              <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 text-xs">
                {badge}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-200">
            {children}
          </div>
        )}
      </div>
    )
  }

  const activeFiltersCount = getActiveFiltersCount()
  const suggestions = getSuggestedFilters()

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtri avanzati</CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} attivi</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">
              💡 Suggerimenti per {selectedDog?.name}
            </h4>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{suggestion.label}</span>
                    <span className="text-blue-600 ml-1">({suggestion.reason})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                    className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Applica
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic Filters */}
        <FilterSection
          title="Filtri base"
          id="basic"
          badge={
            (filters.ageGroup !== 'all' ? 1 : 0) +
            (filters.size !== 'all' ? 1 : 0) +
            (filters.subscriberOnly ? 1 : 0)
          }
        >
          <div className="space-y-4 mt-3">
            {/* Age Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Età del cane
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'Tutte' },
                  { value: 'puppy', label: 'Cucciolo (0-12m)' },
                  { value: 'adult', label: 'Adulto (1-7a)' },
                  { value: 'senior', label: 'Senior (7+a)' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('ageGroup', option.value as Filters['ageGroup'])}
                    className={`p-2 text-sm border rounded ${
                      filters.ageGroup === option.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taglia del cane
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'Tutte' },
                  { value: 'small', label: 'Piccola (<10kg)' },
                  { value: 'medium', label: 'Media (10-25kg)' },
                  { value: 'large', label: 'Grande (25kg+)' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('size', option.value as Filters['size'])}
                    className={`p-2 text-sm border rounded ${
                      filters.size === option.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscriber Only */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="subscriberOnly"
                checked={filters.subscriberOnly}
                onChange={(e) => updateFilter('subscriberOnly', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="subscriberOnly" className="ml-2 text-sm text-gray-700">
                Solo prodotti con sconto abbonamento
              </label>
            </div>
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection
          title="Fascia di prezzo"
          id="price"
          badge={filters.priceRange.min > 0 || filters.priceRange.max < 100 ? 1 : 0}
        >
          <div className="mt-3">
            <div className="flex items-center gap-4 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min €</label>
                <input
                  type="number"
                  value={filters.priceRange.min}
                  onChange={(e) => handlePriceRangeChange(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max €</label>
                <input
                  type="number"
                  value={filters.priceRange.max}
                  onChange={(e) => handlePriceRangeChange(undefined, parseInt(e.target.value) || 100)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Quick price ranges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Fino a €20', min: 0, max: 20 },
                { label: '€20-40', min: 20, max: 40 },
                { label: '€40-60', min: 40, max: 60 },
                { label: '€60+', min: 60, max: 100 }
              ].map(range => (
                <button
                  key={range.label}
                  onClick={() => handlePriceRangeChange(range.min, range.max)}
                  className={`p-2 border rounded text-xs ${
                    filters.priceRange.min === range.min && filters.priceRange.max === range.max
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Allergen-Free */}
        <FilterSection
          title="Senza allergeni"
          id="allergies"
          badge={filters.allergyFree.length}
        >
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {COMMON_ALLERGENS.map(allergen => (
                <button
                  key={allergen}
                  onClick={() => toggleArrayFilter('allergyFree', allergen, filters.allergyFree)}
                  className={`p-2 text-sm border rounded text-left ${
                    filters.allergyFree.includes(allergen)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Senza {allergen}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Brands */}
        <FilterSection
          title="Brand"
          id="brands"
          badge={filters.brands.length}
        >
          <div className="mt-3 space-y-2">
            {AVAILABLE_BRANDS.map(brand => (
              <div key={brand} className="flex items-center">
                <input
                  type="checkbox"
                  id={`brand-${brand}`}
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleArrayFilter('brands', brand, filters.brands)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor={`brand-${brand}`} className="ml-2 text-sm text-gray-700">
                  {brand}
                </label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Special Features */}
        <FilterSection
          title="Caratteristiche speciali"
          id="tags"
          badge={filters.tags.length}
        >
          <div className="mt-3">
            <div className="grid grid-cols-1 gap-2">
              {PRODUCT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleArrayFilter('tags', tag, filters.tags)}
                  className={`p-2 text-sm border rounded text-left ${
                    filters.tags.includes(tag)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {TAG_LABELS[tag] || tag}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection
          title="Valutazione minima"
          id="rating"
          badge={filters.minRating > 0 ? 1 : 0}
        >
          <div className="mt-3">
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 0, label: 'Tutte le valutazioni' },
                { value: 3, label: '3+ stelle' },
                { value: 4, label: '4+ stelle' },
                { value: 4.5, label: '4.5+ stelle' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateFilter('minRating', option.value)}
                  className={`p-2 text-sm border rounded text-left ${
                    filters.minRating === option.value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Filtri attivi ({activeFiltersCount})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-xs text-red-600 hover:text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                Rimuovi tutti
              </Button>
            </div>

            <div className="flex flex-wrap gap-1">
              {filters.ageGroup !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Età: {filters.ageGroup}
                  <button
                    onClick={() => updateFilter('ageGroup', 'all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {filters.size !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Taglia: {filters.size}
                  <button
                    onClick={() => updateFilter('size', 'all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {filters.allergyFree.map(allergen => (
                <Badge key={allergen} variant="secondary" className="text-xs">
                  Senza {allergen}
                  <button
                    onClick={() => toggleArrayFilter('allergyFree', allergen, filters.allergyFree)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}

              {filters.brands.map(brand => (
                <Badge key={brand} variant="secondary" className="text-xs">
                  {brand}
                  <button
                    onClick={() => toggleArrayFilter('brands', brand, filters.brands)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}

              {filters.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {TAG_LABELS[tag] || tag}
                  <button
                    onClick={() => toggleArrayFilter('tags', tag, filters.tags)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}