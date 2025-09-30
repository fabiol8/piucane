'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  MapPin,
  Phone,
  Clock,
  Star,
  Filter,
  Navigation,
  ExternalLink,
  Heart,
  Calendar,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Car,
  Accessibility,
  Globe,
  Euro,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  Award
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type {
  ClinicSearchResult,
  SearchFilters,
  Clinic,
  Veterinarian,
  VetAffiliation,
  SPECIALTIES,
  CLINIC_TYPES
} from '@/types/veterinary'

interface VeterinarySearchProps {
  initialLocation?: {
    lat: number
    lng: number
    address?: string
  }
  initialFilters?: Partial<SearchFilters>
  onClinicSelect?: (clinic: ClinicSearchResult) => void
  onBookAppointment?: (clinicId: string, vetId?: string) => void
  showBookingButton?: boolean
}

interface ExtendedSearchFilters extends SearchFilters {
  clinicTypes?: string[]
  rating?: number
  accessibility?: {
    parking?: boolean
    stepFree?: boolean
    publicTransport?: boolean
  }
  languages?: string[]
  maxDistance?: number
}

// Mock data - in real app this would come from API
const mockSearchResults: ClinicSearchResult[] = [
  {
    clinicId: 'clinic-1',
    displayName: 'Clinica Veterinaria San Francesco',
    address: {
      street: 'Via Roma, 123',
      zip: '00100',
      city: 'Roma',
      province: 'RM',
      region: 'Lazio',
      country: 'IT'
    },
    distanceKm: 1.2,
    services: ['internal_medicine', 'surgery', 'cardiology', 'emergency', 'diagnostics'],
    emergency24h: true,
    openNow: true,
    rating: {
      avg: 4.8,
      count: 156
    },
    verified: true,
    badge: 'Sponsorizzato',
    offer: {
      title: 'Prima visita a €25',
      description: 'Sconto del 30% sulla prima visita per nuovi pazienti',
      validTo: new Date(2025, 11, 31)
    },
    rankScore: 0.95,
    contact: {
      phone: '+39 06 1234567',
      website: 'https://clinicasanfrancesco.it'
    },
    availableVets: [
      {
        vetId: 'vet-1',
        fullName: 'Dr. Marco Bianchi',
        specialties: ['internal_medicine', 'cardiology']
      },
      {
        vetId: 'vet-3',
        fullName: 'Dr.ssa Elena Verdi',
        specialties: ['surgery', 'emergency']
      }
    ]
  },
  {
    clinicId: 'clinic-2',
    displayName: 'Ambulatorio Veterinario Dr. Rossi',
    address: {
      street: 'Piazza della Repubblica, 45',
      zip: '20121',
      city: 'Milano',
      province: 'MI',
      region: 'Lombardia',
      country: 'IT'
    },
    distanceKm: 2.8,
    services: ['internal_medicine', 'dermatology', 'dentistry', 'nutrition'],
    emergency24h: false,
    openNow: false,
    rating: {
      avg: 4.6,
      count: 89
    },
    verified: true,
    rankScore: 0.88,
    contact: {
      phone: '+39 02 9876543',
      website: 'https://drrossi.it'
    },
    availableVets: [
      {
        vetId: 'vet-2',
        fullName: 'Dr.ssa Laura Rossi',
        specialties: ['dermatology', 'internal_medicine']
      }
    ]
  },
  {
    clinicId: 'clinic-3',
    displayName: 'Centro Veterinario Quattro Zampe',
    address: {
      street: 'Corso Garibaldi, 78',
      zip: '10129',
      city: 'Torino',
      province: 'TO',
      region: 'Piemonte',
      country: 'IT'
    },
    distanceKm: 3.5,
    services: ['internal_medicine', 'orthopedics', 'ophthalmology', 'behavior'],
    emergency24h: false,
    openNow: true,
    rating: {
      avg: 4.7,
      count: 124
    },
    verified: true,
    rankScore: 0.82,
    contact: {
      phone: '+39 011 555444',
      website: 'https://quattrozampe.it'
    },
    availableVets: [
      {
        vetId: 'vet-4',
        fullName: 'Dr. Alessandro Neri',
        specialties: ['orthopedics', 'internal_medicine']
      },
      {
        vetId: 'vet-5',
        fullName: 'Dr.ssa Chiara Blu',
        specialties: ['ophthalmology', 'behavior']
      }
    ]
  }
]

