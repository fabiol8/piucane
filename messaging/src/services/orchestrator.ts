import { EmailProvider } from './providers/email';
import { SMSProvider } from './providers/sms';
import { WhatsAppProvider } from './providers/whatsapp';
import { PushProvider } from './providers/push';
import { TemplateEngine } from './template-engine';
import { AudienceManager } from './audience-manager';
import { db } from '../config/firebase';
import { addToQueue, getFromQueue } from '../config/redis';
import { logger } from '../utils/logger';
import {
  BaseMessage,
  EmailMessage,
  SMSMessage,
  WhatsAppMessage,
  PushMessage,
  MessageResult,
  Campaign,
  UserPreferences
} from '../types/messages';

export class MessageOrchestrator {
  private static instance: MessageOrchestrator;
  private emailProvider: EmailProvider;
  private smsProvider: SMSProvider;
  private whatsappProvider: WhatsAppProvider;
  private pushProvider: PushProvider;
  private templateEngine: TemplateEngine;
  private audienceManager: AudienceManager;

  constructor() {
    this.emailProvider = EmailProvider.getInstance();
    this.smsProvider = SMSProvider.getInstance();
    this.whatsappProvider = WhatsAppProvider.getInstance();
    this.pushProvider = PushProvider.getInstance();
    this.templateEngine = TemplateEngine.getInstance();
    this.audienceManager = AudienceManager.getInstance();
  }

  public static getInstance(): MessageOrchestrator {
    if (!MessageOrchestrator.instance) {
      MessageOrchestrator.instance = new MessageOrchestrator();
    }
    return MessageOrchestrator.instance;
  }

