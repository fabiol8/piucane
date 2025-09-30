'use client'

/**
 * Order Tracking Component - Detailed shipment tracking interface
 * Features real-time tracking, delivery estimates, and carrier integration
 */

import React, { useState, useEffect } from 'react'
import {
  MapPin,
  Truck,
  Package,
  CheckCircle,
  Clock,
  Phone,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Calendar,
  Navigation,
  Building,
  Copy,
  Share
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import type {
  TrackingInfo,
  TrackingStatus,
  TrackingEvent,
  DeliveryAttempt
} from '@/types/orders'

interface OrderTrackingProps {
  orderId: string
  onClose?: () => void
  initialTracking?: TrackingInfo
}

const trackingStatusConfig = {
  label_created: {
    label: 'Etichetta creata',
    description: 'L\'etichetta di spedizione è stata generata',
    color: 'blue',
    icon: Package,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    progress: 20
  },
  picked_up: {
    label: 'Ritirato',
    description: 'Il pacco è stato ritirato dal corriere',
    color: 'blue',
    icon: Truck,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    progress: 40
  },
  in_transit: {
    label: 'In viaggio',
    description: 'Il pacco è in transito verso la destinazione',
    color: 'purple',
    icon: Navigation,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    progress: 60
  },
  out_for_delivery: {
    label: 'In consegna',
    description: 'Il pacco è uscito per la consegna',
    color: 'orange',
    icon: MapPin,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    progress: 80
  },
  delivered: {
    label: 'Consegnato',
    description: 'Il pacco è stato consegnato con successo',
    color: 'green',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    progress: 100
  },
  delivery_attempted: {
    label: 'Tentativo di consegna',
    description: 'Tentativo di consegna non riuscito',
    color: 'yellow',
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    progress: 75
  },
  exception: {
    label: 'Eccezione',
    description: 'Si è verificato un problema durante la spedizione',
    color: 'red',
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    progress: 50
  },
  returned: {
    label: 'Restituito',
    description: 'Il pacco è stato restituito al mittente',
    color: 'gray',
    icon: RefreshCw,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    progress: 0
  }
}

// Mock tracking data - in a real app this would come from an API
const mockTrackingData: TrackingInfo = {
  orderId: '',
  trackingNumber: 'SDA123456789IT',
  carrier: 'SDA',
  status: 'in_transit',
  estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  actualDelivery: undefined,
  events: [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'label_created',
      message: 'Etichetta di spedizione creata',
      details: 'Il tuo ordine è stato preparato per la spedizione'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'picked_up',
      location: {
        city: 'Milano',
        province: 'MI',
        country: 'Italia',
        facility: 'Centro Distribuzione PiùCane Milano'
      },
      message: 'Pacco ritirato dal corriere',
      details: 'Il pacco è stato ritirato dal nostro centro di distribuzione'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'in_transit',
      location: {
        city: 'Bologna',
        province: 'BO',
        country: 'Italia',
        facility: 'Hub Logistico SDA Bologna'
      },
      message: 'In transito presso hub di smistamento',
      details: 'Il pacco è arrivato al centro di smistamento di Bologna'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      status: 'in_transit',
      location: {
        city: 'Roma',
        province: 'RM',
        country: 'Italia',
        facility: 'Deposito SDA Roma Sud'
      },
      message: 'Arrivato al deposito di destinazione',
      details: 'Il pacco è arrivato al deposito di Roma Sud ed è in preparazione per la consegna'
    }
  ],
  currentLocation: {
    city: 'Roma',
    province: 'RM',
    country: 'Italia',
    facility: 'Deposito SDA Roma Sud',
    coordinates: {
      lat: 41.9028,
      lng: 12.4964
    }
  },
  deliveryAttempts: [],
  specialInstructions: 'Consegnare al citofono. Chiamare se non presente.'
}

