import sgMail from '@sendgrid/mail';
import { logger } from '../../utils/logger';
import { EmailMessage, MessageResult } from '../../types/messages';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class EmailProvider {
  private static instance: EmailProvider;

  public static getInstance(): EmailProvider {
    if (!EmailProvider.instance) {
      EmailProvider.instance = new EmailProvider();
    }
    return EmailProvider.instance;
  }

  async sendEmail(message: EmailMessage): Promise<MessageResult> {
    try {
      const msg = {
        to: message.recipient,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@piucane.it',
          name: process.env.SENDGRID_FROM_NAME || 'PiùCane'
        },
        subject: message.subject,
        html: message.html,
        text: message.text,
        templateId: message.templateId,
        dynamicTemplateData: message.templateData,
        categories: message.categories || ['piucane'],
        customArgs: {
          userId: message.userId,
          campaignId: message.campaignId || '',
          messageType: message.type || 'transactional'
        },
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true
          },
          openTracking: {
            enable: true
          },
          subscriptionTracking: {
            enable: true
          }
        }
      };

      // Add reply-to if specified
      if (message.replyTo) {
        (msg as any).replyTo = message.replyTo;
      }

      // Add attachments if any
      if (message.attachments && message.attachments.length > 0) {
        (msg as any).attachments = message.attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type,
          disposition: att.disposition || 'attachment'
        }));
      }

      const response = await sgMail.send(msg);

      logger.info(`Email sent successfully to ${message.recipient}`, {
        messageId: response[0].headers['x-message-id'],
        userId: message.userId
      });

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid',
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Error sending email:', {
        error: error.message,
        recipient: message.recipient,
        userId: message.userId
      });

      return {
        success: false,
        error: error.message,
        provider: 'sendgrid',
        timestamp: new Date()
      };
    }
  }

  async sendBulkEmails(messages: EmailMessage[]): Promise<MessageResult[]> {
    try {
      const bulkMessages = messages.map(message => ({
        to: message.recipient,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@piucane.it',
          name: process.env.SENDGRID_FROM_NAME || 'PiùCane'
        },
        subject: message.subject,
        html: message.html,
        text: message.text,
        templateId: message.templateId,
        dynamicTemplateData: message.templateData,
        categories: message.categories || ['piucane'],
        customArgs: {
          userId: message.userId,
          campaignId: message.campaignId || '',
          messageType: message.type || 'transactional'
        }
      }));

      const response = await sgMail.send(bulkMessages);

      return response.map((res, index) => ({
        success: true,
        messageId: res.headers['x-message-id'],
        provider: 'sendgrid',
        timestamp: new Date(),
        recipient: messages[index].recipient
      }));

    } catch (error: any) {
      logger.error('Error sending bulk emails:', error.message);

      return messages.map(message => ({
        success: false,
        error: error.message,
        provider: 'sendgrid',
        timestamp: new Date(),
        recipient: message.recipient
      }));
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getDeliveryStatus(messageId: string): Promise<any> {
    // SendGrid doesn't provide a direct API to get delivery status by message ID
    // This would typically be handled via webhooks
    logger.info(`Checking delivery status for message: ${messageId}`);
    return { status: 'unknown', message: 'Use webhooks for delivery status' };
  }

  async handleWebhook(webhookData: any): Promise<void> {
    try {
      const events = Array.isArray(webhookData) ? webhookData : [webhookData];

      for (const event of events) {
        logger.info('Processing SendGrid webhook event:', {
          event: event.event,
          email: event.email,
          timestamp: event.timestamp,
          messageId: event.sg_message_id
        });

        // Store delivery status in database
        await this.storeDeliveryStatus(event);
      }
    } catch (error) {
      logger.error('Error processing SendGrid webhook:', error);
    }
  }

  private async storeDeliveryStatus(event: any): Promise<void> {
    try {
      // This would store the delivery status in your database
      // Implementation depends on your database structure
      logger.info('Storing delivery status:', event);
    } catch (error) {
      logger.error('Error storing delivery status:', error);
    }
  }
}