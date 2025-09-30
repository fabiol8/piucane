import { ContentGenAI } from '@/lib/ai/genai';
import type {
  ContentGenerationRequest,
  ContentItem,
  EditorialWorkflow,
  WorkflowStage,
  SafetyChecks,
  VeterinaryApproval
} from '@/types/content';

export class ContentGenerationPipeline {
  private genAI: ContentGenAI;
  private moderationService: ContentModerationService;
  private workflowService: EditorialWorkflowService;
  private veterinaryService: VeterinaryReviewService;

  constructor() {
    this.genAI = new ContentGenAI();
    this.moderationService = new ContentModerationService();
    this.workflowService = new EditorialWorkflowService();
    this.veterinaryService = new VeterinaryReviewService();
  }

  async generateContent(request: ContentGenerationRequest): Promise<{
    contentId: string;
    workflowId: string;
    status: 'generated' | 'failed' | 'needs_review';
  }> {
    try {
      console.log(`Starting content generation for request: ${request.id}`);

      // Step 1: Pre-generation validation
      await this.validateRequest(request);

      // Step 2: Generate content with AI
      const generation = await this.genAI.generateContent(request);

      // Step 3: Content moderation
      const moderationResult = await this.moderationService.moderateContent(
        generation.content,
        generation.safetyChecks
      );

      if (!moderationResult.approved) {
        throw new Error(`Content moderation failed: ${moderationResult.reason}`);
      }

      // Step 4: Create content item
      const contentItem = await this.createContentItem(
        generation.content,
        generation.citations,
        generation.safetyChecks,
        request
      );

      // Step 5: Initialize editorial workflow
      const workflow = await this.workflowService.initializeWorkflow(
        contentItem.contentId!,
        request.constraints.requireVetReview
      );

      // Step 6: Auto-assign to next stage if possible
      await this.workflowService.autoAdvanceWorkflow(workflow.id);

      console.log(`Content generated successfully: ${contentItem.contentId}`);

      return {
        contentId: contentItem.contentId!,
        workflowId: workflow.id,
        status: 'generated'
      };

    } catch (error) {
      console.error(`Content generation failed for request ${request.id}:`, error);

      // Log failure for analytics
      await this.logGenerationFailure(request, error);

      return {
        contentId: '',
        workflowId: '',
        status: 'failed'
      };
    }
  }

  async batchGenerateContent(requests: ContentGenerationRequest[]): Promise<{
    successful: string[];
    failed: string[];
    totalGenerated: number;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as string[],
      totalGenerated: 0
    };

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      const batchPromises = batch.map(async (request) => {
        try {
          const result = await this.generateContent(request);
          if (result.status === 'generated') {
            results.successful.push(result.contentId);
            results.totalGenerated++;
          } else {
            results.failed.push(request.id);
          }
        } catch (error) {
          console.error(`Batch generation failed for ${request.id}:`, error);
          results.failed.push(request.id);
        }
      });

      await Promise.allSettled(batchPromises);

