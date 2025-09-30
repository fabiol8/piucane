/**
 * Communication Orchestrator - PiùCane
 * Sistema intelligente per orchestrare comunicazioni multi-canale e winback
 */

import { trackCTA } from '@/analytics/ga4';
import { customerLifecycleManager, Customer } from './customer-lifecycle';

export interface CommunicationChannel {
  type: 'email' | 'push' | 'whatsapp' | 'sms' | 'inbox';
  enabled: boolean;
  priority: number; // 1-5, 1 = highest priority
  engagementRate: number; // 0-1
  lastUsed?: string;
  deliveryRate: number; // 0-1
  clickRate: number; // 0-1
  conversionRate: number; // 0-1
}

export interface CommunicationProfile {
  customerId: string;
  preferredTimeSlots: Array<{
    dayOfWeek: number; // 0-6, 0 = Sunday
    startHour: number; // 0-23
    endHour: number; // 0-23
  }>;
  timezone: string;
  channels: Record<string, CommunicationChannel>;
  suppressions: Array<{
    type: 'all' | 'marketing' | 'transactional';
    until?: string;
    reason: string;
  }>;
  preferences: {
    frequency: 'daily' | 'every_few_days' | 'weekly' | 'monthly';
    contentTypes: string[];
    topics: string[];
  };
  behaviorMetrics: {
    avgOpenTime: number; // minutes after sending
    avgEngagementDuration: number; // seconds
    preferredContentLength: 'short' | 'medium' | 'long';
    devicePreference: 'mobile' | 'desktop' | 'mixed';
  };
}

export interface CommunicationRule {
  id: string;
  name: string;
  type: 'lifecycle' | 'behavioral' | 'transactional' | 'winback' | 'retention';
  trigger: {
    event: string;
    conditions: Record<string, any>;
    cooldown?: number; // minutes between same rule triggers
  };
  targeting: {
    segments: string[];
    excludeSegments?: string[];
    customFilters?: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
      value: any;
    }>;
  };
  content: {
    subject: string;
    template: string;
    personalizations: Record<string, string>;
    ctaButtons: Array<{
      text: string;
      url: string;
      tracking: string;
    }>;
  };
  scheduling: {
    immediate: boolean;
    delay?: number; // minutes
    optimalTime: boolean; // use ML to find best time
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  enabled: boolean;
}

export interface WinbackCampaign {
  id: string;
  name: string;
  description: string;
  targetSegment: {
    daysSinceLastOrder: number;
    minimumOrders: number;
    minimumSpent: number;
    loyaltyLevel?: string[];
    productCategories?: string[];
  };
  sequence: Array<{
    step: number;
    delayDays: number;
    channels: string[];
    content: {
      subject: string;
      template: string;
      offer?: {
        type: 'discount' | 'free_shipping' | 'free_product' | 'points';
        value: number;
        code?: string;
        expiryDays: number;
      };
    };
    conditions?: {
      sendIf: Record<string, any>;
      skipIf: Record<string, any>;
    };
  }>;
  performance: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    reactivated: number;
  };
  active: boolean;
}

