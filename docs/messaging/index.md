# Messaging & Communication — Index
**Owner:** Backend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Sistema comunicazione multicanale unificato: email, push, WhatsApp, in-app notifications con orchestratore intelligente e template management.

## Contenuti
- [templates.md](./templates.md) — Template management (MJML email, push, WhatsApp, in-app)
- [orchestrator.md](./orchestrator.md) — Orchestratore comunicazioni (best channel, quiet hours, rate limiting)
- [providers.md](./providers.md) — Provider integrations (SendGrid, FCM, Twilio, Mailgun)

## Architecture

### Components
```
┌─────────────────────────────────────────────────┐
│          Communication Orchestrator              │
│  (Best channel, timing, rate limit, A/B test)   │
└──────────────┬──────────────────────────────────┘
               │
     ┌─────────┼─────────┬─────────┬────────────┐
     │         │         │         │            │
  ┌──▼──┐  ┌──▼──┐  ┌──▼───┐  ┌──▼──┐    ┌───▼────┐
  │Email│  │Push │  │WhatsApp││In-App│   │  Inbox │
  │     │  │(FCM)│  │(Twilio)││      │   │(Always)│
  └─────┘  └─────┘  └────────┘  └─────┘    └────────┘
```

### Firestore Collections
```
messageTemplates/ - Template definitions (all channels)
messages/ - Sent message log
inbox/{uid}/messages/ - User inbox (persistent copy)
userPreferences/{uid} - Channel preferences, quiet hours
```

## Message Channels

### 1. Email (Transactional)
**Provider**: SendGrid (primary), Mailgun (backup)
**Use cases**: Order confirmation, password reset, subscription renewal
**Format**: MJML → HTML + plain text fallback

### 2. Push Notifications
**Provider**: Firebase Cloud Messaging (FCM)
**Use cases**: Order shipped, mission completed, reminder
**Format**: Title (60 char) + Body (240 char) + deeplink

### 3. WhatsApp
**Provider**: Twilio (o Meta Business API)
**Use cases**: Order updates, customer support replies
**Format**: Template approved by WhatsApp (placeholders)

### 4. In-App Notifications
**Storage**: Firestore `inbox/{uid}/messages/`
**Use cases**: Tutte le comunicazioni (backup persistente)
**Format**: HTML sanitized

### 5. SMS
**Provider**: Twilio
**Use cases**: OTP, urgent alerts
**Format**: Plain text (160 char)

## Unified Message Interface

```ts
interface Message {
  id: string;
  userId: string;

  // Template
  templateKey: string; // 'order_shipped', 'vaccine_reminder', etc.
  templateVersion: string;

  // Content (rendered)
  subject?: string; // email only
  title?: string; // push/in-app
  body: string;
  htmlBody?: string; // email/in-app

  // Channel
  channel: 'email' | 'push' | 'whatsapp' | 'inapp' | 'sms';

  // Delivery
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  failureReason?: string;

  // Provider tracking
  providerMessageId?: string; // SendGrid msg ID, FCM token, etc.

  // Engagement
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
  clickedLinks?: string[];

  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[]; // ['transactional', 'marketing', 'order']
  data: Record<string, any>; // template variables

  createdAt: Timestamp;
}
```

## Template System

Vedi [templates.md](./templates.md) per dettagli completi.

### Template Schema
```ts
// messageTemplates/{templateKey}
interface MessageTemplate {
  key: string; // 'order_shipped'
  name: string; // "Ordine Spedito"
  description: string;

  // Versions (for A/B testing)
  versions: TemplateVersion[];
  activeVersion: string;

  // Channels
  channels: {
    email?: EmailTemplate;
    push?: PushTemplate;
    whatsapp?: WhatsAppTemplate;
    inapp?: InAppTemplate;
  };

  // Variables (placeholders)
  variables: Array<{
    key: string; // '{{firstName}}'
    type: 'string' | 'number' | 'date' | 'url';
    required: boolean;
    description: string;
  }>;

  // Metadata
  category: 'transactional' | 'marketing' | 'system';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Email Template (MJML)
```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          Ciao {{firstName}},
        </mj-text>
        <mj-text>
          Il tuo ordine #{{orderId}} è stato spedito! 📦
        </mj-text>
        <mj-button href="{{trackingUrl}}">
          Traccia la spedizione
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Push Template
```json
{
  "title": "Ordine Spedito! 📦",
  "body": "{{dogName}} riceverà il suo ordine tra 2-3 giorni",
  "deeplink": "/orders/{{orderId}}",
  "icon": "package",
  "badge": 1
}
```

