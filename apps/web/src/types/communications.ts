// ===============================
// 🔔 ORCHESTRATORE COMUNICAZIONI
// ===============================

export type CommunicationChannel = 'push' | 'email' | 'whatsapp' | 'sms' | 'inbox'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read' | 'clicked'

export type MessagePriority = 'low' | 'medium' | 'high' | 'critical'

export type JourneyType = 'onboarding' | 'extracaring30d' | 'winback' | 'transactional' | 'retention' | 'seasonal'

export type TemplateCategory = 'transactional' | 'marketing' | 'caring' | 'journey' | 'reminder' | 'emergency'

// ===============================
// MESSAGGIO
// ===============================

export interface Message {
  messageId: string
  userId: string
  dogId?: string | null
  templateId: string
  channel: CommunicationChannel
  priority: MessagePriority

  // Contenuto
  payload: MessagePayload

  // Journey context
  journeyId?: string | null
  journeyStepId?: string | null

  // Stato e timing
  status: MessageStatus
  scheduledAt?: string | null  // quando deve essere inviato
  sentAt?: string | null
  deliveredAt?: string | null
  readAt?: string | null
  clickedAt?: string | null
  failedAt?: string | null

  // Metadata
  fallbackChannel?: CommunicationChannel | null
  retryCount: number
  maxRetries: number

  // Analytics
  campaignId?: string | null
  segmentId?: string | null

  // Compliance
  consentId?: string | null
  gdprCompliant: boolean

  // Audit
  createdAt: string
  updatedAt: string
  createdBy?: string | null // system, admin, journey
}

export interface MessagePayload {
  subject?: string
  title?: string
  body: string
  html?: string // for email

  // Rich content
  imageUrl?: string
  iconUrl?: string

  // Actions
  cta?: MessageCTA[]
  deeplink?: string

  // Personalization data
  variables?: Record<string, any>

  // Channel specific
  channelData?: {
    push?: PushPayload
    email?: EmailPayload
    whatsapp?: WhatsAppPayload
    sms?: SMSPayload
    inbox?: InboxPayload
  }
}

export interface MessageCTA {
  id: string
  text: string
  url?: string
  deeplink?: string
  action?: string
  style?: 'primary' | 'secondary' | 'danger'
}

// Channel-specific payloads
export interface PushPayload {
  badge?: number
  sound?: string
  category?: string
  threadId?: string
  collapseKey?: string
  ttl?: number
}

export interface EmailPayload {
  fromName?: string
  fromEmail?: string
  replyTo?: string
  attachments?: EmailAttachment[]
  trackingEnabled?: boolean
}

export interface EmailAttachment {
  filename: string
  contentType: string
  content: string // base64
  cid?: string // for inline images
}

export interface WhatsAppPayload {
  templateName?: string
  templateLanguage?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
}

export interface SMSPayload {
  shortCode?: string
  alphaNumericSender?: string
}

export interface InboxPayload {
  badge?: string
  category?: string
  avatar?: string
  persistent?: boolean // rimane sempre in inbox
  expiresAt?: string
}

// ===============================
// TEMPLATE SYSTEM
// ===============================

export interface MessageTemplate {
  templateId: string
  name: string
  description?: string
  category: TemplateCategory

  // Content per canale
  content: {
    push?: TemplateContent
    email?: TemplateContent
    whatsapp?: TemplateContent
    sms?: TemplateContent
    inbox?: TemplateContent
  }

  // Configurazione
  channels: CommunicationChannel[]
  fallbackChannel?: CommunicationChannel
  priority: MessagePriority

  // Variables
  variables: TemplateVariable[]

  // Targeting
  audienceRules?: AudienceRule[]

  // Compliance
  requiresConsent: boolean
  consentTypes: string[]

  // A/B Testing
  variants?: TemplateVariant[]

  // Lifecycle
  active: boolean
  version: number
  publishedAt?: string | null

  // Audit
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface TemplateContent {
  subject?: string
  title?: string
  body: string
  html?: string

  // Personalization
  preview?: string // preview text for email

  // Media
  imageUrl?: string
  iconUrl?: string

  // Actions
  cta?: MessageCTA[]

  // Channel specific
  channelConfig?: Record<string, any>
}

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'object'
  required: boolean
  defaultValue?: any
  description?: string

  // Validation
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    enum?: string[]
  }
}

export interface TemplateVariant {
  variantId: string
  name: string
  weight: number // percentage of traffic
  content: Record<CommunicationChannel, TemplateContent>
}

export interface AudienceRule {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

// ===============================
// JOURNEY AUTOMATION
// ===============================

export interface Journey {
  journeyId: string
  name: string
  description?: string
  type: JourneyType

