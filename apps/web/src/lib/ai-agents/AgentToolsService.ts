import type {
  AgentAction,
  MissionTemplate,
  MissionStep,
  ReminderCreationParams,
  ProductSuggestion,
  VetSearchParams,
  SessionContext
} from '@/types/ai-agents';

export class AgentToolsService {
  private missionService: MissionCreationService;
  private reminderService: ReminderCreationService;
  private productService: ProductSuggestionService;
  private vetSearchService: VetSearchService;
  private noteService: DogNoteService;

  constructor() {
    this.missionService = new MissionCreationService();
    this.reminderService = new ReminderCreationService();
    this.productService = new ProductSuggestionService();
    this.vetSearchService = new VetSearchService();
    this.noteService = new DogNoteService();
  }

  async executeTool(
    toolName: string,
    params: any,
    context: SessionContext
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      switch (toolName) {
        case 'create_mission':
          return await this.createMission(params, context);
        case 'create_reminder':
          return await this.createReminder(params, context);
        case 'suggest_products':
          return await this.suggestProducts(params, context);
        case 'open_vet_search':
          return await this.openVetSearch(params, context);
        case 'save_note':
          return await this.saveNote(params, context);
        case 'open_pdp':
          return await this.openPDP(params, context);
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      console.error(`Tool execution failed for ${toolName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createMission(params: any, context: SessionContext) {
    if (!context.dog) {
      throw new Error('Dog context required for mission creation');
    }

    const missionData = await this.missionService.createMission({
      dogId: context.dog.id,
      type: params.type || 'training',
      category: params.category || 'basic',
      title: params.title,
      description: params.description,
      duration: params.duration || { value: 14, unit: 'days' },
      steps: params.steps || [],
      difficulty: params.difficulty || 'medium',
      targetAudience: {
        dogAges: context.dog.age ? [context.dog.age] : [],
        experienceLevels: context.user?.experienceLevel ? [context.user.experienceLevel] : []
      }
    });

    return {
      success: true,
      result: {
        missionId: missionData.id,
        title: missionData.title,
        url: `/missions/${missionData.id}`
      }
    };
  }

  private async createReminder(params: any, context: SessionContext) {
    if (!context.dog) {
      throw new Error('Dog context required for reminder creation');
    }

    const reminderData: ReminderCreationParams = {
      dogId: context.dog.id,
      type: params.type || 'custom',
      title: params.title || 'Promemoria personalizzato',
      description: params.description,
      startDate: params.startDate || new Date(),
      frequency: params.frequency || 'once',
      notificationChannels: ['push'],
      advanceNotice: params.advanceNotice || 30
    };

    const reminder = await this.reminderService.createReminder(reminderData);

    return {
      success: true,
      result: {
        reminderId: reminder.id,
        title: reminder.title,
        nextDue: reminder.nextDue
      }
    };
  }

  private async suggestProducts(params: any, context: SessionContext) {
    const products = await this.productService.getRecommendations({
      dogId: context.dog?.id,
      category: params.category || 'health',
      allergies: context.dog?.allergies || [],
      dogSize: context.dog?.size,
      ageRange: context.dog?.age,
      maxResults: params.maxResults || 5,
      priceRange: params.priceRange,
      brands: params.brands
    });

    return {
      success: true,
      result: {
        products: products.map(p => ({
          sku: p.sku,
          title: p.title,
          price: p.price,
          url: `/shop/products/${p.sku}`,
          reason: p.reason
        }))
      }
    };
  }

  private async openVetSearch(params: any, context: SessionContext) {
    const searchParams: VetSearchParams = {
      emergency: params.emergency || false,
      location: params.location,
      radius: params.radius || 10,
      specialty: params.specialty || [],
      availability: params.availability || 'current'
    };

    const searchUrl = this.vetSearchService.buildSearchUrl(searchParams);

    return {
      success: true,
      result: {
        searchUrl,
        emergency: searchParams.emergency
      }
    };
  }

  private async saveNote(params: any, context: SessionContext) {
    if (!context.dog) {
      throw new Error('Dog context required for note saving');
    }

    const note = await this.noteService.addNote({
      dogId: context.dog.id,
      content: params.content || params.note,
      category: params.category || 'ai_consultation',
      date: new Date(),
      source: 'ai_agent',
      agentType: params.agentType
    });

    return {
      success: true,
      result: {
        noteId: note.id,
        saved: true
      }
    };
  }

  private async openPDP(params: any, context: SessionContext) {
    const productUrl = `/shop/products/${params.sku}`;

    // Track product view from AI recommendation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'view_item', {
        item_id: params.sku,
        source: 'ai_recommendation',
        dog_id: context.dog?.id
      });
    }

    return {
      success: true,
      result: {
        productUrl,
        sku: params.sku
      }
    };
  }
}

class MissionCreationService {
  async createMission(params: {
    dogId: string;
    type: string;
    category: string;
    title?: string;
    description?: string;
    duration: { value: number; unit: 'days' | 'weeks' | 'months' };
    steps?: any[];
    difficulty: 'easy' | 'medium' | 'hard';
    targetAudience: any;
  }) {
    const missionTemplate = this.getMissionTemplate(params.type, params.category);

    const mission = {
      id: `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dogId: params.dogId,
      templateId: missionTemplate.id,
      title: params.title || missionTemplate.title,
      description: params.description || missionTemplate.description,
      type: params.type,
      category: params.category,
      status: 'active',
      progress: 0,
      totalSteps: missionTemplate.steps.length,
      completedSteps: 0,
      startDate: new Date(),
      estimatedEndDate: this.calculateEndDate(new Date(), params.duration),
      difficulty: params.difficulty,
      steps: missionTemplate.steps.map((step, index) => ({
        ...step,
        id: `step_${index + 1}`,
        completed: false,
        completedAt: null
      })),
      rewards: missionTemplate.rewards,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In real implementation, save to database
    console.log('Creating mission:', mission);

    // Create initial reminders for first steps
    await this.createMissionReminders(mission);

    return mission;
  }

  private getMissionTemplate(type: string, category: string): MissionTemplate {
    const templates: Record<string, MissionTemplate> = {
      'basic_training': {
        id: 'basic_training_001',
        agentType: 'trainer',
        category: 'training',
        title: 'Addestramento Base - Comandi Fondamentali',
        description: 'Impara i comandi base: seduto, resta, vieni, fermo. Perfetto per cani di tutte le età.',
        duration: { value: 14, unit: 'days' },
        steps: [
          {
            id: 'step_1',
            order: 1,
            title: 'Comando "Seduto"',
            description: 'Insegna al cane a sedersi su comando usando il rinforzo positivo.',
            estimatedMinutes: 10,
            materials: ['Bocconcini premio', 'Clicker (opzionale)'],
            prerequisites: [],
            completionCriteria: [
              'Il cane si siede entro 3 secondi dal comando',
              'Ripete correttamente 8 volte su 10'
            ],
            troubleshooting: [
              {
                problem: 'Il cane non si siede',
                solution: 'Aiutalo guidando delicatamente il sedere verso il basso mentre dici "seduto"'
              }
            ],
            reminders: [
              {
                beforeHours: 1,
                message: 'Ricorda di fare la sessione di addestramento "Seduto" tra 1 ora!'
              }
            ]
          },
          {
            id: 'step_2',
            order: 2,
            title: 'Comando "Resta"',
            description: 'Insegna al cane a rimanere in posizione finché non gli dai il permesso di muoversi.',
            estimatedMinutes: 15,
            materials: ['Bocconcini premio', 'Guinzaglio lungo'],
            prerequisites: ['Comando seduto consolidato'],
            completionCriteria: [
              'Resta fermo per almeno 30 secondi',
              'Non si muove fino al comando "ok"'
            ],
            troubleshooting: [
              {
                problem: 'Il cane si alza subito',
                solution: 'Inizia con tempi molto brevi (5 secondi) e aumenta gradualmente'
              }
            ]
          }
        ],
        targetAudience: {
          dogAges: [{ min: 3, max: 24, unit: 'months' }],
          experienceLevels: ['beginner', 'intermediate']
        },
        rewards: {
          xp: 100,
          badges: ['Comando Master'],
          achievements: ['First Steps']
        }
      },

      'grooming_routine': {
        id: 'grooming_routine_001',
        agentType: 'groomer',
        category: 'grooming',
        title: 'Routine Settimanale di Toelettatura',
        description: 'Routine completa per mantenere il mantello sano e bello. Adatta per cani a pelo lungo.',
        duration: { value: 4, unit: 'weeks' },
        steps: [
          {
            id: 'groom_1',
            order: 1,
            title: 'Spazzolatura quotidiana',
            description: 'Spazzola il mantello per rimuovere pelo morto e prevenire nodi.',
            estimatedMinutes: 10,
            materials: ['Spazzola cardatore', 'Pettine a denti larghi'],
            completionCriteria: [
              'Mantello completamente spazzolato',
              'Nessun nodo presente'
            ],
            troubleshooting: [
              {
                problem: 'Il cane non vuole essere spazzolato',
                solution: 'Inizia con sessioni brevi (2-3 minuti) e premia con bocconcini'
              }
            ]
          },
          {
            id: 'groom_2',
            order: 2,
            title: 'Controllo orecchie e unghie',
            description: 'Ispeziona e pulisci orecchie, controlla la lunghezza delle unghie.',
            estimatedMinutes: 15,
            materials: ['Salviette per orecchie', 'Tagliaunghie', 'Bocconcini premio'],
            completionCriteria: [
              'Orecchie pulite e asciutte',
              'Unghie della lunghezza corretta'
            ]
          }
        ],
        targetAudience: {
          dogAges: [{ min: 6, max: 120, unit: 'months' }],
          experienceLevels: ['beginner', 'intermediate', 'expert']
        },
        rewards: {
          xp: 75,
          badges: ['Grooming Pro'],
          achievements: ['Clean & Shiny']
        }
      },

      'health_monitoring': {
        id: 'health_monitoring_001',
        agentType: 'veterinary',
        category: 'health',
        title: 'Monitoraggio Salute Settimanale',
        description: 'Controlli di routine per tenere sotto controllo la salute del tuo cane.',
        duration: { value: 7, unit: 'days' },
        steps: [
          {
            id: 'health_1',
            order: 1,
            title: 'Controllo peso corporeo',
            description: 'Pesa il cane e registra il peso per monitorare cambiamenti.',
            estimatedMinutes: 5,
            materials: ['Bilancia'],
            completionCriteria: [
              'Peso registrato accuratamente',
              'Confronto con peso precedente'
            ]
          },
          {
            id: 'health_2',
            order: 2,
            title: 'Controllo appetito e comportamento',
            description: 'Osserva appetito, energia e comportamento generale.',
            estimatedMinutes: 10,
            materials: [],
            completionCriteria: [
              'Appetito normale registrato',
              'Livello energia normale',
              'Comportamento usuale'
            ]
          }
        ],
        targetAudience: {
          dogAges: [{ min: 1, max: 180, unit: 'months' }],
          experienceLevels: ['beginner', 'intermediate', 'expert']
        },
        rewards: {
          xp: 50,
          badges: ['Health Monitor'],
          achievements: ['Preventive Care']
        }
      }
    };

    const key = `${type}_${category}` in templates ? `${type}_${category}` : type;
    return templates[key] || templates['basic_training'];
  }

  private calculateEndDate(startDate: Date, duration: { value: number; unit: string }): Date {
    const endDate = new Date(startDate);

    switch (duration.unit) {
      case 'days':
        endDate.setDate(endDate.getDate() + duration.value);
        break;
      case 'weeks':
        endDate.setDate(endDate.getDate() + duration.value * 7);
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + duration.value);
        break;
    }

    return endDate;
  }

  private async createMissionReminders(mission: any): Promise<void> {
    // Create reminder for first step
    if (mission.steps.length > 0) {
      const firstStep = mission.steps[0];

      // Daily reminder for mission
      const reminderService = new ReminderCreationService();
      await reminderService.createReminder({
        dogId: mission.dogId,
        type: 'custom',
        title: `Missione: ${mission.title}`,
        description: `Prossimo step: ${firstStep.title}`,
        startDate: new Date(),
        frequency: 'daily',
        notificationChannels: ['push'],
        advanceNotice: 30,
        linkedMissionId: mission.id,
        linkedStepId: firstStep.id
      });
    }
  }
}

class ReminderCreationService {
  async createReminder(params: ReminderCreationParams) {
    const reminder = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dogId: params.dogId,
      type: params.type,
      title: params.title,
      description: params.description,
      startDate: params.startDate,
      frequency: params.frequency,
      customSchedule: params.customSchedule,
      notificationChannels: params.notificationChannels,
      advanceNotice: params.advanceNotice,
      linkedMissionId: params.linkedMissionId,
      linkedStepId: params.linkedStepId,
      isActive: true,
      nextDue: this.calculateNextDue(params.startDate, params.frequency),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In real implementation, save to database and schedule notifications
    console.log('Creating reminder:', reminder);

    return reminder;
  }

