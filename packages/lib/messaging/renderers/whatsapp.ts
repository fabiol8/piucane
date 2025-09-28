import { WhatsAppContent, WhatsAppComponent, WhatsAppParameter } from '../types';

export class WhatsAppRenderer {
  static render(
    content: WhatsAppContent,
    variables: Record<string, any>
  ): WhatsAppContent {
    const processedComponents = content.components.map(component => ({
      ...component,
      parameters: component.parameters?.map(param =>
        this.processParameter(param, variables)
      )
    }));

    return {
      ...content,
      components: processedComponents
    };
  }

  private static processParameter(
    parameter: WhatsAppParameter,
    variables: Record<string, any>
  ): WhatsAppParameter {
    if (parameter.type === 'text' && parameter.text) {
      let text = parameter.text;
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        text = text.replace(placeholder, String(value));
      });
      return { ...parameter, text };
    }

    if (parameter.type === 'currency' && parameter.currency) {
      const amount = variables[parameter.currency.fallbackValue] || parameter.currency.amount1000;
      return {
        ...parameter,
        currency: {
          ...parameter.currency,
          amount1000: typeof amount === 'number' ? amount * 1000 : parameter.currency.amount1000
        }
      };
    }

    if (parameter.type === 'date_time' && parameter.dateTime) {
      const dateValue = variables[parameter.dateTime.fallbackValue];
      return {
        ...parameter,
        dateTime: {
          fallbackValue: dateValue ? new Date(dateValue).toLocaleString('it-IT') : parameter.dateTime.fallbackValue
        }
      };
    }

    return parameter;
  }

  static validateContent(content: WhatsAppContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.templateName?.trim()) {
      errors.push('Template name is required');
    }

    if (!content.languageCode?.trim()) {
      errors.push('Language code is required');
    } else if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(content.languageCode)) {
      errors.push('Language code must be in format "en" or "en_US"');
    }

    if (!content.components || content.components.length === 0) {
      errors.push('At least one component is required');
    }

    content.components?.forEach((component, index) => {
      if (!['header', 'body', 'footer', 'button'].includes(component.type)) {
        errors.push(`Invalid component type at index ${index}: ${component.type}`);
      }

      component.parameters?.forEach((param, paramIndex) => {
        const paramErrors = this.validateParameter(param);
        if (paramErrors.length > 0) {
          errors.push(`Component ${index}, parameter ${paramIndex}: ${paramErrors.join(', ')}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static validateParameter(parameter: WhatsAppParameter): string[] {
    const errors: string[] = [];

    if (!['text', 'currency', 'date_time', 'image', 'document', 'video'].includes(parameter.type)) {
      errors.push(`Invalid parameter type: ${parameter.type}`);
    }

    switch (parameter.type) {
      case 'text':
        if (!parameter.text?.trim()) {
          errors.push('Text parameter requires text value');
        }
        break;

      case 'currency':
        if (!parameter.currency) {
          errors.push('Currency parameter requires currency object');
        } else {
          if (!parameter.currency.code || !/^[A-Z]{3}$/.test(parameter.currency.code)) {
            errors.push('Currency code must be 3-letter ISO code');
          }
          if (typeof parameter.currency.amount1000 !== 'number') {
            errors.push('Currency amount must be a number');
          }
        }
        break;

      case 'image':
        if (!parameter.image?.link || !this.isValidUrl(parameter.image.link)) {
          errors.push('Image parameter requires valid URL');
        }
        break;

      case 'document':
        if (!parameter.document?.link || !this.isValidUrl(parameter.document.link)) {
          errors.push('Document parameter requires valid URL');
        }
        break;

      case 'video':
        if (!parameter.video?.link || !this.isValidUrl(parameter.video.link)) {
          errors.push('Video parameter requires valid URL');
        }
        break;
    }

    return errors;
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Predefined WhatsApp templates
  static getWelcomeTemplate(): WhatsAppContent {
    return {
      templateName: 'welcome_message',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: 'Benvenuto in PiùCane!'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ dog_name }}'
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Inizia'
            }
          ]
        }
      ]
    };
  }

  static getOrderConfirmationTemplate(): WhatsAppContent {
    return {
      templateName: 'order_confirmation',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: 'Ordine Confermato'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ order_number }}'
            },
            {
              type: 'currency',
              currency: {
                fallbackValue: '€{{ order_total }}',
                code: 'EUR',
                amount1000: 0 // Will be calculated from variables
              }
            },
            {
              type: 'date_time',
              dateTime: {
                fallbackValue: '{{ delivery_date }}'
              }
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Traccia Ordine'
            }
          ]
        }
      ]
    };
  }

  static getShippingNotificationTemplate(): WhatsAppContent {
    return {
      templateName: 'shipping_notification',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: 'Pacco in viaggio!'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ order_number }}'
            },
            {
              type: 'text',
              text: '{{ tracking_number }}'
            },
            {
              type: 'date_time',
              dateTime: {
                fallbackValue: '{{ estimated_delivery }}'
              }
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Traccia Spedizione'
            }
          ]
        }
      ]
    };
  }

  static getHealthReminderTemplate(): WhatsAppContent {
    return {
      templateName: 'health_reminder',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: 'Promemoria Salute'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ dog_name }}'
            },
            {
              type: 'text',
              text: '{{ reminder_type }}'
            },
            {
              type: 'date_time',
              dateTime: {
                fallbackValue: '{{ due_date }}'
              }
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Vedi Dettagli'
            }
          ]
        }
      ]
    };
  }

  static getSubscriptionRenewalTemplate(): WhatsAppContent {
    return {
      templateName: 'subscription_renewal',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: 'Abbonamento Rinnovato'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ subscription_name }}'
            },
            {
              type: 'currency',
              currency: {
                fallbackValue: '€{{ amount }}',
                code: 'EUR',
                amount1000: 0
              }
            },
            {
              type: 'date_time',
              dateTime: {
                fallbackValue: '{{ next_delivery }}'
              }
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Gestisci Abbonamento'
            }
          ]
        }
      ]
    };
  }

  static getPromotionTemplate(): WhatsAppContent {
    return {
      templateName: 'promotion_offer',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: '{{ promotion_image }}'
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ discount_percentage }}'
            },
            {
              type: 'text',
              text: '{{ product_category }}'
            },
            {
              type: 'date_time',
              dateTime: {
                fallbackValue: '{{ expiry_date }}'
              }
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Scopri Offerta'
            }
          ]
        }
      ]
    };
  }

  static getUrgentHealthTemplate(): WhatsAppContent {
    return {
      templateName: 'urgent_health_alert',
      languageCode: 'it',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: '🚨 ATTENZIONE SALUTE'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: '{{ user_name }}'
            },
            {
              type: 'text',
              text: '{{ dog_name }}'
            },
            {
              type: 'text',
              text: '{{ symptoms }}'
            }
          ]
        },
        {
          type: 'footer',
          parameters: [
            {
              type: 'text',
              text: 'Consulta immediatamente il tuo veterinario'
            }
          ]
        },
        {
          type: 'button',
          parameters: [
            {
              type: 'text',
              text: 'Trova Veterinario'
            }
          ]
        }
      ]
    };
  }
}