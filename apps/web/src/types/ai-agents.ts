// AI Agents Hub - Type Definitions

export type AgentType = 'veterinary' | 'trainer' | 'groomer';

export type MessageRole = 'user' | 'assistant' | 'system';

export type SafetyLevel = 'ok' | 'warning' | 'urgent' | 'blocked';

export type ActionType =
  | 'create_mission'
  | 'create_reminder'
  | 'suggest_products'
  | 'open_vet_search'
  | 'save_note'
  | 'open_pdp'
  | 'show_disclosure';

// Core Message Types
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentType: AgentType;

  // Agent-specific metadata
  metadata?: {
    dogId?: string;
    safetyLevel: SafetyLevel;
    tokens?: number;
    hasAttachment?: boolean;
    processingTime?: number;
  };

  // Suggested actions from agent
  suggestedActions?: AgentAction[];

  // Safety flags and warnings
  safetyFlags?: SafetyFlag[];

  // Commercial disclosure
  hasCommercialContent?: boolean;
  commercialDisclosure?: string;
}

export interface AgentAction {
  id: string;
  type: ActionType;
  label: string;
  description?: string;
  icon?: string;

  // Action parameters
  params: Record<string, any>;

  // UI styling
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  disabled?: boolean;

  // Tracking
  analyticsEvent?: string;
}

export interface SafetyFlag {
  level: SafetyLevel;
  type: 'red_flag' | 'allergen_warning' | 'medication_blocked' | 'commercial_disclosure';
  message: string;
  action?: {
    label: string;
    url?: string;
    deeplink?: string;
  };
}

// Agent Specific Types
export interface VeterinaryAgent {
  type: 'veterinary';
  capabilities: {
    generalAdvice: boolean;
    symptomTriage: boolean;
    preventiveCare: boolean;
    emergencyDetection: boolean;
  };
  restrictions: {
    noDiagnosis: boolean;
    noMedications: boolean;
    noDosages: boolean;
    respectAllergies: boolean;
  };
}

export interface TrainerAgent {
  type: 'trainer';
  capabilities: {
    basicTraining: boolean;
    behaviorModification: boolean;
    enrichmentActivities: boolean;
    smartMissions: boolean;
  };
  approaches: {
    positiveReinforcement: boolean;
    noCoerciveMethods: boolean;
    ageAppropriate: boolean;
  };
}

export interface GroomerAgent {
  type: 'groomer';
  capabilities: {
    coatTypeAnalysis: boolean;
    groomingRoutines: boolean;
    hygienePlanning: boolean;
    productRecommendations: boolean;
  };
  coatTypes: {
    short: boolean;
    long: boolean;
    double: boolean;
    curly: boolean;
    wire: boolean;
  };
}

// Chat Session Management
export interface ChatSession {
  id: string;
  userId: string;
  dogId?: string;
  agentType: AgentType;

  // Session state
  status: 'active' | 'paused' | 'completed' | 'error';
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;

  // Messages in session
  messages: ChatMessage[];

  // Session context
  context: SessionContext;

  // Privacy and retention
  retentionPolicy: {
    autoDelete: boolean;
    deleteAfterDays: number;
    userCanDelete: boolean;
  };
}

export interface SessionContext {
  // Dog information
  dog?: {
    id: string;
    name: string;
    breed: string;
    age: { value: number; unit: 'months' | 'years' };
    weight?: number;
    size: 'small' | 'medium' | 'large' | 'giant';
    allergies: string[];
    healthConditions: string[];
    coatType?: 'short' | 'long' | 'double' | 'curly' | 'wire';
  };

  // User preferences
  user?: {
    experienceLevel: 'beginner' | 'intermediate' | 'expert';
    hasMultipleDogs: boolean;
    preferredLanguage: string;
    consentToTracking: boolean;
    consentToMarketing: boolean;
  };

  // Current active items
  activeMissions?: string[];
  activeReminders?: string[];
  recentOrders?: string[];