  // Configuration
  active: boolean
  trigger: JourneyTrigger
  steps: JourneyStep[]

  // Targeting
  audienceRules?: AudienceRule[]

  // Settings
  settings: JourneySettings

  // Analytics
  stats?: JourneyStats

  // Lifecycle
  version: number
  publishedAt?: string | null

  // Audit
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface JourneyTrigger {
  type: 'event' | 'date' | 'behavior' | 'manual'

  // Event trigger
  eventName?: string
  eventProperties?: Record<string, any>

  // Date trigger
  dateField?: string // user field to use for date calculation
  offsetDays?: number
  offsetHours?: number

  // Behavior trigger
  inactivityDays?: number
  conditions?: AudienceRule[]
}

export interface JourneyStep {
  stepId: string
  name: string
  order: number

  // Timing
  delayDays?: number
  delayHours?: number
  delayMinutes?: number

  // Action
  action: JourneyAction

  // Conditions
  conditions?: JourneyCondition[]

  // Branches
  branches?: JourneyBranch[]
}

export interface JourneyAction {
  type: 'send_message' | 'wait' | 'update_property' | 'add_tag' | 'remove_tag' | 'webhook'

  // Message action
  templateId?: string
  channelPolicy?: ChannelPolicy

  // Property action
  propertyName?: string
  propertyValue?: any

  // Tag action
  tags?: string[]

  // Webhook action
  webhookUrl?: string
  webhookMethod?: 'GET' | 'POST' | 'PUT'
  webhookData?: Record<string, any>
}

export interface JourneyCondition {
  field: string
  operator: string
  value: any
  action: 'continue' | 'exit' | 'branch'
  branchId?: string
}

export interface JourneyBranch {
  branchId: string
  name: string
  condition: JourneyCondition
  steps: JourneyStep[]
}

export interface JourneySettings {
  timezone: string

  // Frequency limits
  maxMessagesPerDay?: number
  maxMessagesPerWeek?: number

  // Quiet hours
  respectQuietHours: boolean

  // Exit conditions
  exitOnConversion?: boolean
  exitEvents?: string[]

  // Re-entry
  allowReEntry: boolean
  reEntryCooldownDays?: number
}

export interface JourneyStats {
  totalEntered: number
  totalCompleted: number
  totalExited: number
  conversionRate: number
  avgCompletionTime: number

  stepStats: Record<string, {
    entered: number
    completed: number
    conversionRate: number
  }>
}

// ===============================
// USER ENROLLMENT
// ===============================

export interface JourneyEnrollment {
  enrollmentId: string
  journeyId: string
  userId: string
  dogId?: string | null

  // State
  status: 'active' | 'completed' | 'exited' | 'paused'
  currentStepId?: string | null
  nextExecutionAt?: string | null

  // Progress
  stepsCompleted: string[]
  messagesReceived: string[]

  // Context
  enrollmentContext: Record<string, any>

  // Lifecycle
  enrolledAt: string
  completedAt?: string | null
  exitedAt?: string | null
  exitReason?: string | null

  // Audit
  createdAt: string
  updatedAt: string
}

// ===============================
// CHANNEL PREFERENCES
// ===============================

export interface UserChannelPreferences {
  userId: string

  // Channel consents
  channels: {
    push: ChannelConsent
    email: ChannelConsent
    whatsapp: ChannelConsent
    sms: ChannelConsent
    inbox: ChannelConsent
  }

  // Preferences
  preferredChannels: CommunicationChannel[]

  // Timing
  quietHours: QuietHours
  timezone: string

  // Frequency limits
  frequencyLimits: FrequencyLimits

  // Language & localization
  language: string
  locale: string

  // Performance tracking
  channelPerformance: Record<CommunicationChannel, ChannelPerformance>

  // Audit
  createdAt: string
  updatedAt: string
}

export interface ChannelConsent {
  enabled: boolean
  consentedAt?: string | null
  consentSource?: string // 'registration', 'settings', 'journey'

  // Specific consent types
  transactional: boolean
  marketing: boolean
  caring: boolean
  reminders: boolean

  // GDPR
  gdprConsent?: boolean
  gdprConsentedAt?: string | null
  gdprConsentId?: string | null
}

export interface QuietHours {
  enabled: boolean
  startTime: string // HH:mm format
  endTime: string   // HH:mm format
  timezone?: string

  // Exception for critical messages
  allowCritical: boolean
}

export interface FrequencyLimits {
  maxPushPerDay: number
  maxEmailPerDay: number
  maxWhatsAppPerWeek: number
  maxSMSPerWeek: number

  // Journey limits
  maxJourneyMessagesPerDay: number
}

export interface ChannelPerformance {
  totalSent: number
  totalDelivered: number
  totalRead: number
  totalClicked: number

