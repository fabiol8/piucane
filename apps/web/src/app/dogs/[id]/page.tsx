/**
 * Individual Dog Profile Page
 * 🐶 Profilo cane (Dog Profile) - Una scheda completa a tab: Info | Salute | Libretto | Routine | Veterinari | Album | Missioni
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SkipTarget } from '@/components/ui/SkipLinks';
import { trackCTAClick } from '@/analytics/ga4';
import { DogProfile, DogProfileTab } from '@/types/dogs';

interface Dog {
  id: string;
  name: string;
  breed: string;
  isMixed: boolean;
  sex: 'male' | 'female';
  neutered: boolean;
  weightKg: number;
  birthDate: Date;
  microchipId?: string;
  profilePhoto?: string;
  health: {
    conditions: string[];
    bcs: number;
    lastVetVisit?: Date;
    nextVaccination?: Date;
    vaccinations: Array<{
      name: string;
      date: Date;
      nextDue: Date;
      veterinarian: string;
    }>;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      startDate: Date;
      endDate?: Date;
      notes?: string;
    }>;
    notes?: string;
  };
  allergies: {
    food: string[];
    environmental: string[];
  };
  habits: {
    feedingSchedule: Array<{
      time: string;
      amount: number;
      foodType: string;
    }>;
    activityLevel: 'low' | 'moderate' | 'high';
    walkSchedule: string[];
    sleepingHours: {
      bedtime: string;
      wakeup: string;
    };
  };
  vetRef?: {
    name: string;
    clinicName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
  };
  subscriptions?: Array<{
    id: string;
    productName: string;
    status: 'active' | 'paused' | 'cancelled';
    nextDelivery: Date;
    cadenceDays: number;
  }>;
  weightHistory?: Array<{
    date: Date;
    weight: number;
    bcs: number;
    notes?: string;
  }>;
  badges?: string[];
  xp?: number;
  level?: number;
  missions?: Array<{
    id: string;
    title: string;
    description: string;
    xpReward: number;
    completed: boolean;
    dueAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DogTabs: React.FC<TabProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: '👁️' },
    { id: 'health', label: 'Salute', icon: '🏥' },
    { id: 'habits', label: 'Abitudini', icon: '📅' },
    { id: 'subscriptions', label: 'Abbonamenti', icon: '📦' },
    { id: 'missions', label: 'Missioni', icon: '🎯' },
    { id: 'records', label: 'Storico', icon: '📊' },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              trackEvent('navigation_click', {
                link_text: tab.label,
                section: 'dog_profile_tabs',
                tab_name: tab.id,
              }, 'navigation.tab.click');
            }}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default function DogProfilePage() {
  const params = useParams();
  const router = useRouter();
  const dogId = params.id as string;

  const [dog, setDog] = useState<Dog | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (dogId) {
      loadDog();
    }
  }, [dogId]);

  const loadDog = async () => {
    try {
      const response = await dogsApi.get(dogId);
      if (response.success) {
        setDog(response.data);
      } else {
        router.push('/dogs');
      }
    } catch (error) {
      console.error('Error loading dog:', error);
      router.push('/dogs');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: Date) => {
    const now = new Date();
    const ageInMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    if (ageInMonths < 12) {
      return `${ageInMonths} mes${ageInMonths === 1 ? 'e' : 'i'}`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const remainingMonths = ageInMonths % 12;
      if (remainingMonths === 0) {
        return `${years} ann${years === 1 ? 'o' : 'i'}`;
      } else {
        return `${years}a ${remainingMonths}m`;
      }
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
    trackEvent('dog_edit_start', {
      dog_id: dogId,
    }, 'dogs.edit.button.click');
  };

  const renderTabContent = () => {
    if (!dog) return null;

    switch (activeTab) {
      case 'overview':
        return <OverviewTab dog={dog} calculateAge={calculateAge} />;
      case 'health':
        return <HealthTab dog={dog} />;
      case 'habits':
        return <HabitsTab dog={dog} />;
      case 'subscriptions':
        return <SubscriptionsTab dog={dog} />;
      case 'missions':
        return <MissionsTab dog={dog} />;
      case 'records':
        return <RecordsTab dog={dog} />;
      default:
        return <OverviewTab dog={dog} calculateAge={calculateAge} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cane non trovato</h1>
          <Button onClick={() => router.push('/dogs')}>
            Torna ai tuoi cani
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dogs')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center text-3xl">
                {dog.profilePhoto ? (
                  <img
                    src={dog.profilePhoto}
                    alt={dog.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  '🐕'
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{dog.name}</h1>
                <p className="text-gray-600">
                  {dog.isMixed ? 'Meticcio' : dog.breed} • {dog.sex === 'male' ? 'Maschio' : 'Femmina'} • {calculateAge(dog.birthDate)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleEdit}
              ctaId="dogs.edit.button.click"
            >
              Modifica profilo
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <DogTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
const OverviewTab: React.FC<{ dog: Dog; calculateAge: (date: Date) => string }> = ({ dog, calculateAge }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni di base</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Nome</span>
              <p className="text-lg font-semibold">{dog.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Razza</span>
              <p className="text-lg">{dog.isMixed ? 'Meticcio' : dog.breed}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Età</span>
              <p className="text-lg">{calculateAge(dog.birthDate)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Peso</span>
              <p className="text-lg">{dog.weightKg} kg</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Sesso</span>
              <p className="text-lg">{dog.sex === 'male' ? 'Maschio' : 'Femmina'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Sterilizzato</span>
              <p className="text-lg">{dog.neutered ? 'Sì' : 'No'}</p>
            </div>
          </div>
          {dog.microchipId && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm font-medium text-gray-500">Microchip</span>
              <p className="text-lg font-mono">{dog.microchipId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Stato di salute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-500">BCS (Body Condition Score)</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(score => (
                    <div
                      key={score}
                      className={`w-6 h-6 rounded-full ${
                        score <= dog.health.bcs ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">{dog.health.bcs}/5</span>
              </div>
            </div>
            {dog.health.conditions.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-500">Condizioni monitorate</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dog.health.conditions.map((condition, index) => (
                    <span key={index} className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm">
                      {condition.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="space-y-6">
      {/* Gamification */}
      {dog.level && (
        <Card>
          <CardHeader>
            <CardTitle>Livello e XP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="text-3xl font-bold text-yellow-600">Livello {dog.level}</div>
              <div className="text-lg text-gray-600">{dog.xp} XP</div>
              {dog.badges && dog.badges.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-2">Badge ottenuti</span>
                  <div className="flex flex-wrap justify-center gap-1">
                    {dog.badges.map((badge, index) => (
                      <span key={index} className="text-2xl">🏆</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vet Info */}
      {dog.vetRef && (
        <Card>
          <CardHeader>
            <CardTitle>Veterinario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Dr. {dog.vetRef.name}</span>
              </div>
              <div className="text-sm text-gray-600">
                {dog.vetRef.clinicName}
              </div>
              <div className="text-sm text-gray-600">
                {dog.vetRef.address}, {dog.vetRef.city}
              </div>
              <div className="text-sm text-gray-600">
                📞 {dog.vetRef.phone}
              </div>
              {dog.vetRef.email && (
                <div className="text-sm text-gray-600">
                  ✉️ {dog.vetRef.email}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  </div>
);

const HealthTab: React.FC<{ dog: Dog }> = ({ dog }) => (
  <div className="space-y-6">
    <div className="text-center py-8">
      <div className="text-4xl mb-4">🏥</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Scheda sanitaria in sviluppo
      </h3>
      <p className="text-gray-600">
        Questa sezione conterrà il dettaglio completo delle vaccinazioni, farmaci e visite veterinarie
      </p>
    </div>
  </div>
);

const HabitsTab: React.FC<{ dog: Dog }> = ({ dog }) => (
  <div className="space-y-6">
    <div className="text-center py-8">
      <div className="text-4xl mb-4">📅</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Abitudini in sviluppo
      </h3>
      <p className="text-gray-600">
        Questa sezione conterrà gli orari di pappa, passeggiate e routine giornaliere
      </p>
    </div>
  </div>
);

const SubscriptionsTab: React.FC<{ dog: Dog }> = ({ dog }) => (
  <div className="space-y-6">
    <div className="text-center py-8">
      <div className="text-4xl mb-4">📦</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Abbonamenti in sviluppo
      </h3>
      <p className="text-gray-600">
        Questa sezione conterrà la gestione degli abbonamenti alimentari e accessori
      </p>
    </div>
  </div>
);

const MissionsTab: React.FC<{ dog: Dog }> = ({ dog }) => (
  <div className="space-y-6">
    <div className="text-center py-8">
      <div className="text-4xl mb-4">🎯</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Missioni in sviluppo
      </h3>
      <p className="text-gray-600">
        Questa sezione conterrà le missioni giornaliere e settimanali per guadagnare XP
      </p>
    </div>
  </div>
);

const RecordsTab: React.FC<{ dog: Dog }> = ({ dog }) => (
  <div className="space-y-6">
    <div className="text-center py-8">
      <div className="text-4xl mb-4">📊</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Storico in sviluppo
      </h3>
      <p className="text-gray-600">
        Questa sezione conterrà i grafici di peso, crescita e cronologia delle visite
      </p>
    </div>
  </div>
);