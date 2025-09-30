/**
 * Database prodotti PiùCane reali
 * Basato sui prodotti effettivi del brand PiùCane disponibili su AlanDog
 */

export interface ProductData {
  id: string;
  name: string;
  brand: 'PiùCane';
  category: 'food' | 'treats' | 'toys' | 'accessories' | 'health' | 'grooming';
  subcategory: string;
  price: number;
  subscriberPrice: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  longDescription: string;
  ingredients: string[];
  allergens: string[];
  benefits: string[];
  analyticalConstituents: {
    protein: number;
    fat: number;
    fiber: number;
    moisture: number;
    ash: number;
    calcium?: number;
    phosphorus?: number;
    calories: number;
  };
  feedingGuidelines: { weight: number; dailyAmount: number }[];
  formats: {
    id: string;
    size: string;
    weight: number;
    price: number;
    subscriberPrice: number;
    inStock: boolean;
    stockLevel: number;
    estimatedDuration: number;
  }[];
  images: string[];
  rating: number;
  reviewCount: number;
  tags: string[];
  certifications: string[];
  suitableFor: {
    ageMin?: number;
    ageMax?: number;
    weightMin?: number;
    weightMax?: number;
    breeds?: string[];
    activityLevel?: string[];
    conditions?: string[];
  };
  subscriptionOptions: {
    available: boolean;
    recommendedFrequency: number;
    frequencies: number[];
    firstOrderDiscount?: number;
  };
}

