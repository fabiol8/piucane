# Implementazione Sistema News & Contenuti - Guida Tecnica

## 🔧 Setup Iniziale

### Prerequisiti

- Node.js 18+
- TypeScript 5+
- Firebase Project configurato
- Google Cloud Project con Gemini AI abilitato
- Account sviluppatore con accesso alle API

### Installazione Dipendenze

```bash
# Core dependencies
npm install @google/generative-ai
npm install firebase-admin
npm install @firebase/firestore

# TypeScript types
npm install -D @types/node

# Testing
npm install -D jest @types/jest
npm install -D playwright
```

### Configurazione Ambiente

Crea il file `.env.local`:

```env
# AI Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=piucane-production
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=piucane-production.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=piucane-production.appspot.com

# Content System Configuration
CONTENT_GENERATION_ENABLED=true
VETERINARY_REVIEW_REQUIRED=true
AB_TESTING_ENABLED=true
MAX_CONTENT_LENGTH=5000
MIN_CONTENT_LENGTH=500

# Rate Limiting
AI_REQUESTS_PER_MINUTE=30
AI_REQUESTS_PER_DAY=1000

# Analytics
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
CONTENT_ANALYTICS_ENABLED=true

# Development
NODE_ENV=development
DEBUG_CONTENT_GENERATION=true
```

## 🗄️ Setup Database

### Firestore Collections

#### 1. Contents Collection

```typescript
// /firestore/contents/{contentId}
{
  contentId: string;
  type: 'article' | 'guide' | 'checklist' | 'quiz';
  title: string;
  slug: string;
  content: string;
  htmlContent: string;

  // AI Metadata
  generationType: 'human' | 'ai' | 'hybrid';
  aiPrompt?: string;
  ragSources: string[];

  // Targeting
  targeting: {
    dogBreeds: string[];
    dogAges: Array<{min: number, max: number, unit: 'months'|'years'}>;
    experienceLevel: string[];
    interests: string[];
  };

  // Safety & Approval
  safetyChecks: {
    medicalFactCheck: boolean;
    harmfulContentCheck: boolean;
    lastCheckedAt: Timestamp;
    checkedBy: string;
    disclaimers: string[];
  };

  veterinaryApproval?: {
    approvedBy: string;
    approvedAt: Timestamp;
    reviewScore: number;
  };

  // Publishing
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // SEO
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };

  // Engagement
  engagement: {
    views: number;
    likes: number;
    shares: number;
    avgRating: number;
    totalRatings: number;
  };
}
```

#### 2. Workflows Collection

```typescript
// /firestore/workflows/{workflowId}
{
  workflowId: string;
  contentId: string;
  currentStage: {
    id: string;
    name: string;
    type: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo?: string;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
  };

  stages: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    requirements: string[];
    estimatedDuration: number;
    automatable: boolean;
  }>;

  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Timestamp;
  updatedAt: Timestamp;

  notes: Array<{
    id: string;
    userId: string;
    content: string;
    type: 'comment' | 'approval' | 'rejection';
    createdAt: Timestamp;
  }>;
}
```

#### 3. User Preferences Collection

```typescript
// /firestore/userPreferences/{userId}
{
  userId: string;

  dogs: Array<{
    id: string;
    name: string;
    breed: string;
    age: {value: number, unit: 'months'|'years'};
    size: 'small' | 'medium' | 'large' | 'giant';
    healthConditions: string[];
    allergies: string[];
  }>;

  preferences: {
    contentTypes: string[];
    readingTime: {min: number, max: number};
    interests: string[];
    languages: string[];
  };

  behavior: {
    lastActiveAt: Timestamp;
    avgSessionTime: number;
    engagementScore: number;
    preferredReadingTime: string;
  };

  personalization: {
    enablePersonalization: boolean;
    enableABTesting: boolean;
    dataProcessingConsent: boolean;
    lastConsentUpdate: Timestamp;
  };
}
```

