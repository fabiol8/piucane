'use client';

import { useState } from 'react';
import { VeterinarySearch, AppointmentManager, HealthRecord, VeterinaryBooking } from '@/components/veterinary';

export default function VeterinaryPageClient() {
  const [activeTab, setActiveTab] = useState('search');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);

  const tabs = [
    { id: 'search', label: 'Cerca Veterinari', icon: '🔍' },
    { id: 'appointments', label: 'I Miei Appuntamenti', icon: '📅' },
    { id: 'health-record', label: 'Libretto Sanitario', icon: '📋' },
  ];

  const handleBookAppointment = (clinic: any) => {
    setSelectedClinic(clinic);
    setShowBooking(true);
  };

  if (showBooking) {
    return (
      <VeterinaryBooking
        clinic={selectedClinic}
        onClose={() => setShowBooking(false)}
        onComplete={() => {
          setShowBooking(false);
          setActiveTab('appointments');
        }}
      />
    );
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-1 bg-white rounded-lg shadow-sm p-1 border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-100 text-orange-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'search' && (
          <VeterinarySearch onBookAppointment={handleBookAppointment} />
        )}

        {activeTab === 'appointments' && (
          <AppointmentManager />
        )}

        {activeTab === 'health-record' && (
          <HealthRecord dogId="demo-dog-123" />
        )}
      </div>
    </>
  );
}