import { openDB, IDBPDatabase } from 'idb';
import {
  RestaurantSettings,
  User,
  Category,
  Product,
  Ingredient,
  RecipeItem,
  Order,
  OrderItem,
  HeldOrder,
  InventoryLedgerEntry,
  WastageRecord,
  Supplier,
  PurchaseInvoice,
  SupplierLedgerEntry,
  Customer,
  CustomerLedgerEntry,
  Expense,
  Staff,
  AttendanceRecord,
  SalaryPayment,
  CashbookSession,
  CashbookEntry,
  AuditLogEntry,
  OrderStatus,
  PaymentMethod,
} from '../types';
import {
  initialSettings,
  initialUsers,
  initialCategories,
  initialProducts,
  initialIngredients,
  initialRecipes,
  initialSuppliers,
  initialStaff,
  initialCustomers,
} from './seedData';

const DB_NAME = 'tokyo_crunch_pos_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('ingredients')) {
          db.createObjectStore('ingredients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('recipes')) {
          db.createObjectStore('recipes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('by_orderNumber', 'orderNumber');
          orderStore.createIndex('by_status', 'status');
          orderStore.createIndex('by_createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('held_orders')) {
          db.createObjectStore('held_orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('inventory_ledger')) {
          const ledgerStore = db.createObjectStore('inventory_ledger', { keyPath: 'id' });
          ledgerStore.createIndex('by_ingredientId', 'ingredientId');
          ledgerStore.createIndex('by_date', 'date');
        }
        if (!db.objectStoreNames.contains('wastage')) {
          db.createObjectStore('wastage', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('purchases')) {
          const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' });
          purchaseStore.createIndex('by_date', 'date');
        }
        if (!db.objectStoreNames.contains('supplier_ledger')) {
          const supLedger = db.createObjectStore('supplier_ledger', { keyPath: 'id' });
          supLedger.createIndex('by_supplierId', 'supplierId');
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('customer_ledger')) {
          const custLedger = db.createObjectStore('customer_ledger', { keyPath: 'id' });
          custLedger.createIndex('by_customerId', 'customerId');
        }
        if (!db.objectStoreNames.contains('expenses')) {
          const expStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expStore.createIndex('by_date', 'date');
        }
        if (!db.objectStoreNames.contains('staff')) {
          db.createObjectStore('staff', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('salary_payments')) {
          db.createObjectStore('salary_payments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cashbook_sessions')) {
          db.createObjectStore('cashbook_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cashbook_entries')) {
          const cbStore = db.createObjectStore('cashbook_entries', { keyPath: 'id' });
          cbStore.createIndex('by_sessionId', 'sessionId');
          cbStore.createIndex('by_date', 'date');
        }
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('by_timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function initializeDatabase(): Promise<void> {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Tokyo Crunch 1-System] Storage persistence: ${isPersisted ? 'Permanent' : 'Standard'}`);
    } catch {}
  }
  const db = await getDb();
  
  // Check if settings exist
  const existingSettings = await db.get('settings', 'current');
  if (!existingSettings) {
    console.log('Seeding Tokyo Crunch Database...');
    const tx = db.transaction(
      [
        'settings',
        'users',
        'categories',
        'products',
        'ingredients',
        'recipes',
        'suppliers',
        'staff',
        'customers',
        'cashbook_sessions',
        'cashbook_entries',
        'audit_logs',
      ],
      'readwrite'
    );

    await tx.objectStore('settings').put(initialSettings, 'current');

    for (const user of initialUsers) {
      await tx.objectStore('users').put(user);
    }
    for (const cat of initialCategories) {
      await tx.objectStore('categories').put(cat);
    }
    for (const prod of initialProducts) {
      await tx.objectStore('products').put(prod);
    }
    for (const ing of initialIngredients) {
      await tx.objectStore('ingredients').put(ing);
    }
    for (const rec of initialRecipes) {
      await tx.objectStore('recipes').put(rec);
    }
    for (const sup of initialSuppliers) {
      await tx.objectStore('suppliers').put(sup);
    }
    for (const st of initialStaff) {
      await tx.objectStore('staff').put(st);
    }
    for (const cust of initialCustomers) {
      await tx.objectStore('customers').put(cust);
    }

    // Initialize today's cashbook session with 5,000 opening float
    const todayStr = new Date().toISOString().split('T')[0];
    const initialSession: CashbookSession = {
      id: `cash-session-${Date.now()}`,
      sessionDate: todayStr,
      openedAt: new Date().toISOString(),
      openingCash: 5000,
      status: 'open',
      openedBy: 'Master Admin',
      notes: 'Initial register float',
    };
    await tx.objectStore('cashbook_sessions').put(initialSession);

    const initialCashEntry: CashbookEntry = {
      id: `cbe-${Date.now()}`,
      sessionId: initialSession.id,
      date: new Date().toISOString(),
      type: 'opening_balance',
      amount: 5000,
      runningBalance: 5000,
      paymentMethod: 'cash',
      description: 'Opening register float',
      recordedBy: 'Master Admin',
    };
    await tx.objectStore('cashbook_entries').put(initialCashEntry);

    const initialAudit: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'user-admin',
      userName: 'Master Admin',
      action: 'SYSTEM_INIT',
      module: 'System',
      details: 'Tokyo Crunch offline database initialized with complete product & recipe catalogs',
    };
    await tx.objectStore('audit_logs').put(initialAudit);

    await tx.done;
    console.log('Tokyo Crunch Database successfully seeded.');
  } else {
    // Ensure 1-click silent printing and auto checkout printing are enabled
    if (!existingSettings.silentKioskPrintEnabled || !existingSettings.autoPrintReceiptOnCheckout) {
      existingSettings.silentKioskPrintEnabled = true;
      existingSettings.autoPrintReceiptOnCheckout = true;
      existingSettings.autoPrintKotOnCheckout = true;
      await db.put('settings', existingSettings, 'current');
      console.log('Tokyo Crunch settings updated with 1-click silent printing.');
    }
  }
}

// ----------------- GENERIC HELPERS -----------------

export async function getAllFromStore<T>(storeName: any): Promise<T[]> {
  const db = await getDb();
  return db.getAll(storeName);
}

export async function getFromStore<T>(storeName: any, key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(storeName, key);
}

export async function saveToStore<T>(storeName: any, item: T, key?: string): Promise<void> {
  const db = await getDb();
  if (key) {
    await db.put(storeName, item, key);
  } else {
    await db.put(storeName, item);
  }
}

export async function deleteFromStore(storeName: any, key: string): Promise<void> {
  const db = await getDb();
  await db.delete(storeName, key);
}

// ----------------- SETTINGS & AUDIT -----------------

export async function getSettings(): Promise<RestaurantSettings> {
  const db = await getDb();
  const settings = await db.get('settings', 'current');
  return settings || initialSettings;
}

export async function updateSettings(settings: RestaurantSettings, user: User): Promise<void> {
  const db = await getDb();
  await db.put('settings', settings, 'current');
  await addAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'SETTINGS_UPDATE',
    module: 'Settings',
    details: `Updated restaurant details: ${settings.name}, Phone: ${settings.phone}`,
  });
}

