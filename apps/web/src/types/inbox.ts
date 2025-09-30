export interface InboxMessage {
  id: string;
  userId: string;
  channel: 'push' | 'email' | 'whatsapp' | 'sms' | 'in_app';
  category: 'ordini' | 'salute' | 'missioni' | 'promo' | 'care' | 'abbonamenti';
  title: string;
  preview: string;
  content: string; // HTML sanitized content
  isRead: boolean;
  timestamp: string;
  metadata: {
    templateKey: string;
    originalChannel: string;
    deeplinks: DeepLink[];
    tags: string[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    relatedEntityId?: string; // ordine, cane, missione, etc.
    relatedEntityType?: 'order' | 'dog' | 'mission' | 'subscription' | 'chat';
  };
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
}

export interface DeepLink {
  label: string;
  action: string;
  target: string;
  parameters?: Record<string, any>;
  style?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export interface InboxStats {
  total: number;
  unread: number;
  byCategory: {
    ordini: number;
    salute: number;
    missioni: number;
    promo: number;
    care: number;
    abbonamenti: number;
  };
  recentActivity: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

export interface MessageTemplate {
  key: string;
  category: InboxMessage['category'];
  title: string;
  content: string;
  defaultChannel: InboxMessage['channel'];
  allowedChannels: InboxMessage['channel'][];
  priority: InboxMessage['metadata']['priority'];
  variables: string[];
  deeplinks: Omit<DeepLink, 'parameters'>[];
  requiresConsent: boolean;
  respectQuietHours: boolean;
  tags: string[];
  description: string;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    push: {
      enabled: boolean;
      quietHours: {
        start: string; // "22:00"
        end: string; // "08:00"
      };
      categories: Record<InboxMessage['category'], boolean>;
    };
    email: {
      enabled: boolean;
      address: string;
      categories: Record<InboxMessage['category'], boolean>;
    };
    whatsapp: {
      enabled: boolean;
      phone: string;
      categories: Record<InboxMessage['category'], boolean>;
    };
    sms: {
      enabled: boolean;
      phone: string;
      categories: Record<InboxMessage['category'], boolean>;
    };
  };
  engagement: {
    preferredChannel: InboxMessage['channel'];
    responseRate: Record<InboxMessage['channel'], number>;
    lastInteraction: Record<InboxMessage['channel'], string>;
  };
  consent: {
    marketing: boolean;
    transactional: boolean;
    health: boolean;
    grantedAt: string;
    updatedAt: string;
  };
  updatedAt: string;
}

export interface CommunicationEvent {
  id: string;
  userId: string;
  type: string;
  data: Record<string, any>;
  templateKey: string;
  targetChannels: InboxMessage['channel'][];
  actualChannels: InboxMessage['channel'][];
  status: 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  metadata: {
    priority: InboxMessage['metadata']['priority'];
    respectQuietHours: boolean;
    requiresConsent: boolean;
    retryCount: number;
    maxRetries: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InboxFilter {
  categories: InboxMessage['category'][];
  channels: InboxMessage['channel'][];
  readStatus: 'all' | 'read' | 'unread';
  dateRange: {
    start?: string;
    end?: string;
  };
  search?: string;
  priority?: InboxMessage['metadata']['priority'][];
}

export interface InboxAction {
  type: 'mark_read' | 'mark_unread' | 'delete' | 'archive' | 'bulk_action';
  messageIds: string[];
  userId: string;
  timestamp: string;
}

// Message template definitions for common scenarios
export const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  // Orders
  'order.confirmed': {
    key: 'order.confirmed',
    category: 'ordini',
    title: 'Ordine confermato #{orderNumber}',
    content: `
      <h2>Grazie per il tuo ordine! 🐾</h2>
      <p>Il tuo ordine <strong>#{orderNumber}</strong> è stato confermato e sarà presto in preparazione.</p>
      <p><strong>Prodotti ordinati:</strong></p>
      {productList}
      <p><strong>Totale:</strong> €{total}</p>
      <p><strong>Consegna prevista:</strong> {deliveryDate}</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'email', 'whatsapp'],
    priority: 'normal',
    variables: ['orderNumber', 'productList', 'total', 'deliveryDate'],
    deeplinks: [
      { label: 'Vedi ordine', action: 'navigate', target: '/orders/{orderId}', style: 'primary' },
      { label: 'Tracking', action: 'navigate', target: '/orders/{orderId}/tracking', style: 'secondary' }
    ],
    requiresConsent: false,
    respectQuietHours: false,
    tags: ['transactional', 'order'],
    description: 'Conferma ordine ricevuto'
  },

  'order.shipped': {
    key: 'order.shipped',
    category: 'ordini',
    title: 'Il tuo ordine è in viaggio! 📦',
    content: `
      <h2>Il tuo ordine è in viaggio! 📦</h2>
      <p>L'ordine <strong>#{orderNumber}</strong> è stato spedito e arriverà entro {deliveryDate}.</p>
      <p><strong>Corriere:</strong> {courier}</p>
      <p><strong>Codice di tracking:</strong> {trackingCode}</p>
      <p>Puoi seguire la spedizione in tempo reale!</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'email', 'whatsapp', 'sms'],
    priority: 'normal',
    variables: ['orderNumber', 'deliveryDate', 'courier', 'trackingCode'],
    deeplinks: [
      { label: 'Tracking ordine', action: 'navigate', target: '/orders/{orderId}/tracking', style: 'primary' },
      { label: 'Dettagli', action: 'navigate', target: '/orders/{orderId}', style: 'secondary' }
    ],
    requiresConsent: false,
    respectQuietHours: false,
    tags: ['transactional', 'shipping'],
    description: 'Notifica spedizione ordine'
  },

  // Health & Vaccinations
  'health.vaccination.reminder': {
    key: 'health.vaccination.reminder',
    category: 'salute',
    title: 'Promemoria vaccino per {dogName} 💉',
    content: `
      <h2>È ora del vaccino per {dogName}! 💉</h2>
      <p>Il vaccino <strong>{vaccineName}</strong> scade il {dueDate}.</p>
      <p>Non dimenticare di prenotare l'appuntamento con il veterinario.</p>
      <p><strong>Veterinario consigliato:</strong> {vetName}</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'email', 'whatsapp'],
    priority: 'high',
    variables: ['dogName', 'vaccineName', 'dueDate', 'vetName'],
    deeplinks: [
      { label: 'Segna come fatto', action: 'update', target: '/dogs/{dogId}/vaccinations/{vaccinationId}', style: 'primary' },
      { label: 'Contatta veterinario', action: 'external', target: 'tel:{vetPhone}', style: 'secondary' }
    ],
    requiresConsent: true,
    respectQuietHours: true,
    tags: ['health', 'reminder', 'vaccination'],
    description: 'Promemoria vaccino in scadenza'
  },

  // Missions & Gamification
  'mission.completed': {
    key: 'mission.completed',
    category: 'missioni',
    title: 'Missione completata! 🎉',
    content: `
      <h2>Fantastico! Hai completato una missione! 🎉</h2>
      <p>Hai appena completato: <strong>{missionName}</strong></p>
      <p><strong>Punti guadagnati:</strong> {points} XP</p>
      <p><strong>Badge ottenuto:</strong> {badgeName}</p>
      <p>Hai sbloccato un reward speciale!</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'in_app'],
    priority: 'normal',
    variables: ['missionName', 'points', 'badgeName'],
    deeplinks: [
      { label: 'Ritira reward', action: 'navigate', target: '/rewards/{rewardId}', style: 'primary' },
      { label: 'Vedi badge', action: 'navigate', target: '/profile/badges', style: 'secondary' }
    ],
    requiresConsent: false,
    respectQuietHours: true,
    tags: ['gamification', 'achievement'],
    description: 'Notifica completamento missione'
  },

  // Subscriptions
  'subscription.reminder': {
    key: 'subscription.reminder',
    category: 'abbonamenti',
    title: 'Prossima consegna tra 3 giorni 📅',
    content: `
      <h2>La tua prossima consegna arriva tra 3 giorni! 📅</h2>
      <p><strong>Prodotto:</strong> {productName}</p>
      <p><strong>Quantità:</strong> {quantity}</p>
      <p><strong>Consegna:</strong> {deliveryDate}</p>
      <p>Vuoi modificare qualcosa o fare uno skip?</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'email', 'whatsapp'],
    priority: 'normal',
    variables: ['productName', 'quantity', 'deliveryDate'],
    deeplinks: [
      { label: 'Gestisci abbonamento', action: 'navigate', target: '/subscriptions/{subscriptionId}', style: 'primary' },
      { label: 'Salta consegna', action: 'update', target: '/subscriptions/{subscriptionId}/skip', style: 'secondary' }
    ],
    requiresConsent: false,
    respectQuietHours: true,
    tags: ['subscription', 'reminder'],
    description: 'Promemoria prossima consegna abbonamento'
  },

  // Customer Care
  'care.response': {
    key: 'care.response',
    category: 'care',
    title: 'Risposta dal Customer Care 💬',
    content: `
      <h2>Hai ricevuto una risposta! 💬</h2>
      <p>Il nostro team ha risposto alla tua richiesta del {requestDate}.</p>
      <p><strong>Oggetto:</strong> {subject}</p>
      <p>Puoi continuare la conversazione nella chat.</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'email'],
    priority: 'high',
    variables: ['requestDate', 'subject'],
    deeplinks: [
      { label: 'Leggi risposta', action: 'navigate', target: '/chat/{threadId}', style: 'primary' }
    ],
    requiresConsent: false,
    respectQuietHours: false,
    tags: ['support', 'response'],
    description: 'Notifica risposta customer care'
  },

  // Promotions
  'promo.discount': {
    key: 'promo.discount',
    category: 'promo',
    title: 'Sconto esclusivo per te! 🎁',
    content: `
      <h2>Abbiamo un regalo per te! 🎁</h2>
      <p>Usa il codice <strong>{discountCode}</strong> e ricevi {discountPercent}% di sconto sul tuo prossimo ordine.</p>
      <p><strong>Valido fino al:</strong> {expiryDate}</p>
      <p>Approfittane subito!</p>
    `,
    defaultChannel: 'push',
    allowedChannels: ['push', 'email', 'whatsapp'],
    priority: 'low',
    variables: ['discountCode', 'discountPercent', 'expiryDate'],
    deeplinks: [
      { label: 'Usa sconto', action: 'navigate', target: '/shop?code={discountCode}', style: 'primary' }
    ],
    requiresConsent: true,
    respectQuietHours: true,
    tags: ['marketing', 'discount'],
    description: 'Comunicazione promozionale con sconto'
  }
} as const;