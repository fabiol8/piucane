/**
 * Sistema di raccomandazioni AI per PiùCane
 * Algoritmi intelligenti per prodotti e abbonamenti personalizzati
 */

import { trackCTA } from '@/analytics/ga4';

export interface Dog {
  id: string;
  name: string;
  breed: string;
  birthdate: string;
  weight: number;
  gender: 'male' | 'female';
  bcs?: number;
  healthGoals: string[];
  vaccinations: Vaccination[];
  healthRecords: HealthRecord[];
  activityLevel: 'low' | 'medium' | 'high';
  specialNeeds?: string[];
  allergies?: string[];
  currentFood?: string;
  feedingSchedule?: FeedingSchedule;
}

export interface Vaccination {
  id: string;
  name: string;
  date: string;
  nextDue: string;
  veterinarian: string;
}

export interface HealthRecord {
  id: string;
  date: string;
  type: 'behavior' | 'symptom' | 'routine' | 'vet-visit';
  description: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface FeedingSchedule {
  mealsPerDay: number;
  totalDailyAmount: number; // in grams
  feedingTimes: string[];
}

export interface Product {
  id: string;
  name: string;
  category: 'food' | 'treats' | 'toys' | 'accessories' | 'health' | 'grooming';
  subcategory: string;
  brand: string;
  price: number;
  originalPrice?: number;
  description: string;
  ingredients?: string[];
  suitableFor: {
    ageMin?: number; // months
    ageMax?: number; // months
    weightMin?: number; // kg
    weightMax?: number; // kg
    breeds?: string[];
    activityLevel?: ('low' | 'medium' | 'high')[];
    specialNeeds?: string[];
  };
  nutritionalInfo?: {
    protein: number;
    fat: number;
    fiber: number;
    moisture: number;
    calories: number; // per 100g
  };
  rating: number;
  reviewCount: number;
  inStock: boolean;
  image: string;
  tags: string[];
}

export interface Subscription {
  id: string;
  name: string;
  type: 'food' | 'treats' | 'mixed' | 'health' | 'complete';
  description: string;
  price: number;
  originalPrice?: number;
  savings: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly';
  products: {
    productId: string;
    quantity: number;
    customizable: boolean;
  }[];
  suitableFor: {
    ageMin?: number;
    ageMax?: number;
    weightMin?: number;
    weightMax?: number;
    breeds?: string[];
    activityLevel?: ('low' | 'medium' | 'high')[];
  };
  features: string[];
  image: string;
  popularity: number;
}

export interface RecommendationContext {
  dog: Dog;
  user: {
    id: string;
    orderHistory: any[];
    preferences: string[];
    budget?: 'low' | 'medium' | 'high';
  };
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  location?: {
    region: string;
    climate: 'cold' | 'temperate' | 'warm';
  };
}

export interface Recommendation {
  id: string;
  type: 'product' | 'subscription';
  item: Product | Subscription;
  confidence: number; // 0-1
  reasoning: string[];
  category: 'essential' | 'recommended' | 'nice-to-have' | 'seasonal' | 'health-focused';
  urgency: 'low' | 'medium' | 'high';
  personalizedPrice?: number;
  discount?: {
    percentage: number;
    reason: string;
    validUntil: string;
  };
  alternatives?: string[]; // product IDs
}

export interface RecommendationEngine {
  getProductRecommendations(context: RecommendationContext): Promise<Recommendation[]>;
  getSubscriptionRecommendations(context: RecommendationContext): Promise<Recommendation[]>;
  getHealthRecommendations(context: RecommendationContext): Promise<Recommendation[]>;
  getSeasonalRecommendations(context: RecommendationContext): Promise<Recommendation[]>;
  getNutritionalRecommendations(context: RecommendationContext): Promise<Recommendation[]>;
}

class AIRecommendationEngine implements RecommendationEngine {
  private products: Product[] = [];
  private subscriptions: Subscription[] = [];
  private breedData: Map<string, any> = new Map();

  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    // Inizializza dati mock - in produzione verrebbero dal database
    await this.loadMockProducts();
    this.loadMockSubscriptions();
    this.loadBreedData();
  }