export async function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await getDb();
    const log: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    await db.put('audit_logs', log);
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

// ----------------- CASHBOOK HELPERS -----------------

export async function getActiveCashSession(): Promise<CashbookSession | null> {
  const db = await getDb();
  const allSessions: CashbookSession[] = await db.getAll('cashbook_sessions');
  const openSession = allSessions.find((s) => s.status === 'open');
  return openSession || null;
}

export async function getCurrentCashBalance(sessionId: string): Promise<number> {
  const db = await getDb();
  const entries: CashbookEntry[] = await db.getAllFromIndex('cashbook_entries', 'by_sessionId', sessionId);
  if (!entries || entries.length === 0) return 0;
  // Sort by date ascending to get last running balance or calculate sum of cash amounts
  let cashBalance = 0;
  for (const entry of entries) {
    if (entry.paymentMethod === 'cash') {
      cashBalance += entry.amount;
    }
  }
  return cashBalance;
}

// ----------------- ORDER COST & NET PROFIT CALCULATOR -----------------

export function calculateOrderCostAndProfit(
  items: OrderItem[],
  orderTotal: number,
  taxAmount: number = 0,
  recipes: RecipeItem[],
  ingredients: Ingredient[]
): {
  itemsWithCost: OrderItem[];
  totalCost: number;
  netRevenue: number;
  netProfit: number;
  profitMarginPercent: number;
} {
  const ingMap = new Map<string, Ingredient>();
  for (const ing of ingredients) {
    ingMap.set(ing.id, ing);
  }

  const itemsWithCost = items.map((item) => {
    const matchedRecipes = recipes.filter(
      (r) =>
        r.productId === item.productId &&
        (!r.variantName || r.variantName === item.variantName || item.variantName === 'Standard')
    );

    let unitCost = 0;
    for (const rec of matchedRecipes) {
      const ing = ingMap.get(rec.ingredientId);
      if (ing) {
        unitCost += rec.quantity * ing.unitCost;
      }
    }

    for (const addon of item.addons || []) {
      if (addon.name.toLowerCase().includes('cheese')) {
        const cheese = ingMap.get('ing-cheese-slices');
        unitCost += cheese?.unitCost || 25;
      } else if (addon.name.toLowerCase().includes('jalapeno')) {
        const jal = ingMap.get('ing-jalapenos');
        unitCost += 0.02 * (jal?.unitCost || 400);
      }
    }

    unitCost = Number(unitCost.toFixed(2));
    const totalCost = Number((unitCost * item.quantity).toFixed(2));
    const profit = Number((item.itemTotal - totalCost).toFixed(2));

    return {
      ...item,
      unitCost,
      totalCost,
      profit,
    };
  });

  const totalCost = Number(
    itemsWithCost.reduce((sum, i) => sum + (i.totalCost || 0), 0).toFixed(2)
  );
  const netRevenue = Number((orderTotal - (taxAmount || 0)).toFixed(2));
  const netProfit = Number((netRevenue - totalCost).toFixed(2));
  const profitMarginPercent =
    netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(1)) : 0;

  return {
    itemsWithCost,
    totalCost,
    netRevenue,
    netProfit,
    profitMarginPercent,
  };
}

// ----------------- ATOMIC POS ORDER TRANSACTION -----------------

export interface CreateOrderParams {
  order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>;
  user: User;
}

