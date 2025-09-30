import type {
  SafetyLevel,
  SafetyFlag,
  EmergencyProtocol,
  AllergenGuard,
  SessionContext,
  AgentType
} from '@/types/ai-agents';

export class AgentSafetyGuards {
  private emergencyProtocols: EmergencyProtocol[];
  private allergenGuards: Map<string, AllergenGuard>;
  private blockedContent: ContentModerationService;

  constructor() {
    this.emergencyProtocols = this.initializeEmergencyProtocols();
    this.allergenGuards = new Map();
    this.blockedContent = new ContentModerationService();
  }

  async performComprehensiveSafetyCheck(
    input: string,
    agentType: AgentType,
    context: SessionContext
  ): Promise<{
    level: SafetyLevel;
    flags: SafetyFlag[];
    allowResponse: boolean;
    emergencyProtocol?: EmergencyProtocol;
  }> {

    const safetyChecks = await Promise.all([
      this.checkEmergencyTriggers(input, agentType),
      this.checkAllergenWarnings(input, context),
      this.checkMedicalAdviceRestrictions(input, agentType),
      this.checkContentModeration(input),
      this.checkAggressiveContent(input, agentType),
      this.checkInappropriateRequests(input, agentType)
    ]);

    // Aggregate all safety flags
    const allFlags: SafetyFlag[] = safetyChecks.flatMap(check => check.flags || []);

    // Determine overall safety level
    const hasUrgent = allFlags.some(flag => flag.level === 'urgent');
    const hasWarning = allFlags.some(flag => flag.level === 'warning');
    const hasBlocked = allFlags.some(flag => flag.level === 'blocked');

    let overallLevel: SafetyLevel = 'ok';
    if (hasBlocked) overallLevel = 'blocked';
    else if (hasUrgent) overallLevel = 'urgent';
    else if (hasWarning) overallLevel = 'warning';

    // Check for emergency protocols
    const emergencyCheck = safetyChecks.find(check => check.emergencyProtocol);

    return {
      level: overallLevel,
      flags: allFlags,
      allowResponse: overallLevel !== 'blocked',
      emergencyProtocol: emergencyCheck?.emergencyProtocol
    };
  }

  private async checkEmergencyTriggers(
    input: string,
    agentType: AgentType
  ): Promise<{ flags: SafetyFlag[]; emergencyProtocol?: EmergencyProtocol }> {

    const emergencyKeywords = [
      // Immediate life-threatening conditions
      'convulsioni', 'convulsione', 'epilessia', 'attacco epilettico',
      'collasso', 'svenuto', 'non si sveglia', 'privo di sensi',
      'difficoltà respiratoria', 'non respira', 'dispnea', 'respiro affannoso',
      'soffocamento', 'corpo estraneo', 'ha ingoiato',

      // Severe bleeding/trauma
      'sangue molto', 'emorragia', 'ferita profonda', 'trauma',
      'investito', 'caduto dall\'alto', 'frattura esposta',

      // Poisoning/toxicity
      'avvelenamento', 'ha mangiato', 'cioccolato tanto', 'uva', 'uvetta',
      'veleno', 'topicida', 'lumachicida', 'antigelo',

      // Severe pain/distress
      'dolore fortissimo', 'urla dal dolore', 'paralisi', 'non muove',
      'addome gonfio', 'torsione stomaco', 'non urina da giorni',

      // Critical conditions
      'temperatura altissima', 'colpo di calore', 'ipotermia',
      'occhi bianchi', 'gengive bianche', 'shock'
    ];

    const lowerInput = input.toLowerCase();

    // Check for critical emergency keywords
    const emergencyTriggers = emergencyKeywords.filter(keyword =>
      lowerInput.includes(keyword)
    );

    if (emergencyTriggers.length > 0) {
      const protocol = this.emergencyProtocols.find(p =>
        p.triggers.some(trigger => emergencyTriggers.includes(trigger))
      ) || this.emergencyProtocols[0]; // Default to first protocol

      return {
        flags: [{
          level: 'urgent',
          type: 'red_flag',
          message: '🚨 EMERGENZA VETERINARIA RILEVATA',
          action: {
            label: 'Trova pronto soccorso',
            deeplink: 'piucane://vet-search?emergency=true'
          }
        }],
        emergencyProtocol: protocol
      };
    }

    // Check for moderate urgency indicators
    const urgentKeywords = [
      'vomito da ore', 'diarrea con sangue', 'non mangia da giorni',
      'molto letargico', 'comportamento strano da giorni',
      'tremori', 'perdita equilibrio', 'occhi rossi gonfi'
    ];

    const urgentTriggers = urgentKeywords.filter(keyword =>
      lowerInput.includes(keyword)
    );

    if (urgentTriggers.length > 0) {
      return {
        flags: [{
          level: 'warning',
          type: 'red_flag',
          message: '⚠️ Sintomi che richiedono attenzione veterinaria',
          action: {
            label: 'Trova veterinario',
            deeplink: 'piucane://vet-search'
          }
        }]
      };
    }

    return { flags: [] };
  }

