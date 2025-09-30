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
  Ruler,
  Heart,
  AlertTriangle,
  Plus,
  Download,
  Share,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type { Dog, DogVisit, VaccinationRecord, MedicalRecord } from '@/types/veterinary'

interface DigitalHealthRecordProps {
  selectedDogId?: string | null
}

export function DigitalHealthRecord({ selectedDogId }: DigitalHealthRecordProps) {
  const analytics = useAnalytics()
  const [activeTab, setActiveTab] = useState('visits')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'vaccinations' | 'medications' | 'tests'>('all')

  // Mock data - in real app this would come from props or hooks
  const selectedDog = mockDogs.find(dog => dog.dogId === selectedDogId) || mockDogs[0]
  const visits = mockVisits.filter(visit => visit.dogId === selectedDog.dogId)
  const vaccinations = mockVaccinations.filter(vac => vac.dogId === selectedDog.dogId)
  const medications = mockMedications.filter(med => med.dogId === selectedDog.dogId)

  const handleExportRecord = () => {
    analytics.trackEvent('health_record_export', {
      dog_id: selectedDog.dogId,
      format: 'pdf'
    })
    // TODO: Implement PDF export
  }

  const handleShareRecord = () => {
    analytics.trackEvent('health_record_share', {
      dog_id: selectedDog.dogId
    })
    // TODO: Implement sharing functionality
  }

  const handleAddRecord = (type: string) => {
    analytics.trackEvent('health_record_add', {
      dog_id: selectedDog.dogId,
      record_type: type
    })
    // TODO: Open add record modal
  }

  // Filter and search logic
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const matchesSearch = searchTerm === '' ||
        visit.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.symptoms?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      if (filterType === 'all') return matchesSearch

      switch (filterType) {
        case 'vaccinations':
          return matchesSearch && visit.type === 'vaccination'
        case 'medications':
          return matchesSearch && visit.prescriptions && visit.prescriptions.length > 0
        case 'tests':
          return matchesSearch && visit.testResults && visit.testResults.length > 0
        default:
          return matchesSearch
      }
    })
  }, [visits, searchTerm, filterType])

  const getVitalTrends = () => {
    const recentVisits = visits
      .filter(v => v.vitals)
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
      .slice(0, 5)

    return {
      weight: recentVisits.map(v => ({
        date: v.visitDate,
        value: v.vitals?.weightKg
      })).filter(item => item.value),

      temperature: recentVisits.map(v => ({
        date: v.visitDate,
        value: v.vitals?.temperatureC
      })).filter(item => item.value)
    }
  }

  const upcomingVaccinations = vaccinations.filter(vac =>
    vac.nextDueDate && new Date(vac.nextDueDate) > new Date()
  ).sort((a, b) =>
    new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime()
  )

  const activeMedications = medications.filter(med =>
    med.status === 'active' ||
    (med.endDate && new Date(med.endDate) > new Date())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Libretto Sanitario - {selectedDog.name}
          </h2>
          <p className="text-gray-600">
            {selectedDog.breed} • {selectedDog.age} anni • {selectedDog.gender === 'male' ? 'Maschio' : 'Femmina'}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleShareRecord}>
            <Share className="h-4 w-4 mr-2" />
            Condividi
          </Button>
          <Button variant="outline" onClick={handleExportRecord}>
            <Download className="h-4 w-4 mr-2" />
            Esporta PDF
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{visits.length}</p>
                <p className="text-sm text-gray-600">Visite totali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Syringe className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{vaccinations.length}</p>
                <p className="text-sm text-gray-600">Vaccinazioni</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Pill className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{activeMedications.length}</p>
                <p className="text-sm text-gray-600">Terapie attive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{upcomingVaccinations.length}</p>
                <p className="text-sm text-gray-600">Vaccini in scadenza</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca nei record medici..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              {['all', 'vaccinations', 'medications', 'tests'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? "default" : "outline"}
                  onClick={() => setFilterType(type as any)}
                >
                  {type === 'all' && 'Tutti'}
                  {type === 'vaccinations' && 'Vaccini'}
                  {type === 'medications' && 'Farmaci'}
                  {type === 'tests' && 'Esami'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visits">Visite</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccini</TabsTrigger>
          <TabsTrigger value="medications">Terapie</TabsTrigger>
          <TabsTrigger value="vitals">Parametri</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Storico Visite</h3>
            <Button onClick={() => handleAddRecord('visit')}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Visita
            </Button>
          </div>

          {filteredVisits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna visita trovata
                </h3>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all'
                    ? 'Prova a modificare i criteri di ricerca'
                    : 'Non ci sono visite registrate per questo cane'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredVisits.map((visit) => (
                <Card key={visit.visitId}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium">
                            {visit.type === 'routine' && 'Visita di controllo'}
                            {visit.type === 'vaccination' && 'Vaccinazione'}
                            {visit.type === 'emergency' && 'Visita d\'emergenza'}
                            {visit.type === 'specialist' && 'Visita specialistica'}
                          </h4>
                          <Badge variant={visit.type === 'emergency' ? 'destructive' : 'secondary'}>
                            {new Date(visit.visitDate).toLocaleDateString('it-IT')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Dr. {visit.veterinarian.firstName} {visit.veterinarian.lastName} - {visit.clinic.displayName}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {visit.diagnosis && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-1">Diagnosi</h5>
                        <p className="text-gray-700">{visit.diagnosis}</p>
                      </div>
                    )}

                    {visit.symptoms && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-1">Sintomi</h5>
                        <p className="text-gray-700">{visit.symptoms}</p>
                      </div>
                    )}

                    {visit.vitals && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-2">Parametri vitali</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Weight className="h-4 w-4 text-gray-500" />
                            <span>{visit.vitals.weightKg} kg</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-gray-500" />
                            <span>{visit.vitals.temperatureC}°C</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-gray-500" />
                            <span>{visit.vitals.heartRateBpm} bpm</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-gray-500" />
                            <span>{visit.vitals.respiratoryRate} rpm</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {visit.prescriptions && visit.prescriptions.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-2">Prescrizioni</h5>
                        <div className="space-y-2">
                          {visit.prescriptions.map((prescription, index) => (
                            <div key={index} className="p-2 bg-blue-50 rounded">
                              <span className="font-medium">{prescription.medication}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                {prescription.dosage} - {prescription.frequency}
                              </span>
                              {prescription.duration && (
                                <span className="text-sm text-gray-600 ml-2">
                                  per {prescription.duration}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {visit.notes && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-1">Note</h5>
                        <p className="text-gray-700 text-sm">{visit.notes}</p>
                      </div>
                    )}

                    {visit.nextVisit && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-yellow-900">
                          Prossima visita: {new Date(visit.nextVisit.suggestedDate).toLocaleDateString('it-IT')}
                        </p>
                        <p className="text-sm text-yellow-700">{visit.nextVisit.reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vaccinations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Calendario Vaccinazioni</h3>
            <Button onClick={() => handleAddRecord('vaccination')}>
              <Plus className="h-4 w-4 mr-2" />
              Registra Vaccino
            </Button>
          </div>

          {/* Upcoming Vaccinations Alert */}
          {upcomingVaccinations.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h4 className="font-medium text-orange-900">Vaccini in scadenza</h4>
                </div>
                <div className="space-y-1">
                  {upcomingVaccinations.slice(0, 3).map(vac => (
                    <p key={vac.vaccinationId} className="text-sm text-orange-700">
                      {vac.vaccineName} - {new Date(vac.nextDueDate!).toLocaleDateString('it-IT')}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {vaccinations.map((vaccination) => (
              <Card key={vaccination.vaccinationId}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Syringe className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium">{vaccination.vaccineName}</h4>
                        <Badge variant="outline">
                          {vaccination.batchNumber}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Data:</span>
                          <span className="ml-1">
                            {new Date(vaccination.dateGiven).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Veterinario:</span>
                          <span className="ml-1">
                            Dr. {vaccination.veterinarian.lastName}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Scadenza:</span>
                          <span className="ml-1">
                            {vaccination.expirationDate ?
                              new Date(vaccination.expirationDate).toLocaleDateString('it-IT') :
                              'N/A'
                            }
                          </span>
                        </div>
                        {vaccination.nextDueDate && (
                          <div>
                            <span className="font-medium">Prossimo:</span>
                            <span className="ml-1">
                              {new Date(vaccination.nextDueDate).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                        )}
                      </div>

                      {vaccination.reactions && vaccination.reactions.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm font-medium text-red-900">Reazioni segnalate:</p>
                          <p className="text-sm text-red-700">
                            {vaccination.reactions.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Terapie e Farmaci</h3>
            <Button onClick={() => handleAddRecord('medication')}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Farmaco
            </Button>
          </div>

          {/* Active Medications */}
          {activeMedications.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Terapie Attive</h4>
              <div className="grid gap-3">
                {activeMedications.map((medication) => (
                  <Card key={medication.medicationId} className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Pill className="h-5 w-5 text-green-600" />
                            <h4 className="font-medium">{medication.name}</h4>
                            <Badge className="bg-green-600">Attivo</Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Dosaggio:</span>
                              <span className="ml-1">{medication.dosage}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Frequenza:</span>
                              <span className="ml-1">{medication.frequency}</span>
                            </div>
                            {medication.endDate && (
                              <div>
                                <span className="font-medium text-gray-700">Fine terapia:</span>
                                <span className="ml-1">
                                  {new Date(medication.endDate).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            )}
                          </div>

                          {medication.instructions && (
                            <p className="text-sm text-gray-700 mt-2">
                              <span className="font-medium">Istruzioni:</span> {medication.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Medications */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Storico Completo</h4>
            <div className="grid gap-3">
              {medications.map((medication) => (
                <Card key={medication.medicationId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Pill className="h-5 w-5 text-gray-500" />
                          <h4 className="font-medium">{medication.name}</h4>
                          <Badge variant={medication.status === 'active' ? 'default' : 'secondary'}>
                            {medication.status === 'active' ? 'Attivo' :
                             medication.status === 'completed' ? 'Completato' : 'Sospeso'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Dosaggio:</span>
                            <span className="ml-1">{medication.dosage}</span>
                          </div>
                          <div>
                            <span className="font-medium">Inizio:</span>
                            <span className="ml-1">
                              {new Date(medication.startDate).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          {medication.endDate && (
                            <div>
                              <span className="font-medium">Fine:</span>
                              <span className="ml-1">
                                {new Date(medication.endDate).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Prescritto da:</span>
                            <span className="ml-1">Dr. {medication.prescribedBy.lastName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Parametri Vitali</h3>
            <Button onClick={() => handleAddRecord('vitals')}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Misurazione
            </Button>
          </div>

          {/* Current Vitals */}
          {visits.length > 0 && visits[0].vitals && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ultimi Parametri Registrati</CardTitle>
                <p className="text-sm text-gray-600">
                  {new Date(visits[0].visitDate).toLocaleDateString('it-IT')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <Weight className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{visits[0].vitals.weightKg}</p>
                    <p className="text-sm text-gray-600">kg</p>
                  </div>
                  <div className="text-center">
                    <Activity className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{visits[0].vitals.temperatureC}</p>
                    <p className="text-sm text-gray-600">°C</p>
                  </div>
                  <div className="text-center">
                    <Heart className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{visits[0].vitals.heartRateBpm}</p>
                    <p className="text-sm text-gray-600">bpm</p>
                  </div>
                  <div className="text-center">
                    <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{visits[0].vitals.respiratoryRate}</p>
                    <p className="text-sm text-gray-600">rpm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trends - This would be a chart in a real implementation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Andamento Peso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getVitalTrends().weight.slice(0, 5).map((point, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">
                      {new Date(point.date).toLocaleDateString('it-IT')}
                    </span>
                    <span className="font-medium">{point.value} kg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Mock data
const mockDogs: Dog[] = [
  {
    dogId: 'dog_001',
    name: 'Luna',
    breed: 'Labrador Retriever',
    gender: 'female',
    birthDate: new Date('2020-03-15').toISOString(),
    age: 4,
    ownerId: 'owner_001',
    microchipNumber: 'IT01234567890123',
    registrationNumber: 'LO123456789',
    weightKg: 28.5,
    heightCm: 55,
    color: 'Golden',
    medicalAlerts: ['Allergica al pollo'],
    createdAt: new Date().toISOString()
  }
]

const mockVisits: DogVisit[] = [
  {
    visitId: 'visit_001',
    dogId: 'dog_001',
    clinicId: 'clinic_001',
    veterinarianId: 'vet_001',
    visitDate: new Date('2024-01-10').toISOString(),
    type: 'routine',
    diagnosis: 'Cane in ottima salute generale',
    symptoms: 'Nessun sintomo particolare',
    vitals: {
      weightKg: 28.5,
      temperatureC: 38.2,
      heartRateBpm: 120,
      respiratoryRate: 24
    },
    prescriptions: [
      {
        medication: 'Advantix',
        dosage: '1 pipetta',
        frequency: 'Mensile',
        duration: '12 mesi'
      }
    ],
    notes: 'Controllo di routine. Cane in perfetta forma fisica.',
    clinic: mockDogs[0] as any,
    veterinarian: {
      veterinarianId: 'vet_001',
      firstName: 'Marco',
      lastName: 'Rossi'
    } as any,
    nextVisit: {
      suggestedDate: new Date('2024-07-10').toISOString(),
      reason: 'Controllo semestrale'
    },
    createdAt: new Date('2024-01-10').toISOString()
  }
]

const mockVaccinations: VaccinationRecord[] = [
  {
    vaccinationId: 'vac_001',
    dogId: 'dog_001',
    vaccineName: 'Vaccinazione Quadrivalente (DHPP)',
    dateGiven: new Date('2024-01-10').toISOString(),
    batchNumber: 'VX123456',
    veterinarianId: 'vet_001',
    veterinarian: {
      veterinarianId: 'vet_001',
      firstName: 'Marco',
      lastName: 'Rossi'
    } as any,
    expirationDate: new Date('2025-01-10').toISOString(),
    nextDueDate: new Date('2025-01-10').toISOString(),
    reactions: [],
    notes: 'Vaccinazione somministrata senza problemi',
    createdAt: new Date('2024-01-10').toISOString()
  }
]

const mockMedications: MedicalRecord[] = [
  {
    medicationId: 'med_001',
    dogId: 'dog_001',
    name: 'Advantix',
    type: 'antiparassitario',
    dosage: '1 pipetta',
    frequency: 'Mensile',
    startDate: new Date('2024-01-10').toISOString(),
    endDate: new Date('2024-12-10').toISOString(),
    status: 'active',
    prescribedBy: {
      veterinarianId: 'vet_001',
      firstName: 'Marco',
      lastName: 'Rossi'
    } as any,
    instructions: 'Applicare sulla cute asciutta alla base del collo',
    createdAt: new Date('2024-01-10').toISOString()
  }
]