### WhatsApp Template (Pre-approved)
```
Ciao {{1}},
Il tuo ordine {{2}} è stato spedito.
Traccia qui: {{3}}
```

## Communication Orchestrator

Vedi [orchestrator.md](./orchestrator.md) per algoritmo completo.

### Best Channel Selection
```ts
async function selectBestChannel(
  userId: string,
  templateKey: string
): Promise<Channel> {
  const user = await getUser(userId);
  const prefs = await getUserPreferences(userId);

  // 1. Check user preferences
  if (prefs.preferredChannel && channelAvailable(prefs.preferredChannel)) {
    return prefs.preferredChannel;
  }

  // 2. Check template category
  const template = await getTemplate(templateKey);
  if (template.category === 'transactional') {
    // Always email for transactional
    return 'email';
  }

  // 3. Historical performance (learning algorithm)
  const metrics = await getChannelMetrics(userId);
  const bestPerforming = Object.entries(metrics)
    .sort(([, a], [, b]) => b.engagementRate - a.engagementRate)[0];

  return bestPerforming[0] as Channel;
}
```

### Channel Metrics
```ts
interface ChannelMetrics {
  email: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    openRate: number; // opened / delivered
    clickRate: number; // clicked / opened
    conversionRate: number; // action taken / clicked
  };
  push: { /* similar */ };
  whatsapp: { /* similar */ };
}
```

### Quiet Hours
**Default**: 22:00 - 08:00 (no push/SMS)
**User configurable**: Via app settings

```ts
function canSendNow(userId: string, channel: Channel): boolean {
  if (channel === 'email' || channel === 'inapp') {
    return true; // Email sempre ok (utente legge quando vuole)
  }

  const prefs = await getUserPreferences(userId);
  const quietHours = prefs.quietHours || { start: '22:00', end: '08:00' };

  const now = new Date();
  const hour = now.getHours();

  const startHour = parseInt(quietHours.start.split(':')[0]);
  const endHour = parseInt(quietHours.end.split(':')[0]);

  if (hour >= startHour || hour < endHour) {
    // In quiet hours → queue for later
    return false;
  }

  return true;
}
```

### Rate Limiting
**Rules**:
- Max 3 marketing emails/settimana
- Max 5 push/giorno
- Max 2 WhatsApp/giorno
- No limit transactional

```ts
async function checkRateLimit(
  userId: string,
  channel: Channel,
  category: 'transactional' | 'marketing'
): Promise<boolean> {
  if (category === 'transactional') {
    return true; // No limit
  }

  const window = channel === 'email' ? 7 : 1; // days
  const limit = channel === 'email' ? 3 : (channel === 'push' ? 5 : 2);

  const count = await countRecentMessages(userId, channel, window);

  return count < limit;
}
```

## Inbox (Persistent Copy)

**Rule**: Ogni messaggio inviato → copia in `inbox/{uid}/messages/`

**Benefits**:
- User può rileggere messaggi
- Storico comunicazioni
- No dipendenza da email/push delivery
- Unified notification center

```ts
// inbox/{uid}/messages/{messageId}
interface InboxMessage {
  id: string;
  type: 'transactional' | 'marketing' | 'system';
  category: 'order' | 'subscription' | 'reminder' | 'promo';

  subject: string;
  htmlBody: string;

  isRead: boolean;
  readAt?: Timestamp;

  actionButton?: {
    label: string;
    url: string;
  };

  createdAt: Timestamp;
  expiresAt?: Timestamp; // optional auto-delete
}
```