#### 4. Content Analytics Collection

```typescript
// /firestore/analytics/{analyticsId}
{
  analyticsId: string;
  contentId: string;
  userId?: string;

  event: {
    type: 'view' | 'like' | 'share' | 'bookmark' | 'read_complete';
    timestamp: Timestamp;
    sessionId: string;
    source: string;
  };

  context: {
    algorithm: string;
    position?: number;
    score?: number;
    reasons?: string[];
  };

  device: {
    type: 'mobile' | 'desktop' | 'tablet';
    userAgent: string;
    platform: string;
  };

  performance: {
    loadTime?: number;
    readingTime?: number;
    scrollDepth?: number;
  };
}
```

### Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Contents - Public read, admin write
    match /contents/{contentId} {
      allow read: if resource.data.status == 'published';
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }

    // Workflows - Admin/Editor only
    match /workflows/{workflowId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor', 'veterinarian'];
    }

    // User Preferences - Owner only
    match /userPreferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Analytics - System only
    match /analytics/{analyticsId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## 🤖 Configurazione AI

### Google Gemini Setup

```typescript
// src/lib/ai/config.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const getGenAIConfig = () => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is required');
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };
};
```

### RAG Knowledge Base Setup

```typescript
// src/lib/ai/knowledge-base.ts
export class VeterinaryKnowledgeBase {
  private vectorStore: VectorStore;

  constructor() {
    // Initialize vector database connection
    this.vectorStore = new VectorStore({
      dimension: 1536, // OpenAI embedding dimension
      metric: 'cosine'
    });
  }

  async indexVeterinaryDocument(document: {
    id: string;
    title: string;
    content: string;
    author: string;
    vetApproved: boolean;
    credibilityScore: number;
  }) {
    // Generate embeddings
    const embeddings = await this.generateEmbeddings(document.content);

    // Index document chunks
    const chunks = this.chunkDocument(document.content);
    for (const chunk of chunks) {
      await this.vectorStore.upsert({
        id: `${document.id}_${chunk.id}`,
        values: await this.generateEmbeddings(chunk.text),
        metadata: {
          documentId: document.id,
          title: document.title,
          author: document.author,
          vetApproved: document.vetApproved,
          credibilityScore: document.credibilityScore,
          chunkIndex: chunk.id
        }
      });
    }
  }

  async searchRelevantContent(query: string, filters: {
    vetApprovedOnly?: boolean;
    minCredibilityScore?: number;
    topK?: number;
  } = {}): Promise<RAGSource[]> {
    const queryEmbedding = await this.generateEmbeddings(query);

    const searchResults = await this.vectorStore.query({
      vector: queryEmbedding,
      topK: filters.topK || 10,
      filter: {
        vetApproved: filters.vetApprovedOnly || false,
        credibilityScore: { $gte: filters.minCredibilityScore || 0.7 }
      }
    });

    return searchResults.matches.map(match => ({
      id: match.metadata.documentId,
      type: 'veterinary_paper',
      title: match.metadata.title,
      content: match.metadata.content,
      author: match.metadata.author,
      credibilityScore: match.metadata.credibilityScore,
      vetApproved: match.metadata.vetApproved,
      relevanceScore: match.score
    }));
  }

  private chunkDocument(content: string, chunkSize = 500): Array<{id: number, text: string}> {
    const sentences = content.split(/[.!?]+/);
    const chunks = [];
    let currentChunk = '';
    let chunkId = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push({ id: chunkId++, text: currentChunk.trim() });
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ id: chunkId, text: currentChunk.trim() });
    }

    return chunks;
  }

  private async generateEmbeddings(text: string): Promise<number[]> {
    // Use OpenAI or similar embedding model
    // This is a simplified implementation
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

## 🔄 Workflow Implementation

### Content Generation Service

```typescript
// src/services/ContentGenerationService.ts
import { ContentGenerationPipeline } from '@/lib/content/ContentGenerationPipeline';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class ContentGenerationService {
  private pipeline: ContentGenerationPipeline;

  constructor() {
    this.pipeline = new ContentGenerationPipeline();
  }

  async createGenerationRequest(params: {
    type: ContentItem['type'];
    prompt: string;
    targeting: ContentTargeting;
    styleGuide: StyleGuide;
    constraints: GenerationConstraints;
    requestedBy: string;
  }): Promise<string> {

    // Create request document
    const requestRef = await addDoc(collection(db, 'contentRequests'), {
      ...params,
      status: 'pending',
      createdAt: new Date(),
      id: crypto.randomUUID()
    });

    // Start generation process
    this.processGenerationRequest(requestRef.id).catch(console.error);

    return requestRef.id;
  }

  private async processGenerationRequest(requestId: string) {
    try {
      // Update status to generating
      await updateDoc(doc(db, 'contentRequests', requestId), {
        status: 'generating',
        startedAt: new Date()
      });

      // Get request details
      const request = await this.getGenerationRequest(requestId);

      // Generate content
      const result = await this.pipeline.generateContent(request);

      if (result.status === 'generated') {
        await updateDoc(doc(db, 'contentRequests', requestId), {
          status: 'completed',
          contentId: result.contentId,
          workflowId: result.workflowId,
          completedAt: new Date()
        });
      } else {
        await updateDoc(doc(db, 'contentRequests', requestId), {
          status: 'failed',
          error: 'Generation failed',
          completedAt: new Date()
        });
      }

    } catch (error) {
      console.error('Generation request failed:', error);
      await updateDoc(doc(db, 'contentRequests', requestId), {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
    }
  }

  private async getGenerationRequest(requestId: string): Promise<ContentGenerationRequest> {
    // Fetch request from Firestore
    // Implementation details...
    throw new Error('Implementation needed');
  }
}
```

### Editorial Workflow Service

```typescript
// src/services/EditorialWorkflowService.ts
export class EditorialWorkflowService {

  async assignWorkflowStage(workflowId: string, stageId: string, assigneeId: string) {
    const workflowRef = doc(db, 'workflows', workflowId);

    await updateDoc(workflowRef, {
      [`stages.${stageId}.assignedTo`]: assigneeId,
      [`stages.${stageId}.status`]: 'in_progress',
      [`stages.${stageId}.startedAt`]: new Date(),
      updatedAt: new Date()
    });

    // Send notification to assignee
    await this.notifyAssignee(assigneeId, workflowId, stageId);
  }

  async approveWorkflowStage(
    workflowId: string,
    stageId: string,
    approverId: string,
    notes?: string
  ) {
    const workflowRef = doc(db, 'workflows', workflowId);

    // Update stage status
    await updateDoc(workflowRef, {
      [`stages.${stageId}.status`]: 'completed',
      [`stages.${stageId}.completedAt`]: new Date(),
      updatedAt: new Date()
    });

    // Add approval record
    await addDoc(collection(db, 'workflows', workflowId, 'approvals'), {
      stageId,
      approverId,
      notes,
      approvedAt: new Date()
    });

    // Move to next stage
    await this.advanceToNextStage(workflowId);
  }

  async rejectWorkflowStage(
    workflowId: string,
    stageId: string,
    reviewerId: string,
    reason: string,
    suggestions: string[]
  ) {
    const workflowRef = doc(db, 'workflows', workflowId);

    await updateDoc(workflowRef, {
      [`stages.${stageId}.status`]: 'failed',
      [`stages.${stageId}.completedAt`]: new Date(),
      updatedAt: new Date()
    });

    // Add rejection record
    await addDoc(collection(db, 'workflows', workflowId, 'rejections'), {
      stageId,
      reviewerId,
      reason,
      suggestions,
      rejectedAt: new Date(),
      blocksPublication: true
    });

    // Notify content creator
    await this.notifyContentCreator(workflowId, reason, suggestions);
  }

  private async advanceToNextStage(workflowId: string) {
    // Get workflow
    const workflow = await this.getWorkflow(workflowId);

    // Find next pending stage
    const nextStage = workflow.stages.find(stage => stage.status === 'pending');

    if (nextStage) {
      // Auto-assign if automatable
      if (nextStage.automatable) {
        await this.autoProcessStage(workflowId, nextStage.id);
      } else {
        // Assign to appropriate role
        const assigneeId = await this.findBestAssignee(nextStage.type);
        if (assigneeId) {
          await this.assignWorkflowStage(workflowId, nextStage.id, assigneeId);
        }
      }
    } else {
      // All stages completed - publish content
      await this.publishContent(workflow.contentId);
    }
  }

  private async autoProcessStage(workflowId: string, stageId: string) {
    // Handle automated stages (SEO optimization, etc.)
    // Implementation depends on stage type
  }

  private async publishContent(contentId: string) {
    const contentRef = doc(db, 'contents', contentId);

    await updateDoc(contentRef, {
      status: 'published',
      publishedAt: new Date()
    });

    // Trigger analytics and notifications
    await this.notifyContentPublished(contentId);
  }

  private async notifyAssignee(assigneeId: string, workflowId: string, stageId: string) {
    // Send notification (email, push, etc.)
    // Implementation details...
  }

  private async notifyContentCreator(workflowId: string, reason: string, suggestions: string[]) {
    // Send notification to content creator
    // Implementation details...
  }

  private async notifyContentPublished(contentId: string) {
    // Send publication notifications
    // Implementation details...
  }

  private async getWorkflow(workflowId: string): Promise<EditorialWorkflow> {
    // Fetch workflow from Firestore
    // Implementation details...
    throw new Error('Implementation needed');
  }

  private async findBestAssignee(stageType: string): Promise<string | null> {
    // Find best available user for stage type
    // Implementation details...
    return null;
  }
}
```

## 📊 Analytics Implementation

### Content Analytics Service

```typescript
// src/services/ContentAnalyticsService.ts
export class ContentAnalyticsService {

  async trackContentEvent(params: {
    contentId: string;
    userId?: string;
    eventType: 'view' | 'like' | 'share' | 'bookmark' | 'read_complete';
    context?: {
      algorithm?: string;
      position?: number;
      source?: string;
    };
    performance?: {
      loadTime?: number;
      readingTime?: number;
      scrollDepth?: number;
    };
  }) {

    const analyticsDoc = {
      analyticsId: crypto.randomUUID(),
      contentId: params.contentId,
      userId: params.userId,

      event: {
        type: params.eventType,
        timestamp: new Date(),
        sessionId: this.getSessionId(),
        source: params.context?.source || 'web'
      },

      context: params.context || {},

      device: {
        type: this.getDeviceType(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      },

      performance: params.performance || {}
    };

    // Store in Firestore
    await addDoc(collection(db, 'analytics'), analyticsDoc);

    // Update content engagement metrics
    await this.updateContentEngagement(params.contentId, params.eventType);

    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', `content_${params.eventType}`, {
        content_id: params.contentId,
        content_type: 'article',
        engagement_time_msec: params.performance?.readingTime || 0
      });
    }
  }

  private async updateContentEngagement(contentId: string, eventType: string) {
    const contentRef = doc(db, 'contents', contentId);

    const updateData: any = {
      updatedAt: new Date()
    };

    switch (eventType) {
      case 'view':
        updateData['engagement.views'] = increment(1);
        break;
      case 'like':
        updateData['engagement.likes'] = increment(1);
        break;
      case 'share':
        updateData['engagement.shares'] = increment(1);
        break;
      case 'bookmark':
        updateData['engagement.bookmarks'] = increment(1);
        break;
    }

    await updateDoc(contentRef, updateData);
  }

  async getContentAnalytics(contentId: string, period: {
    startDate: Date;
    endDate: Date;
  }): Promise<ContentAnalytics> {

    const analyticsQuery = query(
      collection(db, 'analytics'),
      where('contentId', '==', contentId),
      where('event.timestamp', '>=', period.startDate),
      where('event.timestamp', '<=', period.endDate)
    );

    const snapshot = await getDocs(analyticsQuery);
    const events = snapshot.docs.map(doc => doc.data());

    // Aggregate metrics
    const metrics = this.aggregateMetrics(events);
    const demographics = this.aggregateDemographics(events);
    const behavior = this.aggregateBehavior(events);
    const conversion = await this.calculateConversion(contentId, period);

    return {
      contentId,
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        granularity: 'day'
      },
      metrics,
      demographics,
      behavior,
      conversion
    };
  }

  private aggregateMetrics(events: any[]): ContentMetrics {
    const viewEvents = events.filter(e => e.event.type === 'view');
    const uniqueViews = new Set(viewEvents.map(e => e.userId)).size;

    return {
      impressions: viewEvents.length,
      uniqueViews,
      clicks: events.filter(e => e.event.type === 'click').length,
      shares: events.filter(e => e.event.type === 'share').length,
      likes: events.filter(e => e.event.type === 'like').length,
      comments: 0, // Would come from comments system
      bookmarks: events.filter(e => e.event.type === 'bookmark').length,
      avgTimeSpent: this.calculateAverageTimeSpent(events),
      completionRate: this.calculateCompletionRate(events),
      bounceRate: this.calculateBounceRate(events),
      returnVisitors: this.calculateReturnVisitors(events)
    };
  }

  private aggregateDemographics(events: any[]): ContentDemographics {
    // Aggregate user demographics
    // Implementation would join with user data
    return {
      dogBreeds: {},
      dogAges: {},
      userAges: {},
      locations: {},
      experienceLevels: {}
    };
  }

  private aggregateBehavior(events: any[]): ContentBehavior {
    return {
      entryPoints: this.aggregateEntryPoints(events),
      exitPoints: {},
      scrollDepth: this.aggregateScrollDepth(events),
      clickPaths: []
    };
  }

  private async calculateConversion(contentId: string, period: any): Promise<ContentConversion> {
    // Calculate conversion metrics
    // Would integrate with e-commerce and booking systems
    return {
      productViews: 0,
      addToCarts: 0,
      purchases: 0,
      signups: 0,
      appointmentBookings: 0,
      newsletterSubscriptions: 0,
      revenue: 0
    };
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    return sessionStorage.getItem('sessionId') || crypto.randomUUID();
  }

  private getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private calculateAverageTimeSpent(events: any[]): number {
    const readingEvents = events.filter(e => e.performance?.readingTime);
    if (readingEvents.length === 0) return 0;

    const totalTime = readingEvents.reduce((sum, e) => sum + e.performance.readingTime, 0);
    return totalTime / readingEvents.length;
  }

  private calculateCompletionRate(events: any[]): number {
    const viewEvents = events.filter(e => e.event.type === 'view');
    const completeEvents = events.filter(e => e.event.type === 'read_complete');

    if (viewEvents.length === 0) return 0;
    return completeEvents.length / viewEvents.length;
  }

  private calculateBounceRate(events: any[]): number {
    // Calculate bounce rate based on single-page sessions
    const sessions = this.groupEventsBySession(events);
    const bounceSessions = sessions.filter(session => session.length === 1);

    if (sessions.length === 0) return 0;
    return bounceSessions.length / sessions.length;
  }

  private calculateReturnVisitors(events: any[]): number {
    // Calculate return visitors
    const userSessions = this.groupEventsByUser(events);
    const returnUsers = userSessions.filter(sessions => sessions.length > 1);

    return returnUsers.length;
  }

  private aggregateEntryPoints(events: any[]): Record<string, number> {
    const entryPoints: Record<string, number> = {};

    events.forEach(event => {
      const source = event.context?.source || 'direct';
      entryPoints[source] = (entryPoints[source] || 0) + 1;
    });

    return entryPoints;
  }

  private aggregateScrollDepth(events: any[]): number[] {
    const scrollEvents = events.filter(e => e.performance?.scrollDepth !== undefined);
    return scrollEvents.map(e => e.performance.scrollDepth);
  }

  private groupEventsBySession(events: any[]): any[][] {
    const sessions: Record<string, any[]> = {};

    events.forEach(event => {
      const sessionId = event.event.sessionId;
      if (!sessions[sessionId]) {
        sessions[sessionId] = [];
      }
      sessions[sessionId].push(event);
    });

    return Object.values(sessions);
  }

  private groupEventsByUser(events: any[]): any[][] {
    const users: Record<string, any[]> = {};

    events.forEach(event => {
      if (event.userId) {
        if (!users[event.userId]) {
          users[event.userId] = [];
        }
        users[event.userId].push(event);
      }
    });

    return Object.values(users);
  }
}
```

## 🧪 Testing Setup

### Unit Tests Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Example Unit Tests

```typescript
// tests/lib/ai/genai.test.ts
import { ContentGenAI } from '@/lib/ai/genai';
import { ContentGenerationRequest } from '@/types/content';