  private async checkAllergenWarnings(
    input: string,
    context: SessionContext
  ): Promise<{ flags: SafetyFlag[] }> {

    if (!context.dog?.allergies || context.dog.allergies.length === 0) {
      return { flags: [] };
    }

    const dogAllergies = context.dog.allergies.map(a => a.toLowerCase());
    const lowerInput = input.toLowerCase();

    // Check if input mentions any allergens
    const mentionedAllergens = dogAllergies.filter(allergen =>
      lowerInput.includes(allergen)
    );

    if (mentionedAllergens.length > 0) {
      return {
        flags: [{
          level: 'warning',
          type: 'allergen_warning',
          message: `⚠️ ATTENZIONE: ${context.dog.name} è allergico a: ${mentionedAllergens.join(', ')}`,
          action: {
            label: 'Vedi profilo allergie',
            deeplink: `piucane://dogs/${context.dog.id}/health`
          }
        }]
      };
    }

    return { flags: [] };
  }

  private async checkMedicalAdviceRestrictions(
    input: string,
    agentType: AgentType
  ): Promise<{ flags: SafetyFlag[] }> {

    const medicalAdvicePatterns = [
      // Medication dosage requests
      /quanto.*?(farmaco|medicina|antibiotico|antidolorifico)/i,
      /dose.*?(mg|ml|grammi|compresse)/i,
      /posso dare.*?(aspirina|paracetamolo|ibuprofene)/i,

      // Diagnosis requests
      /cos[ìi].*?(malattia|patologia|sindrome)/i,
      /[èe].*?(tumore|cancro|infezione)/i,
      /diagnostica.*?(problema|disturbo)/i,

      // Treatment prescriptions
      /cosa devo fare per curare/i,
      /che cura.*?(dare|somministrare)/i,
      /ricetta.*?(farmaco|medicina)/i
    ];

    const lowerInput = input.toLowerCase();
    const flags: SafetyFlag[] = [];

    // Check for medication dosage requests
    const medicationPatterns = [
      /dose/i, /dosaggio/i, /quanto.*?(dare|somministrare)/i,
      /mg/, /ml/, /grammi/, /compresse/
    ];

    if (medicationPatterns.some(pattern => pattern.test(input))) {
      flags.push({
        level: 'blocked',
        type: 'medication_blocked',
        message: '❌ Non posso fornire dosi o prescrizioni farmacologiche. Consulta il tuo veterinario.',
        action: {
          label: 'Trova veterinario',
          deeplink: 'piucane://vet-search'
        }
      });
    }

    // Check for diagnosis requests (only for non-vet agents)
    if (agentType !== 'veterinary') {
      const diagnosisPatterns = [
        /cos[ìi].*?(ha|potrebbe avere)/i,
        /[èe].*?(malato|malattia)/i,
        /diagnosi/i
      ];

      if (diagnosisPatterns.some(pattern => pattern.test(input))) {
        flags.push({
          level: 'warning',
          type: 'red_flag',
          message: '⚠️ Per questioni mediche consulta l\'assistente veterinario',
          action: {
            label: 'Vai al vet AI',
            deeplink: 'piucane://ai-assistant?agent=veterinary'
          }
        });
      }
    }

    return { flags };
  }

  private async checkContentModeration(input: string): Promise<{ flags: SafetyFlag[] }> {
    return this.blockedContent.moderateContent(input);
  }

