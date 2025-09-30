/**
 * Communication Orchestrator
 * Gestisce l'invio intelligente di messaggi attraverso canali multipli
 */

import { InboxMessage, NotificationPreferences, CommunicationEvent, MessageTemplate, MESSAGE_TEMPLATES } from '@/types/inbox';
import { trackCTAClick } from '@/analytics/ga4';

interface SendMessageOptions {
  userId: string;
  templateKey: string;
  variables: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  forceChannel?: InboxMessage['channel'];
  skipInbox?: boolean;
}

export class CommunicationOrchestrator {
  private preferences: Map<string, NotificationPreferences> = new Map();

  /**
   * Invia un messaggio attraverso il canale ottimale
   */
  async sendMessage(options: SendMessageOptions): Promise<CommunicationEvent> {
    const template = MESSAGE_TEMPLATES[options.templateKey];
    if (!template) {
      throw new Error(`Template non trovato: ${options.templateKey}`);
    }

    const preferences = await this.getUserPreferences(options.userId);
    const optimalChannel = this.selectOptimalChannel(template, preferences, options);

    // Verifica consensi e quiet hours
    const canSend = this.canSendMessage(template, preferences, optimalChannel);
    if (!canSend.allowed) {
      throw new Error(`Impossibile inviare messaggio: ${canSend.reason}`);
    }

    // Crea evento di comunicazione
    const event: CommunicationEvent = {
      id: this.generateId(),
      userId: options.userId,
      type: 'message',
      data: options.variables,
      templateKey: options.templateKey,
      targetChannels: options.forceChannel ? [options.forceChannel] : [optimalChannel],
      actualChannels: [],
      status: 'queued',
      scheduledAt: options.scheduledAt?.toISOString(),
      metadata: {
        priority: options.priority || template.priority,
        respectQuietHours: template.respectQuietHours,
        requiresConsent: template.requiresConsent,
        retryCount: 0,
        maxRetries: 3,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Processa il messaggio
    await this.processEvent(event, template, options);

    return event;
  }

  /**
   * Seleziona il canale ottimale basandosi su preferenze e engagement
   */
  private selectOptimalChannel(
    template: MessageTemplate,
    preferences: NotificationPreferences,
    options: SendMessageOptions
  ): InboxMessage['channel'] {
    // Forza canale se specificato
    if (options.forceChannel) {
      return options.forceChannel;
    }

    // Controlla canali abilitati per la categoria
    const enabledChannels = template.allowedChannels.filter(channel => {
      const channelPrefs = preferences.channels[channel];
      return channelPrefs.enabled && channelPrefs.categories[template.category];
    });

    if (enabledChannels.length === 0) {
      return 'in_app'; // Fallback to in-app
    }

    // Quiet hours check per push notifications
    if (template.respectQuietHours && this.isQuietHours(preferences)) {
      const nonPushChannels = enabledChannels.filter(ch => ch !== 'push');
      if (nonPushChannels.length > 0) {
        enabledChannels.splice(enabledChannels.indexOf('push'), 1);
      }
    }

    // Scegli canale con migliore engagement
    const preferredChannel = preferences.engagement.preferredChannel;
    if (enabledChannels.includes(preferredChannel)) {
      return preferredChannel;
    }

    // Scegli canale con miglior response rate
    const bestChannel = enabledChannels.reduce((best, current) => {
      const currentRate = preferences.engagement.responseRate[current] || 0;
      const bestRate = preferences.engagement.responseRate[best] || 0;
      return currentRate > bestRate ? current : best;
    });

    return bestChannel || template.defaultChannel;
  }

  /**
   * Verifica se il messaggio può essere inviato
   */
  private canSendMessage(
    template: MessageTemplate,
    preferences: NotificationPreferences,
    channel: InboxMessage['channel']
  ): { allowed: boolean; reason?: string } {
    // Controlla consensi
    if (template.requiresConsent && !preferences.consent.marketing) {
      return { allowed: false, reason: 'Consenso marketing richiesto ma non fornito' };
    }

    // Controlla se il canale è abilitato
    const channelPrefs = preferences.channels[channel];
    if (!channelPrefs.enabled) {
      return { allowed: false, reason: `Canale ${channel} disabilitato` };
    }

    // Controlla se la categoria è abilitata per il canale
    if (!channelPrefs.categories[template.category]) {
      return { allowed: false, reason: `Categoria ${template.category} disabilitata per ${channel}` };
    }

    return { allowed: true };
  }

  /**
   * Verifica se siamo in quiet hours
   */
  private isQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const quietStart = this.timeToMinutes(preferences.channels.push.quietHours.start);
    const quietEnd = this.timeToMinutes(preferences.channels.push.quietHours.end);

    if (quietStart <= quietEnd) {
      return currentTime >= quietStart && currentTime <= quietEnd;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Processa l'evento e invia il messaggio
   */
  private async processEvent(
    event: CommunicationEvent,
    template: MessageTemplate,
    options: SendMessageOptions
  ): Promise<void> {
    try {
      event.status = 'processing';
      event.updatedAt = new Date().toISOString();

      // Genera contenuto del messaggio
      const content = this.generateMessageContent(template, options.variables);

      // Crea messaggio inbox
      if (!options.skipInbox) {
        await this.createInboxMessage(event, template, content, options);
      }

      // Invia attraverso i canali specificati
      for (const channel of event.targetChannels) {
        try {
          await this.sendToChannel(channel, content, template, options);
          event.actualChannels.push(channel);
        } catch (error) {
          console.error(`Errore invio su canale ${channel}:`, error);
        }
      }

      event.status = 'sent';
      event.sentAt = new Date().toISOString();

      // Traccia evento
      trackCTAClick('inbox.message.sent', {
        template_key: template.key,
        channel: event.actualChannels.join(','),
        category: template.category,
      });

    } catch (error) {
      event.status = 'failed';
      event.failureReason = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('Errore processamento evento:', error);
    }

    event.updatedAt = new Date().toISOString();
  }

  /**
   * Genera il contenuto del messaggio sostituendo le variabili
   */
  private generateMessageContent(template: MessageTemplate, variables: Record<string, any>): string {
    let content = template.content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return content;
  }

  /**
   * Crea il messaggio nell'inbox
   */
  private async createInboxMessage(
    event: CommunicationEvent,
    template: MessageTemplate,
    content: string,
    options: SendMessageOptions
  ): Promise<void> {
    const message: InboxMessage = {
      id: this.generateId(),
      userId: options.userId,
      channel: event.targetChannels[0],
      category: template.category,
      title: this.generateMessageContent(template.title, options.variables),
      preview: this.generatePreview(content),
      content,
      isRead: false,
      timestamp: new Date().toISOString(),
      metadata: {
        templateKey: template.key,
        originalChannel: event.targetChannels[0],
        deeplinks: template.deeplinks.map(dl => ({
          ...dl,
          parameters: this.generateDeepLinkParams(dl.target, options.variables)
        })),
        tags: template.tags,
        priority: template.priority,
        relatedEntityId: options.variables.orderId || options.variables.dogId || options.variables.missionId,
        relatedEntityType: this.inferEntityType(template.key),
      },
      createdAt: new Date().toISOString(),
    };

    // Salva in Firestore
    await this.saveInboxMessage(message);
  }

  /**
   * Invia messaggio al canale specificato
   */
  private async sendToChannel(
    channel: InboxMessage['channel'],
    content: string,
    template: MessageTemplate,
    options: SendMessageOptions
  ): Promise<void> {
    switch (channel) {
      case 'push':
        await this.sendPushNotification(content, template, options);
        break;
      case 'email':
        await this.sendEmail(content, template, options);
        break;
      case 'whatsapp':
        await this.sendWhatsApp(content, template, options);
        break;
      case 'sms':
        await this.sendSMS(content, template, options);
        break;
      case 'in_app':
        // Already handled by inbox creation
        break;
    }
  }

  private async sendPushNotification(content: string, template: MessageTemplate, options: SendMessageOptions): Promise<void> {
    // Implementation for push notifications
    console.log('Sending push notification:', { template: template.key, userId: options.userId });
  }

  private async sendEmail(content: string, template: MessageTemplate, options: SendMessageOptions): Promise<void> {
    // Implementation for email
    console.log('Sending email:', { template: template.key, userId: options.userId });
  }

  private async sendWhatsApp(content: string, template: MessageTemplate, options: SendMessageOptions): Promise<void> {
    // Implementation for WhatsApp
    console.log('Sending WhatsApp:', { template: template.key, userId: options.userId });
  }

  private async sendSMS(content: string, template: MessageTemplate, options: SendMessageOptions): Promise<void> {
    // Implementation for SMS
    console.log('Sending SMS:', { template: template.key, userId: options.userId });
  }

  /**
   * Utility methods
   */
  private generatePreview(content: string): string {
    // Remove HTML tags and get first 100 characters
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > 100 ? text.substring(0, 97) + '...' : text;
  }

  private generateDeepLinkParams(target: string, variables: Record<string, any>): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract parameters from target URL template
    const matches = target.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => {
        const key = match.slice(1, -1);
        if (variables[key]) {
          params[key] = variables[key];
        }
      });
    }

    return params;
  }

