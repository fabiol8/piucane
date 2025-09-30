export interface ContentItem {
  contentId: string;
  type: 'article' | 'guide' | 'checklist' | 'quiz' | 'howto' | 'news' | 'video';
  title: string;
  subtitle?: string;
  slug: string;
  excerpt: string;
  content: string;
  htmlContent: string;

  // AI Generation
  generationType: 'human' | 'ai' | 'hybrid';
  aiPrompt?: string;
  ragSources?: string[];

  // Targeting & Personalization
  targeting: ContentTargeting;

  // Safety & Compliance
  safetyChecks: SafetyChecks;
  veterinaryApproval?: VeterinaryApproval;

  // Metadata
  author: ContentAuthor;
  publishedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';

  // SEO & Discovery
  seo: SEOMetadata;
  tags: string[];
  categories: string[];
  readingTime: number;

  // Engagement & Analytics
  engagement: ContentEngagement;

  // Media
  featuredImage?: MediaAsset;
  gallery?: MediaAsset[];

  // Localization
  language: string;
  translations?: Record<string, string>;

  // Commercial
  isSponsored: boolean;
  sponsorInfo?: SponsorInfo;
  affiliateLinks?: AffiliateLink[];

  // Interactive Features
  quiz?: QuizData;
  checklist?: ChecklistData;

  // Accessibility
  accessibility: AccessibilityFeatures;
}

export interface ContentTargeting {
  dogBreeds?: string[];
  dogAges?: AgeRange[];
  dogSizes?: ('small' | 'medium' | 'large' | 'giant')[];
  healthConditions?: string[];
  allergies?: string[];
  userLifestyle?: ('active' | 'moderate' | 'calm')[];
  experienceLevel?: ('beginner' | 'intermediate' | 'expert')[];
  interests?: string[];
  location?: LocationTargeting;
  seasonality?: SeasonalTargeting;
}

export interface AgeRange {
  min: number;
  max: number;
  unit: 'months' | 'years';
}

export interface LocationTargeting {
  countries?: string[];
  regions?: string[];
  cities?: string[];
  climate?: ('hot' | 'cold' | 'temperate' | 'humid')[];
}

export interface SeasonalTargeting {
  months?: number[];
  seasons?: ('spring' | 'summer' | 'autumn' | 'winter')[];
  holidays?: string[];
}

export interface SafetyChecks {
  medicalFactCheck: boolean;
  harmfulContentCheck: boolean;
  misinformationCheck: boolean;
  allergenWarnings: string[];
  dangerousActivityWarnings: string[];
  ageRestrictions?: AgeRange;
  supervisorRequired?: boolean;
  disclaimers: string[];
  lastCheckedAt: Date;
  checkedBy: string;
}

export interface VeterinaryApproval {
  approvedBy: string;
  approvedAt: Date;
  approvalNotes?: string;
  reviewScore: number;
  medicalAccuracy: number;
  safetyRating: number;
  expiresAt?: Date;
}

export interface ContentAuthor {
  id: string;
  name: string;
  role: 'human_editor' | 'ai_system' | 'veterinarian' | 'expert';
  credentials?: string[];
  bio?: string;
  avatar?: string;
}

export interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl?: string;
  structuredData?: Record<string, any>;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export interface ContentEngagement {
  views: number;
  likes: number;
  shares: number;
  bookmarks: number;
  comments: number;
  avgRating: number;
  totalRatings: number;
  readCompletionRate: number;
  bounceRate: number;
  timeSpent: number;
  clickThroughRate?: number;
}

export interface MediaAsset {
  id: string;
  url: string;
  altText: string;
  caption?: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  credits?: string;
  aiGenerated: boolean;
}

export interface SponsorInfo {
  sponsorId: string;
  sponsorName: string;
  sponsorLogo: string;
  sponsorshipType: 'paid' | 'partnership' | 'affiliate';
  disclosureText: string;
  contractDetails: {
    startDate: Date;
    endDate?: Date;
    budget?: number;
    kpis?: string[];
  };
}

