'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  FileText,
  Syringe,
  Pill,
  Activity,
  Weight,
  Heart,
  Thermometer,
  AlertTriangle,
  Plus,
  Download,
  Share,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  MapPin,
  Clock,
  Euro,
  User,
  Stethoscope,
  Camera,
  Paperclip,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type {
  DogVisit,
  Appointment,
  Clinic,
  Veterinarian,
  SPECIALTIES
} from '@/types/veterinary'

interface HealthRecordProps {
  selectedDogId: string
  onAddVisit?: () => void
  onEditVisit?: (visitId: string) => void
  onDeleteVisit?: (visitId: string) => void
  onExportRecord?: () => void
}

interface VaccinationRecord {
  id: string
  dogId: string
  vaccine: string
  brand: string
  batchNumber: string
  dateGiven: Date
  nextDue: Date
  vetId?: string
  clinicId: string
  notes?: string
  attachments?: Array<{
    id: string
    fileName: string
    mimeType: string
  }>
}

interface MedicationRecord {
  id: string
  dogId: string
  name: string
  dosage: string
  frequency: string
  startDate: Date
  endDate?: Date
  prescribedBy?: string
  clinicId: string
  purpose: string
  active: boolean
  notes?: string
}

interface VitalRecord {
  id: string
  dogId: string
  date: Date
  weight: number
  temperature?: number
  heartRate?: number
  respirationRate?: number
  bodyConditionScore?: number
  visitId?: string
  notes?: string
}

// Mock data - in real app this would come from props or API
const mockVisits: DogVisit[] = [
  {
    id: 'visit-1',
    dogId: 'dog-1',
    date: new Date(2024, 8, 15),
    clinicId: 'clinic-1',
    vetId: 'vet-1',
    specialtyId: 'internal_medicine',
    type: 'checkup',
    summary: 'Controllo generale di routine. Cane in buone condizioni di salute.',
    diagnosis: 'Stato di salute generale buono',
    treatment: 'Controlli regolari, mantenimento dieta attuale',
    medications: [
      {
        name: 'Antiparassitario',
        dosage: '1 compressa',
        frequency: 'Mensile',
        duration: 'Continuativo',
        notes: 'Somministrare sempre dopo il pasto'
      }
    ],
    nextVisitDue: new Date(2025, 2, 15),
    cost: {
      consultation: 35,
      procedures: 0,
      medications: 15,
      total: 50,
      currency: 'EUR',
      paid: true,
      paidAt: new Date(2024, 8, 15)
    },
    weight: 28.5,
    temperature: 38.2,
    heartRate: 95,
    respirationRate: 22,
    status: 'completed',
    createdAt: new Date(2024, 8, 15),
    updatedAt: new Date(2024, 8, 15)
  },
  {
    id: 'visit-2',
    dogId: 'dog-1',
    date: new Date(2024, 5, 20),
    clinicId: 'clinic-2',
    vetId: 'vet-2',
    type: 'vaccination',
    summary: 'Vaccinazione annuale completa e controllo generale',
    diagnosis: 'Stato vaccinale aggiornato',
    treatment: 'Vaccinazione DHPP + Antirabica',
    nextVisitDue: new Date(2025, 5, 20),
    cost: {
      consultation: 25,
      procedures: 45,
      medications: 0,
      total: 70,
      currency: 'EUR',
      paid: true,
      paidAt: new Date(2024, 5, 20)
    },
    weight: 28.2,
    temperature: 38.1,
    status: 'completed',
    createdAt: new Date(2024, 5, 20),
    updatedAt: new Date(2024, 5, 20)
  },
  {
    id: 'visit-3',
    dogId: 'dog-1',
    date: new Date(2024, 2, 10),
    clinicId: 'clinic-1',
    vetId: 'vet-1',
    specialtyId: 'dermatology',
    type: 'followup',
    summary: 'Controllo dermatite allergica. Miglioramento significativo.',
    diagnosis: 'Dermatite allergica in miglioramento',
    treatment: 'Continuare terapia topica, riduzione antistaminico',
    medications: [
      {
        name: 'Shampoo medicato',
        frequency: '2 volte a settimana',
        duration: '1 mese',
        notes: 'Lasciare in posa 5-10 minuti'
      }
    ],
    cost: {
      consultation: 40,
      procedures: 0,
      medications: 22,
      total: 62,
      currency: 'EUR',
      paid: true
    },
    weight: 27.8,
    status: 'completed',
    createdAt: new Date(2024, 2, 10),
    updatedAt: new Date(2024, 2, 10)
  }
]

