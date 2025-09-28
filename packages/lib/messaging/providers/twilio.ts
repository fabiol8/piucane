import { Twilio } from 'twilio';
import { TwilioMessage, WhatsAppContent } from '../types';

export class TwilioProvider {
  private client: Twilio;
  private fromNumber: string;
  private whatsappFromNumber: string;

  constructor(config: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    whatsappFromNumber: string;
  }) {
    this.client = new Twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
    this.whatsappFromNumber = config.whatsappFromNumber;
  }

  async sendSMS(
    to: string,
    body: string,
    options: {
      mediaUrl?: string[];
      statusCallback?: string;
      validityPeriod?: number;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: this.formatPhoneNumber(to),
        body,
        mediaUrl: options.mediaUrl,
        statusCallback: options.statusCallback,
        validityPeriod: options.validityPeriod
      });

      return {
        success: true,
        messageId: message.sid
      };
    } catch (error: any) {
      console.error('Twilio SMS error:', error);

      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  async sendWhatsApp(
    to: string,
    content: WhatsAppContent,
    variables: Record<string, any> = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // For template messages
      if (content.templateName) {
        const message = await this.client.messages.create({
          from: `whatsapp:${this.whatsappFromNumber}`,
          to: `whatsapp:${this.formatPhoneNumber(to)}`,
          contentSid: content.templateName, // Twilio Content SID
          contentVariables: JSON.stringify(variables)
        });

        return {
          success: true,
          messageId: message.sid
        };
      }

      // For simple text messages (if approved template not available)
      const bodyText = this.buildWhatsAppBody(content, variables);
      const message = await this.client.messages.create({
        from: `whatsapp:${this.whatsappFromNumber}`,
        to: `whatsapp:${this.formatPhoneNumber(to)}`,
        body: bodyText
      });

      return {
        success: true,
        messageId: message.sid
      };
    } catch (error: any) {
      console.error('Twilio WhatsApp error:', error);

      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      };
    }
  }

  private buildWhatsAppBody(content: WhatsAppContent, variables: Record<string, any>): string {
    let body = '';

    content.components.forEach(component => {
      switch (component.type) {
        case 'header':
          if (component.parameters?.[0]?.text) {
            body += `*${this.replaceVariables(component.parameters[0].text, variables)}*\n\n`;
          }
          break;

        case 'body':
          component.parameters?.forEach(param => {
            if (param.text) {
              body += this.replaceVariables(param.text, variables) + '\n';
            }
          });
          body += '\n';
          break;

        case 'footer':
          if (component.parameters?.[0]?.text) {
            body += `_${this.replaceVariables(component.parameters[0].text, variables)}_\n`;
          }
          break;

        case 'button':
          if (component.parameters?.[0]?.text) {
            body += `🔗 ${this.replaceVariables(component.parameters[0].text, variables)}\n`;
          }
          break;
      }
    });

    return body.trim();
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, String(value));
    });
    return result;
  }

  async sendBulkSMS(
    recipients: Array<{ to: string; body: string; mediaUrl?: string[] }>,
    options: {
      statusCallback?: string;
      validityPeriod?: number;
    } = {}
  ): Promise<{ success: boolean; results: Array<{ success: boolean; messageId?: string; error?: string }> }> {
    const results = await Promise.allSettled(
      recipients.map(recipient =>
        this.sendSMS(recipient.to, recipient.body, {
          mediaUrl: recipient.mediaUrl,
          ...options
        })
      )
    );

    const processedResults = results.map(result =>
      result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
    );

    return {
      success: processedResults.some(r => r.success),
      results: processedResults
    };
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      const {
        MessageSid: messageId,
        MessageStatus: status,
        From: from,
        To: to,
        Body: messageBody,
        ErrorCode: errorCode,
        ErrorMessage: errorMessage
      } = body;

      const eventData = {
        messageId,
        status,
        from,
        to,
        body: messageBody,
        errorCode,
        errorMessage,
        timestamp: new Date(),
        provider: 'twilio'
      };

      // Process different status events
      switch (status) {
        case 'delivered':
          await this.handleDeliveredEvent(eventData);
          break;
        case 'failed':
          await this.handleFailedEvent(eventData);
          break;
        case 'undelivered':
          await this.handleUndeliveredEvent(eventData);
          break;
        case 'read':
          await this.handleReadEvent(eventData);
          break;
        case 'sent':
          await this.handleSentEvent(eventData);
          break;
      }
    } catch (error) {
      console.error('Error processing Twilio webhook:', error);
    }
  }

  private async handleDeliveredEvent(event: any): Promise<void> {
    console.log('Message delivered:', event);
    // Update message status in database
  }

  private async handleFailedEvent(event: any): Promise<void> {
    console.log('Message failed:', event);
    // Log failure and potentially retry or mark contact as invalid
  }

  private async handleUndeliveredEvent(event: any): Promise<void> {
    console.log('Message undelivered:', event);
    // Handle undelivered message
  }

  private async handleReadEvent(event: any): Promise<void> {
    console.log('Message read:', event);
    // Track read status for analytics
  }

  private async handleSentEvent(event: any): Promise<void> {
    console.log('Message sent:', event);
    // Update status to sent
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: string;
    error?: string;
  }> {
    try {
      const lookup = await this.client.lookups.v2
        .phoneNumbers(this.formatPhoneNumber(phoneNumber))
        .fetch({ fields: 'carrier' });

      return {
        valid: lookup.valid || false,
        formatted: lookup.phoneNumber,
        carrier: lookup.carrier?.name,
        type: lookup.carrier?.type
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid phone number'
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming Italy +39)
    if (cleaned.length === 10 && !cleaned.startsWith('39')) {
      return '+39' + cleaned;
    }

    // Add + if missing
    if (!phoneNumber.startsWith('+')) {
      return '+' + cleaned;
    }

    return phoneNumber;
  }

  async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
    dateCreated?: Date;
    dateSent?: Date;
    dateUpdated?: Date;
  }> {
    try {
      const message = await this.client.messages(messageId).fetch();

      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };
    } catch (error: any) {
      throw new Error(`Failed to get message status: ${error.message}`);
    }
  }

  // Predefined message templates for Italian market
  async sendWelcomeMessage(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `🐕 Benvenuto in PiùCane, ${variables.user_name}!

Siamo felici di averti nella nostra community dedicata al benessere di ${variables.dog_name}.

Scopri subito:
• Consulti AI con veterinario, educatore e groomer
• Prodotti personalizzati per ${variables.dog_name}
• Missioni e ricompense esclusive

Inizia ora: ${variables.app_url}

---
PiùCane - Il meglio per il tuo cane 🧡`;

    return this.sendSMS(to, body);
  }

  async sendOrderConfirmation(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `✅ Ordine confermato!

Ordine #${variables.order_number}
Totale: €${variables.total}
Spedizione prevista: ${variables.shipping_date}

Traccia il tuo ordine: ${variables.tracking_url}

Grazie per aver scelto PiùCane! 🐕`;

    return this.sendSMS(to, body);
  }

  async sendShippingNotification(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `📦 Il tuo ordine è in viaggio!

Ordine #${variables.order_number}
Corriere: ${variables.carrier}
Tracking: ${variables.tracking_number}
Consegna prevista: ${variables.delivery_date}

Segui la spedizione: ${variables.tracking_url}

PiùCane 🧡`;

    return this.sendSMS(to, body);
  }

  async sendHealthReminder(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `🩺 Promemoria salute per ${variables.dog_name}

È ora di: ${variables.reminder_type}
Scadenza: ${variables.due_date}

Non dimenticare di prenotare l'appuntamento con il tuo veterinario.

Gestisci promemoria: ${variables.app_url}/health

PiùCane - Cura preventiva 🧡`;

    return this.sendSMS(to, body);
  }

  async sendUrgentHealthAlert(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `🚨 ATTENZIONE SALUTE

Abbiamo rilevato sintomi che potrebbero richiedere attenzione veterinaria per ${variables.dog_name}.

Sintomi: ${variables.symptoms}

⚠️ CONSULTA IMMEDIATAMENTE IL TUO VETERINARIO

Trova veterinari: ${variables.app_url}/emergency

PiùCane - Sempre al tuo fianco 🧡`;

    return this.sendSMS(to, body);
  }

  async sendSubscriptionRenewal(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `🔄 Abbonamento rinnovato

${variables.subscription_name}
Importo: €${variables.amount}
Prossima consegna: ${variables.next_delivery}

Gestisci abbonamento: ${variables.manage_url}

Grazie per la fiducia! 🐕
PiùCane 🧡`;

    return this.sendSMS(to, body);
  }

  async sendPromotion(
    to: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = `🎉 Offerta speciale per te!

${variables.discount_percentage}% di sconto su ${variables.product_category}

Codice: ${variables.promo_code}
Valido fino al: ${variables.expiry_date}

Acquista ora: ${variables.shop_url}

PiùCane - Risparmia sul meglio! 🧡`;

    return this.sendSMS(to, body);
  }
}