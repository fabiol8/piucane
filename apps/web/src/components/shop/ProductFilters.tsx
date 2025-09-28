'use client';

import { useState, useEffect } from 'react';
import { Card } from '@piucane/ui';

interface Product {
  id: string;
  category: string;
  brand: string;
  price: number;
  tags: string[];
  targetSize: string[];
  targetAge: string[];
}

interface ProductFiltersProps {
  products: Product[];
  onPriceRangeChange: (range: [number, number]) => void;
  priceRange: [number, number];
}

export default function ProductFilters({
  products,
  onPriceRangeChange,
  priceRange
}: ProductFiltersProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const brands = [...new Set(products.map(p => p.brand))].sort();
  const sizes = [...new Set(products.flatMap(p => p.targetSize))].sort();
  const ages = [...new Set(products.flatMap(p => p.targetAge))].sort();
  const tags = [...new Set(products.flatMap(p => p.tags))].sort();

  const minPrice = Math.min(...products.map(p => p.price));
  const maxPrice = Math.max(...products.map(p => p.price));

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const handleSizeChange = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleAgeChange = (age: string) => {
    setSelectedAges(prev =>
      prev.includes(age)
        ? prev.filter(a => a !== age)
        : [...prev, age]
    );
  };

  const handleTagChange = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedAges([]);
    setSelectedTags([]);
    onPriceRangeChange([minPrice, maxPrice]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtri</h3>

        {/* Price Range */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Prezzo</h4>
          <div className="space-y-2">
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange[0]}
              onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
              className="w-full"
            />
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange[1]}
              onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>€{priceRange[0]}</span>
              <span>€{priceRange[1]}</span>
            </div>
          </div>
        </div>

        {/* Brands */}
        {brands.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Marche</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {brands.map((brand) => (
                <label key={brand} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandChange(brand)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Size */}
        {sizes.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Taglia cane</h4>
            <div className="space-y-2">
              {sizes.map((size) => (
                <label key={size} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => handleSizeChange(size)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 capitalize">{size}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Age */}
        {ages.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Età cane</h4>
            <div className="space-y-2">
              {ages.map((age) => (
                <label key={age} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAges.includes(age)}
                    onChange={() => handleAgeChange(age)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 capitalize">{age}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Caratteristiche</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tags.map((tag) => (
                <label key={tag} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleTagChange(tag)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        <button
          onClick={clearFilters}
          className="text-sm text-orange-600 hover:text-orange-800 underline"
        >
          Rimuovi tutti i filtri
        </button>
      </Card>
    </div>
  );
}