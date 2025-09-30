'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Bell,
  BellOff,
  Navigation,
  MessageCircle,
  Filter,
  Search,
  MoreVertical,
  CalendarDays,
  Timer,
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type {
  Appointment,
  Clinic,
  Veterinarian,
  SPECIALTIES
} from '@/types/veterinary'

interface AppointmentManagerProps {
  selectedDogId?: string
  onCreateAppointment?: () => void
  onEditAppointment?: (appointmentId: string) => void
  onCancelAppointment?: (appointmentId: string) => void
  onRescheduleAppointment?: (appointmentId: string) => void
}

interface AppointmentWithDetails extends Appointment {
  clinicDetails?: Clinic
  vetDetails?: Veterinarian
  canCancel: boolean
  canReschedule: boolean
  canModify: boolean
}

// Mock data - in real app this would come from API
const mockAppointments: AppointmentWithDetails[] = [
  {
    id: 'apt-1',
    dogId: 'dog-1',
    vetId: 'vet-1',
    clinicId: 'clinic-1',
    specialtyId: 'cardiology',
    dateStart: new Date(2024, 9, 25, 10, 0), // Tomorrow 10:00
    dateEnd: new Date(2024, 9, 25, 10, 30),
    type: 'exam',
    title: 'Visita cardiologica di controllo',
    notes: 'Controllo post-operatorio. Portare esami precedenti.',
    status: 'confirmed',
    reminders: [
      { channel: 'push', offset: '-24h', sent: true, sentAt: new Date() },
      { channel: 'push', offset: '-2h', sent: false }
    ],
    reminderSettings: {
      enabled: true,
      channels: ['push', 'email'],
      offsets: ['-24h', '-2h']
    },
    clinicDetails: {
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
      services: ['cardiology'],
      verified: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    vetDetails: {
      id: 'vet-1',
      firstName: 'Marco',
      lastName: 'Bianchi',
      fullName: 'Dr. Marco Bianchi',
      specialties: ['cardiology'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    canCancel: true,
    canReschedule: true,
    canModify: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'apt-2',
    dogId: 'dog-1',
    vetId: 'vet-2',
    clinicId: 'clinic-2',
    dateStart: new Date(2024, 10, 5, 14, 30), // Next week
    dateEnd: new Date(2024, 10, 5, 15, 0),
    type: 'checkup',
    title: 'Controllo generale',
    status: 'scheduled',
    reminders: [
      { channel: 'push', offset: '-24h', sent: false },
      { channel: 'email', offset: '-2h', sent: false }
    ],
    reminderSettings: {
      enabled: true,
      channels: ['push', 'email'],
      offsets: ['-24h', '-2h']
    },
    clinicDetails: {
      id: 'clinic-2',
      legalName: 'Ambulatorio Dr. Rossi',
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
      services: ['internal_medicine'],
      verified: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    vetDetails: {
      id: 'vet-2',
      firstName: 'Laura',
      lastName: 'Rossi',
      fullName: 'Dr.ssa Laura Rossi',
      specialties: ['internal_medicine'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    canCancel: true,
    canReschedule: true,
    canModify: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'apt-3',
    dogId: 'dog-1',
    vetId: 'vet-1',
    clinicId: 'clinic-1',
    dateStart: new Date(2024, 8, 20, 9, 0), // Past appointment
    dateEnd: new Date(2024, 8, 20, 9, 30),
    type: 'vaccination',
    title: 'Vaccinazione annuale',
    status: 'completed',
    reminders: [],
    clinicDetails: {
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
      services: ['internal_medicine'],
      verified: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    vetDetails: {
      id: 'vet-1',
      firstName: 'Marco',
      lastName: 'Bianchi',
      fullName: 'Dr. Marco Bianchi',
      specialties: ['internal_medicine'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    canCancel: false,
    canReschedule: false,
    canModify: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'apt-4',
    dogId: 'dog-1',
    clinicId: 'clinic-1',
    dateStart: new Date(2024, 8, 10, 11, 0), // Cancelled appointment
    dateEnd: new Date(2024, 8, 10, 11, 30),
    type: 'checkup',
    title: 'Controllo generale',
    notes: 'Annullato per maltempo',
    status: 'cancelled',
    reminders: [],
    clinicDetails: {
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
      services: ['internal_medicine'],
      verified: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    canCancel: false,
    canReschedule: false,
    canModify: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export function AppointmentManager({
  selectedDogId,
  onCreateAppointment,
  onEditAppointment,
  onCancelAppointment,
  onRescheduleAppointment
}: AppointmentManagerProps) {
  const analytics = useAnalytics()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Filter appointments based on selected dog
  const appointments = selectedDogId
    ? mockAppointments.filter(apt => apt.dogId === selectedDogId)
    : mockAppointments

  // Categorize appointments
  const upcomingAppointments = appointments.filter(apt =>
    ['scheduled', 'confirmed'].includes(apt.status) &&
    apt.dateStart > new Date()
  ).sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime())

  const pastAppointments = appointments.filter(apt =>
    apt.status === 'completed' || apt.dateStart < new Date()
  ).sort((a, b) => b.dateStart.getTime() - a.dateStart.getTime())

  const cancelledAppointments = appointments.filter(apt =>
    apt.status === 'cancelled'
  ).sort((a, b) => b.dateStart.getTime() - a.dateStart.getTime())

  // Filter and search
  const getFilteredAppointments = (appointmentList: AppointmentWithDetails[]) => {
    return appointmentList.filter(apt => {
      const matchesSearch = searchTerm === '' ||
        apt.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.clinicDetails?.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.vetDetails?.fullName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = filterStatus === 'all' || apt.status === filterStatus

      return matchesSearch && matchesFilter
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
      confirmed: 'bg-green-50 text-green-700 border-green-200',
      completed: 'bg-gray-50 text-gray-700 border-gray-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
      no_show: 'bg-orange-50 text-orange-700 border-orange-200'
    }
    return colors[status as keyof typeof colors] || colors.scheduled
  }

  const getStatusText = (status: string) => {
    const texts = {
      scheduled: 'Programmato',
      confirmed: 'Confermato',
      completed: 'Completato',
      cancelled: 'Annullato',
      no_show: 'Mancata presentazione'
    }
    return texts[status as keyof typeof texts] || status
  }

  const getAppointmentTypeText = (type: string) => {
    const types = {
      checkup: 'Controllo',
      vaccination: 'Vaccinazione',
      followup: 'Follow-up',
      exam: 'Visita specialistica',
      emergency: 'Emergenza',
      surgery: 'Chirurgia',
      consultation: 'Consulenza'
    }
    return types[type as keyof typeof types] || type
  }

  const isAppointmentSoon = (dateStart: Date) => {
    const now = new Date()
    const diffHours = (dateStart.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours <= 24 && diffHours >= 0
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Sei sicuro di voler annullare questo appuntamento?')) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      analytics.trackEvent('vet_appointment_cancelled', {
        appointment_id: appointmentId
      })

      onCancelAppointment?.(appointmentId)
    } catch (error) {
      console.error('Error cancelling appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRescheduleAppointment = (appointmentId: string) => {
    analytics.trackEvent('vet_appointment_reschedule_click', {
      appointment_id: appointmentId
    })
    onRescheduleAppointment?.(appointmentId)
  }

  const handleEditAppointment = (appointmentId: string) => {
    analytics.trackEvent('vet_appointment_edit_click', {
      appointment_id: appointmentId
    })
    onEditAppointment?.(appointmentId)
  }

  const handleCallClinic = (appointment: AppointmentWithDetails) => {
    if (appointment.clinicDetails?.phones?.[0]?.value) {
      analytics.trackEvent('vet_appointment_call', {
        appointment_id: appointment.id,
        clinic_id: appointment.clinicId
      })
      window.open(`tel:${appointment.clinicDetails.phones[0].value}`)
    }
  }

  const handleGetDirections = (appointment: AppointmentWithDetails) => {
    if (appointment.clinicDetails?.address) {
      const address = `${appointment.clinicDetails.address.street}, ${appointment.clinicDetails.address.city}`
      const encodedAddress = encodeURIComponent(address)
      analytics.trackEvent('vet_appointment_directions', {
        appointment_id: appointment.id,
        clinic_id: appointment.clinicId
      })
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank')
    }
  }

  const handleToggleReminders = async (appointmentId: string, enabled: boolean) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      analytics.trackEvent('vet_appointment_reminders_toggle', {
        appointment_id: appointmentId,
        enabled
      })

      // In real app, update appointment reminders
    } catch (error) {
      console.error('Error updating reminders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderAppointmentCard = (appointment: AppointmentWithDetails) => (
    <Card key={appointment.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{appointment.title}</h3>
                <Badge className={`${getStatusColor(appointment.status)} border text-xs`}>
                  {getStatusText(appointment.status)}
                </Badge>
                {isAppointmentSoon(appointment.dateStart) && appointment.status !== 'completed' && (
                  <Badge className="bg-orange-50 text-orange-700 text-xs animate-pulse">
                    <Timer className="w-3 h-3 mr-1" />
                    Presto
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {appointment.dateStart.toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {appointment.dateStart.toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {appointment.dateEnd && (
                      ` - ${appointment.dateEnd.toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">
                    {appointment.clinicDetails?.displayName} - {appointment.clinicDetails?.address.city}
                  </span>
                </div>
                {appointment.vetDetails && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{appointment.vetDetails.fullName}</span>
                  </div>
                )}
                {appointment.specialtyId && (
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    <span>{SPECIALTIES[appointment.specialtyId]?.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 ml-4">
              <Badge variant="outline" className="text-xs">
                {getAppointmentTypeText(appointment.type)}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> {appointment.notes}
              </p>
            </div>
          )}

          {/* Reminders */}
          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && appointment.reminders.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  Promemoria attivi: {appointment.reminderSettings?.channels.join(', ')}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleReminders(appointment.id, !appointment.reminderSettings?.enabled)}
                disabled={isLoading}
                className="text-xs"
              >
                {appointment.reminderSettings?.enabled ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            {appointment.clinicDetails?.phones?.[0] && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCallClinic(appointment)}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Chiama
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGetDirections(appointment)}
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-1" />
              Mappa
            </Button>

            {appointment.canReschedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRescheduleAppointment(appointment.id)}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Riprogramma
              </Button>
            )}

            {appointment.canModify && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditAppointment(appointment.id)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifica
              </Button>
            )}

            {appointment.canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelAppointment(appointment.id)}
                disabled={isLoading}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Annulla
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderAppointmentsList = (appointmentsList: AppointmentWithDetails[], emptyMessage: string) => {
    const filteredAppointments = getFilteredAppointments(appointmentsList)

    if (filteredAppointments.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'Nessun risultato' : emptyMessage}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'Prova a modificare i criteri di ricerca'
                : 'Gli appuntamenti che programmerai appariranno qui'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && activeTab === 'upcoming' && (
              <Button onClick={onCreateAppointment} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Prenota visita
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {filteredAppointments.map((appointment) => renderAppointmentCard(appointment))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Appuntamenti</h1>
          <p className="text-gray-600">Visualizza e gestisci gli appuntamenti veterinari</p>
        </div>

        <Button
          onClick={onCreateAppointment}
          className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuovo appuntamento
        </Button>
      </div>

      {/* Search and filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca per clinica, veterinario o tipo di visita..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Tutti gli stati</option>
                <option value="scheduled">Programmati</option>
                <option value="confirmed">Confermati</option>
                <option value="completed">Completati</option>
                <option value="cancelled">Annullati</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Prossimi ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Passati ({pastAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Annullati ({cancelledAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {renderAppointmentsList(upcomingAppointments, 'Nessun appuntamento in programma')}
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {renderAppointmentsList(pastAppointments, 'Nessun appuntamento completato')}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-6">
          {renderAppointmentsList(cancelledAppointments, 'Nessun appuntamento annullato')}
        </TabsContent>
      </Tabs>

      {/* Quick stats */}
      {appointments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Statistiche appuntamenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{upcomingAppointments.length}</div>
                <div className="text-sm text-blue-800">Prossimi</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{pastAppointments.filter(a => a.status === 'completed').length}</div>
                <div className="text-sm text-green-800">Completati</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{cancelledAppointments.length}</div>
                <div className="text-sm text-red-800">Annullati</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{appointments.length}</div>
                <div className="text-sm text-orange-800">Totali</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}