// Prodotti PiùCane reali basati su AlanDog
export const piuCaneProducts: ProductData[] = [
  {
    id: 'piucane-adult-chicken-rice-12kg',
    name: 'PiùCane Adult Pollo e Riso',
    brand: 'PiùCane',
    category: 'food',
    subcategory: 'dry-food',
    price: 47.99,
    subscriberPrice: 40.79,
    originalPrice: 52.99,
    description: 'Alimento completo per cani adulti con pollo fresco e riso. Formula equilibrata per il benessere quotidiano.',
    shortDescription: 'Pollo fresco e riso per cani adulti',
    longDescription: 'PiùCane Adult Pollo e Riso è un alimento completo e bilanciato, formulato specificamente per soddisfare le esigenze nutrizionali dei cani adulti. Preparato con pollo fresco di alta qualità e riso facilmente digeribile, garantisce un apporto proteico ottimale e una digestione sana. La ricetta è arricchita con vitamine e minerali essenziali per supportare la salute generale del cane.',
    ingredients: [
      'Pollo fresco (28%)',
      'Riso (20%)',
      'Granoturco',
      'Farina di pollo',
      'Grassi animali',
      'Polpa di barbabietola',
      'Lievito di birra',
      'Olio di pesce',
      'Cloruro di sodio',
      'Fosfato bicalcico',
      'Vitamine e minerali'
    ],
    allergens: ['pollo'],
    benefits: [
      'Proteine di alta qualità per muscoli forti',
      'Riso facilmente digeribile',
      'Vitamine e minerali per la salute generale',
      'Acidi grassi omega per pelo lucido',
      'Formula bilanciata per cani adulti',
      'Supporta la digestione sana'
    ],
    analyticalConstituents: {
      protein: 24,
      fat: 12,
      fiber: 3,
      moisture: 8,
      ash: 7,
      calcium: 1.2,
      phosphorus: 0.9,
      calories: 3450
    },
    feedingGuidelines: [
      { weight: 5, dailyAmount: 80 },
      { weight: 10, dailyAmount: 140 },
      { weight: 15, dailyAmount: 190 },
      { weight: 20, dailyAmount: 240 },
      { weight: 25, dailyAmount: 285 },
      { weight: 30, dailyAmount: 330 },
      { weight: 35, dailyAmount: 370 },
      { weight: 40, dailyAmount: 410 },
      { weight: 50, dailyAmount: 485 }
    ],
    formats: [
      {
        id: 'piucane-adult-chicken-rice-3kg',
        size: '3kg',
        weight: 3,
        price: 18.99,
        subscriberPrice: 16.14,
        inStock: true,
        stockLevel: 12,
        estimatedDuration: 18
      },
      {
        id: 'piucane-adult-chicken-rice-12kg',
        size: '12kg',
        weight: 12,
        price: 47.99,
        subscriberPrice: 40.79,
        inStock: true,
        stockLevel: 8,
        estimatedDuration: 75
      }
    ],
    images: [
      '/products/piucane-adult-chicken-rice-main.jpg',
      '/products/piucane-adult-chicken-rice-side.jpg',
      '/products/piucane-adult-chicken-rice-ingredients.jpg'
    ],
    rating: 4.3,
    reviewCount: 89,
    tags: ['adult', 'chicken', 'rice', 'complete-food', 'made-in-italy'],
    certifications: ['FEDIAF', 'Made in Italy'],
    suitableFor: {
      ageMin: 12,
      ageMax: 84,
      weightMin: 5,
      weightMax: 50,
      activityLevel: ['low', 'medium', 'high']
    },
    subscriptionOptions: {
      available: true,
      recommendedFrequency: 6,
      frequencies: [4, 6, 8, 10, 12],
      firstOrderDiscount: 15
    }
  },
  {
    id: 'piucane-puppy-chicken-rice-12kg',
    name: 'PiùCane Puppy Pollo e Riso',
    brand: 'PiùCane',
    category: 'food',
    subcategory: 'dry-food',
    price: 51.99,
    subscriberPrice: 44.19,
    originalPrice: 57.99,
    description: 'Alimento completo per cuccioli con pollo fresco e riso. Formula specifica per la crescita sana.',
    shortDescription: 'Pollo fresco e riso per cuccioli in crescita',
    longDescription: 'PiùCane Puppy è stato formulato appositamente per i cuccioli in fase di crescita, dalle 6 settimane fino ai 12 mesi di età. Ricco di proteine di alta qualità dal pollo fresco e con riso per una digestione ottimale, supporta lo sviluppo sano di muscoli, ossa e sistema immunitario. La dimensione delle crocchette è adatta alla bocca dei cuccioli.',
    ingredients: [
      'Pollo fresco (32%)',
      'Riso (22%)',
      'Farina di pollo',
      'Granoturco',
      'Grassi animali',
      'Polpa di barbabietola',
      'Olio di pesce',
      'Lievito di birra',
      'Fosfato bicalcico',
      'Cloruro di sodio',
      'Vitamine e minerali',
      'DHA da olio di pesce'
    ],
    allergens: ['pollo'],
    benefits: [
      'Alto contenuto proteico per la crescita',
      'DHA per lo sviluppo cerebrale',
      'Calcio e fosforo per ossa forti',
      'Crocchette piccole adatte ai cuccioli',
      'Supporta il sistema immunitario',
      'Facilmente digeribile'
    ],
    analyticalConstituents: {
      protein: 28,
      fat: 16,
      fiber: 2.5,
      moisture: 8,
      ash: 7.5,
      calcium: 1.5,
      phosphorus: 1.1,
      calories: 3750
    },
    feedingGuidelines: [
      { weight: 2, dailyAmount: 60 },
      { weight: 5, dailyAmount: 120 },
      { weight: 10, dailyAmount: 200 },
      { weight: 15, dailyAmount: 270 },
      { weight: 20, dailyAmount: 330 },
      { weight: 25, dailyAmount: 380 },
      { weight: 30, dailyAmount: 430 }
    ],
    formats: [
      {
        id: 'piucane-puppy-chicken-rice-3kg',
        size: '3kg',
        weight: 3,
        price: 21.99,
        subscriberPrice: 18.69,
        inStock: true,
        stockLevel: 15,
        estimatedDuration: 15
      },
      {
        id: 'piucane-puppy-chicken-rice-12kg',
        size: '12kg',
        weight: 12,
        price: 51.99,
        subscriberPrice: 44.19,
        inStock: true,
        stockLevel: 6,
        estimatedDuration: 60
      }
    ],
    images: [
      '/products/piucane-puppy-chicken-rice-main.jpg',
      '/products/piucane-puppy-chicken-rice-side.jpg',
      '/products/piucane-puppy-chicken-rice-kibble.jpg'
    ],
    rating: 4.5,
    reviewCount: 67,
    tags: ['puppy', 'chicken', 'rice', 'growth', 'small-kibble'],
    certifications: ['FEDIAF', 'Made in Italy'],
    suitableFor: {
      ageMin: 2,
      ageMax: 12,
      weightMin: 1,
      weightMax: 35,
      activityLevel: ['medium', 'high']
    },
    subscriptionOptions: {
      available: true,
      recommendedFrequency: 4,
      frequencies: [3, 4, 5, 6],
      firstOrderDiscount: 20
    }
  },
  {
    id: 'piucane-senior-chicken-rice-12kg',
    name: 'PiùCane Senior Pollo e Riso',
    brand: 'PiùCane',
    category: 'food',
    subcategory: 'dry-food',
    price: 49.99,
    subscriberPrice: 42.49,
    originalPrice: 54.99,
    description: 'Alimento completo per cani anziani con pollo fresco e riso. Formula specifica per il benessere senior.',
    shortDescription: 'Pollo fresco e riso per cani senior (7+ anni)',
    longDescription: 'PiùCane Senior è specificatamente formulato per soddisfare le esigenze nutrizionali dei cani anziani dai 7 anni in su. Con un contenuto proteico moderato e l\'aggiunta di glucosamina e condroitina per il supporto articolare, aiuta a mantenere la vitalità e la mobilità dei cani maturi. Gli antiossidanti naturali supportano il sistema immunitario.',
    ingredients: [
      'Pollo fresco (26%)',
      'Riso (24%)',
      'Granoturco',
      'Farina di pollo',
      'Grassi animali',
      'Polpa di barbabietola',
      'Olio di pesce',
      'Glucosamina (400mg/kg)',
      'Condroitina (300mg/kg)',
      'Antiossidanti naturali',
      'Vitamine e minerali'
    ],
    allergens: ['pollo'],
    benefits: [
      'Proteine moderate per cani senior',
      'Glucosamina e condroitina per le articolazioni',
      'Antiossidanti per il sistema immunitario',
      'Facilmente digeribile',
      'Supporta la vitalità dei cani anziani',
      'Omega-3 per la salute del pelo'
    ],
    analyticalConstituents: {
      protein: 22,
      fat: 10,
      fiber: 3.5,
      moisture: 8,
      ash: 6.5,
      calcium: 1.0,
      phosphorus: 0.8,
      calories: 3250
    },
    feedingGuidelines: [
      { weight: 5, dailyAmount: 75 },
      { weight: 10, dailyAmount: 130 },
      { weight: 15, dailyAmount: 180 },
      { weight: 20, dailyAmount: 220 },
      { weight: 25, dailyAmount: 260 },
      { weight: 30, dailyAmount: 300 },
      { weight: 35, dailyAmount: 335 },
      { weight: 40, dailyAmount: 370 }
    ],
    formats: [
      {
        id: 'piucane-senior-chicken-rice-3kg',
        size: '3kg',
        weight: 3,
        price: 20.99,
        subscriberPrice: 17.84,
        inStock: true,
        stockLevel: 10,
        estimatedDuration: 20
      },
      {
        id: 'piucane-senior-chicken-rice-12kg',
        size: '12kg',
        weight: 12,
        price: 49.99,
        subscriberPrice: 42.49,
        inStock: true,
        stockLevel: 5,
        estimatedDuration: 80
      }
    ],
    images: [
      '/products/piucane-senior-chicken-rice-main.jpg',
      '/products/piucane-senior-chicken-rice-side.jpg',
      '/products/piucane-senior-chicken-rice-benefits.jpg'
    ],
    rating: 4.4,
    reviewCount: 45,
    tags: ['senior', 'chicken', 'rice', '7plus', 'joint-support'],
    certifications: ['FEDIAF', 'Made in Italy'],
    suitableFor: {
      ageMin: 84,
      ageMax: 200,
      weightMin: 5,
      weightMax: 45,
      activityLevel: ['low', 'medium'],
      conditions: ['joint-support', 'senior-care']
    },
    subscriptionOptions: {
      available: true,
      recommendedFrequency: 8,
      frequencies: [6, 8, 10, 12],
      firstOrderDiscount: 15
    }
  },
  {
    id: 'piucane-adult-lamb-rice-12kg',
    name: 'PiùCane Adult Agnello e Riso',
    brand: 'PiùCane',
    category: 'food',
    subcategory: 'dry-food',
    price: 52.99,
    subscriberPrice: 45.04,
    originalPrice: 58.99,
    description: 'Alimento completo per cani adulti con agnello fresco e riso. Formula ipoallergenica.',
    shortDescription: 'Agnello fresco e riso, formula ipoallergenica',
    longDescription: 'PiùCane Adult Agnello e Riso è la scelta ideale per cani adulti con sensibilità alimentari. Formulato con agnello fresco come fonte proteica principale e riso per una digestione ottimale, è privo dei principali allergeni. Arricchito con omega-3 e omega-6 per un pelo lucido e una pelle sana.',
    ingredients: [
      'Agnello fresco (30%)',
      'Riso (20%)',
      'Farina di agnello',
      'Patate',
      'Grassi animali',
      'Polpa di barbabietola',
      'Olio di pesce',
      'Lievito di birra',
      'Condroitina',
      'Glucosamina',
      'Vitamine e minerali'
    ],
    allergens: [],
    benefits: [
      'Formula ipoallergenica con agnello',
      'Ideale per cani con sensibilità alimentari',
      'Riso facilmente digeribile',
      'Omega-3 e omega-6 per pelo lucido',
      'Glucosamina per le articolazioni',
      'Senza pollo, manzo e cereali problematici'
    ],
    analyticalConstituents: {
      protein: 25,
      fat: 14,
      fiber: 3,
      moisture: 8,
      ash: 7,
      calcium: 1.1,
      phosphorus: 0.9,
      calories: 3550
    },
    feedingGuidelines: [
      { weight: 5, dailyAmount: 85 },
      { weight: 10, dailyAmount: 145 },
      { weight: 15, dailyAmount: 195 },
      { weight: 20, dailyAmount: 245 },
      { weight: 25, dailyAmount: 290 },
      { weight: 30, dailyAmount: 335 },
      { weight: 35, dailyAmount: 375 },
      { weight: 40, dailyAmount: 415 },
      { weight: 50, dailyAmount: 490 }
    ],
    formats: [
      {
        id: 'piucane-adult-lamb-rice-3kg',
        size: '3kg',
        weight: 3,
        price: 22.99,
        subscriberPrice: 19.54,
        inStock: true,
        stockLevel: 8,
        estimatedDuration: 17
      },
      {
        id: 'piucane-adult-lamb-rice-12kg',
        size: '12kg',
        weight: 12,
        price: 52.99,
        subscriberPrice: 45.04,
        inStock: true,
        stockLevel: 4,
        estimatedDuration: 70
      }
    ],
    images: [
      '/products/piucane-adult-lamb-rice-main.jpg',
      '/products/piucane-adult-lamb-rice-side.jpg',
      '/products/piucane-adult-lamb-rice-hypoallergenic.jpg'
    ],
    rating: 4.6,
    reviewCount: 112,
    tags: ['adult', 'lamb', 'rice', 'hypoallergenic', 'sensitive-stomach'],
    certifications: ['FEDIAF', 'Made in Italy', 'Hypoallergenic'],
    suitableFor: {
      ageMin: 12,
      ageMax: 84,
      weightMin: 5,
      weightMax: 50,
      activityLevel: ['low', 'medium', 'high'],
      conditions: ['sensitive-stomach', 'food-allergies', 'skin-issues']
    },
    subscriptionOptions: {
      available: true,
      recommendedFrequency: 6,
      frequencies: [4, 6, 8, 10, 12],
      firstOrderDiscount: 15
    }
  },
  {
    id: 'piucane-adult-fish-rice-12kg',
    name: 'PiùCane Adult Pesce e Riso',
    brand: 'PiùCane',
    category: 'food',
    subcategory: 'dry-food',
    price: 54.99,
    subscriberPrice: 46.74,
    originalPrice: 59.99,
    description: 'Alimento completo per cani adulti con pesce fresco e riso. Ricco di omega-3.',
    shortDescription: 'Pesce fresco e riso, ricco di omega-3',
    longDescription: 'PiùCane Adult Pesce e Riso è formulato con pesce fresco come fonte proteica principale, ideale per cani con sensibilità alle proteine terrestri. Ricco di omega-3 naturali per un pelo lucido e una pelle sana, supporta anche la funzione cognitiva e la salute cardiovascolare. Una scelta eccellente per cani attivi.',
    ingredients: [
      'Pesce fresco (28%)',
      'Riso (22%)',
      'Farina di pesce',
      'Patate',
      'Olio di pesce',
      'Polpa di barbabietola',
      'Lievito di birra',
      'Alghe marine',
      'Vitamine e minerali',
      'Antiossidanti naturali'
    ],
    allergens: ['pesce'],
    benefits: [
      'Proteine del pesce facilmente digeribili',
      'Alto contenuto di omega-3 naturali',
      'Supporta pelo lucido e pelle sana',
      'Ideale per cani con allergie terrestri',
      'Supporta funzione cognitiva',
      'Antiossidanti naturali'
    ],
    analyticalConstituents: {
      protein: 26,
      fat: 15,
      fiber: 2.8,
      moisture: 8,
      ash: 7.2,
      calcium: 1.2,
      phosphorus: 1.0,
      calories: 3650
    },
    feedingGuidelines: [
      { weight: 5, dailyAmount: 80 },
      { weight: 10, dailyAmount: 140 },
      { weight: 15, dailyAmount: 190 },
      { weight: 20, dailyAmount: 240 },
      { weight: 25, dailyAmount: 285 },
      { weight: 30, dailyAmount: 330 },
      { weight: 35, dailyAmount: 370 },
      { weight: 40, dailyAmount: 410 },
      { weight: 50, dailyAmount: 485 }
    ],
    formats: [
      {
        id: 'piucane-adult-fish-rice-3kg',
        size: '3kg',
        weight: 3,
        price: 23.99,
        subscriberPrice: 20.39,
        inStock: true,
        stockLevel: 6,
        estimatedDuration: 18
      },
      {
        id: 'piucane-adult-fish-rice-12kg',
        size: '12kg',
        weight: 12,
        price: 54.99,
        subscriberPrice: 46.74,
        inStock: true,
        stockLevel: 3,
        estimatedDuration: 75
      }
    ],
    images: [
      '/products/piucane-adult-fish-rice-main.jpg',
      '/products/piucane-adult-fish-rice-side.jpg',
      '/products/piucane-adult-fish-rice-omega.jpg'
    ],
    rating: 4.5,
    reviewCount: 78,
    tags: ['adult', 'fish', 'rice', 'omega-3', 'coat-health'],
    certifications: ['FEDIAF', 'Made in Italy', 'Omega-3 Rich'],
    suitableFor: {
      ageMin: 12,
      ageMax: 84,
      weightMin: 5,
      weightMax: 50,
      activityLevel: ['medium', 'high'],
      conditions: ['coat-health', 'skin-issues', 'cognitive-support']
    },
    subscriptionOptions: {
      available: true,
      recommendedFrequency: 6,
      frequencies: [4, 6, 8, 10, 12],
      firstOrderDiscount: 15
    }
  },
  {
    id: 'piucane-mini-adult-chicken-rice-3kg',
    name: 'PiùCane Mini Adult Pollo e Riso',
    brand: 'PiùCane',
    category: 'food',
    subcategory: 'dry-food',
    price: 24.99,
    subscriberPrice: 21.24,
    originalPrice: 27.99,
    description: 'Alimento completo per cani di taglia piccola con crocchette mini e pollo fresco.',
    shortDescription: 'Crocchette mini per cani piccoli con pollo e riso',
    longDescription: 'PiùCane Mini Adult è specificatamente formulato per i cani di taglia piccola (fino a 10kg). Le crocchette di dimensione ridotta sono perfette per bocche piccole, mentre la formula bilanciata supporta il metabolismo accelerato tipico dei cani mini. Con pollo fresco e riso per una nutrizione completa.',
    ingredients: [
      'Pollo fresco (30%)',
      'Riso (20%)',
      'Farina di pollo',
      'Granoturco',
      'Grassi animali',
      'Polpa di barbabietola',
      'Olio di pesce',
      'Lievito di birra',
      'Vitamine e minerali'
    ],
    allergens: ['pollo'],
    benefits: [
      'Crocchette mini per bocche piccole',
      'Formula per cani di taglia piccola',
      'Supporta il metabolismo accelerato',
      'Pollo fresco di alta qualità',
      'Facilmente digeribile',
      'Nutrizione completa e bilanciata'
    ],
    analyticalConstituents: {
      protein: 26,
      fat: 16,
      fiber: 3,
      moisture: 8,
      ash: 7.5,
      calcium: 1.3,
      phosphorus: 1.0,
      calories: 3800
    },
    feedingGuidelines: [
      { weight: 1, dailyAmount: 25 },
      { weight: 2, dailyAmount: 45 },
      { weight: 3, dailyAmount: 60 },
      { weight: 4, dailyAmount: 75 },
      { weight: 5, dailyAmount: 90 },
      { weight: 7, dailyAmount: 115 },
      { weight: 10, dailyAmount: 150 }
    ],
    formats: [
      {
        id: 'piucane-mini-adult-chicken-rice-3kg',
        size: '3kg',
        weight: 3,
        price: 24.99,
        subscriberPrice: 21.24,
        inStock: true,
        stockLevel: 12,
        estimatedDuration: 35
      },
      {
        id: 'piucane-mini-adult-chicken-rice-7kg',
        size: '7kg',
        weight: 7,
        price: 42.99,
        subscriberPrice: 36.54,
        inStock: true,
        stockLevel: 7,
        estimatedDuration: 80
      }
    ],
    images: [
      '/products/piucane-mini-adult-main.jpg',
      '/products/piucane-mini-adult-kibble.jpg',
      '/products/piucane-mini-adult-comparison.jpg'
    ],
    rating: 4.4,
    reviewCount: 156,
    tags: ['mini', 'small-breed', 'chicken', 'rice', 'small-kibble'],
    certifications: ['FEDIAF', 'Made in Italy'],
    suitableFor: {
      ageMin: 12,
      ageMax: 84,
      weightMin: 1,
      weightMax: 10,
      activityLevel: ['medium', 'high']
    },
    subscriptionOptions: {
      available: true,
      recommendedFrequency: 8,
      frequencies: [6, 8, 10, 12],
      firstOrderDiscount: 15
    }
  }
];