export async function createPosOrderTransaction(params: {
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>;
  user: User;
}): Promise<Order> {
  const db = await getDb();
  const { orderData, user } = params;

  // We perform an atomic transaction across stores:
  // orders, ingredients, inventory_ledger, cashbook_entries, customers, customer_ledger, settings, audit_logs
  const tx = db.transaction(
    [
      'orders',
      'ingredients',
      'recipes',
      'inventory_ledger',
      'cashbook_sessions',
      'cashbook_entries',
      'customers',
      'customer_ledger',
      'settings',
      'audit_logs',
    ],
    'readwrite'
  );

  const settingsStore = tx.objectStore('settings');
  const currentSettings: RestaurantSettings = (await settingsStore.get('current')) || initialSettings;
  const seqNumber = currentSettings.nextOrderSequence || 101;
  const orderNumber = `${currentSettings.orderNumberPrefix || 'TC-'}${seqNumber}`;

  // Advance sequence
  currentSettings.nextOrderSequence = seqNumber + 1;
  await settingsStore.put(currentSettings, 'current');

  const nowIso = new Date().toISOString();
  const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Calculate Actual Cost (COGS) and Net Profit from Recipes & Ingredients
  const allRecipes: RecipeItem[] = await tx.objectStore('recipes').getAll();
  const ingredientsStore = tx.objectStore('ingredients');
  const allIngredients: Ingredient[] = await ingredientsStore.getAll();

  const costAnalysis = calculateOrderCostAndProfit(
    orderData.items,
    orderData.total,
    orderData.taxAmount || 0,
    allRecipes,
    allIngredients
  );

  const finalOrder: Order = {
    ...orderData,
    items: costAnalysis.itemsWithCost,
    totalCost: costAnalysis.totalCost,
    grossProfit: costAnalysis.netProfit,
    netProfit: costAnalysis.netProfit,
    profitMarginPercent: costAnalysis.profitMarginPercent,
    id: orderId,
    orderNumber,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Save the Order with frozen cost & profit
  await tx.objectStore('orders').put(finalOrder);

  // 2. Auto Stock Deduction via Recipes
  const ledgerStore = tx.objectStore('inventory_ledger');

  // Compute total ingredients consumed by this order
  const ingredientDeductions: Record<string, number> = {};

  for (const item of finalOrder.items) {
    // Find matching recipes for this product (check variant-specific or general)
    const matchedRecipes = allRecipes.filter(
      (r) =>
        r.productId === item.productId &&
        (!r.variantName || r.variantName === item.variantName || item.variantName === 'Standard')
    );

    for (const rec of matchedRecipes) {
      const deduction = rec.quantity * item.quantity;
      ingredientDeductions[rec.ingredientId] = (ingredientDeductions[rec.ingredientId] || 0) + deduction;
    }

    // Check addons (e.g. Cheese Slice, Jalapeno)
    for (const addon of item.addons) {
      if (addon.name.toLowerCase().includes('cheese')) {
        ingredientDeductions['ing-cheese-slices'] = (ingredientDeductions['ing-cheese-slices'] || 0) + 1 * item.quantity;
      } else if (addon.name.toLowerCase().includes('jalapeno')) {
        ingredientDeductions['ing-jalapenos'] = (ingredientDeductions['ing-jalapenos'] || 0) + 0.02 * item.quantity;
      }
    }
  }

  // Deduct from inventory & log movement
  for (const [ingredientId, deductQty] of Object.entries(ingredientDeductions)) {
    const ingredient: Ingredient | undefined = await ingredientsStore.get(ingredientId);
    if (ingredient) {
      const prevStock = ingredient.currentStock;
      const newStock = Math.max(0, Number((prevStock - deductQty).toFixed(3)));
      ingredient.currentStock = newStock;
      ingredient.updatedAt = nowIso;
      await ingredientsStore.put(ingredient);

      const ledgerEntry: InventoryLedgerEntry = {
        id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: nowIso,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        movementType: 'sale',
        changeQty: -deductQty,
        previousStock: prevStock,
        newStock: newStock,
        unit: ingredient.unit,
        referenceId: orderNumber,
        notes: `Auto deduction for POS Order #${orderNumber}`,
        performedBy: user.name,
      };
      await ledgerStore.put(ledgerEntry);
    }
  }

  // 3. Financial Handling: Cashbook entry if paid in cash
  if (finalOrder.paidAmount > 0 && finalOrder.paymentMethod === 'cash') {
    // Check if open cash session exists
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    let openSession = allSessions.find((s) => s.status === 'open');

    if (!openSession) {
      openSession = {
        id: `cash-session-${Date.now()}`,
        sessionDate: nowIso.split('T')[0],
        openedAt: nowIso,
        openingCash: 0,
        status: 'open',
        openedBy: user.name,
        notes: 'Auto-opened for POS order',
      };
      await sessionsStore.put(openSession);
    }

    const cashEntry: CashbookEntry = {
      id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: openSession.id,
      date: nowIso,
      type: 'pos_sale',
      amount: finalOrder.paidAmount,
      runningBalance: 0, // Calculated dynamically
      paymentMethod: 'cash',
      referenceId: orderNumber,
      description: `POS Sale #${orderNumber} (${finalOrder.type.toUpperCase()})`,
      recordedBy: user.name,
    };
    await tx.objectStore('cashbook_entries').put(cashEntry);
  }

  // 4. Customer balance update if Due amount or Customer selected
  if (finalOrder.customerId) {
    const custStore = tx.objectStore('customers');
    const customer: Customer | undefined = await custStore.get(finalOrder.customerId);
    if (customer) {
      customer.totalOrders = (customer.totalOrders || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + finalOrder.total;
      if (finalOrder.dueAmount > 0) {
        customer.currentDue = (customer.currentDue || 0) + finalOrder.dueAmount;

        const custLedger: CustomerLedgerEntry = {
          id: `cle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          customerId: customer.id,
          date: nowIso,
          type: 'order_sale',
          referenceId: orderNumber,
          amount: finalOrder.dueAmount,
          balanceAfter: customer.currentDue,
          notes: `Due from Order #${orderNumber}`,
          recordedBy: user.name,
        };
        await tx.objectStore('customer_ledger').put(custLedger);
      }
      customer.updatedAt = nowIso;
      await custStore.put(customer);
    }
  }

  // 5. Audit Log
  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'POS_ORDER_CREATED',
    module: 'POS',
    details: `Order #${orderNumber} created. Total: PKR ${finalOrder.total}, Items: ${finalOrder.items.length}, Type: ${finalOrder.type}`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
  return finalOrder;
}

// ----------------- VOID / CANCEL ORDER TRANSACTION -----------------

export async function voidOrderTransaction(params: {
  orderId: string;
  reason: string;
  user: User;
}): Promise<void> {
  const db = await getDb();
  const { orderId, reason, user } = params;

  const tx = db.transaction(
    [
      'orders',
      'ingredients',
      'recipes',
      'inventory_ledger',
      'cashbook_sessions',
      'cashbook_entries',
      'customers',
      'customer_ledger',
      'audit_logs',
    ],
    'readwrite'
  );

  const orderStore = tx.objectStore('orders');
  const order: Order | undefined = await orderStore.get(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'voided') {
    throw new Error('Order is already voided');
  }

  const nowIso = new Date().toISOString();
  order.status = 'voided';
  order.voidReason = reason;
  order.updatedAt = nowIso;
  await orderStore.put(order);

  // Restore inventory ingredients
  const allRecipes: RecipeItem[] = await tx.objectStore('recipes').getAll();
  const ingredientsStore = tx.objectStore('ingredients');
  const ledgerStore = tx.objectStore('inventory_ledger');

  const ingredientRestores: Record<string, number> = {};
  for (const item of order.items) {
    const matchedRecipes = allRecipes.filter(
      (r) =>
        r.productId === item.productId &&
        (!r.variantName || r.variantName === item.variantName || item.variantName === 'Standard')
    );
    for (const rec of matchedRecipes) {
      const qty = rec.quantity * item.quantity;
      ingredientRestores[rec.ingredientId] = (ingredientRestores[rec.ingredientId] || 0) + qty;
    }
  }

  for (const [ingredientId, restoreQty] of Object.entries(ingredientRestores)) {
    const ingredient: Ingredient | undefined = await ingredientsStore.get(ingredientId);
    if (ingredient) {
      const prevStock = ingredient.currentStock;
      const newStock = Number((prevStock + restoreQty).toFixed(3));
      ingredient.currentStock = newStock;
      ingredient.updatedAt = nowIso;
      await ingredientsStore.put(ingredient);

      const ledgerEntry: InventoryLedgerEntry = {
        id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: nowIso,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        movementType: 'return',
        changeQty: restoreQty,
        previousStock: prevStock,
        newStock: newStock,
        unit: ingredient.unit,
        referenceId: order.orderNumber,
        notes: `Restored stock from Voided Order #${order.orderNumber}. Reason: ${reason}`,
        performedBy: user.name,
      };
      await ledgerStore.put(ledgerEntry);
    }
  }

  // Adjust Cashbook if order was paid in cash
  if (order.paidAmount > 0 && order.paymentMethod === 'cash') {
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    const openSession = allSessions.find((s) => s.status === 'open');

    if (openSession) {
      const cashEntry: CashbookEntry = {
        id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: openSession.id,
        date: nowIso,
        type: 'cash_drop',
        amount: -order.paidAmount,
        runningBalance: 0,
        paymentMethod: 'cash',
        referenceId: order.orderNumber,
        description: `Refund for Voided Order #${order.orderNumber} (${reason})`,
        recordedBy: user.name,
      };
      await tx.objectStore('cashbook_entries').put(cashEntry);
    }
  }

  // Reverse Customer Due if any
  if (order.customerId && order.dueAmount > 0) {
    const custStore = tx.objectStore('customers');
    const customer: Customer | undefined = await custStore.get(order.customerId);
    if (customer) {
      customer.currentDue = Math.max(0, (customer.currentDue || 0) - order.dueAmount);
      customer.totalSpent = Math.max(0, (customer.totalSpent || 0) - order.total);
      customer.totalOrders = Math.max(0, (customer.totalOrders || 0) - 1);
      customer.updatedAt = nowIso;
      await custStore.put(customer);

      const custLedger: CustomerLedgerEntry = {
        id: `cle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerId: customer.id,
        date: nowIso,
        type: 'payment_received',
        referenceId: order.orderNumber,
        amount: -order.dueAmount,
        balanceAfter: customer.currentDue,
        notes: `Reversed due from voided Order #${order.orderNumber}`,
        recordedBy: user.name,
      };
      await tx.objectStore('customer_ledger').put(custLedger);
    }
  }

  // Audit
  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'ORDER_VOIDED',
    module: 'POS',
    details: `Order #${order.orderNumber} was voided by ${user.name}. Reason: ${reason}`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
}

// ----------------- UPDATE ORDER STATUS -----------------

export async function updateOrderStatus(orderId: string, status: OrderStatus, user: User): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['orders', 'audit_logs'], 'readwrite');
  const orderStore = tx.objectStore('orders');
  const order: Order | undefined = await orderStore.get(orderId);
  if (!order) throw new Error('Order not found');

  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (status === 'completed' && !order.completedAt) {
    order.completedAt = new Date().toISOString();
  }
  await orderStore.put(order);

  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    action: 'ORDER_STATUS_CHANGED',
    module: 'Kitchen/POS',
    details: `Order #${order.orderNumber} status changed to ${status.toUpperCase()}`,
  };
  await tx.objectStore('audit_logs').put(audit);
  await tx.done;
}

