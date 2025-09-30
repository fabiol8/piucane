// ===============================
// 🚀 JOURNEY ENGINE
// ===============================

import type {
  Journey,
  JourneyEnrollment,
  JourneyTrigger,
  JourneyStep,
  JourneyAction,
  JourneyType,
  UserChannelPreferences,
  SendMessageRequest,
  CommunicationEvent
} from '@/types/communications'
import { MessageOrchestrator } from './MessageOrchestrator'

export class JourneyEngine {
  private orchestrator: MessageOrchestrator
  private enrollments: Map<string, JourneyEnrollment> = new Map()
  private journeys: Map<string, Journey> = new Map()

  constructor(orchestrator: MessageOrchestrator) {
    this.orchestrator = orchestrator
    this.initializePredefinedJourneys()
  }

  // ===============================
  // JOURNEY MANAGEMENT
  // ===============================

  async enrollUser(
    userId: string,
    journeyId: string,
    context: Record<string, any> = {},
    dogId?: string
  ): Promise<string> {

    const journey = await this.getJourney(journeyId)
    if (!journey || !journey.active) {
      throw new Error(`Journey ${journeyId} not found or inactive`)
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.getUserEnrollment(userId, journeyId)
    if (existingEnrollment && existingEnrollment.status === 'active') {

      // Check re-entry policy
      if (!journey.settings.allowReEntry) {
        throw new Error('User already enrolled and re-entry not allowed')
      }

      // Check cooldown period
      if (journey.settings.reEntryCooldownDays) {
        const cooldownEnd = new Date(existingEnrollment.createdAt)
        cooldownEnd.setDate(cooldownEnd.getDate() + journey.settings.reEntryCooldownDays)

        if (new Date() < cooldownEnd) {
          throw new Error('User in cooldown period for re-entry')
        }
      }
    }

    // Create new enrollment
    const enrollment = await this.createEnrollment(userId, journey, context, dogId)

    // Schedule first step
    await this.scheduleNextStep(enrollment, journey)

    return enrollment.enrollmentId
  }

  async processScheduledJourneys(): Promise<void> {
    // This would be called by a cron job/scheduler
    const dueEnrollments = await this.getDueEnrollments()

    for (const enrollment of dueEnrollments) {
      try {
        await this.executeJourneyStep(enrollment)
      } catch (error) {
        console.error(`Failed to execute journey step for enrollment ${enrollment.enrollmentId}:`, error)
        await this.handleJourneyError(enrollment, error)
      }
    }
  }

  async handleUserEvent(event: CommunicationEvent): Promise<void> {
    // Check if this event should trigger any journeys or affect existing enrollments
    const activeEnrollments = await this.getUserActiveEnrollments(event.userId)

    for (const enrollment of activeEnrollments) {
      const journey = await this.getJourney(enrollment.journeyId)
      if (!journey) continue

      // Check exit conditions
      if (await this.shouldExitJourney(enrollment, journey, event)) {
        await this.exitJourney(enrollment, 'event_triggered')
        continue
      }

      // Check conversion events
      if (journey.settings.exitOnConversion && await this.isConversionEvent(event, journey)) {
        await this.exitJourney(enrollment, 'converted')
        continue
      }
    }

    // Check for new journey triggers
    await this.checkEventTriggers(event)
  }

  // ===============================
  // STEP EXECUTION
  // ===============================

  private async executeJourneyStep(enrollment: JourneyEnrollment): Promise<void> {
    const journey = await this.getJourney(enrollment.journeyId)
    if (!journey) {
      await this.exitJourney(enrollment, 'journey_not_found')
      return
    }

    const currentStep = journey.steps.find(step => step.stepId === enrollment.currentStepId)
    if (!currentStep) {
      await this.completeJourney(enrollment)
      return
    }

    // Check step conditions
    if (!(await this.checkStepConditions(currentStep, enrollment))) {
      await this.advanceToNextStep(enrollment, journey)
      return
    }

    // Execute step action
    await this.executeStepAction(currentStep.action, enrollment, journey)

    // Mark step as completed
    enrollment.stepsCompleted.push(currentStep.stepId)

    // Move to next step
    await this.advanceToNextStep(enrollment, journey)
  }

  private async executeStepAction(
    action: JourneyAction,
    enrollment: JourneyEnrollment,
    journey: Journey
  ): Promise<void> {

    switch (action.type) {
      case 'send_message':
        await this.executeSendMessageAction(action, enrollment, journey)
        break

      case 'wait':
        // Wait actions are handled by scheduling
        break

      case 'update_property':
        await this.executeUpdatePropertyAction(action, enrollment)
        break

      case 'add_tag':
        await this.executeAddTagAction(action, enrollment)
        break

      case 'remove_tag':
        await this.executeRemoveTagAction(action, enrollment)
        break

      case 'webhook':
        await this.executeWebhookAction(action, enrollment)
        break

      default:
        console.warn(`Unknown journey action type: ${action.type}`)
    }
  }

  private async executeSendMessageAction(
    action: JourneyAction,
    enrollment: JourneyEnrollment,
    journey: Journey
  ): Promise<void> {

    if (!action.templateId) {
      throw new Error('Template ID required for send_message action')
    }

    // Build message context with enrollment data
    const variables = {
      ...enrollment.enrollmentContext,
      journeyName: journey.name,
      journeyId: journey.journeyId,
      enrollmentId: enrollment.enrollmentId
    }

    // Determine channel based on policy
    let channel = undefined
    if (action.channelPolicy) {
      channel = action.channelPolicy.primary
    }

    const messageRequest: SendMessageRequest = {
      userId: enrollment.userId,
      dogId: enrollment.dogId,
      templateId: action.templateId,
      channel,
      variables,
      priority: 'medium'
    }

    const result = await this.orchestrator.sendMessage(messageRequest)

    // Track message in enrollment
    enrollment.messagesReceived.push(result.messageId)

    // Update enrollment
    await this.updateEnrollment(enrollment)
  }

  // ===============================
  // PREDEFINED JOURNEYS
  // ===============================

  private initializePredefinedJourneys(): void {
    // Initialize all predefined journeys
    this.createOnboardingJourney()
    this.createExtraCaring30DJourney()
    this.createWinback60DJourney()
    this.createWinback90DJourney()
    this.createHealthReminderJourney()
    this.createOrderFollowupJourney()
  }

  private createOnboardingJourney(): void {
    const journey: Journey = {
      journeyId: 'journey_onboarding',
      name: 'Onboarding - Primi 30 giorni',
      description: 'Journey di accoglienza per i nuovi utenti e i loro cani',
      type: 'onboarding',
      active: true,

      trigger: {
        type: 'event',
        eventName: 'user.registered'
      },

      steps: [
        // Giorno 0 - Benvenuto immediato
        {
          stepId: 'welcome',
          name: 'Messaggio di benvenuto',
          order: 1,
          delayMinutes: 5, // 5 minuti dopo registrazione
          action: {
            type: 'send_message',
            templateId: 'template_welcome',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['inbox', 'email'],
              rules: [],
              respectQuietHours: false, // Benvenuto può essere immediato
              respectFrequencyLimits: false,
              maxRetries: 2,
              retryDelayMinutes: [10, 30]
            }
          }
        },

        // Giorno 3 - Completa profilo
        {
          stepId: 'complete_profile',
          name: 'Invito a completare il profilo',
          order: 2,
          delayDays: 3,
          action: {
            type: 'send_message',
            templateId: 'template_profile_reminder',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [60]
            }
          },
          conditions: [
            {
              field: 'profile.completed',
              operator: 'equals',
              value: false,
              action: 'continue'
            }
          ]
        },

        // Giorno 7 - Prima missione
        {
          stepId: 'first_mission',
          name: 'Invito alla prima missione',
          order: 3,
          delayDays: 7,
          action: {
            type: 'send_message',
            templateId: 'template_first_mission',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['inbox', 'email'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [120]
            }
          }
        },

        // Giorno 14 - Guida nutrizionale
        {
          stepId: 'nutrition_guide',
          name: 'Guida nutrizionale personalizzata',
          order: 4,
          delayDays: 14,
          action: {
            type: 'send_message',
            templateId: 'template_nutrition_guide',
            channelPolicy: {
              primary: 'email',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [240]
            }
          }
        },

        // Giorno 21 - Social proof
        {
          stepId: 'social_proof',
          name: 'Condivisione social proof',
          order: 5,
          delayDays: 21,
          action: {
            type: 'send_message',
            templateId: 'template_social_proof',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [180]
            }
          }
        },

        // Giorno 30 - Prima conversione
        {
          stepId: 'first_conversion',
          name: 'Incentivo prima conversione',
          order: 6,
          delayDays: 30,
          action: {
            type: 'send_message',
            templateId: 'template_first_conversion',
            channelPolicy: {
              primary: 'email',
              fallbacks: ['push', 'inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 2,
              retryDelayMinutes: [360, 720]
            }
          },
          conditions: [
            {
              field: 'orders.count',
              operator: 'equals',
              value: 0,
              action: 'continue'
            }
          ]
        }
      ],

      settings: {
        timezone: 'Europe/Rome',
        maxMessagesPerDay: 1,
        respectQuietHours: true,
        exitOnConversion: true,
        exitEvents: ['order.completed', 'subscription.created'],
        allowReEntry: false
      },

      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.journeys.set(journey.journeyId, journey)
  }

