import type {
  ContentFeed,
  ContentFeedItem,
  ContentItem,
  PersonalizationReason,
  ContentTargeting,
  ContentAnalytics
} from '@/types/content';

export class PersonalizationEngine {
  private vectorService: VectorSimilarityService;
  private behaviorAnalyzer: UserBehaviorAnalyzer;
  private contentRanker: ContentRankingService;
  private abTestService: ABTestingService;

  constructor() {
    this.vectorService = new VectorSimilarityService();
    this.behaviorAnalyzer = new UserBehaviorAnalyzer();
    this.contentRanker = new ContentRankingService();
    this.abTestService = new ABTestingService();
  }

  async generatePersonalizedFeed(
    userId: string,
    options: {
      limit?: number;
      algorithm?: 'chronological' | 'personalized' | 'trending' | 'curated';
      freshness?: boolean;
    } = {}
  ): Promise<ContentFeed> {
    const {
      limit = 20,
      algorithm = 'personalized',
      freshness = true
    } = options;

    try {
      // Get user profile and preferences
      const userProfile = await this.getUserProfile(userId);

      // Get AB test variant for this user
      const abTestVariant = await this.abTestService.getVariantForUser(userId, 'feed_algorithm');

      // Get content pool based on targeting
      const contentPool = await this.getTargetedContent(userProfile);

      // Apply algorithm-specific ranking
      let rankedContent: ContentFeedItem[];

      switch (algorithm) {
        case 'chronological':
          rankedContent = await this.rankChronologically(contentPool);
          break;
        case 'trending':
          rankedContent = await this.rankByTrending(contentPool);
          break;
        case 'curated':
          rankedContent = await this.rankByCuration(contentPool, userProfile);
          break;
        case 'personalized':
        default:
          rankedContent = await this.rankPersonalized(contentPool, userProfile, abTestVariant);
          break;
      }

      // Apply freshness filter if requested
      if (freshness) {
        rankedContent = await this.applyFreshnessFilter(rankedContent, userProfile);
      }

      // Limit results
      rankedContent = rankedContent.slice(0, limit);

      // Add position metadata
      rankedContent.forEach((item, index) => {
        item.position = index + 1;
      });

      const feed: ContentFeed = {
        userId,
        items: rankedContent,
        algorithm,
        lastUpdated: new Date(),
        nextRefresh: this.calculateNextRefresh(algorithm),
        abTestVariant
      };

      // Log feed generation for analytics
      await this.logFeedGeneration(feed, userProfile);

      return feed;

    } catch (error) {
      console.error('Feed generation failed:', error);

      // Fallback to chronological feed
      return this.generateFallbackFeed(userId, limit);
    }
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    // In real implementation, fetch from database
    return {
      userId,
      dogs: [{
        breed: 'Labrador',
        age: { value: 3, unit: 'years' },
        size: 'large',
        healthConditions: ['hip_dysplasia'],
        allergies: ['chicken']
      }],
      interests: ['training', 'nutrition', 'health'],
      experienceLevel: 'intermediate',
      location: {
        country: 'IT',
        region: 'Lombardia',
        city: 'Milano'
      },
      preferences: {
        contentTypes: ['article', 'guide', 'video'],
        readingTime: { min: 5, max: 15 },
        languages: ['it'],
        topics: ['nutrition', 'training', 'health']
      },
      behavior: {
        avgSessionTime: 15,
        preferredReadingTime: 'evening',
        engagementScore: 0.75,
        lastActiveAt: new Date()
      }
    };
  }

  private async getTargetedContent(userProfile: UserProfile): Promise<ContentItem[]> {
    // Filter content based on user profile
    const targetingCriteria: ContentTargeting = {
      dogBreeds: userProfile.dogs.map(dog => dog.breed),
      dogAges: userProfile.dogs.map(dog => ({
        min: dog.age.value - 1,
        max: dog.age.value + 1,
        unit: dog.age.unit
      })),
      dogSizes: userProfile.dogs.map(dog => dog.size),
      healthConditions: userProfile.dogs.flatMap(dog => dog.healthConditions || []),
      allergies: userProfile.dogs.flatMap(dog => dog.allergies || []),
      experienceLevel: [userProfile.experienceLevel],
      interests: userProfile.interests,
      location: userProfile.location
    };

    // In real implementation, query database with targeting criteria
    return this.mockContentPool();
  }

