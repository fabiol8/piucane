export { EmailService } from './messaging/email';
export { PushService } from './messaging/push';
export { evaluateTriage } from './triage';

export type { EmailConfig, EmailTemplate, EmailData } from './messaging/email';
export type { PushNotification, PushTemplate } from './messaging/push';
export type { TriageInput, TriageResult, UrgencyLevel } from './triage';