  private calculateNextDue(startDate: Date, frequency: string): Date {
    const nextDue = new Date(startDate);

    switch (frequency) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'once':
      default:
        // For one-time reminders, next due is the start date
        return startDate;
    }

    return nextDue;
  }
}

class ProductSuggestionService {
  async getRecommendations(params: {
    dogId?: string;
    category: string;
    allergies: string[];
    dogSize?: string;
    ageRange?: any;
    maxResults: number;
    priceRange?: { min: number; max: number };
    brands?: string[];
  }): Promise<ProductSuggestion[]> {

    // Mock product database
    const allProducts = this.getMockProducts();

    // Filter products based on criteria
    let filteredProducts = allProducts.filter(product => {
      // Category filter
      if (product.category !== params.category) return false;

      // Allergy filter
      if (params.allergies.length > 0) {
        const hasAllergen = params.allergies.some(allergy =>
          !product.compatibleWith.allergies.includes(allergy)
        );
        if (hasAllergen) return false;
      }

      // Size filter
      if (params.dogSize && !product.compatibleWith.dogSizes.includes(params.dogSize)) {
        return false;
      }

      // Age filter
      if (params.ageRange) {
        const ageCompatible = product.compatibleWith.ageRanges.some(range =>
          params.ageRange.value >= range.min && params.ageRange.value <= range.max
        );
        if (!ageCompatible) return false;
      }

      // Price filter
      if (params.priceRange) {
        if (product.price < params.priceRange.min || product.price > params.priceRange.max) {
          return false;
        }
      }

      return true;
    });

    // Sort by relevance score
    filteredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit results
    return filteredProducts.slice(0, params.maxResults);
  }