  private async rankPersonalized(
    content: ContentItem[],
    userProfile: UserProfile,
    abTestVariant?: string
  ): Promise<ContentFeedItem[]> {
    const scoredItems: ContentFeedItem[] = [];

    for (const item of content) {
      const score = await this.calculatePersonalizationScore(item, userProfile, abTestVariant);
      const reasons = await this.generatePersonalizationReasons(item, userProfile);

      scoredItems.push({
        contentId: item.contentId,
        score,
        reason: reasons,
        position: 0 // Will be set later
      });
    }

    // Sort by score descending
    return scoredItems.sort((a, b) => b.score - a.score);
  }

  private async calculatePersonalizationScore(
    content: ContentItem,
    userProfile: UserProfile,
    abTestVariant?: string
  ): Promise<number> {
    let score = 0;

    // Base content quality score (20%)
    score += this.calculateQualityScore(content) * 0.2;

    // User-content similarity (30%)
    score += await this.calculateUserContentSimilarity(content, userProfile) * 0.3;

    // Behavioral signals (25%)
    score += await this.calculateBehavioralScore(content, userProfile) * 0.25;

    // Freshness score (15%)
    score += this.calculateFreshnessScore(content) * 0.15;

    // Trending score (10%)
    score += this.calculateTrendingScore(content) * 0.1;

    // Apply AB test modifications
    if (abTestVariant) {
      score = await this.applyABTestModifications(score, content, userProfile, abTestVariant);
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateQualityScore(content: ContentItem): number {
    let score = 0;

    // Engagement metrics
    if (content.engagement.avgRating > 0) {
      score += (content.engagement.avgRating / 5) * 0.3;
    }

    // Completion rate
    score += content.engagement.readCompletionRate * 0.3;

    // Author credibility
    if (content.author.role === 'veterinarian') {
      score += 0.2;
    } else if (content.author.role === 'expert') {
      score += 0.15;
    }

    // Content length optimization
    const optimalLength = 800; // words
    const wordCount = content.content.split(/\s+/).length;
    const lengthScore = 1 - Math.abs(wordCount - optimalLength) / optimalLength;
    score += Math.max(0, lengthScore) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private async calculateUserContentSimilarity(
    content: ContentItem,
    userProfile: UserProfile
  ): Promise<number> {
    let similarity = 0;

    // Breed matching
    const breedMatch = this.calculateBreedMatch(content.targeting, userProfile);
    similarity += breedMatch * 0.3;

    // Age matching
    const ageMatch = this.calculateAgeMatch(content.targeting, userProfile);
    similarity += ageMatch * 0.2;

    // Interest matching
    const interestMatch = this.calculateInterestMatch(content, userProfile);
    similarity += interestMatch * 0.3;

    // Experience level matching
    const experienceMatch = this.calculateExperienceMatch(content.targeting, userProfile);
    similarity += experienceMatch * 0.2;

    return Math.max(0, Math.min(1, similarity));
  }

  private calculateBreedMatch(targeting: ContentTargeting, userProfile: UserProfile): number {
    if (!targeting.dogBreeds || targeting.dogBreeds.length === 0) {
      return 0.5; // Neutral for general content
    }

    const userBreeds = userProfile.dogs.map(dog => dog.breed.toLowerCase());
    const targetBreeds = targeting.dogBreeds.map(breed => breed.toLowerCase());

    const matches = userBreeds.filter(breed => targetBreeds.includes(breed));
    return matches.length / userBreeds.length;
  }

  private calculateAgeMatch(targeting: ContentTargeting, userProfile: UserProfile): number {
    if (!targeting.dogAges || targeting.dogAges.length === 0) {
      return 0.5; // Neutral for general content
    }

    let bestMatch = 0;
    for (const userDog of userProfile.dogs) {
      for (const targetAge of targeting.dogAges) {
        if (targetAge.unit === userDog.age.unit) {
          const userAge = userDog.age.value;
          if (userAge >= targetAge.min && userAge <= targetAge.max) {
            bestMatch = Math.max(bestMatch, 1);
          } else {
            const distance = Math.min(
              Math.abs(userAge - targetAge.min),
              Math.abs(userAge - targetAge.max)
            );
            const match = Math.max(0, 1 - distance / 5); // 5 year tolerance
            bestMatch = Math.max(bestMatch, match);
          }
        }
      }
    }

    return bestMatch;
  }

  private calculateInterestMatch(content: ContentItem, userProfile: UserProfile): number {
    const contentTopics = [
      ...content.tags,
      ...content.categories,
      content.type
    ].map(t => t.toLowerCase());

    const userInterests = userProfile.interests.map(i => i.toLowerCase());

    const matches = contentTopics.filter(topic =>
      userInterests.some(interest =>
        topic.includes(interest) || interest.includes(topic)
      )
    );

    return matches.length / Math.max(contentTopics.length, userInterests.length);
  }

  private calculateExperienceMatch(targeting: ContentTargeting, userProfile: UserProfile): number {
    if (!targeting.experienceLevel || targeting.experienceLevel.length === 0) {
      return 0.5;
    }

    return targeting.experienceLevel.includes(userProfile.experienceLevel) ? 1 : 0.3;
  }

  private async calculateBehavioralScore(
    content: ContentItem,
    userProfile: UserProfile
  ): Promise<number> {
    // In real implementation, this would analyze user's past behavior
    let score = 0;

    // Reading time preference
    if (content.readingTime >= userProfile.preferences.readingTime.min &&
        content.readingTime <= userProfile.preferences.readingTime.max) {
      score += 0.4;
    }

    // Content type preference
    if (userProfile.preferences.contentTypes.includes(content.type)) {
      score += 0.3;
    }

    // Historical engagement with similar content
    score += await this.getHistoricalEngagement(content, userProfile) * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  private calculateFreshnessScore(content: ContentItem): number {
    const now = new Date();
    const published = content.publishedAt || content.createdAt;
    const ageInDays = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: newer content gets higher scores
    return Math.exp(-ageInDays / 30); // Half-life of 30 days
  }

  private calculateTrendingScore(content: ContentItem): number {
    const engagement = content.engagement;

    // Calculate trending based on recent engagement velocity
    const recentViews = engagement.views; // In real implementation, this would be recent views
    const viewVelocity = recentViews / Math.max(1, engagement.views);

    return Math.min(1, viewVelocity);
  }

  private async generatePersonalizationReasons(
    content: ContentItem,
    userProfile: UserProfile
  ): Promise<PersonalizationReason[]> {
    const reasons: PersonalizationReason[] = [];

    // Breed match
    if (this.calculateBreedMatch(content.targeting, userProfile) > 0.8) {
      reasons.push({
        type: 'breed_match',
        confidence: 0.9,
        description: `Perfetto per ${userProfile.dogs[0].breed}`
      });
    }

    // Interest match
    const interestMatch = this.calculateInterestMatch(content, userProfile);
    if (interestMatch > 0.6) {
      reasons.push({
        type: 'interest_match',
        confidence: interestMatch,
        description: 'Basato sui tuoi interessi'
      });
    }

    // Trending content
    if (this.calculateTrendingScore(content) > 0.7) {
      reasons.push({
        type: 'trending',
        confidence: 0.8,
        description: 'Contenuto di tendenza'
      });
    }

    return reasons;
  }

  private async rankChronologically(content: ContentItem[]): Promise<ContentFeedItem[]> {
    return content
      .sort((a, b) => {
        const dateA = a.publishedAt || a.createdAt;
        const dateB = b.publishedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })
      .map(item => ({
        contentId: item.contentId,
        score: 1,
        reason: [{
          type: 'chronological' as const,
          confidence: 1,
          description: 'Ordinamento cronologico'
        }],
        position: 0
      }));
  }

  private async rankByTrending(content: ContentItem[]): Promise<ContentFeedItem[]> {
    return content
      .map(item => ({
        content: item,
        trendingScore: this.calculateTrendingScore(item)
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .map(({ content: item, trendingScore }) => ({
        contentId: item.contentId,
        score: trendingScore,
        reason: [{
          type: 'trending' as const,
          confidence: trendingScore,
          description: 'Contenuto di tendenza'
        }],
        position: 0
      }));
  }

  private async rankByCuration(content: ContentItem[], userProfile: UserProfile): Promise<ContentFeedItem[]> {
    // Curated ranking combines editorial picks with personalization
    return content
      .map(item => {
        const curatedScore = this.calculateCuratedScore(item, userProfile);
        return {
          contentId: item.contentId,
          score: curatedScore,
          reason: [{
            type: 'curated' as const,
            confidence: 0.85,
            description: 'Selezionato dalla redazione'
          }],
          position: 0
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private calculateCuratedScore(content: ContentItem, userProfile: UserProfile): number {
    // Combination of editorial priority and user relevance
    let score = 0.5; // Base editorial score

    // Boost for veterinary content
    if (content.author.role === 'veterinarian') {
      score += 0.3;
    }

    // Boost for user relevance
    score += this.calculateBreedMatch(content.targeting, userProfile) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private async applyFreshnessFilter(
    items: ContentFeedItem[],
    userProfile: UserProfile
  ): Promise<ContentFeedItem[]> {
    // Remove content user has already seen recently
    const seenContentIds = await this.getRecentlySeenContent(userProfile.userId);

    return items.filter(item => !seenContentIds.includes(item.contentId));
  }

  private calculateNextRefresh(algorithm: string): Date {
    const now = new Date();
    let refreshInterval: number;

    switch (algorithm) {
      case 'trending':
        refreshInterval = 60 * 60 * 1000; // 1 hour
        break;
      case 'personalized':
        refreshInterval = 4 * 60 * 60 * 1000; // 4 hours
        break;
      case 'curated':
        refreshInterval = 12 * 60 * 60 * 1000; // 12 hours
        break;
      case 'chronological':
      default:
        refreshInterval = 30 * 60 * 1000; // 30 minutes
        break;
    }

    return new Date(now.getTime() + refreshInterval);
  }

  private async generateFallbackFeed(userId: string, limit: number): Promise<ContentFeed> {
    const fallbackContent = await this.getFallbackContent(limit);

    return {
      userId,
      items: fallbackContent.map((content, index) => ({
        contentId: content.contentId,
        score: 0.5,
        reason: [{
          type: 'chronological',
          confidence: 1,
          description: 'Feed di fallback'
        }],
        position: index + 1
      })),
      algorithm: 'chronological',
      lastUpdated: new Date(),
      nextRefresh: this.calculateNextRefresh('chronological')
    };
  }

  private async logFeedGeneration(feed: ContentFeed, userProfile: UserProfile): Promise<void> {
    const logData = {
      userId: feed.userId,
      algorithm: feed.algorithm,
      itemCount: feed.items.length,
      abTestVariant: feed.abTestVariant,
      userProfile: {
        experienceLevel: userProfile.experienceLevel,
        dogBreeds: userProfile.dogs.map(d => d.breed)
      },
      timestamp: new Date()
    };

    console.log('Feed generation logged:', logData);
  }

  // Helper methods
  private async getHistoricalEngagement(content: ContentItem, userProfile: UserProfile): Promise<number> {
    // In real implementation, analyze user's past engagement with similar content
    return 0.5;
  }

  private async getRecentlySeenContent(userId: string): Promise<string[]> {
    // In real implementation, fetch from database
    return [];
  }

  private async getFallbackContent(limit: number): Promise<ContentItem[]> {
    return this.mockContentPool().slice(0, limit);
  }

  private async applyABTestModifications(
    score: number,
    content: ContentItem,
    userProfile: UserProfile,
    variant: string
  ): Promise<number> {
    // Apply AB test specific modifications
    switch (variant) {
      case 'boost_video':
        return content.type === 'video' ? score * 1.2 : score;
      case 'boost_veterinary':
        return content.author.role === 'veterinarian' ? score * 1.15 : score;
      default:
        return score;
    }
  }

  private mockContentPool(): ContentItem[] {
    // Mock content for development
    return [];
  }
}

// Supporting interfaces
interface UserProfile {
  userId: string;
  dogs: {
    breed: string;
    age: { value: number; unit: 'months' | 'years' };
    size: 'small' | 'medium' | 'large' | 'giant';
    healthConditions?: string[];
    allergies?: string[];
  }[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  location: {
    country: string;
    region: string;
    city: string;
  };
  preferences: {
    contentTypes: string[];
    readingTime: { min: number; max: number };
    languages: string[];
    topics: string[];
  };
  behavior: {
    avgSessionTime: number;
    preferredReadingTime: string;
    engagementScore: number;
    lastActiveAt: Date;
  };
}

class VectorSimilarityService {
  async calculateSimilarity(content1: ContentItem, content2: ContentItem): Promise<number> {
    // In real implementation, use vector embeddings for content similarity
    return 0.5;
  }
}

class UserBehaviorAnalyzer {
  async analyzeUserBehavior(userId: string): Promise<any> {
    // Analyze user's reading patterns, engagement, preferences
    return {};
  }
}

class ContentRankingService {
  async rankContent(content: ContentItem[], criteria: any): Promise<ContentItem[]> {
    // Advanced ranking algorithms
    return content;
  }
}

class ABTestingService {
  async getVariantForUser(userId: string, testId: string): Promise<string | undefined> {
    // Return AB test variant for user
    const variants = ['control', 'boost_video', 'boost_veterinary'];
    const hash = this.hashUserId(userId);
    return variants[hash % variants.length];
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}