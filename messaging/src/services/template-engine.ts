import Handlebars from 'handlebars';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';
import { MessageTemplate } from '../types/messages';

export class TemplateEngine {
  private static instance: TemplateEngine;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
  }

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';

      const options: Intl.DateTimeFormatOptions = {};

      switch (format) {
        case 'short':
          options.day = '2-digit';
          options.month = '2-digit';
          options.year = 'numeric';
          break;
        case 'long':
          options.weekday = 'long';
          options.day = 'numeric';
          options.month = 'long';
          options.year = 'numeric';
          break;
        case 'time':
          options.hour = '2-digit';
          options.minute = '2-digit';
          break;
        default:
          options.day = 'numeric';
          options.month = 'long';
          options.year = 'numeric';
      }

      return new Date(date).toLocaleDateString('it-IT', options);
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      if (typeof amount !== 'number') return '€0,00';
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    });

    // Pluralization helper
    Handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    // Dog age helper
    Handlebars.registerHelper('dogAge', (birthDate: Date) => {
      if (!birthDate) return 'N/A';

      const now = new Date();
      const birth = new Date(birthDate);
      const diffTime = Math.abs(now.getTime() - birth.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        return `${diffDays} giorni`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'mese' : 'mesi'}`;
      } else {
        const years = Math.floor(diffDays / 365);
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        if (remainingMonths === 0) {
          return `${years} ${years === 1 ? 'anno' : 'anni'}`;
        } else {
          return `${years} ${years === 1 ? 'anno' : 'anni'} e ${remainingMonths} ${remainingMonths === 1 ? 'mese' : 'mesi'}`;
        }
      }
    });

    // Dog weight category helper
    Handlebars.registerHelper('weightCategory', (weight: number) => {
      if (weight < 5) return 'toy';
      if (weight < 10) return 'piccola';
      if (weight < 25) return 'media';
      if (weight < 45) return 'grande';
      return 'gigante';
    });

    // Conditional helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('and', (a: any, b: any) => a && b);
    Handlebars.registerHelper('or', (a: any, b: any) => a || b);

    // String helpers
    Handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase() || '');
    Handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase() || '');
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Array helpers
    Handlebars.registerHelper('join', (array: any[], separator: string = ', ') => {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });

    Handlebars.registerHelper('first', (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return null;
      return array[0];
    });

    Handlebars.registerHelper('last', (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return null;
      return array[array.length - 1];
    });

    // Math helpers
    Handlebars.registerHelper('add', (a: number, b: number) => (a || 0) + (b || 0));
    Handlebars.registerHelper('subtract', (a: number, b: number) => (a || 0) - (b || 0));
    Handlebars.registerHelper('multiply', (a: number, b: number) => (a || 0) * (b || 0));
    Handlebars.registerHelper('divide', (a: number, b: number) => b !== 0 ? (a || 0) / b : 0);
    Handlebars.registerHelper('round', (num: number, decimals: number = 0) => {
      const factor = Math.pow(10, decimals);
      return Math.round((num || 0) * factor) / factor;
    });

    // URL helpers
    Handlebars.registerHelper('trackingUrl', (baseUrl: string, userId: string, campaignId?: string) => {
      const url = new URL(baseUrl);
      url.searchParams.set('utm_source', 'piucane');
      url.searchParams.set('utm_medium', 'email');
      if (campaignId) {
        url.searchParams.set('utm_campaign', campaignId);
      }
      url.searchParams.set('user_id', userId);
      return url.toString();
    });
  }

  async renderTemplate(
    templateContent: any,
    userData: any,
    channel: 'email' | 'sms' | 'whatsapp' | 'push'
  ): Promise<any> {
    try {
      const context = this.buildContext(userData);

      switch (channel) {
        case 'email':
          return {
            subject: this.renderString(templateContent.subject, context),
            html: this.renderString(templateContent.html, context),
            text: this.renderString(templateContent.text, context)
          };

        case 'sms':
          return {
            text: this.renderString(templateContent.text, context)
          };

        case 'whatsapp':
          return {
            text: this.renderString(templateContent.text, context)
          };

        case 'push':
          return {
            title: this.renderString(templateContent.title, context),
            body: this.renderString(templateContent.body, context),
            data: this.renderObject(templateContent.data, context),
            imageUrl: this.renderString(templateContent.imageUrl, context),
            clickAction: this.renderString(templateContent.clickAction, context)
          };

        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error: any) {
      logger.error('Error rendering template:', error);
      throw error;
    }
  }

  async renderTemplateById(
    templateId: string,
    userData: any,
    variables?: { [key: string]: any }
  ): Promise<any> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const context = this.buildContext(userData, variables);

      return {
        subject: template.subject ? this.renderString(template.subject, context) : undefined,
        content: this.renderString(template.content, context),
        html: template.type === 'email' ? this.renderString(template.content, context) : undefined,
        text: this.renderString(template.content, context)
      };
    } catch (error: any) {
      logger.error('Error rendering template by ID:', error);
      throw error;
    }
  }

  private renderString(template: string, context: any): string {
    if (!template) return '';

    try {
      const templateKey = this.getTemplateKey(template);

      let compiledTemplate = this.compiledTemplates.get(templateKey);
      if (!compiledTemplate) {
        compiledTemplate = Handlebars.compile(template);
        this.compiledTemplates.set(templateKey, compiledTemplate);
      }

      return compiledTemplate(context);
    } catch (error: any) {
      logger.error('Error rendering string template:', error);
      return template; // Return original template if rendering fails
    }
  }

  private renderObject(obj: any, context: any): any {
    if (!obj) return {};

    try {
      const jsonString = JSON.stringify(obj);
      const renderedString = this.renderString(jsonString, context);
      return JSON.parse(renderedString);
    } catch (error: any) {
      logger.error('Error rendering object template:', error);
      return obj;
    }
  }

  private buildContext(userData: any, variables?: { [key: string]: any }): any {
    const now = new Date();

    const context = {
      user: {
        name: userData.displayName || userData.firstName || 'Cliente',
        firstName: userData.firstName || userData.displayName?.split(' ')[0] || 'Cliente',
        lastName: userData.lastName || userData.displayName?.split(' ').slice(1).join(' ') || '',
        email: userData.email,
        phone: userData.phone,
        city: userData.address?.city,
        country: userData.address?.country || 'Italia'
      },
      dogs: userData.dogs || [],
      primaryDog: userData.dogs?.[0] || null,
      orders: userData.recentOrders || [],
      subscriptions: userData.activeSubscriptions || [],
      gamification: {
        points: userData.gamification?.points || 0,
        level: userData.gamification?.level || 1,
        badges: userData.gamification?.badges || [],
        streak: userData.gamification?.streak?.current || 0
      },
      date: {
        now,
        today: now.toISOString().split('T')[0],
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        weekday: now.toLocaleDateString('it-IT', { weekday: 'long' })
      },
      company: {
        name: 'PiùCane',
        website: 'https://piucane.it',
        email: 'info@piucane.it',
        phone: '+39 02 1234 5678',
        address: 'Via Roma 123, 20100 Milano MI'
      },
      urls: {
        app: 'https://app.piucane.it',
        website: 'https://piucane.it',
        support: 'https://support.piucane.it',
        unsubscribe: `https://app.piucane.it/unsubscribe?user=${userData.id}`
      },
      ...variables
    };

    // Calculate derived values
    if (context.dogs.length > 0) {
      context.totalDogs = context.dogs.length;
      context.dogsNames = context.dogs.map((dog: any) => dog.name).join(', ');
      context.oldestDog = context.dogs.reduce((oldest: any, current: any) => {
        if (!oldest.birthDate) return current;
        if (!current.birthDate) return oldest;
        return new Date(current.birthDate) < new Date(oldest.birthDate) ? current : oldest;
      });
      context.youngestDog = context.dogs.reduce((youngest: any, current: any) => {
        if (!youngest.birthDate) return current;
        if (!current.birthDate) return youngest;
        return new Date(current.birthDate) > new Date(youngest.birthDate) ? current : oldest;
      });
    }

    if (context.orders.length > 0) {
      context.totalOrders = context.orders.length;
      context.totalSpent = context.orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
      context.lastOrder = context.orders[0];
      context.averageOrderValue = context.totalSpent / context.totalOrders;
    }

    return context;
  }

  private getTemplateKey(template: string): string {
    // Create a simple hash of the template for caching
    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  async getTemplate(templateId: string): Promise<MessageTemplate | null> {
    try {
      const doc = await db.collection('templates').doc(templateId).get();
      return doc.exists ? doc.data() as MessageTemplate : null;
    } catch (error) {
      logger.error('Error getting template:', error);
      return null;
    }
  }

  async createTemplate(template: MessageTemplate): Promise<string> {
    try {
      const docRef = await db.collection('templates').add({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info(`Template created: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<void> {
    try {
      await db.collection('templates').doc(templateId).update({
        ...updates,
        updatedAt: new Date()
      });

      // Clear cached compiled template
      this.compiledTemplates.delete(templateId);

      logger.info(`Template updated: ${templateId}`);
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await db.collection('templates').doc(templateId).update({
        active: false,
        deletedAt: new Date()
      });

      // Clear cached compiled template
      this.compiledTemplates.delete(templateId);

      logger.info(`Template deleted: ${templateId}`);
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  async listTemplates(type?: string, category?: string): Promise<MessageTemplate[]> {
    try {
      let query = db.collection('templates').where('active', '==', true);

      if (type) {
        query = query.where('type', '==', type);
      }

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
    } catch (error) {
      logger.error('Error listing templates:', error);
      return [];
    }
  }

  async validateTemplate(template: string, sampleData: any): Promise<{ valid: boolean; error?: string; rendered?: string }> {
    try {
      const context = this.buildContext(sampleData);
      const rendered = this.renderString(template, context);

      return {
        valid: true,
        rendered
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async previewTemplate(templateId: string, userData: any): Promise<any> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const context = this.buildContext(userData);

      return {
        id: templateId,
        name: template.name,
        type: template.type,
        subject: template.subject ? this.renderString(template.subject, context) : undefined,
        content: this.renderString(template.content, context),
        variables: template.variables,
        context
      };
    } catch (error: any) {
      logger.error('Error previewing template:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.compiledTemplates.clear();
    logger.info('Template cache cleared');
  }
}