// ----------------- PURCHASE TRANSACTION -----------------

export async function createPurchaseTransaction(params: {
  invoiceData: Omit<PurchaseInvoice, 'id' | 'createdAt'>;
  user: User;
}): Promise<PurchaseInvoice> {
  const db = await getDb();
  const { invoiceData, user } = params;

  const tx = db.transaction(
    [
      'purchases',
      'ingredients',
      'inventory_ledger',
      'suppliers',
      'supplier_ledger',
      'cashbook_sessions',
      'cashbook_entries',
      'audit_logs',
    ],
    'readwrite'
  );

  const nowIso = new Date().toISOString();
  const invoiceId = `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const finalInvoice: PurchaseInvoice = {
    ...invoiceData,
    id: invoiceId,
    createdAt: nowIso,
  };

  await tx.objectStore('purchases').put(finalInvoice);

  // 1. Increase stock for each purchase item
  const ingStore = tx.objectStore('ingredients');
  const ledgerStore = tx.objectStore('inventory_ledger');

  for (const item of finalInvoice.items) {
    const ing: Ingredient | undefined = await ingStore.get(item.ingredientId);
    if (ing) {
      const prevStock = ing.currentStock;
      const newStock = Number((prevStock + item.quantity).toFixed(3));
      ing.currentStock = newStock;
      ing.unitCost = item.unitCost; // Update latest unit cost
      ing.updatedAt = nowIso;
      await ingStore.put(ing);

      const ledgerEntry: InventoryLedgerEntry = {
        id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: nowIso,
        ingredientId: ing.id,
        ingredientName: ing.name,
        movementType: 'purchase',
        changeQty: item.quantity,
        previousStock: prevStock,
        newStock: newStock,
        unit: ing.unit,
        referenceId: finalInvoice.invoiceNumber,
        notes: `Purchase from ${finalInvoice.supplierName} (Inv #${finalInvoice.invoiceNumber})`,
        performedBy: user.name,
      };
      await ledgerStore.put(ledgerEntry);
    }
  }

  // 2. Update Supplier Due and Supplier Ledger
  const supStore = tx.objectStore('suppliers');
  const supplier: Supplier | undefined = await supStore.get(finalInvoice.supplierId);
  if (supplier) {
    supplier.currentDue = (supplier.currentDue || 0) + finalInvoice.dueAmount;
    await supStore.put(supplier);

    const supLedger: SupplierLedgerEntry = {
      id: `sle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      supplierId: supplier.id,
      date: nowIso,
      type: 'purchase_invoice',
      referenceId: finalInvoice.invoiceNumber,
      amount: finalInvoice.totalAmount,
      balanceAfter: supplier.currentDue,
      notes: `Purchase invoice #${finalInvoice.invoiceNumber}. Paid: ${finalInvoice.paidAmount}, Due: ${finalInvoice.dueAmount}`,
      recordedBy: user.name,
    };
    await tx.objectStore('supplier_ledger').put(supLedger);
  }

  // 3. Deduct from Cashbook if paid in Cash
  if (finalInvoice.paidAmount > 0 && finalInvoice.paymentMethod === 'cash') {
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    const openSession = allSessions.find((s) => s.status === 'open');

    if (openSession) {
      const cashEntry: CashbookEntry = {
        id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: openSession.id,
        date: nowIso,
        type: 'purchase_payment',
        amount: -finalInvoice.paidAmount,
        runningBalance: 0,
        paymentMethod: 'cash',
        referenceId: finalInvoice.invoiceNumber,
        description: `Paid Supplier ${finalInvoice.supplierName} (Inv #${finalInvoice.invoiceNumber})`,
        recordedBy: user.name,
      };
      await tx.objectStore('cashbook_entries').put(cashEntry);
    }
  }

  // 4. Audit
  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'PURCHASE_RECORDED',
    module: 'Purchases',
    details: `Invoice #${finalInvoice.invoiceNumber} from ${finalInvoice.supplierName}. Total: PKR ${finalInvoice.totalAmount}, Stock updated.`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
  return finalInvoice;
}