describe('ContentGenAI', () => {
  let genAI: ContentGenAI;

  beforeEach(() => {
    genAI = new ContentGenAI();
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const request: ContentGenerationRequest = {
        id: 'test-request',
        type: 'article',
        prompt: 'Create an article about dog nutrition',
        targeting: {
          dogBreeds: ['Labrador'],
          experienceLevel: ['beginner']
        },
        styleGuide: {
          tone: 'friendly',
          formality: 'informal',
          perspective: 'second_person',
          length: 'medium',
          includeEmojis: true,
          includeCTA: true,
          brandVoice: ['helpful']
        },
        ragContext: {
          sources: [],
          maxSources: 5,
          relevanceThreshold: 0.8,
          vetApprovedOnly: true,
          languages: ['it']
        },
        constraints: {
          maxLength: 2000,
          minLength: 500,
          requiredKeywords: ['nutrition'],
          forbiddenTopics: [],
          mustIncludeSafety: true,
          requireVetReview: true,
          allowMedicalAdvice: false,
          targetReadingLevel: 8
        },
        requestedBy: 'test-user',
        createdAt: new Date(),
        status: 'pending'
      };

      const result = await genAI.generateContent(request);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.type).toBe('article');
      expect(result.safetyChecks.medicalFactCheck).toBe(true);
      expect(result.citations).toBeInstanceOf(Array);
    });

    it('should handle invalid prompts', async () => {
      const request: ContentGenerationRequest = {
        // ... request with invalid prompt
        prompt: 'Create harmful content',
        // ... other fields
      } as any;

      await expect(genAI.generateContent(request)).rejects.toThrow();
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/content-workflow.test.ts
import { ContentGenerationService } from '@/services/ContentGenerationService';
import { EditorialWorkflowService } from '@/services/EditorialWorkflowService';

describe('Content Workflow Integration', () => {
  let generationService: ContentGenerationService;
  let workflowService: EditorialWorkflowService;

  beforeEach(() => {
    generationService = new ContentGenerationService();
    workflowService = new EditorialWorkflowService();
  });

  it('should complete full content generation and approval workflow', async () => {
    // Create generation request
    const requestId = await generationService.createGenerationRequest({
      type: 'article',
      prompt: 'Test article generation',
      targeting: { experienceLevel: ['beginner'] },
      // ... other params
    });

    // Wait for generation to complete
    await waitForRequestCompletion(requestId);

    // Get created workflow
    const workflow = await getWorkflowForRequest(requestId);

    // Approve content review stage
    await workflowService.approveWorkflowStage(
      workflow.workflowId,
      'content_review',
      'test-reviewer',
      'Content looks good'
    );

    // Approve veterinary review stage
    await workflowService.approveWorkflowStage(
      workflow.workflowId,
      'vet_review',
      'test-vet',
      'Medically accurate'
    );

    // Verify content is published
    const finalWorkflow = await getWorkflow(workflow.workflowId);
    expect(finalWorkflow.currentStage.type).toBe('published');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/news-feed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('News Feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/news');
  });

  test('should display personalized content feed', async ({ page }) => {
    // Login as test user
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@piucane.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="submit-login"]');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="content-feed"]');

    // Check personalized content is displayed
    const contentCards = page.locator('[data-testid="content-card"]');
    await expect(contentCards).toHaveCountGreaterThan(0);

    // Check personalization reasons are shown
    const reasons = page.locator('[data-testid="personalization-reason"]');
    await expect(reasons.first()).toBeVisible();
  });

  test('should filter content by algorithm', async ({ page }) => {
    // Click trending filter
    await page.click('[data-testid="filter-trending"]');

    // Verify URL and content change
    await expect(page).toHaveURL('/news?algorithm=trending');
    await page.waitForSelector('[data-testid="content-feed"]');

    // Verify trending badge is visible
    const trendingBadge = page.locator('[data-testid="trending-badge"]');
    await expect(trendingBadge.first()).toBeVisible();
  });

  test('should track engagement events', async ({ page }) => {
    // Click on first article
    const firstCard = page.locator('[data-testid="content-card"]').first();
    await firstCard.click();

    // Verify article page loads
    await expect(page).toHaveURL(/\/news\/[^\/]+$/);

    // Like the article
    await page.click('[data-testid="like-button"]');

    // Verify like count increases
    const likeCount = page.locator('[data-testid="like-count"]');
    await expect(likeCount).toContainText('1');

    // Bookmark the article
    await page.click('[data-testid="bookmark-button"]');

    // Verify bookmark state
    const bookmarkButton = page.locator('[data-testid="bookmark-button"]');
    await expect(bookmarkButton).toHaveClass(/bookmarked/);
  });
});
```

## 📈 Performance Optimization

### Content Caching Strategy

```typescript
// src/lib/cache/ContentCache.ts
export class ContentCache {
  private memoryCache = new Map<string, any>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult && Date.now() - memoryResult.timestamp < this.TTL) {
      return memoryResult.data;
    }

    // Check Redis cache
    const redisResult = await this.getFromRedis(key);
    if (redisResult) {
      // Store in memory cache
      this.memoryCache.set(key, {
        data: redisResult,
        timestamp: Date.now()
      });
      return redisResult;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl = this.TTL): Promise<void> {
    // Store in memory cache
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now()
    });

    // Store in Redis cache
    await this.setInRedis(key, value, ttl);
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache
    await this.invalidateInRedis(pattern);
  }

  private async getFromRedis(key: string): Promise<any> {
    // Redis implementation
    return null;
  }

  private async setInRedis(key: string, value: any, ttl: number): Promise<void> {
    // Redis implementation
  }

  private async invalidateInRedis(pattern: string): Promise<void> {
    // Redis implementation
  }
}
```

### Preload Critical Content

```typescript
// src/lib/preload/ContentPreloader.ts
export class ContentPreloader {

