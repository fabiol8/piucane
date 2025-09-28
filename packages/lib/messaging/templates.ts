import { MessageTemplate, TemplateVariable, MessageChannel } from './types';
import { EmailRenderer } from './renderers/email';
import { PushRenderer } from './renderers/push';
import { WhatsAppRenderer } from './renderers/whatsapp';
import { InAppRenderer } from './renderers/inapp';

export class TemplateManager {
  private templates: Map<string, MessageTemplate> = new Map();

  constructor() {
    // Initialize with default templates
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    const defaultTemplates = [
      this.createWelcomeTemplate(),
      this.createOrderConfirmationTemplate(),
      this.createShippingNotificationTemplate(),
      this.createHealthReminderTemplate(),
      this.createSubscriptionRenewalTemplate(),
      this.createPromotionTemplate(),
      this.createUrgentHealthTemplate(),
      this.createMissionCompleteTemplate(),
      this.createBadgeUnlockedTemplate(),
      this.createSystemMaintenanceTemplate()
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.key, template);
    });
  }

  getTemplate(key: string): MessageTemplate | undefined {
    return this.templates.get(key);
  }

  getAllTemplates(): MessageTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: MessageTemplate['category']): MessageTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  getTemplatesByChannel(channel: MessageChannel): MessageTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.channels.includes(channel));
  }

  addTemplate(template: MessageTemplate): void {
    this.templates.set(template.key, template);
  }

  updateTemplate(key: string, updates: Partial<MessageTemplate>): boolean {
    const template = this.templates.get(key);
    if (!template) return false;

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
      version: template.version + 1
    };

    this.templates.set(key, updatedTemplate);
    return true;
  }

  deleteTemplate(key: string): boolean {
    return this.templates.delete(key);
  }

  validateTemplate(template: MessageTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!template.key?.trim()) errors.push('Template key is required');
    if (!template.name?.trim()) errors.push('Template name is required');
    if (!template.channels || template.channels.length === 0) {
      errors.push('At least one channel is required');
    }

    // Validate content for each channel
    if (template.content.email && template.channels.includes('email')) {
      const emailValidation = EmailRenderer.validateTemplate(template.content.email.mjmlTemplate);
      if (!emailValidation.valid) {
        errors.push(...emailValidation.errors.map(e => `Email: ${e}`));
      }
    }

    if (template.content.push && template.channels.includes('push')) {
      const pushValidation = PushRenderer.validateContent(template.content.push);
      if (!pushValidation.valid) {
        errors.push(...pushValidation.errors.map(e => `Push: ${e}`));
      }
    }

    if (template.content.whatsapp && template.channels.includes('whatsapp')) {
      const whatsappValidation = WhatsAppRenderer.validateContent(template.content.whatsapp);
      if (!whatsappValidation.valid) {
        errors.push(...whatsappValidation.errors.map(e => `WhatsApp: ${e}`));
      }
    }

    if (template.content.inapp && template.channels.includes('inapp')) {
      const inappValidation = InAppRenderer.validateContent(template.content.inapp);
      if (!inappValidation.valid) {
        errors.push(...inappValidation.errors.map(e => `In-app: ${e}`));
      }
    }

    // Validate variables
    template.variables.forEach((variable, index) => {
      if (!variable.name?.trim()) {
        errors.push(`Variable ${index}: name is required`);
      }
      if (!['string', 'number', 'boolean', 'date', 'object'].includes(variable.type)) {
        errors.push(`Variable ${index}: invalid type`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Default template definitions
  private createWelcomeTemplate(): MessageTemplate {
    return {
      id: 'tpl_welcome',
      key: 'welcome',
      name: 'Messaggio di benvenuto',
      description: 'Messaggio inviato ai nuovi utenti dopo la registrazione',
      category: 'onboarding',
      channels: ['email', 'push', 'inapp'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'dog_name',
          type: 'string',
          required: true,
          description: 'Nome del cane'
        },
        {
          name: 'dashboard_url',
          type: 'string',
          required: true,
          description: 'URL della dashboard'
        }
      ],
      content: {
        email: {
          subject: 'Benvenuto in PiùCane, {{ user_name }}! 🐕',
          preheader: 'Il tuo viaggio per il benessere di {{ dog_name }} inizia qui',
          mjmlTemplate: EmailRenderer.getWelcomeTemplate()
        },
        push: PushRenderer.getWelcomeNotification(),
        inapp: InAppRenderer.getWelcomeMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createOrderConfirmationTemplate(): MessageTemplate {
    return {
      id: 'tpl_order_confirmation',
      key: 'order_confirmation',
      name: 'Conferma ordine',
      description: 'Messaggio di conferma ordine',
      category: 'transactional',
      channels: ['email', 'push', 'whatsapp', 'inapp'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'order_number',
          type: 'string',
          required: true,
          description: 'Numero ordine'
        },
        {
          name: 'order_total',
          type: 'number',
          required: true,
          description: 'Totale ordine'
        },
        {
          name: 'order_items',
          type: 'object',
          required: true,
          description: 'Elementi dell\'ordine'
        },
        {
          name: 'shipping_address',
          type: 'string',
          required: true,
          description: 'Indirizzo di spedizione'
        },
        {
          name: 'tracking_url',
          type: 'string',
          required: true,
          description: 'URL per il tracking'
        }
      ],
      content: {
        email: {
          subject: 'Ordine confermato - #{{ order_number }}',
          preheader: 'Il tuo ordine è stato confermato e sarà spedito a breve',
          mjmlTemplate: EmailRenderer.getOrderConfirmationTemplate()
        },
        push: PushRenderer.getOrderShippedNotification(),
        whatsapp: WhatsAppRenderer.getOrderConfirmationTemplate(),
        inapp: InAppRenderer.getOrderConfirmationMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createShippingNotificationTemplate(): MessageTemplate {
    return {
      id: 'tpl_shipping_notification',
      key: 'shipping_notification',
      name: 'Notifica spedizione',
      description: 'Notifica quando l\'ordine viene spedito',
      category: 'transactional',
      channels: ['email', 'push', 'whatsapp', 'sms'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'order_number',
          type: 'string',
          required: true,
          description: 'Numero ordine'
        },
        {
          name: 'tracking_number',
          type: 'string',
          required: true,
          description: 'Numero di tracking'
        },
        {
          name: 'carrier',
          type: 'string',
          required: true,
          description: 'Nome del corriere'
        },
        {
          name: 'estimated_delivery',
          type: 'date',
          required: true,
          description: 'Data di consegna stimata'
        },
        {
          name: 'tracking_url',
          type: 'string',
          required: true,
          description: 'URL per il tracking'
        }
      ],
      content: {
        push: PushRenderer.getOrderShippedNotification(),
        whatsapp: WhatsAppRenderer.getShippingNotificationTemplate()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createHealthReminderTemplate(): MessageTemplate {
    return {
      id: 'tpl_health_reminder',
      key: 'health_reminder',
      name: 'Promemoria salute',
      description: 'Promemoria per appuntamenti veterinari o medicine',
      category: 'health',
      channels: ['email', 'push', 'whatsapp', 'sms', 'inapp'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'dog_name',
          type: 'string',
          required: true,
          description: 'Nome del cane'
        },
        {
          name: 'reminder_type',
          type: 'string',
          required: true,
          description: 'Tipo di promemoria'
        },
        {
          name: 'due_date',
          type: 'date',
          required: true,
          description: 'Data di scadenza'
        }
      ],
      content: {
        push: PushRenderer.getHealthReminderNotification(),
        whatsapp: WhatsAppRenderer.getHealthReminderTemplate(),
        inapp: InAppRenderer.getHealthReminderMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createSubscriptionRenewalTemplate(): MessageTemplate {
    return {
      id: 'tpl_subscription_renewal',
      key: 'subscription_renewal',
      name: 'Rinnovo abbonamento',
      description: 'Notifica di rinnovo abbonamento',
      category: 'transactional',
      channels: ['email', 'push', 'whatsapp', 'inapp'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'subscription_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'abbonamento'
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          description: 'Importo addebitato'
        },
        {
          name: 'next_delivery',
          type: 'date',
          required: true,
          description: 'Data prossima consegna'
        },
        {
          name: 'subscription_id',
          type: 'string',
          required: true,
          description: 'ID abbonamento'
        }
      ],
      content: {
        push: PushRenderer.getSubscriptionRenewalNotification(),
        whatsapp: WhatsAppRenderer.getSubscriptionRenewalTemplate(),
        inapp: InAppRenderer.getSubscriptionRenewalMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createPromotionTemplate(): MessageTemplate {
    return {
      id: 'tpl_promotion',
      key: 'promotion',
      name: 'Promozione',
      description: 'Messaggio promozionale',
      category: 'marketing',
      channels: ['email', 'push', 'whatsapp', 'sms', 'inapp'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'discount_percentage',
          type: 'number',
          required: true,
          description: 'Percentuale di sconto'
        },
        {
          name: 'product_category',
          type: 'string',
          required: true,
          description: 'Categoria di prodotti'
        },
        {
          name: 'promo_code',
          type: 'string',
          required: true,
          description: 'Codice promozionale'
        },
        {
          name: 'expiry_date',
          type: 'date',
          required: true,
          description: 'Data di scadenza'
        },
        {
          name: 'shop_url',
          type: 'string',
          required: true,
          description: 'URL del negozio'
        }
      ],
      content: {
        push: PushRenderer.getPromotionNotification(),
        whatsapp: WhatsAppRenderer.getPromotionTemplate(),
        inapp: InAppRenderer.getPromotionMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createUrgentHealthTemplate(): MessageTemplate {
    return {
      id: 'tpl_urgent_health',
      key: 'urgent_health',
      name: 'Allerta salute urgente',
      description: 'Allerta per situazioni di salute urgenti',
      category: 'emergency',
      channels: ['push', 'whatsapp', 'sms', 'inapp'],
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          description: 'Nome dell\'utente'
        },
        {
          name: 'dog_name',
          type: 'string',
          required: true,
          description: 'Nome del cane'
        },
        {
          name: 'symptoms',
          type: 'string',
          required: true,
          description: 'Sintomi rilevati'
        }
      ],
      content: {
        push: PushRenderer.getUrgentHealthNotification(),
        whatsapp: WhatsAppRenderer.getUrgentHealthTemplate(),
        inapp: InAppRenderer.getUrgentHealthMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createMissionCompleteTemplate(): MessageTemplate {
    return {
      id: 'tpl_mission_complete',
      key: 'mission_complete',
      name: 'Missione completata',
      description: 'Notifica di completamento missione',
      category: 'transactional',
      channels: ['push', 'inapp'],
      variables: [
        {
          name: 'mission_name',
          type: 'string',
          required: true,
          description: 'Nome della missione'
        },
        {
          name: 'points',
          type: 'number',
          required: true,
          description: 'Punti guadagnati'
        },
        {
          name: 'mission_id',
          type: 'string',
          required: true,
          description: 'ID della missione'
        }
      ],
      content: {
        push: PushRenderer.getMissionCompleteNotification(),
        inapp: InAppRenderer.getMissionCompleteMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createBadgeUnlockedTemplate(): MessageTemplate {
    return {
      id: 'tpl_badge_unlocked',
      key: 'badge_unlocked',
      name: 'Badge sbloccato',
      description: 'Notifica di nuovo badge sbloccato',
      category: 'transactional',
      channels: ['push', 'inapp'],
      variables: [
        {
          name: 'badge_name',
          type: 'string',
          required: true,
          description: 'Nome del badge'
        },
        {
          name: 'badge_description',
          type: 'string',
          required: true,
          description: 'Descrizione del badge'
        }
      ],
      content: {
        inapp: InAppRenderer.getBadgeUnlockedMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  private createSystemMaintenanceTemplate(): MessageTemplate {
    return {
      id: 'tpl_system_maintenance',
      key: 'system_maintenance',
      name: 'Manutenzione sistema',
      description: 'Notifica di manutenzione programmata',
      category: 'transactional',
      channels: ['email', 'push', 'inapp'],
      variables: [
        {
          name: 'maintenance_date',
          type: 'date',
          required: true,
          description: 'Data della manutenzione'
        },
        {
          name: 'start_time',
          type: 'string',
          required: true,
          description: 'Ora di inizio'
        },
        {
          name: 'end_time',
          type: 'string',
          required: true,
          description: 'Ora di fine'
        }
      ],
      content: {
        inapp: InAppRenderer.getSystemMaintenanceMessage()
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }
}