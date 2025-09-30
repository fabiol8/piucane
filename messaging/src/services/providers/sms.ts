import twilio from 'twilio';
import { logger } from '../../utils/logger';
import { SMSMessage, MessageResult } from '../../types/messages';

export class SMSProvider {
  private static instance: SMSProvider;
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  public static getInstance(): SMSProvider {
    if (!SMSProvider.instance) {
      SMSProvider.instance = new SMSProvider();
    }
    return SMSProvider.instance;
  }

  async sendSMS(message: SMSMessage): Promise<MessageResult> {
    try {
      const twilioMessage = await this.client.messages.create({
        body: message.text,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: this.formatPhoneNumber(message.recipient),
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
      });

      logger.info(`SMS sent successfully to ${message.recipient}`, {
        messageId: twilioMessage.sid,
        userId: message.userId
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        provider: 'twilio',
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error sending SMS:', {
        error: error.message,
        recipient: message.recipient,
        userId: message.userId
      });

      return {
        success: false,
        error: error.message,
        provider: 'twilio',
        timestamp: new Date()
      };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    // Twilio doesn't have a native bulk SMS API, so we send them individually
    // with rate limiting to avoid hitting limits
    for (const message of messages) {
      try {
        const result = await this.sendSMS(message);
        results.push({
          ...result,
          recipient: message.recipient
        });

        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          provider: 'twilio',
          timestamp: new Date(),
          recipient: message.recipient
        });
      }
    }

    return results;
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{ valid: boolean; formatted?: string }> {
    try {
      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();

      return {
        valid: true,
        formatted: lookup.phoneNumber
      };
    } catch (error) {
      logger.warn(`Invalid phone number: ${phoneNumber}`);
      return { valid: false };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<any> {
    try {
      const message = await this.client.messages(messageId).fetch();

      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };
    } catch (error: any) {
      logger.error('Error getting SMS delivery status:', error.message);
      throw error;
    }
  }

  async handleWebhook(webhookData: any): Promise<void> {
    try {
      logger.info('Processing Twilio webhook event:', {
        messageId: webhookData.MessageSid,
        status: webhookData.MessageStatus,
        to: webhookData.To,
        from: webhookData.From
      });

      // Store delivery status in database
      await this.storeDeliveryStatus(webhookData);
    } catch (error) {
      logger.error('Error processing Twilio webhook:', error);
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming Italy +39)
    if (cleaned.length === 10 && !cleaned.startsWith('39')) {
      return `+39${cleaned}`;
    }

    // Add + if missing
    if (!phoneNumber.startsWith('+')) {
      return `+${cleaned}`;
    }

    return phoneNumber;
  }

  private async storeDeliveryStatus(webhookData: any): Promise<void> {
    try {
      // Store delivery status in database
      logger.info('Storing SMS delivery status:', webhookData);
    } catch (error) {
      logger.error('Error storing SMS delivery status:', error);
    }
  }

  async getOptOutList(): Promise<string[]> {
    try {
      // Get opt-out list from Twilio
      const optOuts = await this.client.messaging.v1.services(
        process.env.TWILIO_MESSAGING_SERVICE_SID!
      ).usBindings.list();

      return optOuts
        .filter(binding => binding.binding.endsWith('opt_out'))
        .map(binding => binding.identity);
    } catch (error) {
      logger.error('Error getting opt-out list:', error);
      return [];
    }
  }

  async addToOptOutList(phoneNumber: string): Promise<void> {
    try {
      // Add to opt-out list
      logger.info(`Adding ${phoneNumber} to SMS opt-out list`);
      // Implementation would depend on your opt-out management system
    } catch (error) {
      logger.error('Error adding to opt-out list:', error);
    }
  }
}