const languages = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'Inglese' },
  { code: 'fr', name: 'Francese' },
  { code: 'de', name: 'Tedesco' },
  { code: 'es', name: 'Spagnolo' }
]

export function VeterinarySearch({
  initialLocation,
  initialFilters,
  onClinicSelect,
  onBookAppointment,
  showBookingButton = true
}: VeterinarySearchProps) {
  const analytics = useAnalytics()
  const [searchTerm, setSearchTerm] = useState('')
  const [location, setLocation] = useState(initialLocation?.address || '')
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ClinicSearchResult[]>(mockSearchResults)

  const [filters, setFilters] = useState<ExtendedSearchFilters>({
    services: initialFilters?.services || [],
    emergency24h: initialFilters?.emergency24h || false,
    openNow: initialFilters?.openNow || false,
    acceptsNewPatients: initialFilters?.acceptsNewPatients || false,
    verified: initialFilters?.verified || false,
    hasOffers: initialFilters?.hasOffers || false,
    sort: initialFilters?.sort || 'rank',
    clinicTypes: [],
    rating: 0,
    maxDistance: 50,
    accessibility: {},
    languages: []
  })

  // Calculate and filter results based on current filters
  const filteredResults = useMemo(() => {
    let filtered = [...results]

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.services.some(service =>
          SPECIALTIES[service]?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply filters
    if (filters.services && filters.services.length > 0) {
      filtered = filtered.filter(result =>
        filters.services!.some(service => result.services.includes(service))
      )
    }

    if (filters.emergency24h) {
      filtered = filtered.filter(result => result.emergency24h)
    }

    if (filters.openNow) {
      filtered = filtered.filter(result => result.openNow)
    }

    if (filters.verified) {
      filtered = filtered.filter(result => result.verified)
    }

    if (filters.hasOffers) {
      filtered = filtered.filter(result => result.offer)
    }

    if (filters.rating && filters.rating > 0) {
      filtered = filtered.filter(result => result.rating && result.rating.avg >= filters.rating!)
    }

    if (filters.maxDistance && filters.maxDistance > 0) {
      filtered = filtered.filter(result => !result.distanceKm || result.distanceKm <= filters.maxDistance!)
    }

    // Sort results
    switch (filters.sort) {
      case 'distance':
        filtered.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
        break
      case 'rating':
        filtered.sort((a, b) => (b.rating?.avg || 0) - (a.rating?.avg || 0))
        break
      case 'alphabetical':
        filtered.sort((a, b) => a.displayName.localeCompare(b.displayName))
        break
      default: // 'rank'
        filtered.sort((a, b) => b.rankScore - a.rankScore)
    }

    return filtered
  }, [results, searchTerm, filters])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('La geolocalizzazione non è supportata dal tuo browser')
      return
    }

    setIsLoadingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          // In real app, use reverse geocoding API
          setLocation(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`)

          analytics.trackEvent('vet_search_location_obtained', {
            method: 'gps',
            lat: latitude,
            lng: longitude
          })

          // Trigger search with new location
          performSearch({ lat: latitude, lng: longitude })
        } catch (error) {
          console.error('Error getting address:', error)
        } finally {
          setIsLoadingLocation(false)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        setIsLoadingLocation(false)
        alert('Impossibile ottenere la posizione. Inserisci manualmente la località.')
      }
    )
  }

  const performSearch = async (locationCoords?: { lat: number; lng: number }) => {
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      analytics.trackEvent('vet_search', {
        query: searchTerm,
        lat: locationCoords?.lat,
        lng: locationCoords?.lng,
        filters: Object.keys(filters).filter(key =>
          filters[key as keyof typeof filters] &&
          (Array.isArray(filters[key as keyof typeof filters]) ?
            (filters[key as keyof typeof filters] as any[]).length > 0 :
            filters[key as keyof typeof filters] !== false)
        ),
        results_count: filteredResults.length
      })

      // In real app, this would make an API call with the filters
      // For now, we'll just use the mock data

    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    performSearch()
  }

  const handleFilterChange = (key: keyof ExtendedSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleServiceToggle = (service: string) => {
    setFilters(prev => ({
      ...prev,
      services: prev.services?.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...(prev.services || []), service]
    }))
  }

  const clearFilters = () => {
    setFilters({
      services: [],
      emergency24h: false,
      openNow: false,
      acceptsNewPatients: false,
      verified: false,
      hasOffers: false,
      sort: 'rank',
      clinicTypes: [],
      rating: 0,
      maxDistance: 50,
      accessibility: {},
      languages: []
    })
  }

  const handleClinicClick = (clinic: ClinicSearchResult) => {
    analytics.trackEvent('vet_result_click', {
      clinic_id: clinic.clinicId,
      sponsored: !!clinic.badge,
      action: 'details'
    })
    onClinicSelect?.(clinic)
  }

  const handleCallClick = (clinic: ClinicSearchResult, e: React.MouseEvent) => {
    e.stopPropagation()
    analytics.trackEvent('vet_result_click', {
      clinic_id: clinic.clinicId,
      sponsored: !!clinic.badge,
      action: 'call'
    })
    if (clinic.contact.phone) {
      window.open(`tel:${clinic.contact.phone}`)
    }
  }

  const handleWebsiteClick = (clinic: ClinicSearchResult, e: React.MouseEvent) => {
    e.stopPropagation()
    analytics.trackEvent('vet_result_click', {
      clinic_id: clinic.clinicId,
      sponsored: !!clinic.badge,
      action: 'website'
    })
    if (clinic.contact.website) {
      window.open(clinic.contact.website, '_blank')
    }
  }

  const handleDirectionsClick = (clinic: ClinicSearchResult, e: React.MouseEvent) => {
    e.stopPropagation()
    analytics.trackEvent('vet_result_click', {
      clinic_id: clinic.clinicId,
      sponsored: !!clinic.badge,
      action: 'directions'
    })
    const address = `${clinic.address.street}, ${clinic.address.city}`
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank')
  }

  const handleBookAppointment = (clinic: ClinicSearchResult, vetId?: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    analytics.trackEvent('vet_appointment_click', {
      clinic_id: clinic.clinicId,
      vet_id: vetId,
      sponsored: !!clinic.badge
    })
    onBookAppointment?.(clinic.clinicId, vetId)
  }

  const renderFilters = () => (
    <Card className={`transition-all duration-300 ${showFilters ? 'block' : 'hidden'}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtri di ricerca</CardTitle>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Azzera filtri
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Specialties */}
        <div>
          <h4 className="text-sm font-medium mb-3">Specializzazioni</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.values(SPECIALTIES).map((specialty) => (
              <Button
                key={specialty.key}
                variant={filters.services?.includes(specialty.key) ? "default" : "outline"}
                size="sm"
                onClick={() => handleServiceToggle(specialty.key)}
                className="justify-start text-left h-auto py-2"
              >
                <span className="mr-2">{specialty.icon}</span>
                <span className="truncate">{specialty.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick filters */}
        <div>
          <h4 className="text-sm font-medium mb-3">Filtri rapidi</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={filters.emergency24h ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('emergency24h', !filters.emergency24h)}
              className="justify-start"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Emergenze 24h
            </Button>
            <Button
              variant={filters.openNow ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('openNow', !filters.openNow)}
              className="justify-start"
            >
              <Clock className="w-4 h-4 mr-2" />
              Aperto ora
            </Button>
            <Button
              variant={filters.verified ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('verified', !filters.verified)}
              className="justify-start"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Solo verificati
            </Button>
            <Button
              variant={filters.hasOffers ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('hasOffers', !filters.hasOffers)}
              className="justify-start"
            >
              <Euro className="w-4 h-4 mr-2" />
              Con offerte
            </Button>
          </div>
        </div>

        {/* Rating filter */}
        <div>
          <h4 className="text-sm font-medium mb-3">Valutazione minima</h4>
          <div className="flex gap-2">
            {[0, 3, 4, 4.5].map((rating) => (
              <Button
                key={rating}
                variant={filters.rating === rating ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('rating', rating)}
              >
                {rating === 0 ? 'Tutte' : (
                  <>
                    <Star className="w-3 h-3 mr-1" />
                    {rating}+
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Distance filter */}
        <div>
          <h4 className="text-sm font-medium mb-3">Distanza massima</h4>
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 25, 50, 100].map((distance) => (
              <Button
                key={distance}
                variant={filters.maxDistance === distance ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('maxDistance', distance)}
              >
                {distance} km
              </Button>
            ))}
          </div>
        </div>

        {/* Sort options */}
        <div>
          <h4 className="text-sm font-medium mb-3">Ordina per</h4>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="rank">Rilevanza</option>
            <option value="distance">Distanza</option>
            <option value="rating">Valutazione</option>
            <option value="alphabetical">Nome A-Z</option>
          </select>
        </div>
      </CardContent>
    </Card>
  )

  const renderClinicCard = (clinic: ClinicSearchResult) => (
    <Card
      key={clinic.clinicId}
      className="cursor-pointer transition-all hover:shadow-md hover:border-orange-200"
      onClick={() => handleClinicClick(clinic)}
    >
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{clinic.displayName}</h3>
                {clinic.verified && (
                  <Badge className="bg-green-50 text-green-700 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verificato
                  </Badge>
                )}
                {clinic.badge && (
                  <Badge className="bg-orange-50 text-orange-700 text-xs">
                    {clinic.badge}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{clinic.address.street}, {clinic.address.city}</span>
                </div>
                {clinic.distanceKm && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {clinic.distanceKm} km
                  </span>
                )}
              </div>

              {/* Rating and status */}
              <div className="flex items-center gap-4 text-sm">
                {clinic.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{clinic.rating.avg}</span>
                    <span className="text-gray-500">({clinic.rating.count})</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {clinic.emergency24h && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      24h
                    </Badge>
                  )}
                  {clinic.openNow && (
                    <Badge className="bg-green-50 text-green-700 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Aperto
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-1">
            {clinic.services.slice(0, 4).map((service) => (
              <Badge key={service} variant="outline" className="text-xs">
                <span className="mr-1">{SPECIALTIES[service]?.icon}</span>
                {SPECIALTIES[service]?.name || service}
              </Badge>
            ))}
            {clinic.services.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{clinic.services.length - 4}
              </Badge>
            )}
          </div>

          {/* Available veterinarians */}
          {clinic.availableVets && clinic.availableVets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Veterinari disponibili</h4>
              <div className="space-y-2">
                {clinic.availableVets.map((vet) => (
                  <div key={vet.vetId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{vet.fullName}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {vet.specialties.map(s => SPECIALTIES[s]?.name).join(', ')}
                      </p>
                    </div>
                    {showBookingButton && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleBookAppointment(clinic, vet.vetId, e)}
                        className="ml-2 text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Prenota
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offer */}
          {clinic.offer && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">{clinic.offer.title}</p>
                  {clinic.offer.description && (
                    <p className="text-xs text-orange-800 mt-1">{clinic.offer.description}</p>
                  )}
                  <p className="text-xs text-orange-700 mt-1">
                    Valido fino al {clinic.offer.validTo.toLocaleDateString('it-IT')}
                  </p>
                </div>
                <Euro className="w-4 h-4 text-orange-600 ml-2" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {clinic.contact.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleCallClick(clinic, e)}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Chiama
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleDirectionsClick(clinic, e)}
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-1" />
              Indicazioni
            </Button>
            {clinic.contact.website && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleWebsiteClick(clinic, e)}
                className="flex-1"
              >
                <Globe className="w-4 h-4 mr-1" />
                Sito
              </Button>
            )}
            {showBookingButton && (
              <Button
                onClick={(e) => handleBookAppointment(clinic, undefined, e)}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Prenota
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Search Header */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Location and search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dove cerchi?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Inserisci città o indirizzo"
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation}
                    className="px-3"
                  >
                    <Navigation className={`w-4 h-4 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cosa cerchi? (opzionale)
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="es. cardiologia, dermatologia..."
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtri
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {(filters.services?.length || 0) > 0 && (
                  <Badge className="ml-2 bg-orange-100 text-orange-800">
                    {(filters.services?.length || 0) +
                     (filters.emergency24h ? 1 : 0) +
                     (filters.openNow ? 1 : 0) +
                     (filters.verified ? 1 : 0) +
                     (filters.hasOffers ? 1 : 0)}
                  </Badge>
                )}
              </Button>

              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Search className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Ricerca in corso...' : 'Cerca'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {renderFilters()}

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Veterinari nelle vicinanze
            </h2>
            <p className="text-sm text-gray-600">
              {filteredResults.length} risultat{filteredResults.length !== 1 ? 'i' : 'o'} trovat{filteredResults.length !== 1 ? 'i' : 'o'}
              {location && ` vicino a ${location}`}
            </p>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun risultato trovato</h3>
              <p className="text-gray-600 mb-4">
                Prova a modificare i filtri di ricerca o la località
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Rimuovi filtri
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((clinic) => renderClinicCard(clinic))}
          </div>
        )}
      </div>
    </div>
  )
}