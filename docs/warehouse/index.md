# Warehouse Management (WMS) — Index
**Owner:** Operations + Backend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Sistema gestione magazzino leggero (WMS): inventory tracking, lotti FEFO, pick & pack, ordini d'acquisto fornitori, recall management.

## Contenuti
- [lots-fefo.md](./lots-fefo.md) — Gestione lotti prodotto e algoritmo FEFO (First Expired First Out)
- [pick-pack.md](./pick-pack.md) — Processo picking e packing ordini
- [purchase-orders.md](./purchase-orders.md) — Ordini acquisto fornitori e ricevimenti merce

## Architecture

### Firestore Collections
```
inventory/ - Stock corrente per product/variant
lots/ - Lotti merce con scadenze
pickTasks/ - Task picking assegnati a warehouse staff
purchaseOrders/ - Ordini acquisto fornitori
movements/ - Movimenti inventory (audit trail)
```

## Inventory Management

### Stock Tracking
```ts
// inventory/{productId}
interface InventoryRecord {
  productId: string;
  variantId?: string;

  // Quantities
  quantityAvailable: number; // disponibile per vendita
  quantityReserved: number; // riservato ordini confermati
  quantityOnOrder: number; // in arrivo da fornitori
  quantityTotal: number; // fisico in warehouse

  // Locations
  locations: Array<{
    zone: string; // 'A1', 'B2', etc.
    binLocation: string; // 'A1-03-15'
    quantity: number;
  }>;

  // Thresholds
  lowStockThreshold: number;
  reorderPoint: number;
  reorderQuantity: number;

  // Last update
  lastCountDate: Timestamp;
  lastMovementAt: Timestamp;

  // Metadata
  updatedAt: Timestamp;
}
```

### Inventory Movements (Audit Trail)
```ts
// movements/{movementId}
interface InventoryMovement {
  id: string;
  productId: string;
  lotId?: string;

  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'return';
  quantity: number; // signed (+/-)

  // Context
  orderId?: string;
  purchaseOrderId?: string;
  userId?: string; // warehouse staff
  reason?: string;

  // Location
  fromLocation?: string;
  toLocation?: string;

  timestamp: Timestamp;
}
```

## Lot Management (FEFO)

Vedi [lots-fefo.md](./lots-fefo.md) per dettagli completi.

