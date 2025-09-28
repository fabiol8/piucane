'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';

interface Vaccination {
  id: string;
  name: string;
  date: string;
  nextDue: string;
  veterinarian: string;
  batchNumber: string;
  notes: string;
  status: 'completed' | 'due' | 'overdue';
}

interface VaccinationRecordProps {
  dogId: string;
}

const STANDARD_VACCINES = [
  {
    name: 'DHPP (Cimurro, Epatite, Parainfluenza, Parvovirus)',
    frequency: 12, // months
    critical: true
  },
  {
    name: 'Rabbia',
    frequency: 12,
    critical: true
  },
  {
    name: 'Bordetella (Tosse dei canili)',
    frequency: 12,
    critical: false
  },
  {
    name: 'Lyme Disease',
    frequency: 12,
    critical: false
  },
  {
    name: 'Leptospirosi',
    frequency: 12,
    critical: false
  }
];

export default function VaccinationRecord({ dogId }: VaccinationRecordProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVaccination, setNewVaccination] = useState({
    name: '',
    date: '',
    veterinarian: '',
    batchNumber: '',
    notes: ''
  });

  useEffect(() => {
    fetchVaccinations();
  }, [dogId]);

  const fetchVaccinations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dogs/${dogId}/vaccinations`);
      if (response.ok) {
        const data = await response.json();
        setVaccinations(data.vaccinations);
      }
    } catch (error) {
      console.error('Error fetching vaccinations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addVaccination = async () => {
    try {
      const nextDueDate = new Date(newVaccination.date);
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

      const vaccinationData = {
        ...newVaccination,
        nextDue: nextDueDate.toISOString().split('T')[0],
        status: 'completed'
      };

      const response = await fetch(`/api/dogs/${dogId}/vaccinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaccinationData)
      });

      if (response.ok) {
        const result = await response.json();
        setVaccinations([...vaccinations, result.vaccination]);
        setNewVaccination({
          name: '',
          date: '',
          veterinarian: '',
          batchNumber: '',
          notes: ''
        });
        setShowAddForm(false);

        trackEvent('vaccination_added', {
          dog_id: dogId,
          vaccine_name: newVaccination.name
        });
      }
    } catch (error) {
      console.error('Error adding vaccination:', error);
    }
  };

  const getVaccinationStatus = (vaccination: Vaccination): { status: string; color: string; message: string } => {
    const today = new Date();
    const dueDate = new Date(vaccination.nextDue);
    const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference < 0) {
      return {
        status: 'overdue',
        color: 'text-red-600 bg-red-50',
        message: `Scaduto da ${Math.abs(daysDifference)} giorni`
      };
    } else if (daysDifference <= 30) {
      return {
        status: 'due',
        color: 'text-orange-600 bg-orange-50',
        message: `Scade fra ${daysDifference} giorni`
      };
    } else {
      return {
        status: 'current',
        color: 'text-green-600 bg-green-50',
        message: `Valido fino al ${dueDate.toLocaleDateString('it-IT')}`
      };
    }
  };

  const generateVaccinationCertificate = async () => {
    try {
      const response = await fetch(`/api/dogs/${dogId}/vaccinations/certificate`, {
        method: 'POST'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificato-vaccinale-${dogId}.pdf`;
        a.click();

        trackEvent('vaccination_certificate_generated', {
          dog_id: dogId
        });
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Libretto Vaccinale</h2>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={generateVaccinationCertificate}
            data-cta-id="vaccination_record.certificate.generate.click"
          >
            📄 Certificato
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            data-cta-id="vaccination_record.add.button.click"
          >
            💉 Aggiungi Vaccino
          </Button>
        </div>
      </div>

      {/* Vaccination Status Overview */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stato Vaccinazioni</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {vaccinations.filter(v => getVaccinationStatus(v).status === 'current').length}
            </div>
            <div className="text-sm text-green-700">Aggiornati</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {vaccinations.filter(v => getVaccinationStatus(v).status === 'due').length}
            </div>
            <div className="text-sm text-orange-700">In scadenza</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {vaccinations.filter(v => getVaccinationStatus(v).status === 'overdue').length}
            </div>
            <div className="text-sm text-red-700">Scaduti</div>
          </div>
        </div>
      </Card>

      {/* Add Vaccination Form */}
      {showAddForm && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aggiungi Vaccinazione</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vaccino
              </label>
              <select
                value={newVaccination.name}
                onChange={(e) => setNewVaccination({ ...newVaccination, name: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="">Seleziona vaccino...</option>
                {STANDARD_VACCINES.map((vaccine) => (
                  <option key={vaccine.name} value={vaccine.name}>
                    {vaccine.name} {vaccine.critical && '(Obbligatorio)'}
                  </option>
                ))}
                <option value="custom">Altro (specificare nelle note)</option>
              </select>
            </div>

            <Input
              label="Data somministrazione"
              type="date"
              value={newVaccination.date}
              onChange={(e) => setNewVaccination({ ...newVaccination, date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />

            <Input
              label="Veterinario"
              value={newVaccination.veterinarian}
              onChange={(e) => setNewVaccination({ ...newVaccination, veterinarian: e.target.value })}
              placeholder="Dr. Mario Rossi"
            />

            <Input
              label="Numero lotto"
              value={newVaccination.batchNumber}
              onChange={(e) => setNewVaccination({ ...newVaccination, batchNumber: e.target.value })}
              placeholder="LOT12345"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note aggiuntive
            </label>
            <textarea
              value={newVaccination.notes}
              onChange={(e) => setNewVaccination({ ...newVaccination, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="Eventuali reazioni, note del veterinario..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowAddForm(false)}
            >
              Annulla
            </Button>
            <Button
              onClick={addVaccination}
              disabled={!newVaccination.name || !newVaccination.date || !newVaccination.veterinarian}
            >
              Aggiungi Vaccinazione
            </Button>
          </div>
        </Card>
      )}

      {/* Vaccinations List */}
      <div className="space-y-4">
        {vaccinations.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">💉</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna vaccinazione registrata
            </h3>
            <p className="text-gray-600 mb-6">
              Inizia a tenere traccia delle vaccinazioni del tuo cane per garantire la sua salute.
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              data-cta-id="vaccination_record.first_add.button.click"
            >
              Aggiungi prima vaccinazione
            </Button>
          </Card>
        ) : (
          vaccinations.map((vaccination) => {
            const status = getVaccinationStatus(vaccination);
            return (
              <Card key={vaccination.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vaccination.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.message}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Data:</span> {new Date(vaccination.date).toLocaleDateString('it-IT')}
                      </div>
                      <div>
                        <span className="font-medium">Veterinario:</span> {vaccination.veterinarian}
                      </div>
                      <div>
                        <span className="font-medium">Lotto:</span> {vaccination.batchNumber}
                      </div>
                    </div>

                    {vaccination.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Note:</span> {vaccination.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {status.status === 'overdue' && (
                      <Button
                        size="sm"
                        data-cta-id="vaccination_record.schedule.button.click"
                      >
                        📅 Prenota
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      data-cta-id="vaccination_record.edit.button.click"
                    >
                      ✏️
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Vaccination Reminders */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Promemoria Automatici</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notifiche push</p>
              <p className="text-sm text-gray-600">Ricevi promemoria 30 giorni prima della scadenza</p>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-orange-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2">
              <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email promemoria</p>
              <p className="text-sm text-gray-600">Ricevi email settimanali con promemoria sanitari</p>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-orange-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2">
              <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}