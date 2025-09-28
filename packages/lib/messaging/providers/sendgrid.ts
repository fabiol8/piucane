import sgMail from '@sendgrid/mail';
import { SendGridMessage, EmailContent } from '../types';

export class SendGridProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(config: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  }) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;

    sgMail.setApiKey(this.apiKey);
  }

  async sendEmail(
    to: string,
    content: {
      subject: string;
      html: string;
      text: string;
    },
    options: {
      templateId?: string;
      dynamicTemplateData?: Record<string, any>;
      headers?: Record<string, string>;
      customArgs?: Record<string, string>;
      replyTo?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message: SendGridMessage = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: content.subject,
        html: content.html,
        text: content.text,
        ...options
      };

      // Add tracking parameters
      if (options.customArgs) {
        message.customArgs = {
          ...options.customArgs,
          provider: 'sendgrid',
          timestamp: new Date().toISOString()
        };
      }

      // Add click tracking
      message.trackingSettings = {
        clickTracking: {
          enable: true,
          enableText: false
        },
        openTracking: {
          enable: true,
          substitutionTag: '%open_tracking_pixel%'
        },
        subscriptionTracking: {
          enable: true,
          text: 'Annulla iscrizione',
          html: '<a href="#" class="unsubscribe-link">Annulla iscrizione</a>',
          substitutionTag: '%unsubscribe%'
        }
      };

      const [response] = await sgMail.send(message);

      return {
        success: true,
        messageId: response.headers?.['x-message-id']
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);

      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  async sendBulkEmail(
    recipients: Array<{
      to: string;
      dynamicTemplateData?: Record<string, any>;
    }>,
    templateId: string,
    options: {
      headers?: Record<string, string>;
      customArgs?: Record<string, string>;
    } = {}
  ): Promise<{ success: boolean; messageIds?: string[]; errors?: string[] }> {
    try {
      const messages = recipients.map(recipient => ({
        to: recipient.to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        templateId,
        dynamicTemplateData: recipient.dynamicTemplateData || {},
        customArgs: {
          ...options.customArgs,
          provider: 'sendgrid',
          timestamp: new Date().toISOString()
        },
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: true }
        }
      }));

      const response = await sgMail.send(messages);

      return {
        success: true,
        messageIds: response.map(r => r[0]?.headers?.['x-message-id']).filter(Boolean)
      };
    } catch (error: any) {
      console.error('SendGrid bulk error:', error);

      return {
        success: false,
        errors: Array.isArray(error.response?.body?.errors)
          ? error.response.body.errors.map((e: any) => e.message)
          : [error.message || 'Failed to send bulk email']
      };
    }
  }

  async verifyWebhook(
    payload: string,
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    try {
      // Implement SendGrid webhook verification
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.SENDGRID_WEBHOOK_SECRET || '')
        .update(timestamp + payload)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      console.error('SendGrid webhook verification error:', error);
      return false;
    }
  }

  async handleWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      try {
        await this.processWebhookEvent(event);
      } catch (error) {
        console.error('Error processing SendGrid webhook event:', error);
      }
    }
  }

  private async processWebhookEvent(event: any): Promise<void> {
    const {
      event: eventType,
      email,
      timestamp,
      'sg_message_id': messageId,
      reason,
      status,
      url
    } = event;

    // Map SendGrid events to our system
    const eventData = {
      messageId,
      email,
      timestamp: new Date(timestamp * 1000),
      provider: 'sendgrid',
      eventType,
      reason,
      status,
      url
    };

    // Process different event types
    switch (eventType) {
      case 'delivered':
        await this.handleDeliveredEvent(eventData);
        break;
      case 'open':
        await this.handleOpenEvent(eventData);
        break;
      case 'click':
        await this.handleClickEvent(eventData);
        break;
      case 'bounce':
        await this.handleBounceEvent(eventData);
        break;
      case 'dropped':
        await this.handleDroppedEvent(eventData);
        break;
      case 'spamreport':
        await this.handleSpamReportEvent(eventData);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribeEvent(eventData);
        break;
      case 'group_unsubscribe':
        await this.handleGroupUnsubscribeEvent(eventData);
        break;
      case 'group_resubscribe':
        await this.handleGroupResubscribeEvent(eventData);
        break;
    }
  }

  private async handleDeliveredEvent(event: any): Promise<void> {
    // Update message status to delivered
    console.log('Email delivered:', event);
  }

  private async handleOpenEvent(event: any): Promise<void> {
    // Track email open
    console.log('Email opened:', event);
  }

  private async handleClickEvent(event: any): Promise<void> {
    // Track email click
    console.log('Email clicked:', event);
  }

  private async handleBounceEvent(event: any): Promise<void> {
    // Handle bounce - might need to disable email for this user
    console.log('Email bounced:', event);
  }

  private async handleDroppedEvent(event: any): Promise<void> {
    // Handle dropped email
    console.log('Email dropped:', event);
  }

  private async handleSpamReportEvent(event: any): Promise<void> {
    // Handle spam report - unsubscribe user
    console.log('Email marked as spam:', event);
  }

  private async handleUnsubscribeEvent(event: any): Promise<void> {
    // Handle unsubscribe
    console.log('User unsubscribed:', event);
  }

  private async handleGroupUnsubscribeEvent(event: any): Promise<void> {
    // Handle group unsubscribe
    console.log('User unsubscribed from group:', event);
  }

  private async handleGroupResubscribeEvent(event: any): Promise<void> {
    // Handle group resubscribe
    console.log('User resubscribed to group:', event);
  }

  async validateEmail(email: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Use SendGrid's email validation API if available
      const response = await fetch('https://api.sendgrid.com/v3/validations/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      return {
        valid: result.result?.verdict === 'Valid',
        reason: result.result?.verdict
      };
    } catch (error) {
      // Fallback to basic email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(email),
        reason: emailRegex.test(email) ? undefined : 'Invalid email format'
      };
    }
  }

  async getStats(startDate: Date, endDate: Date): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    spamReports: number;
    unsubscribes: number;
  }> {
    try {
      const response = await fetch(`https://api.sendgrid.com/v3/stats?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const stats = await response.json();

      // Aggregate stats
      const aggregated = stats.reduce((acc: any, stat: any) => {
        acc.sent += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.requests, 0);
        acc.delivered += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.delivered, 0);
        acc.opened += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.unique_opens, 0);
        acc.clicked += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.unique_clicks, 0);
        acc.bounced += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.bounces, 0);
        acc.spamReports += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.spam_reports, 0);
        acc.unsubscribes += stat.stats.reduce((sum: number, s: any) => sum + s.metrics.unsubscribes, 0);
        return acc;
      }, {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        spamReports: 0,
        unsubscribes: 0
      });

      return aggregated;
    } catch (error) {
      console.error('Error fetching SendGrid stats:', error);
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        spamReports: 0,
        unsubscribes: 0
      };
    }
  }
}