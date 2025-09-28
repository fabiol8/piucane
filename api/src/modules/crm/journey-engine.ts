import {
  CustomerJourney,
  JourneyParticipant,
  JourneyStep,
  JourneyTrigger,
  CustomerProfile,
  CampaignTemplate
} from './types';
import { CustomerSegmentationEngine } from './segmentation';

export class CustomerJourneyEngine {
  private journeys: Map<string, CustomerJourney> = new Map();
  private participants: Map<string, JourneyParticipant[]> = new Map();
  private segmentationEngine: CustomerSegmentationEngine;
  private templates: Map<string, CampaignTemplate> = new Map();

  constructor(segmentationEngine: CustomerSegmentationEngine) {
    this.segmentationEngine = segmentationEngine;
    this.initializeDefaultJourneys();
    this.initializeCampaignTemplates();
  }

  private initializeDefaultJourneys(): void {
    const defaultJourneys = [
      this.createOnboardingJourney(),
      this.createWinbackJourney(),
      this.createRetentionJourney(),
      this.createAbandonedCartJourney(),
      this.createSubscriptionRenewalJourney(),
      this.createHealthReminderJourney(),
      this.createVIPWelcomeJourney(),
      this.createReactivationJourney()
    ];

    defaultJourneys.forEach(journey => {
      this.journeys.set(journey.id, journey);
    });
  }