class CommunicationOrchestrator {
  private profiles: Map<string, CommunicationProfile> = new Map();
  private rules: Map<string, CommunicationRule> = new Map();
  private winbackCampaigns: Map<string, WinbackCampaign> = new Map();
  private messagingQueue: Array<{
    id: string;
    customerId: string;
    channel: string;
    content: any;
    scheduledFor: string;
    priority: number;
  }> = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeWinbackCampaigns();
  }

  private initializeDefaultRules() {
    const defaultRules: CommunicationRule[] = [
      {
        id: 'subscription_reminder_t3',
        name: 'Reminder Abbonamento T-3',
        type: 'lifecycle',
        trigger: {
          event: 'subscription_delivery_approaching',
          conditions: { daysUntil: 3 },
          cooldown: 4320 // 3 days
        },
        targeting: {
          segments: ['active_subscribers']
        },
        content: {
          subject: '🚚 Il sacco di {{dog_name}} sta per arrivare!',
          template: 'subscription_reminder_t3',
          personalizations: {
            dog_name: '{{customer.dogs[0].name}}',
            delivery_date: '{{subscription.nextDeliveryDate}}',
            products: '{{subscription.products}}'
          },
          ctaButtons: [
            {
              text: 'Gestisci Abbonamento',
              url: '/subscriptions/{{subscription.id}}',
              tracking: 'subscription.manage.t3_reminder'
            },
            {
              text: 'Aggiungi Prodotti',
              url: '/subscriptions/{{subscription.id}}/add-products',
              tracking: 'subscription.add_products.t3_reminder'
            }
          ]
        },
        scheduling: {
          immediate: false,
          delay: 60, // 1 hour after trigger
          optimalTime: true
        },
        priority: 'medium',
        enabled: true
      },
      {
        id: 'abandoned_cart_sequence',
        name: 'Sequenza Carrello Abbandonato',
        type: 'behavioral',
        trigger: {
          event: 'cart_abandoned',
          conditions: { minutesSince: 60, itemCount: { greater_than: 0 } },
          cooldown: 1440 // 24 hours
        },
        targeting: {
          segments: ['registered_users'],
          excludeSegments: ['recent_purchasers']
        },
        content: {
          subject: '🛒 Hai dimenticato qualcosa per {{dog_name}}?',
          template: 'cart_abandonment',
          personalizations: {
            dog_name: '{{customer.dogs[0].name}}',
            cart_items: '{{cart.items}}',
            cart_total: '{{cart.total}}'
          },
          ctaButtons: [
            {
              text: 'Completa Ordine',
              url: '/cart?restore={{cart.id}}',
              tracking: 'cart.restore.abandonment_email'
            }
          ]
        },
        scheduling: {
          immediate: false,
          delay: 120, // 2 hours after abandonment
          optimalTime: true
        },
        priority: 'high',
        enabled: true
      },
      {
        id: 'post_delivery_review',
        name: 'Richiesta Recensione Post-Consegna',
        type: 'lifecycle',
        trigger: {
          event: 'order_delivered',
          conditions: { hoursAfter: 48 }
        },
        targeting: {
          segments: ['all_customers']
        },
        content: {
          subject: '⭐ Come sta andando con i nuovi prodotti di {{dog_name}}?',
          template: 'post_delivery_review',
          personalizations: {
            dog_name: '{{customer.dogs[0].name}}',
            products: '{{order.products}}',
            order_date: '{{order.deliveredAt}}'
          },
          ctaButtons: [
            {
              text: 'Scrivi Recensione (+75 punti)',
              url: '/orders/{{order.id}}/review',
              tracking: 'review.write.post_delivery'
            }
          ]
        },
        scheduling: {
          immediate: false,
          optimalTime: true
        },
        priority: 'medium',
        enabled: true
      },
      {
        id: 'health_reminder_monthly',
        name: 'Reminder Salute Mensile',
        type: 'retention',
        trigger: {
          event: 'monthly_health_check',
          conditions: { dayOfMonth: 1 }
        },
        targeting: {
          segments: ['active_customers']
        },
        content: {
          subject: '⚕️ Controllo mensile: come sta {{dog_name}}?',
          template: 'monthly_health_reminder',
          personalizations: {
            dog_name: '{{customer.dogs[0].name}}',
            age_months: '{{customer.dogs[0].ageInMonths}}',
            weight: '{{customer.dogs[0].weight}}'
          },
          ctaButtons: [
            {
              text: 'Aggiorna Scheda Salute',
              url: '/dogs/{{dog.id}}/health',
              tracking: 'health.update.monthly_reminder'
            },
            {
              text: 'Consulenza Veterinaria',
              url: '/vet-consultation',
              tracking: 'vet.consult.monthly_reminder'
            }
          ]
        },
        scheduling: {
          immediate: false,
          optimalTime: true
        },
        priority: 'low',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  private initializeWinbackCampaigns() {
    const winbackCampaigns: WinbackCampaign[] = [
      {
        id: 'standard_winback',
        name: 'Winback Standard (35-60 giorni)',
        description: 'Riattivazione clienti inattivi da 35-60 giorni',
        targetSegment: {
          daysSinceLastOrder: 35,
          minimumOrders: 1,
          minimumSpent: 30
        },
        sequence: [
          {
            step: 1,
            delayDays: 0, // Immediate quando qualifica
            channels: ['email', 'push'],
            content: {
              subject: '🍽️ La ciotola di {{dog_name}} è vuota?',
              template: 'winback_step1',
              offer: {
                type: 'free_shipping',
                value: 0,
                expiryDays: 7
              }
            }
          },
          {
            step: 2,
            delayDays: 7,
            channels: ['email', 'whatsapp'],
            content: {
              subject: '🎁 Solo per te: -10% + spedizione gratuita',
              template: 'winback_step2',
              offer: {
                type: 'discount',
                value: 10,
                code: 'WELCOMEBACK10',
                expiryDays: 5
              }
            },
            conditions: {
              skipIf: { hasOrdered: true }
            }
          },
          {
            step: 3,
            delayDays: 14,
            channels: ['email'],
            content: {
              subject: '💔 Ci manchi! Ecco un regalo speciale',
              template: 'winback_step3',
              offer: {
                type: 'discount',
                value: 15,
                code: 'COMEBACK15',
                expiryDays: 10
              }
            },
            conditions: {
              skipIf: { hasOrdered: true }
            }
          }
        ],
        performance: {
          sent: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          reactivated: 0
        },
        active: true
      },
      {
        id: 'vip_winback',
        name: 'Winback VIP (Clienti High Value)',
        description: 'Riattivazione per clienti ad alto valore (>€200 spesi)',
        targetSegment: {
          daysSinceLastOrder: 30,
          minimumOrders: 3,
          minimumSpent: 200,
          loyaltyLevel: ['gold', 'platinum']
        },
        sequence: [
          {
            step: 1,
            delayDays: 0,
            channels: ['email', 'whatsapp'],
            content: {
              subject: '👑 {{customer_name}}, la tua fedeltà è preziosa',
              template: 'vip_winback_step1',
              offer: {
                type: 'discount',
                value: 20,
                code: 'VIP20',
                expiryDays: 14
              }
            }
          },
          {
            step: 2,
            delayDays: 10,
            channels: ['email', 'phone'], // Include chiamata personale
            content: {
              subject: '🎁 Consulenza veterinaria gratuita + 25% OFF',
              template: 'vip_winback_step2',
              offer: {
                type: 'discount',
                value: 25,
                code: 'VIPRETURN25',
                expiryDays: 21
              }
            },
            conditions: {
              skipIf: { hasOrdered: true }
            }
          }
        ],
        performance: {
          sent: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          reactivated: 0
        },
        active: true
      }
    ];

    winbackCampaigns.forEach(campaign => {
      this.winbackCampaigns.set(campaign.id, campaign);
    });
  }

  // Determina il canale ottimale per un customer
  public getOptimalChannel(customer: Customer, urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): string {
    const profile = this.profiles.get(customer.id);

    if (!profile) {
      return customer.preferredChannel;
    }

    // Per urgenze alte, usa il canale con delivery rate più alto
    if (urgency === 'urgent' || urgency === 'high') {
      const channels = Object.entries(profile.channels)
        .filter(([_, channel]) => channel.enabled)
        .sort((a, b) => b[1].deliveryRate - a[1].deliveryRate);

      return channels[0]?.[0] || 'email';
    }

    // Per urgenze normali, ottimizza per engagement
    const channels = Object.entries(profile.channels)
      .filter(([_, channel]) => channel.enabled)
      .sort((a, b) => {
        const scoreA = a[1].engagementRate * 0.4 + a[1].clickRate * 0.3 + a[1].conversionRate * 0.3;
        const scoreB = b[1].engagementRate * 0.4 + b[1].clickRate * 0.3 + b[1].conversionRate * 0.3;
        return scoreB - scoreA;
      });

    return channels[0]?.[0] || customer.preferredChannel;
  }

  // Determina il momento ottimale per inviare un messaggio
  public getOptimalSendTime(customer: Customer): Date {
    const profile = this.profiles.get(customer.id);
    const now = new Date();

    if (!profile || !profile.preferredTimeSlots.length) {
      // Default: 10 AM nell'ora locale del customer
      const optimalTime = new Date();
      optimalTime.setHours(10, 0, 0, 0);

      if (optimalTime <= now) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }

      return optimalTime;
    }

    // Trova il prossimo slot temporale preferito
    const currentDay = now.getDay();
    const currentHour = now.getHours();

    // Cerca oggi se c'è ancora tempo
    const todaySlots = profile.preferredTimeSlots.filter(slot => slot.dayOfWeek === currentDay);
    for (const slot of todaySlots) {
      if (currentHour < slot.endHour - 1) {
        const sendTime = new Date();
        sendTime.setHours(Math.max(slot.startHour, currentHour + 1), 0, 0, 0);
        return sendTime;
      }
    }

    // Altrimenti cerca nei prossimi giorni
    for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
      const targetDay = (currentDay + daysAhead) % 7;
      const daySlots = profile.preferredTimeSlots.filter(slot => slot.dayOfWeek === targetDay);

      if (daySlots.length > 0) {
        const slot = daySlots[0]; // Primo slot disponibile
        const sendTime = new Date();
        sendTime.setDate(sendTime.getDate() + daysAhead);
        sendTime.setHours(slot.startHour, 0, 0, 0);
        return sendTime;
      }
    }

    // Fallback: domani alle 10
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(10, 0, 0, 0);
    return fallback;
  }

  // Invia messaggio attraverso orchestratore
  public async sendMessage(
    customer: Customer,
    content: {
      subject: string;
      template: string;
      personalizations?: Record<string, string>;
      cta?: { text: string; url: string; tracking: string };
    },
    options: {
      channel?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      immediate?: boolean;
      ruleId?: string;
    } = {}
  ): Promise<void> {
    const channel = options.channel || this.getOptimalChannel(customer, options.priority);
    const scheduledFor = options.immediate ? new Date() : this.getOptimalSendTime(customer);

    // Personalizza contenuto
    const personalizedContent = this.personalizeContent(content, customer);

    // Aggiungi alla coda
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.messagingQueue.push({
      id: messageId,
      customerId: customer.id,
      channel,
      content: personalizedContent,
      scheduledFor: scheduledFor.toISOString(),
      priority: this.getPriorityScore(options.priority || 'medium')
    });

    // Processa immediatamente se richiesto
    if (options.immediate) {
      await this.processMessage(messageId);
    }

    trackCTA({
      ctaId: 'communication.message.scheduled',
      event: 'message_scheduled',
      value: channel,
      metadata: {
        customerId: customer.id,
        channel,
        template: content.template,
        ruleId: options.ruleId,
        scheduledFor: scheduledFor.toISOString()
      }
    });
  }

  // Elabora coda messaggi
  public async processMessageQueue(): Promise<void> {
    const now = new Date();

    // Ordina per priorità e data di invio
    this.messagingQueue.sort((a, b) => {
      const timeDiff = new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.priority - a.priority;
    });

    const messagesToSend = this.messagingQueue.filter(
      msg => new Date(msg.scheduledFor) <= now
    );

    for (const message of messagesToSend) {
      await this.processMessage(message.id);

      // Rimuovi dalla coda
      this.messagingQueue = this.messagingQueue.filter(msg => msg.id !== message.id);
    }
  }

  // Processa singolo messaggio
  private async processMessage(messageId: string): Promise<void> {
    const message = this.messagingQueue.find(msg => msg.id === messageId);
    if (!message) return;

    try {
      switch (message.channel) {
        case 'email':
          await this.sendEmail(message.customerId, message.content);
          break;
        case 'push':
          await this.sendPushNotification(message.customerId, message.content);
          break;
        case 'whatsapp':
          await this.sendWhatsApp(message.customerId, message.content);
          break;
        case 'sms':
          await this.sendSMS(message.customerId, message.content);
          break;
        case 'inbox':
          await this.sendInboxMessage(message.customerId, message.content);
          break;
      }

      trackCTA({
        ctaId: 'communication.message.sent',
        event: 'message_sent',
        value: message.channel,
        metadata: {
          messageId,
          customerId: message.customerId,
          channel: message.channel
        }
      });

    } catch (error) {
      console.error(`Errore nell'invio messaggio ${messageId}:`, error);

      // Riprova con canale alternativo
      await this.retryWithAlternativeChannel(message);
    }
  }

  // Gestisce winback automatici
  public async processWinbackCampaigns(): Promise<void> {
    // Identificare clienti che qualificano per winback
    const inactiveCustomers = await this.getInactiveCustomers();

    for (const customer of inactiveCustomers) {
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(customer.lastOrderDate!).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Trova campaign appropriata
      const qualifyingCampaigns = Array.from(this.winbackCampaigns.values())
        .filter(campaign => this.customerQualifiesForWinback(customer, campaign));

      for (const campaign of qualifyingCampaigns) {
        await this.enrollInWinbackCampaign(customer, campaign);
      }
    }
  }

  private customerQualifiesForWinback(customer: Customer, campaign: WinbackCampaign): boolean {
    const daysSinceLastOrder = Math.floor(
      (Date.now() - new Date(customer.lastOrderDate!).getTime()) / (24 * 60 * 60 * 1000)
    );

    return (
      daysSinceLastOrder >= campaign.targetSegment.daysSinceLastOrder &&
      customer.totalOrders >= campaign.targetSegment.minimumOrders &&
      customer.totalSpent >= campaign.targetSegment.minimumSpent &&
      (!campaign.targetSegment.loyaltyLevel ||
       campaign.targetSegment.loyaltyLevel.includes(customer.loyaltyLevel))
    );
  }

  private async enrollInWinbackCampaign(customer: Customer, campaign: WinbackCampaign): Promise<void> {
    // Controlla se già iscritto a questa campaign
    const enrollmentKey = `winback_${campaign.id}_${customer.id}`;

    // Simula controllo enrollment esistente
    const alreadyEnrolled = false; // In produzione: check database

    if (alreadyEnrolled) return;

    // Inizia sequenza winback
    for (const step of campaign.sequence) {
      const sendDate = new Date();
      sendDate.setDate(sendDate.getDate() + step.delayDays);

      // Scegli canale migliore tra quelli disponibili per questo step
      const availableChannels = step.channels.filter(channel => {
        const profile = this.profiles.get(customer.id);
        return !profile || profile.channels[channel]?.enabled !== false;
      });

      const optimalChannel = availableChannels.includes(customer.preferredChannel)
        ? customer.preferredChannel
        : availableChannels[0];

      await this.sendMessage(customer, {
        subject: step.content.subject,
        template: step.content.template,
        personalizations: {
          customer_name: customer.firstName,
          dog_name: customer.dogs[0]?.name || 'il tuo cane',
          discount_code: step.content.offer?.code || '',
          discount_value: step.content.offer?.value?.toString() || '0'
        }
      }, {
        channel: optimalChannel,
        priority: 'high',
        immediate: step.delayDays === 0,
        ruleId: `winback_${campaign.id}_step_${step.step}`
      });
    }

    // Aggiorna performance campaign
    campaign.performance.sent++;

    trackCTA({
      ctaId: 'winback.campaign.enrolled',
      event: 'winback_campaign_enrolled',
      value: campaign.id,
      metadata: {
        customerId: customer.id,
        campaignId: campaign.id,
        daysSinceLastOrder: Math.floor(
          (Date.now() - new Date(customer.lastOrderDate!).getTime()) / (24 * 60 * 60 * 1000)
        )
      }
    });
  }

  // Utility methods
  private personalizeContent(content: any, customer: Customer): any {
    let personalizedContent = JSON.parse(JSON.stringify(content));

    // Base personalizations sempre disponibili
    const personalizations = {
      customer_name: customer.firstName,
      customer_email: customer.email,
      dog_name: customer.dogs[0]?.name || 'il tuo cane',
      dog_breed: customer.dogs[0]?.breed || '',
      loyalty_level: customer.loyaltyLevel,
      total_orders: customer.totalOrders.toString(),
      total_spent: customer.totalSpent.toFixed(2),
      ...content.personalizations
    };

    // Sostituisci placeholders
    Object.entries(personalizations).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      if (personalizedContent.subject) {
        personalizedContent.subject = personalizedContent.subject.replace(placeholder, value);
      }
      if (personalizedContent.template) {
        personalizedContent.template = personalizedContent.template.replace(placeholder, value);
      }
    });

    return personalizedContent;
  }

  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private async getInactiveCustomers(): Promise<Customer[]> {
    // In produzione: query database per clienti inattivi
    // Per ora restituisce array vuoto
    return [];
  }

  private async retryWithAlternativeChannel(message: any): Promise<void> {
    // Implementa logica di retry con canale alternativo
    console.log('Retrying message with alternative channel:', message.id);
  }

  // Implementazioni specifiche per canali
  private async sendEmail(customerId: string, content: any): Promise<void> {
    console.log(`📧 Email inviata a ${customerId}:`, content);
  }

  private async sendPushNotification(customerId: string, content: any): Promise<void> {
    console.log(`🔔 Push notification inviata a ${customerId}:`, content);
  }

  private async sendWhatsApp(customerId: string, content: any): Promise<void> {
    console.log(`📱 WhatsApp inviato a ${customerId}:`, content);
  }

  private async sendSMS(customerId: string, content: any): Promise<void> {
    console.log(`📲 SMS inviato a ${customerId}:`, content);
  }

  private async sendInboxMessage(customerId: string, content: any): Promise<void> {
    console.log(`📥 Messaggio inbox per ${customerId}:`, content);
  }
}

