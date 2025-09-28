import { Lot, AllocatedLot, StockReservation, Product } from './types';

export class FEFOEngine {
  private lots: Map<string, Lot> = new Map();
  private products: Map<string, Product> = new Map();

  constructor() {}

  // FEFO (First Expired, First Out) allocation engine
  async allocateStock(
    productId: string,
    requestedQuantity: number,
    reservationDetails: {
      orderId: string;
      orderItemId: string;
      warehouseId: string;
      maxExpiryDate?: Date;
      preferredLocations?: string[];
    }
  ): Promise<{ success: boolean; allocation?: AllocatedLot[]; shortfall?: number; error?: string }> {
    try {
      const product = this.products.get(productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // Get available lots for this product
      const availableLots = this.getAvailableLots(productId, reservationDetails.warehouseId);

      if (availableLots.length === 0) {
        return { success: false, shortfall: requestedQuantity, error: 'No available stock' };
      }

      // Filter by expiry date if specified
      let eligibleLots = availableLots;
      if (reservationDetails.maxExpiryDate) {
        eligibleLots = availableLots.filter(lot =>
          !lot.expiryDate || lot.expiryDate <= reservationDetails.maxExpiryDate!
        );
      }

      // Sort lots by FEFO score (calculated considering expiry, age, location preference)
      const sortedLots = this.sortLotsByFEFO(eligibleLots, {
        preferredLocations: reservationDetails.preferredLocations,
        isPerishable: product.perishable
      });

      // Allocate stock following FEFO principle
      const allocation: AllocatedLot[] = [];
      let remainingQuantity = requestedQuantity;

      for (const lot of sortedLots) {
        if (remainingQuantity <= 0) break;

        const availableInLot = lot.availableQuantity;
        if (availableInLot <= 0) continue;

        const allocateFromLot = Math.min(remainingQuantity, availableInLot);

        allocation.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          quantity: allocateFromLot,
          location: this.formatLocation(lot.location),
          fefoScore: lot.fefoScore
        });

        // Reserve the quantity in the lot
        lot.reservedQuantity += allocateFromLot;
        lot.availableQuantity = lot.currentQuantity - lot.reservedQuantity;

        remainingQuantity -= allocateFromLot;
      }

      const shortfall = remainingQuantity > 0 ? remainingQuantity : undefined;

      return {
        success: allocation.length > 0,
        allocation,
        shortfall
      };

    } catch (error) {
      console.error('Error in FEFO allocation:', error);
      return { success: false, error: 'Allocation failed' };
    }
  }

  private getAvailableLots(productId: string, warehouseId: string): Lot[] {
    return Array.from(this.lots.values()).filter(lot =>
      lot.productId === productId &&
      lot.location.warehouseId === warehouseId &&
      lot.status === 'active' &&
      lot.availableQuantity > 0 &&
      lot.qualityCheck.passed &&
      (!lot.expiryDate || lot.expiryDate > new Date())
    );
  }

  private sortLotsByFEFO(
    lots: Lot[],
    options: {
      preferredLocations?: string[];
      isPerishable: boolean;
    }
  ): Lot[] {
    return lots
      .map(lot => ({
        ...lot,
        fefoScore: this.calculateFEFOScore(lot, options)
      }))
      .sort((a, b) => b.fefoScore - a.fefoScore); // Higher score = higher priority
  }

  private calculateFEFOScore(
    lot: Lot,
    options: {
      preferredLocations?: string[];
      isPerishable: boolean;
    }
  ): number {
    let score = 0;

    // 1. Expiry date priority (most important for perishables)
    if (lot.expiryDate && options.isPerishable) {
      const daysToExpiry = Math.max(0,
        (lot.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysToExpiry <= 0) {
        score -= 10000; // Expired - should not be picked
      } else if (daysToExpiry <= 7) {
        score += 1000; // High priority - expires soon
      } else if (daysToExpiry <= 30) {
        score += 500; // Medium priority
      } else {
        score += 100; // Lower priority for items expiring later
      }
    }

    // 2. Age priority (for non-perishables, prefer older stock)
    const ageInDays = (Date.now() - lot.receivedDate.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.min(ageInDays * 2, 200); // Cap age bonus at 200 points

    // 3. Location preference
    if (options.preferredLocations) {
      const locationString = this.formatLocation(lot.location);
      if (options.preferredLocations.includes(locationString)) {
        score += 300; // Prefer accessible locations
      }
    }

    // 4. Picking zone optimization (prefer picking zones over storage)
    if (lot.location.zone === 'picking') {
      score += 150;
    } else if (lot.location.zone === 'storage') {
      score += 50;
    }

    // 5. Quantity optimization (prefer lots that can fulfill more of the order)
    if (lot.availableQuantity >= 100) {
      score += 100; // Prefer larger lots to minimize picking operations
    } else if (lot.availableQuantity >= 50) {
      score += 50;
    }

    // 6. Quality and condition
    if (lot.qualityCheck.passed) {
      score += 25;
    }

    // 7. LIFO penalty for very new stock (encourage FEFO)
    if (ageInDays < 1 && !options.isPerishable) {
      score -= 50; // Slight penalty for very new stock
    }

    lot.fefoScore = score;
    return score;
  }

  private formatLocation(location: any): string {
    return `${location.zone}-${location.aisle}-${location.shelf}-${location.bin}`;
  }

  // Release reservation when order is cancelled or changed
  async releaseReservation(reservation: StockReservation): Promise<void> {
    for (const allocatedLot of reservation.allocatedLots) {
      const lot = this.lots.get(allocatedLot.lotId);
      if (lot) {
        lot.reservedQuantity = Math.max(0, lot.reservedQuantity - allocatedLot.quantity);
        lot.availableQuantity = lot.currentQuantity - lot.reservedQuantity;
      }
    }
  }

  // Fulfill reservation when stock is picked
  async fulfillReservation(
    reservation: StockReservation,
    pickedQuantities: { lotId: string; quantity: number }[]
  ): Promise<void> {
    for (const picked of pickedQuantities) {
      const lot = this.lots.get(picked.lotId);
      if (lot) {
        // Reduce current quantity (actual pick)
        lot.currentQuantity = Math.max(0, lot.currentQuantity - picked.quantity);

        // Reduce reserved quantity
        const allocatedLot = reservation.allocatedLots.find(a => a.lotId === picked.lotId);
        if (allocatedLot) {
          lot.reservedQuantity = Math.max(0, lot.reservedQuantity - allocatedLot.quantity);
        }

        // Recalculate available quantity
        lot.availableQuantity = lot.currentQuantity - lot.reservedQuantity;
      }
    }
  }

  // Check for lots approaching expiry
  async getExpiringLots(warehouseId: string, daysThreshold: number = 30): Promise<Lot[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return Array.from(this.lots.values()).filter(lot =>
      lot.location.warehouseId === warehouseId &&
      lot.status === 'active' &&
      lot.currentQuantity > 0 &&
      lot.expiryDate &&
      lot.expiryDate <= thresholdDate
    ).sort((a, b) => {
      if (!a.expiryDate || !b.expiryDate) return 0;
      return a.expiryDate.getTime() - b.expiryDate.getTime();
    });
  }

  // Get lots that should be moved to picking locations
  async getReplenishmentCandidates(warehouseId: string): Promise<{
    productId: string;
    sku: string;
    pickingQuantity: number;
    storageQuantity: number;
    recommendedLots: Lot[];
  }[]> {
    const candidates: Map<string, {
      productId: string;
      sku: string;
      pickingQuantity: number;
      storageQuantity: number;
      lots: Lot[];
    }> = new Map();

    // Group lots by product
    for (const lot of this.lots.values()) {
      if (lot.location.warehouseId !== warehouseId || lot.status !== 'active') continue;

      if (!candidates.has(lot.productId)) {
        candidates.set(lot.productId, {
          productId: lot.productId,
          sku: this.products.get(lot.productId)?.sku || '',
          pickingQuantity: 0,
          storageQuantity: 0,
          lots: []
        });
      }

      const candidate = candidates.get(lot.productId)!;
      candidate.lots.push(lot);

      if (lot.location.zone === 'picking') {
        candidate.pickingQuantity += lot.currentQuantity;
      } else if (lot.location.zone === 'storage') {
        candidate.storageQuantity += lot.currentQuantity;
      }
    }

    // Filter products that need replenishment
    const replenishmentNeeded = Array.from(candidates.values())
      .filter(candidate => {
        // Replenish if picking location has less than 20% of total stock
        const totalStock = candidate.pickingQuantity + candidate.storageQuantity;
        return totalStock > 0 &&
               candidate.pickingQuantity < (totalStock * 0.2) &&
               candidate.storageQuantity > 0;
      })
      .map(candidate => {
        // Sort lots by FEFO for replenishment recommendation
        const product = this.products.get(candidate.productId);
        const sortedLots = this.sortLotsByFEFO(
          candidate.lots.filter(lot => lot.location.zone === 'storage'),
          { isPerishable: product?.perishable || false }
        );

        return {
          productId: candidate.productId,
          sku: candidate.sku,
          pickingQuantity: candidate.pickingQuantity,
          storageQuantity: candidate.storageQuantity,
          recommendedLots: sortedLots.slice(0, 3) // Top 3 lots for replenishment
        };
      });

    return replenishmentNeeded;
  }

  // Optimize lot consolidation
  async getConsolidationOpportunities(warehouseId: string): Promise<{
    productId: string;
    sku: string;
    fragmentedLots: Lot[];
    recommendedTargetLocation: string;
    totalQuantity: number;
  }[]> {
    const productLots: Map<string, Lot[]> = new Map();

    // Group lots by product
    for (const lot of this.lots.values()) {
      if (lot.location.warehouseId !== warehouseId ||
          lot.status !== 'active' ||
          lot.currentQuantity === 0) continue;

      if (!productLots.has(lot.productId)) {
        productLots.set(lot.productId, []);
      }
      productLots.get(lot.productId)!.push(lot);
    }

    const consolidationOpportunities = [];

    for (const [productId, lots] of productLots.entries()) {
      if (lots.length < 3) continue; // Only consider products with 3+ lots

      // Find small lots that could be consolidated
      const smallLots = lots.filter(lot => lot.currentQuantity < 50);

      if (smallLots.length >= 2) {
        const totalQuantity = smallLots.reduce((sum, lot) => sum + lot.currentQuantity, 0);

        // Find the best location (zone with most stock for this product)
        const locationCounts = new Map<string, number>();
        lots.forEach(lot => {
          const location = `${lot.location.zone}-${lot.location.aisle}`;
          locationCounts.set(location, (locationCounts.get(location) || 0) + lot.currentQuantity);
        });

        const bestLocation = Array.from(locationCounts.entries())
          .sort((a, b) => b[1] - a[1])[0][0];

        consolidationOpportunities.push({
          productId,
          sku: this.products.get(productId)?.sku || '',
          fragmentedLots: smallLots,
          recommendedTargetLocation: bestLocation,
          totalQuantity
        });
      }
    }

    return consolidationOpportunities;
  }

  // Manage lot lifecycle
  async updateLotStatus(lotId: string, newStatus: Lot['status'], reason?: string): Promise<boolean> {
    const lot = this.lots.get(lotId);
    if (!lot) return false;

    const oldStatus = lot.status;
    lot.status = newStatus;
    lot.updatedAt = new Date();

    // Handle status-specific logic
    switch (newStatus) {
      case 'quarantine':
        // Remove from available inventory
        lot.availableQuantity = 0;
        break;

      case 'recalled':
        // Remove from available inventory and release reservations
        lot.availableQuantity = 0;
        lot.reservedQuantity = 0;
        break;

      case 'expired':
        // Mark as unavailable
        lot.availableQuantity = 0;
        lot.reservedQuantity = 0;
        break;

      case 'depleted':
        // Mark as empty
        lot.currentQuantity = 0;
        lot.availableQuantity = 0;
        lot.reservedQuantity = 0;
        break;

      case 'active':
        // Restore to available inventory if coming from quarantine
        if (oldStatus === 'quarantine') {
          lot.availableQuantity = lot.currentQuantity - lot.reservedQuantity;
        }
        break;
    }

    console.log(`Lot ${lot.lotNumber} status changed from ${oldStatus} to ${newStatus}${reason ? ` - ${reason}` : ''}`);
    return true;
  }

  // Automatic expiry management
  async processExpiryChecks(): Promise<void> {
    const today = new Date();
    const warningThreshold = new Date();
    warningThreshold.setDate(today.getDate() + 7); // 7 days warning

    for (const lot of this.lots.values()) {
      if (!lot.expiryDate || lot.status !== 'active') continue;

      if (lot.expiryDate <= today) {
        // Mark as expired
        await this.updateLotStatus(lot.id, 'expired', 'Automatic expiry check');
      } else if (lot.expiryDate <= warningThreshold) {
        // Create expiry warning (would trigger alert in real system)
        console.log(`Expiry warning: Lot ${lot.lotNumber} expires on ${lot.expiryDate.toISOString().split('T')[0]}`);
      }
    }
  }

  // Add lot to inventory
  addLot(lot: Lot): void {
    this.lots.set(lot.id, lot);
  }

  // Add product
  addProduct(product: Product): void {
    this.products.set(product.id, product);
  }

  // Get lot by ID
  getLot(lotId: string): Lot | undefined {
    return this.lots.get(lotId);
  }

  // Get all lots for a product
  getProductLots(productId: string): Lot[] {
    return Array.from(this.lots.values()).filter(lot => lot.productId === productId);
  }

  // Get inventory summary for a product
  getProductInventory(productId: string, warehouseId?: string): {
    totalQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    lotCount: number;
    oldestLot?: Lot;
    newestLot?: Lot;
  } {
    const lots = Array.from(this.lots.values()).filter(lot => {
      return lot.productId === productId &&
             lot.status === 'active' &&
             (!warehouseId || lot.location.warehouseId === warehouseId);
    });

    const summary = {
      totalQuantity: lots.reduce((sum, lot) => sum + lot.currentQuantity, 0),
      availableQuantity: lots.reduce((sum, lot) => sum + lot.availableQuantity, 0),
      reservedQuantity: lots.reduce((sum, lot) => sum + lot.reservedQuantity, 0),
      lotCount: lots.length,
      oldestLot: undefined as Lot | undefined,
      newestLot: undefined as Lot | undefined
    };

    if (lots.length > 0) {
      const sortedByDate = lots.sort((a, b) => a.receivedDate.getTime() - b.receivedDate.getTime());
      summary.oldestLot = sortedByDate[0];
      summary.newestLot = sortedByDate[sortedByDate.length - 1];
    }

    return summary;
  }
}