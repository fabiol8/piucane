// Messaging system type definitions

export interface MessageTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category: 'onboarding' | 'transactional' | 'marketing' | 'health' | 'emergency';
  channels: MessageChannel[];
  variables: TemplateVariable[];
  content: {
    email?: EmailContent;
    push?: PushContent;
    whatsapp?: WhatsAppContent;
    inapp?: InAppContent;
  };
  conditions?: MessageCondition[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface EmailContent {
  subject: string;
  preheader?: string;
  mjmlTemplate: string; // MJML template
  textVersion?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface PushContent {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  deepLink?: string;
  data?: Record<string, any>;
}

export interface WhatsAppContent {
  templateName: string;
  languageCode: string;
  components: WhatsAppComponent[];
}

export interface WhatsAppComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters?: WhatsAppParameter[];
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallbackValue: string;
    code: string;
    amount1000: number;
  };
  dateTime?: {
    fallbackValue: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

export interface InAppContent {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion';
  action?: {
    label: string;
    url: string;
    deepLink?: string;
  };
  dismissible: boolean;
  expiresAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface MessageCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export type MessageChannel = 'email' | 'push' | 'whatsapp' | 'inapp' | 'sms';

export interface MessageRequest {
  templateKey: string;
  userId: string;
  variables: Record<string, any>;
  channels?: MessageChannel[];
  scheduledAt?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface MessageRecipient {
  userId: string;
  email?: string;
  phone?: string;
  fcmTokens?: string[];
  whatsappNumber?: string;
  preferredChannel?: MessageChannel;
  timezone?: string;
  language?: string;
  unsubscribed?: MessageChannel[];
  quietHours?: {
    start: string; // HH:mm
    end: string;   // HH:mm
    timezone: string;
  };
}

export interface MessageStatus {
  id: string;
  messageId: string;
  channel: MessageChannel;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'complained';
  providerId?: string;
  providerMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface MessageDelivery {
  id: string;
  templateKey: string;
  userId: string;
  channels: MessageChannel[];
  variables: Record<string, any>;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: Record<string, any>;
  tags: string[];
  statuses: MessageStatus[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InboxMessage {
  id: string;
  userId: string;
  type: 'system' | 'transactional' | 'marketing' | 'health' | 'ai' | 'support';
  title: string;
  content: string;
  summary?: string;
  read: boolean;
  readAt?: Date;
  archived: boolean;
  archivedAt?: Date;
  starred: boolean;
  starredAt?: Date;
  channel: MessageChannel;
  templateKey?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags: string[];
  metadata: Record<string, any>;
  attachments?: MessageAttachment[];
  actions?: MessageAction[];
  relatedMessageId?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  downloadCount: number;
}

export interface MessageAction {
  id: string;
  label: string;
  type: 'link' | 'api_call' | 'deep_link';
  url?: string;
  apiEndpoint?: string;
  deepLink?: string;
  style: 'primary' | 'secondary' | 'danger';
  completed: boolean;
  completedAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    categories: string[];
    frequency: 'immediate' | 'daily' | 'weekly';
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  push: {
    enabled: boolean;
    categories: string[];
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  whatsapp: {
    enabled: boolean;
    categories: string[];
    number?: string;
  };
  inapp: {
    enabled: boolean;
    categories: string[];
  };
  marketing: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    whatsappEnabled: boolean;
  };
  updatedAt: Date;
}

export interface MessageProvider {
  id: string;
  name: string;
  type: 'email' | 'push' | 'whatsapp' | 'sms';
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  failover?: string; // provider ID to failover to
  healthCheck: {
    url?: string;
    interval: number; // seconds
    lastCheck?: Date;
    status: 'healthy' | 'degraded' | 'down';
  };
}

export interface MessageAnalytics {
  templateKey: string;
  channel: MessageChannel;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
    unsubscribeRate: number;
  };
  topVariables?: Record<string, any>;
  segmentPerformance?: Record<string, any>;
}

export interface MessageQueue {
  id: string;
  name: string;
  priority: number;
  maxConcurrency: number;
  retryPolicy: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential';
    initialDelay: number; // seconds
    maxDelay: number; // seconds
  };
  dlq: {
    enabled: boolean;
    maxAge: number; // seconds
  };
  metrics: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

// Provider-specific types
export interface SendGridMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  headers?: Record<string, string>;
  customArgs?: Record<string, string>;
}

export interface MailgunMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  'h:X-Mailgun-Variables'?: string;
  'o:tag'?: string[];
  'o:campaign'?: string;
}

export interface TwilioMessage {
  from: string;
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: string;
  mediaUrl?: string[];
}

export interface FCMMessage {
  token?: string;
  topic?: string;
  condition?: string;
  notification?: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'normal' | 'high';
    notification?: {
      icon?: string;
      color?: string;
      sound?: string;
      tag?: string;
      clickAction?: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        alert?: {
          title?: string;
          body?: string;
        };
        badge?: number;
        sound?: string;
        category?: string;
        'thread-id'?: string;
      };
    };
  };
  webpush?: {
    headers?: Record<string, string>;
    data?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      image?: string;
      badge?: string;
      tag?: string;
      renotify?: boolean;
      requireInteraction?: boolean;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    };
  };
}