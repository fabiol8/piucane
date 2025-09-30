/**
 * Sistema carrello intelligente con raccomandazioni dinamiche
 * Integra AI recommendations, bundle optimization e pricing dinamico
 */

import { trackCTA } from '@/analytics/ga4';
import { Product, Subscription, getRecommendationsForDog } from './recommendations';

export interface CartItem {
  id: string;
  type: 'product' | 'subscription';
  item: Product | Subscription;
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: {
    type: 'percentage' | 'fixed' | 'bundle' | 'loyalty';
    value: number;
    reason: string;
  };
  addedAt: Date;
  recommendationId?: string; // If added from recommendation
}

export interface CartBundle {
  id: string;
  name: string;
  items: string[]; // cart item IDs
  discount: number; // percentage
  savings: number; // euro amount
  description: string;
}

export interface SmartCartAnalysis {
  totalItems: number;
  subtotal: number;
  discounts: number;
  total: number;
  estimatedShipping: number;
  potentialSavings: number;
  missingForFreeShipping?: number;
  suggestedBundles: CartBundle[];
  complementaryItems: Product[];
  loyaltyPoints: number;
  nextTierDiscount?: {
    threshold: number;
    discount: number;
    itemsNeeded: Product[];
  };
}

export interface CartRecommendation {
  type: 'bundle' | 'complement' | 'upgrade' | 'free_shipping' | 'loyalty_bonus';
  title: string;
  description: string;
  items: Product[];
  savings: number;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  action: string;
}

class SmartCart {
  private items: CartItem[] = [];
  private user: any = null;
  private dog: any = null;

  constructor() {
    this.loadFromStorage();
  }

  // Core cart operations
  addItem(item: Product | Subscription, quantity: number = 1, recommendationId?: string): CartItem {
    const existingItem = this.items.find(cartItem =>
      cartItem.item.id === item.id && cartItem.type === (item.hasOwnProperty('category') ? 'product' : 'subscription')
    );

    const price = this.calculateDynamicPrice(item);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = price; // Update with latest dynamic price
    } else {
      const cartItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: item.hasOwnProperty('category') ? 'product' : 'subscription',
        item,
        quantity,
        price,
        originalPrice: item.originalPrice,
        addedAt: new Date(),
        recommendationId
      };

      // Apply smart discounts
      cartItem.discount = this.calculateSmartDiscount(cartItem);