      // Rate limiting delay between batches
      if (i + batchSize < requests.length) {
        await this.delay(2000); // 2 second delay
      }
    }

    return results;
  }

  private async validateRequest(request: ContentGenerationRequest): Promise<void> {
    // Validate targeting parameters
    if (!request.targeting || Object.keys(request.targeting).length === 0) {
      throw new Error('Content targeting is required');
    }

    // Validate prompt safety
    if (await this.containsUnsafeContent(request.prompt)) {
      throw new Error('Prompt contains unsafe content');
    }

    // Validate constraints
    if (request.constraints.maxLength < request.constraints.minLength) {
      throw new Error('Invalid length constraints');
    }

    // Check rate limits
    if (await this.isRateLimited(request.requestedBy)) {
      throw new Error('Rate limit exceeded for user');
    }
  }

  private async createContentItem(
    content: Partial<ContentItem>,
    citations: any[],
    safetyChecks: SafetyChecks,
    request: ContentGenerationRequest
  ): Promise<ContentItem> {
    const contentId = this.generateContentId();

    const contentItem: ContentItem = {
      contentId,
      type: request.type,
      title: content.title || 'Titolo Generato',
      slug: content.slug || this.generateSlug(content.title || ''),
      excerpt: content.excerpt || '',
      content: content.content || '',
      htmlContent: content.htmlContent || '',

      // AI Generation metadata
      generationType: 'ai',
      aiPrompt: request.prompt,
      ragSources: content.ragSources || [],

      // Targeting
      targeting: request.targeting,

      // Safety
      safetyChecks,

      // Author
      author: {
        id: 'ai-system',
        name: 'Sistema PiùCane AI',
        role: 'ai_system'
      },

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',

      // SEO
      seo: content.seo || {
        metaTitle: content.title || '',
        metaDescription: content.excerpt || '',
        keywords: content.tags || []
      },

      // Content metadata
      tags: content.tags || [],
      categories: content.categories || [],
      readingTime: content.readingTime || 5,

      // Engagement (initial values)
      engagement: {
        views: 0,
        likes: 0,
        shares: 0,
        bookmarks: 0,
        comments: 0,
        avgRating: 0,
        totalRatings: 0,
        readCompletionRate: 0,
        bounceRate: 0,
        timeSpent: 0
      },

      // Localization
      language: 'it',

      // Commercial
      isSponsored: false,

      // Accessibility
      accessibility: content.accessibility || {
        hasAltText: false,
        hasTranscript: false,
        hasSubtitles: false,
        hasAudioDescription: false,
        colorContrastCompliant: true,
        screenReaderOptimized: true,
        keyboardNavigable: true,
        wcagLevel: 'AA'
      }
    };

    // Save to database
    await this.saveContentItem(contentItem);

    // Save citations
    await this.saveCitations(contentId, citations);

    return contentItem;
  }

  private async saveContentItem(content: ContentItem): Promise<void> {
    // In a real implementation, this would save to Firestore
    console.log('Saving content item:', content.contentId);
  }

  private async saveCitations(contentId: string, citations: any[]): Promise<void> {
    // Save citations separately for tracking
    console.log('Saving citations for:', contentId, citations);
  }

  private async logGenerationFailure(request: ContentGenerationRequest, error: any): Promise<void> {
    const logEntry = {
      requestId: request.id,
      userId: request.requestedBy,
      error: error.message,
      timestamp: new Date(),
      prompt: request.prompt,
      targeting: request.targeting
    };

    console.log('Generation failure logged:', logEntry);
  }

  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async containsUnsafeContent(prompt: string): Promise<boolean> {
    const unsafeKeywords = [
      'dannoso', 'pericoloso', 'tossico', 'illegale', 'violento'
    ];

    const lowerPrompt = prompt.toLowerCase();
    return unsafeKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  private async isRateLimited(userId: string): Promise<boolean> {
    // Check user's generation rate limits
    // Implementation would check Redis or database
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class ContentModerationService {
  async moderateContent(
    content: Partial<ContentItem>,
    safetyChecks: SafetyChecks
  ): Promise<{ approved: boolean; reason?: string; confidence: number }> {

    // Check safety flags
    if (!safetyChecks.medicalFactCheck || !safetyChecks.harmfulContentCheck) {
      return {
        approved: false,
        reason: 'Content failed safety checks',
        confidence: 0.95
      };
    }

    // Check for inappropriate content
    if (await this.containsInappropriateContent(content.content || '')) {
      return {
        approved: false,
        reason: 'Content contains inappropriate material',
        confidence: 0.9
      };
    }

    // Check length constraints
    if (this.isContentTooShort(content.content || '')) {
      return {
        approved: false,
        reason: 'Content is too short to be valuable',
        confidence: 0.8
      };
    }

    return {
      approved: true,
      confidence: 0.95
    };
  }

  private async containsInappropriateContent(content: string): Promise<boolean> {
    const inappropriatePatterns = [
      /violenza/i,
      /contenuto\s+esplicito/i,
      /linguaggio\s+offensivo/i
    ];

    return inappropriatePatterns.some(pattern => pattern.test(content));
  }

  private isContentTooShort(content: string): boolean {
    return content.length < 100; // Minimum 100 characters
  }
}

class EditorialWorkflowService {
  async initializeWorkflow(contentId: string, requireVetReview: boolean): Promise<EditorialWorkflow> {
    const stages: WorkflowStage[] = [
      {
        id: 'ai_generation',
        name: 'Generazione AI',
        type: 'creation',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        estimatedDuration: 300, // 5 minutes
        requirements: ['AI safety checks', 'Content generation'],
        automatable: true
      },
      {
        id: 'content_review',
        name: 'Revisione Contenuto',
        type: 'editing',
        status: 'pending',
        estimatedDuration: 1800, // 30 minutes
        requirements: ['Grammar check', 'Style consistency', 'Fact verification'],
        automatable: false
      },
      {
        id: 'seo_optimization',
        name: 'Ottimizzazione SEO',
        type: 'seo_review',
        status: 'pending',
        estimatedDuration: 900, // 15 minutes
        requirements: ['Meta tags', 'Keywords', 'Structured data'],
        automatable: true
      }
    ];

    if (requireVetReview) {
      stages.push({
        id: 'veterinary_review',
        name: 'Revisione Veterinaria',
        type: 'vet_review',
        status: 'pending',
        estimatedDuration: 3600, // 1 hour
        requirements: ['Medical accuracy', 'Safety validation', 'Professional approval'],
        automatable: false
      });
    }

    stages.push({
      id: 'final_approval',
      name: 'Approvazione Finale',
      type: 'final_approval',
      status: 'pending',
      estimatedDuration: 600, // 10 minutes
      requirements: ['All previous stages completed', 'Quality assurance'],
      automatable: false
    });

    const workflow: EditorialWorkflow = {
      contentId,
      currentStage: stages[1], // Start with content review
      stages,
      priority: 'medium',
      notes: [],
      approvals: [],
      rejections: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return workflow;
  }

  async autoAdvanceWorkflow(workflowId: string): Promise<void> {
    // Auto-advance automatable stages
    console.log('Auto-advancing workflow:', workflowId);
  }
}

class VeterinaryReviewService {
  async requestVeterinaryReview(contentId: string): Promise<{
    reviewId: string;
    estimatedCompletion: Date;
  }> {
    const reviewId = `vet_review_${Date.now()}`;
    const estimatedCompletion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // In real implementation, this would:
    // 1. Assign to available veterinarian
    // 2. Send notification
    // 3. Create review task

    return {
      reviewId,
      estimatedCompletion
    };
  }

  async getVeterinaryApproval(reviewId: string): Promise<VeterinaryApproval | null> {
    // In real implementation, fetch from database
    return null;
  }
}