  private async loadMockProducts() {
    // Import dei prodotti reali PiùCane
    const { piuCaneProducts, calculateCompatibilityScore } = await import('./products-data');

    // Converti i prodotti PiùCane nel formato del sistema di raccomandazioni
    this.products = piuCaneProducts.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      description: product.description,
      ingredients: product.ingredients,
      suitableFor: product.suitableFor,
      nutritionalInfo: product.analyticalConstituents ? {
        protein: product.analyticalConstituents.protein,
        fat: product.analyticalConstituents.fat,
        fiber: product.analyticalConstituents.fiber,
        moisture: product.analyticalConstituents.moisture,
        calories: product.analyticalConstituents.calories
      } : undefined,
      rating: product.rating,
      reviewCount: product.reviewCount,
      inStock: product.formats.some(f => f.inStock),
      image: product.images[0],
      tags: product.tags
    }));

    // Aggiungi alcuni prodotti complementari (snack, giocattoli, integratori)
    this.products.push(
        {
          id: 'treats-dental-piucane',
          name: 'PiùCane Snack Dental Care',
          category: 'treats',
          subcategory: 'dental',
          brand: 'PiùCane',
          price: 12.50,
          description: 'Snack per l\'igiene dentale con menta naturale',
          suitableFor: {
            ageMin: 6,
            weightMin: 2
          },
          rating: 4.5,
          reviewCount: 89,
          inStock: true,
          image: '/products/piucane-dental-treats.jpg',
          tags: ['dental-care', 'natural', 'breath-fresh']
        },
        {
          id: 'supplement-omega3-piucane',
          name: 'PiùCane Omega-3 Plus',
          category: 'health',
          subcategory: 'supplements',
          brand: 'PiùCane',
          price: 28.50,
          description: 'Integratore per pelo lucido e pelle sana',
          suitableFor: {
            ageMin: 6,
            specialNeeds: ['skin-issues', 'coat-problems']
          },
          rating: 4.6,
          reviewCount: 67,
          inStock: true,
          image: '/products/piucane-omega3.jpg',
          tags: ['supplement', 'coat-health', 'veterinary-approved']
        }
    );
  }

  private loadMockSubscriptions() {
    this.subscriptions = [
      {
        id: 'sub-complete',
        name: 'Abbonamento Completo',
        type: 'complete',
        description: 'Tutto ciò che serve per il tuo cane: cibo, snack e accessori',
        price: 89.90,
        originalPrice: 110.00,
        savings: 20.10,
        frequency: 'monthly',
        products: [
          { productId: 'piucane-adult-chicken-rice', quantity: 2, customizable: true },
          { productId: 'treats-dental-piucane', quantity: 1, customizable: false },
          { productId: 'supplement-omega3-piucane', quantity: 1, customizable: true }
        ],
        suitableFor: {
          ageMin: 12,
          weightMin: 10,
          activityLevel: ['medium', 'high']
        },
        features: [
          'Consegna mensile gratuita',
          'Personalizzazione prodotti',
          'Consulenza veterinaria inclusa',
          'Sconto 20% sui singoli prodotti'
        ],
        image: '/subscriptions/complete.jpg',
        popularity: 85
      },
      {
        id: 'sub-food',
        name: 'Abbonamento Alimentare',
        type: 'food',
        description: 'Cibo premium consegnato regolarmente a casa tua',
        price: 65.90,
        originalPrice: 75.90,
        savings: 10.00,
        frequency: 'monthly',
        products: [
          { productId: 'piucane-adult-chicken-rice', quantity: 3, customizable: true }
        ],
        suitableFor: {
          ageMin: 6
        },
        features: [
          'Consegna programmata',
          'Quantità personalizzabile',
          'Cambio frequenza flessibile',
          'Primo mese -15%'
        ],
        image: '/subscriptions/food.jpg',
        popularity: 92
      }
    ];
  }

  private loadBreedData() {
    // Dati specifici per razza - in produzione da database veterinario
    this.breedData.set('Labrador Retriever', {
      size: 'large',
      activityLevel: 'high',
      commonIssues: ['hip-dysplasia', 'obesity', 'eye-problems'],
      lifespan: [10, 12],
      feedingNeeds: {
        proteinMin: 22,
        fatMax: 15,
        caloriesPerKg: 55
      },
      recommendedProducts: ['piucane-adult-chicken-rice', 'piucane-puppy']
    });

    this.breedData.set('Golden Retriever', {
      size: 'large',
      activityLevel: 'high',
      commonIssues: ['hip-dysplasia', 'heart-problems', 'cancer'],
      lifespan: [10, 12],
      feedingNeeds: {
        proteinMin: 22,
        fatMax: 15,
        caloriesPerKg: 55
      },
      recommendedProducts: ['piucane-adult-chicken-rice', 'supplement-omega3-piucane']
    });

    this.breedData.set('Beagle', {
      size: 'medium',
      activityLevel: 'medium',
      commonIssues: ['obesity', 'ear-infections', 'eye-problems'],
      lifespan: [12, 15],
      feedingNeeds: {
        proteinMin: 20,
        fatMax: 12,
        caloriesPerKg: 50
      },
      recommendedProducts: ['piucane-adult-chicken-rice', 'treats-dental-piucane']
    });
  }

  async getProductRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const { dog, user } = context;
    const recommendations: Recommendation[] = [];

    // Analisi nutrizionale basata su età, peso e razza
    const nutritionalNeeds = this.calculateNutritionalNeeds(dog);
    const breedInfo = this.breedData.get(dog.breed);

    // Raccomandazioni alimentari
    const foodRecommendations = this.products
      .filter(p => p.category === 'food')
      .map(product => this.scoreProduct(product, dog, nutritionalNeeds, breedInfo))
      .filter(rec => rec.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    recommendations.push(...foodRecommendations);

    // Raccomandazioni per la salute
    if (this.needsHealthSupplements(dog)) {
      const healthRecommendations = this.products
        .filter(p => p.category === 'health')
        .map(product => this.scoreProduct(product, dog, nutritionalNeeds, breedInfo))
        .filter(rec => rec.confidence > 0.4)
        .slice(0, 2);

      recommendations.push(...healthRecommendations);
    }

    // Raccomandazioni giocattoli basate su attività
    const toyRecommendations = this.products
      .filter(p => p.category === 'toys')
      .map(product => this.scoreProduct(product, dog, nutritionalNeeds, breedInfo))
      .filter(rec => rec.confidence > 0.3)
      .slice(0, 2);

    recommendations.push(...toyRecommendations);

    // Tracciamento analytics
    trackCTA({
      ctaId: 'recommendations.products.generated',
      event: 'recommendations_generated',
      value: 'products',
      metadata: {
        dogId: dog.id,
        breed: dog.breed,
        recommendationCount: recommendations.length
      }
    });

    return recommendations;
  }

  async getSubscriptionRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const { dog, user } = context;
    const recommendations: Recommendation[] = [];

    // Analisi del profilo per determinare il tipo di abbonamento ideale
    const subscriptionProfile = this.analyzeSubscriptionProfile(dog, user);

    for (const subscription of this.subscriptions) {
      const confidence = this.scoreSubscription(subscription, dog, user, subscriptionProfile);

      if (confidence > 0.4) {
        const reasoning = this.generateSubscriptionReasoning(subscription, dog, subscriptionProfile);

        recommendations.push({
          id: `sub-rec-${subscription.id}`,
          type: 'subscription',
          item: subscription,
          confidence,
          reasoning,
          category: this.categorizeSubscription(subscription, confidence),
          urgency: this.calculateUrgency(dog, subscription),
          personalizedPrice: this.calculatePersonalizedPrice(subscription, user),
          discount: this.generateDiscount(subscription, user),
          alternatives: this.findAlternativeSubscriptions(subscription.id)
        });
      }
    }

    // Ordina per confidence e limita a 3
    recommendations.sort((a, b) => b.confidence - a.confidence);

    trackCTA({
      ctaId: 'recommendations.subscriptions.generated',
      event: 'recommendations_generated',
      value: 'subscriptions',
      metadata: {
        dogId: dog.id,
        recommendationCount: recommendations.length
      }
    });

    return recommendations.slice(0, 3);
  }

  async getHealthRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const { dog } = context;
    const recommendations: Recommendation[] = [];

    // Analisi dei problemi di salute comuni per la razza
    const breedInfo = this.breedData.get(dog.breed);
    if (!breedInfo) return recommendations;

    // Controllo delle vaccinazioni scadute
    const overdueVaccinations = dog.vaccinations.filter(v =>
      new Date(v.nextDue) < new Date()
    );

    if (overdueVaccinations.length > 0) {
      recommendations.push({
        id: 'health-vaccination',
        type: 'product',
        item: {
          id: 'vaccination-reminder',
          name: 'Promemoria Vaccinazione',
          category: 'health',
          subcategory: 'prevention',
          brand: 'PiùCane',
          price: 0,
          description: `${overdueVaccinations.length} vaccinazioni in scadenza`,
          rating: 5,
          reviewCount: 0,
          inStock: true,
          image: '/health/vaccination.jpg',
          tags: ['urgent', 'prevention']
        } as Product,
        confidence: 0.95,
        reasoning: [
          `${overdueVaccinations.length} vaccinazioni scadute`,
          'Prevenzione essenziale per la salute',
          'Contatta il veterinario'
        ],
        category: 'essential',
        urgency: 'high'
      });
    }

    // Raccomandazioni preventive basate sull'età
    const age = this.calculateAge(dog.birthdate);
    if (age > 84) { // Over 7 anni
      const seniorHealthProducts = this.products.filter(p =>
        p.tags.includes('senior-care') ||
        p.subcategory === 'supplements'
      );

      for (const product of seniorHealthProducts) {
        recommendations.push({
          id: `health-senior-${product.id}`,
          type: 'product',
          item: product,
          confidence: 0.7,
          reasoning: [
            'Supporto per cani senior',
            'Prevenzione problemi legati all\'età',
            'Miglioramento qualità della vita'
          ],
          category: 'recommended',
          urgency: 'medium'
        });
      }
    }

    return recommendations;
  }

  async getSeasonalRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const { currentSeason, dog } = context;
    const recommendations: Recommendation[] = [];

    const seasonalProducts = this.getSeasonalProducts(currentSeason);

    for (const product of seasonalProducts) {
      const confidence = this.scoreSeasonalProduct(product, dog, currentSeason);

      if (confidence > 0.4) {
        recommendations.push({
          id: `seasonal-${product.id}`,
          type: 'product',
          item: product,
          confidence,
          reasoning: this.generateSeasonalReasoning(product, currentSeason),
          category: 'seasonal',
          urgency: 'low'
        });
      }
    }

    return recommendations.slice(0, 2);
  }

  async getNutritionalRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const { dog } = context;
    const recommendations: Recommendation[] = [];

    const nutritionalNeeds = this.calculateNutritionalNeeds(dog);
    const currentFood = dog.currentFood;

    // Analisi dell'alimentazione attuale
    if (currentFood) {
      const currentProduct = this.products.find(p => p.id === currentFood);
      if (currentProduct && currentProduct.nutritionalInfo) {
        const analysis = this.analyzeNutritionalGaps(currentProduct.nutritionalInfo, nutritionalNeeds);

        if (analysis.needsImprovement) {
          const betterOptions = this.findBetterNutritionalOptions(nutritionalNeeds, currentProduct);
          recommendations.push(...betterOptions);
        }
      }
    }

    return recommendations;
  }

  // Helper methods
  private calculateAge(birthdate: string): number {
    const birth = new Date(birthdate);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30)); // months
  }

  private calculateNutritionalNeeds(dog: Dog) {
    const age = this.calculateAge(dog.birthdate);
    const breedInfo = this.breedData.get(dog.breed);

    let baseCalories = dog.weight * 50; // Base calculation

    // Adjust for activity level
    switch (dog.activityLevel) {
      case 'low': baseCalories *= 0.8; break;
      case 'high': baseCalories *= 1.3; break;
    }

    // Adjust for age
    if (age < 12) baseCalories *= 1.5; // Puppy
    if (age > 84) baseCalories *= 0.9; // Senior

    return {
      dailyCalories: Math.round(baseCalories),
      protein: breedInfo?.feedingNeeds?.proteinMin || 20,
      fat: breedInfo?.feedingNeeds?.fatMax || 15,
      weight: dog.weight,
      age,
      specialNeeds: dog.specialNeeds || []
    };
  }

  private scoreProduct(product: Product, dog: Dog, nutritionalNeeds: any, breedInfo: any): Recommendation {
    let confidence = 0;
    const reasoning: string[] = [];

    // Age compatibility
    if (product.suitableFor.ageMin && product.suitableFor.ageMax) {
      const age = this.calculateAge(dog.birthdate);
      if (age >= product.suitableFor.ageMin && age <= product.suitableFor.ageMax) {
        confidence += 0.2;
        reasoning.push('Adatto all\'età del cane');
      }
    }

    // Weight compatibility
    if (product.suitableFor.weightMin && product.suitableFor.weightMax) {
      if (dog.weight >= product.suitableFor.weightMin && dog.weight <= product.suitableFor.weightMax) {
        confidence += 0.2;
        reasoning.push('Adatto al peso del cane');
      }
    }

    // Activity level
    if (product.suitableFor.activityLevel?.includes(dog.activityLevel)) {
      confidence += 0.15;
      reasoning.push('Perfetto per il livello di attività');
    }

    // Breed specific
    if (breedInfo?.recommendedProducts?.includes(product.id)) {
      confidence += 0.25;
      reasoning.push(`Raccomandato per ${dog.breed}`);
    }

    // Rating and reviews
    if (product.rating > 4.5) {
      confidence += 0.1;
      reasoning.push('Prodotto molto apprezzato');
    }

    // Special needs
    if (dog.specialNeeds) {
      for (const need of dog.specialNeeds) {
        if (product.suitableFor.specialNeeds?.includes(need)) {
          confidence += 0.2;
          reasoning.push(`Ideale per ${need}`);
        }
      }
    }

    return {
      id: `product-rec-${product.id}`,
      type: 'product',
      item: product,
      confidence: Math.min(confidence, 1),
      reasoning,
      category: this.categorizeRecommendation(confidence),
      urgency: product.category === 'food' ? 'medium' : 'low'
    };
  }

  private scoreSubscription(subscription: Subscription, dog: Dog, user: any, profile: any): number {
    let score = 0;

    // Age compatibility
    const age = this.calculateAge(dog.birthdate);
    if (!subscription.suitableFor.ageMin || age >= subscription.suitableFor.ageMin) {
      score += 0.2;
    }

    // Weight compatibility
    if (!subscription.suitableFor.weightMin || dog.weight >= subscription.suitableFor.weightMin) {
      score += 0.2;
    }

    // Activity level
    if (subscription.suitableFor.activityLevel?.includes(dog.activityLevel)) {
      score += 0.2;
    }

    // User preferences
    if (profile.prefersConvenience) score += 0.15;
    if (profile.budgetConscious && subscription.savings > 15) score += 0.15;

    // Popularity
    score += (subscription.popularity / 100) * 0.1;

    return Math.min(score, 1);
  }

  private analyzeSubscriptionProfile(dog: Dog, user: any) {
    return {
      prefersConvenience: user.orderHistory?.length > 3,
      budgetConscious: user.budget === 'low' || user.budget === 'medium',
      healthFocused: dog.healthGoals?.includes('health'),
      activeLifestyle: dog.activityLevel === 'high'
    };
  }

  private generateSubscriptionReasoning(subscription: Subscription, dog: Dog, profile: any): string[] {
    const reasoning = [];

    if (profile.prefersConvenience) {
      reasoning.push('Consegna automatica per maggiore praticità');
    }

    if (subscription.savings > 0) {
      reasoning.push(`Risparmio di €${subscription.savings.toFixed(2)} ogni consegna`);
    }

    if (subscription.type === 'complete') {
      reasoning.push('Soluzione completa per tutte le esigenze');
    }

    reasoning.push(`Personalizzabile per ${dog.name}`);

    return reasoning;
  }

  private categorizeRecommendation(confidence: number): 'essential' | 'recommended' | 'nice-to-have' {
    if (confidence > 0.8) return 'essential';
    if (confidence > 0.6) return 'recommended';
    return 'nice-to-have';
  }

  private categorizeSubscription(subscription: Subscription, confidence: number): 'essential' | 'recommended' | 'nice-to-have' {
    if (subscription.type === 'food' && confidence > 0.7) return 'essential';
    if (confidence > 0.6) return 'recommended';
    return 'nice-to-have';
  }

  private calculateUrgency(dog: Dog, subscription: Subscription): 'low' | 'medium' | 'high' {
    if (subscription.type === 'food') {
      // Check if dog needs food soon
      return 'medium';
    }
    return 'low';
  }

  private calculatePersonalizedPrice(subscription: Subscription, user: any): number {
    let price = subscription.price;

    // First-time user discount
    if (!user.orderHistory || user.orderHistory.length === 0) {
      price *= 0.85; // 15% discount
    }

    return Math.round(price * 100) / 100;
  }

  private generateDiscount(subscription: Subscription, user: any) {
    if (!user.orderHistory || user.orderHistory.length === 0) {
      return {
        percentage: 15,
        reason: 'Sconto di benvenuto',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return undefined;
  }

  private findAlternativeSubscriptions(subscriptionId: string): string[] {
    return this.subscriptions
      .filter(s => s.id !== subscriptionId)
      .map(s => s.id)
      .slice(0, 2);
  }

  private needsHealthSupplements(dog: Dog): boolean {
    const age = this.calculateAge(dog.birthdate);
    return age > 84 || dog.specialNeeds?.length > 0 || dog.healthRecords?.some(r => r.urgency === 'high');
  }

  private getSeasonalProducts(season: string): Product[] {
    const seasonalTags = {
      'winter': ['winter-coat', 'indoor-toys', 'warming'],
      'summer': ['cooling', 'sun-protection', 'hydration'],
      'spring': ['allergy-support', 'outdoor-toys', 'grooming'],
      'autumn': ['coat-care', 'immune-support', 'preparation']
    };

    const tags = seasonalTags[season] || [];
    return this.products.filter(p =>
      tags.some(tag => p.tags.includes(tag))
    );
  }

  private scoreSeasonalProduct(product: Product, dog: Dog, season: string): number {
    // Simplified seasonal scoring
    return 0.6; // Base seasonal relevance
  }

  private generateSeasonalReasoning(product: Product, season: string): string[] {
    const seasonalReasons = {
      'winter': ['Protezione dal freddo', 'Comfort durante l\'inverno'],
      'summer': ['Protezione dal caldo', 'Idratazione extra'],
      'spring': ['Supporto contro le allergie', 'Preparazione alla bella stagione'],
      'autumn': ['Cura del mantello', 'Rinforzo del sistema immunitario']
    };

    return seasonalReasons[season] || ['Prodotto stagionale'];
  }

  private analyzeNutritionalGaps(current: any, needed: any) {
    return {
      needsImprovement: current.protein < needed.protein || current.calories < needed.dailyCalories,
      gaps: []
    };
  }

  private findBetterNutritionalOptions(needs: any, current: Product): Recommendation[] {
    return this.products
      .filter(p => p.category === 'food' && p.id !== current.id)
      .filter(p => p.nutritionalInfo?.protein >= needs.protein)
      .map(p => ({
        id: `nutrition-${p.id}`,
        type: 'product' as const,
        item: p,
        confidence: 0.7,
        reasoning: ['Migliore profilo nutrizionale', 'Adatto alle esigenze specifiche'],
        category: 'recommended' as const,
        urgency: 'medium' as const
      }))
      .slice(0, 2);
  }
}

// Singleton instance
export const recommendationEngine = new AIRecommendationEngine();

// Utility functions for easy access
export async function getRecommendationsForDog(dog: Dog, user: any): Promise<{
  products: Recommendation[];
  subscriptions: Recommendation[];
  health: Recommendation[];
  seasonal: Recommendation[];
}> {
  const context: RecommendationContext = {
    dog,
    user,
    currentSeason: getCurrentSeason(),
    location: {
      region: 'Italy',
      climate: 'temperate'
    }
  };

  const [products, subscriptions, health, seasonal] = await Promise.all([
    recommendationEngine.getProductRecommendations(context),
    recommendationEngine.getSubscriptionRecommendations(context),
    recommendationEngine.getHealthRecommendations(context),
    recommendationEngine.getSeasonalRecommendations(context)
  ]);

  trackCTA({
    ctaId: 'recommendations.full.generated',
    event: 'recommendations_generated',
    value: 'all',
    metadata: {
      dogId: dog.id,
      totalRecommendations: products.length + subscriptions.length + health.length + seasonal.length
    }
  });

  return { products, subscriptions, health, seasonal };
}

function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}