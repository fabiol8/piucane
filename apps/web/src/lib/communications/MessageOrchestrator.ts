// ===============================
// 🔔 MESSAGE ORCHESTRATOR
// ===============================

import type {
  Message,
  MessageTemplate,
  UserChannelPreferences,
  CommunicationChannel,
  ChannelPolicy,
  MessagePriority,
  SendMessageRequest,
  SendMessageResponse,
  CommunicationError,
  OrchestratorConfig
} from '@/types/communications'

export class MessageOrchestrator {
  private config: OrchestratorConfig
  private templateCache: Map<string, MessageTemplate> = new Map()
  private userPrefsCache: Map<string, UserChannelPreferences> = new Map()

  constructor(config: OrchestratorConfig) {
    this.config = config
  }

  // ===============================
  // MAIN ORCHESTRATION LOGIC
  // ===============================

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // 1. Validate request
      await this.validateRequest(request)

      // 2. Get template and user preferences
      const template = await this.getTemplate(request.templateId)
      const userPrefs = await this.getUserPreferences(request.userId)

      // 3. Determine best channel
      const channel = await this.selectOptimalChannel(
        template,
        userPrefs,
        request.channel,
        request.priority || 'medium'
      )

      // 4. Check delivery constraints
      await this.checkDeliveryConstraints(
        request.userId,
        channel,
        request.priority || 'medium',
        userPrefs
      )

      // 5. Create message
      const message = await this.createMessage(request, template, channel)