// Singleton instance
export const communicationOrchestrator = new CommunicationOrchestrator();

// Utility functions
export function createCommunicationProfile(customer: Customer): CommunicationProfile {
  return {
    customerId: customer.id,
    preferredTimeSlots: [
      { dayOfWeek: 1, startHour: 9, endHour: 12 }, // Lunedì mattina
      { dayOfWeek: 3, startHour: 14, endHour: 17 }, // Mercoledì pomeriggio
      { dayOfWeek: 6, startHour: 10, endHour: 16 }  // Sabato
    ],
    timezone: customer.timezone,
    channels: {
      email: {
        type: 'email',
        enabled: customer.preferences.emailNotifications,
        priority: 1,
        engagementRate: 0.7,
        deliveryRate: 0.98,
        clickRate: 0.15,
        conversionRate: 0.05
      },
      push: {
        type: 'push',
        enabled: customer.preferences.pushNotifications,
        priority: 2,
        engagementRate: 0.8,
        deliveryRate: 0.95,
        clickRate: 0.12,
        conversionRate: 0.08
      },
      whatsapp: {
        type: 'whatsapp',
        enabled: customer.preferences.whatsappNotifications,
        priority: 3,
        engagementRate: 0.9,
        deliveryRate: 0.99,
        clickRate: 0.25,
        conversionRate: 0.12
      },
      sms: {
        type: 'sms',
        enabled: false,
        priority: 4,
        engagementRate: 0.6,
        deliveryRate: 0.97,
        clickRate: 0.08,
        conversionRate: 0.03
      },
      inbox: {
        type: 'inbox',
        enabled: true,
        priority: 5,
        engagementRate: 0.5,
        deliveryRate: 1.0,
        clickRate: 0.10,
        conversionRate: 0.04
      }
    },
    suppressions: [],
    preferences: {
      frequency: customer.preferences.communicationFrequency,
      contentTypes: ['product_updates', 'health_tips', 'promotions'],
      topics: customer.preferences.productCategories
    },
    behaviorMetrics: {
      avgOpenTime: 120, // 2 ore
      avgEngagementDuration: 45, // 45 secondi
      preferredContentLength: 'medium',
      devicePreference: 'mobile'
    }
  };
}