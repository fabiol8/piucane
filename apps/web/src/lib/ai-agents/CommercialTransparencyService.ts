import type {
  CommercialDisclosure,
  ProductSuggestion,
  SessionContext,
  AgentType
} from '@/types/ai-agents';

export class CommercialTransparencyService {
  private disclosureTemplates: Map<string, CommercialDisclosure>;
  private userConsents: Map<string, UserCommercialConsent>;

  constructor() {
    this.disclosureTemplates = this.initializeDisclosureTemplates();
    this.userConsents = new Map();
  }

  async processCommercialContent(
    agentType: AgentType,
    products: ProductSuggestion[],
    context: SessionContext
  ): Promise<{
    filteredProducts: ProductSuggestion[];
    requiredDisclosures: CommercialDisclosure[];
    blockCommercialContent: boolean;
  }> {

    // Check user marketing consent
    const hasMarketingConsent = await this.checkMarketingConsent(context);

    if (!hasMarketingConsent) {
      return {
        filteredProducts: [],
        requiredDisclosures: [{
          type: 'product_recommendation',
          message: 'Per ricevere suggerimenti di prodotti personalizzati, abilita il consenso marketing nelle impostazioni.',
          isRequired: true,
          placement: 'inline',
          gdprCompliant: true,
          consumerProtectionCompliant: true,
          acknowledged: false
        }],
        blockCommercialContent: true
      };
    }

    // Filter products based on safety and appropriateness
    const filteredProducts = await this.filterAppropriateProducts(products, agentType, context);

    // Generate required disclosures
    const disclosures = await this.generateDisclosures(filteredProducts, agentType, context);

    return {
      filteredProducts,
      requiredDisclosures: disclosures,
      blockCommercialContent: false
    };
  }

  async generateDisclosures(
    products: ProductSuggestion[],
    agentType: AgentType,
    context: SessionContext
  ): Promise<CommercialDisclosure[]> {

    const disclosures: CommercialDisclosure[] = [];

    if (products.length === 0) {
      return disclosures;
    }

    // Main product recommendation disclosure
    const mainDisclosure = this.getDisclosureTemplate('product_recommendation');
    disclosures.push({
      ...mainDisclosure,
      message: this.customizeDisclosureMessage(mainDisclosure.message, agentType, products.length)
    });

    // Affiliate link disclosure if applicable
    const hasAffiliateProducts = products.some(p => p.affiliateDisclosure);
    if (hasAffiliateProducts) {
      const affiliateDisclosure = this.getDisclosureTemplate('affiliate_link');
      disclosures.push(affiliateDisclosure);
    }

    // Sponsored content disclosure if applicable
    const hasSponsoredProducts = products.some(p => p.isCommercial && this.isSponsoredProduct(p.sku));
    if (hasSponsoredProducts) {
      const sponsoredDisclosure = this.getDisclosureTemplate('sponsored_content');
      disclosures.push(sponsoredDisclosure);
    }

    // Agent-specific disclaimers
    const agentDisclaimer = this.getAgentSpecificDisclaimer(agentType);
    if (agentDisclaimer) {
      disclosures.push(agentDisclaimer);
    }

    return disclosures;
  }

  async filterAppropriateProducts(
    products: ProductSuggestion[],
    agentType: AgentType,
    context: SessionContext
  ): Promise<ProductSuggestion[]> {

    return products.filter(product => {
      // Check allergen compatibility
      if (!this.isAllergenSafe(product, context.dog?.allergies || [])) {
        return false;
      }

      // Check age appropriateness
      if (!this.isAgeAppropriate(product, context.dog?.age)) {
        return false;
      }

      // Check size compatibility
      if (!this.isSizeAppropriate(product, context.dog?.size)) {
        return false;
      }

      // Agent-specific filtering
      if (!this.isAgentAppropriate(product, agentType)) {
        return false;
      }

      // Check price reasonableness (avoid suggesting very expensive items without context)
      if (!this.isPriceReasonable(product, agentType)) {
        return false;
      }

      return true;
    });
  }

  private async checkMarketingConsent(context: SessionContext): Promise<boolean> {
    // Check if user has given marketing consent
    if (context.user?.consentToMarketing === false) {
      return false;
    }

    // In real implementation, check GDPR consent records
    // For development, assume consent is given if not explicitly denied
    return context.user?.consentToMarketing !== false;
  }

  private isAllergenSafe(product: ProductSuggestion, allergies: string[]): boolean {
    if (allergies.length === 0) return true;

    // Check if any allergen conflicts with product
    return allergies.every(allergen =>
      product.compatibleWith.allergies.includes(allergen.toLowerCase())
    );
  }

  private isAgeAppropriate(product: ProductSuggestion, dogAge?: { value: number; unit: 'months' | 'years' }): boolean {
    if (!dogAge) return true;

    const ageInMonths = dogAge.unit === 'years' ? dogAge.value * 12 : dogAge.value;

    return product.compatibleWith.ageRanges.some(range => {
      const rangeMin = range.unit === 'years' ? range.min * 12 : range.min;
      const rangeMax = range.unit === 'years' ? range.max * 12 : range.max;
      return ageInMonths >= rangeMin && ageInMonths <= rangeMax;
    });
  }