// Utility functions per i prodotti
export function getProductById(id: string): ProductData | undefined {
  return piuCaneProducts.find(product => product.id === id);
}

export function getProductsByCategory(category: string): ProductData[] {
  if (category === 'all') return piuCaneProducts;
  return piuCaneProducts.filter(product => product.category === category);
}

export function getProductsByTag(tag: string): ProductData[] {
  return piuCaneProducts.filter(product => product.tags.includes(tag));
}

export function getProductsByAgeGroup(ageGroup: 'puppy' | 'adult' | 'senior'): ProductData[] {
  return piuCaneProducts.filter(product => {
    switch (ageGroup) {
      case 'puppy':
        return product.tags.includes('puppy') || (product.suitableFor.ageMax && product.suitableFor.ageMax <= 12);
      case 'senior':
        return product.tags.includes('senior') || (product.suitableFor.ageMin && product.suitableFor.ageMin >= 84);
      case 'adult':
      default:
        return product.tags.includes('adult') ||
               (!product.tags.includes('puppy') && !product.tags.includes('senior'));
    }
  });
}

export function getProductsForDog(dog: {
  weight: number;
  age: number;
  allergies: string[];
  activityLevel: string;
  specialNeeds?: string[];
}): ProductData[] {
  return piuCaneProducts.filter(product => {
    // Check age compatibility
    if (product.suitableFor.ageMin && dog.age < product.suitableFor.ageMin) return false;
    if (product.suitableFor.ageMax && dog.age > product.suitableFor.ageMax) return false;

    // Check weight compatibility
    if (product.suitableFor.weightMin && dog.weight < product.suitableFor.weightMin) return false;
    if (product.suitableFor.weightMax && dog.weight > product.suitableFor.weightMax) return false;

    // Check allergies
    const hasAllergicIngredients = product.allergens.some(allergen =>
      dog.allergies.some(dogAllergy =>
        allergen.toLowerCase().includes(dogAllergy.toLowerCase()) ||
        dogAllergy.toLowerCase().includes(allergen.toLowerCase())
      )
    );
    if (hasAllergicIngredients) return false;

    // Check activity level
    if (product.suitableFor.activityLevel &&
        !product.suitableFor.activityLevel.includes(dog.activityLevel)) return false;

    return true;
  });
}