## Providers Integration

Vedi [providers.md](./providers.md) per dettagli setup.

### SendGrid (Email)
```ts
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail(message: EmailMessage) {
  const msg = {
    to: message.to,
    from: 'noreply@piucane.it',
    subject: message.subject,
    html: message.htmlBody,
    text: message.textBody,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    }
  };

  const [response] = await sgMail.send(msg);
  return response.headers['x-message-id'];
}
```

### FCM (Push)
```ts
import admin from 'firebase-admin';

export async function sendPush(message: PushMessage) {
  const fcmMessage = {
    token: user.fcmToken,
    notification: {
      title: message.title,
      body: message.body
    },
    data: {
      deeplink: message.deeplink,
      messageId: message.id
    },
    apns: {
      payload: {
        aps: { badge: message.badge }
      }
    }
  };

  const messageId = await admin.messaging().send(fcmMessage);
  return messageId;
}
```

### Twilio (WhatsApp)
```ts
import twilio from 'twilio';
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

export async function sendWhatsApp(message: WhatsAppMessage) {
  const response = await client.messages.create({
    from: 'whatsapp:+1234567890', // Twilio WhatsApp number
    to: `whatsapp:${user.phone}`,
    body: message.body // Must match approved template
  });

  return response.sid;
}
```

## Webhook Handling (Delivery Status)

### SendGrid Webhooks
**Endpoint**: `/api/webhooks/sendgrid`

**Events**: `delivered`, `opened`, `clicked`, `bounced`, `dropped`

```ts
export async function handleSendGridWebhook(events: any[]) {
  for (const event of events) {
    const messageId = event.sg_message_id;

    await db.collection('messages').doc(messageId).update({
      status: event.event, // 'delivered', 'opened', etc.
      [`${event.event}At`]: new Date(event.timestamp * 1000)
    });

    // Track engagement
    if (event.event === 'click') {
      await trackEngagement(messageId, 'email_click', event.url);
    }
  }
}
```

### FCM Delivery Reports
**Topic**: `projects/PROJECT_ID/topics/fcm-delivery`

```ts
export async function handleFCMDeliveryReport(message: any) {
  const { messageId, status } = message.data;

  await db.collection('messages').doc(messageId).update({
    status: status === 'SUCCESS' ? 'delivered' : 'failed',
    deliveredAt: status === 'SUCCESS' ? FieldValue.serverTimestamp() : null
  });
}
```

## Testing

### Template Preview (Admin)
```ts
// api/src/modules/messaging/preview-template.ts
export async function previewTemplate(
  templateKey: string,
  channel: Channel,
  mockData: Record<string, any>
): Promise<string> {
  const template = await getTemplate(templateKey);
  const rendered = await renderTemplate(template.channels[channel], mockData);

  return rendered;
}

// Admin UI: Live preview con mock data
```

### E2E Test
```ts
// tests/e2e/messaging.spec.ts
test('send order confirmation email', async () => {
  const userId = 'test-user-123';
  const orderId = 'ORD-TEST-456';

  await sendMessage({
    userId,
    templateKey: 'order_confirmation',
    channel: 'email',
    data: { orderId, firstName: 'Mario' }
  });

  // Verify message in inbox
  const inbox = await getInboxMessages(userId);
  expect(inbox[0].subject).toContain('Conferma Ordine');
});
```

## Analytics

### Message Performance
```ts
// Dashboard metrics
- Sent: 10,000
- Delivered: 9,800 (98%)
- Opened: 4,900 (50%)
- Clicked: 1,470 (30% of opened)
- Converted: 147 (10% of clicked)
```

### GA4 Events
```ts
trackEvent('notification_sent', { channel, template_key });
trackEvent('notification_delivered', { channel, template_key });
trackEvent('notification_opened', { channel, template_key });
trackEvent('notification_clicked', { channel, template_key, url });
```

## Resources
- [SendGrid API Docs](https://docs.sendgrid.com/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [MJML Email Framework](https://mjml.io/)