// ----------------- EXPENSE TRANSACTION -----------------

export async function createExpenseTransaction(params: {
  expenseData: Omit<Expense, 'id' | 'createdAt'>;
  user: User;
}): Promise<Expense> {
  const db = await getDb();
  const { expenseData, user } = params;

  const tx = db.transaction(['expenses', 'cashbook_sessions', 'cashbook_entries', 'audit_logs'], 'readwrite');

  const nowIso = new Date().toISOString();
  const expenseId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const expense: Expense = {
    ...expenseData,
    id: expenseId,
    createdAt: nowIso,
  };

  await tx.objectStore('expenses').put(expense);

  // Cashbook deduction if cash
  if (expense.paymentMethod === 'cash') {
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    const openSession = allSessions.find((s) => s.status === 'open');

    if (openSession) {
      const cashEntry: CashbookEntry = {
        id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: openSession.id,
        date: nowIso,
        type: 'expense',
        amount: -expense.amount,
        runningBalance: 0,
        paymentMethod: 'cash',
        referenceId: expense.id,
        description: `Expense: ${expense.category} - ${expense.description}`,
        recordedBy: user.name,
      };
      await tx.objectStore('cashbook_entries').put(cashEntry);
    }
  }

  // Audit
  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'EXPENSE_RECORDED',
    module: 'Expenses',
    details: `${expense.category}: PKR ${expense.amount} (${expense.description})`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
  return expense;
}