  private inferEntityType(templateKey: string): InboxMessage['metadata']['relatedEntityType'] {
    if (templateKey.startsWith('order')) return 'order';
    if (templateKey.startsWith('mission')) return 'mission';
    if (templateKey.startsWith('subscription')) return 'subscription';
    if (templateKey.startsWith('care')) return 'chat';
    if (templateKey.includes('health') || templateKey.includes('vaccination')) return 'dog';
    return undefined;
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Implementation to get user preferences from database
    const cached = this.preferences.get(userId);
    if (cached) return cached;

    // Default preferences
    const defaultPrefs: NotificationPreferences = {
      userId,
      channels: {
        push: {
          enabled: true,
          quietHours: { start: '22:00', end: '08:00' },
          categories: {
            ordini: true,
            salute: true,
            missioni: true,
            promo: true,
            care: true,
            abbonamenti: true,
          },
        },
        email: {
          enabled: true,
          address: '',
          categories: {
            ordini: true,
            salute: true,
            missioni: false,
            promo: true,
            care: true,
            abbonamenti: true,
          },
        },
        whatsapp: {
          enabled: false,
          phone: '',
          categories: {
            ordini: true,
            salute: false,
            missioni: false,
            promo: false,
            care: true,
            abbonamenti: false,
          },
        },
        sms: {
          enabled: false,
          phone: '',
          categories: {
            ordini: true,
            salute: false,
            missioni: false,
            promo: false,
            care: false,
            abbonamenti: false,
          },
        },
      },
      engagement: {
        preferredChannel: 'push',
        responseRate: { push: 0.7, email: 0.3, whatsapp: 0.5, sms: 0.2, in_app: 0.9 },
        lastInteraction: {},
      },
      consent: {
        marketing: false,
        transactional: true,
        health: true,
        grantedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    this.preferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  private async saveInboxMessage(message: InboxMessage): Promise<void> {
    // Implementation to save to Firestore
    console.log('Saving inbox message:', message.id);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const communicationOrchestrator = new CommunicationOrchestrator();

// Convenience functions for common message types
export const sendOrderConfirmation = (userId: string, orderData: any) =>
  communicationOrchestrator.sendMessage({
    userId,
    templateKey: 'order.confirmed',
    variables: orderData,
    priority: 'normal',
  });

export const sendVaccinationReminder = (userId: string, vaccinationData: any) =>
  communicationOrchestrator.sendMessage({
    userId,
    templateKey: 'health.vaccination.reminder',
    variables: vaccinationData,
    priority: 'high',
  });

export const sendMissionCompleted = (userId: string, missionData: any) =>
  communicationOrchestrator.sendMessage({
    userId,
    templateKey: 'mission.completed',
    variables: missionData,
    priority: 'normal',
  });