  async sendMessage(
    type: 'email' | 'sms' | 'whatsapp' | 'push',
    message: BaseMessage,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      respectPreferences?: boolean;
      scheduledTime?: Date;
    }
  ): Promise<MessageResult> {
    try {
      // Check user preferences if requested
      if (options?.respectPreferences) {
        const preferences = await this.getUserPreferences(message.userId);
        if (!this.shouldSendMessage(type, message, preferences)) {
          return {
            success: false,
            error: 'Message blocked by user preferences',
            provider: type as any,
            timestamp: new Date()
          };
        }
      }

      // Handle scheduled messages
      if (options?.scheduledTime && options.scheduledTime > new Date()) {
        return await this.scheduleMessage(type, message, options.scheduledTime);
      }

      // Add to queue for processing
      const priority = this.getPriorityScore(options?.priority || 'normal');
      await addToQueue('messages', {
        type,
        message,
        options
      }, priority);

      return {
        success: true,
        messageId: `queued-${Date.now()}`,
        provider: type as any,
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error in message orchestrator:', error);
      return {
        success: false,
        error: error.message,
        provider: type as any,
        timestamp: new Date()
      };
    }
  }

  async sendBulkMessages(
    type: 'email' | 'sms' | 'whatsapp' | 'push',
    messages: BaseMessage[],
    options?: {
      batchSize?: number;
      respectPreferences?: boolean;
      scheduledTime?: Date;
    }
  ): Promise<MessageResult[]> {
    try {
      const batchSize = options?.batchSize || 100;
      const results: MessageResult[] = [];

      // Filter messages based on preferences if requested
      let filteredMessages = messages;
      if (options?.respectPreferences) {
        filteredMessages = await this.filterMessagesByPreferences(type, messages);
      }

      // Process in batches
      for (let i = 0; i < filteredMessages.length; i += batchSize) {
        const batch = filteredMessages.slice(i, i + batchSize);

        if (options?.scheduledTime && options.scheduledTime > new Date()) {
          // Schedule the batch
          for (const message of batch) {
            const result = await this.scheduleMessage(type, message, options.scheduledTime);
            results.push(result);
          }
        } else {
          // Add batch to queue
          for (const message of batch) {
            await addToQueue('messages', {
              type,
              message,
              options: { ...options, scheduledTime: undefined }
            });

            results.push({
              success: true,
              messageId: `queued-${Date.now()}-${i}`,
              provider: type as any,
              timestamp: new Date()
            });
          }
        }

        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return results;

    } catch (error: any) {
      logger.error('Error in bulk message orchestrator:', error);
      return messages.map(() => ({
        success: false,
        error: error.message,
        provider: type as any,
        timestamp: new Date()
      }));
    }
  }

  async sendCampaign(campaign: Campaign): Promise<{ success: boolean; results: MessageResult[] }> {
    try {
      logger.info(`Starting campaign: ${campaign.name}`, { campaignId: campaign.id });

      // Get audience
      const audience = await this.audienceManager.getAudience(campaign.audience);
      logger.info(`Campaign audience size: ${audience.length}`);

      const allResults: MessageResult[] = [];

      // Send to each channel
      for (const [channel, content] of Object.entries(campaign.content.channels)) {
        if (!content) continue;

        const channelResults = await this.sendCampaignChannel(
          channel as 'email' | 'sms' | 'whatsapp' | 'push',
          content,
          audience,
          campaign
        );

        allResults.push(...channelResults);
      }

      // Update campaign status
      if (campaign.id) {
        await db.collection('campaigns').doc(campaign.id).update({
          status: 'completed',
          completedAt: new Date(),
          results: {
            totalSent: allResults.filter(r => r.success).length,
            totalFailed: allResults.filter(r => !r.success).length,
            channels: this.aggregateResultsByChannel(allResults)
          }
        });
      }

      return {
        success: true,
        results: allResults
      };

    } catch (error: any) {
      logger.error('Error sending campaign:', error);

      if (campaign.id) {
        await db.collection('campaigns').doc(campaign.id).update({
          status: 'cancelled',
          error: error.message,
          cancelledAt: new Date()
        });
      }

      return {
        success: false,
        results: []
      };
    }
  }

  async processMessageQueue(): Promise<void> {
    try {
      const messages = await getFromQueue('messages', 10);

      for (const item of messages) {
        try {
          const { type, message, options } = item.data;
          await this.processMessage(type, message, options);
        } catch (error) {
          logger.error('Error processing queued message:', error);
        }
      }
    } catch (error) {
      logger.error('Error processing message queue:', error);
    }
  }

  private async processMessage(
    type: 'email' | 'sms' | 'whatsapp' | 'push',
    message: BaseMessage,
    options?: any
  ): Promise<MessageResult> {
    try {
      let result: MessageResult;

      switch (type) {
        case 'email':
          result = await this.emailProvider.sendEmail(message as EmailMessage);
          break;

        case 'sms':
          result = await this.smsProvider.sendSMS(message as SMSMessage);
          break;

        case 'whatsapp':
          result = await this.whatsappProvider.sendMessage(message as WhatsAppMessage);
          break;

        case 'push':
          result = await this.pushProvider.sendPushNotification(message as PushMessage);
          break;

        default:
          throw new Error(`Unsupported message type: ${type}`);
      }

      // Store message result
      await this.storeMessageResult(type, message, result);

      return result;

    } catch (error: any) {
      logger.error(`Error processing ${type} message:`, error);

      const result: MessageResult = {
        success: false,
        error: error.message,
        provider: type as any,
        timestamp: new Date()
      };

      await this.storeMessageResult(type, message, result);
      return result;
    }
  }

  private async sendCampaignChannel(
    channel: 'email' | 'sms' | 'whatsapp' | 'push',
    content: any,
    audience: any[],
    campaign: Campaign
  ): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    for (const user of audience) {
      try {
        const personalizedContent = await this.templateEngine.renderTemplate(
          content,
          user,
          channel
        );

        let message: BaseMessage;

        switch (channel) {
          case 'email':
            message = {
              userId: user.id,
              campaignId: campaign.id,
              recipient: user.email,
              subject: personalizedContent.subject,
              html: personalizedContent.html,
              text: personalizedContent.text
            } as EmailMessage;
            break;

          case 'sms':
            message = {
              userId: user.id,
              campaignId: campaign.id,
              recipient: user.phone,
              text: personalizedContent.text
            } as SMSMessage;
            break;

          case 'whatsapp':
            if (content.templateName) {
              const result = await this.whatsappProvider.sendTemplateMessage(
                user.phone,
                content.templateName,
                content.languageCode || 'it',
                content.parameters || [],
                user.id
              );
              results.push(result);
              continue;
            } else {
              message = {
                userId: user.id,
                campaignId: campaign.id,
                recipient: user.phone,
                messageType: 'text',
                text: personalizedContent.text
              } as WhatsAppMessage;
            }
            break;

          case 'push':
            const tokens = await this.getUserPushTokens(user.id);
            if (tokens.length === 0) continue;

            message = {
              userId: user.id,
              campaignId: campaign.id,
              tokens,
              title: personalizedContent.title,
              body: personalizedContent.body,
              data: personalizedContent.data,
              imageUrl: personalizedContent.imageUrl,
              clickAction: personalizedContent.clickAction
            } as PushMessage;
            break;

          default:
            continue;
        }

        const result = await this.processMessage(channel, message);
        results.push(result);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error: any) {
        logger.error(`Error sending ${channel} message in campaign:`, error);
        results.push({
          success: false,
          error: error.message,
          provider: channel as any,
          timestamp: new Date(),
          recipient: user.email || user.phone || user.id
        });
      }
    }

    return results;
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const doc = await db.collection('userPreferences').doc(userId).get();
      return doc.exists ? doc.data() as UserPreferences : null;
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return null;
    }
  }

  private shouldSendMessage(
    type: 'email' | 'sms' | 'whatsapp' | 'push',
    message: BaseMessage,
    preferences: UserPreferences | null
  ): boolean {
    if (!preferences) return true;

    const channelPrefs = preferences[type];
    if (!channelPrefs?.enabled) return false;

    if (message.type === 'promotional' && !channelPrefs.promotional) return false;
    if (message.type === 'transactional' && !channelPrefs.transactional) return false;

    // Check quiet hours for push notifications
    if (type === 'push' && channelPrefs.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (currentTime >= channelPrefs.quietHours.start && currentTime <= channelPrefs.quietHours.end) {
        return false;
      }
    }

    return true;
  }

  private async filterMessagesByPreferences(
    type: 'email' | 'sms' | 'whatsapp' | 'push',
    messages: BaseMessage[]
  ): Promise<BaseMessage[]> {
    const filtered: BaseMessage[] = [];

    for (const message of messages) {
      const preferences = await this.getUserPreferences(message.userId);
      if (this.shouldSendMessage(type, message, preferences)) {
        filtered.push(message);
      }
    }

    return filtered;
  }

  private async scheduleMessage(
    type: 'email' | 'sms' | 'whatsapp' | 'push',
    message: BaseMessage,
    scheduledTime: Date
  ): Promise<MessageResult> {
    try {
      // Store scheduled message
      await db.collection('scheduledMessages').add({
        type,
        message,
        scheduledTime,
        status: 'scheduled',
        createdAt: new Date()
      });

      return {
        success: true,
        messageId: `scheduled-${Date.now()}`,
        provider: type as any,
        timestamp: new Date(),
        scheduled: true,
        scheduleTime: scheduledTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: type as any,
        timestamp: new Date()
      };
    }
  }

  private async getUserPushTokens(userId: string): Promise<string[]> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      return userData?.fcmTokens || [];
    } catch (error) {
      logger.error('Error getting user push tokens:', error);
      return [];
    }
  }

  private async storeMessageResult(
    type: string,
    message: BaseMessage,
    result: MessageResult
  ): Promise<void> {
    try {
      await db.collection('messageResults').add({
        type,
        userId: message.userId,
        campaignId: message.campaignId,
        messageId: result.messageId,
        success: result.success,
        error: result.error,
        provider: result.provider,
        timestamp: result.timestamp,
        metadata: result.metadata
      });
    } catch (error) {
      logger.error('Error storing message result:', error);
    }
  }

  private getPriorityScore(priority: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high': return 100;
      case 'normal': return 50;
      case 'low': return 10;
      default: return 50;
    }
  }

  private aggregateResultsByChannel(results: MessageResult[]): any {
    const aggregated: any = {};

    for (const result of results) {
      if (!aggregated[result.provider]) {
        aggregated[result.provider] = {
          sent: 0,
          failed: 0
        };
      }

      if (result.success) {
        aggregated[result.provider].sent++;
      } else {
        aggregated[result.provider].failed++;
      }
    }

    return aggregated;
  }

  async getMessageStats(
    userId?: string,
    campaignId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      let query = db.collection('messageResults');

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      if (campaignId) {
        query = query.where('campaignId', '==', campaignId);
      }

      if (startDate) {
        query = query.where('timestamp', '>=', startDate);
      }

      if (endDate) {
        query = query.where('timestamp', '<=', endDate);
      }

      const snapshot = await query.get();
      const results = snapshot.docs.map(doc => doc.data());

      return this.aggregateStats(results);

    } catch (error) {
      logger.error('Error getting message stats:', error);
      return {};
    }
  }

  private aggregateStats(results: any[]): any {
    const stats = {
      total: results.length,
      successful: 0,
      failed: 0,
      byProvider: {} as any,
      byType: {} as any
    };

    for (const result of results) {
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      // By provider
      if (!stats.byProvider[result.provider]) {
        stats.byProvider[result.provider] = { sent: 0, failed: 0 };
      }

      if (result.success) {
        stats.byProvider[result.provider].sent++;
      } else {
        stats.byProvider[result.provider].failed++;
      }

      // By type
      if (!stats.byType[result.type]) {
        stats.byType[result.type] = { sent: 0, failed: 0 };
      }

      if (result.success) {
        stats.byType[result.type].sent++;
      } else {
        stats.byType[result.type].failed++;
      }
    }

    return stats;
  }
}