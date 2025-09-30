// ===============================
// 📨 TEMPLATE MANAGER
// ===============================

import type {
  MessageTemplate,
  TemplateContent,
  TemplateVariable,
  TemplateVariant,
  CommunicationChannel,
  TemplateCategory
} from '@/types/communications'

export class TemplateManager {
  private templates: Map<string, MessageTemplate> = new Map()
  private compiledTemplates: Map<string, CompiledTemplate> = new Map()

  constructor() {
    this.initializePredefinedTemplates()
  }

  // ===============================
  // TEMPLATE OPERATIONS
  // ===============================

  async getTemplate(templateId: string): Promise<MessageTemplate | null> {
    return this.templates.get(templateId) || null
  }

  async createTemplate(template: Omit<MessageTemplate, 'templateId' | 'createdAt' | 'updatedAt'>): Promise<MessageTemplate> {
    const templateId = this.generateTemplateId()
    const now = new Date().toISOString()

    const newTemplate: MessageTemplate = {
      ...template,
      templateId,
      createdAt: now,
      updatedAt: now
    }

    // Validate template
    await this.validateTemplate(newTemplate)

    // Compile template for performance
    await this.compileTemplate(newTemplate)

    this.templates.set(templateId, newTemplate)
    return newTemplate
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      templateId, // Ensure ID doesn't change
      version: template.version + 1,
      updatedAt: new Date().toISOString()
    }

    await this.validateTemplate(updatedTemplate)
    await this.compileTemplate(updatedTemplate)

