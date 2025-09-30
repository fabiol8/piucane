export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderType: 'user' | 'operator' | 'system';
  content: string;
  messageType: 'text' | 'image' | 'video' | 'file' | 'order' | 'system';
  attachments: ChatAttachment[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    orderId?: string;
    productId?: string;
    cartData?: any;
    ticketId?: string;
    systemAction?: string;
  };
  createdAt: string;
  readAt?: string;
  editedAt?: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'voice';
  name: string;
  url: string;
  thumbnail?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ChatThread {
  id: string;
  userId: string;
  operatorId?: string;
  status: 'active' | 'waiting' | 'closed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'order' | 'product' | 'health' | 'subscription' | 'return' | 'complaint';
  subject?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  userUnreadCount: number;
  operatorUnreadCount: number;
  tags: string[];
  metadata: {
    userAgent?: string;
    source: 'chat_button' | 'inbox' | 'order_detail' | 'product_page' | 'support_request';
    relatedEntityId?: string;
    relatedEntityType?: 'order' | 'product' | 'dog' | 'subscription';
    customerSatisfaction?: {
      rating: number;
      feedback: string;
      submittedAt: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface ChatOperator {
  id: string;
  name: string;
  avatar?: string;
  role: 'consultant' | 'support' | 'vet' | 'admin';
  status: 'online' | 'busy' | 'away' | 'offline';
  specializations: string[];
  languages: string[];
  isAvailable: boolean;
  currentThreads: number;
  maxThreads: number;
  responseTimeAvg: number; // in minutes
  satisfactionRating: number;
  lastSeen?: string;
}

export interface ChatPrecompiledOrder {
  id: string;
  threadId: string;
  products: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  totalAmount: number;
  discount?: number;
  discountCode?: string;
  notes?: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}

export interface ChatStats {
  totalThreads: number;
  activeThreads: number;
  unreadMessages: number;
  averageResponseTime: number;
  satisfactionRating: number;
  totalOrdersFromChat: number;
  ordersValueFromChat: number;
}

export interface ChatSettings {
  userId: string;
  notifications: {
    push: boolean;
    email: boolean;
    sound: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  autoMarkAsRead: boolean;
  showTypingIndicator: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  updatedAt: string;
}

export interface TypingIndicator {
  threadId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ChatUploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Sistema suggerimenti automatici per operatori
export interface ChatSuggestion {
  id: string;
  type: 'product' | 'order' | 'response' | 'action';
  title: string;
  description: string;
  action: {
    type: 'send_message' | 'create_order' | 'open_ticket' | 'suggest_product';
    data: any;
  };
  confidence: number;
  context: {
    userQuery: string;
    dogProfile?: any;
    orderHistory?: any;
    currentProducts?: any;
  };
}

// Chatbot per fuori orario
export interface ChatbotResponse {
  id: string;
  intent: string;
  response: string;
  confidence: number;
  actions?: Array<{
    type: 'create_ticket' | 'suggest_faq' | 'schedule_callback';
    data: any;
  }>;
  followUp?: string;
}

export interface ChatEventLog {
  id: string;
  threadId: string;
  eventType: 'message_sent' | 'message_read' | 'operator_assigned' | 'thread_closed' | 'order_created' | 'ticket_created';
  actorId: string;
  actorType: 'user' | 'operator' | 'system';
  data: any;
  timestamp: string;
}

// Metriche per Analytics
export interface ChatAnalytics {
  conversationMetrics: {
    totalConversations: number;
    averageLength: number;
    resolutionRate: number;
    escalationRate: number;
  };
  responseMetrics: {
    averageFirstResponse: number;
    averageResponse: number;
    missedChats: number;
  };
  satisfactionMetrics: {
    averageRating: number;
    totalFeedbacks: number;
    ratingDistribution: Record<number, number>;
  };
  businessMetrics: {
    ordersGenerated: number;
    revenueGenerated: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  operatorMetrics: {
    operatorId: string;
    totalChats: number;
    averageRating: number;
    responseTime: number;
    resolutionRate: number;
  }[];
}

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ChatThreadStatus = 'active' | 'waiting' | 'closed' | 'archived';
export type ChatOperatorStatus = 'online' | 'busy' | 'away' | 'offline';