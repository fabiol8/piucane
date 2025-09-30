import { NextRequest, NextResponse } from 'next/server';

// Mock shop data
const mockProducts = [
  {
    id: 'food-1',
    name: 'Crocchette Premium Adult Agnello & Riso',
    brand: 'NutriCanine',
    category: 'food',
    subcategory: 'dry-food',
    price: 45.90,
    subscriberPrice: 39.02,
    originalPrice: 52.90,
    description: 'Alimento completo per cani adulti con agnello fresco e riso integrale. Formula ipoallergenica ideale per cani con sensibilità alimentari.',
    shortDescription: 'Agnello fresco e riso, formula ipoallergenica',
    ingredients: ['agnello fresco 32%', 'riso integrale', 'patate dolci', 'piselli', 'olio di salmone', 'glucosamina', 'condroitina'],
    allergens: [],
    suitableFor: {
      ageMin: 12,
      ageMax: 84,
      weightMin: 10,
      weightMax: 50,
      activityLevel: ['medium', 'high'],
      conditions: ['joint-support', 'sensitive-stomach']
    },
    nutritionalInfo: {
      protein: 28,
      fat: 16,
      fiber: 3.5,
      moisture: 8,
      calories: 3650
    },
    formats: [
      { size: '3kg', weight: 3, price: 24.90, subscriberPrice: 21.17, duration: 18 },
      { size: '12kg', weight: 12, price: 45.90, subscriberPrice: 39.02, duration: 75 },
      { size: '20kg', weight: 20, price: 72.90, subscriberPrice: 61.97, duration: 125 }
    ],
    rating: 4.8,
    reviewCount: 324,
    inStock: true,
    stockLevel: 'high',
    images: ['/products/food-premium-lamb.jpg'],
    tags: ['grain-free', 'hypoallergenic', 'joint-support', 'made-in-italy']
  },
  {
    id: 'treats-1',
    name: 'Snack Dental Care Menta',
    brand: 'DentaDog',
    category: 'treats',
    subcategory: 'dental',
    price: 12.50,
    subscriberPrice: 10.63,
    description: 'Snack funzionali per l\'igiene dentale con menta naturale e texture speciale per rimuovere placca e tartaro.',
    shortDescription: 'Igiene dentale con menta naturale',
    ingredients: ['carne di manzo', 'patate', 'menta naturale', 'calcio'],
    allergens: [],
    suitableFor: {
      ageMin: 6,
      weightMin: 5,
      conditions: ['dental-care']
    },
    formats: [
      { size: '200g', weight: 0.2, price: 12.50, subscriberPrice: 10.63, duration: 14 }
    ],
    rating: 4.6,
    reviewCount: 156,
    inStock: true,
    stockLevel: 'high',
    images: ['/products/treats-dental.jpg'],
    tags: ['dental-care', 'natural', 'breath-fresh']
  },
  {
    id: 'toy-1',
    name: 'Corda Interattiva Premium',
    brand: 'PlayDog',
    category: 'toys',
    subcategory: 'interactive',
    price: 19.90,
    subscriberPrice: 16.92,
    description: 'Giocattolo interattivo in corda naturale per gioco e pulizia denti.',
    shortDescription: 'Corda interattiva per gioco e igiene',
    ingredients: ['cotone naturale', 'fibre di cocco'],
    allergens: [],
    suitableFor: {
      ageMin: 3,
      weightMin: 1,
      weightMax: 50,
      activityLevel: ['medium', 'high']
    },
    formats: [
      { size: 'Medium', weight: 0.3, price: 19.90, subscriberPrice: 16.92, duration: 365 }
    ],
    rating: 4.4,
    reviewCount: 89,
    inStock: true,
    stockLevel: 'medium',
    images: ['/products/toy-rope.jpg'],
    tags: ['interactive', 'natural', 'dental-care']
  }
];

const mockDog = {
  id: 'dog-123',
  name: 'Luna',
  breed: 'Golden Retriever',
  weight: 28,
  age: 48, // months
  allergies: ['pollo', 'grano'],
  specialNeeds: ['joint-support'],
  activityLevel: 'high'
};

function calculateCompatibility(product: any, dog: any) {
  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Check allergens
  const hasAllergicIngredients = product.allergens.some((allergen: string) =>
    dog.allergies.some((dogAllergy: string) =>
      allergen.toLowerCase().includes(dogAllergy.toLowerCase()) ||
      dogAllergy.toLowerCase().includes(allergen.toLowerCase())
    )
  );

  if (hasAllergicIngredients) {
    score -= 0.5;
    const conflictingAllergens = product.allergens.filter((allergen: string) =>
      dog.allergies.some((dogAllergy: string) =>
        allergen.toLowerCase().includes(dogAllergy.toLowerCase())
      )
    );
    warnings.push(`Contiene ${conflictingAllergens.join(', ')} - allergia nota di ${dog.name}`);
  } else {
    score += 0.2;
    reasons.push('Non contiene allergeni noti');
  }

  // Check age compatibility
  if (product.suitableFor.ageMin && product.suitableFor.ageMax) {
    if (dog.age >= product.suitableFor.ageMin && dog.age <= product.suitableFor.ageMax) {
      score += 0.2;
      reasons.push(`Adatto all'età di ${dog.name} (${Math.floor(dog.age / 12)} anni)`);
    } else {
      score -= 0.3;
      warnings.push('Non adatto all\'età del cane');
    }
  }

  // Check weight compatibility
  if (product.suitableFor.weightMin && product.suitableFor.weightMax) {
    if (dog.weight >= product.suitableFor.weightMin && dog.weight <= product.suitableFor.weightMax) {
      score += 0.15;
      reasons.push(`Adatto al peso di ${dog.name} (${dog.weight}kg)`);
    }
  }

  // Check activity level
  if (product.suitableFor.activityLevel?.includes(dog.activityLevel)) {
    score += 0.15;
    reasons.push(`Perfetto per cani ${dog.activityLevel === 'high' ? 'molto attivi' : 'con attività moderata'}`);
  }

  // Check special needs
  if (dog.specialNeeds.length > 0 && product.suitableFor.conditions) {
    const matchingConditions = dog.specialNeeds.filter((need: string) =>
      product.suitableFor.conditions!.includes(need)
    );
    if (matchingConditions.length > 0) {
      score += 0.25;
      reasons.push(`Supporta ${matchingConditions.join(', ')}`);
    }
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    reasons,
    warnings
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const dogId = url.searchParams.get('dogId');

    let products = [...mockProducts];

    // Filter by category
    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    // Calculate compatibility for each product
    products = products.map(product => ({
      ...product,
      compatibility: calculateCompatibility(product, mockDog)
    }));

    // Sort by compatibility score
    products.sort((a, b) => (b.compatibility?.score || 0) - (a.compatibility?.score || 0));

    return NextResponse.json({
      success: true,
      data: {
        products,
        totalCount: products.length,
        dog: mockDog
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, productId, formatSize, quantity } = await request.json();

    switch (action) {
      case 'add_to_cart':
        const product = mockProducts.find(p => p.id === productId);
        if (!product) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }

        const format = product.formats.find(f => f.size === formatSize);
        if (!format) {
          return NextResponse.json(
            { success: false, error: 'Format not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            message: `${product.name} (${format.size}) aggiunto al carrello!`,
            cartItem: {
              productId,
              name: product.name,
              format: format.size,
              price: format.subscriberPrice,
              quantity: quantity || 1
            }
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Shop action failed' },
      { status: 500 }
    );
  }
}