      this.items.push(cartItem);
    }

    this.saveToStorage();
    this.trackCartEvent('item_added', { itemId: item.id, quantity, fromRecommendation: !!recommendationId });

    return existingItem || this.items[this.items.length - 1];
  }

  removeItem(itemId: string): void {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
      const removedItem = this.items[itemIndex];
      this.items.splice(itemIndex, 1);
      this.saveToStorage();
      this.trackCartEvent('item_removed', { itemId: removedItem.item.id });
    }
  }

  updateQuantity(itemId: string, quantity: number): void {
    const item = this.items.find(item => item.id === itemId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(itemId);
      } else {
        item.quantity = quantity;
        item.price = this.calculateDynamicPrice(item.item); // Recalculate for quantity discounts
        this.saveToStorage();
        this.trackCartEvent('quantity_updated', { itemId: item.item.id, quantity });
      }
    }
  }

  clear(): void {
    this.items = [];
    this.saveToStorage();
    this.trackCartEvent('cart_cleared');
  }

  // Smart analysis and recommendations
  async analyze(): Promise<SmartCartAnalysis> {
    const subtotal = this.calculateSubtotal();
    const discounts = this.calculateTotalDiscounts();
    const total = subtotal - discounts;
    const estimatedShipping = this.calculateShipping(total);

    // Generate smart recommendations
    const suggestedBundles = await this.findBundleOpportunities();
    const complementaryItems = await this.findComplementaryItems();
    const potentialSavings = this.calculatePotentialSavings();

    // Free shipping analysis
    const freeShippingThreshold = 50; // €50 for free shipping
    const missingForFreeShipping = total < freeShippingThreshold ? freeShippingThreshold - total : undefined;

    // Loyalty points
    const loyaltyPoints = Math.floor(total * 0.05); // 5% back in points

    return {
      totalItems: this.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discounts,
      total,
      estimatedShipping,
      potentialSavings,
      missingForFreeShipping,
      suggestedBundles,
      complementaryItems,
      loyaltyPoints,
      nextTierDiscount: this.calculateNextTierDiscount()
    };
  }

  async getSmartRecommendations(): Promise<CartRecommendation[]> {
    const recommendations: CartRecommendation[] = [];

    // Bundle recommendations
    const bundles = await this.findBundleOpportunities();
    for (const bundle of bundles) {
      recommendations.push({
        type: 'bundle',
        title: `Bundle: ${bundle.name}`,
        description: bundle.description,
        items: [], // Would map bundle items to products
        savings: bundle.savings,
        confidence: 0.8,
        urgency: bundle.savings > 10 ? 'medium' : 'low',
        action: 'Aggiungi bundle'
      });
    }

    // Free shipping recommendation
    const analysis = await this.analyze();
    if (analysis.missingForFreeShipping && analysis.missingForFreeShipping < 20) {
      const cheapItems = await this.findItemsUnderPrice(analysis.missingForFreeShipping);
      if (cheapItems.length > 0) {
        recommendations.push({
          type: 'free_shipping',
          title: 'Spedizione gratuita',
          description: `Aggiungi €${analysis.missingForFreeShipping.toFixed(2)} per la spedizione gratuita`,
          items: cheapItems.slice(0, 3),
          savings: analysis.estimatedShipping,
          confidence: 0.9,
          urgency: 'high',
          action: 'Aggiungi per spedizione gratuita'
        });
      }
    }

    // Complementary items
    const complementary = analysis.complementaryItems.slice(0, 2);
    if (complementary.length > 0) {
      recommendations.push({
        type: 'complement',
        title: 'Prodotti complementari',
        description: 'Perfetti con i tuoi acquisti',
        items: complementary,
        savings: 0,
        confidence: 0.7,
        urgency: 'low',
        action: 'Visualizza prodotti'
      });
    }

    return recommendations.sort((a, b) => {
      // Sort by urgency and savings
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return b.savings - a.savings;
    });
  }

  // Price optimization
  private calculateDynamicPrice(item: Product | Subscription): number {
    let price = item.price;

    // Quantity discounts
    const cartItem = this.items.find(ci => ci.item.id === item.id);
    const quantity = cartItem?.quantity || 1;

    if (quantity >= 3) {
      price *= 0.95; // 5% discount for 3+ items
    }

    // User loyalty discounts
    if (this.user?.orderHistory?.length > 5) {
      price *= 0.98; // 2% loyal customer discount
    }

    // Bundle discounts (applied separately)

    return Math.round(price * 100) / 100;
  }

  private calculateSmartDiscount(cartItem: CartItem): CartItem['discount'] | undefined {
    // First-time customer discount
    if (!this.user?.orderHistory?.length) {
      return {
        type: 'loyalty',
        value: 10,
        reason: 'Sconto di benvenuto'
      };
    }

    // Quantity discount
    if (cartItem.quantity >= 3) {
      return {
        type: 'percentage',
        value: 5,
        reason: 'Sconto quantità'
      };
    }

    // Seasonal discounts
    const now = new Date();
    const month = now.getMonth();
    if (month === 11 || month === 0) { // December or January
      return {
        type: 'percentage',
        value: 15,
        reason: 'Offerta invernale'
      };
    }

    return undefined;
  }

  private async findBundleOpportunities(): Promise<CartBundle[]> {
    const bundles: CartBundle[] = [];

    // Food + Treats bundle
    const hasFood = this.items.some(item =>
      item.type === 'product' && (item.item as Product).category === 'food'
    );
    const hasTreats = this.items.some(item =>
      item.type === 'product' && (item.item as Product).category === 'treats'
    );

    if (hasFood && !hasTreats) {
      bundles.push({
        id: 'food-treats',
        name: 'Alimentazione Completa',
        items: [], // Would include specific item IDs
        discount: 10,
        savings: 5.50,
        description: 'Cibo + snack per un\'alimentazione bilanciata'
      });
    }

    // Health bundle
    const hasHealthProduct = this.items.some(item =>
      item.type === 'product' && (item.item as Product).category === 'health'
    );

    if (!hasHealthProduct && this.dog?.age > 84) { // Senior dog
      bundles.push({
        id: 'senior-health',
        name: 'Benessere Senior',
        items: [],
        discount: 15,
        savings: 12.00,
        description: 'Integratori essenziali per cani anziani'
      });
    }

    return bundles;
  }

  private async findComplementaryItems(): Promise<Product[]> {
    if (!this.dog) return [];

    // Get AI recommendations based on cart contents
    try {
      const recs = await getRecommendationsForDog(this.dog, this.user);

      // Filter out items already in cart
      const cartItemIds = this.items.map(item => item.item.id);
      const complementary = recs.products
        .filter(rec => !cartItemIds.includes(rec.item.id))
        .map(rec => rec.item as Product)
        .slice(0, 3);

      return complementary;
    } catch (error) {
      return [];
    }
  }

  private async findItemsUnderPrice(maxPrice: number): Promise<Product[]> {
    // Mock implementation - in real app would query products API
    const cheapItems: Product[] = [
      {
        id: 'treat-dental',
        name: 'Snack Dentali',
        category: 'treats',
        subcategory: 'dental',
        brand: 'DentaDog',
        price: 8.90,
        description: 'Snack per igiene dentale',
        rating: 4.5,
        reviewCount: 89,
        inStock: true,
        image: '/products/dental-small.jpg',
        tags: ['dental', 'small']
      }
    ];

    return cheapItems.filter(item => item.price <= maxPrice);
  }

  // Calculations
  private calculateSubtotal(): number {
    return this.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }

  private calculateTotalDiscounts(): number {
    return this.items.reduce((sum, item) => {
      if (item.discount) {
        const itemTotal = item.price * item.quantity;
        if (item.discount.type === 'percentage') {
          return sum + (itemTotal * item.discount.value / 100);
        } else if (item.discount.type === 'fixed') {
          return sum + item.discount.value;
        }
      }
      return sum;
    }, 0);
  }

  private calculateShipping(total: number): number {
    if (total >= 50) return 0; // Free shipping over €50
    return 4.90;
  }

  private calculatePotentialSavings(): number {
    // Calculate potential savings from bundles and offers
    let potential = 0;

    // Bundle savings
    const subtotal = this.calculateSubtotal();
    if (subtotal > 30) {
      potential += subtotal * 0.1; // 10% bundle discount potential
    }

    return potential;
  }

  private calculateNextTierDiscount() {
    const total = this.calculateSubtotal();

    if (total < 100) {
      return {
        threshold: 100,
        discount: 15,
        itemsNeeded: [] // Would suggest specific items
      };
    }

    return undefined;
  }

  // Persistence
  private saveToStorage(): void {
    localStorage.setItem('piucane_cart', JSON.stringify({
      items: this.items,
      updatedAt: new Date().toISOString()
    }));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('piucane_cart');
      if (stored) {
        const data = JSON.parse(stored);
        this.items = data.items.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.items = [];
    }
  }

  // Analytics
  private trackCartEvent(event: string, metadata?: any): void {
    trackCTA({
      ctaId: `cart.${event}`,
      event: `cart_${event}`,
      metadata: {
        cartValue: this.calculateSubtotal(),
        itemCount: this.items.length,
        ...metadata
      }
    });
  }

  // Getters
  getItems(): CartItem[] {
    return [...this.items];
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  setUser(user: any): void {
    this.user = user;
  }

  setDog(dog: any): void {
    this.dog = dog;
  }

  // Subscription management
  async optimizeSubscriptions(): Promise<{
    recommendations: any[];
    potentialSavings: number;
  }> {
    const subscriptionItems = this.items.filter(item => item.type === 'subscription');

    if (subscriptionItems.length === 0) {
      return { recommendations: [], potentialSavings: 0 };
    }

    // Analyze subscription frequency and suggest optimizations
    const recommendations = [];
    let potentialSavings = 0;

    // Check for overlapping subscriptions
    // Check for frequency optimization
    // Check for bundle opportunities

    return { recommendations, potentialSavings };
  }
}

// Singleton instance
export const smartCart = new SmartCart();

// React hook for cart state
export function useSmartCart() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [analysis, setAnalysis] = React.useState<SmartCartAnalysis | null>(null);

  React.useEffect(() => {
    // Subscribe to cart changes
    const updateCart = () => {
      setItems(smartCart.getItems());
      smartCart.analyze().then(setAnalysis);
    };

    updateCart();

    // Set up event listener for cart changes
    const interval = setInterval(updateCart, 1000); // Poll for changes

    return () => clearInterval(interval);
  }, []);

  return {
    items,
    analysis,
    addItem: (item: Product | Subscription, quantity?: number, recommendationId?: string) => {
      smartCart.addItem(item, quantity, recommendationId);
    },
    removeItem: (itemId: string) => {
      smartCart.removeItem(itemId);
    },
    updateQuantity: (itemId: string, quantity: number) => {
      smartCart.updateQuantity(itemId, quantity);
    },
    clear: () => {
      smartCart.clear();
    },
    getRecommendations: () => smartCart.getSmartRecommendations()
  };
}

export default smartCart;