    this.templates.set(templateId, updatedTemplate)
    return updatedTemplate
  }

  async deleteTemplate(templateId: string): Promise<void> {
    this.templates.delete(templateId)
    this.compiledTemplates.delete(templateId)
  }

  async duplicateTemplate(templateId: string, name: string): Promise<MessageTemplate> {
    const original = await this.getTemplate(templateId)
    if (!original) {
      throw new Error(`Template ${templateId} not found`)
    }

    const duplicate = {
      ...original,
      name,
      version: 1,
      publishedAt: null,
      variants: undefined // Reset variants for new template
    }

    delete (duplicate as any).templateId
    delete (duplicate as any).createdAt
    delete (duplicate as any).updatedAt

    return await this.createTemplate(duplicate)
  }

  // ===============================
  // TEMPLATE RENDERING
  // ===============================

  async renderTemplate(
    templateId: string,
    channel: CommunicationChannel,
    variables: Record<string, any> = {},
    variantId?: string
  ): Promise<RenderedTemplate> {

    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    if (!template.active) {
      throw new Error(`Template ${templateId} is not active`)
    }

    // Get content for the specific channel
    let content = template.content[channel]
    if (!content) {
      throw new Error(`Template ${templateId} has no content for channel ${channel}`)
    }

    // Handle A/B testing variants
    if (variantId && template.variants) {
      const variant = template.variants.find(v => v.variantId === variantId)
      if (variant && variant.content[channel]) {
        content = variant.content[channel]
      }
    }

    // Validate required variables
    await this.validateVariables(template, variables)

    // Process variables with advanced features
    const processedContent = await this.processContent(content, variables, template)

    return {
      templateId,
      channel,
      variantId,
      content: processedContent,
      variables,
      metadata: {
        templateName: template.name,
        category: template.category,
        version: template.version
      }
    }
  }

  // ===============================
  // VARIABLE PROCESSING
  // ===============================

  private async processContent(
    content: TemplateContent,
    variables: Record<string, any>,
    template: MessageTemplate
  ): Promise<ProcessedContent> {

    const processed: ProcessedContent = {
      subject: content.subject ? await this.processString(content.subject, variables) : undefined,
      title: content.title ? await this.processString(content.title, variables) : undefined,
      body: await this.processString(content.body, variables),
      html: content.html ? await this.processString(content.html, variables) : undefined,
      preview: content.preview ? await this.processString(content.preview, variables) : undefined,
      imageUrl: content.imageUrl ? await this.processString(content.imageUrl, variables) : undefined,
      iconUrl: content.iconUrl ? await this.processString(content.iconUrl, variables) : undefined,
      cta: content.cta ? await this.processCTAs(content.cta, variables) : undefined
    }

    return processed
  }

  private async processString(template: string, variables: Record<string, any>): Promise<string> {
    let result = template

    // Basic variable replacement: {variableName}
    result = result.replace(/\{(\w+)\}/g, (match, varName) => {
      if (variables[varName] !== undefined) {
        return String(variables[varName])
      }
      return match // Keep placeholder if variable not found
    })

    // Advanced features: {variableName|filter}
    result = result.replace(/\{(\w+)\|(\w+)\}/g, (match, varName, filter) => {
      if (variables[varName] !== undefined) {
        return this.applyFilter(variables[varName], filter)
      }
      return match
    })

    // Conditional content: {?variableName}content{/variableName}
    result = result.replace(/\{\?(\w+)\}(.*?)\{\/\1\}/gs, (match, varName, content) => {
      return variables[varName] ? content : ''
    })

    // Pluralization: {count} {count|plural:item,items}
    result = result.replace(/\{(\w+)\|plural:([^,]+),([^}]+)\}/g, (match, varName, singular, plural) => {
      const count = Number(variables[varName])
      return isNaN(count) ? match : (count === 1 ? singular : plural)
    })

    return result
  }

  private async processCTAs(ctas: any[], variables: Record<string, any>): Promise<any[]> {
    return Promise.all(ctas.map(async (cta) => ({
      ...cta,
      text: await this.processString(cta.text, variables),
      url: cta.url ? await this.processString(cta.url, variables) : undefined,
      deeplink: cta.deeplink ? await this.processString(cta.deeplink, variables) : undefined
    })))
  }

  private applyFilter(value: any, filter: string): string {
    switch (filter) {
      case 'uppercase':
        return String(value).toUpperCase()
      case 'lowercase':
        return String(value).toLowerCase()
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase()
      case 'date':
        return new Date(value).toLocaleDateString('it-IT')
      case 'datetime':
        return new Date(value).toLocaleString('it-IT')
      case 'currency':
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value))
      default:
        return String(value)
    }
  }

  // ===============================
  // VALIDATION
  // ===============================

  private async validateTemplate(template: MessageTemplate): Promise<void> {
    // Check required fields
    if (!template.name || !template.category) {
      throw new Error('Template name and category are required')
    }

    // Check that at least one channel has content
    if (!template.channels.length || !Object.keys(template.content).length) {
      throw new Error('Template must have at least one channel with content')
    }

    // Validate channel content
    for (const channel of template.channels) {
      const content = template.content[channel]
      if (!content || !content.body) {
        throw new Error(`Channel ${channel} is missing content or body`)
      }
    }

    // Validate variables
    for (const variable of template.variables) {
      if (!variable.name || !variable.type) {
        throw new Error('Variable name and type are required')
      }
    }

    // Validate CTA links
    for (const [channel, content] of Object.entries(template.content)) {
      if (content.cta) {
        for (const cta of content.cta) {
          if (!cta.text) {
            throw new Error(`CTA in ${channel} channel is missing text`)
          }
        }
      }
    }
  }

  private async validateVariables(template: MessageTemplate, variables: Record<string, any>): Promise<void> {
    for (const templateVar of template.variables) {
      if (templateVar.required && variables[templateVar.name] === undefined) {
        throw new Error(`Required variable '${templateVar.name}' is missing`)
      }

      if (variables[templateVar.name] !== undefined) {
        const value = variables[templateVar.name]

        // Type validation
        switch (templateVar.type) {
          case 'string':
            if (typeof value !== 'string') {
              throw new Error(`Variable '${templateVar.name}' must be a string`)
            }
            break
          case 'number':
            if (typeof value !== 'number') {
              throw new Error(`Variable '${templateVar.name}' must be a number`)
            }
            break
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new Error(`Variable '${templateVar.name}' must be a boolean`)
            }
            break
          case 'date':
            if (!(value instanceof Date) && typeof value !== 'string') {
              throw new Error(`Variable '${templateVar.name}' must be a Date or date string`)
            }
            break
        }

        // Additional validation rules
        if (templateVar.validation) {
          await this.validateVariableRules(templateVar.name, value, templateVar.validation)
        }
      }
    }
  }

  private async validateVariableRules(
    name: string,
    value: any,
    validation: NonNullable<TemplateVariable['validation']>
  ): Promise<void> {

    if (validation.minLength !== undefined && String(value).length < validation.minLength) {
      throw new Error(`Variable '${name}' must be at least ${validation.minLength} characters`)
    }

    if (validation.maxLength !== undefined && String(value).length > validation.maxLength) {
      throw new Error(`Variable '${name}' must be at most ${validation.maxLength} characters`)
    }

    if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
      throw new Error(`Variable '${name}' does not match required pattern`)
    }

    if (validation.enum && !validation.enum.includes(String(value))) {
      throw new Error(`Variable '${name}' must be one of: ${validation.enum.join(', ')}`)
    }
  }

  // ===============================
  // TEMPLATE COMPILATION
  // ===============================

  private async compileTemplate(template: MessageTemplate): Promise<void> {
    const compiled: CompiledTemplate = {
      templateId: template.templateId,
      compiledAt: new Date().toISOString(),
      channels: {}
    }

    for (const [channel, content] of Object.entries(template.content)) {
      compiled.channels[channel as CommunicationChannel] = {
        requiredVars: this.extractRequiredVariables(content),
        optionalVars: this.extractOptionalVariables(content),
        hasConditionals: this.hasConditionalContent(content),
        estimatedLength: this.estimateContentLength(content)
      }
    }

    this.compiledTemplates.set(template.templateId, compiled)
  }

  private extractRequiredVariables(content: TemplateContent): string[] {
    const vars = new Set<string>()
    const text = JSON.stringify(content)

    // Extract basic variables {varName}
    const matches = text.match(/\{(\w+)\}/g)
    if (matches) {
      matches.forEach(match => {
        const varName = match.slice(1, -1)
        vars.add(varName)
      })
    }

    return Array.from(vars)
  }

  private extractOptionalVariables(content: TemplateContent): string[] {
    const vars = new Set<string>()
    const text = JSON.stringify(content)

    // Extract conditional variables {?varName}
    const matches = text.match(/\{\?(\w+)\}/g)
    if (matches) {
      matches.forEach(match => {
        const varName = match.slice(2, -1)
        vars.add(varName)
      })
    }

    return Array.from(vars)
  }

  private hasConditionalContent(content: TemplateContent): boolean {
    const text = JSON.stringify(content)
    return /\{\?.*?\}/.test(text)
  }

  private estimateContentLength(content: TemplateContent): number {
    let length = 0
    if (content.subject) length += content.subject.length
    if (content.title) length += content.title.length
    if (content.body) length += content.body.length
    return length
  }

  // ===============================
  // PREDEFINED TEMPLATES
  // ===============================

  private initializePredefinedTemplates(): void {
    // Welcome Template
    this.createPredefinedTemplate('template_welcome', {
      name: 'Benvenuto',
      category: 'journey',
      channels: ['push', 'email', 'inbox'],
      content: {
        push: {
          title: 'Benvenuto in PiùCane! 🐶',
          body: 'Ciao {userName}, {dogName} ha già il suo spazio digitale. Iniziamo questa avventura insieme!',
          cta: [{ id: 'open', text: 'Apri App', deeplink: 'piucane://onboarding' }]
        },
        email: {
          subject: 'Benvenuto in PiùCane, {userName}!',
          body: `Ciao {userName},

Benvenuto nella community di PiùCane! 🎉

{dogName} ha ora il suo spazio digitale personalizzato dove potrai:
• Gestire la sua salute e i suoi appuntamenti
• Scoprire nuove missioni divertenti
• Trovare i prodotti più adatti alle sue esigenze
• Connetterti con altri amici a quattro zampe

Iniziamo questa avventura insieme!`,
          html: `<h1>Benvenuto in PiùCane, {userName}! 🐶</h1>
<p>Ciao {userName},</p>
<p>Benvenuto nella community di PiùCane! 🎉</p>
<p><strong>{dogName}</strong> ha ora il suo spazio digitale personalizzato dove potrai:</p>
<ul>
  <li>Gestire la sua salute e i suoi appuntamenti</li>
  <li>Scoprire nuove missioni divertenti</li>
  <li>Trovare i prodotti più adatti alle sue esigenze</li>
  <li>Connetterti con altri amici a quattro zampe</li>
</ul>
<p>Iniziamo questa avventura insieme!</p>`,
          cta: [{ id: 'complete', text: 'Completa il Profilo', url: 'https://piucane.com/onboarding' }]
        },
        inbox: {
          title: 'Benvenuto in PiùCane!',
          body: 'Ciao {userName}, {dogName} ha ora il suo spazio digitale. Completa il profilo per iniziare!',
          category: 'journey',
          persistent: true
        }
      },
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'dogName', type: 'string', required: true }
      ],
      priority: 'high',
      requiresConsent: false,
      consentTypes: ['caring']
    })

    // Vaccination Reminder
    this.createPredefinedTemplate('template_vaccination_reminder', {
      name: 'Promemoria Vaccinazione',
      category: 'reminder',
      channels: ['push', 'email', 'inbox'],
      content: {
        push: {
          title: 'Promemoria per {dogName} 💉',
          body: 'È tempo della vaccinazione per {dogName}! Prenota ora la sua visita veterinaria.',
          cta: [{ id: 'book', text: 'Prenota', deeplink: 'piucane://veterinary/book' }]
        },
        email: {
          subject: 'Vaccinazione in scadenza per {dogName}',
          body: `Ciao {userName},

È arrivato il momento della vaccinazione per {dogName}! 💉

La prossima vaccinazione è prevista per il {nextVaccinationDate|date}.

Per la salute di {dogName}, è importante rispettare il calendario vaccinale.
Prenota subito un appuntamento con il tuo veterinario di fiducia.`,
          cta: [
            { id: 'book', text: 'Prenota Appuntamento', url: 'https://piucane.com/veterinary/book' },
            { id: 'find', text: 'Trova Veterinario', url: 'https://piucane.com/veterinary/search' }
          ]
        },
        inbox: {
          title: 'Vaccinazione per {dogName}',
          body: 'È tempo della vaccinazione! Prenota un appuntamento veterinario per {dogName}.',
          category: 'health',
          badge: 'Urgente'
        }
      },
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'dogName', type: 'string', required: true },
        { name: 'nextVaccinationDate', type: 'date', required: true }
      ],
      priority: 'high',
      requiresConsent: false,
      consentTypes: ['transactional', 'reminders']
    })

    // Order Confirmation
    this.createPredefinedTemplate('template_order_confirmed', {
      name: 'Conferma Ordine',
      category: 'transactional',
      channels: ['push', 'email', 'inbox'],
      content: {
        push: {
          title: 'Ordine confermato! 📦',
          body: 'Il tuo ordine #{orderNumber} per {dogName} è stato confermato. Ti terremo aggiornato!',
          cta: [{ id: 'track', text: 'Traccia', deeplink: 'piucane://orders/{orderNumber}' }]
        },
        email: {
          subject: 'Ordine #{orderNumber} confermato',
          body: `Ciao {userName},

Il tuo ordine per {dogName} è stato confermato! 📦

Dettagli ordine:
• Numero ordine: #{orderNumber}
• Totale: {orderTotal|currency}
• Consegna prevista: {estimatedDelivery|date}

{?trackingUrl}Puoi tracciare il tuo ordine qui: {trackingUrl}{/trackingUrl}

Grazie per aver scelto PiùCane!`,
          cta: [
            { id: 'track', text: 'Traccia Ordine', url: '{trackingUrl}' },
            { id: 'support', text: 'Contattaci', url: 'https://piucane.com/support' }
          ]
        },
        inbox: {
          title: 'Ordine #{orderNumber} confermato',
          body: 'Il tuo ordine per {dogName} è confermato. Consegna prevista: {estimatedDelivery|date}',
          category: 'orders',
          persistent: true
        }
      },
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'dogName', type: 'string', required: true },
        { name: 'orderNumber', type: 'string', required: true },
        { name: 'orderTotal', type: 'number', required: true },
        { name: 'estimatedDelivery', type: 'date', required: true },
        { name: 'trackingUrl', type: 'string', required: false }
      ],
      priority: 'high',
      requiresConsent: false,
      consentTypes: ['transactional']
    })

    // Mission Available
    this.createPredefinedTemplate('template_mission_available', {
      name: 'Nuova Missione',
      category: 'caring',
      channels: ['push', 'inbox'],
      content: {
        push: {
          title: 'Nuova missione per {dogName}! 🎯',
          body: '{missionTitle} - Guadagna {rewardPoints} punti e fai divertire {dogName}!',
          cta: [{ id: 'start', text: 'Inizia', deeplink: 'piucane://missions/{missionId}' }]
        },
        inbox: {
          title: 'Nuova missione disponibile',
          body: '{missionTitle} - Guadagna {rewardPoints} punti con {dogName}!',
          category: 'missions',
          badge: 'Nuovo'
        }
      },
      variables: [
        { name: 'dogName', type: 'string', required: true },
        { name: 'missionTitle', type: 'string', required: true },
        { name: 'missionId', type: 'string', required: true },
        { name: 'rewardPoints', type: 'number', required: true }
      ],
      priority: 'medium',
      requiresConsent: true,
      consentTypes: ['caring', 'marketing']
    })

    // Winback Templates
    this.createWinbackTemplates()
  }

  private createWinbackTemplates(): void {
    // Winback Gentle
    this.createPredefinedTemplate('template_winback_gentle', {
      name: 'Winback Gentile',
      category: 'marketing',
      channels: ['email', 'inbox'],
      content: {
        email: {
          subject: 'Ci manchi, {userName}! {dogName} ti aspetta 🐕',
          body: `Ciao {userName},

È da un po' che non ci vediamo! {dogName} ti sta aspettando... 🐕

Ecco cosa ti sei perso di nuovo in PiùCane:
• Nuove missioni divertenti per {dogName}
• Guide personalizzate per la sua salute
• Prodotti in offerta speciale

Torna a prenderti cura di {dogName} insieme a noi!`,
          cta: [{ id: 'return', text: 'Torna in App', url: 'https://piucane.com/welcome-back' }]
        },
        inbox: {
          title: 'Ci manchi! 🐕',
          body: '{dogName} ti aspetta. Torna a scoprire le novità di PiùCane!',
          category: 'journey',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }
      },
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'dogName', type: 'string', required: true }
      ],
      priority: 'low',
      requiresConsent: true,
      consentTypes: ['marketing']
    })

    // Winback Offer
    this.createPredefinedTemplate('template_winback_offer', {
      name: 'Winback con Offerta',
      category: 'marketing',
      channels: ['email', 'whatsapp', 'sms', 'inbox'],
      content: {
        email: {
          subject: '🎁 Offerta speciale per {dogName} - Solo per te!',
          body: `Ciao {userName},

{dogName} merita il meglio e noi abbiamo un'offerta speciale solo per voi! 🎁

SCONTO 30% sul tuo prossimo ordine
Codice: BACKTO{dogName|uppercase}

Questa offerta è valida solo fino al {offerExpiry|date} e non la troverai da nessun'altra parte.

Torna a prenderti cura di {dogName} con i nostri prodotti premium!`,
          cta: [{ id: 'shop', text: 'Approfitta Ora', url: 'https://piucane.com/shop?code=BACKTO{dogName|uppercase}' }]
        },
        whatsapp: {
          body: '🎁 Ciao {userName}! Offerta speciale per {dogName}: 30% di sconto con codice BACKTO{dogName|uppercase}. Valido fino al {offerExpiry|date}. Approfitta ora: https://piucane.com/shop'
        },
        sms: {
          body: 'PiùCane: 30% sconto per {dogName}! Codice BACKTO{dogName|uppercase} valido fino al {offerExpiry|date}. Shop: https://piucane.com/shop'
        },
        inbox: {
          title: '🎁 Offerta Speciale 30%',
          body: 'Sconto esclusivo per {dogName}! Codice: BACKTO{dogName|uppercase}',
          category: 'promotions',
          badge: 'Offerta',
          expiresAt: '{offerExpiry}'
        }
      },
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'dogName', type: 'string', required: true },
        { name: 'offerExpiry', type: 'date', required: true }
      ],
      priority: 'medium',
      requiresConsent: true,
      consentTypes: ['marketing']
    })
  }

  private createPredefinedTemplate(
    templateId: string,
    template: Omit<MessageTemplate, 'templateId' | 'active' | 'version' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): void {
    const fullTemplate: MessageTemplate = {
      ...template,
      templateId,
      active: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }

    this.templates.set(templateId, fullTemplate)
    this.compileTemplate(fullTemplate).catch(console.error)
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ===============================
  // ANALYTICS & TESTING
  // ===============================

  async getTemplateAnalytics(templateId: string, days: number = 30): Promise<TemplateAnalytics> {
    // Mock analytics - in production would query real data
    return {
      templateId,
      period: { days, startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date().toISOString() },
      sends: Math.floor(Math.random() * 1000) + 100,
      delivers: Math.floor(Math.random() * 900) + 90,
      opens: Math.floor(Math.random() * 400) + 40,
      clicks: Math.floor(Math.random() * 100) + 10,
      conversions: Math.floor(Math.random() * 20) + 2,
      revenue: Math.floor(Math.random() * 5000) + 500,
      channelBreakdown: {
        push: { sends: 400, opens: 200, clicks: 40 },
        email: { sends: 300, opens: 150, clicks: 30 },
        whatsapp: { sends: 100, opens: 80, clicks: 15 },
        sms: { sends: 50, opens: 30, clicks: 5 },
        inbox: { sends: 500, opens: 400, clicks: 50 }
      }
    }
  }

  async createABTest(
    templateId: string,
    variants: TemplateVariant[],
    testConfig: ABTestConfig
  ): Promise<string> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Validate variant weights sum to 100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
    if (totalWeight !== 100) {
      throw new Error('Variant weights must sum to 100')
    }

    // Update template with variants
    template.variants = variants
    await this.updateTemplate(templateId, { variants })

    // Create test record
    const testId = `test_${Date.now()}`
    console.log(`A/B Test ${testId} created for template ${templateId}`)

    return testId
  }

  selectVariant(templateId: string, userId: string): string | undefined {
    const template = this.templates.get(templateId)
    if (!template?.variants) return undefined

    // Simple hash-based variant selection for consistent user experience
    const hash = this.hashUserId(userId)
    const bucket = hash % 100

    let currentWeight = 0
    for (const variant of template.variants) {
      currentWeight += variant.weight
      if (bucket < currentWeight) {
        return variant.variantId
      }
    }

    return undefined
  }

  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}

// ===============================
// TYPES
// ===============================

interface CompiledTemplate {
  templateId: string
  compiledAt: string
  channels: Record<CommunicationChannel, {
    requiredVars: string[]
    optionalVars: string[]
    hasConditionals: boolean
    estimatedLength: number
  }>
}

interface RenderedTemplate {
  templateId: string
  channel: CommunicationChannel
  variantId?: string
  content: ProcessedContent
  variables: Record<string, any>
  metadata: {
    templateName: string
    category: TemplateCategory
    version: number
  }
}

interface ProcessedContent {
  subject?: string
  title?: string
  body: string
  html?: string
  preview?: string
  imageUrl?: string
  iconUrl?: string
  cta?: any[]
}

interface TemplateAnalytics {
  templateId: string
  period: { days: number; startDate: string; endDate: string }
  sends: number
  delivers: number
  opens: number
  clicks: number
  conversions: number
  revenue: number
  channelBreakdown: Record<CommunicationChannel, {
    sends: number
    opens: number
    clicks: number
  }>
}

interface ABTestConfig {
  name: string
  description?: string
  duration: number // days
  trafficPercentage: number
  conversionGoal: string
}