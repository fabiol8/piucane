import mjml2html from 'mjml';
import { EmailContent, TemplateVariable } from '../types';

export class EmailRenderer {
  static render(
    content: EmailContent,
    variables: Record<string, any>
  ): { html: string; text: string; subject: string } {
    // Process variables in MJML template
    let mjmlTemplate = content.mjmlTemplate;
    let subject = content.subject;
    let textVersion = content.textVersion || '';

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      mjmlTemplate = mjmlTemplate.replace(placeholder, String(value));
      subject = subject.replace(placeholder, String(value));
      if (textVersion) {
        textVersion = textVersion.replace(placeholder, String(value));
      }
    });

    // Convert MJML to HTML
    const { html, errors } = mjml2html(mjmlTemplate, {
      validationLevel: 'soft',
      fonts: {
        'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      }
    });

    if (errors.length > 0) {
      console.warn('MJML rendering errors:', errors);
    }

    // Generate text version if not provided
    if (!textVersion) {
      textVersion = this.htmlToText(html);
    }

    return {
      html,
      text: textVersion,
      subject
    };
  }

  static validateTemplate(mjmlTemplate: string): { valid: boolean; errors: string[] } {
    const { errors } = mjml2html(mjmlTemplate, {
      validationLevel: 'strict'
    });

    return {
      valid: errors.length === 0,
      errors: errors.map(error => error.message)
    };
  }

  private static htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static getDefaultTemplate(): string {
    return `
<mjml>
  <mj-head>
    <mj-title>{{ title }}</mj-title>
    <mj-preview>{{ preheader }}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" />
      <mj-text font-size="16px" color="#374151" line-height="1.6" />
      <mj-button background-color="#ea580c" color="#ffffff" font-weight="600" border-radius="8px" />
    </mj-attributes>
    <mj-style inline="inline">
      .footer-link { color: #6b7280 !important; text-decoration: none; }
      .footer-link:hover { color: #374151 !important; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f9fafb">
    <!-- Header -->
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-image src="https://piucane.it/logo.png" alt="PiùCane" width="120px" align="left" />
      </mj-column>
    </mj-section>

    <!-- Main Content -->
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-text font-size="24px" font-weight="700" color="#111827" align="center">
          {{ title }}
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="20px">
          {{ content }}
        </mj-text>

        <!-- CTA Button -->
        <mj-button href="{{ cta_url }}" padding-top="30px" data-cta-id="{{ cta_id }}">
          {{ cta_text }}
        </mj-button>
      </mj-column>
    </mj-section>

    <!-- Footer -->
    <mj-section background-color="#f3f4f6" padding="30px 20px">
      <mj-column>
        <mj-text font-size="14px" color="#6b7280" align="center">
          <a href="{{ unsubscribe_url }}" class="footer-link">Annulla iscrizione</a> |
          <a href="{{ preferences_url }}" class="footer-link">Gestisci preferenze</a> |
          <a href="{{ privacy_url }}" class="footer-link">Privacy</a>
        </mj-text>

        <mj-text font-size="12px" color="#9ca3af" align="center" padding-top="15px">
          © {{ year }} PiùCane. Tutti i diritti riservati.<br>
          Via Roma 123, 20121 Milano, Italia
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  static getWelcomeTemplate(): string {
    return `
<mjml>
  <mj-head>
    <mj-title>Benvenuto in PiùCane!</mj-title>
    <mj-preview>Il tuo viaggio per il benessere del tuo cane inizia qui</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f9fafb">
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-image src="https://piucane.it/logo.png" alt="PiùCane" width="120px" align="left" />
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-text font-size="28px" font-weight="700" color="#111827" align="center">
          Benvenuto in PiùCane, {{ user_name }}! 🐕
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="20px">
          Siamo entusiasti di averti nella nostra community dedicata al benessere dei cani.
          Con PiùCane avrai accesso a tutto quello che serve per prenderti cura al meglio di {{ dog_name }}.
        </mj-text>

        <mj-text font-size="18px" font-weight="600" color="#ea580c" padding-top="30px">
          Cosa puoi fare subito:
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="15px">
          🩺 <strong>Consulta i nostri AI Specialist</strong><br>
          Ricevi consigli personalizzati dal nostro veterinario, educatore cinofilo e groomer AI
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="10px">
          📱 <strong>Completa il profilo di {{ dog_name }}</strong><br>
          Aggiungi informazioni mediche, preferenze e libretto vaccinale
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="10px">
          🛍️ <strong>Scopri prodotti personalizzati</strong><br>
          Trova gli alimenti e accessori perfetti per {{ dog_name }}
        </mj-text>

        <mj-button href="{{ dashboard_url }}" padding-top="40px" data-cta-id="welcome-dashboard">
          Inizia subito
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#fef3c7" padding="30px 20px">
      <mj-column>
        <mj-text font-size="16px" color="#92400e" align="center">
          💡 <strong>Suggerimento:</strong> Scarica la nostra app mobile per avere PiùCane sempre con te!
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f3f4f6" padding="30px 20px">
      <mj-column>
        <mj-text font-size="14px" color="#6b7280" align="center">
          <a href="{{ unsubscribe_url }}" style="color: #6b7280;">Annulla iscrizione</a> |
          <a href="{{ preferences_url }}" style="color: #6b7280;">Gestisci preferenze</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  static getOrderConfirmationTemplate(): string {
    return `
<mjml>
  <mj-head>
    <mj-title>Ordine confermato - #{{ order_number }}</mj-title>
    <mj-preview>Il tuo ordine è stato confermato e sarà spedito a breve</mj-preview>
  </mj-head>
  <mj-body background-color="#f9fafb">
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-image src="https://piucane.it/logo.png" alt="PiùCane" width="120px" align="left" />
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-text font-size="24px" font-weight="700" color="#111827" align="center">
          Ordine confermato! ✅
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="20px">
          Grazie {{ user_name }}! Il tuo ordine #{{ order_number }} è stato confermato e sarà processato a breve.
        </mj-text>

        <mj-text font-size="18px" font-weight="600" color="#ea580c" padding-top="30px">
          Dettagli ordine:
        </mj-text>

        <!-- Order Items -->
        <mj-table padding-top="20px">
          <tr style="border-bottom:1px solid #e5e7eb;text-align:left;">
            <th style="padding: 10px 0;">Prodotto</th>
            <th style="padding: 10px 0;">Quantità</th>
            <th style="padding: 10px 0;">Prezzo</th>
          </tr>
          {{ order_items }}
        </mj-table>

        <mj-text font-size="16px" color="#374151" padding-top="20px" text-align="right">
          <strong>Totale: €{{ order_total }}</strong>
        </mj-text>

        <mj-text font-size="16px" color="#374151" padding-top="20px">
          <strong>Indirizzo di spedizione:</strong><br>
          {{ shipping_address }}
        </mj-text>

        <mj-button href="{{ tracking_url }}" padding-top="30px" data-cta-id="order-tracking">
          Traccia ordine
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f3f4f6" padding="30px 20px">
      <mj-column>
        <mj-text font-size="14px" color="#6b7280" align="center">
          Domande? <a href="{{ support_url }}" style="color: #ea580c;">Contatta il supporto</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }
}