export function calculateCompatibilityScore(product: ProductData, dog: {
  weight: number;
  age: number;
  allergies: string[];
  activityLevel: string;
  specialNeeds?: string[];
}): number {
  let score = 0;

  // Age compatibility (30%)
  if (product.suitableFor.ageMin && product.suitableFor.ageMax) {
    if (dog.age >= product.suitableFor.ageMin && dog.age <= product.suitableFor.ageMax) {
      score += 0.3;
    }
  } else {
    score += 0.15; // Partial score if no specific age range
  }

  // Weight compatibility (25%)
  if (product.suitableFor.weightMin && product.suitableFor.weightMax) {
    if (dog.weight >= product.suitableFor.weightMin && dog.weight <= product.suitableFor.weightMax) {
      score += 0.25;
    }
  } else {
    score += 0.125; // Partial score if no specific weight range
  }

  // No allergies (25%)
  const hasAllergicIngredients = product.allergens.some(allergen =>
    dog.allergies.some(dogAllergy =>
      allergen.toLowerCase().includes(dogAllergy.toLowerCase())
    )
  );
  if (!hasAllergicIngredients) {
    score += 0.25;
  }

  // Activity level match (10%)
  if (product.suitableFor.activityLevel?.includes(dog.activityLevel)) {
    score += 0.1;
  }

  // Special needs match (10%)
  if (dog.specialNeeds && product.suitableFor.conditions) {
    const matchingConditions = dog.specialNeeds.filter(need =>
      product.suitableFor.conditions!.includes(need)
    );
    score += (matchingConditions.length / dog.specialNeeds.length) * 0.1;
  } else {
    score += 0.05; // Small bonus if no special needs
  }

  return Math.min(score, 1); // Cap at 1.0
}

export default piuCaneProducts;