// ----------------- CUSTOMER PAYMENT TRANSACTION -----------------

export async function recordCustomerPaymentTransaction(params: {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  user: User;
}): Promise<void> {
  const db = await getDb();
  const { customerId, amount, paymentMethod, notes, user } = params;

  const tx = db.transaction(
    ['customers', 'customer_ledger', 'cashbook_sessions', 'cashbook_entries', 'audit_logs'],
    'readwrite'
  );

  const nowIso = new Date().toISOString();
  const custStore = tx.objectStore('customers');
  const customer: Customer | undefined = await custStore.get(customerId);
  if (!customer) throw new Error('Customer not found');

  customer.currentDue = Math.max(0, (customer.currentDue || 0) - amount);
  customer.updatedAt = nowIso;
  await custStore.put(customer);

  const custLedger: CustomerLedgerEntry = {
    id: `cle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerId: customer.id,
    date: nowIso,
    type: 'payment_received',
    amount: amount,
    balanceAfter: customer.currentDue,
    notes: notes || 'Due recovery payment',
    recordedBy: user.name,
  };
  await tx.objectStore('customer_ledger').put(custLedger);

  if (paymentMethod === 'cash') {
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    const openSession = allSessions.find((s) => s.status === 'open');

    if (openSession) {
      const cashEntry: CashbookEntry = {
        id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: openSession.id,
        date: nowIso,
        type: 'customer_payment',
        amount: amount,
        runningBalance: 0,
        paymentMethod: 'cash',
        referenceId: customer.id,
        description: `Customer payment received from ${customer.name}`,
        recordedBy: user.name,
      };
      await tx.objectStore('cashbook_entries').put(cashEntry);
    }
  }

  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'CUSTOMER_PAYMENT_RECEIVED',
    module: 'Customers',
    details: `Received PKR ${amount} from ${customer.name}. New Due: PKR ${customer.currentDue}`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
}

// ----------------- SUPPLIER PAYMENT TRANSACTION -----------------

export async function recordSupplierPaymentTransaction(params: {
  supplierId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  user: User;
}): Promise<void> {
  const db = await getDb();
  const { supplierId, amount, paymentMethod, notes, user } = params;

  const tx = db.transaction(
    ['suppliers', 'supplier_ledger', 'cashbook_sessions', 'cashbook_entries', 'audit_logs'],
    'readwrite'
  );

  const nowIso = new Date().toISOString();
  const supStore = tx.objectStore('suppliers');
  const supplier: Supplier | undefined = await supStore.get(supplierId);
  if (!supplier) throw new Error('Supplier not found');

  supplier.currentDue = Math.max(0, (supplier.currentDue || 0) - amount);
  await supStore.put(supplier);

  const supLedger: SupplierLedgerEntry = {
    id: `sle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    supplierId: supplier.id,
    date: nowIso,
    type: 'payment',
    amount: amount,
    balanceAfter: supplier.currentDue,
    notes: notes || 'Supplier payment disbursed',
    recordedBy: user.name,
  };
  await tx.objectStore('supplier_ledger').put(supLedger);

  if (paymentMethod === 'cash') {
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    const openSession = allSessions.find((s) => s.status === 'open');

    if (openSession) {
      const cashEntry: CashbookEntry = {
        id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: openSession.id,
        date: nowIso,
        type: 'supplier_payment',
        amount: -amount,
        runningBalance: 0,
        paymentMethod: 'cash',
        referenceId: supplier.id,
        description: `Disbursed supplier payment to ${supplier.name}`,
        recordedBy: user.name,
      };
      await tx.objectStore('cashbook_entries').put(cashEntry);
    }
  }

  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'SUPPLIER_PAYMENT_PAID',
    module: 'Purchases',
    details: `Paid PKR ${amount} to ${supplier.name}. New Supplier Balance: PKR ${supplier.currentDue}`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
}

// ----------------- STOCK ADJUSTMENT & WASTAGE -----------------

