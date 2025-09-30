'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Navigation,
  Phone,
  Shield,
  AlertTriangle,
  Maximize,
  Minimize
} from 'lucide-react'
import type { ClinicSearchResult } from '@/types/veterinary'

interface VetSearchMapProps {
  results: ClinicSearchResult[]
  center?: { lat: number; lng: number } | null
  selectedResult?: ClinicSearchResult | null
  onResultSelect: (result: ClinicSearchResult | null) => void
}

export function VetSearchMap({
  results,
  center,
  selectedResult,
  onResultSelect
}: VetSearchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || map) return

    const initMap = () => {
      const defaultCenter = center || { lat: 45.4642, lng: 9.1900 } // Milan as default

      const newMap = new google.maps.Map(mapRef.current!, {
        zoom: 12,
        center: defaultCenter,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      })

      const newInfoWindow = new google.maps.InfoWindow()

      setMap(newMap)
      setInfoWindow(newInfoWindow)
      setIsLoading(false)
    }

    if (window.google) {
      initMap()
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.onload = initMap
      document.head.appendChild(script)
    }
  }, [center, map])

  // Update markers when results change
  useEffect(() => {
    if (!map || !infoWindow) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))
    setMarkers([])

    if (results.length === 0) return

    const newMarkers: google.maps.Marker[] = []
    const bounds = new google.maps.LatLngBounds()

    results.forEach((result, index) => {
      if (!result.address) return

      // We would need to geocode the address in a real implementation
      // For now, we'll simulate coordinates
      const lat = 45.4642 + (Math.random() - 0.5) * 0.1
      const lng = 9.1900 + (Math.random() - 0.5) * 0.1

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: result.displayName,
        icon: {
          url: result.emergency24h
            ? '/icons/emergency-marker.svg'
            : result.badge === 'Sponsorizzato'
            ? '/icons/sponsored-marker.svg'
            : '/icons/clinic-marker.svg',
          scaledSize: new google.maps.Size(32, 32)
        },
        zIndex: selectedResult?.clinicId === result.clinicId ? 1000 : index
      })

      marker.addListener('click', () => {
        const infoContent = `
          <div class="p-3 max-w-xs">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-semibold text-gray-900 text-sm">${result.displayName}</h3>
              ${result.verified ? '<span class="ml-2 text-blue-500">✓</span>' : ''}
            </div>

            <div class="space-y-1 text-xs text-gray-600">
              <div class="flex items-center">
                <span class="mr-1">📍</span>
                ${result.address.street}, ${result.address.city}
                ${result.distanceKm ? `<span class="ml-2 text-blue-600">${result.distanceKm.toFixed(1)} km</span>` : ''}
              </div>

              ${result.services.length > 0 ? `
                <div class="flex items-center">
                  <span class="mr-1">🏥</span>
                  ${result.services.slice(0, 2).join(', ')}
                  ${result.services.length > 2 ? ` +${result.services.length - 2}` : ''}
                </div>
              ` : ''}

              ${result.emergency24h ? '<div class="text-red-600 font-medium">🚨 Emergenza 24/7</div>' : ''}
              ${result.openNow ? '<div class="text-green-600 font-medium">🕒 Aperto ora</div>' : ''}
            </div>

            ${result.offer ? `
              <div class="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <div class="text-green-900 font-medium">🎁 ${result.offer.title}</div>
              </div>
            ` : ''}

            <div class="flex space-x-2 mt-3">
              ${result.contact.phone ? `
                <button onclick="window.location.href='tel:${result.contact.phone}'"
                        class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                  Chiama
                </button>
              ` : ''}
              <button onclick="window.open('https://maps.google.com/maps?q=${encodeURIComponent(result.displayName + ', ' + result.address.street + ', ' + result.address.city)}', '_blank')"
                      class="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600">
                Indicazioni
              </button>
            </div>
          </div>
        `

        infoWindow.setContent(infoContent)
        infoWindow.open(map, marker)
        onResultSelect(result)
      })

      newMarkers.push(marker)
      bounds.extend({ lat, lng })
    })

    setMarkers(newMarkers)

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      if (newMarkers.length === 1) {
        map.setCenter(newMarkers[0].getPosition()!)
        map.setZoom(15)
      } else {
        map.fitBounds(bounds)
      }
    }
  }, [map, results, infoWindow, selectedResult, onResultSelect])

  // Highlight selected result
  useEffect(() => {
    if (!selectedResult || !map) return

    markers.forEach((marker, index) => {
      const result = results[index]
      if (result?.clinicId === selectedResult.clinicId) {
        marker.setAnimation(google.maps.Animation.BOUNCE)
        setTimeout(() => marker.setAnimation(null), 1500)

        // Pan to marker
        map.panTo(marker.getPosition()!)
      }
    })
  }, [selectedResult, markers, results, map])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (isLoading) {
    return (
      <Card className="h-96">
        <CardContent className="p-0 h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento mappa...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : 'h-96'}`}>
        <CardContent className="p-0 h-full relative">
          {/* Map Container */}
          <div
            ref={mapRef}
            className="w-full h-full rounded-lg"
          />

          {/* Map Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleFullscreen}
              className="bg-white shadow-md hover:bg-gray-50"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>

            {center && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => map?.panTo(center)}
                className="bg-white shadow-md hover:bg-gray-50"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Results Counter */}
          {results.length > 0 && (
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className="bg-white shadow-md">
                {results.length} strutture trovate
              </Badge>
            </div>
          )}

          {/* Emergency Notice */}
          {results.some(r => r.emergency24h) && (
            <div className="absolute top-4 left-4">
              <Badge variant="destructive" className="shadow-md">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Emergenze disponibili
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleFullscreen}
        />
      )}
    </>
  )
}

// Fallback component when Google Maps is not available
export function VetSearchMapFallback({
  results,
  selectedResult
}: {
  results: ClinicSearchResult[]
  selectedResult?: ClinicSearchResult | null
}) {
  return (
    <Card className="h-96">
      <CardContent className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Mappa non disponibile
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            La mappa non può essere caricata al momento
          </p>
          {results.length > 0 && (
            <div className="space-y-2 text-left max-w-md">
              <h4 className="font-medium text-gray-900">Risultati trovati:</h4>
              {results.slice(0, 3).map(result => (
                <div
                  key={result.clinicId}
                  className={`p-2 rounded border text-sm ${
                    selectedResult?.clinicId === result.clinicId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{result.displayName}</div>
                  <div className="text-gray-600 text-xs">
                    {result.address.city}
                    {result.distanceKm && (
                      <span className="ml-2">
                        {result.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {results.length > 3 && (
                <div className="text-xs text-gray-500">
                  ...e altri {results.length - 3} risultati
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}