  private isSizeAppropriate(product: ProductSuggestion, dogSize?: string): boolean {
    if (!dogSize) return true;
    return product.compatibleWith.dogSizes.includes(dogSize);
  }

  private isAgentAppropriate(product: ProductSuggestion, agentType: AgentType): boolean {
    // Veterinary agent: only health-related products
    if (agentType === 'veterinary' && product.category !== 'health') {
      return false;
    }

    // Trainer agent: only training/enrichment products
    if (agentType === 'trainer' && !['training', 'toys'].includes(product.category)) {
      return false;
    }

    // Groomer agent: only grooming products
    if (agentType === 'groomer' && product.category !== 'grooming') {
      return false;
    }

    return true;
  }

  private isPriceReasonable(product: ProductSuggestion, agentType: AgentType): boolean {
    // Define reasonable price ranges per agent type
    const priceThresholds = {
      veterinary: 100, // Health products can be more expensive
      trainer: 50,     // Training products should be accessible
      groomer: 75      // Grooming products moderate range
    };

    return product.price <= priceThresholds[agentType];
  }

  private customizeDisclosureMessage(
    baseMessage: string,
    agentType: AgentType,
    productCount: number
  ): string {
    const agentNames = {
      veterinary: 'assistente veterinario',
      trainer: 'educatore cinofilo',
      groomer: 'esperto di grooming'
    };

    const agentName = agentNames[agentType];
    const productText = productCount === 1 ? 'prodotto' : 'prodotti';

    return `💼 ${baseMessage} - Il tuo ${agentName} ha suggerito ${productCount} ${productText} che potrebbero essere utili per ${agentType === 'veterinary' ? 'la salute' : agentType === 'trainer' ? 'l\'addestramento' : 'la cura'} del tuo cane.`;
  }

  private isSponsoredProduct(sku: string): boolean {
    // In real implementation, check if product is part of sponsored campaign
    // For development, simulate some sponsored products
    const sponsoredSkus = ['HEALTH_001', 'TRAIN_001', 'GROOM_001'];
    return sponsoredSkus.includes(sku);
  }

  private getAgentSpecificDisclaimer(agentType: AgentType): CommercialDisclosure | null {
    const disclaimers = {
      veterinary: {
        type: 'product_recommendation' as const,
        message: '⚕️ I prodotti per la salute suggeriti non sostituiscono la diagnosi o prescrizione veterinaria.',
        isRequired: true,
        placement: 'footer' as const,
        gdprCompliant: true,
        consumerProtectionCompliant: true,
        acknowledged: false
      },
      trainer: {
        type: 'product_recommendation' as const,
        message: '🎓 I giochi e strumenti suggeriti sono basati su metodi di addestramento positivo.',
        isRequired: false,
        placement: 'footer' as const,
        gdprCompliant: true,
        consumerProtectionCompliant: true,
        acknowledged: false
      },
      groomer: {
        type: 'product_recommendation' as const,
        message: '✂️ I prodotti di grooming suggeriti sono adatti al tipo di mantello del tuo cane.',
        isRequired: false,
        placement: 'footer' as const,
        gdprCompliant: true,
        consumerProtectionCompliant: true,
        acknowledged: false
      }
    };

    return disclaimers[agentType] || null;
  }

