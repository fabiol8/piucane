import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import mjml2html from 'mjml';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  mjmlTemplate: string;
  textTemplate?: string;
}

export interface EmailData {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransporter(config);
  }

  async renderTemplate(template: EmailTemplate, data: Record<string, any>): Promise<{ html: string; text?: string }> {
    const subjectTemplate = handlebars.compile(template.subject);
    const mjmlTemplate = handlebars.compile(template.mjmlTemplate);

    const compiledMjml = mjmlTemplate(data);
    const { html } = mjml2html(compiledMjml);

    let text: string | undefined;
    if (template.textTemplate) {
      const textTemplate = handlebars.compile(template.textTemplate);
      text = textTemplate(data);
    }

    return { html, text };
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      await this.transporter.sendMail(emailData);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendTemplatedEmail(
    template: EmailTemplate,
    templateData: Record<string, any>,
    recipients: string | string[],
    from: string
  ): Promise<void> {
    const { html, text } = await this.renderTemplate(template, templateData);
    const subjectTemplate = handlebars.compile(template.subject);
    const subject = subjectTemplate(templateData);

    await this.sendEmail({
      to: recipients,
      from,
      subject,
      html,
      text
    });
  }
}