export async function recordStockAdjustmentOrWastage(params: {
  ingredientId: string;
  type: 'adjustment' | 'wastage';
  qtyChange: number; // positive or negative for adjustment; positive number for wastage quantity lost
  reason: string;
  user: User;
}): Promise<void> {
  const db = await getDb();
  const { ingredientId, type, qtyChange, reason, user } = params;

  const tx = db.transaction(['ingredients', 'inventory_ledger', 'wastage', 'audit_logs'], 'readwrite');
  const nowIso = new Date().toISOString();
  const ingStore = tx.objectStore('ingredients');
  const ing: Ingredient | undefined = await ingStore.get(ingredientId);
  if (!ing) throw new Error('Ingredient not found');

  const prevStock = ing.currentStock;
  let newStock = prevStock;

  if (type === 'wastage') {
    newStock = Math.max(0, Number((prevStock - Math.abs(qtyChange)).toFixed(3)));
    ing.currentStock = newStock;
    ing.updatedAt = nowIso;
    await ingStore.put(ing);

    const wasteRecord: WastageRecord = {
      id: `waste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: nowIso,
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: Math.abs(qtyChange),
      unit: ing.unit,
      unitCost: ing.unitCost,
      totalLoss: Number((Math.abs(qtyChange) * ing.unitCost).toFixed(2)),
      reason: reason,
      recordedBy: user.name,
    };
    await tx.objectStore('wastage').put(wasteRecord);

    const ledger: InventoryLedgerEntry = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: nowIso,
      ingredientId: ing.id,
      ingredientName: ing.name,
      movementType: 'wastage',
      changeQty: -Math.abs(qtyChange),
      previousStock: prevStock,
      newStock: newStock,
      unit: ing.unit,
      notes: `Wastage logged: ${reason}`,
      performedBy: user.name,
    };
    await tx.objectStore('inventory_ledger').put(ledger);
  } else {
    // Adjustment (can be +/-)
    newStock = Math.max(0, Number((prevStock + qtyChange).toFixed(3)));
    ing.currentStock = newStock;
    ing.updatedAt = nowIso;
    await ingStore.put(ing);

    const ledger: InventoryLedgerEntry = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: nowIso,
      ingredientId: ing.id,
      ingredientName: ing.name,
      movementType: 'adjustment',
      changeQty: qtyChange,
      previousStock: prevStock,
      newStock: newStock,
      unit: ing.unit,
      notes: `Manual adjustment: ${reason}`,
      performedBy: user.name,
    };
    await tx.objectStore('inventory_ledger').put(ledger);
  }

  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: type === 'wastage' ? 'WASTAGE_LOGGED' : 'STOCK_ADJUSTED',
    module: 'Inventory',
    details: `${ing.name}: ${qtyChange > 0 ? '+' : ''}${qtyChange} ${ing.unit}. Prev: ${prevStock}, New: ${newStock}. (${reason})`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
}

// ----------------- SALARY TRANSACTION -----------------

export async function recordSalaryPaymentTransaction(params: {
  paymentData: Omit<SalaryPayment, 'id'>;
  user: User;
}): Promise<SalaryPayment> {
  const db = await getDb();
  const { paymentData, user } = params;

  const tx = db.transaction(['salary_payments', 'expenses', 'cashbook_sessions', 'cashbook_entries', 'audit_logs'], 'readwrite');
  const nowIso = new Date().toISOString();
  const paymentId = `sal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payment: SalaryPayment = {
    ...paymentData,
    id: paymentId,
  };
  await tx.objectStore('salary_payments').put(payment);

  // Record as an expense also for profit/loss calculation
  const expenseId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const expense: Expense = {
    id: expenseId,
    date: payment.date,
    category: 'Salaries',
    amount: payment.amount,
    description: `Staff Salary (${payment.type === 'advance' ? 'Advance' : 'Monthly'}): ${payment.staffName} (${payment.month})`,
    paymentMethod: payment.paymentMethod,
    paidBy: user.name,
    createdAt: nowIso,
  };
  await tx.objectStore('expenses').put(expense);

  // Cashbook deduction
  if (payment.paymentMethod === 'cash') {
    const sessionsStore = tx.objectStore('cashbook_sessions');
    const allSessions: CashbookSession[] = await sessionsStore.getAll();
    const openSession = allSessions.find((s) => s.status === 'open');

    if (openSession) {
      const cashEntry: CashbookEntry = {
        id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: openSession.id,
        date: nowIso,
        type: 'salary_payment',
        amount: -payment.amount,
        runningBalance: 0,
        paymentMethod: 'cash',
        referenceId: payment.id,
        description: `Salary disbursed to ${payment.staffName} (${payment.month})`,
        recordedBy: user.name,
      };
      await tx.objectStore('cashbook_entries').put(cashEntry);
    }
  }

  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    userId: user.id,
    userName: user.name,
    action: 'SALARY_PAID',
    module: 'Staff',
    details: `Disbursed PKR ${payment.amount} to ${payment.staffName} (${payment.type})`,
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
  return payment;
}

// ----------------- FULL BACKUP & RESTORE -----------------

export async function exportDatabaseToJson(): Promise<string> {
  const db = await getDb();
  const stores = [
    'settings',
    'users',
    'categories',
    'products',
    'ingredients',
    'recipes',
    'orders',
    'held_orders',
    'inventory_ledger',
    'wastage',
    'suppliers',
    'purchases',
    'supplier_ledger',
    'customers',
    'customer_ledger',
    'expenses',
    'staff',
    'attendance',
    'salary_payments',
    'cashbook_sessions',
    'cashbook_entries',
    'audit_logs',
  ];

  const backupData: Record<string, any> = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    system: 'Tokyo Crunch POS',
  };

  for (const store of stores) {
    if (store === 'settings') {
      backupData[store] = await db.get('settings', 'current');
    } else {
      backupData[store] = await db.getAll(store);
    }
  }

  return JSON.stringify(backupData, null, 2);
}

export async function createAutoSnapshot(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const json = await exportDatabaseToJson();
    localStorage.setItem('tokyo_crunch_emergency_snapshot', json);
    localStorage.setItem('tokyo_crunch_emergency_snapshot_date', new Date().toISOString());
    return true;
  } catch (err) {
    console.warn('Auto snapshot failed:', err);
    return false;
  }
}

