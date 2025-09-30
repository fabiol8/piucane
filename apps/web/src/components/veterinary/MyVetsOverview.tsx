'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  MapPin,
  Phone,
  Clock,
  Star,
  Plus,
  Edit,
  AlertTriangle,
  Stethoscope,
  Building2,
  Calendar,
  FileText,
  Settings
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { SPECIALTIES } from '@/types/veterinary'
import type { DogVetsResponse, DogVetLink, Veterinarian, Clinic } from '@/types/veterinary'

export function MyVetsOverview() {
  const analytics = useAnalytics()
  const [loading, setLoading] = useState(true)
  const [selectedDog, setSelectedDog] = useState<string | null>(null)
  const [vetData, setVetData] = useState<DogVetsResponse | null>(null)

  // Mock data - in real implementation, fetch from API
  const mockDogs = [
    { id: 'dog1', name: 'Luna', breed: 'Labrador', avatar: '/images/dogs/luna.jpg' },
    { id: 'dog2', name: 'Max', breed: 'Golden Retriever', avatar: '/images/dogs/max.jpg' }
  ]

  const mockVetData: DogVetsResponse = {
    primary: {
      link: {
        id: 'link1',
        dogId: 'dog1',
        vetId: 'vet1',
        clinicId: 'clinic1',
        role: 'primary',
        isPreferred: true,
        notes: 'Veterinario di base per controlli generali',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      vet: {
        id: 'vet1',
        firstName: 'Elena',
        lastName: 'Verdi',
        fullName: 'Dott.ssa Elena Verdi',
        specialties: ['internal_medicine'],
        contacts: {
          phoneE164: '+39392223344',
          email: 'e.verdi@avmonza.it'
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      clinic: {
        id: 'clinic1',
        legalName: 'Ambulatorio Veterinario Monza Centro',
        displayName: 'AV Monza Centro',
        typeRef: 'clinic',
        address: {
          street: 'Piazza Tranquilla 3',
          zip: '20900',
          city: 'Monza',
          province: 'MB',
          region: 'Lombardia',
          country: 'IT'
        },
        geo: { lat: 45.5842, lng: 9.2744 },
        phones: [{ label: 'Reception', value: '+39392223344' }],
        emails: [{ label: 'Info', value: 'info@avmonza.it' }],
        emergency24h: false,
        services: ['internal_medicine'],
        verified: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    specialists: [
      {
        link: {
          id: 'link2',
          dogId: 'dog1',
          vetId: 'vet2',
          clinicId: 'clinic2',
          role: 'specialist',
          specialtyId: 'orthopedics',
          notes: 'Visita post-trauma ginocchio',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        vet: {
          id: 'vet2',
          firstName: 'Giulia',
          lastName: 'Rossi',
          fullName: 'Dott.ssa Giulia Rossi',
          specialties: ['orthopedics'],
          contacts: {
            email: 'g.rossi@cvbergamo.it'
          },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        clinic: {
          id: 'clinic2',
          legalName: 'Clinica Veterinaria Bergamo Ortho',
          displayName: 'CV Bergamo Ortho',
          typeRef: 'clinic',
          address: {
            street: 'Via Ortopedia 10',
            zip: '24100',
            city: 'Bergamo',
            province: 'BG',
            region: 'Lombardia',
            country: 'IT'
          },
          geo: { lat: 45.698, lng: 9.67 },
          phones: [{ label: 'Centralino', value: '+390351234567' }],
          emails: [],
          emergency24h: false,
          services: ['orthopedics'],
          verified: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        specialty: SPECIALTIES.orthopedics
      },
      {
        link: {
          id: 'link3',
          dogId: 'dog1',
          vetId: 'vet3',
          clinicId: 'clinic3',
          role: 'specialist',
          specialtyId: 'cardiology',
          notes: 'Controllo soffi cardiaci lievi',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        vet: {
          id: 'vet3',
          firstName: 'Luca',
          lastName: 'Bianchi',
          fullName: 'Dott. Luca Bianchi',
          specialties: ['cardiology'],
          contacts: {
            email: 'l.bianchi@icvmilano.it'
          },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        clinic: {
          id: 'clinic3',
          legalName: 'Istituto Cardiologico Veterinario Milano',
          displayName: 'ICV Milano',
          typeRef: 'clinic',
          address: {
            street: 'Corso Cuore 5',
            zip: '20100',
            city: 'Milano',
            province: 'MI',
            region: 'Lombardia',
            country: 'IT'
          },
          geo: { lat: 45.464, lng: 9.19 },
          phones: [{ label: 'Segreteria', value: '+390287654321' }],
          emails: [],
          emergency24h: false,
          services: ['cardiology'],
          verified: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        specialty: SPECIALTIES.cardiology
      }
    ],
    emergency: [
      {
        link: {
          id: 'link4',
          dogId: 'dog1',
          clinicId: 'clinic4',
          role: 'emergency',
          notes: 'PS H24 più vicino',
          isPreferred: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        clinic: {
          id: 'clinic4',
          legalName: 'Ospedale Veterinario H24 Milano',
          displayName: 'OV Milano H24',
          typeRef: 'emergency',
          address: {
            street: 'Via Emergenze 24',
            zip: '20100',
            city: 'Milano',
            province: 'MI',
            region: 'Lombardia',
            country: 'IT'
          },
          geo: { lat: 45.47, lng: 9.19 },
          phones: [{ label: 'PS 24/7', value: '+390200000000' }],
          emails: [],
          emergency24h: true,
          services: ['emergency'],
          verified: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ]
  }

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setVetData(mockVetData)
      setSelectedDog(mockDogs[0].id)
      setLoading(false)
    }, 1000)

    analytics.trackEvent('my_vets_view', {
      dogs_count: mockDogs.length
    })
  }, [analytics])

  const handleCallVet = (phone: string, vetName: string) => {
    analytics.trackEvent('vet_call_from_overview', {
      vet_name: vetName,
      phone
    })

    window.location.href = `tel:${phone}`
  }

  const handleBookAppointment = (vetId: string, clinicId: string) => {
    analytics.trackEvent('appointment_book_from_overview', {
      vet_id: vetId,
      clinic_id: clinicId
    })

    // Navigate to appointment booking
    // router.push(`/veterinary/appointments/book?vetId=${vetId}&clinicId=${clinicId}`)
  }

  const handleAddVet = () => {
    analytics.trackEvent('add_vet_click', {
      source: 'my_vets_overview'
    })

    // Navigate to vet search with add mode
    // router.push('/veterinary?tab=search&mode=add')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dog Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            I Miei Veterinari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <span className="text-sm font-medium text-gray-700">
              Visualizza veterinari per:
            </span>
            <div className="flex space-x-2">
              {mockDogs.map(dog => (
                <Button
                  key={dog.id}
                  size="sm"
                  variant={selectedDog === dog.id ? "default" : "outline"}
                  onClick={() => setSelectedDog(dog.id)}
                  className="flex items-center gap-2"
                >
                  {dog.avatar && (
                    <img
                      src={dog.avatar}
                      alt={dog.name}
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  {dog.name}
                </Button>
              ))}
            </div>
          </div>

          {!vetData?.primary && !vetData?.specialists.length && !vetData?.emergency.length ? (
            <div className="text-center py-12">
              <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun veterinario configurato
              </h3>
              <p className="text-gray-600 mb-6">
                Aggiungi i veterinari che seguono {mockDogs.find(d => d.id === selectedDog)?.name}
              </p>
              <Button onClick={handleAddVet}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Primo Veterinario
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Vet */}
              {vetData?.primary && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Veterinario di Base
                  </h3>

                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {vetData.primary.vet?.fullName}
                            </h4>
                            <Badge variant="default" className="bg-blue-500">
                              Primario
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>{vetData.primary.clinic.displayName}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {vetData.primary.clinic.address.street}, {vetData.primary.clinic.address.city}
                              </span>
                            </div>

                            {vetData.primary.vet?.contacts?.phoneE164 && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>{vetData.primary.vet.contacts.phoneE164}</span>
                              </div>
                            )}

                            {vetData.primary.link.notes && (
                              <p className="text-gray-500 italic">
                                {vetData.primary.link.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          {vetData.primary.vet?.contacts?.phoneE164 && (
                            <Button
                              size="sm"
                              onClick={() => handleCallVet(
                                vetData.primary!.vet!.contacts!.phoneE164!,
                                vetData.primary!.vet!.fullName
                              )}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Chiama
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBookAppointment(
                              vetData.primary!.vet!.id,
                              vetData.primary!.clinic.id
                            )}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Prenota
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Specialists */}
              {vetData?.specialists.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-purple-500" />
                      Specialisti ({vetData.specialists.length})
                    </h3>
                    <Button size="sm" variant="outline" onClick={handleAddVet}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Specialista
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vetData.specialists.map((specialist, index) => (
                      <Card key={specialist.link.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">
                                  {specialist.specialty.icon}
                                </span>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {specialist.vet?.fullName}
                                  </h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {specialist.specialty.name}
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <Building2 className="h-3 w-3" />
                                  <span>{specialist.clinic.displayName}</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{specialist.clinic.address.city}</span>
                                </div>

                                {specialist.link.notes && (
                                  <p className="text-xs text-gray-500 italic">
                                    {specialist.link.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-2">
                              {specialist.clinic.phones[0] && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCallVet(
                                    specialist.clinic.phones[0].value,
                                    specialist.vet?.fullName || 'Veterinario'
                                  )}
                                >
                                  <Phone className="h-3 w-3" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBookAppointment(
                                  specialist.vet?.id || '',
                                  specialist.clinic.id
                                )}
                              >
                                <Calendar className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency */}
              {vetData?.emergency.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Pronto Soccorso
                  </h3>

                  <div className="space-y-3">
                    {vetData.emergency.map((emergency, index) => (
                      <Card key={emergency.link.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {emergency.clinic.displayName}
                                </h4>
                                <Badge variant="destructive" className="text-xs">
                                  H24
                                </Badge>
                                {emergency.link.isPreferred && (
                                  <Badge variant="secondary" className="text-xs">
                                    Preferito
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>
                                    {emergency.clinic.address.street}, {emergency.clinic.address.city}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4" />
                                  <span>{emergency.clinic.phones[0]?.value}</span>
                                </div>

                                <div className="flex items-center space-x-2 text-red-600">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">Aperto 24/7</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              <Button
                                size="sm"
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleCallVet(
                                  emergency.clinic.phones[0]?.value || '',
                                  emergency.clinic.displayName
                                )}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Chiama
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                Vai
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Azioni Rapide</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddVet}
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <Plus className="h-5 w-5 mb-2" />
                      <span className="text-xs">Aggiungi Veterinario</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <Calendar className="h-5 w-5 mb-2" />
                      <span className="text-xs">Prenota Visita</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <FileText className="h-5 w-5 mb-2" />
                      <span className="text-xs">Storico Visite</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <Settings className="h-5 w-5 mb-2" />
                      <span className="text-xs">Gestisci</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}