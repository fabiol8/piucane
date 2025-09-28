import admin from 'firebase-admin';

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, string>;
  clickAction?: string;
}

export interface PushTemplate {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

export class PushService {
  async sendToToken(token: string, notification: PushNotification): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: notification.data,
        webpush: {
          notification: {
            icon: notification.icon,
            badge: notification.badge,
            actions: notification.clickAction ? [{
              action: 'default',
              title: 'Apri'
            }] : undefined
          }
        }
      };

      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  async sendToTopic(topic: string, notification: PushNotification): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: notification.data
      };

      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending push notification to topic:', error);
      throw error;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw error;
    }
  }
}