  private getMockProducts(): ProductSuggestion[] {
    return [
      // Health Products
      {
        sku: 'HEALTH_001',
        title: 'Integratore Omega-3 per Cani',
        description: 'Integratore naturale per mantello lucido e pelle sana',
        price: 24.99,
        currency: 'EUR',
        imageUrl: '/products/omega3.jpg',
        compatibleWith: {
          allergies: ['pollo', 'manzo', 'grano'],
          dogSizes: ['small', 'medium', 'large', 'giant'],
          ageRanges: [{ min: 6, max: 180, unit: 'months' }]
        },
        isCommercial: true,
        affiliateDisclosure: 'Consiglio commerciale PiùCane',
        relevanceScore: 0.9,
        reason: 'Perfetto per la salute della pelle e del mantello',
        category: 'health'
      },
      {
        sku: 'HEALTH_002',
        title: 'Probiotici per Digestione Canina',
        description: 'Supporto naturale per la salute digestiva',
        price: 18.50,
        currency: 'EUR',
        imageUrl: '/products/probiotics.jpg',
        compatibleWith: {
          allergies: ['pollo', 'manzo', 'latticini'],
          dogSizes: ['small', 'medium', 'large', 'giant'],
          ageRanges: [{ min: 3, max: 180, unit: 'months' }]
        },
        isCommercial: true,
        relevanceScore: 0.85,
        reason: 'Ideale per problemi digestivi e stomaco sensibile',
        category: 'health'
      },

      // Training Products
      {
        sku: 'TRAIN_001',
        title: 'Clicker per Addestramento',
        description: 'Clicker professionale per rinforzo positivo',
        price: 8.99,
        currency: 'EUR',
        imageUrl: '/products/clicker.jpg',
        compatibleWith: {
          allergies: [],
          dogSizes: ['small', 'medium', 'large', 'giant'],
          ageRanges: [{ min: 2, max: 180, unit: 'months' }]
        },
        isCommercial: true,
        relevanceScore: 0.95,
        reason: 'Strumento essenziale per addestramento efficace',
        category: 'training'
      },
      {
        sku: 'TRAIN_002',
        title: 'Tappetino da Addestramento Kong',
        description: 'Tappetino interattivo per stimolazione mentale',
        price: 32.00,
        currency: 'EUR',
        imageUrl: '/products/kong-mat.jpg',
        compatibleWith: {
          allergies: [],
          dogSizes: ['medium', 'large'],
          ageRanges: [{ min: 4, max: 120, unit: 'months' }]
        },
        isCommercial: true,
        relevanceScore: 0.88,
        reason: 'Perfetto per arricchimento ambientale e gioco mentale',
        category: 'training'
      },

      // Grooming Products
      {
        sku: 'GROOM_001',
        title: 'Spazzola Cardatore FURminator',
        description: 'Spazzola professionale per sottopelo',
        price: 45.00,
        currency: 'EUR',
        imageUrl: '/products/furminator.jpg',
        compatibleWith: {
          allergies: [],
          dogSizes: ['medium', 'large', 'giant'],
          ageRanges: [{ min: 6, max: 180, unit: 'months' }]
        },
        isCommercial: true,
        relevanceScore: 0.92,
        reason: 'Ideale per cani a doppio mantello e muta stagionale',
        category: 'grooming'
      },
      {
        sku: 'GROOM_002',
        title: 'Shampoo Ipoallergenico Naturale',
        description: 'Shampoo delicato per pelli sensibili',
        price: 16.50,
        currency: 'EUR',
        imageUrl: '/products/shampoo.jpg',
        compatibleWith: {
          allergies: ['profumi', 'parabeni', 'solfati'],
          dogSizes: ['small', 'medium', 'large', 'giant'],
          ageRanges: [{ min: 3, max: 180, unit: 'months' }]
        },
        isCommercial: true,
        relevanceScore: 0.87,
        reason: 'Perfetto per cani con allergie e pelle delicata',
        category: 'grooming'
      }
    ];
  }
}

class VetSearchService {
  buildSearchUrl(params: VetSearchParams): string {
    const baseUrl = '/veterinary/search';
    const queryParams = new URLSearchParams();

    if (params.emergency) {
      queryParams.set('emergency', 'true');
    }

    if (params.location) {
      queryParams.set('lat', params.location.latitude.toString());
      queryParams.set('lng', params.location.longitude.toString());
    }

    if (params.radius) {
      queryParams.set('radius', params.radius.toString());
    }

    if (params.specialty && params.specialty.length > 0) {
      queryParams.set('specialty', params.specialty.join(','));
    }

    if (params.availability) {
      queryParams.set('availability', params.availability);
    }

    const queryString = queryParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
}

class DogNoteService {
  async addNote(params: {
    dogId: string;
    content: string;
    category: string;
    date: Date;
    source: string;
    agentType?: string;
  }) {
    const note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dogId: params.dogId,
      content: params.content,
      category: params.category,
      date: params.date,
      source: params.source,
      agentType: params.agentType,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In real implementation, save to database
    console.log('Saving dog note:', note);

    return note;
  }
}