  private initializeCampaignTemplates(): void {
    const templates = [
      this.createOnboardingTemplate(),
      this.createWinbackTemplate(),
      this.createRetentionTemplate(),
      this.createPromotionTemplate(),
      this.createEducationTemplate(),
      this.createCrossSellTemplate(),
      this.createUpsellTemplate()
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async processUserEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
    userProfile?: CustomerProfile
  ): Promise<void> {
    // Check if this event triggers any journeys
    for (const journey of this.journeys.values()) {
      if (!journey.isActive) continue;

      for (const trigger of journey.triggerConditions) {
        if (await this.evaluateTrigger(trigger, userId, eventType, eventData, userProfile)) {
          await this.enterJourney(journey.id, userId);
        }
      }
    }

    // Process existing participants
    await this.processParticipants();
  }

  private async evaluateTrigger(
    trigger: JourneyTrigger,
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
    userProfile?: CustomerProfile
  ): Promise<boolean> {
    switch (trigger.type) {
      case 'event':
        return this.evaluateEventTrigger(trigger, eventType, eventData);

      case 'segment_entry':
        return userProfile ? this.evaluateSegmentTrigger(trigger, userProfile) : false;

      case 'user_property':
        return userProfile ? this.evaluatePropertyTrigger(trigger, userProfile) : false;

      case 'order':
        return this.evaluateOrderTrigger(trigger, eventType, eventData);

      case 'subscription':
        return this.evaluateSubscriptionTrigger(trigger, eventType, eventData);

      case 'date':
        return this.evaluateDateTrigger(trigger);

      default:
        return false;
    }
  }

  private evaluateEventTrigger(trigger: JourneyTrigger, eventType: string, eventData: Record<string, any>): boolean {
    return trigger.conditions.some(condition => {
      if (condition.field === 'eventType') {
        return condition.value === eventType;
      }
      if (condition.field.startsWith('eventData.')) {
        const dataField = condition.field.replace('eventData.', '');
        return eventData[dataField] === condition.value;
      }
      return false;
    });
  }

  private async evaluateSegmentTrigger(trigger: JourneyTrigger, userProfile: CustomerProfile): Promise<boolean> {
    const segments = await this.segmentationEngine.evaluateCustomerSegments(userProfile);
    return trigger.conditions.some(condition => {
      if (condition.field === 'segmentId') {
        return segments.includes(condition.value);
      }
      return false;
    });
  }

  private evaluatePropertyTrigger(trigger: JourneyTrigger, userProfile: CustomerProfile): boolean {
    return trigger.conditions.some(condition => {
      const fieldValue = this.getNestedValue(userProfile, condition.field);
      return this.compareValues(fieldValue, condition.operator, condition.value);
    });
  }

  private evaluateOrderTrigger(trigger: JourneyTrigger, eventType: string, eventData: Record<string, any>): boolean {
    if (!eventType.includes('order')) return false;

    return trigger.conditions.some(condition => {
      const fieldValue = eventData[condition.field];
      return this.compareValues(fieldValue, condition.operator, condition.value);
    });
  }

  private evaluateSubscriptionTrigger(trigger: JourneyTrigger, eventType: string, eventData: Record<string, any>): boolean {
    if (!eventType.includes('subscription')) return false;

    return trigger.conditions.some(condition => {
      const fieldValue = eventData[condition.field];
      return this.compareValues(fieldValue, condition.operator, condition.value);
    });
  }

  private evaluateDateTrigger(trigger: JourneyTrigger): boolean {
    const now = new Date();
    return trigger.conditions.some(condition => {
      if (condition.field === 'date') {
        const targetDate = new Date(condition.value);
        return now >= targetDate;
      }
      if (condition.field === 'dayOfWeek') {
        return now.getDay() === condition.value;
      }
      if (condition.field === 'timeOfDay') {
        const hours = now.getHours();
        return hours >= condition.value.start && hours <= condition.value.end;
      }
      return false;
    });
  }

  private async enterJourney(journeyId: string, userId: string): Promise<void> {
    const journey = this.journeys.get(journeyId);
    if (!journey) return;

    // Check cooldown period
    const existingParticipants = this.participants.get(journeyId) || [];
    const recentParticipation = existingParticipants.find(p =>
      p.userId === userId &&
      this.isWithinCooldown(p.enteredAt, journey.triggerConditions[0].cooldownHours)
    );

    if (recentParticipation) return;

    // Check max participants
    if (journey.settings.maxParticipants) {
      const activeParticipants = existingParticipants.filter(p => p.status === 'active').length;
      if (activeParticipants >= journey.settings.maxParticipants) return;
    }

    // Create participant
    const participant: JourneyParticipant = {
      journeyId,
      userId,
      enteredAt: new Date(),
      currentStepId: this.getFirstStep(journey).id,
      stepHistory: [],
      status: 'active'
    };

    // Add to participants
    const journeyParticipants = this.participants.get(journeyId) || [];
    journeyParticipants.push(participant);
    this.participants.set(journeyId, journeyParticipants);

    // Update journey stats
    journey.stats.totalEntered++;

    console.log(`User ${userId} entered journey ${journeyId}`);
  }

  private isWithinCooldown(enteredAt: Date, cooldownHours?: number): boolean {
    if (!cooldownHours) return false;

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    return Date.now() - enteredAt.getTime() < cooldownMs;
  }

  private getFirstStep(journey: CustomerJourney): JourneyStep {
    // Find step with no incoming connections
    const stepIds = journey.steps.map(s => s.id);
    const targetSteps = new Set();

    journey.steps.forEach(step => {
      step.connections.forEach(targetId => targetSteps.add(targetId));
    });

    const firstStepId = stepIds.find(id => !targetSteps.has(id));
    return journey.steps.find(s => s.id === firstStepId) || journey.steps[0];
  }

  private async processParticipants(): Promise<void> {
    for (const [journeyId, participants] of this.participants.entries()) {
      const journey = this.journeys.get(journeyId);
      if (!journey) continue;

      for (const participant of participants) {
        if (participant.status !== 'active') continue;

        await this.processParticipantStep(journey, participant);
      }
    }
  }

  private async processParticipantStep(journey: CustomerJourney, participant: JourneyParticipant): Promise<void> {
    const currentStep = journey.steps.find(s => s.id === participant.currentStepId);
    if (!currentStep) return;

    switch (currentStep.type) {
      case 'message':
        await this.processMessageStep(journey, participant, currentStep);
        break;

      case 'wait':
        await this.processWaitStep(journey, participant, currentStep);
        break;

      case 'condition':
        await this.processConditionStep(journey, participant, currentStep);
        break;

      case 'action':
        await this.processActionStep(journey, participant, currentStep);
        break;

      case 'goal':
        await this.processGoalStep(journey, participant, currentStep);
        break;
    }
  }

  private async processMessageStep(journey: CustomerJourney, participant: JourneyParticipant, step: JourneyStep): Promise<void> {
    // Send message via messaging orchestrator
    console.log(`Sending message to user ${participant.userId} in journey ${journey.id}, step ${step.id}`);

    // Mark step as completed and move to next
    this.completeStep(participant, step.id);
    this.moveToNextStep(journey, participant, step);
  }

  private async processWaitStep(journey: CustomerJourney, participant: JourneyParticipant, step: JourneyStep): Promise<void> {
    const waitSettings = step.settings as any; // WaitStepSettings
    const stepEntry = participant.stepHistory.find(h => h.stepId === step.id);

    if (!stepEntry) {
      // Just entered this step
      participant.stepHistory.push({
        stepId: step.id,
        enteredAt: new Date(),
        status: 'completed'
      });
      return;
    }

    // Check if wait period is complete
    const waitMs = this.calculateWaitTime(waitSettings);
    const elapsedMs = Date.now() - stepEntry.enteredAt.getTime();

    if (elapsedMs >= waitMs) {
      this.completeStep(participant, step.id);
      this.moveToNextStep(journey, participant, step);
    }
  }

  private async processConditionStep(journey: CustomerJourney, participant: JourneyParticipant, step: JourneyStep): Promise<void> {
    const conditionSettings = step.settings as any; // ConditionStepSettings

    // Evaluate condition (this would need user profile)
    const conditionMet = true; // TODO: Implement condition evaluation

    const nextStepId = conditionMet ? conditionSettings.trueStepId : conditionSettings.falseStepId;

    this.completeStep(participant, step.id);
    participant.currentStepId = nextStepId;
  }

  private async processActionStep(journey: CustomerJourney, participant: JourneyParticipant, step: JourneyStep): Promise<void> {
    const actionSettings = step.settings as any; // ActionStepSettings

    // Execute action
    console.log(`Executing action ${actionSettings.actionType} for user ${participant.userId}`);

    this.completeStep(participant, step.id);
    this.moveToNextStep(journey, participant, step);
  }

  private async processGoalStep(journey: CustomerJourney, participant: JourneyParticipant, step: JourneyStep): Promise<void> {
    const goalSettings = step.settings as any; // GoalStepSettings

    // Check if goal is achieved
    const goalAchieved = false; // TODO: Implement goal checking

    if (goalAchieved) {
      participant.goalAchieved = true;
      participant.status = 'completed';
      journey.stats.totalCompleted++;
    } else {
      // Check conversion window
      const stepEntry = participant.stepHistory.find(h => h.stepId === step.id);
      if (stepEntry) {
        const daysSinceEntry = (Date.now() - stepEntry.enteredAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceEntry > goalSettings.conversionWindow) {
          participant.status = 'dropped';
          participant.dropReason = 'Goal conversion window exceeded';
          journey.stats.totalDropped++;
        }
      }
    }

    this.completeStep(participant, step.id);
  }

  private completeStep(participant: JourneyParticipant, stepId: string): void {
    const stepEntry = participant.stepHistory.find(h => h.stepId === stepId);
    if (stepEntry && !stepEntry.completedAt) {
      stepEntry.completedAt = new Date();
    }
  }

  private moveToNextStep(journey: CustomerJourney, participant: JourneyParticipant, currentStep: JourneyStep): void {
    if (currentStep.connections.length > 0) {
      participant.currentStepId = currentStep.connections[0];
    } else {
      // No next step, journey completed
      participant.status = 'completed';
      participant.completedAt = new Date();
      journey.stats.totalCompleted++;
    }
  }

  private calculateWaitTime(waitSettings: any): number {
    const { duration, unit } = waitSettings;

    switch (unit) {
      case 'minutes':
        return duration * 60 * 1000;
      case 'hours':
        return duration * 60 * 60 * 1000;
      case 'days':
        return duration * 24 * 60 * 60 * 1000;
      case 'weeks':
        return duration * 7 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private compareValues(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(conditionValue));
      default:
        return false;
    }
  }

  // Default journey definitions
  private createOnboardingJourney(): CustomerJourney {
    return {
      id: 'onboarding_30d',
      name: 'Onboarding 30 giorni',
      description: 'Journey di onboarding per nuovi clienti',
      triggerConditions: [
        {
          type: 'segment_entry',
          conditions: [
            {
              field: 'segmentId',
              operator: 'equals',
              value: 'new_customers'
            }
          ],
          cooldownHours: 24
        }
      ],
      steps: [
        {
          id: 'welcome_message',
          type: 'message',
          name: 'Messaggio di benvenuto',
          settings: {
            templateKey: 'welcome',
            channels: ['email', 'push'],
            personalization: {},
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 3
            }
          },
          position: { x: 100, y: 100 },
          connections: ['wait_24h']
        },
        {
          id: 'wait_24h',
          type: 'wait',
          name: 'Attendi 24 ore',
          settings: {
            duration: 24,
            unit: 'hours'
          },
          position: { x: 100, y: 200 },
          connections: ['profile_completion']
        },
        {
          id: 'profile_completion',
          type: 'message',
          name: 'Completa profilo',
          settings: {
            templateKey: 'complete_profile',
            channels: ['email', 'inapp'],
            personalization: {},
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 2
            }
          },
          position: { x: 100, y: 300 },
          connections: ['first_purchase_goal']
        },
        {
          id: 'first_purchase_goal',
          type: 'goal',
          name: 'Primo acquisto',
          settings: {
            goalType: 'purchase',
            conditions: [
              {
                field: 'totalOrders',
                operator: 'greater_than',
                value: 0
              }
            ],
            conversionWindow: 30
          },
          position: { x: 100, y: 400 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome',
        workingHours: {
          start: '09:00',
          end: '18:00'
        }
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createWinbackJourney(): CustomerJourney {
    return {
      id: 'winback_60d',
      name: 'Winback 60 giorni',
      description: 'Riattivazione clienti inattivi',
      triggerConditions: [
        {
          type: 'segment_entry',
          conditions: [
            {
              field: 'segmentId',
              operator: 'equals',
              value: 'inactive_customers'
            }
          ],
          cooldownHours: 168 // 7 days
        }
      ],
      steps: [
        {
          id: 'winback_email',
          type: 'message',
          name: 'Email di riattivazione',
          settings: {
            templateKey: 'winback_offer',
            channels: ['email'],
            personalization: {
              discountPercentage: 15
            },
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 1
            }
          },
          position: { x: 100, y: 100 },
          connections: ['wait_7d']
        },
        {
          id: 'wait_7d',
          type: 'wait',
          name: 'Attendi 7 giorni',
          settings: {
            duration: 7,
            unit: 'days'
          },
          position: { x: 100, y: 200 },
          connections: ['return_purchase_goal']
        },
        {
          id: 'return_purchase_goal',
          type: 'goal',
          name: 'Acquisto di ritorno',
          settings: {
            goalType: 'purchase',
            conditions: [
              {
                field: 'hasRecentOrder',
                operator: 'equals',
                value: true
              }
            ],
            conversionWindow: 60
          },
          position: { x: 100, y: 300 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome',
        maxParticipants: 1000
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createRetentionJourney(): CustomerJourney {
    return {
      id: 'retention_loyal',
      name: 'Retention clienti fedeli',
      description: 'Mantenimento engagement clienti fedeli',
      triggerConditions: [
        {
          type: 'segment_entry',
          conditions: [
            {
              field: 'segmentId',
              operator: 'equals',
              value: 'loyal_customers'
            }
          ],
          cooldownHours: 720 // 30 days
        }
      ],
      steps: [
        {
          id: 'loyalty_thanks',
          type: 'message',
          name: 'Ringraziamento fedeltà',
          settings: {
            templateKey: 'loyalty_appreciation',
            channels: ['email', 'push'],
            personalization: {},
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 2
            }
          },
          position: { x: 100, y: 100 },
          connections: ['exclusive_offer']
        },
        {
          id: 'exclusive_offer',
          type: 'message',
          name: 'Offerta esclusiva',
          settings: {
            templateKey: 'vip_exclusive_offer',
            channels: ['email', 'whatsapp'],
            personalization: {
              discountPercentage: 20,
              isVIP: true
            },
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 1
            }
          },
          position: { x: 100, y: 200 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome'
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createAbandonedCartJourney(): CustomerJourney {
    return {
      id: 'abandoned_cart',
      name: 'Carrello abbandonato',
      description: 'Recupero carrelli abbandonati',
      triggerConditions: [
        {
          type: 'event',
          conditions: [
            {
              field: 'eventType',
              operator: 'equals',
              value: 'cart_abandoned'
            }
          ],
          cooldownHours: 1
        }
      ],
      steps: [
        {
          id: 'cart_reminder_1h',
          type: 'wait',
          name: 'Attendi 1 ora',
          settings: {
            duration: 1,
            unit: 'hours'
          },
          position: { x: 100, y: 100 },
          connections: ['reminder_email']
        },
        {
          id: 'reminder_email',
          type: 'message',
          name: 'Promemoria carrello',
          settings: {
            templateKey: 'cart_reminder',
            channels: ['email', 'push'],
            personalization: {},
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 1
            }
          },
          position: { x: 100, y: 200 },
          connections: ['purchase_goal']
        },
        {
          id: 'purchase_goal',
          type: 'goal',
          name: 'Completa acquisto',
          settings: {
            goalType: 'purchase',
            conditions: [
              {
                field: 'orderCompleted',
                operator: 'equals',
                value: true
              }
            ],
            conversionWindow: 3
          },
          position: { x: 100, y: 300 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome'
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createSubscriptionRenewalJourney(): CustomerJourney {
    return {
      id: 'subscription_renewal',
      name: 'Rinnovo abbonamento',
      description: 'Gestione rinnovi abbonamento',
      triggerConditions: [
        {
          type: 'subscription',
          conditions: [
            {
              field: 'daysToRenewal',
              operator: 'equals',
              value: 7
            }
          ]
        }
      ],
      steps: [
        {
          id: 'renewal_reminder',
          type: 'message',
          name: 'Promemoria rinnovo',
          settings: {
            templateKey: 'subscription_renewal_reminder',
            channels: ['email', 'push'],
            personalization: {},
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 1
            }
          },
          position: { x: 100, y: 100 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome'
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createHealthReminderJourney(): CustomerJourney {
    return {
      id: 'health_reminders',
      name: 'Promemoria salute',
      description: 'Promemoria per la salute del cane',
      triggerConditions: [
        {
          type: 'date',
          conditions: [
            {
              field: 'healthReminderDue',
              operator: 'equals',
              value: true
            }
          ]
        }
      ],
      steps: [
        {
          id: 'health_reminder',
          type: 'message',
          name: 'Promemoria salute',
          settings: {
            templateKey: 'health_reminder',
            channels: ['push', 'whatsapp', 'email'],
            personalization: {},
            sendingOptions: {
              respectQuietHours: false,
              maxRetries: 2
            }
          },
          position: { x: 100, y: 100 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome'
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createVIPWelcomeJourney(): CustomerJourney {
    return {
      id: 'vip_welcome',
      name: 'Benvenuto VIP',
      description: 'Onboarding per clienti VIP',
      triggerConditions: [
        {
          type: 'segment_entry',
          conditions: [
            {
              field: 'segmentId',
              operator: 'equals',
              value: 'vip_customers'
            }
          ],
          cooldownHours: 24
        }
      ],
      steps: [
        {
          id: 'vip_welcome',
          type: 'message',
          name: 'Benvenuto VIP',
          settings: {
            templateKey: 'vip_welcome',
            channels: ['email', 'whatsapp'],
            personalization: {
              isVIP: true
            },
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 1
            }
          },
          position: { x: 100, y: 100 },
          connections: ['assign_vip_benefits']
        },
        {
          id: 'assign_vip_benefits',
          type: 'action',
          name: 'Assegna benefit VIP',
          settings: {
            actionType: 'add_tag',
            parameters: {
              tag: 'vip_benefits'
            }
          },
          position: { x: 100, y: 200 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome'
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createReactivationJourney(): CustomerJourney {
    return {
      id: 'reactivation_candidates',
      name: 'Riattivazione candidati',
      description: 'Riattivazione ex-clienti con potenziale',
      triggerConditions: [
        {
          type: 'segment_entry',
          conditions: [
            {
              field: 'segmentId',
              operator: 'equals',
              value: 'reactivation_candidates'
            }
          ],
          cooldownHours: 336 // 14 days
        }
      ],
      steps: [
        {
          id: 'comeback_offer',
          type: 'message',
          name: 'Offerta di ritorno',
          settings: {
            templateKey: 'comeback_special_offer',
            channels: ['email', 'whatsapp'],
            personalization: {
              discountPercentage: 25,
              freeShipping: true
            },
            sendingOptions: {
              respectQuietHours: true,
              maxRetries: 2
            }
          },
          position: { x: 100, y: 100 },
          connections: ['wait_14d']
        },
        {
          id: 'wait_14d',
          type: 'wait',
          name: 'Attendi 14 giorni',
          settings: {
            duration: 14,
            unit: 'days'
          },
          position: { x: 100, y: 200 },
          connections: ['reactivation_goal']
        },
        {
          id: 'reactivation_goal',
          type: 'goal',
          name: 'Riattivazione completata',
          settings: {
            goalType: 'purchase',
            conditions: [
              {
                field: 'reactivated',
                operator: 'equals',
                value: true
              }
            ],
            conversionWindow: 30
          },
          position: { x: 100, y: 300 },
          connections: []
        }
      ],
      isActive: true,
      settings: {
        timezone: 'Europe/Rome',
        maxParticipants: 500
      },
      stats: {
        totalEntered: 0,
        totalCompleted: 0,
        totalDropped: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  // Campaign template methods
  private createOnboardingTemplate(): CampaignTemplate {
    return {
      id: 'onboarding_template',
      name: 'Template Onboarding Standard',
      type: 'onboarding',
      description: 'Template per onboarding nuovi clienti in 30 giorni',
      estimatedDuration: 30,
      template: {
        name: 'Onboarding Personalizzato',
        description: 'Journey di onboarding personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['onboarding', 'new-customer', 'engagement'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createWinbackTemplate(): CampaignTemplate {
    return {
      id: 'winback_template',
      name: 'Template Winback',
      type: 'winback',
      description: 'Template per riattivazione clienti inattivi',
      estimatedDuration: 60,
      template: {
        name: 'Winback Personalizzato',
        description: 'Journey di riattivazione personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['winback', 'reactivation', 'retention'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createRetentionTemplate(): CampaignTemplate {
    return {
      id: 'retention_template',
      name: 'Template Retention',
      type: 'retention',
      description: 'Template per mantenimento clienti attivi',
      estimatedDuration: 90,
      template: {
        name: 'Retention Personalizzato',
        description: 'Journey di retention personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['retention', 'loyalty', 'engagement'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createPromotionTemplate(): CampaignTemplate {
    return {
      id: 'promotion_template',
      name: 'Template Promozione',
      type: 'promotion',
      description: 'Template per campagne promozionali',
      estimatedDuration: 14,
      template: {
        name: 'Promozione Personalizzata',
        description: 'Journey promozionale personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['promotion', 'discount', 'sales'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createEducationTemplate(): CampaignTemplate {
    return {
      id: 'education_template',
      name: 'Template Educativo',
      type: 'education',
      description: 'Template per contenuti educativi',
      estimatedDuration: 21,
      template: {
        name: 'Contenuti Educativi',
        description: 'Journey educativo personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['education', 'content', 'value'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createCrossSellTemplate(): CampaignTemplate {
    return {
      id: 'cross_sell_template',
      name: 'Template Cross-sell',
      type: 'cross_sell',
      description: 'Template per vendite incrociate',
      estimatedDuration: 7,
      template: {
        name: 'Cross-sell Personalizzato',
        description: 'Journey di cross-sell personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['cross-sell', 'upsell', 'revenue'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createUpsellTemplate(): CampaignTemplate {
    return {
      id: 'upsell_template',
      name: 'Template Upsell',
      type: 'upsell',
      description: 'Template per vendite superiori',
      estimatedDuration: 7,
      template: {
        name: 'Upsell Personalizzato',
        description: 'Journey di upsell personalizzato',
        triggerConditions: [],
        steps: [],
        isActive: false,
        settings: {
          timezone: 'Europe/Rome'
        },
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        }
      },
      isPublic: true,
      tags: ['upsell', 'premium', 'revenue'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  // Public methods for journey management
  getJourney(id: string): CustomerJourney | undefined {
    return this.journeys.get(id);
  }

  getAllJourneys(): CustomerJourney[] {
    return Array.from(this.journeys.values());
  }

  getActiveJourneys(): CustomerJourney[] {
    return Array.from(this.journeys.values()).filter(j => j.isActive);
  }

  getJourneyParticipants(journeyId: string): JourneyParticipant[] {
    return this.participants.get(journeyId) || [];
  }

  getUserParticipations(userId: string): JourneyParticipant[] {
    const allParticipants: JourneyParticipant[] = [];
    for (const participants of this.participants.values()) {
      allParticipants.push(...participants.filter(p => p.userId === userId));
    }
    return allParticipants;
  }

  getCampaignTemplate(id: string): CampaignTemplate | undefined {
    return this.templates.get(id);
  }

  getAllCampaignTemplates(): CampaignTemplate[] {
    return Array.from(this.templates.values());
  }

  getPublicCampaignTemplates(): CampaignTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.isPublic);
  }

  addJourney(journey: CustomerJourney): void {
    this.journeys.set(journey.id, journey);
  }

  updateJourney(id: string, updates: Partial<CustomerJourney>): boolean {
    const journey = this.journeys.get(id);
    if (!journey) return false;

    const updatedJourney = {
      ...journey,
      ...updates,
      updatedAt: new Date()
    };

    this.journeys.set(id, updatedJourney);
    return true;
  }

  deleteJourney(id: string): boolean {
    this.participants.delete(id);
    return this.journeys.delete(id);
  }

  pauseJourney(id: string): boolean {
    const journey = this.journeys.get(id);
    if (!journey) return false;

    journey.isActive = false;
    journey.updatedAt = new Date();
    return true;
  }

  resumeJourney(id: string): boolean {
    const journey = this.journeys.get(id);
    if (!journey) return false;

    journey.isActive = true;
    journey.updatedAt = new Date();
    return true;
  }
}