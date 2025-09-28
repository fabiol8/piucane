import { MailgunMessage } from '../types';

export class MailgunProvider {
  private apiKey: string;
  private domain: string;
  private baseUrl: string;
  private fromEmail: string;
  private fromName: string;

  constructor(config: {
    apiKey: string;
    domain: string;
    region?: 'us' | 'eu';
    fromEmail: string;
    fromName: string;
  }) {
    this.apiKey = config.apiKey;
    this.domain = config.domain;
    this.baseUrl = config.region === 'eu'
      ? 'https://api.eu.mailgun.net/v3'
      : 'https://api.mailgun.net/v3';
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  async sendEmail(
    to: string,
    content: {
      subject: string;
      html: string;
      text: string;
    },
    options: {
      template?: string;
      templateVariables?: Record<string, any>;
      tags?: string[];
      campaign?: string;
      headers?: Record<string, string>;
      replyTo?: string;
      testMode?: boolean;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const formData = new FormData();

      formData.append('from', `${this.fromName} <${this.fromEmail}>`);
      formData.append('to', to);
      formData.append('subject', content.subject);
      formData.append('html', content.html);
      formData.append('text', content.text);

      if (options.replyTo) {
        formData.append('h:Reply-To', options.replyTo);
      }

      if (options.template) {
        formData.append('template', options.template);
      }

      if (options.templateVariables) {
        formData.append('h:X-Mailgun-Variables', JSON.stringify(options.templateVariables));
      }

      if (options.tags) {
        options.tags.forEach(tag => formData.append('o:tag', tag));
      }

      if (options.campaign) {
        formData.append('o:campaign', options.campaign);
      }

      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          formData.append(`h:${key}`, value);
        });
      }

      if (options.testMode) {
        formData.append('o:testmode', 'true');
      }

      // Add tracking
      formData.append('o:tracking', 'true');
      formData.append('o:tracking-clicks', 'true');
      formData.append('o:tracking-opens', 'true');

      const response = await fetch(`${this.baseUrl}/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      return {
        success: true,
        messageId: result.id
      };
    } catch (error: any) {
      console.error('Mailgun error:', error);

      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  async sendBulkEmail(
    recipients: Array<{
      to: string;
      variables?: Record<string, any>;
    }>,
    template: string,
    subject: string,
    options: {
      tags?: string[];
      campaign?: string;
      headers?: Record<string, string>;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; errors?: string[] }> {
    try {
      const formData = new FormData();

      formData.append('from', `${this.fromName} <${this.fromEmail}>`);

      // Add all recipients
      recipients.forEach(recipient => {
        formData.append('to', recipient.to);
      });

      formData.append('subject', subject);
      formData.append('template', template);

      // Add recipient variables if any
      const recipientVariables: Record<string, any> = {};
      recipients.forEach(recipient => {
        if (recipient.variables) {
          recipientVariables[recipient.to] = recipient.variables;
        }
      });

      if (Object.keys(recipientVariables).length > 0) {
        formData.append('recipient-variables', JSON.stringify(recipientVariables));
      }

      if (options.tags) {
        options.tags.forEach(tag => formData.append('o:tag', tag));
      }

      if (options.campaign) {
        formData.append('o:campaign', options.campaign);
      }

      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          formData.append(`h:${key}`, value);
        });
      }

      // Add tracking
      formData.append('o:tracking', 'true');
      formData.append('o:tracking-clicks', 'true');
      formData.append('o:tracking-opens', 'true');

      const response = await fetch(`${this.baseUrl}/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send bulk email');
      }