  private async checkAggressiveContent(
    input: string,
    agentType: AgentType
  ): Promise<{ flags: SafetyFlag[] }> {

    if (agentType !== 'trainer') {
      return { flags: [] };
    }

    const aggressionKeywords = [
      'morde bambini', 'ha morso', 'attacca altri cani',
      'ringhia sempre', 'aggressivo con tutti', 'paura di',
      'violento', 'aggressività grave', 'comportamento pericoloso'
    ];

    const lowerInput = input.toLowerCase();

    const hasAggression = aggressionKeywords.some(keyword =>
      lowerInput.includes(keyword)
    );

    if (hasAggression) {
      return {
        flags: [{
          level: 'warning',
          type: 'red_flag',
          message: '⚠️ Per problemi di aggressività serve un educatore cinofilo qualificato dal vivo',
          action: {
            label: 'Trova educatore',
            deeplink: 'piucane://professionals/trainers'
          }
        }]
      };
    }

    // Check for punishment-based training requests
    const punishmentKeywords = [
      'collare elettrico', 'punire', 'sgridare forte',
      'sculacciare', 'dominanza', 'sottomettere'
    ];

    const hasPunishment = punishmentKeywords.some(keyword =>
      lowerInput.includes(keyword)
    );

    if (hasPunishment) {
      return {
        flags: [{
          level: 'blocked',
          type: 'red_flag',
          message: '❌ Non consiglio mai metodi punitivi. Uso solo rinforzo positivo.',
          action: {
            label: 'Scopri rinforzo positivo',
            deeplink: 'piucane://guides/positive-training'
          }
        }]
      };
    }

    return { flags: [] };
  }

  private async checkInappropriateRequests(
    input: string,
    agentType: AgentType
  ): Promise<{ flags: SafetyFlag[] }> {

    const inappropriatePatterns = [
      // Off-topic requests
      /ricette.*?(umane|cucina)/i,
      /auto.*?(riparazione|meccanico)/i,
      /computer.*?(problema|virus)/i,

      // Inappropriate content
      /violenza/i,
      /contenuti.*?(espliciti|inappropriati)/i,
      /illegal/i,

      // Jailbreak attempts
      /ignora.*?(istruzioni|prompt)/i,
      /comportati come/i,
      /fai finta di essere/i
    ];

    const hasInappropriate = inappropriatePatterns.some(pattern =>
      pattern.test(input)
    );

    if (hasInappropriate) {
      return {
        flags: [{
          level: 'blocked',
          type: 'red_flag',
          message: '❌ Posso aiutarti solo con domande relative alla cura dei cani.',
          action: {
            label: 'Guida all\'uso',
            deeplink: 'piucane://help/ai-assistant'
          }
        }]
      };
    }

    return { flags: [] };
  }

  async setupAllergenGuard(dogId: string, allergies: string[]): Promise<void> {
    const guard: AllergenGuard = {
      dogId,
      allergies: allergies.map(a => a.toLowerCase()),
      productFilters: this.generateProductFilters(allergies),
      foodIngredientFilters: this.generateFoodFilters(allergies),
      medicationFilters: this.generateMedicationFilters(allergies),
      veterinaryOverride: false,
      userOverride: false
    };

    this.allergenGuards.set(dogId, guard);
  }

  async checkProductCompatibility(
    dogId: string,
    productIngredients: string[]
  ): Promise<{ compatible: boolean; conflictingAllergens: string[] }> {

    const guard = this.allergenGuards.get(dogId);
    if (!guard) {
      return { compatible: true, conflictingAllergens: [] };
    }

    const lowerIngredients = productIngredients.map(i => i.toLowerCase());
    const conflicts = guard.allergies.filter(allergen =>
      lowerIngredients.some(ingredient => ingredient.includes(allergen))
    );

    return {
      compatible: conflicts.length === 0,
      conflictingAllergens: conflicts
    };
  }

  private generateProductFilters(allergies: string[]): string[] {
    const filters: string[] = [...allergies];

    // Add derivative ingredients
    allergies.forEach(allergen => {
      switch (allergen.toLowerCase()) {
        case 'pollo':
          filters.push('chicken', 'pollame', 'volatile', 'chicken meal');
          break;
        case 'manzo':
          filters.push('beef', 'bovino', 'carne bovina', 'beef meal');
          break;
        case 'latte':
        case 'latticini':
          filters.push('milk', 'dairy', 'formaggio', 'yogurt', 'burro');
          break;
        case 'grano':
          filters.push('wheat', 'frumento', 'glutine', 'gluten');
          break;
        case 'soia':
          filters.push('soy', 'soybean', 'lecitina di soia');
          break;
      }
    });

    return filters;
  }

  private generateFoodFilters(allergies: string[]): string[] {
    return this.generateProductFilters(allergies);
  }

