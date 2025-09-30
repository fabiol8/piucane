'use client'

import { useState, useCallback, useRef } from 'react'
import type { SearchFilters, ClinicSearchResult, VetSearchQueryBuilder } from '@/types/veterinary'

interface UseVeterinarySearchOptions {
  defaultFilters?: Partial<SearchFilters>
  apiEndpoint?: string
}

interface SearchState {
  results: ClinicSearchResult[]
  loading: boolean
  error: string | null
  searchTime: number | null
  hasMore: boolean
  totalResults: number
}

export function useVeterinarySearch(options: UseVeterinarySearchOptions = {}) {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    searchTime: null,
    hasMore: false,
    totalResults: 0
  })

  const [filters, setFilters] = useState<SearchFilters>({
    sort: 'rank',
    limit: 20,
    ...options.defaultFilters
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const queryBuilderRef = useRef<VetSearchQueryBuilder | null>(null)

  // Initialize query builder
  const getQueryBuilder = useCallback(() => {
    if (!queryBuilderRef.current) {
      queryBuilderRef.current = new VetSearchQueryBuilder()
    }
    return queryBuilderRef.current
  }, [])

  const search = useCallback(async (
    newFilters?: Partial<SearchFilters>,
    append: boolean = false
  ) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const searchFilters = newFilters ? { ...filters, ...newFilters } : filters
    const startTime = performance.now()

    // Update filters state
    if (newFilters) {
      setFilters(searchFilters)
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      ...(append ? {} : { results: [] })
    }))

    try {
      abortControllerRef.current = new AbortController()

      // Build search query
      const queryBuilder = getQueryBuilder()
      const searchQuery = queryBuilder
        .reset()
        .setFilters(searchFilters)
        .setOffset(append ? state.results.length : 0)
        .build()

      // Simulate API call (replace with actual API)
      const response = await mockVeterinarySearch(searchQuery, {
        signal: abortControllerRef.current.signal
      })

      const searchTime = performance.now() - startTime

      setState(prev => ({
        ...prev,
        loading: false,
        results: append ? [...prev.results, ...response.results] : response.results,
        hasMore: response.hasMore,
        totalResults: response.totalResults,
        searchTime: Math.round(searchTime),
        error: null
      }))

      return response.results

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return []
      }

      const errorMessage = error.message || 'Errore nella ricerca'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))

      throw error
    }
  }, [filters, state.results.length, getQueryBuilder])

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      return search(undefined, true)
    }
    return Promise.resolve([])
  }, [search, state.loading, state.hasMore])

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      results: [],
      loading: false,
      error: null,
      searchTime: null,
      hasMore: false,
      totalResults: 0
    })

    setFilters({
      sort: 'rank',
      limit: 20,
      ...options.defaultFilters
    })
  }, [options.defaultFilters])

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    return search(newFilters, false)
  }, [search])

  return {
    // State
    ...state,
    filters,

    // Actions
    search,
    loadMore,
    reset,
    updateFilters,
    setFilters,

    // Utils
    queryBuilder: getQueryBuilder()
  }
}