export function OrderTracking({ orderId, onClose, initialTracking }: OrderTrackingProps) {
  const [tracking, setTracking] = useState<TrackingInfo>(initialTracking || { ...mockTrackingData, orderId })
  const [loading, setLoading] = useState(!initialTracking)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedTracking, setCopiedTracking] = useState(false)

  useEffect(() => {
    if (!initialTracking) {
      // Simulate loading tracking data
      const timer = setTimeout(() => {
        setTracking({ ...mockTrackingData, orderId })
        setLoading(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [orderId, initialTracking])

  useEffect(() => {
    trackCTA({
      ctaId: 'tracking.viewed',
      event: 'tracking_view',
      value: orderId,
      metadata: {
        carrier: tracking.carrier,
        status: tracking.status,
        trackingNumber: tracking.trackingNumber
      }
    })
  }, [orderId, tracking])

  const refreshTracking = async () => {
    setRefreshing(true)

    // Simulate API call to refresh tracking data
    setTimeout(() => {
      // In a real app, you would fetch updated tracking data
      setRefreshing(false)
      trackCTA({
        ctaId: 'tracking.refreshed',
        event: 'tracking_refresh',
        value: orderId,
        metadata: { carrier: tracking.carrier }
      })
    }, 1000)
  }

  const copyTrackingNumber = async () => {
    try {
      await navigator.clipboard.writeText(tracking.trackingNumber)
      setCopiedTracking(true)
      setTimeout(() => setCopiedTracking(false), 2000)

      trackCTA({
        ctaId: 'tracking.number.copied',
        event: 'copy',
        value: tracking.trackingNumber,
        metadata: { carrier: tracking.carrier }
      })
    } catch (error) {
      console.error('Failed to copy tracking number:', error)
    }
  }

  const openCarrierSite = () => {
    const carrierUrls = {
      'SDA': `https://www.sda.it/wps/wcm/connect/Internet/it/home/spedizioni/tracking/risultato-ricerca?collo=${tracking.trackingNumber}`,
      'BRT': `https://as777.brt.it/vas/sped_det_show.hsm?referer=sped_numspe_par.htm&Nspediz=${tracking.trackingNumber}`,
      'DHL': `https://www.dhl.com/it-it/home/tracking/tracking-express.html?submit=1&tracking-id=${tracking.trackingNumber}`,
      'UPS': `https://www.ups.com/track?loc=it_IT&tracknum=${tracking.trackingNumber}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${tracking.trackingNumber}`
    }

    const url = carrierUrls[tracking.carrier as keyof typeof carrierUrls]
    if (url) {
      window.open(url, '_blank')
      trackCTA({
        ctaId: 'tracking.carrier.opened',
        event: 'external_link',
        value: tracking.carrier,
        metadata: { trackingNumber: tracking.trackingNumber }
      })
    }
  }

  const shareTracking = async () => {
    const shareData = {
      title: `Tracking ordine #${orderId}`,
      text: `Segui il tuo pacco: ${tracking.trackingNumber}`,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        alert('Link copiato negli appunti!')
      }

      trackCTA({
        ctaId: 'tracking.shared',
        event: 'share',
        value: orderId,
        metadata: { method: navigator.share ? 'native' : 'clipboard' }
      })
    } catch (error) {
      console.error('Failed to share tracking:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const currentStatus = trackingStatusConfig[tracking.status]

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600">Caricamento informazioni di tracking...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tracciamento spedizione
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={shareTracking}
              >
                <Share className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTracking}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className={`p-4 rounded-lg ${currentStatus.bgColor} border-2 border-current border-opacity-20`}>
            <div className="flex items-center gap-3 mb-2">
              <currentStatus.icon className={`w-6 h-6 ${currentStatus.textColor}`} />
              <h3 className={`text-lg font-semibold ${currentStatus.textColor}`}>
                {currentStatus.label}
              </h3>
            </div>
            <p className={`${currentStatus.textColor} opacity-90 mb-3`}>
              {currentStatus.description}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentStatus.color === 'green' ? 'bg-green-600' :
                  currentStatus.color === 'blue' ? 'bg-blue-600' :
                  currentStatus.color === 'purple' ? 'bg-purple-600' :
                  currentStatus.color === 'orange' ? 'bg-orange-600' :
                  currentStatus.color === 'yellow' ? 'bg-yellow-600' :
                  currentStatus.color === 'red' ? 'bg-red-600' :
                  'bg-gray-600'
                }`}
                style={{ width: `${currentStatus.progress}%` }}
              />
            </div>
            <p className="text-xs opacity-75">
              Progresso: {currentStatus.progress}%
            </p>
          </div>

          {/* Tracking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Dettagli spedizione</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Numero tracking:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-gray-900">{tracking.trackingNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyTrackingNumber}
                    >
                      {copiedTracking ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Corriere:</span>
                  <span className="text-gray-900 font-medium">{tracking.carrier}</span>
                </div>
                {tracking.currentLocation && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Posizione attuale:</span>
                    <span className="text-gray-900">{tracking.currentLocation.city}, {tracking.currentLocation.province}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Tempi di consegna</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Consegna stimata:</span>
                  <span className="text-gray-900 font-medium">
                    {formatDate(tracking.estimatedDelivery)}
                  </span>
                </div>
                {tracking.actualDelivery && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consegnato il:</span>
                    <span className="text-green-600 font-medium">
                      {formatDate(tracking.actualDelivery)}
                    </span>
                  </div>
                )}
                {tracking.specialInstructions && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-600 text-xs">Istruzioni speciali:</span>
                    <p className="text-gray-900 text-xs mt-1">{tracking.specialInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={openCarrierSite}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Sito {tracking.carrier}
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-2" />
              Contatta corriere
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Attempts (if any) */}
      {tracking.deliveryAttempts && tracking.deliveryAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Tentativi di consegna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tracking.deliveryAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">
                        Tentativo #{attempt.attemptNumber}
                      </p>
                      <span className="text-sm text-gray-600">
                        {formatDate(attempt.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      Risultato: <span className="font-medium">{
                        attempt.result === 'failed' ? 'Fallito' :
                        attempt.result === 'successful' ? 'Riuscito' :
                        'Riprogrammato'
                      }</span>
                    </p>
                    {attempt.reason && (
                      <p className="text-sm text-gray-600 mb-1">Motivo: {attempt.reason}</p>
                    )}
                    {attempt.nextAttempt && (
                      <p className="text-sm text-blue-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Prossimo tentativo: {formatDate(attempt.nextAttempt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Cronologia spedizione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div className="space-y-4">
              {tracking.events
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((event, index) => {
                  const eventConfig = trackingStatusConfig[event.status]
                  const EventIcon = eventConfig.icon
                  const isLatest = index === 0

                  return (
                    <div key={event.id} className="relative flex items-start gap-4">
                      {/* Timeline Dot */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                        isLatest ? eventConfig.bgColor : 'bg-white'
                      } border-2 ${
                        isLatest ? `border-${eventConfig.color}-300` : 'border-gray-300'
                      }`}>
                        <EventIcon className={`w-4 h-4 ${
                          isLatest ? eventConfig.textColor : 'text-gray-400'
                        }`} />
                      </div>

                      {/* Event Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium ${isLatest ? 'text-gray-900' : 'text-gray-700'}`}>
                            {event.message}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>

                        {event.details && (
                          <p className="text-sm text-gray-600 mb-2">{event.details}</p>
                        )}

                        {event.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {event.location.facility ? `${event.location.facility}, ` : ''}
                              {event.location.city}, {event.location.province}, {event.location.country}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Integration (Placeholder) */}
      {tracking.currentLocation?.coordinates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Posizione del pacco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">Mappa interattiva</p>
              <p className="text-sm text-gray-500">
                Posizione attuale: {tracking.currentLocation.city}, {tracking.currentLocation.province}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Coordinate: {tracking.currentLocation.coordinates.lat.toFixed(4)}, {tracking.currentLocation.coordinates.lng.toFixed(4)}
              </p>
              {/* In a real app, you would integrate with Google Maps, Mapbox, etc. */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help and Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Hai bisogno di aiuto?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              Contatta il corriere
            </Button>
            <Button variant="outline" className="flex items-center justify-center gap-2">
              <Building className="w-4 h-4" />
              Assistenza PiùCane
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">Problemi con la consegna?</h4>
            <p className="text-sm text-blue-800">
              Se hai problemi con la consegna o non trovi il pacco, contatta il nostro servizio clienti
              o il corriere direttamente per assistenza immediata.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}