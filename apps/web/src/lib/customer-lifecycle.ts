/**
 * Customer Lifecycle Management System - PiùCane
 * Sistema completo per la gestione del ciclo di vita del cliente post-acquisto
 */

import { trackCTA } from '@/analytics/ga4';

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  registrationDate: string;
  lastOrderDate?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  preferredChannel: 'email' | 'push' | 'whatsapp' | 'sms';
  timezone: string;
  dogs: Array<{
    id: string;
    name: string;
    breed: string;
    birthdate: string;
    weight: number;
  }>;
  preferences: {
    communicationFrequency: 'high' | 'medium' | 'low';
    productCategories: string[];
    marketingConsent: boolean;
    pushNotifications: boolean;
    emailNotifications: boolean;
    whatsappNotifications: boolean;
  };
  loyaltyLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
}

export interface JourneyTrigger {
  id: string;
  type: 'order_placed' | 'product_delivered' | 'days_since_order' | 'no_reorder' | 'subscription_pause' | 'cart_abandonment';
  conditions: {
    daysAfter?: number;
    orderValue?: number;
    productCategories?: string[];
    customerSegment?: string[];
  };
  enabled: boolean;
}

export interface CommunicationMessage {
  id: string;
  triggerId: string;
  type: 'email' | 'push' | 'whatsapp' | 'sms' | 'inbox';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  content: string;
  cta: {
    text: string;
    url: string;
    action: string;
  };
  personalizations: {
    [key: string]: string;
  };
  scheduledFor: string;
  sentAt?: string;
  opened?: boolean;
  clicked?: boolean;
  converted?: boolean;
}

export interface JourneyStep {
  id: string;
  name: string;
  description: string;
  trigger: JourneyTrigger;
  messages: CommunicationMessage[];
  missions?: Array<{
    id: string;
    title: string;
    description: string;
    points: number;
    type: 'review_product' | 'share_photo' | 'complete_profile' | 'refer_friend';
  }>;
  rewards?: Array<{
    id: string;
    type: 'discount' | 'points' | 'badge' | 'free_product';
    value: number;
    description: string;
  }>;
  nextSteps?: string[];
}

export interface CustomerJourney {
  customerId: string;
  journeyId: string;
  name: string;
  description: string;
  steps: JourneyStep[];
  currentStep: number;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  metadata: {
    orderId?: string;
    productIds?: string[];
    dogIds?: string[];
  };
}

class CustomerLifecycleManager {
  private journeys: Map<string, CustomerJourney> = new Map();
  private triggers: Map<string, JourneyTrigger> = new Map();

  constructor() {
    this.initializeDefaultTriggers();
    this.initializeDefaultJourneys();
  }