// Mock search implementation
async function mockVeterinarySearch(
  query: any,
  options: { signal?: AbortSignal } = {}
): Promise<{
  results: ClinicSearchResult[]
  hasMore: boolean
  totalResults: number
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))

  // Check if request was aborted
  if (options.signal?.aborted) {
    throw new Error('Request aborted')
  }

  // Mock results based on filters
  const mockResults: ClinicSearchResult[] = [
    {
      clinicId: 'clinic_001',
      displayName: 'Clinica Veterinaria Sant\'Antonio',
      verified: true,
      badge: 'Sponsorizzato',
      emergency24h: true,
      openNow: true,
      acceptsNewPatients: true,
      address: {
        street: 'Via Roma 123',
        city: 'Milano',
        zipCode: '20100',
        country: 'IT'
      },
      contact: {
        phone: '+39 02 123 4567',
        email: 'info@santantonio.vet',
        website: 'https://santantonio.vet'
      },
      services: ['general', 'surgery', 'emergency'],
      rating: {
        avg: 4.8,
        count: 342
      },
      distanceKm: 2.3,
      offer: {
        offerId: 'offer_001',
        title: 'Prima visita -20%',
        description: 'Sconto del 20% sulla prima visita per nuovi clienti',
        discountPercentage: 20,
        validUntil: new Date('2024-12-31').toISOString()
      }
    },
    {
      clinicId: 'clinic_002',
      displayName: 'Centro Veterinario Brera',
      verified: true,
      emergency24h: false,
      openNow: true,
      acceptsNewPatients: true,
      address: {
        street: 'Via Brera 45',
        city: 'Milano',
        zipCode: '20121',
        country: 'IT'
      },
      contact: {
        phone: '+39 02 987 6543',
        email: 'info@veterinariobrera.it'
      },
      services: ['general', 'dermatology', 'cardiology'],
      rating: {
        avg: 4.6,
        count: 128
      },
      distanceKm: 3.1
    },
    {
      clinicId: 'clinic_003',
      displayName: 'Ospedale Veterinario Milano Sud',
      verified: true,
      emergency24h: true,
      openNow: false,
      acceptsNewPatients: false,
      address: {
        street: 'Via Navigli 78',
        city: 'Milano',
        zipCode: '20144',
        country: 'IT'
      },
      contact: {
        phone: '+39 02 555 0123',
        email: 'info@ospedalemilano.vet',
        website: 'https://ospedalemilano.vet'
      },
      services: ['surgery', 'emergency', 'orthopedics', 'oncology'],
      rating: {
        avg: 4.9,
        count: 567
      },
      distanceKm: 5.7
    }
  ]

  // Apply basic filtering
  let filteredResults = mockResults

  if (query.filters?.emergency24h) {
    filteredResults = filteredResults.filter(r => r.emergency24h)
  }

  if (query.filters?.openNow) {
    filteredResults = filteredResults.filter(r => r.openNow)
  }

  if (query.filters?.acceptsNewPatients) {
    filteredResults = filteredResults.filter(r => r.acceptsNewPatients)
  }

  if (query.filters?.verified) {
    filteredResults = filteredResults.filter(r => r.verified)
  }

  if (query.filters?.services?.length) {
    filteredResults = filteredResults.filter(r =>
      query.filters.services.some((service: string) => r.services.includes(service))
    )
  }

  // Apply sorting
  switch (query.filters?.sort) {
    case 'distance':
      filteredResults.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
      break
    case 'rating':
      filteredResults.sort((a, b) => (b.rating?.avg || 0) - (a.rating?.avg || 0))
      break
    case 'alphabetical':
      filteredResults.sort((a, b) => a.displayName.localeCompare(b.displayName))
      break
    case 'rank':
    default:
      // Keep original order (includes sponsored results first)
      break
  }

  const limit = query.filters?.limit || 20
  const offset = query.offset || 0
  const paginatedResults = filteredResults.slice(offset, offset + limit)

  return {
    results: paginatedResults,
    hasMore: offset + limit < filteredResults.length,
    totalResults: filteredResults.length
  }
}

// Query Builder Implementation
export class VetSearchQueryBuilder implements VetSearchQueryBuilder {
  private query: any = {}

  reset(): VetSearchQueryBuilder {
    this.query = {}
    return this
  }

  setFilters(filters: SearchFilters): VetSearchQueryBuilder {
    this.query.filters = { ...filters }
    return this
  }

  setLocation(lat: number, lng: number, radiusKm?: number): VetSearchQueryBuilder {
    this.query.location = { lat, lng, radiusKm: radiusKm || 25 }
    return this
  }

  setCity(city: string): VetSearchQueryBuilder {
    this.query.city = city
    return this
  }

  setServices(services: string[]): VetSearchQueryBuilder {
    this.query.services = services
    return this
  }

  setEmergencyOnly(emergency: boolean): VetSearchQueryBuilder {
    this.query.emergency = emergency
    return this
  }

  setOpenNow(openNow: boolean): VetSearchQueryBuilder {
    this.query.openNow = openNow
    return this
  }

  setSort(sort: SearchFilters['sort']): VetSearchQueryBuilder {
    this.query.sort = sort
    return this
  }

  setLimit(limit: number): VetSearchQueryBuilder {
    this.query.limit = limit
    return this
  }

  setOffset(offset: number): VetSearchQueryBuilder {
    this.query.offset = offset
    return this
  }

  build(): any {
    return { ...this.query }
  }
}