  private generateMedicationFilters(allergies: string[]): string[] {
    // Add medication-specific filters based on known allergens
    const filters: string[] = [];

    allergies.forEach(allergen => {
      switch (allergen.toLowerCase()) {
        case 'penicillina':
          filters.push('penicillin', 'amoxicillin', 'ampicillin');
          break;
        case 'sulfamidici':
          filters.push('sulfamide', 'trimethoprim', 'sulfadiazine');
          break;
      }
    });

    return filters;
  }

  private initializeEmergencyProtocols(): EmergencyProtocol[] {
    return [
      {
        triggers: [
          'convulsioni', 'collasso', 'difficoltà respiratoria', 'dispnea',
          'soffocamento', 'avvelenamento', 'trauma grave', 'paralisi'
        ],
        response: {
          level: 'immediate',
          bannerMessage: '🚨 EMERGENZA VETERINARIA - Contatta immediatamente un pronto soccorso',
          actionLabel: 'Pronto Soccorso 24h',
          actionType: 'vet_search',
          actionData: { emergency: true, availability: '24h' }
        },
        followUp: {
          logEvent: true,
          notifySupport: true,
          createIncident: true
        }
      },
      {
        triggers: [
          'vomito persistente', 'diarrea con sangue', 'dolore forte',
          'non mangia da giorni', 'letargia grave'
        ],
        response: {
          level: 'urgent',
          bannerMessage: '⚠️ Sintomi che richiedono consulto veterinario urgente',
          actionLabel: 'Trova Veterinario',
          actionType: 'vet_search',
          actionData: { emergency: false, availability: 'current' }
        },
        followUp: {
          logEvent: true,
          notifySupport: false,
          createIncident: false
        }
      }
    ];
  }

  async logSafetyEvent(
    sessionId: string,
    agentType: AgentType,
    safetyLevel: SafetyLevel,
    flags: SafetyFlag[],
    input: string,
    context: SessionContext
  ): Promise<void> {

    const safetyEvent = {
      eventId: crypto.randomUUID(),
      sessionId,
      agentType,
      safetyLevel,
      flags: flags.map(flag => ({
        type: flag.type,
        level: flag.level,
        message: flag.message
      })),
      inputHash: this.hashString(input), // Don't log full input for privacy
      dogId: context.dog?.id,
      userId: context.user ? 'user_present' : 'user_absent',
      timestamp: new Date(),
      handled: true
    };

    // Log to console for development
    console.log('Safety Event:', safetyEvent);

    // Send to analytics (non-PII only)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'ai_safety_triggered', {
        agent_type: agentType,
        safety_level: safetyLevel,
        flag_count: flags.length,
        has_emergency: flags.some(f => f.type === 'red_flag' && f.level === 'urgent')
      });
    }

    // Log critical events to monitoring system
    if (safetyLevel === 'urgent' || safetyLevel === 'blocked') {
      await this.notifyMonitoringSystem(safetyEvent);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private async notifyMonitoringSystem(event: any): Promise<void> {
    // In production, this would send to monitoring service
    console.warn('Critical safety event detected:', event);
  }
}

class ContentModerationService {
  async moderateContent(input: string): Promise<{ flags: SafetyFlag[] }> {
    const flags: SafetyFlag[] = [];

    // Check for inappropriate language
    const inappropriateWords = [
      'violenza', 'abuso', 'crudeltà', 'maltrattamento',
      'odio', 'razzismo', 'discriminazione'
    ];

    const lowerInput = input.toLowerCase();
    const foundInappropriate = inappropriateWords.filter(word =>
      lowerInput.includes(word)
    );

    if (foundInappropriate.length > 0) {
      flags.push({
        level: 'blocked',
        type: 'red_flag',
        message: '❌ Contenuto inappropriato rilevato. Manteniamo un ambiente positivo.',
        action: {
          label: 'Linee guida community',
          deeplink: 'piucane://help/community-guidelines'
        }
      });
    }

    // Check for spam-like patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /[A-Z]{20,}/, // All caps long text
      /(.{1,10})\1{5,}/ // Repeated phrases
    ];

    if (spamPatterns.some(pattern => pattern.test(input))) {
      flags.push({
        level: 'warning',
        type: 'red_flag',
        message: '⚠️ Il messaggio sembra spam. Puoi riformulare la domanda?'
      });
    }

    return { flags };
  }
}