  private initializeDefaultTriggers() {
    const defaultTriggers: JourneyTrigger[] = [
      {
        id: 'order_confirmed',
        type: 'order_placed',
        conditions: {},
        enabled: true
      },
      {
        id: 'product_delivered',
        type: 'product_delivered',
        conditions: {},
        enabled: true
      },
      {
        id: 'day_3_post_order',
        type: 'days_since_order',
        conditions: { daysAfter: 3 },
        enabled: true
      },
      {
        id: 'day_7_post_order',
        type: 'days_since_order',
        conditions: { daysAfter: 7 },
        enabled: true
      },
      {
        id: 'day_14_post_order',
        type: 'days_since_order',
        conditions: { daysAfter: 14 },
        enabled: true
      },
      {
        id: 'day_30_post_order',
        type: 'days_since_order',
        conditions: { daysAfter: 30 },
        enabled: true
      },
      {
        id: 'no_reorder_35_days',
        type: 'no_reorder',
        conditions: { daysAfter: 35 },
        enabled: true
      },
      {
        id: 'no_reorder_45_days',
        type: 'no_reorder',
        conditions: { daysAfter: 45 },
        enabled: true
      }
    ];

    defaultTriggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger);
    });
  }

  private initializeDefaultJourneys() {
    // Journey template per post-acquisto 0-30 giorni
    const postPurchaseJourney: Omit<CustomerJourney, 'customerId' | 'journeyId' | 'startedAt' | 'status' | 'currentStep'> = {
      name: 'Post-Purchase Journey (0-30 giorni)',
      description: 'Sequenza automatizzata di comunicazioni e attività post-acquisto',
      steps: [
        {
          id: 'order_confirmation',
          name: 'Conferma Ordine',
          description: 'Messaggio immediato di conferma ordine con timeline',
          trigger: this.triggers.get('order_confirmed')!,
          messages: [
            {
              id: 'confirm_email',
              triggerId: 'order_confirmed',
              type: 'email',
              priority: 'high',
              subject: 'Ordine confermato! 🎉 Il benessere di {{dog_name}} è in arrivo',
              content: `
                Ciao {{customer_name}},

                Il tuo ordine #{{order_number}} è stato confermato!
                {{dog_name}} riceverà presto i suoi prodotti premium.

                📦 Cosa succede ora:
                • Preparazione ordine: 1-2 giorni
                • Spedizione: 2-3 giorni
                • Consegna stimata: {{delivery_date}}

                💡 Tip: Prepara {{dog_name}} introducendo gradualmente il nuovo cibo

                Traccia il tuo ordine: {{tracking_url}}
              `,
              cta: {
                text: 'Traccia Ordine',
                url: '/orders/{{order_id}}',
                action: 'track_order'
              },
              personalizations: {},
              scheduledFor: new Date().toISOString()
            },
            {
              id: 'confirm_push',
              triggerId: 'order_confirmed',
              type: 'push',
              priority: 'medium',
              subject: 'Ordine confermato per {{dog_name}}! 🐕',
              content: 'Il tuo ordine #{{order_number}} è in preparazione. Traccia la spedizione direttamente dall\'app.',
              cta: {
                text: 'Vedi Dettagli',
                url: '/orders/{{order_id}}',
                action: 'view_order'
              },
              personalizations: {},
              scheduledFor: new Date().toISOString()
            },
            {
              id: 'confirm_inbox',
              triggerId: 'order_confirmed',
              type: 'inbox',
              priority: 'medium',
              subject: 'Benvenuto nella famiglia PiùCane! 🏆',
              content: 'Hai sbloccato il badge "Primo Ordine"! Continua a guadagnare punti e sbloccare ricompense esclusive.',
              cta: {
                text: 'Vedi Badge',
                url: '/profile/achievements',
                action: 'view_achievements'
              },
              personalizations: {},
              scheduledFor: new Date().toISOString()
            }
          ],
          missions: [
            {
              id: 'first_order_badge',
              title: 'Primo Ordine Completato!',
              description: 'Hai effettuato il tuo primo ordine su PiùCane',
              points: 100,
              type: 'complete_profile'
            }
          ],
          rewards: [
            {
              id: 'welcome_points',
              type: 'points',
              value: 100,
              description: 'Punti di benvenuto per il primo ordine'
            },
            {
              id: 'first_order_badge',
              type: 'badge',
              value: 1,
              description: 'Badge "Primo Cliente PiùCane"'
            }
          ]
        },
        {
          id: 'day_3_mission',
          name: 'Giorno 3 - Missione Prodotto',
          description: 'Missione collegata al prodotto acquistato',
          trigger: this.triggers.get('day_3_post_order')!,
          messages: [
            {
              id: 'day3_email',
              triggerId: 'day_3_post_order',
              type: 'email',
              priority: 'medium',
              subject: '🎯 Missione speciale per {{dog_name}}!',
              content: `
                Ciao {{customer_name}},

                Come va con {{product_name}}?
                {{dog_name}} si sta già abituando al nuovo sapore?

                🎯 MISSIONE SPECIALE:
                "Scatta una foto di {{dog_name}} mentre mangia"
                Reward: +50 punti fedeltà

                💡 Suggerimento: La transizione alimentare dovrebbe essere graduale.
                Mescola il nuovo cibo con quello precedente per i primi giorni.

                Hai domande? Il nostro team veterinario è qui per aiutarti!
              `,
              cta: {
                text: 'Completa Missione',
                url: '/missions/photo-feeding',
                action: 'complete_mission'
              },
              personalizations: {},
              scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          missions: [
            {
              id: 'photo_feeding',
              title: 'Prima foto durante il pasto',
              description: 'Scatta una foto di {{dog_name}} mentre gusta i nuovi prodotti',
              points: 50,
              type: 'share_photo'
            }
          ]
        },
        {
          id: 'day_7_snack_followup',
          name: 'Giorno 7 - Follow-up Snack',
          description: 'Controllo sull\'esperienza con snack omaggio',
          trigger: this.triggers.get('day_7_post_order')!,
          messages: [
            {
              id: 'day7_email',
              triggerId: 'day_7_post_order',
              type: 'whatsapp',
              priority: 'medium',
              subject: 'Come va con lo snack omaggio? 🦴',
              content: `
                Ciao {{customer_name}}! 👋

                È passata una settimana dal tuo ordine.
                {{dog_name}} ha provato lo snack omaggio?

                📝 Raccontaci com'è andata:
                • Gli è piaciuto?
                • Ha avuto effetti positivi sui denti?
                • Lo consiglieresti ad altri proprietari?

                ⭐ Lascia una recensione e guadagna 75 punti!
              `,
              cta: {
                text: 'Lascia Recensione',
                url: '/products/{{product_id}}/review',
                action: 'write_review'
              },
              personalizations: {},
              scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          missions: [
            {
              id: 'first_review',
              title: 'Prima Recensione',
              description: 'Condividi la tua esperienza con altri proprietari',
              points: 75,
              type: 'review_product'
            }
          ]
        },
        {
          id: 'day_14_health_reminder',
          name: 'Giorno 14 - Reminder Salute',
          description: 'Promemoria per controlli di salute',
          trigger: this.triggers.get('day_14_post_order')!,
          messages: [
            {
              id: 'day14_push',
              triggerId: 'day_14_post_order',
              type: 'push',
              priority: 'medium',
              subject: '⚕️ Promemoria salute per {{dog_name}}',
              content: 'È il momento perfetto per controllare peso e vaccinazioni. Tieni traccia della salute di {{dog_name}} nella sua scheda.',
              cta: {
                text: 'Aggiorna Scheda',
                url: '/dogs/{{dog_id}}/health',
                action: 'update_health'
              },
              personalizations: {},
              scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          missions: [
            {
              id: 'health_checkup',
              title: 'Controllo Salute',
              description: 'Aggiorna peso e informazioni di salute di {{dog_name}}',
              points: 25,
              type: 'complete_profile'
            }
          ]
        },
        {
          id: 'day_30_loyalty_offer',
          name: 'Giorno 30 - Offerta Fedeltà',
          description: 'Sconto fedeltà o suggerimento abbonamento',
          trigger: this.triggers.get('day_30_post_order')!,
          messages: [
            {
              id: 'day30_email',
              triggerId: 'day_30_post_order',
              type: 'email',
              priority: 'high',
              subject: '🎁 Un mese insieme: il tuo regalo fedeltà!',
              content: `
                Caro {{customer_name}},

                È passato un mese dal tuo primo ordine! 🎉
                {{dog_name}} sta bene con i nostri prodotti?

                🎁 Come ringraziamento, ecco il tuo regalo:
                • 15% di sconto sul prossimo ordine
                • O passa a un abbonamento e risparmia il 20% sempre

                📊 Il tuo bilancio del mese:
                • Punti guadagnati: {{total_points}}
                • Badge sbloccati: {{badges_count}}
                • Livello fedeltà: {{loyalty_level}}

                Continua così! {{dog_name}} ti ringrazia! 🐕❤️
              `,
              cta: {
                text: 'Riordina con Sconto',
                url: '/shop?discount=LOYALTY15',
                action: 'reorder_discount'
              },
              personalizations: {},
              scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          rewards: [
            {
              id: 'loyalty_discount',
              type: 'discount',
              value: 15,
              description: 'Sconto fedeltà 15% per il mese di prova'
            }
          ]
        }
      ],
      metadata: {}
    };

    // Salva il template journey
    this.journeys.set('post_purchase_template', {
      ...postPurchaseJourney,
      customerId: 'template',
      journeyId: 'post_purchase_template',
      currentStep: 0,
      startedAt: new Date().toISOString(),
      status: 'active'
    });
  }

  // Inizia journey per un cliente dopo l'acquisto
  async startPostPurchaseJourney(
    customer: Customer,
    orderId: string,
    productIds: string[],
    dogIds: string[]
  ): Promise<CustomerJourney> {
    const journeyId = `post_purchase_${customer.id}_${orderId}`;
    const template = this.journeys.get('post_purchase_template')!;

    const customerJourney: CustomerJourney = {
      ...template,
      customerId: customer.id,
      journeyId,
      startedAt: new Date().toISOString(),
      status: 'active',
      currentStep: 0,
      metadata: {
        orderId,
        productIds,
        dogIds
      }
    };

    // Personalizza messaggi con dati del cliente
    customerJourney.steps = customerJourney.steps.map(step => ({
      ...step,
      messages: step.messages.map(message => ({
        ...message,
        personalizations: {
          customer_name: customer.firstName,
          dog_name: customer.dogs[0]?.name || 'il tuo cane',
          order_number: orderId,
          order_id: orderId,
          dog_id: customer.dogs[0]?.id || '',
          loyalty_level: customer.loyaltyLevel,
          ...message.personalizations
        }
      }))
    }));

    this.journeys.set(journeyId, customerJourney);

    // Inizia con il primo step
    await this.executeJourneyStep(customerJourney, 0);

    trackCTA({
      ctaId: 'lifecycle.journey.started',
      event: 'customer_journey_started',
      value: 'post_purchase',
      metadata: {
        customerId: customer.id,
        journeyId,
        orderId
      }
    });

    return customerJourney;
  }

  // Esegue uno step specifico del journey
  private async executeJourneyStep(journey: CustomerJourney, stepIndex: number): Promise<void> {
    if (stepIndex >= journey.steps.length) {
      journey.status = 'completed';
      journey.completedAt = new Date().toISOString();
      return;
    }

    const step = journey.steps[stepIndex];
    journey.currentStep = stepIndex;

    // Invia messaggi
    for (const message of step.messages) {
      await this.sendMessage(message, journey.customerId);
    }

    // Assegna missioni
    if (step.missions) {
      for (const mission of step.missions) {
        await this.assignMission(mission, journey.customerId);
      }
    }

    // Assegna ricompense
    if (step.rewards) {
      for (const reward of step.rewards) {
        await this.grantReward(reward, journey.customerId);
      }
    }

    trackCTA({
      ctaId: 'lifecycle.step.executed',
      event: 'journey_step_executed',
      value: step.id,
      metadata: {
        customerId: journey.customerId,
        journeyId: journey.journeyId,
        stepIndex,
        stepId: step.id
      }
    });
  }

  // Invia messaggio su canale specifico
  private async sendMessage(message: CommunicationMessage, customerId: string): Promise<void> {
    // Personalizza contenuto
    let personalizedContent = message.content;
    let personalizedSubject = message.subject;

    Object.entries(message.personalizations).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      personalizedContent = personalizedContent.replace(new RegExp(placeholder, 'g'), value);
      personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), value);
    });

    // Simula invio basato sul tipo di messaggio
    switch (message.type) {
      case 'email':
        await this.sendEmail(customerId, personalizedSubject, personalizedContent, message.cta);
        break;
      case 'push':
        await this.sendPushNotification(customerId, personalizedSubject, personalizedContent, message.cta);
        break;
      case 'whatsapp':
        await this.sendWhatsAppMessage(customerId, personalizedContent, message.cta);
        break;
      case 'inbox':
        await this.sendInboxMessage(customerId, personalizedSubject, personalizedContent, message.cta);
        break;
    }

    // Aggiorna stato messaggio
    message.sentAt = new Date().toISOString();

    trackCTA({
      ctaId: 'lifecycle.message.sent',
      event: 'journey_message_sent',
      value: message.type,
      metadata: {
        customerId,
        messageId: message.id,
        messageType: message.type
      }
    });
  }

  private async sendEmail(customerId: string, subject: string, content: string, cta: any): Promise<void> {
    console.log(`📧 Email inviata a ${customerId}:`, { subject, content, cta });
    // Integrazione con servizio email (SendGrid, Mailgun, etc.)
  }

  private async sendPushNotification(customerId: string, title: string, body: string, cta: any): Promise<void> {
    console.log(`🔔 Push notification inviata a ${customerId}:`, { title, body, cta });
    // Integrazione con servizio push (Firebase, OneSignal, etc.)
  }

  private async sendWhatsAppMessage(customerId: string, content: string, cta: any): Promise<void> {
    console.log(`📱 WhatsApp inviato a ${customerId}:`, { content, cta });
    // Integrazione con WhatsApp Business API
  }

  private async sendInboxMessage(customerId: string, subject: string, content: string, cta: any): Promise<void> {
    console.log(`📥 Messaggio inbox per ${customerId}:`, { subject, content, cta });
    // Salva messaggio nella inbox del cliente
  }

  private async assignMission(mission: any, customerId: string): Promise<void> {
    console.log(`🎯 Missione assegnata a ${customerId}:`, mission);
    // Integrazione con sistema missioni
  }

  private async grantReward(reward: any, customerId: string): Promise<void> {
    console.log(`🎁 Ricompensa assegnata a ${customerId}:`, reward);
    // Integrazione con sistema loyalty
  }

  // Processa trigger temporali (da chiamare con cron job)
  async processDailyTriggers(): Promise<void> {
    const today = new Date();

    // Processa tutti i journey attivi
    for (const [journeyId, journey] of this.journeys) {
      if (journey.status !== 'active') continue;

      const currentStep = journey.steps[journey.currentStep];
      if (!currentStep) continue;

      // Controlla se è il momento di eseguire il prossimo step
      const scheduledDate = new Date(currentStep.messages[0]?.scheduledFor || 0);
      if (scheduledDate <= today) {
        await this.executeJourneyStep(journey, journey.currentStep + 1);
      }
    }
  }

  // Inizia journey di winback per clienti inattivi
  async startWinbackJourney(customer: Customer, daysSinceLastOrder: number): Promise<CustomerJourney> {
    const journeyId = `winback_${customer.id}_${Date.now()}`;

    const winbackJourney: CustomerJourney = {
      customerId: customer.id,
      journeyId,
      name: 'Winback Journey',
      description: 'Riattivazione clienti inattivi',
      steps: [
        {
          id: 'winback_reminder',
          name: 'Reminder Riordino',
          description: `Reminder dopo ${daysSinceLastOrder} giorni`,
          trigger: this.triggers.get('no_reorder_35_days')!,
          messages: [
            {
              id: 'winback_email',
              triggerId: 'no_reorder_35_days',
              type: 'email',
              priority: 'high',
              subject: '🍽️ La ciotola di {{dog_name}} è vuota?',
              content: `
                Ciao {{customer_name}},

                Abbiamo notato che non ordini da un po'...
                {{dog_name}} ha finito la scorta di cibo?

                🚀 RIORDINA IN 1 CLICK:
                Stesso ordine del {{last_order_date}}

                ⏰ Consegna in 24-48h
                🚚 Spedizione gratuita sempre per te

                Non lasciare che la ciotola resti vuota! 🥺
              `,
              cta: {
                text: 'Riordina Ora',
                url: '/reorder/{{last_order_id}}',
                action: 'quick_reorder'
              },
              personalizations: {
                customer_name: customer.firstName,
                dog_name: customer.dogs[0]?.name || 'il tuo cane',
                last_order_date: customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('it-IT') : ''
              },
              scheduledFor: new Date().toISOString()
            }
          ]
        },
        {
          id: 'winback_discount',
          name: 'Offerta Speciale',
          description: 'Sconto per riattivazione',
          trigger: this.triggers.get('no_reorder_45_days')!,
          messages: [
            {
              id: 'winback_discount_email',
              triggerId: 'no_reorder_45_days',
              type: 'email',
              priority: 'urgent',
              subject: '🎁 -10% solo per te! Non perdere questa occasione',
              content: `
                {{customer_name}}, ci manchi! 💔

                {{dog_name}} merita sempre il meglio...

                🎁 OFFERTA SPECIALE SOLO PER TE:
                -10% su tutto + spedizione gratuita
                Codice: WELCOMEBACK10

                ⏳ Valido solo per 48 ore!

                Torna da noi, la famiglia PiùCane ti aspetta! 🏠
              `,
              cta: {
                text: 'Usa Sconto -10%',
                url: '/shop?discount=WELCOMEBACK10',
                action: 'use_discount'
              },
              personalizations: {
                customer_name: customer.firstName,
                dog_name: customer.dogs[0]?.name || 'il tuo cane'
              },
              scheduledFor: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          rewards: [
            {
              id: 'winback_discount',
              type: 'discount',
              value: 10,
              description: 'Sconto winback 10%'
            }
          ]
        }
      ],
      currentStep: 0,
      startedAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        daysSinceLastOrder: daysSinceLastOrder.toString()
      }
    };

    this.journeys.set(journeyId, winbackJourney);
    await this.executeJourneyStep(winbackJourney, 0);

    return winbackJourney;
  }

  // Ottieni journey attivi per un cliente
  getCustomerJourneys(customerId: string): CustomerJourney[] {
    return Array.from(this.journeys.values()).filter(
      journey => journey.customerId === customerId && journey.status === 'active'
    );
  }

  // Pausa journey
  async pauseJourney(journeyId: string): Promise<void> {
    const journey = this.journeys.get(journeyId);
    if (journey) {
      journey.status = 'paused';

      trackCTA({
        ctaId: 'lifecycle.journey.paused',
        event: 'customer_journey_paused',
        value: journeyId,
        metadata: { journeyId, customerId: journey.customerId }
      });
    }
  }

  // Riprendi journey
  async resumeJourney(journeyId: string): Promise<void> {
    const journey = this.journeys.get(journeyId);
    if (journey && journey.status === 'paused') {
      journey.status = 'active';

      trackCTA({
        ctaId: 'lifecycle.journey.resumed',
        event: 'customer_journey_resumed',
        value: journeyId,
        metadata: { journeyId, customerId: journey.customerId }
      });
    }
  }
}

// Singleton instance
export const customerLifecycleManager = new CustomerLifecycleManager();

// Utility functions
export function getCustomerSegment(customer: Customer): 'new' | 'regular' | 'vip' | 'at_risk' {
  if (customer.totalOrders === 0) return 'new';
  if (customer.totalOrders >= 10 || customer.totalSpent >= 500) return 'vip';
  if (customer.lastOrderDate &&
      Date.now() - new Date(customer.lastOrderDate).getTime() > 60 * 24 * 60 * 60 * 1000) {
    return 'at_risk';
  }
  return 'regular';
}

export function getOptimalChannel(customer: Customer): 'email' | 'push' | 'whatsapp' | 'sms' {
  // Logic per determinare il canale migliore basato su engagement storico
  return customer.preferredChannel;
}

export function shouldTriggerWinback(customer: Customer): { should: boolean; days: number } {
  if (!customer.lastOrderDate) return { should: false, days: 0 };

  const daysSinceLastOrder = Math.floor(
    (Date.now() - new Date(customer.lastOrderDate).getTime()) / (24 * 60 * 60 * 1000)
  );

  const should = daysSinceLastOrder >= 35; // Dopo 35 giorni senza riordini
  return { should, days: daysSinceLastOrder };
}