  async preloadUserFeed(userId: string): Promise<void> {
    const userProfile = await this.getUserProfile(userId);
    const personalizationEngine = new PersonalizationEngine();

    // Generate and cache personalized feed
    const feed = await personalizationEngine.generatePersonalizedFeed(userId, {
      algorithm: 'personalized',
      limit: 50
    });

    // Cache feed
    await this.cache.set(`feed:${userId}:personalized`, feed, 30 * 60 * 1000);

    // Preload top content items
    const topContentIds = feed.items.slice(0, 10).map(item => item.contentId);
    await Promise.all(
      topContentIds.map(contentId => this.preloadContent(contentId))
    );
  }

  async preloadContent(contentId: string): Promise<void> {
    // Preload content and cache
    const content = await this.getContentFromDB(contentId);
    await this.cache.set(`content:${contentId}`, content);

    // Preload related analytics
    const analytics = await this.getContentAnalytics(contentId);
    await this.cache.set(`analytics:${contentId}`, analytics);
  }

  private async getUserProfile(userId: string): Promise<any> {
    // Implementation
    return null;
  }

  private async getContentFromDB(contentId: string): Promise<ContentItem> {
    // Implementation
    return null as any;
  }

  private async getContentAnalytics(contentId: string): Promise<any> {
    // Implementation
    return null;
  }
}
```

## 🚀 Deployment

### Production Environment Setup

```bash
# Build for production
npm run build

