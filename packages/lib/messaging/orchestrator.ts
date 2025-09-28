import { db } from '../../../api/src/config/firebase';
import { logger } from '../../../api/src/utils/logger';
import {
  MessageRequest,
  MessageTemplate,
  MessageRecipient,
  MessageDelivery,
  MessageChannel,
  InboxMessage,
  NotificationPreferences,
  MessageProvider
} from './types';
import { renderEmail } from './renderers/email';
import { renderPush } from './renderers/push';
import { renderWhatsApp } from './renderers/whatsapp';
import { renderInApp } from './renderers/inapp';
import { sendEmail } from './providers/sendgrid';
import { sendPush } from './providers/fcm';
import { sendWhatsApp } from './providers/twilio';

export class MessageOrchestrator {
  private static instance: MessageOrchestrator;
  private providers: Map<string, MessageProvider> = new Map();
  private rateLimiters: Map<string, { requests: number; resetTime: number }> = new Map();

  private constructor() {
    this.loadProviders();
  }

  public static getInstance(): MessageOrchestrator {
    if (!MessageOrchestrator.instance) {
      MessageOrchestrator.instance = new MessageOrchestrator();
    }
    return MessageOrchestrator.instance;
  }

  private async loadProviders() {
    try {
      const providersSnapshot = await db.collection('messageProviders')
        .where('enabled', '==', true)
        .orderBy('priority', 'asc')
        .get();

      providersSnapshot.docs.forEach(doc => {
        const provider = doc.data() as MessageProvider;
        this.providers.set(provider.id, provider);
      });

      logger.info('Message providers loaded', { count: this.providers.size });
    } catch (error) {
      logger.error('Error loading message providers:', error);
    }
  }

  public async sendMessage(request: MessageRequest): Promise<string> {
    try {
      // Validate request
      if (!request.templateKey || !request.userId) {
        throw new Error('Missing required fields: templateKey, userId');
      }

      // Get template
      const template = await this.getTemplate(request.templateKey);
      if (!template || !template.isActive) {
        throw new Error(`Template not found or inactive: ${request.templateKey}`);
      }

      // Get recipient info
      const recipient = await this.getRecipient(request.userId);
      if (!recipient) {
        throw new Error(`Recipient not found: ${request.userId}`);
      }

      // Get notification preferences
      const preferences = await this.getNotificationPreferences(request.userId);

      // Determine channels to use
      const channels = await this.determineChannels(
        request.channels || template.channels,
        recipient,
        preferences,
        template.category
      );

      if (channels.length === 0) {
        logger.warn('No valid channels for message', {
          templateKey: request.templateKey,
          userId: request.userId
        });
        return '';
      }

      // Check rate limits
      await this.checkRateLimits(request.userId, channels);

      // Create delivery record
      const deliveryId = await this.createDeliveryRecord(request, channels);

      // Check quiet hours and scheduling
      const sendTime = await this.calculateSendTime(request, recipient, preferences);

      if (sendTime > new Date()) {
        // Schedule for later
        await this.scheduleMessage(deliveryId, sendTime);
        return deliveryId;
      }

      // Process immediately
      await this.processMessage(deliveryId, template, recipient, request, channels);

      return deliveryId;

    } catch (error) {
      logger.error('Error in message orchestrator:', error);
      throw error;
    }
  }

  private async getTemplate(templateKey: string): Promise<MessageTemplate | null> {
    try {
      const templateDoc = await db.collection('messageTemplates')
        .where('key', '==', templateKey)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (templateDoc.empty) {
        return null;
      }

      return templateDoc.docs[0].data() as MessageTemplate;
    } catch (error) {
      logger.error('Error fetching template:', error);
      return null;
    }
  }

  private async getRecipient(userId: string): Promise<MessageRecipient | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data()!;

      // Get FCM tokens
      const tokensSnapshot = await db.collection('fcmTokens')
        .where('userId', '==', userId)
        .where('active', '==', true)
        .get();

      const fcmTokens = tokensSnapshot.docs.map(doc => doc.data().token);

