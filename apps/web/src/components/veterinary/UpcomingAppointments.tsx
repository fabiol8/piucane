'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  AlertCircle,
  Plus,
  Edit,
  X,
  CheckCircle,
  Video,
  FileText
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type { Appointment, Dog } from '@/types/veterinary'

interface UpcomingAppointmentsProps {
  selectedDogId?: string | null
  onBookNew: () => void
}

export function UpcomingAppointments({
  selectedDogId,
  onBookNew
}: UpcomingAppointmentsProps) {
  const analytics = useAnalytics()
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments)

  const handleCancelAppointment = (appointmentId: string) => {
    analytics.trackEvent('appointment_cancel', {
      appointment_id: appointmentId,
      source: 'upcoming_list'
    })

    setAppointments(prev =>
      prev.map(apt =>
        apt.appointmentId === appointmentId
          ? { ...apt, status: 'cancelled' }
          : apt
      )
    )
  }

  const handleRescheduleAppointment = (appointmentId: string) => {
    analytics.trackEvent('appointment_reschedule_start', {
      appointment_id: appointmentId,
      source: 'upcoming_list'
    })
    // TODO: Open reschedule modal
  }

  const handleCallClinic = (appointment: Appointment) => {
    if (appointment.clinic.contact.phone) {
      analytics.trackEvent('appointment_call_clinic', {
        appointment_id: appointment.appointmentId,
        clinic_id: appointment.clinic.clinicId
      })
      window.location.href = `tel:${appointment.clinic.contact.phone}`
    }
  }

  const handleJoinVideoCall = (appointment: Appointment) => {
    if (appointment.videoCallUrl) {
      analytics.trackEvent('appointment_video_join', {
        appointment_id: appointment.appointmentId
      })
      window.open(appointment.videoCallUrl, '_blank')
    }
  }

  const getStatusBadge = (status: Appointment['status'], type: Appointment['type']) => {
    const variants = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800'
    }

    const labels = {
      confirmed: 'Confermato',
      pending: 'In attesa',
      cancelled: 'Annullato',
      completed: 'Completato',
      in_progress: 'In corso'
    }

    return (
      <Badge className={variants[status]}>
        {type === 'video' && <Video className="h-3 w-3 mr-1" />}
        {labels[status]}
      </Badge>
    )
  }

  const getAppointmentIcon = (type: Appointment['type']) => {
    switch (type) {
      case 'emergency':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'video':
        return <Video className="h-5 w-5 text-blue-500" />
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />
    }
  }

  const filteredAppointments = selectedDogId
    ? appointments.filter(apt => apt.dogId === selectedDogId)
    : appointments

  const upcomingAppointments = filteredAppointments
    .filter(apt => apt.status !== 'cancelled' && new Date(apt.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())

  if (upcomingAppointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nessun appuntamento programmato
          </h3>
          <p className="text-gray-600 mb-6">
            Non hai appuntamenti veterinari in programma
          </p>
          <Button onClick={onBookNew}>
            <Plus className="h-4 w-4 mr-2" />
            Prenota Visita
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Prossimi Appuntamenti
        </h2>
        <Button onClick={onBookNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Appuntamento
        </Button>
      </div>

      {upcomingAppointments.map((appointment) => (
        <Card key={appointment.appointmentId} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="flex-shrink-0">
                  {getAppointmentIcon(appointment.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {appointment.title}
                    </h3>
                    {getStatusBadge(appointment.status, appointment.type)}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(appointment.dateTime).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(appointment.dateTime).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {appointment.duration && (
                          <span className="text-gray-500 ml-1">
                            ({appointment.duration} min)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {appointment.clinic.displayName}
                        {appointment.type !== 'video' && (
                          <span className="text-gray-500 ml-1">
                            - {appointment.clinic.address.city}
                          </span>
                        )}
                      </span>
                    </div>

                    {appointment.veterinarian && (
                      <div className="flex items-center space-x-2">
                        <span className="h-4 w-4 flex items-center justify-center text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                          Dr
                        </span>
                        <span>
                          Dr. {appointment.veterinarian.firstName} {appointment.veterinarian.lastName}
                          {appointment.veterinarian.specialty && (
                            <span className="text-gray-500 ml-1">
                              - {appointment.veterinarian.specialty}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{appointment.notes}</p>
                      </div>
                    )}

                    {appointment.preparationInstructions && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Istruzioni per la visita
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              {appointment.preparationInstructions}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                {appointment.status === 'confirmed' && (
                  <>
                    {appointment.type === 'video' && appointment.videoCallUrl && (
                      <Button
                        size="sm"
                        onClick={() => handleJoinVideoCall(appointment)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Partecipa
                      </Button>
                    )}

                    {appointment.clinic.contact.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCallClinic(appointment)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Chiama
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRescheduleAppointment(appointment.appointmentId)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelAppointment(appointment.appointmentId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annulla
                    </Button>
                  </>
                )}

                {appointment.status === 'pending' && (
                  <div className="text-xs text-yellow-600 text-center">
                    In attesa di conferma
                  </div>
                )}
              </div>
            </div>

            {/* Reminder notice for upcoming appointments */}
            {appointment.status === 'confirmed' &&
             new Date(appointment.dateTime).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">
                    Appuntamento nelle prossime 24 ore
                  </span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Ricordati di portare il libretto sanitario e eventuali esami precedenti
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Mock data for demonstration
const mockAppointments: Appointment[] = [
  {
    appointmentId: 'apt_001',
    dogId: 'dog_001',
    clinicId: 'clinic_001',
    veterinarianId: 'vet_001',
    type: 'routine',
    title: 'Visita di controllo generale',
    dateTime: new Date('2024-01-15T10:30:00').toISOString(),
    duration: 30,
    status: 'confirmed',
    notes: 'Controllo vaccinazioni e peso',
    preparationInstructions: 'Portare il libretto sanitario aggiornato. Il cane deve essere a digiuno da almeno 8 ore.',
    clinic: {
      clinicId: 'clinic_001',
      displayName: 'Clinica Veterinaria Sant\'Antonio',
      address: {
        street: 'Via Roma 123',
        city: 'Milano',
        zipCode: '20100',
        country: 'IT'
      },
      contact: {
        phone: '+39 02 123 4567',
        email: 'info@santantonio.vet'
      }
    },
    veterinarian: {
      veterinarianId: 'vet_001',
      firstName: 'Marco',
      lastName: 'Rossi',
      specialty: 'Medicina Generale'
    },
    createdAt: new Date('2024-01-01T09:00:00').toISOString()
  },
  {
    appointmentId: 'apt_002',
    dogId: 'dog_001',
    clinicId: 'clinic_002',
    veterinarianId: 'vet_002',
    type: 'video',
    title: 'Consulto dermatologico online',
    dateTime: new Date('2024-01-18T15:00:00').toISOString(),
    duration: 20,
    status: 'confirmed',
    notes: 'Follow-up per dermatite',
    videoCallUrl: 'https://meet.google.com/abc-defg-hij',
    clinic: {
      clinicId: 'clinic_002',
      displayName: 'Centro Dermatologico Veterinario',
      address: {
        street: 'Via Specialisti 45',
        city: 'Roma',
        zipCode: '00100',
        country: 'IT'
      },
      contact: {
        phone: '+39 06 987 6543',
        email: 'info@dermatologia.vet'
      }
    },
    veterinarian: {
      veterinarianId: 'vet_002',
      firstName: 'Laura',
      lastName: 'Bianchi',
      specialty: 'Dermatologia'
    },
    createdAt: new Date('2024-01-05T14:00:00').toISOString()
  },
  {
    appointmentId: 'apt_003',
    dogId: 'dog_002',
    clinicId: 'clinic_001',
    veterinarianId: 'vet_003',
    type: 'specialist',
    title: 'Visita cardiologica',
    dateTime: new Date('2024-01-20T11:00:00').toISOString(),
    duration: 45,
    status: 'pending',
    notes: 'Controllo soffio al cuore',
    preparationInstructions: 'Portare eventuali ECG precedenti. Evitare sforzi intensi il giorno prima.',
    clinic: {
      clinicId: 'clinic_001',
      displayName: 'Clinica Veterinaria Sant\'Antonio',
      address: {
        street: 'Via Roma 123',
        city: 'Milano',
        zipCode: '20100',
        country: 'IT'
      },
      contact: {
        phone: '+39 02 123 4567',
        email: 'info@santantonio.vet'
      }
    },
    veterinarian: {
      veterinarianId: 'vet_003',
      firstName: 'Giuseppe',
      lastName: 'Verdi',
      specialty: 'Cardiologia'
    },
    createdAt: new Date('2024-01-03T16:30:00').toISOString()
  }
]