      // 6. Schedule or send immediately
      if (request.scheduledAt) {
        return await this.scheduleMessage(message)
      } else {
        return await this.sendMessageNow(message, template, userPrefs)
      }

    } catch (error) {
      console.error('Message orchestration failed:', error)
      throw this.handleError(error)
    }
  }

  // ===============================
  // CHANNEL SELECTION ALGORITHM
  // ===============================

  private async selectOptimalChannel(
    template: MessageTemplate,
    userPrefs: UserChannelPreferences,
    requestedChannel?: CommunicationChannel | null,
    priority: MessagePriority = 'medium'
  ): Promise<CommunicationChannel> {

    // If specific channel requested and available
    if (requestedChannel && this.isChannelAvailable(requestedChannel, template, userPrefs)) {
      return requestedChannel
    }

    // Critical messages bypass some restrictions
    if (priority === 'critical') {
      return this.selectCriticalChannel(template, userPrefs)
    }

    // Use DDA (Data Driven Attribution) algorithm
    const channelScores = await this.calculateChannelScores(template, userPrefs, priority)

    // Select highest scoring available channel
    const sortedChannels = Object.entries(channelScores)
      .sort(([,a], [,b]) => b - a)
      .map(([channel]) => channel as CommunicationChannel)

    for (const channel of sortedChannels) {
      if (this.isChannelAvailable(channel, template, userPrefs)) {
        return channel
      }
    }

    // Fallback to inbox (always available)
    return 'inbox'
  }

  private async calculateChannelScores(
    template: MessageTemplate,
    userPrefs: UserChannelPreferences,
    priority: MessagePriority
  ): Promise<Record<CommunicationChannel, number>> {

    const scores: Record<CommunicationChannel, number> = {
      push: 0,
      email: 0,
      whatsapp: 0,
      sms: 0,
      inbox: 0
    }

    // Base scores from user preferences
    userPrefs.preferredChannels.forEach((channel, index) => {
      scores[channel] += (userPrefs.preferredChannels.length - index) * 10
    })

    // Performance-based scoring
    Object.entries(userPrefs.channelPerformance).forEach(([channel, perf]) => {
      const ch = channel as CommunicationChannel
      scores[ch] += perf.engagementScore * 50
      scores[ch] += perf.deliveryRate * 20
      scores[ch] += perf.openRate * 15
      scores[ch] += perf.clickRate * 15
    })

    // Template channel compatibility
    template.channels.forEach(channel => {
      if (template.content[channel]) {
        scores[channel] += 20
      }
    })

    // Priority adjustments
    switch (priority) {
      case 'critical':
        scores.push += 30
        scores.inbox += 25
        break
      case 'high':
        scores.push += 20
        scores.email += 15
        break
      case 'medium':
        scores.email += 10
        scores.inbox += 5
        break
      case 'low':
        scores.inbox += 15
        break
    }

    // Time-based adjustments
    const now = new Date()
    const currentHour = now.getHours()

    if (this.isQuietHours(now, userPrefs.quietHours)) {
      scores.push = Math.max(0, scores.push - 40)
      scores.whatsapp = Math.max(0, scores.whatsapp - 35)
      scores.sms = Math.max(0, scores.sms - 30)
      scores.email += 10
      scores.inbox += 15
    }

    // Workday vs weekend
    const isWeekend = now.getDay() === 0 || now.getDay() === 6
    if (isWeekend) {
      scores.email = Math.max(0, scores.email - 10)
      scores.push += 5
    }

    // Recent activity penalty (avoid spam)
    const recentActivity = await this.getRecentChannelActivity(userPrefs.userId)
    Object.entries(recentActivity).forEach(([channel, count]) => {
      if (count > 2) { // More than 2 messages today
        scores[channel as CommunicationChannel] = Math.max(0, scores[channel as CommunicationChannel] - 20)
      }
    })

    return scores
  }

  private selectCriticalChannel(
    template: MessageTemplate,
    userPrefs: UserChannelPreferences
  ): CommunicationChannel {

    // For critical messages, prefer immediate channels
    const criticalChannels: CommunicationChannel[] = ['push', 'sms', 'inbox']

    for (const channel of criticalChannels) {
      if (this.isChannelAvailable(channel, template, userPrefs, true)) {
        return channel
      }
    }

    return 'inbox' // Always available fallback
  }

  // ===============================
  // DELIVERY CONSTRAINTS
  // ===============================

  private async checkDeliveryConstraints(
    userId: string,
    channel: CommunicationChannel,
    priority: MessagePriority,
    userPrefs: UserChannelPreferences
  ): Promise<void> {

    // Skip constraints for critical messages
    if (priority === 'critical') {
      return
    }

    // Check quiet hours
    const now = new Date()
    if (this.isQuietHours(now, userPrefs.quietHours) && !userPrefs.quietHours.allowCritical) {
      if (['push', 'whatsapp', 'sms'].includes(channel)) {
        throw new Error('QUIET_HOURS: Cannot send during user quiet hours')
      }
    }

    // Check frequency limits
    await this.checkFrequencyLimits(userId, channel, userPrefs.frequencyLimits)

    // Check channel consent
    const channelConsent = userPrefs.channels[channel]
    if (!channelConsent.enabled) {
      throw new Error('CHANNEL_DISABLED: User has disabled this channel')
    }

    // Check consent type based on template category
    // Implementation would check template.category against consent types
  }

  private isQuietHours(date: Date, quietHours: UserChannelPreferences['quietHours']): boolean {
    if (!quietHours.enabled) return false

    const currentTime = date.toTimeString().slice(0, 5) // HH:mm
    const { startTime, endTime } = quietHours

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    }

    return currentTime >= startTime && currentTime <= endTime
  }

  private async checkFrequencyLimits(
    userId: string,
    channel: CommunicationChannel,
    limits: UserChannelPreferences['frequencyLimits']
  ): Promise<void> {

    const today = new Date().toISOString().split('T')[0]
    const thisWeek = this.getWeekStart(new Date()).toISOString().split('T')[0]

    const dailyCount = await this.getMessageCount(userId, channel, today)
    const weeklyCount = await this.getMessageCount(userId, channel, thisWeek, 'week')

    switch (channel) {
      case 'push':
        if (dailyCount >= limits.maxPushPerDay) {
          throw new Error('FREQUENCY_LIMIT: Daily push limit exceeded')
        }
        break
      case 'email':
        if (dailyCount >= limits.maxEmailPerDay) {
          throw new Error('FREQUENCY_LIMIT: Daily email limit exceeded')
        }
        break
      case 'whatsapp':
        if (weeklyCount >= limits.maxWhatsAppPerWeek) {
          throw new Error('FREQUENCY_LIMIT: Weekly WhatsApp limit exceeded')
        }
        break
      case 'sms':
        if (weeklyCount >= limits.maxSMSPerWeek) {
          throw new Error('FREQUENCY_LIMIT: Weekly SMS limit exceeded')
        }
        break
    }
  }

  // ===============================
  // MESSAGE CREATION & SENDING
  // ===============================

  private async createMessage(
    request: SendMessageRequest,
    template: MessageTemplate,
    channel: CommunicationChannel
  ): Promise<Message> {

    const messageId = this.generateMessageId()
    const now = new Date().toISOString()

    const payload = await this.buildMessagePayload(template, channel, request.variables || {})

    return {
      messageId,
      userId: request.userId,
      dogId: request.dogId || null,
      templateId: request.templateId,
      channel,
      priority: request.priority || 'medium',
      payload,
      status: 'pending',
      scheduledAt: request.scheduledAt || null,
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
      gdprCompliant: template.requiresConsent,
      createdAt: now,
      updatedAt: now,
      createdBy: 'orchestrator'
    }
  }

  private async buildMessagePayload(
    template: MessageTemplate,
    channel: CommunicationChannel,
    variables: Record<string, any>
  ) {
    const templateContent = template.content[channel]
    if (!templateContent) {
      throw new Error(`Template ${template.templateId} has no content for channel ${channel}`)
    }

    // Process template variables
    const processedContent = await this.processTemplateVariables(templateContent, variables)

    return {
      subject: processedContent.subject,
      title: processedContent.title,
      body: processedContent.body,
      html: processedContent.html,
      imageUrl: processedContent.imageUrl,
      iconUrl: processedContent.iconUrl,
      cta: processedContent.cta,
      variables,
      channelData: {
        [channel]: templateContent.channelConfig || {}
      }
    }
  }

  private async sendMessageNow(
    message: Message,
    template: MessageTemplate,
    userPrefs: UserChannelPreferences
  ): Promise<SendMessageResponse> {

    try {
      // Send via appropriate provider
      const deliveryResult = await this.deliverMessage(message)

      // Update message status
      await this.updateMessageStatus(message.messageId, {
        status: deliveryResult.success ? 'sent' : 'failed',
        sentAt: deliveryResult.success ? new Date().toISOString() : undefined,
        failedAt: !deliveryResult.success ? new Date().toISOString() : undefined
      })

      // Create inbox backup (always done)
      await this.createInboxBackup(message)

      // Track analytics
      await this.trackMessageEvent('message.sent', message, deliveryResult)

      return {
        messageId: message.messageId,
        status: deliveryResult.success ? 'sent' : 'failed',
        channel: message.channel,
        estimatedDelivery: deliveryResult.estimatedDelivery
      }

    } catch (error) {
      // Handle delivery failure
      return await this.handleDeliveryFailure(message, template, userPrefs, error)
    }
  }

  private async handleDeliveryFailure(
    message: Message,
    template: MessageTemplate,
    userPrefs: UserChannelPreferences,
    error: any
  ): Promise<SendMessageResponse> {

    console.error(`Message delivery failed for ${message.messageId}:`, error)

    // Update retry count
    message.retryCount += 1

    // Try fallback channel if available and retries not exhausted
    if (message.retryCount <= message.maxRetries && template.fallbackChannel) {
      const fallbackMessage = {
        ...message,
        channel: template.fallbackChannel,
        fallbackChannel: message.channel,
        messageId: this.generateMessageId()
      }

      return await this.sendMessageNow(fallbackMessage, template, userPrefs)
    }

    // Create inbox backup as final fallback
    await this.createInboxBackup(message)

    await this.updateMessageStatus(message.messageId, {
      status: 'failed',
      failedAt: new Date().toISOString()
    })

    return {
      messageId: message.messageId,
      status: 'failed',
      channel: message.channel
    }
  }

  // ===============================
  // PROVIDER INTEGRATIONS
  // ===============================

  private async deliverMessage(message: Message): Promise<{
    success: boolean
    estimatedDelivery?: string
    providerResponse?: any
  }> {

    switch (message.channel) {
      case 'push':
        return await this.sendPushNotification(message)
      case 'email':
        return await this.sendEmail(message)
      case 'whatsapp':
        return await this.sendWhatsApp(message)
      case 'sms':
        return await this.sendSMS(message)
      case 'inbox':
        return await this.sendToInbox(message)
      default:
        throw new Error(`Unsupported channel: ${message.channel}`)
    }
  }

  private async sendPushNotification(message: Message) {
    // Mock implementation - integrate with FCM/APNS/OneSignal
    const payload = message.payload

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))

    // Mock 95% success rate
    const success = Math.random() > 0.05

    return {
      success,
      estimatedDelivery: success ? new Date(Date.now() + 1000).toISOString() : undefined,
      providerResponse: {
        messageId: success ? `push_${Date.now()}` : null,
        error: success ? null : 'Device token invalid'
      }
    }
  }

  private async sendEmail(message: Message) {
    // Mock implementation - integrate with SendGrid/SES/Mailgun
    const payload = message.payload

    await new Promise(resolve => setTimeout(resolve, 200))

    const success = Math.random() > 0.02 // 98% success rate

    return {
      success,
      estimatedDelivery: success ? new Date(Date.now() + 5000).toISOString() : undefined,
      providerResponse: {
        messageId: success ? `email_${Date.now()}` : null,
        error: success ? null : 'Invalid email address'
      }
    }
  }

  private async sendWhatsApp(message: Message) {
    // Mock implementation - integrate with Twilio/Vonage
    await new Promise(resolve => setTimeout(resolve, 300))

    const success = Math.random() > 0.08 // 92% success rate

    return {
      success,
      estimatedDelivery: success ? new Date(Date.now() + 2000).toISOString() : undefined,
      providerResponse: {
        messageId: success ? `wa_${Date.now()}` : null,
        error: success ? null : 'WhatsApp number not registered'
      }
    }
  }

  private async sendSMS(message: Message) {
    // Mock implementation - integrate with Twilio/Vonage
    await new Promise(resolve => setTimeout(resolve, 150))

    const success = Math.random() > 0.05 // 95% success rate

    return {
      success,
      estimatedDelivery: success ? new Date(Date.now() + 3000).toISOString() : undefined,
      providerResponse: {
        messageId: success ? `sms_${Date.now()}` : null,
        error: success ? null : 'Invalid phone number'
      }
    }
  }

  private async sendToInbox(message: Message) {
    // Inbox is always successful - it's our internal system
    const inboxMessage = await this.createInboxMessage(message)

    return {
      success: true,
      estimatedDelivery: new Date().toISOString(),
      providerResponse: {
        inboxMessageId: inboxMessage.inboxMessageId
      }
    }
  }

  // ===============================
  // HELPER METHODS
  // ===============================

  private isChannelAvailable(
    channel: CommunicationChannel,
    template: MessageTemplate,
    userPrefs: UserChannelPreferences,
    critical: boolean = false
  ): boolean {

    // Check if template supports this channel
    if (!template.channels.includes(channel) || !template.content[channel]) {
      return false
    }

    // Inbox is always available
    if (channel === 'inbox') {
      return true
    }

    // Check user consent
    const channelConsent = userPrefs.channels[channel]
    if (!channelConsent.enabled) {
      return false
    }

    // For critical messages, allow if transactional consent is given
    if (critical && channelConsent.transactional) {
      return true
    }

    // Check appropriate consent based on template category
    switch (template.category) {
      case 'transactional':
        return channelConsent.transactional
      case 'marketing':
        return channelConsent.marketing
      case 'caring':
        return channelConsent.caring
      case 'reminder':
        return channelConsent.reminders
      default:
        return channelConsent.enabled
    }
  }

  private async processTemplateVariables(
    content: any,
    variables: Record<string, any>
  ): Promise<any> {

    const processed = { ...content }

    // Simple variable replacement - in production use a proper template engine
    const replaceVariables = (text: string): string => {
      return text.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] !== undefined ? String(variables[key]) : match
      })
    }

    if (processed.subject) processed.subject = replaceVariables(processed.subject)
    if (processed.title) processed.title = replaceVariables(processed.title)
    if (processed.body) processed.body = replaceVariables(processed.body)
    if (processed.html) processed.html = replaceVariables(processed.html)

    return processed
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when Sunday
    return new Date(date.setDate(diff))
  }

  private handleError(error: any): CommunicationError {
    if (error.message?.includes('QUIET_HOURS')) {
      return {
        code: 'QUIET_HOURS',
        message: 'Cannot send during user quiet hours',
        retryable: true
      }
    }

    if (error.message?.includes('FREQUENCY_LIMIT')) {
      return {
        code: 'FREQUENCY_LIMIT',
        message: 'User frequency limit exceeded',
        retryable: true
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      retryable: false
    }
  }

  // ===============================
  // MOCK DATA ACCESS METHODS
  // ===============================
  // In production, these would connect to your database

  private async validateRequest(request: SendMessageRequest): Promise<void> {
    if (!request.userId) throw new Error('User ID is required')
    if (!request.templateId) throw new Error('Template ID is required')
  }

  private async getTemplate(templateId: string): Promise<MessageTemplate> {
    // Mock template - in production fetch from database
    return {
      templateId,
      name: 'Mock Template',
      category: 'caring',
      content: {
        push: {
          title: 'PiùCane',
          body: 'Ciao {userName}, {dogName} ti aspetta per una nuova missione!',
          cta: [{ id: 'open', text: 'Apri App', deeplink: 'piucane://missions' }]
        },
        email: {
          subject: 'Nuova missione per {dogName}',
          body: 'Ciao {userName}, abbiamo una nuova missione per {dogName}!',
          html: '<h1>Nuova missione per {dogName}</h1><p>Ciao {userName}, abbiamo una nuova missione!</p>'
        },
        inbox: {
          title: 'Nuova missione disponibile',
          body: 'Ciao {userName}, {dogName} ha una nuova missione che vi aspetta!'
        }
      },
      channels: ['push', 'email', 'inbox'],
      fallbackChannel: 'inbox',
      priority: 'medium',
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'dogName', type: 'string', required: true }
      ],
      requiresConsent: false,
      consentTypes: ['caring'],
      active: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }
  }

  private async getUserPreferences(userId: string): Promise<UserChannelPreferences> {
    // Mock user preferences - in production fetch from database
    return {
      userId,
      channels: {
        push: { enabled: true, transactional: true, marketing: true, caring: true, reminders: true },
        email: { enabled: true, transactional: true, marketing: true, caring: true, reminders: true },
        whatsapp: { enabled: false, transactional: false, marketing: false, caring: false, reminders: false },
        sms: { enabled: false, transactional: true, marketing: false, caring: false, reminders: false },
        inbox: { enabled: true, transactional: true, marketing: true, caring: true, reminders: true }
      },
      preferredChannels: ['push', 'inbox', 'email'],
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        allowCritical: true
      },
      timezone: 'Europe/Rome',
      frequencyLimits: {
        maxPushPerDay: 5,
        maxEmailPerDay: 3,
        maxWhatsAppPerWeek: 2,
        maxSMSPerWeek: 1,
        maxJourneyMessagesPerDay: 2
      },
      language: 'it',
      locale: 'it-IT',
      channelPerformance: {
        push: { totalSent: 100, totalDelivered: 95, totalRead: 60, totalClicked: 15, deliveryRate: 0.95, openRate: 0.63, clickRate: 0.25, engagementScore: 0.8, updatedAt: new Date().toISOString() },
        email: { totalSent: 50, totalDelivered: 48, totalRead: 25, totalClicked: 8, deliveryRate: 0.96, openRate: 0.52, clickRate: 0.32, engagementScore: 0.6, updatedAt: new Date().toISOString() },
        whatsapp: { totalSent: 0, totalDelivered: 0, totalRead: 0, totalClicked: 0, deliveryRate: 0, openRate: 0, clickRate: 0, engagementScore: 0, updatedAt: new Date().toISOString() },
        sms: { totalSent: 5, totalDelivered: 5, totalRead: 3, totalClicked: 1, deliveryRate: 1, openRate: 0.6, clickRate: 0.33, engagementScore: 0.4, updatedAt: new Date().toISOString() },
        inbox: { totalSent: 200, totalDelivered: 200, totalRead: 150, totalClicked: 45, deliveryRate: 1, openRate: 0.75, clickRate: 0.3, engagementScore: 0.9, updatedAt: new Date().toISOString() }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private async getRecentChannelActivity(userId: string): Promise<Record<CommunicationChannel, number>> {
    // Mock recent activity - in production query database
    return {
      push: 1,
      email: 0,
      whatsapp: 0,
      sms: 0,
      inbox: 2
    }
  }

  private async getMessageCount(
    userId: string,
    channel: CommunicationChannel,
    date: string,
    period: 'day' | 'week' = 'day'
  ): Promise<number> {
    // Mock message count - in production query database
    return Math.floor(Math.random() * 3) // 0-2 messages
  }

  private async scheduleMessage(message: Message): Promise<SendMessageResponse> {
    // Mock scheduling - in production use a job queue
    console.log(`Message ${message.messageId} scheduled for ${message.scheduledAt}`)

    return {
      messageId: message.messageId,
      status: 'queued',
      channel: message.channel,
      scheduledAt: message.scheduledAt!
    }
  }

  private async updateMessageStatus(messageId: string, updates: Partial<Message>): Promise<void> {
    // Mock status update - in production update database
    console.log(`Message ${messageId} status updated:`, updates)
  }

  private async createInboxBackup(message: Message): Promise<void> {
    // Always create inbox message as backup
    await this.createInboxMessage(message)
  }

  private async createInboxMessage(message: Message): Promise<{ inboxMessageId: string }> {
    // Mock inbox message creation - in production insert into database
    const inboxMessageId = `inbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`Inbox message created: ${inboxMessageId} for user ${message.userId}`)

    return { inboxMessageId }
  }

  private async trackMessageEvent(eventType: string, message: Message, result?: any): Promise<void> {
    // Mock analytics tracking - in production send to GA4
    console.log(`Analytics: ${eventType}`, {
      messageId: message.messageId,
      userId: message.userId,
      channel: message.channel,
      templateId: message.templateId,
      result
    })
  }
}