### Lot Schema
```ts
// lots/{lotId}
interface Lot {
  id: string; // LOT-20250929-ABC
  productId: string;
  variantId?: string;

  // Lot info
  lotNumber: string; // supplier lot #
  expiryDate: Date;
  manufactureDate: Date;

  // Quantity
  quantityReceived: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantityPicked: number;

  // Reception
  purchaseOrderId: string;
  receivedDate: Date;
  receivedBy: string; // staff UID

  // Location
  location: string; // 'A1-03-15'

  // Status
  status: 'active' | 'quarantine' | 'recalled' | 'expired' | 'depleted';

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### FEFO Algorithm
**Rule**: Pick lotto con scadenza più vicina (First Expired First Out)

```ts
async function allocateLots(
  productId: string,
  quantityNeeded: number
): Promise<LotAllocation[]> {
  // Get lots sorted by expiry date (ASC)
  const lots = await db.collection('lots')
    .where('productId', '==', productId)
    .where('status', '==', 'active')
    .where('quantityAvailable', '>', 0)
    .orderBy('expiryDate', 'asc')
    .get();

  const allocations: LotAllocation[] = [];
  let remaining = quantityNeeded;

  for (const lot of lots.docs) {
    const lotData = lot.data();
    const allocateQty = Math.min(lotData.quantityAvailable, remaining);

    allocations.push({
      lotId: lot.id,
      lotNumber: lotData.lotNumber,
      quantity: allocateQty,
      location: lotData.location,
      expiryDate: lotData.expiryDate
    });

    remaining -= allocateQty;

    if (remaining === 0) break;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock. Missing ${remaining} units`);
  }

  return allocations;
}
```

### Expiry Alerts
**Cloud Scheduler**: Daily check lotti in scadenza entro 30 giorni

```ts
// api/src/jobs/warehouse/expiry-alerts.ts
export async function checkExpiringLots() {
  const thirtyDaysFromNow = addDays(new Date(), 30);

  const expiringLots = await db.collection('lots')
    .where('expiryDate', '<=', thirtyDaysFromNow)
    .where('status', '==', 'active')
    .where('quantityAvailable', '>', 0)
    .get();

  for (const lot of expiringLots.docs) {
    await sendAlert({
      type: 'expiry_warning',
      lotId: lot.id,
      product: lot.data().productId,
      expiryDate: lot.data().expiryDate,
      quantity: lot.data().quantityAvailable
    });
  }
}
```

## Pick & Pack Process

Vedi [pick-pack.md](./pick-pack.md) per workflow completo.

### Picking Flow
```
1. Order confirmed → Create pick task
2. Allocate lots (FEFO)
3. Assign to warehouse staff
4. Staff scans bin locations → picks items
5. Mark task complete
6. Generate packing slip
7. Pack order
8. Print shipping label
9. Ship order → Update tracking
```

### Pick Task Schema
```ts
// pickTasks/{taskId}
interface PickTask {
  id: string;
  orderId: string;

  // Assignment
  assignedTo?: string; // warehouse staff UID
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

  // Items to pick
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    allocations: Array<{
      lotId: string;
      location: string;
      quantity: number;
    }>;
    pickedQuantity?: number;
    pickedAt?: Timestamp;
  }>;

  // Priority
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Timing
  createdAt: Timestamp;
  assignedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  dueDate?: Timestamp;
}
```

### Packing Slip
Generated PDF con:
- Order ID + customer name
- Items list (product, quantity, lot numbers)
- Special instructions
- Barcode (order ID)

### Barcode Scanning
Warehouse staff app scans:
1. **Bin location** barcode → verify correct location
2. **Product** barcode → verify correct product
3. **Quantity** input → confirm picked quantity

## Purchase Orders (Suppliers)

Vedi [purchase-orders.md](./purchase-orders.md) per dettagli completi.

### Purchase Order Schema
```ts
// purchaseOrders/{poId}
interface PurchaseOrder {
  id: string; // PO-20250929-001
  supplierId: string;
  supplierName: string;

  // Items
  items: Array<{
    productId: string;
    sku: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;

  // Financials
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: 'EUR';

  // Status
  status: 'draft' | 'sent' | 'confirmed' | 'in_transit' | 'received' | 'cancelled';

  // Dates
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;

  // Receiving
  receivedItems: Array<{
    productId: string;
    quantityReceived: number;
    lotNumber: string;
    expiryDate: Date;
    receivedAt: Timestamp;
    receivedBy: string;
  }>;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Reorder Point Logic
**Automatic PO creation** quando stock < reorderPoint:

```ts
// api/src/jobs/warehouse/auto-reorder.ts
export async function checkReorderPoints() {
  const lowStockProducts = await db.collection('inventory')
    .where('quantityAvailable', '<', 'reorderPoint')
    .get();

  for (const product of lowStockProducts.docs) {
    const data = product.data();

    // Check if PO già esistente per questo prodotto
    const existingPO = await db.collection('purchaseOrders')
      .where('status', 'in', ['draft', 'sent', 'confirmed', 'in_transit'])
      .where('items', 'array-contains', { productId: product.id })
      .get();

    if (existingPO.empty) {
      // Create new PO
      await createPurchaseOrder({
        supplierId: data.preferredSupplierId,
        items: [{
          productId: product.id,
          quantity: data.reorderQuantity
        }]
      });

      // Notify procurement team
      await sendNotification({
        type: 'reorder_needed',
        productId: product.id,
        currentStock: data.quantityAvailable,
        reorderQuantity: data.reorderQuantity
      });
    }
  }
}
```

## Receiving Process

### Flow
```
1. PO arrives at warehouse
2. Staff creates receiving task
3. Scan items + quantities
4. Generate lot for each item (lotNumber, expiryDate)
5. Assign bin locations
6. Update inventory
7. Mark PO as received
8. Generate receiving report
```

### Discrepancy Handling
Se quantità ricevuta ≠ PO quantità:
- **Over-delivery**: Accept extra units (aggiorna PO)
- **Under-delivery**: Partial receive + create backorder
- **Wrong item**: Reject + create return task

## Cycle Counting

**Schedule**: Weekly random sample of 10% inventory

```ts
// cycleCounts/{countId}
interface CycleCount {
  id: string;
  productId: string;
  location: string;

  // Expected vs Actual
  systemQuantity: number;
  countedQuantity: number;
  variance: number; // actual - system

  // Count details
  countedBy: string;
  countedAt: Timestamp;

  // Resolution
  status: 'pending' | 'confirmed' | 'disputed';
  adjustmentApplied: boolean;
  notes?: string;
}
```

**Process**:
1. System genera lista random prodotti
2. Staff conta fisicamente
3. Inserisce quantità in app
4. Se variance > threshold (5%) → investigazione
5. Conferma adjustment → aggiorna inventory

## Product Recall

### Recall Schema
```ts
// recalls/{recallId}
interface ProductRecall {
  id: string;
  productId: string;
  lotNumbers: string[]; // lotti interessati

  reason: string; // contamination, defect, etc.
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Dates
  announcedDate: Date;
  effectiveDate: Date;
  closedDate?: Date;

  // Actions
  status: 'announced' | 'in_progress' | 'completed';

  // Affected
  affectedOrders: string[]; // orderId list
  affectedCustomers: string[]; // userId list
  unitsAffected: number;

  // Instructions
  customerInstructions: string;
  disposalInstructions: string;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
}
```

### Recall Process
```
1. Recall announced (supplier or internal)
2. System identifies affected lots
3. Query orders containing affected lots
4. Notify customers (email + in-app)
5. Generate return labels
6. Track returns
7. Issue refunds
8. Dispose/quarantine affected units
9. Close recall when all units recovered
```

## Reservation System (Subscriptions)

**Timing**: T-3 giorni da `nextShipAt`, reserved stock per ordini ricorrenti

```ts
// api/src/jobs/subscriptions/reserve-inventory.ts
export async function reserveSubscriptionInventory() {
  const threeDaysFromNow = addDays(new Date(), 3);

  const dueSubs = await db.collection('subscriptions')
    .where('status', '==', 'active')
    .where('nextShipAt', '<=', threeDaysFromNow)
    .where('inventoryReserved', '==', false)
    .get();

  for (const sub of dueSubs.docs) {
    const subscription = sub.data();

    try {
      // Reserve stock
      await reserveInventory(subscription.productId, subscription.quantity);

      // Mark as reserved
      await sub.ref.update({ inventoryReserved: true });
    } catch (error) {
      // Insufficient stock → notify customer
      await handleStockoutSubscription(subscription);
    }
  }
}
```

## Admin Warehouse Dashboard

**Path**: `/apps/admin/src/modules/warehouse/`

### Features
- [ ] Inventory overview (stock levels, low stock alerts)
- [ ] Lot management (list, search, expire alerts)
- [ ] Pick task queue (assign, prioritize)
- [ ] Purchase orders (create, receive, history)
- [ ] Receiving interface (scan, generate lots)
- [ ] Cycle count tool
- [ ] Recall management
- [ ] Reports: Stock value, turnover rate, FEFO compliance

## Metrics & KPIs

### Operational
- **Pick accuracy**: 99.5%+ (correct items picked)
- **Pick time**: <5 min per order (average)
- **FEFO compliance**: 100% (oldest lots picked first)
- **Stockout rate**: <1% (subscription renewals)
- **Cycle count accuracy**: 95%+ (variance <5%)

### Financial
- **Inventory turnover**: Stock rotations/year
- **Days inventory outstanding**: Avg days stock held
- **Stock value**: Total € inventory
- **Shrinkage rate**: Lost/damaged goods %

## Testing

```ts
// tests/integration/warehouse/fefo.spec.ts
describe('FEFO Allocation', () => {
  it('allocates oldest lot first', async () => {
    // Create 3 lots with different expiry dates
    await createLot({ productId: 'prod_A', expiryDate: '2025-12-31', quantity: 10 });
    await createLot({ productId: 'prod_A', expiryDate: '2025-11-30', quantity: 10 });
    await createLot({ productId: 'prod_A', expiryDate: '2025-10-31', quantity: 10 });

    const allocations = await allocateLots('prod_A', 15);

    expect(allocations[0].expiryDate).toBe('2025-10-31'); // oldest first
    expect(allocations[0].quantity).toBe(10);
    expect(allocations[1].expiryDate).toBe('2025-11-30');
    expect(allocations[1].quantity).toBe(5);
  });
});
```

## Resources
- [Warehouse Management Best Practices](https://www.netsuite.com/portal/resource/articles/inventory-management/warehouse-management.shtml)
- [FEFO vs FIFO](https://www.camcode.com/blog/fefo-vs-fifo/)
- [Cycle Counting Guide](https://www.investopedia.com/terms/c/cyclecounting.asp)