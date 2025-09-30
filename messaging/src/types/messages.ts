export interface BaseMessage {
  userId: string;
  campaignId?: string;
  type?: 'transactional' | 'promotional' | 'notification';
  priority?: 'high' | 'normal' | 'low';
  metadata?: { [key: string]: any };
}

export interface EmailMessage extends BaseMessage {
  recipient: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: { [key: string]: any };
  replyTo?: string;
  categories?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type: string; // MIME type
  disposition?: 'attachment' | 'inline';
}

export interface SMSMessage extends BaseMessage {
  recipient: string;
  text: string;
  shortLinks?: boolean;
}

export interface WhatsAppMessage extends BaseMessage {
  recipient: string;
  messageType: 'text' | 'image' | 'document' | 'interactive';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  previewUrl?: boolean;
  interactive?: WhatsAppInteractive;
}

export interface WhatsAppInteractive {
  type: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'document';
    text?: string;
    image?: { link: string };
    document?: { link: string; filename: string };
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: WhatsAppAction;
}

export interface WhatsAppAction {
  buttons?: Array<{
    type: 'reply';
    reply: {
      id: string;
      title: string;
    };
  }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface PushMessage extends BaseMessage {
  tokens: string | string[];
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
  icon?: string;
  color?: string;
  sound?: string;
  badge?: number;
  channelId?: string;
  tag?: string;
  clickAction?: string;
  category?: string;
  mutableContent?: boolean;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'sendgrid' | 'twilio' | 'whatsapp' | 'fcm';
  timestamp: Date;
  recipient?: string;
  scheduled?: boolean;
  scheduleTime?: Date;
  metadata?: any;
}

export interface Campaign {
  id?: string;
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push' | 'multi_channel';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'cancelled';
  audience: CampaignAudience;
  content: CampaignContent;
  schedule?: CampaignSchedule;
  settings: CampaignSettings;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

export interface CampaignAudience {
  type: 'all_users' | 'segment' | 'custom';
  segmentId?: string;
  userIds?: string[];
  filters?: AudienceFilter[];
}

export interface AudienceFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface CampaignContent {
  channels: {
    email?: EmailCampaignContent;
    sms?: SMSCampaignContent;
    whatsapp?: WhatsAppCampaignContent;
    push?: PushCampaignContent;
  };
}

export interface EmailCampaignContent {
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: { [key: string]: any };
}

export interface SMSCampaignContent {
  text: string;
}

export interface WhatsAppCampaignContent {
  templateName?: string;
  languageCode?: string;
  parameters?: string[];
  messageType: 'template' | 'text';
  text?: string;
}

export interface PushCampaignContent {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
  icon?: string;
  clickAction?: string;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  };
}

export interface CampaignSettings {
  sendTimeOptimization?: boolean;
  respectQuietHours?: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  maxSendsPerDay?: number;
  testPercentage?: number;
  trackingEnabled?: boolean;
}

export interface MessageTemplate {
  id?: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string; // For email
  content: string;
  variables: TemplateVariable[];
  category?: string;
  language?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface MessageEvent {
  id?: string;
  messageId: string;
  userId: string;
  campaignId?: string;
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  provider: 'sendgrid' | 'twilio' | 'whatsapp' | 'fcm';
  timestamp: Date;
  metadata?: { [key: string]: any };
}

export interface UserPreferences {
  userId: string;
  email?: {
    enabled: boolean;
    promotional: boolean;
    transactional: boolean;
    frequency: 'immediate' | 'daily_digest' | 'weekly_digest';
  };
  sms?: {
    enabled: boolean;
    promotional: boolean;
    transactional: boolean;
  };
  whatsapp?: {
    enabled: boolean;
    promotional: boolean;
    transactional: boolean;
  };
  push?: {
    enabled: boolean;
    promotional: boolean;
    transactional: boolean;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  timezone?: string;
  language?: string;
  updatedAt?: Date;
}