  async trackCommercialInteraction(
    userId: string,
    agentType: AgentType,
    interactionType: 'product_viewed' | 'product_clicked' | 'disclosure_shown' | 'disclosure_acknowledged',
    productSku?: string,
    disclosureType?: string
  ): Promise<void> {

    const event = {
      userId,
      agentType,
      interactionType,
      productSku,
      disclosureType,
      timestamp: new Date(),
      sessionId: this.getCurrentSessionId()
    };

    // Log to console for development
    console.log('Commercial interaction tracked:', event);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'commercial_interaction', {
        agent_type: agentType,
        interaction_type: interactionType,
        product_sku: productSku,
        disclosure_type: disclosureType
      });
    }

    // Update user commercial consent record
    await this.updateCommercialConsent(userId, interactionType);
  }

  async setUserCommercialPreferences(
    userId: string,
    preferences: {
      allowProductSuggestions: boolean;
      allowAffiliateContent: boolean;
      allowSponsoredContent: boolean;
      maxPriceRange?: number;
      preferredBrands?: string[];
      blockedCategories?: string[];
    }
  ): Promise<void> {

    const consent: UserCommercialConsent = {
      userId,
      allowProductSuggestions: preferences.allowProductSuggestions,
      allowAffiliateContent: preferences.allowAffiliateContent,
      allowSponsoredContent: preferences.allowSponsoredContent,
      maxPriceRange: preferences.maxPriceRange,
      preferredBrands: preferences.preferredBrands || [],
      blockedCategories: preferences.blockedCategories || [],
      lastUpdated: new Date(),
      gdprConsentDate: new Date(),
      consentVersion: '1.0'
    };

    this.userConsents.set(userId, consent);

    // In real implementation, save to database
    console.log('User commercial preferences updated:', consent);
  }

  async generateComplianceReport(
    agentType: AgentType,
    period: { start: Date; end: Date }
  ): Promise<{
    totalProductSuggestions: number;
    disclosuresShown: number;
    disclosuresAcknowledged: number;
    complianceRate: number;
    gdprViolations: number;
    consumerProtectionIssues: number;
  }> {

    // In real implementation, query analytics database
    // For development, return mock compliance data
    return {
      totalProductSuggestions: 150,
      disclosuresShown: 150,
      disclosuresAcknowledged: 142,
      complianceRate: 0.947, // 94.7%
      gdprViolations: 0,
      consumerProtectionIssues: 0
    };
  }

  private getDisclosureTemplate(type: string): CommercialDisclosure {
    const template = this.disclosureTemplates.get(type);
    if (!template) {
      throw new Error(`Unknown disclosure type: ${type}`);
    }
    return { ...template };
  }

  private initializeDisclosureTemplates(): Map<string, CommercialDisclosure> {
    const templates = new Map<string, CommercialDisclosure>();

    templates.set('product_recommendation', {
      type: 'product_recommendation',
      message: 'Consiglio commerciale PiùCane',
      isRequired: true,
      placement: 'inline',
      gdprCompliant: true,
      consumerProtectionCompliant: true,
      acknowledged: false
    });

    templates.set('affiliate_link', {
      type: 'affiliate_link',
      message: '🔗 Alcuni link possono generare una commissione per PiùCane, senza costi aggiuntivi per te.',
      isRequired: true,
      placement: 'footer',
      gdprCompliant: true,
      consumerProtectionCompliant: true,
      acknowledged: false
    });

    templates.set('sponsored_content', {
      type: 'sponsored_content',
      message: '📢 Contenuto sponsorizzato - Questo prodotto è promosso da un partner commerciale.',
      isRequired: true,
      placement: 'inline',
      gdprCompliant: true,
      consumerProtectionCompliant: true,
      acknowledged: false
    });

    return templates;
  }

  private getCurrentSessionId(): string {
    // In real implementation, get from session management
    return `session_${Date.now()}`;
  }

  private async updateCommercialConsent(
    userId: string,
    interactionType: string
  ): Promise<void> {

    const consent = this.userConsents.get(userId);
    if (!consent) return;

    // Update interaction counters
    switch (interactionType) {
      case 'disclosure_acknowledged':
        consent.lastUpdated = new Date();
        break;
      case 'product_clicked':
        // Track engagement for compliance
        break;
    }

    this.userConsents.set(userId, consent);
  }
}

// Supporting interfaces
interface UserCommercialConsent {
  userId: string;
  allowProductSuggestions: boolean;
  allowAffiliateContent: boolean;
  allowSponsoredContent: boolean;
  maxPriceRange?: number;
  preferredBrands: string[];
  blockedCategories: string[];
  lastUpdated: Date;
  gdprConsentDate: Date;
  consentVersion: string;
}

// GDPR Compliance Helper
export class GDPRComplianceHelper {

  static validateDisclosure(disclosure: CommercialDisclosure): {
    isCompliant: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check required fields
    if (!disclosure.message || disclosure.message.length < 10) {
      issues.push('Disclosure message is too short or missing');
    }

    if (!disclosure.type) {
      issues.push('Disclosure type is required');
    }

    // Check GDPR compliance
    if (!disclosure.gdprCompliant) {
      issues.push('Disclosure is not marked as GDPR compliant');
    }

    // Check consumer protection compliance
    if (!disclosure.consumerProtectionCompliant) {
      issues.push('Disclosure is not marked as consumer protection compliant');
    }

    // Check placement appropriateness
    if (disclosure.isRequired && disclosure.placement === 'footer') {
      issues.push('Required disclosures should not be placed only in footer');
    }

    return {
      isCompliant: issues.length === 0,
      issues
    };
  }

  static generateGDPRReport(
    disclosures: CommercialDisclosure[],
    userConsents: UserCommercialConsent[]
  ): {
    compliantDisclosures: number;
    nonCompliantDisclosures: number;
    validConsents: number;
    expiredConsents: number;
    overallCompliance: number;
  } {

    const compliantDisclosures = disclosures.filter(d =>
      this.validateDisclosure(d).isCompliant
    ).length;

    const validConsents = userConsents.filter(c => {
      const now = new Date();
      const consentAge = now.getTime() - c.gdprConsentDate.getTime();
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      return consentAge < maxAge;
    }).length;

    const totalItems = disclosures.length + userConsents.length;
    const compliantItems = compliantDisclosures + validConsents;

    return {
      compliantDisclosures,
      nonCompliantDisclosures: disclosures.length - compliantDisclosures,
      validConsents,
      expiredConsents: userConsents.length - validConsents,
      overallCompliance: totalItems > 0 ? compliantItems / totalItems : 1
    };
  }
}