  // Rates
  deliveryRate: number
  openRate: number
  clickRate: number

  // Engagement score (0-1)
  engagementScore: number

  // Last activity
  lastSentAt?: string | null
  lastReadAt?: string | null
  lastClickedAt?: string | null

  // Updated timestamp
  updatedAt: string
}

// ===============================
// CHANNEL POLICY
// ===============================

export interface ChannelPolicy {
  primary: CommunicationChannel
  fallbacks: CommunicationChannel[]

  // Rules
  rules: ChannelRule[]

  // Timing
  respectQuietHours: boolean
  respectFrequencyLimits: boolean

  // Retries
  maxRetries: number
  retryDelayMinutes: number[]
}

export interface ChannelRule {
  condition: string // JavaScript expression
  channel: CommunicationChannel
  priority: number
}

// ===============================
// ORCHESTRATOR CONFIG
// ===============================

export interface OrchestratorConfig {
  // Global settings
  enabled: boolean
  defaultChannel: CommunicationChannel
  fallbackChannel: CommunicationChannel

  // Timing
  defaultQuietHours: QuietHours
  defaultFrequencyLimits: FrequencyLimits

  // Retry logic
  defaultMaxRetries: number
  defaultRetryDelays: number[] // minutes

  // Performance
  channelWeights: Record<CommunicationChannel, number>

  // Compliance
  gdprEnabled: boolean
  requireConsentForMarketing: boolean

  // Feature flags
  features: {
    journeysEnabled: boolean
    abTestingEnabled: boolean
    smartChannelSelection: boolean
    predictiveDelivery: boolean
  }

  // Provider configs
  providers: {
    email?: EmailProviderConfig
    push?: PushProviderConfig
    whatsapp?: WhatsAppProviderConfig
    sms?: SMSProviderConfig
  }
}

export interface EmailProviderConfig {
  provider: 'sendgrid' | 'ses' | 'mailgun'
  apiKey: string
  fromEmail: string
  fromName: string
  replyToEmail?: string
  trackingEnabled: boolean
}

export interface PushProviderConfig {
  provider: 'fcm' | 'apns' | 'onesignal'
  apiKey: string
  projectId?: string
  bundleId?: string
}

export interface WhatsAppProviderConfig {
  provider: 'twilio' | 'vonage'
  apiKey: string
  phoneNumberId: string
  accessToken: string
}

export interface SMSProviderConfig {
  provider: 'twilio' | 'vonage'
  apiKey: string
  apiSecret?: string
  fromNumber: string
}

// ===============================
// INBOX SYSTEM
// ===============================

export interface InboxMessage {
  inboxMessageId: string
  userId: string
  dogId?: string | null

  // Link to original message
  messageId?: string | null

  // Content
  title: string
  body: string
  summary?: string

  // Visual
  avatar?: string
  iconUrl?: string
  imageUrl?: string

  // Categorization
  category: InboxCategory
  badge?: string
  priority: MessagePriority

  // State
  read: boolean
  starred: boolean
  archived: boolean

  // Actions
  cta?: MessageCTA[]
  deeplink?: string

  // Metadata
  source: string // 'journey', 'manual', 'system'
  sourceId?: string

  // Persistence
  persistent: boolean
  expiresAt?: string | null

  // Timing
  readAt?: string | null
  starredAt?: string | null
  archivedAt?: string | null

  // Audit
  createdAt: string
  updatedAt: string
}

export type InboxCategory =
  | 'transactional'
  | 'caring'
  | 'health'
  | 'orders'
  | 'missions'
  | 'promotions'
  | 'system'
  | 'journey'

export interface InboxStats {
  total: number
  unread: number
  starred: number
  archived: number

  byCategory: Record<InboxCategory, number>
  byPriority: Record<MessagePriority, number>
}

// ===============================
// ANALYTICS & REPORTING
// ===============================

export interface CommunicationAnalytics {
  // Time period
  startDate: string
  endDate: string

  // Overall metrics
  totalMessages: number
  totalUsers: number

  // By channel
  channelMetrics: Record<CommunicationChannel, ChannelMetrics>

  // Journey performance
  journeyMetrics: Record<string, JourneyMetrics>

  // Template performance
  templateMetrics: Record<string, TemplateMetrics>

  // User engagement
  userEngagement: UserEngagementMetrics

  // Compliance
  complianceMetrics: ComplianceMetrics
}

export interface ChannelMetrics {
  sent: number
  delivered: number
  failed: number
  read: number
  clicked: number

  deliveryRate: number
  openRate: number
  clickRate: number

  avgDeliveryTime: number
  avgReadTime: number
}

export interface JourneyMetrics {
  enrolled: number
  completed: number
  exited: number

  completionRate: number
  avgCompletionTime: number