      return {
        success: true,
        messageId: result.id
      };
    } catch (error: any) {
      console.error('Mailgun bulk error:', error);

      return {
        success: false,
        errors: [error.message || 'Failed to send bulk email']
      };
    }
  }

  async verifyWebhook(
    signature: string,
    timestamp: string,
    token: string,
    webhookSecret: string
  ): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const encodedToken = crypto
        .createHmac('sha256', webhookSecret)
        .update(timestamp.concat(token))
        .digest('hex');

      return signature === encodedToken;
    } catch (error) {
      console.error('Mailgun webhook verification error:', error);
      return false;
    }
  }

  async handleWebhook(eventData: any): Promise<void> {
    try {
      const { event, message, recipient, timestamp } = eventData;

      const processedEvent = {
        messageId: message?.headers?.['message-id'],
        recipient,
        event,
        timestamp: new Date(timestamp * 1000),
        provider: 'mailgun',
        ...eventData
      };

      switch (event) {
        case 'delivered':
          await this.handleDeliveredEvent(processedEvent);
          break;
        case 'opened':
          await this.handleOpenedEvent(processedEvent);
          break;
        case 'clicked':
          await this.handleClickedEvent(processedEvent);
          break;
        case 'bounced':
          await this.handleBouncedEvent(processedEvent);
          break;
        case 'dropped':
          await this.handleDroppedEvent(processedEvent);
          break;
        case 'complained':
          await this.handleComplainedEvent(processedEvent);
          break;
        case 'unsubscribed':
          await this.handleUnsubscribedEvent(processedEvent);
          break;
      }
    } catch (error) {
      console.error('Error processing Mailgun webhook:', error);
    }
  }

  private async handleDeliveredEvent(event: any): Promise<void> {
    console.log('Email delivered:', event);
    // Update message status to delivered
  }

  private async handleOpenedEvent(event: any): Promise<void> {
    console.log('Email opened:', event);
    // Track email open
  }

  private async handleClickedEvent(event: any): Promise<void> {
    console.log('Email clicked:', event);
    // Track email click
  }

  private async handleBouncedEvent(event: any): Promise<void> {
    console.log('Email bounced:', event);
    // Handle bounce - mark email as invalid
  }

  private async handleDroppedEvent(event: any): Promise<void> {
    console.log('Email dropped:', event);
    // Handle dropped email
  }

  private async handleComplainedEvent(event: any): Promise<void> {
    console.log('Email complained:', event);
    // Handle spam complaint
  }

  private async handleUnsubscribedEvent(event: any): Promise<void> {
    console.log('User unsubscribed:', event);
    // Handle unsubscribe
  }

  async validateEmail(email: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/address/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        },
        body: new URLSearchParams({ address: email })
      });

      const result = await response.json();

      return {
        valid: result.is_valid,
        reason: result.reason
      };
    } catch (error) {
      // Fallback to basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(email),
        reason: emailRegex.test(email) ? undefined : 'Invalid email format'
      };
    }
  }

  async getStats(
    startDate: Date,
    endDate: Date,
    resolution: 'hour' | 'day' | 'month' = 'day'
  ): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  }> {
    try {
      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        resolution,
        event: 'sent,delivered,opened,clicked,bounced,complained,unsubscribed'
      });

      const response = await fetch(`${this.baseUrl}/${this.domain}/stats/total?${params}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        }
      });

      const result = await response.json();

      // Aggregate stats
      const stats = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0
      };

      if (result.stats) {
        result.stats.forEach((stat: any) => {
          stats.sent += stat.sent || 0;
          stats.delivered += stat.delivered || 0;
          stats.opened += stat.opened || 0;
          stats.clicked += stat.clicked || 0;
          stats.bounced += stat.bounced || 0;
          stats.complained += stat.complained || 0;
          stats.unsubscribed += stat.unsubscribed || 0;
        });
      }

      return stats;
    } catch (error) {
      console.error('Error fetching Mailgun stats:', error);
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0
      };
    }
  }

  async createTemplate(
    name: string,
    template: {
      subject: string;
      html: string;
      text?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', template.description || '');
      formData.append('template', template.html);
      formData.append('subject', template.subject);

      if (template.text) {
        formData.append('text', template.text);
      }

      const response = await fetch(`${this.baseUrl}/${this.domain}/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating Mailgun template:', error);
      return {
        success: false,
        error: error.message || 'Failed to create template'
      };
    }
  }

  async getTemplate(name: string): Promise<{
    success: boolean;
    template?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.domain}/templates/${name}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const template = await response.json();

      return {
        success: true,
        template: template.template
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get template'
      };
    }
  }

  async deleteTemplate(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.domain}/templates/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete template'
      };
    }
  }

  async suppressEmail(
    email: string,
    type: 'bounces' | 'unsubscribes' | 'complaints'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('address', email);

      const response = await fetch(`${this.baseUrl}/${this.domain}/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to suppress email'
      };
    }
  }

  async removeSuppressionEmail(
    email: string,
    type: 'bounces' | 'unsubscribes' | 'complaints'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.domain}/${type}/${email}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove email suppression'
      };
    }
  }
}