const mockVaccinations: VaccinationRecord[] = [
  {
    id: 'vacc-1',
    dogId: 'dog-1',
    vaccine: 'DHPP (Cimurro, Epatite, Parvovirus, Parainfluenza)',
    brand: 'Nobivac',
    batchNumber: 'NB2024567',
    dateGiven: new Date(2024, 5, 20),
    nextDue: new Date(2025, 5, 20),
    vetId: 'vet-2',
    clinicId: 'clinic-2',
    notes: 'Nessuna reazione avversa'
  },
  {
    id: 'vacc-2',
    dogId: 'dog-1',
    vaccine: 'Antirabbica',
    brand: 'Rabisin',
    batchNumber: 'RB2024123',
    dateGiven: new Date(2024, 5, 20),
    nextDue: new Date(2027, 5, 20),
    vetId: 'vet-2',
    clinicId: 'clinic-2'
  },
  {
    id: 'vacc-3',
    dogId: 'dog-1',
    vaccine: 'Leishmaniosi',
    brand: 'LetiFend',
    batchNumber: 'LF2024789',
    dateGiven: new Date(2024, 3, 15),
    nextDue: new Date(2025, 3, 15),
    vetId: 'vet-1',
    clinicId: 'clinic-1'
  }
]

const mockMedications: MedicationRecord[] = [
  {
    id: 'med-1',
    dogId: 'dog-1',
    name: 'NexGard (Afoxolaner)',
    dosage: '1 compressa da 68mg',
    frequency: 'Mensile',
    startDate: new Date(2024, 0, 1),
    prescribedBy: 'Dr. Marco Bianchi',
    clinicId: 'clinic-1',
    purpose: 'Prevenzione pulci e zecche',
    active: true,
    notes: 'Somministrare sempre dopo il pasto principale'
  },
  {
    id: 'med-2',
    dogId: 'dog-1',
    name: 'Shampoo Medicato (Clorexidina)',
    dosage: '15-20ml',
    frequency: '2 volte a settimana',
    startDate: new Date(2024, 2, 10),
    endDate: new Date(2024, 4, 10),
    prescribedBy: 'Dr. Marco Bianchi',
    clinicId: 'clinic-1',
    purpose: 'Trattamento dermatite allergica',
    active: false,
    notes: 'Lasciare in posa 5-10 minuti prima del risciacquo'
  }
]

const mockVitals: VitalRecord[] = [
  { id: 'vital-1', dogId: 'dog-1', date: new Date(2024, 8, 15), weight: 28.5, temperature: 38.2, heartRate: 95, respirationRate: 22, visitId: 'visit-1' },
  { id: 'vital-2', dogId: 'dog-1', date: new Date(2024, 5, 20), weight: 28.2, temperature: 38.1, heartRate: 90, respirationRate: 20, visitId: 'visit-2' },
  { id: 'vital-3', dogId: 'dog-1', date: new Date(2024, 2, 10), weight: 27.8, temperature: 38.0, heartRate: 88, respirationRate: 18, visitId: 'visit-3' }
]

const mockClinics = [
  { id: 'clinic-1', displayName: 'Clinica San Francesco' },
  { id: 'clinic-2', displayName: 'Dr. Rossi - Centro Veterinario' }
]

const mockVeterinarians = [
  { id: 'vet-1', fullName: 'Dr. Marco Bianchi' },
  { id: 'vet-2', fullName: 'Dr.ssa Laura Rossi' }
]