export interface AffiliateLink {
  id: string;
  productId?: string;
  url: string;
  displayText: string;
  commission: number;
  trackingCode: string;
  isActive: boolean;
}

export interface QuizData {
  questions: QuizQuestion[];
  scoringSystem: 'points' | 'percentage' | 'category';
  resultCategories: QuizResultCategory[];
  timeLimit?: number;
  allowRetake: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
  options?: QuizOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
  mediaAsset?: MediaAsset;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizResultCategory {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  recommendations: string[];
  badge?: string;
}

export interface ChecklistData {
  items: ChecklistItem[];
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  prerequisites?: string[];
  materials?: string[];
  rewards?: GameReward[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  order: number;
  estimatedTime?: number;
  mediaAsset?: MediaAsset;
  verification?: {
    type: 'photo' | 'text' | 'none';
    required: boolean;
  };
}

export interface AccessibilityFeatures {
  hasAltText: boolean;
  hasTranscript: boolean;
  hasSubtitles: boolean;
  hasAudioDescription: boolean;
  colorContrastCompliant: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigable: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export interface GameReward {
  type: 'points' | 'badge' | 'achievement' | 'item';
  value: number | string;
  title: string;
  description: string;
  icon?: string;
}

// Content Feed & Personalization
export interface ContentFeed {
  userId: string;
  items: ContentFeedItem[];
  algorithm: 'chronological' | 'personalized' | 'trending' | 'curated';
  lastUpdated: Date;
  nextRefresh: Date;
  abTestVariant?: string;
}

export interface ContentFeedItem {
  contentId: string;
  score: number;
  reason: PersonalizationReason[];
  position: number;
  seenAt?: Date;
  clickedAt?: Date;
  engagementScore?: number;
}

export interface PersonalizationReason {
  type: 'breed_match' | 'age_match' | 'interest_match' | 'trending' | 'seasonal' | 'location' | 'behavior' | 'social';
  confidence: number;
  description: string;
}

// Content Generation & AI
export interface ContentGenerationRequest {
  id: string;
  type: ContentItem['type'];
  prompt: string;
  targeting: ContentTargeting;
  styleGuide: StyleGuide;
  ragContext?: RAGContext;
  constraints: GenerationConstraints;
  requestedBy: string;
  createdAt: Date;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'rejected' | 'published';
}

export interface StyleGuide {
  tone: 'friendly' | 'professional' | 'casual' | 'authoritative';
  formality: 'formal' | 'informal' | 'conversational';
  perspective: 'first_person' | 'second_person' | 'third_person';
  length: 'short' | 'medium' | 'long';
  includeEmojis: boolean;
  includeCTA: boolean;
  brandVoice: string[];
}

export interface RAGContext {
  sources: RAGSource[];
  maxSources: number;
  relevanceThreshold: number;
  vetApprovedOnly: boolean;
  languages: string[];
}

export interface RAGSource {
  id: string;
  type: 'veterinary_paper' | 'breed_guide' | 'product_info' | 'user_content' | 'expert_article';
  title: string;
  content: string;
  author: string;
  publishedAt: Date;
  credibilityScore: number;
  vetApproved: boolean;
  citations: Citation[];
}

export interface Citation {
  text: string;
  source: string;
  url?: string;
  confidence: number;
}

export interface GenerationConstraints {
  maxLength: number;
  minLength: number;
  requiredKeywords: string[];
  forbiddenTopics: string[];
  mustIncludeSafety: boolean;
  requireVetReview: boolean;
  allowMedicalAdvice: boolean;
  targetReadingLevel: number;
}

// Analytics & Tracking
export interface ContentAnalytics {
  contentId: string;
  period: AnalyticsPeriod;
  metrics: ContentMetrics;
  demographics: ContentDemographics;
  behavior: ContentBehavior;
  conversion: ContentConversion;
  abTest?: ABTestResults;
}

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface ContentMetrics {
  impressions: number;
  uniqueViews: number;
  clicks: number;
  shares: number;
  likes: number;
  comments: number;
  bookmarks: number;
  avgTimeSpent: number;
  completionRate: number;
  bounceRate: number;
  returnVisitors: number;
}

export interface ContentDemographics {
  dogBreeds: Record<string, number>;
  dogAges: Record<string, number>;
  userAges: Record<string, number>;
  locations: Record<string, number>;
  experienceLevels: Record<string, number>;
}

export interface ContentBehavior {
  entryPoints: Record<string, number>;
  exitPoints: Record<string, number>;
  scrollDepth: number[];
  heatmapData?: HeatmapPoint[];
  clickPaths: ClickPath[];
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  element?: string;
}

export interface ClickPath {
  path: string[];
  frequency: number;
  conversionRate: number;
}

export interface ContentConversion {
  productViews: number;
  addToCarts: number;
  purchases: number;
  signups: number;
  appointmentBookings: number;
  newsletterSubscriptions: number;
  revenue: number;
}

export interface ABTestResults {
  testId: string;
  variant: string;
  controlMetrics: ContentMetrics;
  variantMetrics: ContentMetrics;
  significance: number;
  confidence: number;
  winner?: 'control' | 'variant';
}

// Editorial Workflow
export interface EditorialWorkflow {
  contentId: string;
  currentStage: WorkflowStage;
  stages: WorkflowStage[];
  assignedTo?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: WorkflowNote[];
  approvals: WorkflowApproval[];
  rejections: WorkflowRejection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'creation' | 'editing' | 'fact_check' | 'vet_review' | 'legal_review' | 'seo_review' | 'final_approval' | 'publishing';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  assignedTo?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  requirements: string[];
  automatable: boolean;
}

export interface WorkflowNote {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: 'comment' | 'suggestion' | 'approval' | 'rejection';
  stageId: string;
  createdAt: Date;
  attachments?: string[];
}

export interface WorkflowApproval {
  id: string;
  userId: string;
  userName: string;
  stageId: string;
  notes?: string;
  conditions?: string[];
  approvedAt: Date;
  expiresAt?: Date;
}

export interface WorkflowRejection {
  id: string;
  userId: string;
  userName: string;
  stageId: string;
  reason: string;
  suggestions: string[];
  rejectedAt: Date;
  blocksPublication: boolean;
}

// Search & Discovery
export interface ContentSearchQuery {
  query: string;
  filters: SearchFilters;
  sorting: SearchSorting;
  pagination: SearchPagination;
  personalization: boolean;
  userId?: string;
}

export interface SearchFilters {
  types?: ContentItem['type'][];
  categories?: string[];
  tags?: string[];
  authors?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  targeting?: Partial<ContentTargeting>;
  safetyLevel?: 'basic' | 'moderate' | 'strict';
  languages?: string[];
  hasVideo?: boolean;
  hasQuiz?: boolean;
  readingTime?: {
    min: number;
    max: number;
  };
  rating?: {
    min: number;
    max: number;
  };
}

export interface SearchSorting {
  field: 'relevance' | 'date' | 'popularity' | 'rating' | 'reading_time';
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface SearchResult {
  items: ContentSearchItem[];
  total: number;
  facets: SearchFacets;
  suggestions: string[];
  queryId: string;
  processingTime: number;
}

export interface ContentSearchItem {
  contentId: string;
  title: string;
  excerpt: string;
  type: ContentItem['type'];
  score: number;
  highlights: SearchHighlight[];
  thumbnail?: string;
  author: string;
  publishedAt: Date;
  readingTime: number;
  rating: number;
  tags: string[];
}

export interface SearchHighlight {
  field: string;
  snippets: string[];
}

export interface SearchFacets {
  types: FacetValue[];
  categories: FacetValue[];
  authors: FacetValue[];
  tags: FacetValue[];
  languages: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}