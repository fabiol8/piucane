'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Shield,
  Gift,
  Navigation,
  ExternalLink,
  Heart,
  AlertTriangle,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { SPECIALTIES } from '@/types/veterinary'
import type { ClinicSearchResult } from '@/types/veterinary'

interface VetSearchResultsProps {
  results: ClinicSearchResult[]
  loading: boolean
  error: string | null
  searchTime?: number
  onResultClick: (result: ClinicSearchResult) => void
  onLoadMore: () => void
  hasMore: boolean
}

export function VetSearchResults({
  results,
  loading,
  error,
  searchTime,
  onResultClick,
  onLoadMore,
  hasMore
}: VetSearchResultsProps) {
  const analytics = useAnalytics()

  const handleResultClick = (result: ClinicSearchResult, action: string) => {
    onResultClick(result)

    analytics.trackEvent('vet_result_click', {
      clinic_id: result.clinicId,
      sponsored: result.badge === 'Sponsorizzato',
      action,
      position: results.indexOf(result) + 1,
      distance_km: result.distanceKm
    })
  }

  const handleCallClick = (result: ClinicSearchResult) => {
    if (result.contact.phone) {
      window.location.href = `tel:${result.contact.phone}`

      analytics.trackEvent('vet_call_click', {
        clinic_id: result.clinicId,
        phone: result.contact.phone
      })
    }
  }

  const handleDirectionsClick = (result: ClinicSearchResult) => {
    const query = encodeURIComponent(
      `${result.displayName}, ${result.address.street}, ${result.address.city}`
    )
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank')

    analytics.trackEvent('vet_directions_click', {
      clinic_id: result.clinicId,
      city: result.address.city
    })
  }

  const handleWebsiteClick = (result: ClinicSearchResult) => {
    if (result.contact.website) {
      window.open(result.contact.website, '_blank')

      analytics.trackEvent('vet_website_click', {
        clinic_id: result.clinicId,
        website: result.contact.website
      })
    }
  }

  const formatServices = (services: string[]) => {
    return services
      .slice(0, 3)
      .map(service => SPECIALTIES[service]?.name || service)
      .join(', ') + (services.length > 3 ? ` +${services.length - 3}` : '')
  }

  if (loading && results.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Errore nella ricerca
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessun risultato trovato
            </h3>
            <p className="text-gray-600 mb-4">
              Prova a modificare i filtri di ricerca o ampliare l'area geografica
            </p>
            <Button variant="outline">
              Modifica Ricerca
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Info */}
      {searchTime && (
        <div className="text-sm text-gray-500 flex items-center justify-between">
          <span>{results.length} risultati trovati</span>
          {searchTime && <span>Ricerca completata in {searchTime}ms</span>}
        </div>
      )}

      {/* Results */}
      {results.map((result, index) => (
        <Card
          key={result.clinicId}
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleResultClick(result, 'details')}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {result.displayName}
                  </h3>

                  {result.verified && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Verificato
                    </Badge>
                  )}

                  {result.badge && (
                    <Badge variant="default" className="text-xs bg-orange-500">
                      {result.badge}
                    </Badge>
                  )}

                  {result.emergency24h && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      H24
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {result.address.street}, {result.address.city}
                      {result.distanceKm && (
                        <span className="ml-2 text-blue-600 font-medium">
                          {result.distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </span>
                  </div>

                  {result.services.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{formatServices(result.services)}</span>
                    </div>
                  )}

                  {result.openNow && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Aperto ora</span>
                    </div>
                  )}

                  {result.rating && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>
                        {result.rating.avg.toFixed(1)}
                        <span className="text-gray-500 ml-1">
                          ({result.rating.count} recensioni)
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Offer */}
                {result.offer && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        {result.offer.title}
                      </span>
                    </div>
                    {result.offer.description && (
                      <p className="text-xs text-green-700 mt-1">
                        {result.offer.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2 ml-4">
                {result.contact.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCallClick(result)
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Chiama
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDirectionsClick(result)
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Indicazioni
                </Button>

                {result.contact.website && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleWebsiteClick(result)
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Sito Web
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Add to favorites
                  }}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Load More */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button
            onClick={onLoadMore}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Caricamento...
              </>
            ) : (
              'Carica altri risultati'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}