  // Entry point context
  entryPoint?: {
    source: 'menu' | 'pdp' | 'profile' | 'news' | 'inbox';
    referrerData?: Record<string, any>;
  };
}

// Tools and Actions
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  requiredPermissions?: string[];
  rateLimit?: {
    maxCalls: number;
    periodMinutes: number;
  };
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// Mission Creation
export interface MissionTemplate {
  id: string;
  agentType: AgentType;
  category: 'training' | 'health' | 'grooming' | 'enrichment';
  title: string;
  description: string;

  // SMART criteria
  duration: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };

  steps: MissionStep[];

  // Targeting
  targetAudience: {
    dogAges?: Array<{ min: number; max: number; unit: 'months' | 'years' }>;
    experienceLevels?: ('beginner' | 'intermediate' | 'expert')[];
    energyLevels?: ('low' | 'medium' | 'high')[];
  };

  // Gamification
  rewards: {
    xp: number;
    badges?: string[];
    achievements?: string[];
  };
}

export interface MissionStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;

  // Requirements
  materials?: string[];
  prerequisites?: string[];

  // Validation
  completionCriteria: string[];
  troubleshooting?: Array<{
    problem: string;
    solution: string;
  }>;

  // Reminders
  reminders?: Array<{
    beforeHours: number;
    message: string;
  }>;
}

// Product Suggestions
export interface ProductSuggestion {
  sku: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;

  // Compatibility
  compatibleWith: {
    allergies: string[];
    dogSizes: string[];
    ageRanges: Array<{ min: number; max: number; unit: 'months' | 'years' }>;
  };

  // Commercial transparency
  isCommercial: boolean;
  affiliateDisclosure?: string;

  // Relevance
  relevanceScore: number;
  reason: string;
  category: 'health' | 'training' | 'grooming' | 'nutrition' | 'toys';
}

// Analytics and Tracking
export interface AgentAnalytics {
  sessionId: string;
  userId: string;
  dogId?: string;
  agentType: AgentType;

  events: AnalyticsEvent[];

  // Session summary
  summary: {
    duration: number;
    messageCount: number;
    actionsPerformed: number;
    safetyFlagsTriggered: number;
    commercialInteractions: number;
  };

  // Outcomes
  outcomes: {
    missionsCreated: number;
    remindersCreated: number;
    productsViewed: number;
    vetSearches: number;
    emergencyReferrals: number;
  };
}

export interface AnalyticsEvent {
  type: 'session_start' | 'message_sent' | 'message_received' | 'action_performed' | 'safety_triggered' | 'session_end';
  timestamp: Date;

  data: {
    messageLength?: number;
    processingTime?: number;
    actionType?: ActionType;
    safetyLevel?: SafetyLevel;
    errorCode?: string;
    [key: string]: any;
  };

  // Privacy-compliant tracking
  anonymized: boolean;
  containsPII: boolean;
}

// Emergency and Safety
export interface EmergencyProtocol {
  triggers: string[];
  response: {
    level: 'immediate' | 'urgent' | 'priority';
    bannerMessage: string;
    actionLabel: string;
    actionType: 'vet_search' | 'emergency_call' | 'redirect';
    actionData: Record<string, any>;
  };

  followUp: {
    logEvent: boolean;
    notifySupport: boolean;
    createIncident: boolean;
  };
}

export interface AllergenGuard {
  dogId: string;
  allergies: string[];

  // Filtering rules
  productFilters: string[];
  foodIngredientFilters: string[];
  medicationFilters: string[];

  // Override permissions
  veterinaryOverride: boolean;
  userOverride: boolean;
}

// Commercial Transparency
export interface CommercialDisclosure {
  type: 'product_recommendation' | 'affiliate_link' | 'sponsored_content';
  message: string;
  isRequired: boolean;
  placement: 'inline' | 'footer' | 'modal';

  // Legal compliance
  gdprCompliant: boolean;
  consumerProtectionCompliant: boolean;

  // User interaction
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

// Agent Configuration
export interface AgentConfiguration {
  agentType: AgentType;