export function HealthRecord({
  selectedDogId,
  onAddVisit,
  onEditVisit,
  onDeleteVisit,
  onExportRecord
}: HealthRecordProps) {
  const analytics = useAnalytics()
  const [activeTab, setActiveTab] = useState('visits')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'checkup' | 'vaccination' | 'emergency' | 'followup'>('all')
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null)

  // Filter data based on selected dog
  const visits = mockVisits.filter(visit => visit.dogId === selectedDogId)
  const vaccinations = mockVaccinations.filter(vac => vac.dogId === selectedDogId)
  const medications = mockMedications.filter(med => med.dogId === selectedDogId)
  const vitals = mockVitals.filter(vital => vital.dogId === selectedDogId)

  // Filter and search visits
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const matchesSearch = searchTerm === '' ||
        visit.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = filterType === 'all' || visit.type === filterType

      return matchesSearch && matchesFilter
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [visits, searchTerm, filterType])

  const handleExportRecord = () => {
    analytics.trackEvent('health_record_export', {
      dog_id: selectedDogId,
      format: 'pdf',
      visits_count: visits.length,
      vaccinations_count: vaccinations.length
    })
    onExportRecord?.()
  }

  const handleShareRecord = () => {
    analytics.trackEvent('health_record_share', {
      dog_id: selectedDogId,
      visits_count: visits.length
    })
  }

  const getVisitTypeColor = (type: string) => {
    const colors = {
      checkup: 'bg-green-50 text-green-700 border-green-200',
      vaccination: 'bg-blue-50 text-blue-700 border-blue-200',
      emergency: 'bg-red-50 text-red-700 border-red-200',
      surgery: 'bg-purple-50 text-purple-700 border-purple-200',
      followup: 'bg-orange-50 text-orange-700 border-orange-200',
      consultation: 'bg-gray-50 text-gray-700 border-gray-200'
    }
    return colors[type as keyof typeof colors] || colors.consultation
  }

  const getVisitTypeIcon = (type: string) => {
    const icons = {
      checkup: Activity,
      vaccination: Syringe,
      emergency: AlertTriangle,
      surgery: FileText,
      followup: Clock,
      consultation: Stethoscope
    }
    const IconComponent = icons[type as keyof typeof icons] || FileText
    return <IconComponent className="w-4 h-4" />
  }

  const renderVisitsList = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca nelle visite..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Tutte le visite</option>
            <option value="checkup">Controlli</option>
            <option value="vaccination">Vaccinazioni</option>
            <option value="followup">Follow-up</option>
            <option value="emergency">Emergenze</option>
          </select>

          <Button
            onClick={onAddVisit}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      {filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna visita trovata</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all'
                ? 'Prova a modificare i criteri di ricerca'
                : 'Inizia aggiungendo la prima visita veterinaria'}
            </p>
            {!searchTerm && filterType === 'all' && (
              <Button onClick={onAddVisit} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi prima visita
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <Card key={visit.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedVisit(expandedVisit === visit.id ? null : visit.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${getVisitTypeColor(visit.type)} border`}>
                          <span className="flex items-center gap-1">
                            {getVisitTypeIcon(visit.type)}
                            {visit.type === 'checkup' ? 'Controllo' :
                             visit.type === 'vaccination' ? 'Vaccinazione' :
                             visit.type === 'followup' ? 'Follow-up' :
                             visit.type === 'emergency' ? 'Emergenza' :
                             visit.type}
                          </span>
                        </Badge>

                        <span className="text-sm text-gray-600">
                          {visit.date.toLocaleDateString('it-IT')}
                        </span>

                        {visit.cost && (
                          <Badge variant="outline" className="text-xs">
                            €{visit.cost.total}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-medium text-gray-900 mb-1">{visit.summary}</h3>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {mockClinics.find(c => c.id === visit.clinicId)?.displayName}
                        </div>
                        {visit.vetId && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {mockVeterinarians.find(v => v.id === visit.vetId)?.fullName}
                          </div>
                        )}
                        {visit.specialtyId && (
                          <div className="flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            {SPECIALTIES[visit.specialtyId]?.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditVisit?.(visit.id)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {expandedVisit === visit.id ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedVisit === visit.id && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                      <div className="space-y-4">
                        {visit.diagnosis && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">Diagnosi</h4>
                            <p className="text-sm text-gray-700">{visit.diagnosis}</p>
                          </div>
                        )}

                        {visit.treatment && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">Trattamento</h4>
                            <p className="text-sm text-gray-700">{visit.treatment}</p>
                          </div>
                        )}

                        {visit.medications && visit.medications.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Farmaci prescritti</h4>
                            <div className="space-y-2">
                              {visit.medications.map((med, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border">
                                  <p className="font-medium text-sm">{med.name}</p>
                                  <div className="text-xs text-gray-600 space-y-1 mt-1">
                                    {med.dosage && <p>Dosaggio: {med.dosage}</p>}
                                    {med.frequency && <p>Frequenza: {med.frequency}</p>}
                                    {med.duration && <p>Durata: {med.duration}</p>}
                                    {med.notes && <p>Note: {med.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {(visit.weight || visit.temperature || visit.heartRate) && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Parametri vitali</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {visit.weight && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Weight className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-600">Peso</span>
                                  </div>
                                  <p className="text-lg font-semibold">{visit.weight} kg</p>
                                </div>
                              )}
                              {visit.temperature && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Thermometer className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-600">Temperatura</span>
                                  </div>
                                  <p className="text-lg font-semibold">{visit.temperature}°C</p>
                                </div>
                              )}
                              {visit.heartRate && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Heart className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-600">Battiti</span>
                                  </div>
                                  <p className="text-lg font-semibold">{visit.heartRate} bpm</p>
                                </div>
                              )}
                              {visit.respirationRate && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Activity className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-600">Respirazione</span>
                                  </div>
                                  <p className="text-lg font-semibold">{visit.respirationRate} rpm</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {visit.nextVisitDue && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">Prossima visita</h4>
                            <p className="text-sm text-gray-700">
                              {visit.nextVisitDue.toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        )}

                        {visit.cost && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Costi</h4>
                            <div className="bg-white p-3 rounded-lg border space-y-1">
                              {visit.cost.consultation && (
                                <div className="flex justify-between text-sm">
                                  <span>Visita</span>
                                  <span>€{visit.cost.consultation}</span>
                                </div>
                              )}
                              {visit.cost.procedures && (
                                <div className="flex justify-between text-sm">
                                  <span>Procedure</span>
                                  <span>€{visit.cost.procedures}</span>
                                </div>
                              )}
                              {visit.cost.medications && (
                                <div className="flex justify-between text-sm">
                                  <span>Farmaci</span>
                                  <span>€{visit.cost.medications}</span>
                                </div>
                              )}
                              <hr className="my-2" />
                              <div className="flex justify-between font-medium">
                                <span>Totale</span>
                                <span>€{visit.cost.total}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant={visit.cost.paid ? "default" : "destructive"} className="text-xs">
                                  {visit.cost.paid ? 'Pagato' : 'Non pagato'}
                                </Badge>
                                {visit.cost.paidAt && (
                                  <span className="text-xs text-gray-500">
                                    {visit.cost.paidAt.toLocaleDateString('it-IT')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderVaccinationHistory = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Storico Vaccinazioni</h3>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi
        </Button>
      </div>

      {vaccinations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Syringe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna vaccinazione registrata</h3>
            <p className="text-gray-600 mb-4">Aggiungi le vaccinazioni per tenere traccia dello stato vaccinale</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vaccinations.map((vaccination) => (
            <Card key={vaccination.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{vaccination.vaccine}</h4>
                      <Badge
                        variant={vaccination.nextDue > new Date() ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {vaccination.nextDue > new Date() ? 'Attivo' : 'Scaduto'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p><span className="font-medium">Data:</span> {vaccination.dateGiven.toLocaleDateString('it-IT')}</p>
                        <p><span className="font-medium">Marca:</span> {vaccination.brand}</p>
                        <p><span className="font-medium">Lotto:</span> {vaccination.batchNumber}</p>
                      </div>
                      <div className="space-y-1">
                        <p><span className="font-medium">Prossimo richiamo:</span> {vaccination.nextDue.toLocaleDateString('it-IT')}</p>
                        <p><span className="font-medium">Clinica:</span> {mockClinics.find(c => c.id === vaccination.clinicId)?.displayName}</p>
                        {vaccination.vetId && (
                          <p><span className="font-medium">Veterinario:</span> {mockVeterinarians.find(v => v.id === vaccination.vetId)?.fullName}</p>
                        )}
                      </div>
                    </div>

                    {vaccination.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{vaccination.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderMedications = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Terapie e Farmaci</h3>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi
        </Button>
      </div>

      {medications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun farmaco registrato</h3>
            <p className="text-gray-600 mb-4">Aggiungi farmaci e terapie per tenere traccia dei trattamenti</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Terapie attive</h4>
            <div className="space-y-3">
              {medications.filter(med => med.active).map((medication) => (
                <Card key={medication.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium text-gray-900">{medication.name}</h5>
                          <Badge className="bg-green-50 text-green-700 text-xs">Attiva</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="space-y-1">
                            <p><span className="font-medium">Dosaggio:</span> {medication.dosage}</p>
                            <p><span className="font-medium">Frequenza:</span> {medication.frequency}</p>
                            <p><span className="font-medium">Scopo:</span> {medication.purpose}</p>
                          </div>
                          <div className="space-y-1">
                            <p><span className="font-medium">Inizio:</span> {medication.startDate.toLocaleDateString('it-IT')}</p>
                            {medication.prescribedBy && (
                              <p><span className="font-medium">Prescritto da:</span> {medication.prescribedBy}</p>
                            )}
                          </div>
                        </div>

                        {medication.notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">{medication.notes}</p>
                          </div>
                        )}
                      </div>

                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Terapie completate</h4>
            <div className="space-y-3">
              {medications.filter(med => !med.active).map((medication) => (
                <Card key={medication.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium text-gray-700">{medication.name}</h5>
                          <Badge variant="outline" className="text-xs">Completata</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="space-y-1">
                            <p><span className="font-medium">Dosaggio:</span> {medication.dosage}</p>
                            <p><span className="font-medium">Scopo:</span> {medication.purpose}</p>
                          </div>
                          <div className="space-y-1">
                            <p><span className="font-medium">Periodo:</span> {medication.startDate.toLocaleDateString('it-IT')} - {medication.endDate?.toLocaleDateString('it-IT')}</p>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderVitalsChart = () => {
    const sortedVitals = [...vitals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Andamento parametri vitali</h3>

        {sortedVitals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun dato disponibile</h3>
              <p className="text-gray-600">I parametri vitali verranno registrati durante le visite</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weight chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Weight className="w-4 h-4" />
                  Peso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedVitals.filter(v => v.weight).map((vital, index, arr) => {
                    const prev = index > 0 ? arr[index - 1] : null
                    const trend = prev && vital.weight ? (vital.weight > prev.weight ? 'up' : vital.weight < prev.weight ? 'down' : 'stable') : null

                    return (
                      <div key={vital.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{vital.weight} kg</p>
                          <p className="text-xs text-gray-600">{vital.date.toLocaleDateString('it-IT')}</p>
                        </div>
                        {trend && (
                          <div className="flex items-center gap-1">
                            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                            {trend === 'stable' && <div className="w-4 h-4 border-b-2 border-gray-400"></div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Temperature chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Temperatura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedVitals.filter(v => v.temperature).map((vital) => (
                    <div key={vital.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{vital.temperature}°C</p>
                        <p className="text-xs text-gray-600">{vital.date.toLocaleDateString('it-IT')}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        vital.temperature && vital.temperature >= 37.5 && vital.temperature <= 39.2
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {vital.temperature && vital.temperature >= 37.5 && vital.temperature <= 39.2 ? 'Normale' : 'Anomala'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartella Clinica</h1>
          <p className="text-gray-600">Storico completo delle visite e dei trattamenti</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShareRecord}>
            <Share className="w-4 h-4 mr-2" />
            Condividi
          </Button>
          <Button variant="outline" onClick={handleExportRecord}>
            <Download className="w-4 h-4 mr-2" />
            Esporta PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visits">Visite</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinazioni</TabsTrigger>
          <TabsTrigger value="medications">Farmaci</TabsTrigger>
          <TabsTrigger value="vitals">Parametri</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-6">
          {renderVisitsList()}
        </TabsContent>

        <TabsContent value="vaccinations" className="space-y-6">
          {renderVaccinationHistory()}
        </TabsContent>

        <TabsContent value="medications" className="space-y-6">
          {renderMedications()}
        </TabsContent>

        <TabsContent value="vitals" className="space-y-6">
          {renderVitalsChart()}
        </TabsContent>
      </Tabs>
    </div>
  )
}