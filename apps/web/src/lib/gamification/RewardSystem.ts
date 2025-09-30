import type {
  EarnedReward,
  RewardType,
  DiscountReward,
  RewardItem,
  GamificationProfile
} from '@/types/gamification';

export class RewardSystem {
  private userRewards: Map<string, EarnedReward[]>;
  private discountCodes: Map<string, DiscountReward>;
  private rewardCatalog: Map<string, RewardItem>;

  constructor() {
    this.userRewards = new Map();
    this.discountCodes = new Map();
    this.rewardCatalog = new Map();
    this.initializeRewardCatalog();
  }

  // Reward Management
  async awardReward(userId: string, reward: EarnedReward): Promise<void> {
    const userRewards = this.getUserRewards(userId);
    userRewards.push(reward);
    this.userRewards.set(userId, userRewards);

    // Process specific reward types
    switch (reward.type) {
      case 'discount':
        await this.generateDiscountCode(userId, reward);
        break;
      case 'free_item':
        await this.processFreeSampleReward(userId, reward);
        break;
      case 'exclusive_content':
        await this.unlockExclusiveContent(userId, reward);
        break;
    }

    console.log(`Reward awarded to user ${userId}: ${reward.title} (${reward.type})`);
  }

  async claimReward(userId: string, rewardId: string): Promise<{
    success: boolean;
    claimedReward?: EarnedReward;
    discountCode?: string;
    error?: string;
  }> {
    const userRewards = this.getUserRewards(userId);
    const rewardIndex = userRewards.findIndex(r => r.id === rewardId);

    if (rewardIndex === -1) {
      return { success: false, error: 'Reward not found' };
    }

    const reward = userRewards[rewardIndex];

    if (reward.status !== 'pending') {
      return { success: false, error: 'Reward already claimed or expired' };
    }

    // Check expiration
    if (reward.expiresAt && reward.expiresAt < new Date()) {
      reward.status = 'expired';
      userRewards[rewardIndex] = reward;
      this.userRewards.set(userId, userRewards);
      return { success: false, error: 'Reward has expired' };
    }

    // Claim the reward
    reward.status = 'claimed';
    reward.claimedAt = new Date();
    userRewards[rewardIndex] = reward;
    this.userRewards.set(userId, userRewards);

    let discountCode: string | undefined;

    // Process reward based on type
    switch (reward.type) {
      case 'discount':
        discountCode = await this.activateDiscountCode(userId, reward);
        break;
      case 'free_item':
        await this.processFreeSampleClaim(userId, reward);
        break;
      case 'exclusive_content':
        await this.activateExclusiveContent(userId, reward);
        break;
    }

    // Analytics tracking
    await this.trackRewardClaim(userId, reward);

    console.log(`Reward claimed by user ${userId}: ${reward.title}`);

    return {
      success: true,
      claimedReward: reward,
      discountCode
    };
  }

  async getUserRewards(userId: string): EarnedReward[] {
    return this.userRewards.get(userId) || [];
  }

  async getPendingRewards(userId: string): Promise<EarnedReward[]> {
    const userRewards = this.getUserRewards(userId);
    return userRewards.filter(r => r.status === 'pending' && (!r.expiresAt || r.expiresAt > new Date()));
  }

