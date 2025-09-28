'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import BasicInfo from './sections/BasicInfo';
import HealthRecords from './sections/HealthRecords';
import VaccinationRecord from './sections/VaccinationRecord';
import NutritionPlan from './sections/NutritionPlan';
import VeterinarianInfo from './sections/VeterinarianInfo';
import PhotoGallery from './sections/PhotoGallery';
import ActivityHistory from './sections/ActivityHistory';

interface DogData {
  id: string;
  name: string;
  breed: string;
  birthDate: string;
  gender: 'male' | 'female';
  weight: number;
  activityLevel: 'low' | 'medium' | 'high';
  size: string;
  isNeutered: boolean;
  photos: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface DogProfileProps {
  dogId: string;
}

export default function DogProfile({ dogId }: DogProfileProps) {
  const [dog, setDog] = useState<DogData | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDogData();
  }, [dogId]);

  const fetchDogData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dogs/${dogId}`);
      if (response.ok) {
        const dogData = await response.json();
        setDog(dogData);

        // Track dog profile view
        trackEvent('view_dog_profile', {
          dog_id: dogId,
          breed: dogData.breed,
          age_group: calculateAgeGroup(dogData.birthDate)
        });
      } else {
        throw new Error('Dog not found');
      }
    } catch (error) {
      console.error('Error fetching dog data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAgeGroup = (birthDate: string): string => {
    const today = new Date();
    const birth = new Date(birthDate);
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();

    if (months < 12) return 'puppy';
    if (months < 84) return 'adult'; // 7 years
    return 'senior';
  };

  const tabs = [
    { id: 'info', label: 'Informazioni', icon: '📋' },
    { id: 'health', label: 'Salute', icon: '🩺' },
    { id: 'vaccinations', label: 'Vaccini', icon: '💉' },
    { id: 'nutrition', label: 'Alimentazione', icon: '🍽️' },
    { id: 'vet', label: 'Veterinario', icon: '🏥' },
    { id: 'photos', label: 'Foto', icon: '📸' },
    { id: 'activity', label: 'Attività', icon: '🎾' }
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cane non trovato</h1>
          <p className="text-gray-600 mb-6">Il profilo del cane richiesto non esiste o non hai i permessi per visualizzarlo.</p>
          <Button onClick={() => window.history.back()}>
            Torna indietro
          </Button>
        </Card>
      </div>
    );
  }

  const ageGroup = calculateAgeGroup(dog.birthDate);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🐕</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dog.name}</h1>
            <p className="text-gray-600">
              {dog.breed} • {ageGroup === 'puppy' ? 'Cucciolo' : ageGroup === 'senior' ? 'Senior' : 'Adulto'}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setActiveTab('info')}
            data-cta-id="dog_profile.edit.button.click"
          >
            ✏️ Modifica
          </Button>
          <Button
            onClick={() => window.print()}
            data-cta-id="dog_profile.print.button.click"
          >
            🖨️ Stampa
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-orange-600">{dog.weight}kg</div>
          <div className="text-sm text-gray-600">Peso</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{calculateAge(dog.birthDate)}</div>
          <div className="text-sm text-gray-600">Età</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {dog.activityLevel === 'high' ? '🏃' : dog.activityLevel === 'medium' ? '🚶' : '🛋️'}
          </div>
          <div className="text-sm text-gray-600">Attività</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {dog.gender === 'male' ? '♂️' : '♀️'}
          </div>
          <div className="text-sm text-gray-600">Sesso</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              trackEvent('dog_profile_tab_click', {
                dog_id: dogId,
                tab: tab.id
              });
            }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-cta-id={`dog_profile.tab_${tab.id}.click`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {activeTab === 'info' && <BasicInfo dog={dog} onUpdate={setDog} />}
          {activeTab === 'health' && <HealthRecords dogId={dogId} />}
          {activeTab === 'vaccinations' && <VaccinationRecord dogId={dogId} />}
          {activeTab === 'nutrition' && <NutritionPlan dogId={dogId} />}
          {activeTab === 'vet' && <VeterinarianInfo dogId={dogId} />}
          {activeTab === 'photos' && <PhotoGallery dog={dog} onUpdate={setDog} />}
          {activeTab === 'activity' && <ActivityHistory dogId={dogId} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Health Summary */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stato Salute</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ultima visita</span>
                <span className="text-sm font-medium">2 settimane fa</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Prossimo vaccino</span>
                <span className="text-sm font-medium text-orange-600">Fra 3 mesi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Peso ideale</span>
                <span className="text-sm font-medium text-green-600">✓ Raggiunto</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start"
                data-cta-id="dog_profile.book_vet.button.click"
              >
                🏥 Prenota visita
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                data-cta-id="dog_profile.add_health_record.button.click"
              >
                📝 Aggiungi record salute
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                data-cta-id="dog_profile.view_nutrition.button.click"
              >
                🍽️ Piano nutrizionale
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                data-cta-id="dog_profile.chat_vet.button.click"
              >
                💬 Chat con veterinario
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attività Recente</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="text-green-600">✓</span>
                <div>
                  <p className="font-medium">Peso aggiornato</p>
                  <p className="text-gray-500">2 giorni fa</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">📸</span>
                <div>
                  <p className="font-medium">Nuova foto aggiunta</p>
                  <p className="text-gray-500">1 settimana fa</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-600">💉</span>
                <div>
                  <p className="font-medium">Vaccinazione completata</p>
                  <p className="text-gray-500">2 settimane fa</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function calculateAge(birthDate: string): string {
  const today = new Date();
  const birth = new Date(birthDate);
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();

  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) return `${years}a`;
  return `${years}a ${remainingMonths}m`;
}