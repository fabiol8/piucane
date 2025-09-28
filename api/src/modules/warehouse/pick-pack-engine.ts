import {
  PickList,
  PickListItem,
  PickRoute,
  PackList,
  Package,
  PackedItem,
  PickedLot,
  Warehouse,
  Lot,
  Product,
  StockReservation
} from './types';
import { FEFOEngine } from './fefo-engine';

export class PickPackEngine {
  private pickLists: Map<string, PickList> = new Map();
  private packLists: Map<string, PackList> = new Map();
  private warehouses: Map<string, Warehouse> = new Map();
  private fefoEngine: FEFOEngine;

  constructor(fefoEngine: FEFOEngine) {
    this.fefoEngine = fefoEngine;
  }

  // ======= PICKING ENGINE =======

  async createPickList(
    orderItems: Array<{
      orderItemId: string;
      orderId: string;
      productId: string;
      quantity: number;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }>,
    warehouseId: string,
    pickType: 'single' | 'batch' | 'wave' = 'batch',
    options: {
      maxItems?: number;
      maxOrders?: number;
      cutoffTime?: Date;
      priorityFilter?: ('low' | 'medium' | 'high' | 'urgent')[];
    } = {}
  ): Promise<{ success: boolean; pickList?: PickList; errors?: string[] }> {
    try {
      const warehouse = this.warehouses.get(warehouseId);
      if (!warehouse) {
        return { success: false, errors: ['Warehouse not found'] };
      }

      const errors: string[] = [];
      const pickListItems: PickListItem[] = [];
      const orderIds = Array.from(new Set(orderItems.map(item => item.orderId)));

      // Filter by priority if specified
      let filteredItems = orderItems;
      if (options.priorityFilter) {
        filteredItems = orderItems.filter(item => options.priorityFilter!.includes(item.priority));
      }

      // Apply limits
      if (options.maxItems && filteredItems.length > options.maxItems) {
        filteredItems = filteredItems.slice(0, options.maxItems);
      }

      if (options.maxOrders) {
        const limitedOrderIds = Array.from(new Set(filteredItems.map(item => item.orderId))).slice(0, options.maxOrders);
        filteredItems = filteredItems.filter(item => limitedOrderIds.includes(item.orderId));
      }

      // Create pick list items and allocate stock
      for (const orderItem of filteredItems) {
        const allocation = await this.fefoEngine.allocateStock(
          orderItem.productId,
          orderItem.quantity,
          {
            orderId: orderItem.orderId,
            orderItemId: orderItem.orderItemId,
            warehouseId
          }
        );

        if (!allocation.success || !allocation.allocation) {
          errors.push(`Could not allocate stock for order item ${orderItem.orderItemId}: ${allocation.error}`);
          continue;
        }

        // Determine pick location (use first allocated lot's location)
        const primaryLocation = allocation.allocation[0]?.location || 'UNKNOWN';

        const pickListItem: PickListItem = {
          id: `pli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderItemId: orderItem.orderItemId,
          productId: orderItem.productId,
          sku: '', // Would be populated from product data
          productName: '', // Would be populated from product data
          requestedQuantity: orderItem.quantity,
          pickedQuantity: 0,
          shortQuantity: allocation.shortfall || 0,
          pickedLots: [],
          location: primaryLocation,
          pickSequence: pickListItems.length + 1,
          status: 'pending'
        };

        pickListItems.push(pickListItem);
      }

      if (pickListItems.length === 0) {
        return { success: false, errors: ['No pickable items found'] };
      }

      // Optimize pick route
      const route = await this.optimizePickRoute(pickListItems, warehouseId);

      // Update pick sequence based on optimized route
      this.updatePickSequence(pickListItems, route);

      // Calculate estimated time
      const estimatedTime = this.calculateEstimatedPickTime(pickListItems, route);

      // Determine overall priority
      const maxPriority = this.getMaxPriority(orderItems.map(item => item.priority));

      const pickList: PickList = {
        id: `pl_${Date.now()}`,
        orderIds,
        warehouseId,
        status: 'pending',
        priority: maxPriority,
        pickType,
        items: pickListItems,
        route,
        estimatedTime,
        notes: errors.length > 0 ? `Warnings: ${errors.join('; ')}` : undefined,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.pickLists.set(pickList.id, pickList);

      return {
        success: true,
        pickList,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Error creating pick list:', error);
      return { success: false, errors: ['Failed to create pick list'] };
    }
  }

  private async optimizePickRoute(items: PickListItem[], warehouseId: string): Promise<PickRoute> {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse) {
      return {
        zones: [],
        aisles: [],
        estimatedDistance: 0,
        estimatedTime: 0,
        optimized: false,
        algorithm: 'manual'
      };
    }

    // Extract unique locations from items
    const locations = Array.from(new Set(items.map(item => item.location)));

    // Parse locations and group by zone/aisle
    const locationMap = new Map<string, { zone: string; aisle: string; items: PickListItem[] }>();

    items.forEach(item => {
      const [zone, aisle, shelf, bin] = item.location.split('-');
      const key = `${zone}-${aisle}`;

      if (!locationMap.has(key)) {
        locationMap.set(key, {
          zone: zone || 'unknown',
          aisle: aisle || 'unknown',
          items: []
        });
      }

      locationMap.get(key)!.items.push(item);
    });

    // Sort by zone priority and then by aisle
    const sortedLocations = Array.from(locationMap.values()).sort((a, b) => {
      // Zone priority: picking > storage > others
      const zonePriority = (zone: string) => {
        switch (zone) {
          case 'picking': return 3;
          case 'storage': return 2;
          default: return 1;
        }
      };

      const aPriority = zonePriority(a.zone);
      const bPriority = zonePriority(b.zone);

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Within same zone, sort by aisle
      return a.aisle.localeCompare(b.aisle);
    });

    const zones = Array.from(new Set(sortedLocations.map(loc => loc.zone)));
    const aisles = sortedLocations.map(loc => `${loc.zone}-${loc.aisle}`);

    // Estimate distance (simplified calculation)
    const estimatedDistance = aisles.length * 50; // 50m per aisle change
    const estimatedTime = Math.max(items.length * 2, 15); // 2 min per item, minimum 15 min

    return {
      zones,
      aisles,
      estimatedDistance,
      estimatedTime,
      optimized: true,
      algorithm: 'zone_based'
    };
  }

  private updatePickSequence(items: PickListItem[], route: PickRoute): void {
    // Sort items by route order
    items.sort((a, b) => {
      const aIndex = route.aisles.findIndex(aisle => a.location.startsWith(aisle));
      const bIndex = route.aisles.findIndex(aisle => b.location.startsWith(aisle));

      if (aIndex === bIndex) {
        // Same aisle, sort by shelf/bin
        return a.location.localeCompare(b.location);
      }

      return aIndex - bIndex;
    });

    // Update sequence numbers
    items.forEach((item, index) => {
      item.pickSequence = index + 1;
    });
  }

  private calculateEstimatedPickTime(items: PickListItem[], route: PickRoute): number {
    const baseTimePerItem = 2; // 2 minutes per item
    const travelTime = route.estimatedTime || 0;
    const setupTime = 10; // 10 minutes setup

    return setupTime + (items.length * baseTimePerItem) + travelTime;
  }

  private getMaxPriority(priorities: ('low' | 'medium' | 'high' | 'urgent')[]): 'low' | 'medium' | 'high' | 'urgent' {
    if (priorities.includes('urgent')) return 'urgent';
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }

  async assignPickList(pickListId: string, userId: string): Promise<boolean> {
    const pickList = this.pickLists.get(pickListId);
    if (!pickList || pickList.status !== 'pending') {
      return false;
    }

    pickList.assignedTo = userId;
    pickList.assignedAt = new Date();
    pickList.updatedAt = new Date();

    return true;
  }

  async startPicking(pickListId: string, userId: string): Promise<boolean> {
    const pickList = this.pickLists.get(pickListId);
    if (!pickList || pickList.assignedTo !== userId || pickList.status !== 'pending') {
      return false;
    }

    pickList.status = 'in_progress';
    pickList.startedAt = new Date();
    pickList.updatedAt = new Date();

    return true;
  }

  async recordPick(
    pickListId: string,
    itemId: string,
    pickedLots: Array<{
      lotId: string;
      lotNumber: string;
      quantity: number;
      expiryDate?: Date;
    }>,
    pickedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const pickList = this.pickLists.get(pickListId);
    if (!pickList) {
      return { success: false, error: 'Pick list not found' };
    }

    const item = pickList.items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Pick list item not found' };
    }

    const totalPickedQuantity = pickedLots.reduce((sum, lot) => sum + lot.quantity, 0);

    // Update item with picked information
    item.pickedQuantity = totalPickedQuantity;
    item.shortQuantity = Math.max(0, item.requestedQuantity - totalPickedQuantity);
    item.pickedLots = pickedLots.map(lot => ({
      ...lot,
      pickedAt: new Date(),
      pickedBy
    }));
    item.status = totalPickedQuantity >= item.requestedQuantity ? 'picked' :
                 totalPickedQuantity > 0 ? 'short' : 'pending';

    // Fulfill stock reservation
    // (In real system, this would interact with inventory management)

    pickList.updatedAt = new Date();

    return { success: true };
  }

  async completePickList(pickListId: string): Promise<{ success: boolean; packListId?: string; error?: string }> {
    const pickList = this.pickLists.get(pickListId);
    if (!pickList || pickList.status !== 'in_progress') {
      return { success: false, error: 'Pick list not found or not in progress' };
    }

    // Check if all items are picked
    const unPickedItems = pickList.items.filter(item => item.status === 'pending');
    if (unPickedItems.length > 0) {
      return { success: false, error: 'Not all items have been picked' };
    }

    pickList.status = 'completed';
    pickList.completedAt = new Date();
    pickList.actualTime = pickList.startedAt ?
      Math.round((Date.now() - pickList.startedAt.getTime()) / (1000 * 60)) : undefined;
    pickList.updatedAt = new Date();

    // Create pack list
    const packListResult = await this.createPackList(pickListId);

    return {
      success: true,
      packListId: packListResult.packList?.id,
      error: packListResult.success ? undefined : 'Pick completed but pack list creation failed'
    };
  }

  // ======= PACKING ENGINE =======

  async createPackList(pickListId: string): Promise<{ success: boolean; packList?: PackList; error?: string }> {
    const pickList = this.pickLists.get(pickListId);
    if (!pickList || pickList.status !== 'completed') {
      return { success: false, error: 'Pick list not found or not completed' };
    }

    try {
      // Group items by order for packaging decisions
      const orderGroups = new Map<string, PickListItem[]>();
      pickList.items.forEach(item => {
        const orderId = pickList.orderIds.find(id =>
          // In real system, would properly link order item to order
          true // Simplified for now
        ) || 'unknown';

        if (!orderGroups.has(orderId)) {
          orderGroups.set(orderId, []);
        }
        orderGroups.get(orderId)!.push(item);
      });

      // Determine pack type
      const packType = orderGroups.size === 1 ? 'single' : 'multi';

      // Create packages
      const packages = await this.createPackages(orderGroups, packType);

      // Calculate totals
      const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
      const totalVolume = packages.reduce((sum, pkg) =>
        sum + (pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height), 0);

      // Estimate packing time
      const estimatedTime = Math.max(packages.length * 10, 15); // 10 min per package, min 15

      const packList: PackList = {
        id: `pack_${Date.now()}`,
        pickListId,
        orderIds: pickList.orderIds,
        status: 'pending',
        packType,
        packages,
        totalWeight,
        totalVolume,
        shippingMethod: 'standard', // Would be determined from order data
        trackingNumbers: [],
        estimatedTime,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.packLists.set(packList.id, packList);

      return { success: true, packList };

    } catch (error) {
      console.error('Error creating pack list:', error);
      return { success: false, error: 'Failed to create pack list' };
    }
  }

  private async createPackages(
    orderGroups: Map<string, PickListItem[]>,
    packType: 'single' | 'multi' | 'split'
  ): Promise<Package[]> {
    const packages: Package[] = [];

    for (const [orderId, items] of orderGroups.entries()) {
      // Simple packaging logic - one package per order
      const packageItems: PackedItem[] = items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        quantity: item.pickedQuantity,
        lots: item.pickedLots,
        value: 0 // Would calculate from product price
      }));

      // Calculate package dimensions and weight (simplified)
      const estimatedWeight = items.length * 0.5; // 0.5kg per item estimate
      const dimensions = this.calculatePackageDimensions(packageItems);

      // Check for special handling requirements
      const hasPerishable = items.some(item =>
        item.pickedLots.some(lot => lot.expiryDate && lot.expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      );

      const packageObj: Package = {
        id: `pkg_${Date.now()}_${packages.length}`,
        packageNumber: `PKG-${Date.now()}-${packages.length + 1}`,
        orderIds: [orderId],
        items: packageItems,
        packageType: 'box', // Default package type
        dimensions,
        weight: estimatedWeight,
        contents: `Pet products - ${items.length} items`,
        value: packageItems.reduce((sum, item) => sum + item.value, 0),
        insurance: false,
        fragile: false,
        perishable: hasPerishable,
        specialInstructions: hasPerishable ? 'Keep refrigerated' : undefined
      };

      packages.push(packageObj);
    }

    return packages;
  }

  private calculatePackageDimensions(items: PackedItem[]): { length: number; width: number; height: number } {
    // Simplified calculation - would use proper 3D bin packing in real system
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    if (itemCount <= 3) {
      return { length: 30, width: 20, height: 15 }; // Small box
    } else if (itemCount <= 8) {
      return { length: 40, width: 30, height: 20 }; // Medium box
    } else {
      return { length: 50, width: 40, height: 30 }; // Large box
    }
  }

  async assignPackList(packListId: string, userId: string): Promise<boolean> {
    const packList = this.packLists.get(packListId);
    if (!packList || packList.status !== 'pending') {
      return false;
    }

    packList.assignedTo = userId;
    packList.assignedAt = new Date();
    packList.updatedAt = new Date();

    return true;
  }

  async startPacking(packListId: string, userId: string): Promise<boolean> {
    const packList = this.packLists.get(packListId);
    if (!packList || packList.assignedTo !== userId || packList.status !== 'pending') {
      return false;
    }

    packList.status = 'in_progress';
    packList.startedAt = new Date();
    packList.updatedAt = new Date();

    return true;
  }

  async recordPackage(
    packListId: string,
    packageId: string,
    details: {
      actualWeight?: number;
      actualDimensions?: { length: number; width: number; height: number };
      trackingNumber?: string;
      shippingLabelUrl?: string;
      specialInstructions?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const packList = this.packLists.get(packListId);
    if (!packList) {
      return { success: false, error: 'Pack list not found' };
    }

    const packageObj = packList.packages.find(pkg => pkg.id === packageId);
    if (!packageObj) {
      return { success: false, error: 'Package not found' };
    }

    // Update package with actual details
    if (details.actualWeight) packageObj.weight = details.actualWeight;
    if (details.actualDimensions) packageObj.dimensions = details.actualDimensions;
    if (details.trackingNumber) packageObj.trackingNumber = details.trackingNumber;
    if (details.shippingLabelUrl) packageObj.shippingLabelUrl = details.shippingLabelUrl;
    if (details.specialInstructions) packageObj.specialInstructions = details.specialInstructions;

    // Add tracking number to pack list if not already present
    if (details.trackingNumber && !packList.trackingNumbers.includes(details.trackingNumber)) {
      packList.trackingNumbers.push(details.trackingNumber);
    }

    packList.updatedAt = new Date();

    return { success: true };
  }

  async completePackList(packListId: string): Promise<{ success: boolean; error?: string }> {
    const packList = this.packLists.get(packListId);
    if (!packList || packList.status !== 'in_progress') {
      return { success: false, error: 'Pack list not found or not in progress' };
    }

    // Check if all packages have tracking numbers
    const unShippedPackages = packList.packages.filter(pkg => !pkg.trackingNumber);
    if (unShippedPackages.length > 0) {
      return { success: false, error: 'Not all packages have shipping labels' };
    }

    packList.status = 'completed';
    packList.completedAt = new Date();
    packList.actualTime = packList.startedAt ?
      Math.round((Date.now() - packList.startedAt.getTime()) / (1000 * 60)) : undefined;
    packList.updatedAt = new Date();

    return { success: true };
  }

  // ======= QUERY METHODS =======

  getPickList(pickListId: string): PickList | undefined {
    return this.pickLists.get(pickListId);
  }

  getPickLists(filters: {
    warehouseId?: string;
    status?: PickList['status'];
    assignedTo?: string;
    priority?: PickList['priority'];
  } = {}): PickList[] {
    return Array.from(this.pickLists.values()).filter(pickList => {
      if (filters.warehouseId && pickList.warehouseId !== filters.warehouseId) return false;
      if (filters.status && pickList.status !== filters.status) return false;
      if (filters.assignedTo && pickList.assignedTo !== filters.assignedTo) return false;
      if (filters.priority && pickList.priority !== filters.priority) return false;
      return true;
    });
  }

  getPackList(packListId: string): PackList | undefined {
    return this.packLists.get(packListId);
  }

  getPackLists(filters: {
    status?: PackList['status'];
    assignedTo?: string;
    shippingMethod?: string;
  } = {}): PackList[] {
    return Array.from(this.packLists.values()).filter(packList => {
      if (filters.status && packList.status !== filters.status) return false;
      if (filters.assignedTo && packList.assignedTo !== filters.assignedTo) return false;
      if (filters.shippingMethod && packList.shippingMethod !== filters.shippingMethod) return false;
      return true;
    });
  }

  // ======= PERFORMANCE METRICS =======

  getPickingMetrics(warehouseId: string, period: { start: Date; end: Date }): {
    totalPickLists: number;
    completedPickLists: number;
    averagePickTime: number;
    pickAccuracy: number;
    productivity: number; // items per hour
  } {
    const pickLists = this.getPickLists({ warehouseId })
      .filter(pl => pl.createdAt >= period.start && pl.createdAt <= period.end);

    const completed = pickLists.filter(pl => pl.status === 'completed');
    const totalItems = completed.reduce((sum, pl) => sum + pl.items.length, 0);
    const totalTime = completed.reduce((sum, pl) => sum + (pl.actualTime || 0), 0);

    const totalPicked = completed.reduce((sum, pl) =>
      sum + pl.items.reduce((itemSum, item) => itemSum + item.pickedQuantity, 0), 0);
    const totalRequested = completed.reduce((sum, pl) =>
      sum + pl.items.reduce((itemSum, item) => itemSum + item.requestedQuantity, 0), 0);

    return {
      totalPickLists: pickLists.length,
      completedPickLists: completed.length,
      averagePickTime: completed.length > 0 ? totalTime / completed.length : 0,
      pickAccuracy: totalRequested > 0 ? (totalPicked / totalRequested) * 100 : 0,
      productivity: totalTime > 0 ? (totalItems / totalTime) * 60 : 0 // items per hour
    };
  }

  getPackingMetrics(period: { start: Date; end: Date }): {
    totalPackLists: number;
    completedPackLists: number;
    averagePackTime: number;
    totalPackages: number;
    averagePackagesPerList: number;
  } {
    const packLists = Array.from(this.packLists.values())
      .filter(pl => pl.createdAt >= period.start && pl.createdAt <= period.end);

    const completed = packLists.filter(pl => pl.status === 'completed');
    const totalTime = completed.reduce((sum, pl) => sum + (pl.actualTime || 0), 0);
    const totalPackages = packLists.reduce((sum, pl) => sum + pl.packages.length, 0);

    return {
      totalPackLists: packLists.length,
      completedPackLists: completed.length,
      averagePackTime: completed.length > 0 ? totalTime / completed.length : 0,
      totalPackages,
      averagePackagesPerList: packLists.length > 0 ? totalPackages / packLists.length : 0
    };
  }

  // ======= UTILITY METHODS =======

  addWarehouse(warehouse: Warehouse): void {
    this.warehouses.set(warehouse.id, warehouse);
  }

  getWarehouse(warehouseId: string): Warehouse | undefined {
    return this.warehouses.get(warehouseId);
  }
}