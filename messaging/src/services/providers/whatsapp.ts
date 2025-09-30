import axios from 'axios';
import { logger } from '../../utils/logger';
import { WhatsAppMessage, MessageResult } from '../../types/messages';

export class WhatsAppProvider {
  private static instance: WhatsAppProvider;
  private apiUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.apiUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  }

  public static getInstance(): WhatsAppProvider {
    if (!WhatsAppProvider.instance) {
      WhatsAppProvider.instance = new WhatsAppProvider();
    }
    return WhatsAppProvider.instance;
  }

  async sendMessage(message: WhatsAppMessage): Promise<MessageResult> {
    try {
      const payload = this.buildMessagePayload(message);

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp message sent successfully to ${message.recipient}`, {
        messageId: response.data.messages[0].id,
        userId: message.userId
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        provider: 'whatsapp',
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error sending WhatsApp message:', {
        error: error.response?.data || error.message,
        recipient: message.recipient,
        userId: message.userId
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        provider: 'whatsapp',
        timestamp: new Date()
      };
    }
  }

  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    // WhatsApp Business API has rate limits, so we process sequentially with delays
    for (const message of messages) {
      try {
        const result = await this.sendMessage(message);
        results.push({
          ...result,
          recipient: message.recipient
        });

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          provider: 'whatsapp',
          timestamp: new Date(),
          recipient: message.recipient
        });
      }
    }

    return results;
  }

  async sendTemplateMessage(
    recipient: string,
    templateName: string,
    languageCode: string,
    parameters: any[],
    userId?: string
  ): Promise<MessageResult> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(recipient),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }
          ] : undefined
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp template message sent successfully to ${recipient}`, {
        messageId: response.data.messages[0].id,
        template: templateName,
        userId
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        provider: 'whatsapp',
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error sending WhatsApp template message:', {
        error: error.response?.data || error.message,
        recipient,
        template: templateName,
        userId
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        provider: 'whatsapp',
        timestamp: new Date()
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<any> {
    try {
      // WhatsApp Business API doesn't provide a direct endpoint to get message status
      // Status updates are received via webhooks
      logger.info(`Checking delivery status for WhatsApp message: ${messageId}`);
      return { status: 'unknown', message: 'Use webhooks for delivery status' };
    } catch (error: any) {
      logger.error('Error getting WhatsApp delivery status:', error.message);
      throw error;
    }
  }

  async handleWebhook(webhookData: any): Promise<void> {
    try {
      if (webhookData.object === 'whatsapp_business_account') {
        for (const entry of webhookData.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await this.processMessageWebhook(change.value);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error processing WhatsApp webhook:', error);
    }
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{ valid: boolean; formatted?: string }> {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);

      // Basic validation - in production you might want to use a phone validation service
      const isValid = /^\+[1-9]\d{1,14}$/.test(formatted);

      return {
        valid: isValid,
        formatted: isValid ? formatted : undefined
      };
    } catch (error) {
      return { valid: false };
    }
  }

  private buildMessagePayload(message: WhatsAppMessage): any {
    const basePayload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(message.recipient)
    };

    switch (message.messageType) {
      case 'text':
        return {
          ...basePayload,
          type: 'text',
          text: {
            body: message.text,
            preview_url: message.previewUrl || false
          }
        };

      case 'image':
        return {
          ...basePayload,
          type: 'image',
          image: {
            link: message.mediaUrl,
            caption: message.caption
          }
        };

      case 'document':
        return {
          ...basePayload,
          type: 'document',
          document: {
            link: message.mediaUrl,
            caption: message.caption,
            filename: message.filename
          }
        };

      case 'interactive':
        return {
          ...basePayload,
          type: 'interactive',
          interactive: message.interactive
        };

      default:
        throw new Error(`Unsupported message type: ${message.messageType}`);
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming Italy +39)
    if (cleaned.length === 10 && !cleaned.startsWith('39')) {
      return `39${cleaned}`;
    }

    // Remove + if present (WhatsApp API expects without +)
    return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  }

  private async processMessageWebhook(webhookValue: any): Promise<void> {
    try {
      // Process incoming messages
      if (webhookValue.messages) {
        for (const message of webhookValue.messages) {
          logger.info('Received WhatsApp message:', {
            messageId: message.id,
            from: message.from,
            type: message.type,
            timestamp: message.timestamp
          });

          // Handle incoming message based on type
          await this.handleIncomingMessage(message, webhookValue.contacts[0]);
        }
      }

      // Process message status updates
      if (webhookValue.statuses) {
        for (const status of webhookValue.statuses) {
          logger.info('WhatsApp message status update:', {
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp
          });

          await this.storeDeliveryStatus(status);
        }
      }
    } catch (error) {
      logger.error('Error processing WhatsApp webhook value:', error);
    }
  }

  private async handleIncomingMessage(message: any, contact: any): Promise<void> {
    try {
      // Store incoming message and potentially trigger automated responses
      logger.info('Processing incoming WhatsApp message:', {
        messageId: message.id,
        from: message.from,
        contact: contact.profile.name
      });

      // Here you would implement logic to:
      // 1. Store the message in your database
      // 2. Check for automated response triggers
      // 3. Route to appropriate handlers (customer service, etc.)
    } catch (error) {
      logger.error('Error handling incoming WhatsApp message:', error);
    }
  }

  private async storeDeliveryStatus(status: any): Promise<void> {
    try {
      // Store delivery status in database
      logger.info('Storing WhatsApp delivery status:', status);
    } catch (error) {
      logger.error('Error storing WhatsApp delivery status:', error);
    }
  }

  async getTemplates(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.data;
    } catch (error: any) {
      logger.error('Error getting WhatsApp templates:', error.response?.data || error.message);
      return [];
    }
  }
}