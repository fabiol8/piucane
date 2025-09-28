import { PushContent } from '../types';

export class PushRenderer {
  static render(
    content: PushContent,
    variables: Record<string, any>
  ): PushContent {
    let title = content.title;
    let body = content.body;
    let clickAction = content.clickAction || '';
    let deepLink = content.deepLink || '';

    // Replace variables in content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      title = title.replace(placeholder, String(value));
      body = body.replace(placeholder, String(value));
      clickAction = clickAction.replace(placeholder, String(value));
      deepLink = deepLink.replace(placeholder, String(value));
    });

    // Validate content length
    if (title.length > 65) {
      console.warn('Push notification title too long, truncating');
      title = title.substring(0, 62) + '...';
    }

    if (body.length > 240) {
      console.warn('Push notification body too long, truncating');
      body = body.substring(0, 237) + '...';
    }

    return {
      ...content,
      title,
      body,
      clickAction: clickAction || undefined,
      deepLink: deepLink || undefined,
      data: {
        ...content.data,
        timestamp: new Date().toISOString(),
        variables: JSON.stringify(variables)
      }
    };
  }

  static validateContent(content: PushContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.title?.trim()) {
      errors.push('Title is required');
    } else if (content.title.length > 65) {
      errors.push('Title must be 65 characters or less');
    }

    if (!content.body?.trim()) {
      errors.push('Body is required');
    } else if (content.body.length > 240) {
      errors.push('Body must be 240 characters or less');
    }

    if (content.clickAction && !this.isValidUrl(content.clickAction)) {
      errors.push('Click action must be a valid URL');
    }

    if (content.deepLink && !this.isValidDeepLink(content.deepLink)) {
      errors.push('Deep link must be a valid deep link format');
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
    // Check for valid deep link format (app://path or piucane://path)
    return /^[a-z]+:\/\/.+/.test(deepLink);
  }

  // Predefined notification templates
  static getWelcomeNotification(): PushContent {
    return {
      title: 'Benvenuto in PiùCane! 🐕',
      body: 'Il tuo viaggio per il benessere di {{ dog_name }} inizia ora. Scopri cosa possiamo fare insieme!',
      icon: 'https://piucane.it/icons/welcome.png',
      clickAction: 'https://app.piucane.it/dashboard',
      deepLink: 'piucane://dashboard',
      data: {
        type: 'welcome',
        category: 'onboarding'
      }
    };
  }

  static getOrderShippedNotification(): PushContent {
    return {
      title: 'Ordine spedito! 📦',
      body: 'Il tuo ordine #{{ order_number }} è in viaggio. Traccialo in tempo reale!',
      icon: 'https://piucane.it/icons/shipping.png',
      clickAction: 'https://app.piucane.it/orders/{{ order_id }}',
      deepLink: 'piucane://orders/{{ order_id }}',
      data: {
        type: 'order_shipped',
        category: 'transactional',
        order_id: '{{ order_id }}'
      }
    };
  }

  static getHealthReminderNotification(): PushContent {
    return {
      title: '🩺 Promemoria salute',
      body: 'È ora di {{ reminder_type }} per {{ dog_name }}. Non dimenticare!',
      icon: 'https://piucane.it/icons/health.png',
      clickAction: 'https://app.piucane.it/health/reminders',
      deepLink: 'piucane://health/reminders',
      data: {
        type: 'health_reminder',
        category: 'health',
        reminder_id: '{{ reminder_id }}'
      }
    };
  }

  static getAIConsultationNotification(): PushContent {
    return {
      title: '🤖 Risposta da {{ agent_name }}',
      body: 'Il tuo {{ agent_type }} AI ha risposto alla tua domanda su {{ dog_name }}',
      icon: 'https://piucane.it/icons/ai.png',
      clickAction: 'https://app.piucane.it/ai/{{ agent_type }}',
      deepLink: 'piucane://ai/{{ agent_type }}',
      data: {
        type: 'ai_response',
        category: 'health',
        agent_type: '{{ agent_type }}',
        conversation_id: '{{ conversation_id }}'
      }
    };
  }

  static getMissionCompleteNotification(): PushContent {
    return {
      title: '🎯 Missione completata!',
      body: 'Hai completato "{{ mission_name }}" e guadagnato {{ points }} punti!',
      icon: 'https://piucane.it/icons/mission.png',
      clickAction: 'https://app.piucane.it/gamification',
      deepLink: 'piucane://gamification',
      data: {
        type: 'mission_complete',
        category: 'gamification',
        mission_id: '{{ mission_id }}',
        points: '{{ points }}'
      }
    };
  }

  static getSubscriptionRenewalNotification(): PushContent {
    return {
      title: '🔄 Abbonamento rinnovato',
      body: 'Il tuo abbonamento {{ subscription_name }} è stato rinnovato. Prossima consegna: {{ next_delivery }}',
      icon: 'https://piucane.it/icons/subscription.png',
      clickAction: 'https://app.piucane.it/subscriptions',
      deepLink: 'piucane://subscriptions',
      data: {
        type: 'subscription_renewal',
        category: 'transactional',
        subscription_id: '{{ subscription_id }}'
      }
    };
  }

  static getPromotionNotification(): PushContent {
    return {
      title: '🎉 Offerta speciale per te!',
      body: '{{ discount_percentage }}% di sconto su {{ product_category }}. Valido fino al {{ expiry_date }}',
      icon: 'https://piucane.it/icons/promotion.png',
      clickAction: 'https://app.piucane.it/shop?promo={{ promo_code }}',
      deepLink: 'piucane://shop?promo={{ promo_code }}',
      data: {
        type: 'promotion',
        category: 'marketing',
        promo_code: '{{ promo_code }}'
      }
    };
  }

  static getUrgentHealthNotification(): PushContent {
    return {
      title: '🚨 Attenzione salute',
      body: 'Abbiamo rilevato sintomi che richiedono attenzione veterinaria per {{ dog_name }}',
      icon: 'https://piucane.it/icons/urgent.png',
      clickAction: 'https://app.piucane.it/health/urgent',
      deepLink: 'piucane://health/urgent',
      sound: 'urgent_alert.wav',
      data: {
        type: 'urgent_health',
        category: 'emergency',
        priority: 'high'
      }
    };
  }
}