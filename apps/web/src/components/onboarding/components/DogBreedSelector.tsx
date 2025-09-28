'use client';

import { useState, useEffect } from 'react';
import { Input } from '@piucane/ui';

interface DogBreed {
  id: string;
  name: string;
  group: string;
  size: string;
  characteristics: string[];
}

interface DogBreedSelectorProps {
  value: string;
  onChange: (breed: string) => void;
  error?: string;
}

// Sample breed data - in production this would come from API
const DOG_BREEDS: DogBreed[] = [
  { id: 'labrador', name: 'Labrador Retriever', group: 'Sporting', size: 'Large', characteristics: ['Friendly', 'Active', 'Outgoing'] },
  { id: 'golden', name: 'Golden Retriever', group: 'Sporting', size: 'Large', characteristics: ['Intelligent', 'Friendly', 'Devoted'] },
  { id: 'german-shepherd', name: 'Pastore Tedesco', group: 'Herding', size: 'Large', characteristics: ['Confident', 'Courageous', 'Smart'] },
  { id: 'bulldog', name: 'Bulldog Francese', group: 'Non-Sporting', size: 'Small', characteristics: ['Adaptable', 'Playful', 'Smart'] },
  { id: 'poodle', name: 'Barboncino', group: 'Non-Sporting', size: 'Medium', characteristics: ['Active', 'Alert', 'Intelligent'] },
  { id: 'chihuahua', name: 'Chihuahua', group: 'Toy', size: 'Small', characteristics: ['Graceful', 'Charming', 'Sassy'] },
  { id: 'mixed', name: 'Meticcio/Incrocio', group: 'Mixed', size: 'Varies', characteristics: ['Unique', 'Loving', 'Special'] }
];

export default function DogBreedSelector({ value, onChange, error }: DogBreedSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState<DogBreed[]>(DOG_BREEDS);

  useEffect(() => {
    const filtered = DOG_BREEDS.filter(breed =>
      breed.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBreeds(filtered);
  }, [searchTerm]);

  const handleBreedSelect = (breed: DogBreed) => {
    onChange(breed.name);
    setSearchTerm(breed.name);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Input
        label="Razza"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Cerca razza..."
        error={error}
      />

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredBreeds.length > 0 ? (
              filteredBreeds.map((breed) => (
                <button
                  key={breed.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  onClick={() => handleBreedSelect(breed)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{breed.name}</div>
                      <div className="text-sm text-gray-500">
                        {breed.group} • Taglia {breed.size}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {breed.characteristics.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                Nessuna razza trovata. Prova con un altro termine.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}