      return {
        userId,
        email: userData.email,
        phone: userData.phone,
        fcmTokens,
        whatsappNumber: userData.whatsappNumber,
        preferredChannel: userData.preferredChannel || 'email',
        timezone: userData.timezone || 'Europe/Rome',
        language: userData.language || 'it',
        unsubscribed: userData.unsubscribed || [],
        quietHours: userData.quietHours
      };
    } catch (error) {
      logger.error('Error fetching recipient:', error);
      return null;
    }
  }

  private async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const prefsDoc = await db.collection('notificationPreferences').doc(userId).get();

      if (!prefsDoc.exists) {
        // Return default preferences
        return {
          userId,
          email: { enabled: true, categories: [], frequency: 'immediate' },
          push: { enabled: true, categories: [] },
          whatsapp: { enabled: false, categories: [] },
          inapp: { enabled: true, categories: [] },
          marketing: { emailEnabled: true, pushEnabled: true, whatsappEnabled: false },
          updatedAt: new Date()
        };
      }

      return prefsDoc.data() as NotificationPreferences;
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  private async determineChannels(
    requestedChannels: MessageChannel[],
    recipient: MessageRecipient,
    preferences: NotificationPreferences | null,
    category: string
  ): Promise<MessageChannel[]> {
    const validChannels: MessageChannel[] = [];

    for (const channel of requestedChannels) {
      // Check if user is unsubscribed from this channel
      if (recipient.unsubscribed?.includes(channel)) {
        continue;
      }

      // Check preferences
      if (preferences) {
        const channelPrefs = preferences[channel];
        if (!channelPrefs?.enabled) {
          continue;
        }

        // Check category preferences for marketing messages
        if (category === 'marketing') {
          const marketingEnabled = preferences.marketing[`${channel}Enabled` as keyof typeof preferences.marketing];
          if (!marketingEnabled) {
            continue;
          }
        }
      }

      // Check if recipient has the required contact info
      switch (channel) {
        case 'email':
          if (recipient.email) validChannels.push(channel);
          break;
        case 'push':
          if (recipient.fcmTokens && recipient.fcmTokens.length > 0) validChannels.push(channel);
          break;
        case 'whatsapp':
          if (recipient.whatsappNumber) validChannels.push(channel);
          break;
        case 'sms':
          if (recipient.phone) validChannels.push(channel);
          break;
        case 'inapp':
          validChannels.push(channel); // Always available
          break;
      }
    }

    // Smart channel selection based on user preference and past engagement
    return this.optimizeChannelSelection(validChannels, recipient);
  }

  private async optimizeChannelSelection(
    channels: MessageChannel[],
    recipient: MessageRecipient
  ): Promise<MessageChannel[]> {
    // If preferred channel is available, prioritize it
    if (recipient.preferredChannel && channels.includes(recipient.preferredChannel)) {
      return [recipient.preferredChannel, ...channels.filter(c => c !== recipient.preferredChannel)];
    }

    // TODO: Implement machine learning-based channel optimization
    // For now, return channels in priority order
    const priority: MessageChannel[] = ['inapp', 'push', 'email', 'whatsapp', 'sms'];
    return channels.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  }

  private async checkRateLimits(userId: string, channels: MessageChannel[]): Promise<void> {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window

    for (const channel of channels) {
      const key = `${userId}:${channel}`;
      const limiter = this.rateLimiters.get(key);

      if (limiter) {
        if (now > limiter.resetTime) {
          // Reset window
          this.rateLimiters.set(key, { requests: 1, resetTime: now + windowMs });
        } else {
          // Check limit (adjust per channel)
          const limit = this.getChannelRateLimit(channel);
          if (limiter.requests >= limit) {
            throw new Error(`Rate limit exceeded for channel ${channel}`);
          }
          limiter.requests++;
        }
      } else {
        this.rateLimiters.set(key, { requests: 1, resetTime: now + windowMs });
      }
    }
  }

  private getChannelRateLimit(channel: MessageChannel): number {
    const limits = {
      email: 50,    // 50 emails per hour
      push: 100,    // 100 push notifications per hour
      whatsapp: 10, // 10 WhatsApp messages per hour
      sms: 20,      // 20 SMS per hour
      inapp: 200    // 200 in-app messages per hour
    };
    return limits[channel] || 10;
  }

  private async calculateSendTime(
    request: MessageRequest,
    recipient: MessageRecipient,
    preferences: NotificationPreferences | null
  ): Promise<Date> {
    let sendTime = request.scheduledAt || new Date();

    // Check quiet hours
    if (preferences && this.isInQuietHours(sendTime, recipient, preferences)) {
      sendTime = this.getNextSendTime(sendTime, recipient, preferences);
    }

    // Handle urgent messages (skip quiet hours)
    if (request.priority === 'urgent') {
      sendTime = new Date();
    }

    return sendTime;
  }

  private isInQuietHours(
    time: Date,
    recipient: MessageRecipient,
    preferences: NotificationPreferences
  ): boolean {
    // Simplified quiet hours check
    // In reality, you'd need proper timezone handling
    const hour = time.getHours();

    // Default quiet hours: 22:00 - 08:00
    const quietStart = 22;
    const quietEnd = 8;

    return hour >= quietStart || hour < quietEnd;
  }

  private getNextSendTime(
    time: Date,
    recipient: MessageRecipient,
    preferences: NotificationPreferences
  ): Date {
    const nextDay = new Date(time);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(8, 0, 0, 0); // Send at 8 AM next day
    return nextDay;
  }

  private async createDeliveryRecord(
    request: MessageRequest,
    channels: MessageChannel[]
  ): Promise<string> {
    const deliveryRef = db.collection('messageDeliveries').doc();

    const delivery: Omit<MessageDelivery, 'id'> = {
      templateKey: request.templateKey,
      userId: request.userId,
      channels,
      variables: request.variables,
      status: 'pending',
      scheduledAt: request.scheduledAt,
      priority: request.priority || 'medium',
      metadata: request.metadata || {},
      tags: request.tags || [],
      statuses: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await deliveryRef.set({ id: deliveryRef.id, ...delivery });
    return deliveryRef.id;
  }

  private async scheduleMessage(deliveryId: string, sendTime: Date): Promise<void> {
    // Add to message queue for delayed processing
    await db.collection('messageQueue').doc().set({
      deliveryId,
      scheduledAt: sendTime,
      status: 'scheduled',
      createdAt: new Date()
    });

    logger.info('Message scheduled', { deliveryId, sendTime });
  }

  private async processMessage(
    deliveryId: string,
    template: MessageTemplate,
    recipient: MessageRecipient,
    request: MessageRequest,
    channels: MessageChannel[]
  ): Promise<void> {
    const results: any[] = [];

    // Update delivery status
    await db.collection('messageDeliveries').doc(deliveryId).update({
      status: 'processing',
      updatedAt: new Date()
    });

    for (const channel of channels) {
      try {
        const result = await this.sendToChannel(
          channel,
          template,
          recipient,
          request.variables,
          deliveryId
        );
        results.push({ channel, success: true, result });

        // Always create inbox message
        await this.createInboxMessage(
          template,
          recipient,
          request.variables,
          channel,
          deliveryId
        );

      } catch (error) {
        logger.error(`Error sending to channel ${channel}:`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    // Update delivery status
    const hasSuccess = results.some(r => r.success);
    await db.collection('messageDeliveries').doc(deliveryId).update({
      status: hasSuccess ? 'sent' : 'failed',
      sentAt: hasSuccess ? new Date() : null,
      failedAt: hasSuccess ? null : new Date(),
      failureReason: hasSuccess ? null : 'All channels failed',
      updatedAt: new Date()
    });

    logger.info('Message processed', { deliveryId, results });
  }

  private async sendToChannel(
    channel: MessageChannel,
    template: MessageTemplate,
    recipient: MessageRecipient,
    variables: Record<string, any>,
    deliveryId: string
  ): Promise<any> {
    switch (channel) {
      case 'email':
        if (!template.content.email) throw new Error('Email content not found');
        const emailContent = await renderEmail(template.content.email, variables);
        return await sendEmail({
          to: recipient.email!,
          from: emailContent.from,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        }, deliveryId);

      case 'push':
        if (!template.content.push) throw new Error('Push content not found');
        const pushContent = await renderPush(template.content.push, variables);
        return await sendPush(recipient.fcmTokens!, pushContent, deliveryId);

      case 'whatsapp':
        if (!template.content.whatsapp) throw new Error('WhatsApp content not found');
        const whatsappContent = await renderWhatsApp(template.content.whatsapp, variables);
        return await sendWhatsApp(recipient.whatsappNumber!, whatsappContent, deliveryId);

      case 'inapp':
        // In-app messages are handled by inbox creation
        return { success: true, method: 'inbox' };

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  private async createInboxMessage(
    template: MessageTemplate,
    recipient: MessageRecipient,
    variables: Record<string, any>,
    channel: MessageChannel,
    deliveryId: string
  ): Promise<void> {
    try {
      // Render in-app content or fallback to basic content
      let content = template.content.inapp || {
        title: template.name,
        message: 'Hai ricevuto un nuovo messaggio',
        type: 'info' as const,
        dismissible: true,
        priority: 'medium' as const
      };

      const renderedContent = await renderInApp(content, variables);

      const inboxMessage: Omit<InboxMessage, 'id'> = {
        userId: recipient.userId,
        type: this.mapCategoryToType(template.category),
        title: renderedContent.title,
        content: renderedContent.message,
        summary: renderedContent.message.substring(0, 100),
        read: false,
        archived: false,
        starred: false,
        channel,
        templateKey: template.key,
        priority: renderedContent.priority,
        category: template.category,
        tags: [],
        metadata: {
          deliveryId,
          variables,
          templateId: template.id
        },
        attachments: [],
        actions: renderedContent.action ? [{
          id: 'main_action',
          label: renderedContent.action.label,
          type: renderedContent.action.deepLink ? 'deep_link' : 'link',
          url: renderedContent.action.url,
          deepLink: renderedContent.action.deepLink,
          style: 'primary',
          completed: false
        }] : [],
        expiresAt: renderedContent.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const inboxRef = db.collection('inbox').doc(recipient.userId).collection('messages').doc();
      await inboxRef.set({ id: inboxRef.id, ...inboxMessage });

      logger.info('Inbox message created', {
        userId: recipient.userId,
        messageId: inboxRef.id,
        templateKey: template.key
      });

    } catch (error) {
      logger.error('Error creating inbox message:', error);
    }
  }

  private mapCategoryToType(category: string): InboxMessage['type'] {
    const mapping = {
      'onboarding': 'system',
      'transactional': 'transactional',
      'marketing': 'marketing',
      'health': 'health',
      'emergency': 'system'
    };
    return mapping[category as keyof typeof mapping] || 'system';
  }

  // Public method for processing scheduled messages (called by cron job)
  public async processScheduledMessages(): Promise<void> {
    try {
      const now = new Date();
      const scheduledSnapshot = await db.collection('messageQueue')
        .where('status', '==', 'scheduled')
        .where('scheduledAt', '<=', now)
        .limit(100)
        .get();

      const promises = scheduledSnapshot.docs.map(async (doc) => {
        const queueItem = doc.data();

        try {
          // Get delivery record
          const deliveryDoc = await db.collection('messageDeliveries')
            .doc(queueItem.deliveryId)
            .get();

          if (!deliveryDoc.exists) {
            throw new Error('Delivery record not found');
          }

          const delivery = deliveryDoc.data() as MessageDelivery;

          // Get template and recipient
          const template = await this.getTemplate(delivery.templateKey);
          const recipient = await this.getRecipient(delivery.userId);

          if (!template || !recipient) {
            throw new Error('Template or recipient not found');
          }

          // Process the message
          await this.processMessage(
            delivery.id,
            template,
            recipient,
            {
              templateKey: delivery.templateKey,
              userId: delivery.userId,
              variables: delivery.variables
            },
            delivery.channels
          );

          // Mark queue item as processed
          await doc.ref.update({
            status: 'processed',
            processedAt: new Date()
          });

        } catch (error) {
          logger.error('Error processing scheduled message:', error);

          // Mark as failed
          await doc.ref.update({
            status: 'failed',
            failedAt: new Date(),
            failureReason: error.message
          });
        }
      });

      await Promise.all(promises);

      logger.info('Processed scheduled messages', { count: scheduledSnapshot.size });

    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    }
  }

  // Public method for updating channel preferences based on engagement
  public async updateChannelPreferences(
    userId: string,
    channel: MessageChannel,
    engagement: 'opened' | 'clicked' | 'ignored'
  ): Promise<void> {
    try {
      // Simple engagement-based learning
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (engagement === 'clicked' || engagement === 'opened') {
        // Increase preference for this channel
        await db.collection('users').doc(userId).update({
          preferredChannel: channel,
          updatedAt: new Date()
        });
      }

      logger.info('Channel preference updated', { userId, channel, engagement });

    } catch (error) {
      logger.error('Error updating channel preferences:', error);
    }
  }
}