  private createExtraCaring30DJourney(): void {
    const journey: Journey = {
      journeyId: 'journey_extracaring_30d',
      name: 'Extra Caring - 30 giorni',
      description: 'Journey di supporto intensivo per i primi 30 giorni con il cane',
      type: 'extracaring30d',
      active: true,

      trigger: {
        type: 'event',
        eventName: 'dog.added'
      },

      steps: [
        // Giorno 1 - Consigli primo giorno
        {
          stepId: 'first_day_tips',
          name: 'Consigli per il primo giorno',
          order: 1,
          delayHours: 2,
          action: {
            type: 'send_message',
            templateId: 'template_first_day_tips',
            channelPolicy: {
              primary: 'inbox',
              fallbacks: ['email'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [60]
            }
          }
        },

        // Giorno 3 - Setup routine
        {
          stepId: 'setup_routine',
          name: 'Setup routine alimentare',
          order: 2,
          delayDays: 3,
          action: {
            type: 'send_message',
            templateId: 'template_setup_routine',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [120]
            }
          }
        },

        // Giorno 7 - Check-in benessere
        {
          stepId: 'wellness_checkin',
          name: 'Check-in benessere settimanale',
          order: 3,
          delayDays: 7,
          action: {
            type: 'send_message',
            templateId: 'template_wellness_checkin',
            channelPolicy: {
              primary: 'email',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [240]
            }
          }
        },

        // Giorno 14 - Socializzazione
        {
          stepId: 'socialization_tips',
          name: 'Consigli per la socializzazione',
          order: 4,
          delayDays: 14,
          action: {
            type: 'send_message',
            templateId: 'template_socialization_tips'
          }
        },

        // Giorno 21 - Addestramento
        {
          stepId: 'training_guide',
          name: 'Guida addestramento base',
          order: 5,
          delayDays: 21,
          action: {
            type: 'send_message',
            templateId: 'template_training_guide'
          }
        },

        // Giorno 30 - Graduation
        {
          stepId: 'graduation',
          name: 'Completamento caring',
          order: 6,
          delayDays: 30,
          action: {
            type: 'send_message',
            templateId: 'template_caring_graduation'
          }
        }
      ],

      settings: {
        timezone: 'Europe/Rome',
        maxMessagesPerDay: 1,
        respectQuietHours: true,
        exitOnConversion: false,
        allowReEntry: true,
        reEntryCooldownDays: 90
      },

      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.journeys.set(journey.journeyId, journey)
  }

  private createWinback60DJourney(): void {
    const journey: Journey = {
      journeyId: 'journey_winback_60d',
      name: 'Winback 60 giorni',
      description: 'Riattivazione utenti inattivi da 60 giorni',
      type: 'winback',
      active: true,

      trigger: {
        type: 'behavior',
        inactivityDays: 60,
        conditions: [
          {
            field: 'last_login',
            operator: 'lte',
            value: '60_days_ago'
          },
          {
            field: 'last_order',
            operator: 'lte',
            value: '60_days_ago'
          }
        ]
      },

      steps: [
        // Primo tentativo - Gentile
        {
          stepId: 'gentle_reminder',
          name: 'Promemoria gentile',
          order: 1,
          delayMinutes: 0,
          action: {
            type: 'send_message',
            templateId: 'template_winback_gentle',
            channelPolicy: {
              primary: 'email',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [480]
            }
          }
        },

        // Secondo tentativo - Push
        {
          stepId: 'push_reminder',
          name: 'Notifica push',
          order: 2,
          delayDays: 7,
          action: {
            type: 'send_message',
            templateId: 'template_winback_push',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: true,
              maxRetries: 1,
              retryDelayMinutes: [240]
            }
          }
        }
      ],

      settings: {
        timezone: 'Europe/Rome',
        maxMessagesPerDay: 1,
        respectQuietHours: true,
        exitOnConversion: true,
        exitEvents: ['user.login', 'order.completed'],
        allowReEntry: true,
        reEntryCooldownDays: 30
      },

      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.journeys.set(journey.journeyId, journey)
  }

  private createWinback90DJourney(): void {
    const journey: Journey = {
      journeyId: 'journey_winback_90d',
      name: 'Winback 90 giorni',
      description: 'Ultimo tentativo per utenti inattivi da 90 giorni',
      type: 'winback',
      active: true,

      trigger: {
        type: 'behavior',
        inactivityDays: 90
      },

      steps: [
        // Offerta speciale
        {
          stepId: 'special_offer',
          name: 'Offerta speciale di rientro',
          order: 1,
          delayMinutes: 0,
          action: {
            type: 'send_message',
            templateId: 'template_winback_offer',
            channelPolicy: {
              primary: 'email',
              fallbacks: ['whatsapp', 'sms', 'inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: false, // Last chance
              maxRetries: 2,
              retryDelayMinutes: [360, 720]
            }
          }
        },

        // Ultimo tentativo
        {
          stepId: 'final_attempt',
          name: 'Ultimo tentativo',
          order: 2,
          delayDays: 14,
          action: {
            type: 'send_message',
            templateId: 'template_winback_final',
            channelPolicy: {
              primary: 'whatsapp',
              fallbacks: ['sms', 'inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: false,
              maxRetries: 1,
              retryDelayMinutes: [480]
            }
          }
        }
      ],

      settings: {
        timezone: 'Europe/Rome',
        maxMessagesPerDay: 1,
        respectQuietHours: true,
        exitOnConversion: true,
        exitEvents: ['user.login', 'order.completed'],
        allowReEntry: false
      },

      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.journeys.set(journey.journeyId, journey)
  }

  private createHealthReminderJourney(): void {
    const journey: Journey = {
      journeyId: 'journey_health_reminder',
      name: 'Promemoria Salute',
      description: 'Promemoria per visite veterinarie e vaccinazioni',
      type: 'transactional',
      active: true,

      trigger: {
        type: 'date',
        dateField: 'dog.next_vaccination_date',
        offsetDays: -7 // 7 giorni prima
      },

      steps: [
        {
          stepId: 'vaccination_reminder',
          name: 'Promemoria vaccinazione',
          order: 1,
          delayMinutes: 0,
          action: {
            type: 'send_message',
            templateId: 'template_vaccination_reminder',
            channelPolicy: {
              primary: 'push',
              fallbacks: ['email', 'inbox'],
              rules: [],
              respectQuietHours: true,
              respectFrequencyLimits: false, // Health is priority
              maxRetries: 2,
              retryDelayMinutes: [120, 360]
            }
          }
        },

        // Follow-up se non ha prenotato
        {
          stepId: 'vaccination_followup',
          name: 'Follow-up vaccinazione',
          order: 2,
          delayDays: 3,
          action: {
            type: 'send_message',
            templateId: 'template_vaccination_followup'
          },
          conditions: [
            {
              field: 'appointments.upcoming',
              operator: 'equals',
              value: 0,
              action: 'continue'
            }
          ]
        }
      ],

      settings: {
        timezone: 'Europe/Rome',
        respectQuietHours: true,
        exitOnConversion: true,
        exitEvents: ['appointment.booked'],
        allowReEntry: true,
        reEntryCooldownDays: 1
      },

      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.journeys.set(journey.journeyId, journey)
  }

  private createOrderFollowupJourney(): void {
    const journey: Journey = {
      journeyId: 'journey_order_followup',
      name: 'Follow-up Ordine',
      description: 'Follow-up post-consegna e riordino',
      type: 'transactional',
      active: true,

      trigger: {
        type: 'event',
        eventName: 'order.delivered'
      },

      steps: [
        // Delivery confirmation
        {
          stepId: 'delivery_confirmation',
          name: 'Conferma consegna',
          order: 1,
          delayHours: 2,
          action: {
            type: 'send_message',
            templateId: 'template_delivery_confirmation'
          }
        },

        // Feedback request
        {
          stepId: 'feedback_request',
          name: 'Richiesta feedback',
          order: 2,
          delayDays: 3,
          action: {
            type: 'send_message',
            templateId: 'template_feedback_request'
          }
        },

        // Reorder reminder
        {
          stepId: 'reorder_reminder',
          name: 'Promemoria riordino',
          order: 3,
          delayDays: 25, // Assumendo prodotti per 30 giorni
          action: {
            type: 'send_message',
            templateId: 'template_reorder_reminder'
          }
        }
      ],

      settings: {
        timezone: 'Europe/Rome',
        respectQuietHours: true,
        exitOnConversion: true,
        exitEvents: ['order.completed'],
        allowReEntry: true
      },

      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.journeys.set(journey.journeyId, journey)
  }

  // ===============================
  // HELPER METHODS
  // ===============================

  private async createEnrollment(
    userId: string,
    journey: Journey,
    context: Record<string, any>,
    dogId?: string
  ): Promise<JourneyEnrollment> {

    const enrollmentId = this.generateEnrollmentId()
    const now = new Date().toISOString()

    const enrollment: JourneyEnrollment = {
      enrollmentId,
      journeyId: journey.journeyId,
      userId,
      dogId: dogId || null,
      status: 'active',
      currentStepId: journey.steps[0]?.stepId || null,
      nextExecutionAt: this.calculateNextExecution(journey.steps[0], journey.settings.timezone),
      stepsCompleted: [],
      messagesReceived: [],
      enrollmentContext: context,
      enrolledAt: now,
      createdAt: now,
      updatedAt: now
    }

    this.enrollments.set(enrollmentId, enrollment)
    return enrollment
  }

  private calculateNextExecution(step: JourneyStep, timezone: string): string {
    const now = new Date()
    const next = new Date(now)

    if (step.delayDays) {
      next.setDate(next.getDate() + step.delayDays)
    }
    if (step.delayHours) {
      next.setHours(next.getHours() + step.delayHours)
    }
    if (step.delayMinutes) {
      next.setMinutes(next.getMinutes() + step.delayMinutes)
    }

    return next.toISOString()
  }

  private async advanceToNextStep(enrollment: JourneyEnrollment, journey: Journey): Promise<void> {
    const currentStepIndex = journey.steps.findIndex(step => step.stepId === enrollment.currentStepId)
    const nextStep = journey.steps[currentStepIndex + 1]

    if (nextStep) {
      enrollment.currentStepId = nextStep.stepId
      enrollment.nextExecutionAt = this.calculateNextExecution(nextStep, journey.settings.timezone)
    } else {
      await this.completeJourney(enrollment)
      return
    }

    enrollment.updatedAt = new Date().toISOString()
    await this.updateEnrollment(enrollment)
  }

  private async completeJourney(enrollment: JourneyEnrollment): Promise<void> {
    enrollment.status = 'completed'
    enrollment.currentStepId = null
    enrollment.nextExecutionAt = null
    enrollment.completedAt = new Date().toISOString()
    enrollment.updatedAt = new Date().toISOString()

    await this.updateEnrollment(enrollment)
  }

  private async exitJourney(enrollment: JourneyEnrollment, reason: string): Promise<void> {
    enrollment.status = 'exited'
    enrollment.currentStepId = null
    enrollment.nextExecutionAt = null
    enrollment.exitedAt = new Date().toISOString()
    enrollment.exitReason = reason
    enrollment.updatedAt = new Date().toISOString()

    await this.updateEnrollment(enrollment)
  }

  private generateEnrollmentId(): string {
    return `enroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ===============================
  // MOCK DATA ACCESS METHODS
  // ===============================

  private async getJourney(journeyId: string): Promise<Journey | null> {
    return this.journeys.get(journeyId) || null
  }

  private async getUserEnrollment(userId: string, journeyId: string): Promise<JourneyEnrollment | null> {
    for (const enrollment of this.enrollments.values()) {
      if (enrollment.userId === userId && enrollment.journeyId === journeyId) {
        return enrollment
      }
    }
    return null
  }

  private async getDueEnrollments(): Promise<JourneyEnrollment[]> {
    const now = new Date()
    const due: JourneyEnrollment[] = []

    for (const enrollment of this.enrollments.values()) {
      if (enrollment.status === 'active' &&
          enrollment.nextExecutionAt &&
          new Date(enrollment.nextExecutionAt) <= now) {
        due.push(enrollment)
      }
    }

    return due
  }

  private async getUserActiveEnrollments(userId: string): Promise<JourneyEnrollment[]> {
    const active: JourneyEnrollment[] = []

    for (const enrollment of this.enrollments.values()) {
      if (enrollment.userId === userId && enrollment.status === 'active') {
        active.push(enrollment)
      }
    }

    return active
  }

  private async updateEnrollment(enrollment: JourneyEnrollment): Promise<void> {
    this.enrollments.set(enrollment.enrollmentId, enrollment)
  }

  private async checkStepConditions(step: JourneyStep, enrollment: JourneyEnrollment): Promise<boolean> {
    if (!step.conditions || step.conditions.length === 0) {
      return true
    }

    // Mock condition checking - in production would query user data
    for (const condition of step.conditions) {
      const result = await this.evaluateCondition(condition, enrollment)
      if (!result) {
        return false
      }
    }

    return true
  }

  private async evaluateCondition(condition: any, enrollment: JourneyEnrollment): Promise<boolean> {
    // Mock condition evaluation - in production would access real user data
    switch (condition.field) {
      case 'profile.completed':
        return Math.random() > 0.3 // 70% have completed profile
      case 'orders.count':
        return Math.random() > 0.6 // 40% have no orders
      case 'appointments.upcoming':
        return Math.random() > 0.8 // 20% have upcoming appointments
      default:
        return true
    }
  }

  private async shouldExitJourney(enrollment: JourneyEnrollment, journey: Journey, event: CommunicationEvent): Promise<boolean> {
    if (!journey.settings.exitEvents) return false

    return journey.settings.exitEvents.includes(event.eventType)
  }

  private async isConversionEvent(event: CommunicationEvent, journey: Journey): Promise<boolean> {
    const conversionEvents = ['order.completed', 'subscription.created', 'appointment.booked']
    return conversionEvents.includes(event.eventType)
  }

  private async checkEventTriggers(event: CommunicationEvent): Promise<void> {
    for (const journey of this.journeys.values()) {
      if (!journey.active) continue

      if (journey.trigger.type === 'event' &&
          journey.trigger.eventName === event.eventType) {

        // Check if user meets criteria for this journey
        const canEnroll = await this.checkJourneyEligibility(event.userId, journey)
        if (canEnroll) {
          await this.enrollUser(event.userId, journey.journeyId, event.eventData, event.dogId)
        }
      }
    }
  }

  private async checkJourneyEligibility(userId: string, journey: Journey): Promise<boolean> {
    // Mock eligibility check - in production would check audience rules
    return true
  }

  private async executeUpdatePropertyAction(action: JourneyAction, enrollment: JourneyEnrollment): Promise<void> {
    // Mock property update
    console.log(`Updating property ${action.propertyName} to ${action.propertyValue} for user ${enrollment.userId}`)
  }

  private async executeAddTagAction(action: JourneyAction, enrollment: JourneyEnrollment): Promise<void> {
    // Mock tag addition
    console.log(`Adding tags ${action.tags?.join(', ')} to user ${enrollment.userId}`)
  }

  private async executeRemoveTagAction(action: JourneyAction, enrollment: JourneyEnrollment): Promise<void> {
    // Mock tag removal
    console.log(`Removing tags ${action.tags?.join(', ')} from user ${enrollment.userId}`)
  }

  private async executeWebhookAction(action: JourneyAction, enrollment: JourneyEnrollment): Promise<void> {
    // Mock webhook call
    console.log(`Calling webhook ${action.webhookUrl} for user ${enrollment.userId}`)
  }

  private async handleJourneyError(enrollment: JourneyEnrollment, error: any): Promise<void> {
    console.error(`Journey error for enrollment ${enrollment.enrollmentId}:`, error)

    // Could implement retry logic, error notifications, etc.
    // For now, just log the error
  }
}