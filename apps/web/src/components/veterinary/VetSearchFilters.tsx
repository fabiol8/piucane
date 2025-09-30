'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  Users,
  Gift,
  X,
  Locate
} from 'lucide-react'
import { SPECIALTIES } from '@/types/veterinary'
import type { SearchFilters } from '@/types/veterinary'

interface VetSearchFiltersProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onApply: () => void
  location?: { lat: number; lng: number } | null
  onRequestLocation: () => Promise<boolean>
}

export function VetSearchFilters({
  filters,
  onChange,
  onApply,
  location,
  onRequestLocation
}: VetSearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)
  const [locationInput, setLocationInput] = useState('')

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleServiceToggle = (serviceKey: string) => {
    const currentServices = localFilters.services || []
    const updatedServices = currentServices.includes(serviceKey)
      ? currentServices.filter(s => s !== serviceKey)
      : [...currentServices, serviceKey]

    setLocalFilters({
      ...localFilters,
      services: updatedServices
    })
  }

  const handleLocationToggle = (type: 'current' | 'manual') => {
    if (type === 'current') {
      if (location) {
        setLocalFilters({
          ...localFilters,
          location: {
            lat: location.lat,
            lng: location.lng,
            radiusKm: 25
          }
        })
      } else {
        onRequestLocation()
      }
    } else {
      setLocalFilters({
        ...localFilters,
        location: {
          city: locationInput || undefined
        }
      })
    }
  }

  const handleRadiusChange = (radiusKm: number) => {
    if (localFilters.location && 'lat' in localFilters.location) {
      setLocalFilters({
        ...localFilters,
        location: {
          ...localFilters.location,
          radiusKm
        }
      })
    }
  }

  const handleApply = () => {
    onChange(localFilters)
    onApply()
  }

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      sort: 'rank',
      limit: 20
    }
    setLocalFilters(resetFilters)
    onChange(resetFilters)
    setLocationInput('')
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (localFilters.services?.length) count++
    if (localFilters.location) count++
    if (localFilters.emergency24h) count++
    if (localFilters.openNow) count++
    if (localFilters.acceptsNewPatients) count++
    if (localFilters.verified) count++
    if (localFilters.hasOffers) count++
    return count
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Filtri di ricerca</h3>
        <div className="flex items-center space-x-2">
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFiltersCount()} filtri attivi
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Cancella tutto
          </Button>
        </div>
      </div>

      {/* Location Filters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <MapPin className="h-4 w-4 mr-2" />
          Posizione
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Button
              size="sm"
              variant={localFilters.location && 'lat' in localFilters.location ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleLocationToggle('current')}
            >
              <Locate className="h-4 w-4 mr-2" />
              {location ? 'Usa posizione attuale' : 'Rileva posizione'}
            </Button>

            {localFilters.location && 'lat' in localFilters.location && (
              <div className="space-y-2">
                <label className="text-xs text-gray-600">Raggio di ricerca</label>
                <div className="flex space-x-2">
                  {[10, 25, 50, 100].map(radius => (
                    <Button
                      key={radius}
                      size="sm"
                      variant={localFilters.location && 'radiusKm' in localFilters.location &&
                              localFilters.location.radiusKm === radius ? "default" : "outline"}
                      onClick={() => handleRadiusChange(radius)}
                    >
                      {radius}km
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Città o CAP..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleLocationToggle('manual')}
              disabled={!locationInput.trim()}
            >
              Cerca in questa città
            </Button>
          </div>
        </div>
      </div>

      {/* Service Filters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Specialità
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(SPECIALTIES).map(([key, specialty]) => (
            <Button
              key={key}
              size="sm"
              variant={localFilters.services?.includes(key) ? "default" : "outline"}
              onClick={() => handleServiceToggle(key)}
              className="justify-start text-xs"
            >
              <span className="mr-2">{specialty.icon}</span>
              {specialty.name}
            </Button>
          ))}
        </div>

        {localFilters.services?.length > 0 && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <span>Filtri attivi:</span>
            <div className="flex flex-wrap gap-1">
              {localFilters.services.map(serviceKey => (
                <Badge
                  key={serviceKey}
                  variant="secondary"
                  className="text-xs cursor-pointer"
                  onClick={() => handleServiceToggle(serviceKey)}
                >
                  {SPECIALTIES[serviceKey]?.name}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Filtri rapidi</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-700">Solo emergenze H24</span>
            </div>
            <Switch
              checked={localFilters.emergency24h || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, emergency24h: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700">Aperto ora</span>
            </div>
            <Switch
              checked={localFilters.openNow || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, openNow: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-700">Accetta nuovi pazienti</span>
            </div>
            <Switch
              checked={localFilters.acceptsNewPatients || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, acceptsNewPatients: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-700">Solo verificati</span>
            </div>
            <Switch
              checked={localFilters.verified || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, verified: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gift className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-700">Con offerte speciali</span>
            </div>
            <Switch
              checked={localFilters.hasOffers || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, hasOffers: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Ordina per</h4>

        <div className="flex space-x-2">
          {[
            { key: 'rank', label: 'Rilevanza' },
            { key: 'distance', label: 'Distanza' },
            { key: 'rating', label: 'Valutazione' },
            { key: 'alphabetical', label: 'Nome' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={localFilters.sort === key ? "default" : "outline"}
              onClick={() => setLocalFilters({ ...localFilters, sort: key as any })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
        <Button variant="outline" onClick={handleReset}>
          Cancella
        </Button>
        <Button onClick={handleApply}>
          Applica Filtri
        </Button>
      </div>
    </div>
  )
}