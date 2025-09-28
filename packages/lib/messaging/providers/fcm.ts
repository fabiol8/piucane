import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { FCMMessage, PushContent } from '../types';

export class FCMProvider {
  private messaging: any;

  constructor(config: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  }) {
    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: config.projectId,
          privateKey: config.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.clientEmail,
        }),
      });
    }

    this.messaging = getMessaging();
  }

  async sendPushNotification(
    tokens: string | string[],
    content: PushContent,
    options: {
      priority?: 'high' | 'normal';
      collapseKey?: string;
      timeToLive?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<{ success: boolean; successCount?: number; failureCount?: number; errors?: any[] }> {
    try {
      const message: FCMMessage = {
        notification: {
          title: content.title,
          body: content.body,
          image: content.image
        },
        data: {
          ...content.data,
          clickAction: content.clickAction || '',
          deepLink: content.deepLink || '',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: options.priority || 'high',
          notification: {
            icon: content.icon,
            sound: content.sound || 'default',
            clickAction: content.clickAction,
            tag: content.title.toLowerCase().replace(/\s+/g, '_'),
            color: '#ea580c' // PiùCane brand color
          },
          collapseKey: options.collapseKey,
          ttl: options.timeToLive ? options.timeToLive * 1000 : undefined
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: content.title,
                body: content.body
              },
              badge: content.badge,
              sound: content.sound || 'default',
              category: 'PIUCANE_NOTIFICATION',
              'thread-id': 'piucane-notifications'
            }
          },
          headers: {
            'apns-priority': options.priority === 'high' ? '10' : '5',
            'apns-expiration': options.timeToLive
              ? String(Math.floor(Date.now() / 1000) + options.timeToLive)
              : '0'
          }
        },
        webpush: {
          headers: {
            'Urgency': options.priority || 'normal',
            'TTL': options.timeToLive ? String(options.timeToLive) : '86400'
          },
          notification: {
            title: content.title,
            body: content.body,
            icon: content.icon || '/icons/notification-icon.png',
            image: content.image,
            badge: '/icons/badge-icon.png',
            tag: content.title.toLowerCase().replace(/\s+/g, '_'),
            renotify: true,
            requireInteraction: content.priority === 'urgent',
            actions: content.clickAction ? [
              {
                action: 'open',
                title: 'Apri',
                icon: '/icons/open-icon.png'
              },
              {
                action: 'dismiss',
                title: 'Ignora',
                icon: '/icons/dismiss-icon.png'
              }
            ] : undefined
          },
          data: {
            url: content.clickAction || '/',
            ...content.data
          }
        }
      };

      if (Array.isArray(tokens)) {
        // Send to multiple tokens
        const response = await this.messaging.sendMulticast({
          ...message,
          tokens
        }, options.dryRun);

        return {
          success: response.successCount > 0,
          successCount: response.successCount,
          failureCount: response.failureCount,
          errors: response.responses
            .filter((r: any) => !r.success)
            .map((r: any) => r.error)
        };
      } else {
        // Send to single token
        const response = await this.messaging.send({
          ...message,
          token: tokens
        }, options.dryRun);

        return {
          success: true,
          successCount: 1,
          failureCount: 0
        };
      }
    } catch (error: any) {
      console.error('FCM error:', error);

      return {
        success: false,
        successCount: 0,
        failureCount: Array.isArray(tokens) ? tokens.length : 1,
        errors: [error.message || 'Failed to send push notification']
      };
    }
  }

  async sendToTopic(
    topic: string,
    content: PushContent,
    options: {
      condition?: string;
      priority?: 'high' | 'normal';
      timeToLive?: number;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message: FCMMessage = {
        topic: options.condition ? undefined : topic,
        condition: options.condition,
        notification: {
          title: content.title,
          body: content.body,
          image: content.image
        },
        data: {
          ...content.data,
          timestamp: new Date().toISOString()
        },
        android: {
          priority: options.priority || 'normal',
          notification: {
            icon: content.icon,
            sound: content.sound || 'default',
            color: '#ea580c'
          },
          ttl: options.timeToLive ? options.timeToLive * 1000 : undefined
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: content.title,
                body: content.body
              },
              sound: content.sound || 'default'
            }
          }
        }
      };

      const messageId = await this.messaging.send(message);

      return {
        success: true,
        messageId
      };
    } catch (error: any) {
      console.error('FCM topic error:', error);

      return {
        success: false,
        error: error.message || 'Failed to send topic notification'
      };
    }
  }

  async subscribeToTopic(
    tokens: string | string[],
    topic: string
  ): Promise<{ success: boolean; successCount?: number; errors?: any[] }> {
    try {
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await this.messaging.subscribeToTopic(tokensArray, topic);

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        errors: response.errors
      };
    } catch (error: any) {
      console.error('FCM subscription error:', error);

      return {
        success: false,
        errors: [error.message || 'Failed to subscribe to topic']
      };
    }
  }

  async unsubscribeFromTopic(
    tokens: string | string[],
    topic: string
  ): Promise<{ success: boolean; successCount?: number; errors?: any[] }> {
    try {
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await this.messaging.unsubscribeFromTopic(tokensArray, topic);

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        errors: response.errors
      };
    } catch (error: any) {
      console.error('FCM unsubscription error:', error);

      return {
        success: false,
        errors: [error.message || 'Failed to unsubscribe from topic']
      };
    }
  }

  async validateToken(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to send a dry-run message to validate the token
      await this.messaging.send({
        token,
        notification: {
          title: 'Test',
          body: 'Test'
        }
      }, true); // dry run

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid token'
      };
    }
  }

  async cleanInvalidTokens(tokens: string[]): Promise<string[]> {
    const validTokens: string[] = [];

    for (const token of tokens) {
      const validation = await this.validateToken(token);
      if (validation.valid) {
        validTokens.push(token);
      }
    }

    return validTokens;
  }

  // Predefined notification types
  async sendWelcomeNotification(
    tokens: string | string[],
    variables: Record<string, any>
  ): Promise<any> {
    const content: PushContent = {
      title: 'Benvenuto in PiùCane! 🐕',
      body: `Ciao ${variables.user_name}! Inizia il tuo viaggio con ${variables.dog_name}.`,
      icon: '/icons/welcome.png',
      clickAction: 'https://app.piucane.it/dashboard',
      deepLink: 'piucane://dashboard',
      data: {
        type: 'welcome',
        user_id: variables.user_id
      }
    };

    return this.sendPushNotification(tokens, content, { priority: 'normal' });
  }

  async sendUrgentHealthNotification(
    tokens: string | string[],
    variables: Record<string, any>
  ): Promise<any> {
    const content: PushContent = {
      title: '🚨 ATTENZIONE SALUTE',
      body: `Sintomi rilevati per ${variables.dog_name}. Consulta un veterinario.`,
      icon: '/icons/urgent.png',
      sound: 'urgent_alert.wav',
      clickAction: 'https://app.piucane.it/health/urgent',
      deepLink: 'piucane://health/urgent',
      priority: 'urgent' as any,
      data: {
        type: 'urgent_health',
        dog_id: variables.dog_id,
        symptoms: variables.symptoms
      }
    };

    return this.sendPushNotification(tokens, content, {
      priority: 'high',
      timeToLive: 3600 // 1 hour
    });
  }

  async sendOrderStatusNotification(
    tokens: string | string[],
    variables: Record<string, any>
  ): Promise<any> {
    const statusMessages = {
      confirmed: 'Il tuo ordine è stato confermato! 📦',
      shipped: 'Il tuo ordine è in viaggio! 🚚',
      delivered: 'Il tuo ordine è stato consegnato! ✅'
    };

    const content: PushContent = {
      title: statusMessages[variables.status as keyof typeof statusMessages] || 'Aggiornamento ordine',
      body: `Ordine #${variables.order_number} - ${variables.status_description}`,
      icon: '/icons/order.png',
      clickAction: `https://app.piucane.it/orders/${variables.order_id}`,
      deepLink: `piucane://orders/${variables.order_id}`,
      data: {
        type: 'order_status',
        order_id: variables.order_id,
        status: variables.status
      }
    };

    return this.sendPushNotification(tokens, content, { priority: 'normal' });
  }

  async sendSubscriptionNotification(
    tokens: string | string[],
    variables: Record<string, any>
  ): Promise<any> {
    const content: PushContent = {
      title: '🔄 Abbonamento rinnovato',
      body: `${variables.subscription_name} - Prossima consegna: ${variables.next_delivery}`,
      icon: '/icons/subscription.png',
      clickAction: `https://app.piucane.it/subscriptions/${variables.subscription_id}`,
      deepLink: `piucane://subscriptions/${variables.subscription_id}`,
      data: {
        type: 'subscription_renewal',
        subscription_id: variables.subscription_id
      }
    };

    return this.sendPushNotification(tokens, content, { priority: 'normal' });
  }

  async sendPromotionNotification(
    tokens: string | string[],
    variables: Record<string, any>
  ): Promise<any> {
    const content: PushContent = {
      title: '🎉 Offerta speciale!',
      body: `${variables.discount_percentage}% di sconto su ${variables.product_category}!`,
      icon: '/icons/promotion.png',
      image: variables.promotion_image,
      clickAction: `https://app.piucane.it/shop?promo=${variables.promo_code}`,
      deepLink: `piucane://shop?promo=${variables.promo_code}`,
      data: {
        type: 'promotion',
        promo_code: variables.promo_code,
        category: variables.product_category
      }
    };

    return this.sendPushNotification(tokens, content, { priority: 'normal' });
  }
}