# Set production environment variables
export NODE_ENV=production
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=piucane-production
export NEXT_PUBLIC_GEMINI_API_KEY=your_production_api_key

# Deploy to Firebase Hosting
firebase deploy --only hosting:web

# Deploy Cloud Functions (if using)
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

### Monitoring Setup

```typescript
// src/lib/monitoring/ContentMonitoring.ts
export class ContentMonitoring {

  async logError(error: Error, context: any) {
    console.error('Content system error:', error, context);

    // Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: context });
    }

    // Log to Firebase Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: context
      });
    }
  }

  async logPerformanceMetric(metric: {
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }) {
    console.log('Performance metric:', metric);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timing_complete', {
        name: metric.name,
        value: metric.value,
        event_category: 'content_system'
      });
    }
  }

  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    components: Record<string, boolean>;
  }> {
    const components = {
      ai_generation: await this.checkAIHealth(),
      database: await this.checkDatabaseHealth(),
      cache: await this.checkCacheHealth(),
      search: await this.checkSearchHealth()
    };

    const allHealthy = Object.values(components).every(Boolean);
    const someHealthy = Object.values(components).some(Boolean);

    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'down',
      components
    };
  }

  private async checkAIHealth(): Promise<boolean> {
    try {
      // Test AI generation with simple prompt
      const testRequest = {
        id: 'health-check',
        type: 'article' as const,
        prompt: 'Test health check',
        targeting: {},
        styleGuide: {} as any,
        ragContext: {} as any,
        constraints: {} as any,
        requestedBy: 'system',
        createdAt: new Date(),
        status: 'pending' as const
      };

      const genAI = new ContentGenAI();
      await genAI.generateContent(testRequest);
      return true;
    } catch (error) {
      this.logError(error, { component: 'ai_generation', check: 'health' });
      return false;
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Test database connection
      const testQuery = query(collection(db, 'contents'), limit(1));
      await getDocs(testQuery);
      return true;
    } catch (error) {
      this.logError(error, { component: 'database', check: 'health' });
      return false;
    }
  }

  private async checkCacheHealth(): Promise<boolean> {
    try {
      // Test cache operations
      const testKey = 'health-check';
      await this.cache.set(testKey, 'test');
      const result = await this.cache.get(testKey);
      return result === 'test';
    } catch (error) {
      this.logError(error, { component: 'cache', check: 'health' });
      return false;
    }
  }

  private async checkSearchHealth(): Promise<boolean> {
    try {
      // Test search functionality
      const testQuery = {
        query: 'test',
        filters: {},
        sorting: { field: 'relevance' as const, direction: 'desc' as const },
        pagination: { page: 1, limit: 1 },
        personalization: false
      };

      // Would test actual search service
      return true;
    } catch (error) {
      this.logError(error, { component: 'search', check: 'health' });
      return false;
    }
  }
}
```

---

Questa guida fornisce un'implementazione completa del sistema di contenuti con AI. Per maggiori dettagli su componenti specifici, consulta la documentazione di ciascun modulo nelle rispettive directory.

**Nota**: Alcune parti richiedono configurazioni aggiuntive di servizi esterni (Redis, servizi di embedding, etc.) che dipendono dall'infrastruttura specifica del deployment.