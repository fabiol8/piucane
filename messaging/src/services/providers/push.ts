import { messaging } from '../../config/firebase';
import { logger } from '../../utils/logger';
import { PushMessage, MessageResult } from '../../types/messages';

export class PushProvider {
  private static instance: PushProvider;

  public static getInstance(): PushProvider {
    if (!PushProvider.instance) {
      PushProvider.instance = new PushProvider();
    }
    return PushProvider.instance;
  }

  async sendPushNotification(message: PushMessage): Promise<MessageResult> {
    try {
      const fcmMessage = this.buildFCMMessage(message);

      const response = await messaging.send(fcmMessage);

      logger.info(`Push notification sent successfully`, {
        messageId: response,
        userId: message.userId,
        tokens: Array.isArray(message.tokens) ? message.tokens.length : 1
      });

      return {
        success: true,
        messageId: response,
        provider: 'fcm',
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error sending push notification:', {
        error: error.message,
        userId: message.userId,
        tokens: message.tokens
      });

      return {
        success: false,
        error: error.message,
        provider: 'fcm',
        timestamp: new Date()
      };
    }
  }

  async sendBulkPushNotifications(messages: PushMessage[]): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    for (const message of messages) {
      try {
        const result = await this.sendPushNotification(message);
        results.push({
          ...result,
          recipient: Array.isArray(message.tokens) ? `${message.tokens.length} devices` : message.tokens
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          provider: 'fcm',
          timestamp: new Date(),
          recipient: Array.isArray(message.tokens) ? `${message.tokens.length} devices` : message.tokens
        });
      }
    }

    return results;
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: { [key: string]: string },
    userId?: string
  ): Promise<MessageResult> {
    try {
      const message = {
        topic,
        notification: {
          title,
          body
        },
        data: data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default',
            priority: 'high' as const
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body
              },
              badge: 1,
              sound: 'default'
            }
          }
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            requireInteraction: true
          }
        }
      };

      const response = await messaging.send(message);

      logger.info(`Topic push notification sent successfully`, {
        messageId: response,
        topic,
        userId
      });

      return {
        success: true,
        messageId: response,
        provider: 'fcm',
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error sending topic push notification:', {
        error: error.message,
        topic,
        userId
      });

      return {
        success: false,
        error: error.message,
        provider: 'fcm',
        timestamp: new Date()
      };
    }
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: { [key: string]: string },
    userId?: string
  ): Promise<MessageResult> {
    try {
      if (tokens.length === 0) {
        throw new Error('No tokens provided');
      }

      const message = {
        tokens,
        notification: {
          title,
          body
        },
        data: data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default',
            priority: 'high' as const
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body
              },
              badge: 1,
              sound: 'default'
            }
          }
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            requireInteraction: true
          }
        }
      };

      const response = await messaging.sendMulticast(message);

      logger.info(`Multicast push notification sent`, {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length,
        userId
      });

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(tokens, response.responses);
      }

      return {
        success: response.successCount > 0,
        messageId: `multicast-${Date.now()}`,
        provider: 'fcm',
        timestamp: new Date(),
        metadata: {
          successCount: response.successCount,
          failureCount: response.failureCount,
          totalTokens: tokens.length
        }
      };

    } catch (error: any) {
      logger.error('Error sending multicast push notification:', {
        error: error.message,
        tokenCount: tokens.length,
        userId
      });

      return {
        success: false,
        error: error.message,
        provider: 'fcm',
        timestamp: new Date()
      };
    }
  }

  async subscribeToTopic(tokens: string | string[], topic: string): Promise<void> {
    try {
      await messaging.subscribeToTopic(
        Array.isArray(tokens) ? tokens : [tokens],
        topic
      );

      logger.info(`Subscribed tokens to topic`, {
        topic,
        tokenCount: Array.isArray(tokens) ? tokens.length : 1
      });
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string | string[], topic: string): Promise<void> {
    try {
      await messaging.unsubscribeFromTopic(
        Array.isArray(tokens) ? tokens : [tokens],
        topic
      );

      logger.info(`Unsubscribed tokens from topic`, {
        topic,
        tokenCount: Array.isArray(tokens) ? tokens.length : 1
      });
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Try to send a dry-run message to validate the token
      await messaging.send({
        token,
        notification: {
          title: 'Test',
          body: 'Test'
        }
      }, true); // dry-run = true

      return true;
    } catch (error) {
      return false;
    }
  }

  private buildFCMMessage(message: PushMessage): any {
    const baseMessage = {
      notification: {
        title: message.title,
        body: message.body,
        imageUrl: message.imageUrl
      },
      data: message.data || {},
      android: {
        notification: {
          icon: message.icon || 'ic_notification',
          color: message.color || '#FF6B35',
          sound: message.sound || 'default',
          priority: (message.priority || 'high') as 'high' | 'normal',
          channelId: message.channelId || 'default',
          tag: message.tag,
          clickAction: message.clickAction
        },
        data: message.data || {}
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: message.title,
              body: message.body
            },
            badge: message.badge || 1,
            sound: message.sound || 'default',
            category: message.category,
            'mutable-content': message.mutableContent ? 1 : 0
          }
        },
        fcmOptions: {
          imageUrl: message.imageUrl
        }
      },
      webpush: {
        notification: {
          title: message.title,
          body: message.body,
          icon: message.icon || '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          image: message.imageUrl,
          requireInteraction: message.requireInteraction || false,
          tag: message.tag,
          actions: message.actions
        },
        fcmOptions: {
          link: message.clickAction
        }
      }
    };

    // Add token or topic
    if (Array.isArray(message.tokens)) {
      return {
        ...baseMessage,
        tokens: message.tokens
      };
    } else if (message.tokens.startsWith('/topics/')) {
      return {
        ...baseMessage,
        topic: message.tokens.replace('/topics/', '')
      };
    } else {
      return {
        ...baseMessage,
        token: message.tokens
      };
    }
  }

  private async cleanupInvalidTokens(tokens: string[], responses: any[]): Promise<void> {
    try {
      const invalidTokens: string[] = [];

      responses.forEach((response, index) => {
        if (!response.success) {
          const error = response.error;
          if (error.code === 'messaging/registration-token-not-registered' ||
              error.code === 'messaging/invalid-registration-token') {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        logger.info(`Found ${invalidTokens.length} invalid tokens to cleanup`);

        // Here you would remove these tokens from your database
        // Implementation depends on your database structure
        for (const token of invalidTokens) {
          logger.info(`Cleaning up invalid token: ${token.substring(0, 20)}...`);
          // await this.removeTokenFromDatabase(token);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up invalid tokens:', error);
    }
  }

  async sendScheduledNotification(
    message: PushMessage,
    scheduleTime: Date
  ): Promise<MessageResult> {
    try {
      // FCM doesn't support scheduled sends directly
      // You would typically use a job queue or scheduler for this
      const delay = scheduleTime.getTime() - Date.now();

      if (delay <= 0) {
        return await this.sendPushNotification(message);
      }

      // Store in queue for later processing
      logger.info(`Scheduling push notification for ${scheduleTime}`, {
        delay,
        userId: message.userId
      });

      // This would typically be handled by your job queue
      setTimeout(async () => {
        await this.sendPushNotification(message);
      }, delay);

      return {
        success: true,
        messageId: `scheduled-${Date.now()}`,
        provider: 'fcm',
        timestamp: new Date(),
        scheduled: true,
        scheduleTime
      };

    } catch (error: any) {
      logger.error('Error scheduling push notification:', error);
      return {
        success: false,
        error: error.message,
        provider: 'fcm',
        timestamp: new Date()
      };
    }
  }
}