export async function getEmergencySnapshotMeta(): Promise<{ date: string | null; exists: boolean }> {
  if (typeof window === 'undefined') return { date: null, exists: false };
  const d = localStorage.getItem('tokyo_crunch_emergency_snapshot_date');
  return { date: d, exists: !!d };
}

export async function restoreEmergencySnapshot(user: User): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const json = localStorage.getItem('tokyo_crunch_emergency_snapshot');
  if (!json) throw new Error('No emergency snapshot found in local storage');
  return restoreDatabaseFromJson(json, user);
}

export async function getSystemStorageInfo(): Promise<{ isPersisted: boolean; usageMb: number; quotaMb: number }> {
  let isPersisted = false;
  let usageMb = 0;
  let quotaMb = 0;
  if (typeof window !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        usageMb = Math.round(((est.usage || 0) / (1024 * 1024)) * 10) / 10;
        quotaMb = Math.round(((est.quota || 0) / (1024 * 1024)) * 10) / 10;
      }
    } catch {}
  }
  return { isPersisted, usageMb, quotaMb };
}

export async function restoreDatabaseFromJson(jsonString: string, user: User): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.system || !data.exportVersion) {
      throw new Error('Invalid Tokyo Crunch backup file format');
    }

    const db = await getDb();
    const stores = [
      'users',
      'categories',
      'products',
      'ingredients',
      'recipes',
      'orders',
      'held_orders',
      'inventory_ledger',
      'wastage',
      'suppliers',
      'purchases',
      'supplier_ledger',
      'customers',
      'customer_ledger',
      'expenses',
      'staff',
      'attendance',
      'salary_payments',
      'cashbook_sessions',
      'cashbook_entries',
      'audit_logs',
    ];

    const tx = db.transaction([...stores, 'settings'], 'readwrite');

    if (data.settings) {
      await tx.objectStore('settings').put(data.settings, 'current');
    }

    for (const store of stores) {
      if (Array.isArray(data[store])) {
        await tx.objectStore(store).clear();
        for (const item of data[store]) {
          await tx.objectStore(store).put(item);
        }
      }
    }

    const audit: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      action: 'DATABASE_RESTORED',
      module: 'Settings',
      details: `Database restored from backup dated ${data.exportedAt || 'unknown'}`,
    };
    await tx.objectStore('audit_logs').put(audit);

    await tx.done;
    return true;
  } catch (err) {
    console.error('Failed to restore database', err);
    throw err;
  }
}

export async function resetDatabaseToDemo(user: User): Promise<void> {
  const db = await getDb();
  const stores = [
    'users',
    'categories',
    'products',
    'ingredients',
    'recipes',
    'orders',
    'held_orders',
    'inventory_ledger',
    'wastage',
    'suppliers',
    'purchases',
    'supplier_ledger',
    'customers',
    'customer_ledger',
    'expenses',
    'staff',
    'attendance',
    'salary_payments',
    'cashbook_sessions',
    'cashbook_entries',
    'audit_logs',
  ];

  const tx = db.transaction([...stores, 'settings'], 'readwrite');
  for (const s of stores) {
    await tx.objectStore(s).clear();
  }

  await tx.objectStore('settings').put(initialSettings, 'current');
  for (const u of initialUsers) await tx.objectStore('users').put(u);
  for (const c of initialCategories) await tx.objectStore('categories').put(c);
  for (const p of initialProducts) await tx.objectStore('products').put(p);
  for (const i of initialIngredients) await tx.objectStore('ingredients').put(i);
  for (const r of initialRecipes) await tx.objectStore('recipes').put(r);
  for (const s of initialSuppliers) await tx.objectStore('suppliers').put(s);
  for (const st of initialStaff) await tx.objectStore('staff').put(st);
  for (const cust of initialCustomers) await tx.objectStore('customers').put(cust);

  const initialSession: CashbookSession = {
    id: `cash-session-${Date.now()}`,
    sessionDate: new Date().toISOString().split('T')[0],
    openedAt: new Date().toISOString(),
    openingCash: 5000,
    status: 'open',
    openedBy: user.name,
    notes: 'Reset to initial factory data',
  };
  await tx.objectStore('cashbook_sessions').put(initialSession);

  const initialCashEntry: CashbookEntry = {
    id: `cbe-${Date.now()}`,
    sessionId: initialSession.id,
    date: new Date().toISOString(),
    type: 'opening_balance',
    amount: 5000,
    runningBalance: 5000,
    paymentMethod: 'cash',
    description: 'Opening register float',
    recordedBy: user.name,
  };
  await tx.objectStore('cashbook_entries').put(initialCashEntry);

  const audit: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    action: 'DATABASE_RESET',
    module: 'Settings',
    details: 'Database completely reset to clean Tokyo Crunch default catalog',
  };
  await tx.objectStore('audit_logs').put(audit);

  await tx.done;
}

// ----------------- CSV EXPORT UTILITY -----------------

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCsv = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