  // Model settings
  model: {
    provider: 'gemini' | 'claude' | 'gpt';
    version: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };

  // Safety settings
  safety: {
    enableRedFlagDetection: boolean;
    enableAllergenFiltering: boolean;
    enableMedicationBlocking: boolean;
    emergencyProtocols: EmergencyProtocol[];
  };

  // Tools and capabilities
  enabledTools: string[];
  toolConfigurations: Record<string, any>;

  // Commercial settings
  enableProductSuggestions: boolean;
  requireDisclosure: boolean;
  maxSuggestionsPerSession: number;

  // Rate limiting
  rateLimits: {
    messagesPerMinute: number;
    messagesPerHour: number;
    actionsPerSession: number;
  };
}

// Response Generation
export interface AgentResponse {
  message: string;
  messageId: string;

  // Metadata
  generatedAt: Date;
  processingTimeMs: number;
  tokensUsed: number;

  // Safety and content
  safetyLevel: SafetyLevel;
  safetyFlags: SafetyFlag[];

  // Actions and suggestions
  suggestedActions: AgentAction[];
  productSuggestions?: ProductSuggestion[];

  // Commercial content
  hasCommercialContent: boolean;
  disclosures: CommercialDisclosure[];

  // Follow-up
  expectsFollowUp: boolean;
  followUpPrompts?: string[];

  // Error handling
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// Conversation Context
export interface ConversationContext {
  topic: string;
  intent: 'information' | 'problem_solving' | 'product_inquiry' | 'emergency';
  confidence: number;

  // Extracted entities
  entities: {
    symptoms?: string[];
    behaviors?: string[];
    products?: string[];
    timeframes?: string[];
    urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
  };

  // Conversation state
  state: 'greeting' | 'information_gathering' | 'providing_advice' | 'action_planning' | 'closing';
  nextExpectedInput?: string;
}

// Integration Types
export interface VetSearchParams {
  emergency?: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  specialty?: string[];
  availability?: '24h' | 'current' | 'appointment';
}

export interface ReminderCreationParams {
  dogId: string;
  type: 'medication' | 'grooming' | 'training' | 'health_check' | 'custom';
  title: string;
  description?: string;

  // Scheduling
  startDate: Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customSchedule?: string; // cron expression

  // Notifications
  notificationChannels: ('push' | 'email' | 'sms')[];
  advanceNotice: number; // minutes before

  // Mission integration
  linkedMissionId?: string;
  linkedStepId?: string;
}

// Multi-Agent Orchestration
export interface AgentOrchestrator {
  currentAgent: AgentType;
  availableAgents: AgentType[];

  // Handoff capabilities
  canHandoff: boolean;
  handoffRules: Array<{
    fromAgent: AgentType;
    toAgent: AgentType;
    trigger: string;
    confidence: number;
  }>;

  // Context preservation
  preserveContext: boolean;
  contextSummary?: string;
}

// Performance Monitoring
export interface AgentPerformance {
  agentType: AgentType;
  period: {
    start: Date;
    end: Date;
  };

  metrics: {
    totalSessions: number;
    averageSessionDuration: number;
    messagesPerSession: number;

    // Quality metrics
    userSatisfactionScore: number;
    taskCompletionRate: number;
    followUpRate: number;

    // Safety metrics
    safetyIncidents: number;
    emergencyReferrals: number;
    falsePositives: number;

    // Commercial metrics
    productViewRate: number;
    conversionRate: number;
    revenueAttribution: number;
  };
}

// Export all types
export type {
  ChatMessage,
  AgentAction,
  SafetyFlag,
  ChatSession,
  SessionContext,
  AgentTool,
  MissionTemplate,
  MissionStep,
  ProductSuggestion,
  AgentAnalytics,
  AnalyticsEvent,
  EmergencyProtocol,
  AllergenGuard,
  CommercialDisclosure,
  AgentConfiguration,
  AgentResponse,
  ConversationContext,
  VetSearchParams,
  ReminderCreationParams,
  AgentOrchestrator,
  AgentPerformance
};