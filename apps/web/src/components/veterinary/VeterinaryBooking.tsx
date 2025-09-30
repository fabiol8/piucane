'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Star,
  Euro
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type {
  Clinic,
  Veterinarian,
  Appointment,
  VetAffiliation,
  Specialty,
  SPECIALTIES
} from '@/types/veterinary'

interface VeterinaryBookingProps {
  selectedDogId?: string
  preselectedClinicId?: string
  preselectedSpecialty?: string
  onAppointmentBooked?: (appointment: Appointment) => void
  onClose?: () => void
}

interface TimeSlot {
  time: string
  available: boolean
  vetId?: string
  vetName?: string
}

interface AvailableDay {
  date: Date
  dayName: string
  slots: TimeSlot[]
}

// Mock data - in real app this would come from API
const mockClinics: Clinic[] = [
  {
    id: 'clinic-1',
    legalName: 'Clinica Veterinaria San Francesco',
    displayName: 'Clinica San Francesco',
    typeRef: 'hospital',
    address: {
      street: 'Via Roma, 123',
      zip: '00100',
      city: 'Roma',
      province: 'RM',
      region: 'Lazio',
      country: 'IT'
    },
    geo: { lat: 41.9028, lng: 12.4964 },
    phones: [{ label: 'Principale', value: '+39 06 1234567' }],
    emails: [{ label: 'Info', value: 'info@clinicasanfrancesco.it' }],
    emergency24h: true,
    services: ['internal_medicine', 'surgery', 'cardiology', 'emergency'],
    rating: { avg: 4.8, count: 156 },
    verified: true,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'clinic-2',
    legalName: 'Ambulatorio Veterinario Dr. Rossi',
    displayName: 'Dr. Rossi - Centro Veterinario',
    typeRef: 'clinic',
    address: {
      street: 'Piazza della Repubblica, 45',
      zip: '20121',
      city: 'Milano',
      province: 'MI',
      region: 'Lombardia',
      country: 'IT'
    },
    geo: { lat: 45.4642, lng: 9.1900 },
    phones: [{ label: 'Principale', value: '+39 02 9876543' }],
    emails: [{ label: 'Prenotazioni', value: 'prenotazioni@drrossi.it' }],
    emergency24h: false,
    services: ['internal_medicine', 'dermatology', 'dentistry'],
    rating: { avg: 4.6, count: 89 },
    verified: true,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockVeterinarians: Veterinarian[] = [
  {
    id: 'vet-1',
    firstName: 'Marco',
    lastName: 'Bianchi',
    fullName: 'Dr. Marco Bianchi',
    registrationNumber: 'RM12345',
    specialties: ['internal_medicine', 'cardiology'],
    languages: ['italiano', 'inglese'],
    experience: {
      yearsOfPractice: 15,
      education: ['Università di Bologna - Medicina Veterinaria'],
      certifications: ['Cardiologia Veterinaria - SCIVAC']
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'vet-2',
    firstName: 'Laura',
    lastName: 'Rossi',
    fullName: 'Dr.ssa Laura Rossi',
    registrationNumber: 'MI67890',
    specialties: ['dermatology', 'internal_medicine'],
    languages: ['italiano'],
    experience: {
      yearsOfPractice: 8,
      education: ['Università di Milano - Medicina Veterinaria']
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockAvailability: AvailableDay[] = [
  {
    date: new Date(2025, 9, 30),
    dayName: 'Giovedì',
    slots: [
      { time: '09:00', available: true, vetId: 'vet-1', vetName: 'Dr. Bianchi' },
      { time: '09:30', available: false },
      { time: '10:00', available: true, vetId: 'vet-1', vetName: 'Dr. Bianchi' },
      { time: '14:30', available: true, vetId: 'vet-2', vetName: 'Dr.ssa Rossi' },
      { time: '15:00', available: true, vetId: 'vet-2', vetName: 'Dr.ssa Rossi' }
    ]
  },
  {
    date: new Date(2025, 10, 1),
    dayName: 'Venerdì',
    slots: [
      { time: '08:30', available: true, vetId: 'vet-1', vetName: 'Dr. Bianchi' },
      { time: '09:00', available: true, vetId: 'vet-1', vetName: 'Dr. Bianchi' },
      { time: '10:30', available: true, vetId: 'vet-2', vetName: 'Dr.ssa Rossi' },
      { time: '16:00', available: true, vetId: 'vet-1', vetName: 'Dr. Bianchi' }
    ]
  }
]

export function VeterinaryBooking({
  selectedDogId,
  preselectedClinicId,
  preselectedSpecialty,
  onAppointmentBooked,
  onClose
}: VeterinaryBookingProps) {
  const analytics = useAnalytics()
  const [step, setStep] = useState<'clinic' | 'type' | 'datetime' | 'confirm'>('clinic')
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(
    preselectedClinicId ? mockClinics.find(c => c.id === preselectedClinicId) || null : null
  )
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(preselectedSpecialty || null)
  const [appointmentType, setAppointmentType] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedVetId, setSelectedVetId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const appointmentTypes = [
    { id: 'checkup', name: 'Visita di controllo', description: 'Controllo generale di salute', duration: '30 min', price: '€ 35-50' },
    { id: 'vaccination', name: 'Vaccinazione', description: 'Vaccini di routine o richiamo', duration: '20 min', price: '€ 25-40' },
    { id: 'followup', name: 'Controllo post-visita', description: 'Seguito di una precedente visita', duration: '20 min', price: '€ 30-45' },
    { id: 'exam', name: 'Visita specialistica', description: 'Consulto con veterinario specialista', duration: '45 min', price: '€ 50-80' },
    { id: 'emergency', name: 'Urgenza', description: 'Visita urgente non differibile', duration: '30 min', price: '€ 60-100' }
  ]

  useEffect(() => {
    if (preselectedClinicId && !selectedClinic) {
      const clinic = mockClinics.find(c => c.id === preselectedClinicId)
      if (clinic) {
        setSelectedClinic(clinic)
        setStep('type')
      }
    }
  }, [preselectedClinicId, selectedClinic])

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    setStep('type')
    analytics.trackEvent('vet_booking_clinic_selected', {
      clinic_id: clinic.id,
      clinic_name: clinic.displayName
    })
  }

  const handleTypeSelect = (type: string) => {
    setAppointmentType(type)
    setStep('datetime')
    analytics.trackEvent('vet_booking_type_selected', {
      appointment_type: type,
      clinic_id: selectedClinic?.id
    })
  }

  const handleTimeSlotSelect = (day: AvailableDay, slot: TimeSlot) => {
    if (!slot.available) return

    setSelectedDate(day.date)
    setSelectedTime(slot.time)
    setSelectedVetId(slot.vetId || null)
    setStep('confirm')

    analytics.trackEvent('vet_booking_time_selected', {
      date: day.date.toISOString(),
      time: slot.time,
      vet_id: slot.vetId,
      clinic_id: selectedClinic?.id
    })
  }

  const handleConfirmBooking = async () => {
    if (!selectedClinic || !appointmentType || !selectedDate || !selectedTime) return

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newAppointment: Appointment = {
        id: `appointment-${Date.now()}`,
        dogId: selectedDogId || 'default-dog',
        vetId: selectedVetId,
        clinicId: selectedClinic.id,
        specialtyId: selectedSpecialty || undefined,
        dateStart: new Date(selectedDate.getTime() + parseInt(selectedTime.split(':')[0]) * 60 * 60 * 1000 + parseInt(selectedTime.split(':')[1]) * 60 * 1000),
        type: appointmentType as any,
        title: appointmentTypes.find(t => t.id === appointmentType)?.name,
        notes: notes || undefined,
        status: 'scheduled',
        reminders: [
          { channel: 'push', offset: '-24h', sent: false },
          { channel: 'push', offset: '-2h', sent: false }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      analytics.trackEvent('vet_appointment_booked', {
        appointment_id: newAppointment.id,
        clinic_id: selectedClinic.id,
        appointment_type: appointmentType,
        vet_id: selectedVetId,
        days_in_advance: Math.ceil((selectedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      })

      onAppointmentBooked?.(newAppointment)
      onClose?.()

    } catch (error) {
      console.error('Error booking appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderClinicSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Seleziona la clinica</h2>
        <p className="text-gray-600 text-sm">Scegli dove vuoi prenotare la visita</p>
      </div>

      <div className="space-y-4">
        {mockClinics.map((clinic) => (
          <Card
            key={clinic.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-orange-200"
            onClick={() => handleClinicSelect(clinic)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">{clinic.displayName}</h3>
                    {clinic.verified && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verificato
                      </Badge>
                    )}
                    {clinic.emergency24h && (
                      <Badge variant="secondary" className="bg-red-50 text-red-700 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        24h
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{clinic.address.street}, {clinic.address.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{clinic.phones[0]?.value}</span>
                    </div>
                    {clinic.rating && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{clinic.rating.avg} ({clinic.rating.count} recensioni)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {clinic.services.slice(0, 3).map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {SPECIALTIES[service]?.name || service}
                      </Badge>
                    ))}
                    {clinic.services.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{clinic.services.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('clinic')}
          className="flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Indietro
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tipo di visita</h2>
          <p className="text-gray-600 text-sm">{selectedClinic?.displayName}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {appointmentTypes.map((type) => (
          <Card
            key={type.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-orange-200"
            onClick={() => handleTypeSelect(type.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{type.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {type.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      {type.price}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderDateTimeSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('type')}
          className="flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Indietro
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Seleziona data e ora</h2>
          <p className="text-gray-600 text-sm">
            {appointmentTypes.find(t => t.id === appointmentType)?.name} presso {selectedClinic?.displayName}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {mockAvailability.map((day) => (
          <Card key={day.date.toISOString()}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {day.dayName} {day.date.toLocaleDateString('it-IT')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {day.slots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={slot.available ? "outline" : "secondary"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => handleTimeSlotSelect(day, slot)}
                    className={`text-xs ${slot.available ? 'hover:bg-orange-50 hover:border-orange-200' : 'opacity-50'}`}
                  >
                    <div className="text-center">
                      <div>{slot.time}</div>
                      {slot.available && slot.vetName && (
                        <div className="text-xs text-gray-500 truncate">{slot.vetName}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
              {day.slots.filter(s => s.available).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nessun orario disponibile per questa data
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderConfirmation = () => {
    const selectedTypeData = appointmentTypes.find(t => t.id === appointmentType)
    const selectedVet = mockVeterinarians.find(v => v.id === selectedVetId)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep('datetime')}
            className="flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Indietro
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Conferma prenotazione</h2>
            <p className="text-gray-600 text-sm">Controlla i dettagli prima di confermare</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riepilogo appuntamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">{selectedClinic?.displayName}</p>
                <p className="text-sm text-gray-600">
                  {selectedClinic?.address.street}, {selectedClinic?.address.city}
                </p>
                <p className="text-sm text-gray-600">{selectedClinic?.phones[0]?.value}</p>
              </div>
            </div>

            {selectedVet && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{selectedVet.fullName}</p>
                  <p className="text-sm text-gray-600">
                    {selectedVet.specialties.map(s => SPECIALTIES[s]?.name).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Stethoscope className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">{selectedTypeData?.name}</p>
                <p className="text-sm text-gray-600">{selectedTypeData?.description}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">
                  {selectedDate?.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600">ore {selectedTime}</p>
                <p className="text-sm text-gray-600">Durata: {selectedTypeData?.duration}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Euro className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">Costo stimato</p>
                <p className="text-sm text-gray-600">{selectedTypeData?.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Note aggiuntive (opzionale)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scrivi eventuali note o richieste speciali per il veterinario..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none h-20 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{notes.length}/500 caratteri</p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            onClick={handleConfirmBooking}
            disabled={isLoading}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Prenotazione in corso...' : 'Conferma prenotazione'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {step === 'clinic' && renderClinicSelection()}
      {step === 'type' && renderTypeSelection()}
      {step === 'datetime' && renderDateTimeSelection()}
      {step === 'confirm' && renderConfirmation()}
    </div>
  )
}