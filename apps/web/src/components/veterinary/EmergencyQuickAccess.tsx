'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  Navigation
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface EmergencyQuickAccessProps {
  onEmergencyClick: () => void
  hasLocation: boolean
}

export function EmergencyQuickAccess({
  onEmergencyClick,
  hasLocation
}: EmergencyQuickAccessProps) {
  const analytics = useAnalytics()
  const [isPressed, setIsPressed] = useState(false)

  const handleEmergencyClick = () => {
    setIsPressed(true)

    analytics.trackEvent('emergency_button_click', {
      has_location: hasLocation,
      source: 'header'
    })

    onEmergencyClick()

    // Reset pressed state after animation
    setTimeout(() => setIsPressed(false), 200)
  }

  const handleDirectCall = (phone: string, clinicName: string) => {
    analytics.trackEvent('emergency_direct_call', {
      phone,
      clinic_name: clinicName,
      source: 'quick_access'
    })

    window.location.href = `tel:${phone}`
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Quick Emergency Contacts */}
      <div className="hidden md:flex items-center space-x-2 text-sm">
        <div className="text-gray-600">Emergenza:</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDirectCall('+39 02 123 4567', 'Clinica H24 Milano')}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Phone className="h-3 w-3 mr-1" />
          02 123 4567
        </Button>
      </div>

      {/* Main Emergency Button */}
      <Button
        onClick={handleEmergencyClick}
        className={`
          bg-red-500 hover:bg-red-600 text-white font-medium
          shadow-lg hover:shadow-xl
          transform transition-all duration-200
          ${isPressed ? 'scale-95' : 'scale-100'}
          relative overflow-hidden
        `}
      >
        <AlertTriangle className="h-4 w-4 mr-2 animate-pulse" />
        <span className="relative z-10">
          {hasLocation ? 'Trova PS vicino' : 'Pronto Soccorso'}
        </span>

        {/* Animated background pulse */}
        <div className="absolute inset-0 bg-red-400 opacity-20 rounded-md animate-ping" />
      </Button>
    </div>
  )
}

// Emergency Info Panel (can be shown as dropdown/modal)
export function EmergencyInfoPanel() {
  const analytics = useAnalytics()

  const emergencyContacts = [
    {
      name: 'Clinica Veterinaria H24 Milano Centro',
      phone: '+39 02 123 4567',
      address: 'Via Emergenze 24, Milano',
      distance: '2.3 km',
      available: true
    },
    {
      name: 'Ospedale Veterinario Lombardia',
      phone: '+39 02 987 6543',
      address: 'Corso Veterinari 15, Milano',
      distance: '4.1 km',
      available: true
    },
    {
      name: 'Pronto Soccorso Veterinario Nord',
      phone: '+39 02 555 0123',
      address: 'Via del Soccorso 8, Monza',
      distance: '12.5 km',
      available: false
    }
  ]

  const handleCallClick = (contact: typeof emergencyContacts[0]) => {
    analytics.trackEvent('emergency_contact_call', {
      clinic_name: contact.name,
      phone: contact.phone,
      distance: contact.distance
    })

    window.location.href = `tel:${contact.phone}`
  }

  const handleDirectionsClick = (contact: typeof emergencyContacts[0]) => {
    analytics.trackEvent('emergency_directions_click', {
      clinic_name: contact.name,
      address: contact.address
    })

    const query = encodeURIComponent(`${contact.name}, ${contact.address}`)
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank')
  }

  return (
    <div className="w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-xl">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-red-100 rounded-full">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Pronto Soccorso</h3>
          <p className="text-xs text-gray-600">Strutture più vicine</p>
        </div>
      </div>

      <div className="space-y-3">
        {emergencyContacts.map((contact, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              contact.available
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {contact.name}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{contact.distance}</span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {contact.available ? (
                  <div className="flex items-center text-green-600 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    24/7
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">Chiuso</div>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleCallClick(contact)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={!contact.available}
              >
                <Phone className="h-3 w-3 mr-1" />
                Chiama
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDirectionsClick(contact)}
                className="flex-1"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Vai
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-xs text-yellow-800">
          <p className="font-medium">⚠️ In caso di emergenza grave:</p>
          <p className="mt-1">
            Se il tuo animale è in pericolo di vita, chiama immediatamente
            il pronto soccorso più vicino o recati direttamente in clinica.
          </p>
        </div>
      </div>
    </div>
  )
}