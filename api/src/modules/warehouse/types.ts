// Warehouse Management System types
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  perishable: boolean;
  shelfLifeDays?: number;
  storageConditions: {
    temperature: {
      min: number;
      max: number;
    };
    humidity: {
      min: number;
      max: number;
    };
    notes?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lot {
  id: string;
  productId: string;
  lotNumber: string;
  manufactureDate: Date;
  expiryDate?: Date;
  receivedDate: Date;
  supplierId: string;
  supplierReference?: string;
  originalQuantity: number;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number; // currentQuantity - reservedQuantity
  unitCost: number;
  totalCost: number;
  status: 'active' | 'quarantine' | 'recalled' | 'expired' | 'depleted';
  qualityCheck: {
    checked: boolean;
    checkedAt?: Date;
    checkedBy?: string;
    notes?: string;
    passed: boolean;
  };
  location: {
    warehouseId: string;
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
  };
  fefoScore: number; // Calculated score for FEFO sorting
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  capacity: {
    totalSquareMeters: number;
    totalWeight: number;
    zones: WarehouseZone[];
  };
  operatingHours: {
    monday: { open: string; close: string; };
    tuesday: { open: string; close: string; };
    wednesday: { open: string; close: string; };
    thursday: { open: string; close: string; };
    friday: { open: string; close: string; };
    saturday: { open: string; close: string; };
    sunday: { open: string; close: string; };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseZone {
  id: string;
  name: string;
  code: string;
  type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'quarantine' | 'returns';
  capacity: number;
  currentUtilization: number;
  aisles: Aisle[];
}

export interface Aisle {
  id: string;
  code: string;
  shelves: Shelf[];
}

export interface Shelf {
  id: string;
  code: string;
  level: number;
  bins: Bin[];
}

export interface Bin {
  id: string;
  code: string;
  capacity: number;
  currentOccupancy: number;
  isBlocked: boolean;
  productIds: string[];
}

export interface StockMovement {
  id: string;
  type: 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'loss' | 'damage';
  productId: string;
  lotId?: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  reason: string;
  referenceId?: string; // PO, Order, Transfer ID
  referenceType?: 'purchase_order' | 'sales_order' | 'transfer' | 'adjustment';
  performedBy: string;
  performedAt: Date;
  notes?: string;
  metadata: Record<string, any>;
}

export interface Inventory {
  productId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  transitQuantity: number;
  lots: LotSummary[];
  lastMovement?: Date;
  turnoverRate: number;
  daysOfStock: number;
  reorderPoint: number;
  maxStock: number;
  abc: 'A' | 'B' | 'C'; // ABC analysis classification
}

export interface LotSummary {
  lotId: string;
  lotNumber: string;
  quantity: number;
  expiryDate?: Date;
  daysToExpiry?: number;
  fefoScore: number;
  location: string;
}

export interface PickList {
  id: string;
  orderIds: string[];
  warehouseId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  pickType: 'single' | 'batch' | 'wave';
  assignedTo?: string;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  items: PickListItem[];
  route: PickRoute;
  estimatedTime: number; // minutes
  actualTime?: number; // minutes
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickListItem {
  id: string;
  orderItemId: string;
  productId: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  pickedQuantity: number;
  shortQuantity: number;
  pickedLots: PickedLot[];
  location: string;
  pickSequence: number;
  status: 'pending' | 'picked' | 'short' | 'substituted' | 'cancelled';
  notes?: string;
}

export interface PickedLot {
  lotId: string;
  lotNumber: string;
  quantity: number;
  expiryDate?: Date;
  pickedAt: Date;
  pickedBy: string;
}

export interface PickRoute {
  zones: string[];
  aisles: string[];
  estimatedDistance: number; // meters
  estimatedTime: number; // minutes
  optimized: boolean;
  algorithm: 'shortest_path' | 'zone_based' | 'manual';
}

export interface PackList {
  id: string;
  pickListId: string;
  orderIds: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  packType: 'single' | 'multi' | 'split';
  assignedTo?: string;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  packages: Package[];
  totalWeight: number;
  totalVolume: number;
  shippingMethod: string;
  trackingNumbers: string[];
  estimatedTime: number; // minutes
  actualTime?: number; // minutes
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Package {
  id: string;
  packageNumber: string;
  orderIds: string[];
  items: PackedItem[];
  packageType: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  trackingNumber?: string;
  shippingLabelUrl?: string;
  contents: string; // Description for customs
  value: number;
  insurance: boolean;
  fragile: boolean;
  perishable: boolean;
  specialInstructions?: string;
}

export interface PackedItem {
  productId: string;
  sku: string;
  quantity: number;
  lots: PickedLot[];
  value: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'completed' | 'cancelled';
  orderDate: Date;
  expectedDelivery: Date;
  actualDelivery?: Date;
  items: PurchaseOrderItem[];
  totalValue: number;
  currency: string;
  terms: {
    paymentTerms: string;
    deliveryTerms: string;
    notes?: string;
  };
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  sku: string;
  description: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  expectedDelivery: Date;
  actualDelivery?: Date;
  qualityNotes?: string;
}

export interface Receipt {
  id: string;
  purchaseOrderId: string;
  receiptNumber: string;
  warehouseId: string;
  supplierId: string;
  receiptDate: Date;
  items: ReceiptItem[];
  status: 'draft' | 'completed' | 'discrepancy';
  receivedBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  productId: string;
  expectedQuantity: number;
  receivedQuantity: number;
  discrepancyQuantity: number;
  discrepancyReason?: string;
  lots: ReceivedLot[];
  qualityCheck: {
    passed: boolean;
    notes?: string;
    checkedBy: string;
    checkedAt: Date;
  };
}

export interface ReceivedLot {
  lotNumber: string;
  quantity: number;
  manufactureDate: Date;
  expiryDate?: Date;
  unitCost: number;
  location: string;
  qualityNotes?: string;
}

export interface StockReservation {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
  allocatedLots: AllocatedLot[];
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  reservedAt: Date;
  expiresAt: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  metadata: Record<string, any>;
}

export interface AllocatedLot {
  lotId: string;
  lotNumber: string;
  quantity: number;
  location: string;
  fefoScore: number;
}

export interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry_warning' | 'quality_issue' | 'location_full';
  severity: 'info' | 'warning' | 'error' | 'critical';
  productId?: string;
  lotId?: string;
  warehouseId: string;
  location?: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  daysToExpiry?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface Recall {
  id: string;
  recallNumber: string;
  type: 'voluntary' | 'mandatory' | 'precautionary';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  description: string;
  affectedProducts: string[];
  affectedLots: string[];
  initiatedBy: string;
  initiatedAt: Date;
  status: 'initiated' | 'investigating' | 'quarantined' | 'completed';
  actions: RecallAction[];
  notifications: RecallNotification[];
  completedAt?: Date;
  metadata: Record<string, any>;
}

export interface RecallAction {
  id: string;
  type: 'quarantine' | 'stop_shipments' | 'notify_customers' | 'return_product' | 'destroy';
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  dueDate: Date;
  completedAt?: Date;
  notes?: string;
}

export interface RecallNotification {
  id: string;
  recipient: string;
  recipientType: 'customer' | 'supplier' | 'authority' | 'staff';
  method: 'email' | 'sms' | 'phone' | 'letter';
  message: string;
  sentAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface CycleCount {
  id: string;
  name: string;
  type: 'full' | 'partial' | 'abc' | 'random' | 'location' | 'product';
  warehouseId: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  scope: {
    zones?: string[];
    aisles?: string[];
    products?: string[];
    locations?: string[];
  };
  items: CycleCountItem[];
  accuracy: number; // percentage
  discrepancies: number;
  adjustments: StockMovement[];
  performedBy: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CycleCountItem {
  id: string;
  productId: string;
  lotId?: string;
  location: string;
  systemQuantity: number;
  countedQuantity: number;
  discrepancy: number;
  discrepancyReason?: string;
  countedBy: string;
  countedAt: Date;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface WarehouseKPI {
  warehouseId: string;
  period: {
    start: Date;
    end: Date;
  };
  inventory: {
    turnoverRate: number;
    accuracyRate: number;
    daysOfStock: number;
    stockoutRate: number;
    expiryRate: number;
  };
  operations: {
    receiptProductivity: number; // items per hour
    pickProductivity: number; // items per hour
    packProductivity: number; // packages per hour
    orderFulfillmentTime: number; // hours
    orderAccuracy: number; // percentage
  };
  space: {
    utilizationRate: number; // percentage
    peakUtilization: number; // percentage
    averageUtilization: number; // percentage
  };
  labor: {
    staffUtilization: number; // percentage
    overtimeHours: number;
    productivityRate: number; // items per person-hour
  };
  costs: {
    storagePerUnit: number;
    laborPerUnit: number;
    totalOperatingCost: number;
  };
}