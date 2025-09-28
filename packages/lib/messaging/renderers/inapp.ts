import { InAppContent } from '../types';

export class InAppRenderer {
  static render(
    content: InAppContent,
    variables: Record<string, any>
  ): InAppContent {
    let title = content.title;
    let message = content.message;

    // Replace variables in content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      title = title.replace(placeholder, String(value));
      message = message.replace(placeholder, String(value));
    });

    // Process action URL if present
    let action = content.action;
    if (action) {
      let url = action.url;
      let deepLink = action.deepLink || '';

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        url = url.replace(placeholder, String(value));
        deepLink = deepLink.replace(placeholder, String(value));
      });

      action = {
        ...action,
        url,
        deepLink: deepLink || undefined
      };
    }

    return {
      ...content,
      title,
      message,
      action
    };
  }

  static validateContent(content: InAppContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.title?.trim()) {
      errors.push('Title is required');
    } else if (content.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (!content.message?.trim()) {
      errors.push('Message is required');
    } else if (content.message.length > 500) {
      errors.push('Message must be 500 characters or less');
    }

    if (!['info', 'success', 'warning', 'error', 'promotion'].includes(content.type)) {
      errors.push('Type must be one of: info, success, warning, error, promotion');
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(content.priority)) {
      errors.push('Priority must be one of: low, medium, high, urgent');
    }

    if (content.action) {
      if (!content.action.label?.trim()) {
        errors.push('Action label is required when action is present');
      }

      if (!content.action.url?.trim()) {
        errors.push('Action URL is required when action is present');
      } else if (!this.isValidUrl(content.action.url)) {
        errors.push('Action URL must be a valid URL');
      }

      if (content.action.deepLink && !this.isValidDeepLink(content.action.deepLink)) {
        errors.push('Deep link must be a valid deep link format');
      }
    }

    if (content.expiresAt && content.expiresAt <= new Date()) {
      errors.push('Expiration date must be in the future');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidDeepLink(deepLink: string): boolean {
    return /^[a-z]+:\/\/.+/.test(deepLink);
  }

  static getTypeIcon(type: InAppContent['type']): string {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'promotion': return '🎉';
      default: return 'ℹ️';
    }
  }

  static getTypeColor(type: InAppContent['type']): string {
    switch (type) {
      case 'info': return 'blue';
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'promotion': return 'purple';
      default: return 'gray';
    }
  }

  static getPriorityBadge(priority: InAppContent['priority']): string {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '';
    }
  }

  // Predefined in-app message templates
  static getWelcomeMessage(): InAppContent {
    return {
      title: 'Benvenuto in PiùCane! 🐕',
      message: 'Ciao {{ user_name }}! Siamo felici di averti nella nostra community. Inizia esplorando le funzionalità dedicate a {{ dog_name }}.',
      type: 'success',
      action: {
        label: 'Inizia tour',
        url: '/dashboard?tour=start',
        deepLink: 'piucane://dashboard?tour=start'
      },
      dismissible: true,
      priority: 'medium'
    };
  }

  static getOrderConfirmationMessage(): InAppContent {
    return {
      title: 'Ordine confermato ✅',
      message: 'Il tuo ordine #{{ order_number }} è stato confermato e sarà spedito entro {{ shipping_days }} giorni lavorativi.',
      type: 'success',
      action: {
        label: 'Vedi ordine',
        url: '/orders/{{ order_id }}',
        deepLink: 'piucane://orders/{{ order_id }}'
      },
      dismissible: true,
      priority: 'medium'
    };
  }

  static getHealthReminderMessage(): InAppContent {
    return {
      title: 'Promemoria salute 🩺',
      message: 'È ora di {{ reminder_type }} per {{ dog_name }}. Ricordati di prenotare l\'appuntamento con il veterinario.',
      type: 'warning',
      action: {
        label: 'Gestisci promemoria',
        url: '/health/reminders',
        deepLink: 'piucane://health/reminders'
      },
      dismissible: true,
      priority: 'high'
    };
  }

  static getSubscriptionRenewalMessage(): InAppContent {
    return {
      title: 'Abbonamento rinnovato 🔄',
      message: 'Il tuo abbonamento {{ subscription_name }} è stato rinnovato automaticamente. Prossima consegna: {{ next_delivery }}.',
      type: 'info',
      action: {
        label: 'Gestisci abbonamento',
        url: '/subscriptions/{{ subscription_id }}',
        deepLink: 'piucane://subscriptions/{{ subscription_id }}'
      },
      dismissible: true,
      priority: 'low'
    };
  }

  static getMissionCompleteMessage(): InAppContent {
    return {
      title: 'Missione completata! 🎯',
      message: 'Congratulazioni! Hai completato "{{ mission_name }}" e guadagnato {{ points }} punti. Continua così!',
      type: 'success',
      action: {
        label: 'Vedi progressi',
        url: '/gamification',
        deepLink: 'piucane://gamification'
      },
      dismissible: true,
      priority: 'medium'
    };
  }

  static getBadgeUnlockedMessage(): InAppContent {
    return {
      title: 'Nuovo badge sbloccato! 🏆',
      message: 'Hai sbloccato il badge "{{ badge_name }}"! {{ badge_description }}',
      type: 'success',
      action: {
        label: 'Vedi badge',
        url: '/gamification/badges',
        deepLink: 'piucane://gamification/badges'
      },
      dismissible: true,
      priority: 'medium'
    };
  }

  static getPromotionMessage(): InAppContent {
    return {
      title: 'Offerta speciale! 🎉',
      message: '{{ discount_percentage }}% di sconto su {{ product_category }} solo per te! Offerta valida fino al {{ expiry_date }}.',
      type: 'promotion',
      action: {
        label: 'Scopri offerta',
        url: '/shop?promo={{ promo_code }}',
        deepLink: 'piucane://shop?promo={{ promo_code }}'
      },
      dismissible: true,
      priority: 'medium',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
  }

  static getStockAlertMessage(): InAppContent {
    return {
      title: 'Prodotto quasi esaurito! ⚠️',
      message: '{{ product_name }} nel tuo abbonamento sta per esaurirsi. Vuoi aumentare la quantità o cambiare prodotto?',
      type: 'warning',
      action: {
        label: 'Modifica abbonamento',
        url: '/subscriptions/{{ subscription_id }}/edit',
        deepLink: 'piucane://subscriptions/{{ subscription_id }}/edit'
      },
      dismissible: true,
      priority: 'high'
    };
  }

  static getAIResponseMessage(): InAppContent {
    return {
      title: 'Risposta da {{ agent_name }} 🤖',
      message: 'Il tuo {{ agent_type }} AI ha risposto alla tua domanda su {{ dog_name }}. Controlla la conversazione per i dettagli.',
      type: 'info',
      action: {
        label: 'Vedi risposta',
        url: '/ai/{{ agent_type }}',
        deepLink: 'piucane://ai/{{ agent_type }}'
      },
      dismissible: true,
      priority: 'medium'
    };
  }

  static getUrgentHealthMessage(): InAppContent {
    return {
      title: '🚨 ATTENZIONE SALUTE',
      message: 'Abbiamo rilevato sintomi che potrebbero richiedere attenzione veterinaria immediata per {{ dog_name }}. Consulta un veterinario.',
      type: 'error',
      action: {
        label: 'Trova veterinario',
        url: '/health/emergency',
        deepLink: 'piucane://health/emergency'
      },
      dismissible: false,
      priority: 'urgent'
    };
  }

  static getSystemMaintenanceMessage(): InAppContent {
    return {
      title: 'Manutenzione programmata 🔧',
      message: 'Il sistema sarà in manutenzione il {{ maintenance_date }} dalle {{ start_time }} alle {{ end_time }}. Alcune funzionalità potrebbero essere temporaneamente non disponibili.',
      type: 'warning',
      dismissible: true,
      priority: 'medium',
      expiresAt: new Date('{{ maintenance_date }}')
    };
  }
}