  stepMetrics: Record<string, {
    entered: number
    completed: number
    exitRate: number
  }>
}

export interface TemplateMetrics {
  sent: number
  delivered: number
  read: number
  clicked: number

  openRate: number
  clickRate: number

  conversionRate: number
  revenue?: number
}

export interface UserEngagementMetrics {
  activeUsers: number
  engagedUsers: number
  quietUsers: number
  churnedUsers: number

  avgMessagesPerUser: number
  avgEngagementScore: number
}

export interface ComplianceMetrics {
  totalOptIns: number
  totalOptOuts: number
  gdprRequests: number
  quietHoursRespected: number
  frequencyLimitsRespected: number
}

// ===============================
// EVENT SYSTEM
// ===============================

export interface CommunicationEvent {
  eventId: string
  eventType: CommunicationEventType
  userId: string
  dogId?: string | null

  // Context
  messageId?: string | null
  journeyId?: string | null
  templateId?: string | null

  // Event data
  eventData: Record<string, any>

  // Timing
  timestamp: string

  // Source
  source: string
  userAgent?: string | null
  ipAddress?: string | null
}

export type CommunicationEventType =
  | 'message.sent'
  | 'message.delivered'
  | 'message.failed'
  | 'message.read'
  | 'message.clicked'
  | 'journey.enrolled'
  | 'journey.completed'
  | 'journey.exited'
  | 'channel.opted_in'
  | 'channel.opted_out'
  | 'preferences.updated'

// ===============================
// API RESPONSES
// ===============================

export interface SendMessageRequest {
  userId: string
  dogId?: string | null
  templateId: string
  channel?: CommunicationChannel | null
  variables?: Record<string, any>
  scheduledAt?: string | null
  priority?: MessagePriority
}

export interface SendMessageResponse {
  messageId: string
  status: 'queued' | 'sent' | 'failed'
  channel: CommunicationChannel
  scheduledAt?: string | null
  estimatedDelivery?: string | null
}

export interface EnrollInJourneyRequest {
  userId: string
  dogId?: string | null
  journeyId: string
  context?: Record<string, any>
  startAt?: string | null
}

export interface EnrollInJourneyResponse {
  enrollmentId: string
  status: 'enrolled' | 'already_enrolled' | 'failed'
  nextExecutionAt?: string | null
}

// ===============================
// PREDEFINED JOURNEYS
// ===============================

export const PREDEFINED_JOURNEYS = {
  ONBOARDING: 'journey_onboarding',
  EXTRA_CARING_30D: 'journey_extracaring_30d',
  WINBACK_60D: 'journey_winback_60d',
  WINBACK_90D: 'journey_winback_90d',
  HEALTH_REMINDER: 'journey_health_reminder',
  ORDER_FOLLOWUP: 'journey_order_followup',
  MISSION_REMINDER: 'journey_mission_reminder'
} as const

export const PREDEFINED_TEMPLATES = {
  // Onboarding
  WELCOME: 'template_welcome',
  PROFILE_REMINDER: 'template_profile_reminder',
  FIRST_MISSION: 'template_first_mission',

  // Health
  VACCINATION_REMINDER: 'template_vaccination_reminder',
  CHECKUP_REMINDER: 'template_checkup_reminder',
  MEDICATION_REMINDER: 'template_medication_reminder',

  // Orders
  ORDER_CONFIRMED: 'template_order_confirmed',
  ORDER_SHIPPED: 'template_order_shipped',
  ORDER_DELIVERED: 'template_order_delivered',

  // Caring
  FEEDING_REMINDER: 'template_feeding_reminder',
  NUTRITION_TIP: 'template_nutrition_tip',
  EXERCISE_REMINDER: 'template_exercise_reminder',

  // Missions
  MISSION_AVAILABLE: 'template_mission_available',
  MISSION_COMPLETED: 'template_mission_completed',
  MISSION_REWARD: 'template_mission_reward',

  // Winback
  WINBACK_GENTLE: 'template_winback_gentle',
  WINBACK_OFFER: 'template_winback_offer',
  WINBACK_FINAL: 'template_winback_final'
} as const

// ===============================
// ERROR TYPES
// ===============================

export interface CommunicationError {
  code: string
  message: string
  details?: Record<string, any>
  retryable: boolean
}

export const COMMUNICATION_ERROR_CODES = {
  INVALID_TEMPLATE: 'INVALID_TEMPLATE',
  CHANNEL_DISABLED: 'CHANNEL_DISABLED',
  USER_OPTED_OUT: 'USER_OPTED_OUT',
  QUIET_HOURS: 'QUIET_HOURS',
  FREQUENCY_LIMIT: 'FREQUENCY_LIMIT',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED'
} as const