  async getClaimedRewards(userId: string, limit: number = 50): Promise<EarnedReward[]> {
    const userRewards = this.getUserRewards(userId);
    return userRewards
      .filter(r => r.status === 'claimed')
      .sort((a, b) => (b.claimedAt?.getTime() || 0) - (a.claimedAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Discount Code Management
  private async generateDiscountCode(userId: string, reward: EarnedReward): Promise<string> {
    const code = this.generateUniqueDiscountCode(userId);

    const discount: DiscountReward = {
      id: this.generateDiscountId(),
      code,
      type: this.getDiscountType(reward.value),
      value: reward.value,
      minOrderValue: this.getMinOrderValue(reward.value),
      maxDiscount: this.getMaxDiscount(reward.value),
      validForCategories: this.getValidCategories(reward.sku),
      validForSkus: reward.sku ? [reward.sku] : undefined,
      expiresAt: reward.expiresAt || this.getDefaultDiscountExpiration()
    };

    this.discountCodes.set(code, discount);

    // Update reward with generated code
    reward.code = code;

    console.log(`Discount code generated: ${code} for user ${userId}`);
    return code;
  }

  private async activateDiscountCode(userId: string, reward: EarnedReward): Promise<string> {
    if (!reward.code) {
      throw new Error('No discount code associated with this reward');
    }

    const discount = this.discountCodes.get(reward.code);
    if (!discount) {
      throw new Error('Discount code not found');
    }

    // In production, integrate with e-commerce platform
    console.log(`Discount code activated: ${reward.code} for user ${userId}`);
    return reward.code;
  }

  async validateDiscountCode(code: string): Promise<{
    isValid: boolean;
    discount?: DiscountReward;
    error?: string;
  }> {
    const discount = this.discountCodes.get(code);

    if (!discount) {
      return { isValid: false, error: 'Discount code not found' };
    }

    if (discount.expiresAt < new Date()) {
      return { isValid: false, error: 'Discount code has expired' };
    }

    return { isValid: true, discount };
  }

  async applyDiscountToOrder(
    code: string,
    orderTotal: number,
    orderItems: Array<{ sku: string; category: string; price: number; quantity: number }>
  ): Promise<{
    discountApplied: number;
    finalTotal: number;
    discount?: DiscountReward;
    error?: string;
  }> {
    const validation = await this.validateDiscountCode(code);

    if (!validation.isValid) {
      return {
        discountApplied: 0,
        finalTotal: orderTotal,
        error: validation.error
      };
    }

    const discount = validation.discount!;

    // Check minimum order value
    if (discount.minOrderValue && orderTotal < discount.minOrderValue) {
      return {
        discountApplied: 0,
        finalTotal: orderTotal,
        error: `Minimum order value is €${discount.minOrderValue}`
      };
    }

    // Check category/SKU restrictions
    const eligibleItems = orderItems.filter(item => {
      if (discount.validForSkus && !discount.validForSkus.includes(item.sku)) {
        return false;
      }
      if (discount.validForCategories && !discount.validForCategories.includes(item.category)) {
        return false;
      }
      return true;
    });

    if (eligibleItems.length === 0) {
      return {
        discountApplied: 0,
        finalTotal: orderTotal,
        error: 'No eligible items for this discount'
      };
    }

    // Calculate discount
    let discountAmount = 0;
    const eligibleTotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    switch (discount.type) {
      case 'percentage':
        discountAmount = eligibleTotal * (discount.value / 100);
        if (discount.maxDiscount) {
          discountAmount = Math.min(discountAmount, discount.maxDiscount);
        }
        break;
      case 'fixed_amount':
        discountAmount = Math.min(discount.value, eligibleTotal);
        break;
      case 'free_shipping':
        discountAmount = this.calculateShippingCost(orderItems); // Mock implementation
        break;
    }

    const finalTotal = Math.max(0, orderTotal - discountAmount);

    return {
      discountApplied: discountAmount,
      finalTotal,
      discount
    };
  }

  async markDiscountAsUsed(code: string, orderId: string): Promise<void> {
    const discount = this.discountCodes.get(code);
    if (discount) {
      // In production, update database with usage info
      console.log(`Discount code ${code} used for order ${orderId}`);
    }
  }

  // Free Sample Management
  private async processFreeSampleReward(userId: string, reward: EarnedReward): Promise<void> {
    if (!reward.sku) {
      console.warn('Free sample reward missing SKU');
      return;
    }

    // In production, integrate with inventory/fulfillment system
    console.log(`Free sample processed for user ${userId}: ${reward.sku}`);
  }

  private async processFreeSampleClaim(userId: string, reward: EarnedReward): Promise<void> {
    if (!reward.sku) {
      throw new Error('Free sample reward missing SKU');
    }

    // In production, create fulfillment request
    const fulfillmentRequest = {
      userId,
      items: [{
        sku: reward.sku,
        quantity: 1,
        price: 0
      }],
      shippingRequired: true,
      source: 'gamification_reward',
      rewardId: reward.id
    };

    console.log(`Free sample fulfillment requested:`, fulfillmentRequest);
  }

  // Exclusive Content Management
  private async unlockExclusiveContent(userId: string, reward: EarnedReward): Promise<void> {
    const contentId = reward.sku || `content_${reward.id}`;

    // In production, update user permissions in content management system
    console.log(`Exclusive content unlocked for user ${userId}: ${contentId}`);
  }

  private async activateExclusiveContent(userId: string, reward: EarnedReward): Promise<void> {
    const contentId = reward.sku || `content_${reward.id}`;

    // In production, send notification and update UI permissions
    console.log(`Exclusive content activated for user ${userId}: ${contentId}`);
  }

  // Reward Catalog Management
  async getAvailableRewards(
    userProfile: GamificationProfile,
    category?: string
  ): Promise<RewardItem[]> {
    const rewards = Array.from(this.rewardCatalog.values());

    return rewards.filter(reward => {
      // Filter by category if specified
      if (category && !reward.description.toLowerCase().includes(category.toLowerCase())) {
        return false;
      }

      // Check if user meets conditions
      if (reward.conditions) {
        return this.checkRewardConditions(reward.conditions, userProfile);
      }

      return true;
    });
  }

  private checkRewardConditions(conditions: string[], userProfile: GamificationProfile): boolean {
    return conditions.every(condition => {
      switch (condition) {
        case 'min_level_5':
          return userProfile.currentLevel >= 5;
        case 'min_level_10':
          return userProfile.currentLevel >= 10;
        case 'streak_7_days':
          return userProfile.streakDays >= 7;
        case 'missions_completed_10':
          return userProfile.totalMissionsCompleted >= 10;
        default:
          return true;
      }
    });
  }

  // Analytics and Reporting
  private async trackRewardClaim(userId: string, reward: EarnedReward): Promise<void> {
    const eventData = {
      userId,
      rewardId: reward.id,
      rewardType: reward.type,
      rewardValue: reward.value,
      sourceType: reward.sourceType,
      sourceId: reward.sourceId,
      claimedAt: new Date()
    };

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'reward_claimed', {
        reward_type: reward.type,
        reward_value: reward.value,
        source_type: reward.sourceType,
        custom_parameters: eventData
      });
    }

    console.log('Reward claim tracked:', eventData);
  }

  async getRewardAnalytics(period: { start: Date; end: Date }): Promise<{
    totalRewardsAwarded: number;
    totalRewardsClaimed: number;
    totalRewardsExpired: number;
    claimRate: number;
    rewardsByType: Record<RewardType, number>;
    totalValueClaimed: number;
    discountCodesGenerated: number;
    discountCodesUsed: number;
    freeSamplesAwarded: number;
    exclusiveContentUnlocked: number;
  }> {
    // In production, query analytics database
    // Mock implementation for development
    return {
      totalRewardsAwarded: 1250,
      totalRewardsClaimed: 987,
      totalRewardsExpired: 45,
      claimRate: 0.79, // 79%
      rewardsByType: {
        xp: 650,
        badge: 200,
        discount: 300,
        free_item: 75,
        exclusive_content: 25
      },
      totalValueClaimed: 15750.50,
      discountCodesGenerated: 300,
      discountCodesUsed: 234,
      freeSamplesAwarded: 75,
      exclusiveContentUnlocked: 25
    };
  }

  // Utility methods
  private initializeRewardCatalog(): void {
    // Discount rewards
    this.rewardCatalog.set('discount_10', {
      type: 'discount',
      title: '10% di sconto',
      description: 'Sconto del 10% su tutti i prodotti',
      value: 10,
      quantity: 1,
      conditions: ['min_level_5']
    });

    this.rewardCatalog.set('discount_20', {
      type: 'discount',
      title: '20% di sconto',
      description: 'Sconto del 20% su tutti i prodotti',
      value: 20,
      quantity: 1,
      conditions: ['min_level_10', 'streak_7_days']
    });

    // Free sample rewards
    this.rewardCatalog.set('free_sample_treats', {
      type: 'free_item',
      sku: 'SAMPLE_TREATS_001',
      title: 'Snack Gratuiti',
      description: 'Campione gratuito di snack per cani',
      value: 5.99,
      quantity: 1,
      conditions: ['missions_completed_10']
    });

    this.rewardCatalog.set('free_sample_toy', {
      type: 'free_item',
      sku: 'SAMPLE_TOY_001',
      title: 'Giocattolo Omaggio',
      description: 'Piccolo giocattolo omaggio per il tuo cane',
      value: 8.99,
      quantity: 1,
      conditions: ['streak_7_days']
    });

    // Exclusive content
    this.rewardCatalog.set('premium_training', {
      type: 'exclusive_content',
      sku: 'CONTENT_TRAINING_PREMIUM',
      title: 'Accesso Premium Training',
      description: 'Accesso a video di addestramento esclusivi',
      value: 0,
      quantity: 1,
      conditions: ['min_level_10']
    });

    console.log('Reward catalog initialized');
  }

  private generateUniqueDiscountCode(userId: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const userHash = userId.slice(-4);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PC${userHash}${timestamp}${random}`;
  }

  private generateDiscountId(): string {
    return `discount_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDiscountType(value: number): 'percentage' | 'fixed_amount' | 'free_shipping' {
    if (value <= 100) return 'percentage';
    return 'fixed_amount';
  }

  private getMinOrderValue(discountValue: number): number {
    // Minimum order value based on discount
    if (discountValue >= 20) return 50; // €50 minimum for 20%+ discounts
    if (discountValue >= 10) return 25; // €25 minimum for 10%+ discounts
    return 0;
  }

  private getMaxDiscount(discountValue: number): number {
    // Maximum discount cap for percentage discounts
    if (discountValue >= 20) return 100; // €100 max for 20%+ discounts
    if (discountValue >= 10) return 50;  // €50 max for 10%+ discounts
    return 25; // €25 max for smaller discounts
  }

  private getValidCategories(sku?: string): string[] | undefined {
    // Determine valid categories based on SKU or return undefined for all categories
    if (!sku) return undefined;

    if (sku.includes('HEALTH')) return ['health', 'supplements'];
    if (sku.includes('TREAT')) return ['treats', 'food'];
    if (sku.includes('TOY')) return ['toys', 'accessories'];
    if (sku.includes('GROOMING')) return ['grooming', 'hygiene'];

    return undefined; // Valid for all categories
  }

  private getDefaultDiscountExpiration(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30); // 30 days from now
    return expiration;
  }

  private calculateShippingCost(orderItems: Array<{ sku: string; price: number; quantity: number }>): number {
    // Mock shipping cost calculation
    const totalWeight = orderItems.length * 0.5; // Assume 0.5kg per item
    if (totalWeight <= 2) return 4.99;
    if (totalWeight <= 5) return 7.99;
    return 12.99;
  }
}