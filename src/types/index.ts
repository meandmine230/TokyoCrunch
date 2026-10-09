export type UserRole = 'admin' | 'manager' | 'cashier' | 'kitchen';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface RestaurantSettings {
  name: string;
  tagline: string;
  location: string;
  phone: string;
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRatePercent: number;
  deliveryFeeDefault: number;
  orderNumberPrefix: string;
  nextOrderSequence: number;
  systemMode?: 'standalone_single_system' | 'live_cloud_ready';
  liveSyncEnabled?: boolean;
  liveSyncEndpoint?: string;
  liveSyncApiKey?: string;
  autoBackupEnabled?: boolean;
  lastBackupDate?: string;
  thermalPrinterWidth?: '80mm' | '58mm';
  thermalFontSize?: 'compact' | 'normal' | 'large';
  thermalCutFeedLines?: number;
  autoPrintReceiptOnCheckout?: boolean;
  autoPrintKotOnCheckout?: boolean;
  silentKioskPrintEnabled?: boolean;
}

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  iconName?: string;
}

export interface ProductVariant {
  name: string;
  price: number;
  actualCost?: number; // Owner's independent actual food costing
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  actualCost?: number; // Owner's independent actual food costing
  variants: ProductVariant[];
  addons: ProductAddon[];
  available: boolean;
  isPopular?: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'kg' | 'g' | 'litres' | 'ml' | 'pcs' | 'pack';
  currentStock: number;
  minStockAlert: number;
  unitCost: number; // Cost in PKR per unit
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  productId: string;
  variantName?: string; // If specific variant, otherwise default
  ingredientId: string;
  quantity: number; // in ingredient's unit
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'voided';
export type PaymentMethod = 'cash' | 'card' | 'online' | 'due';

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  addons: SelectedAddon[];
  itemTotal: number;
  unitCost?: number; // Raw material cost per unit in PKR
  totalCost?: number; // Total actual recipe cost (unitCost * quantity)
  profit?: number; // Net profit for this item (itemTotal - totalCost)
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  tableNumber?: string;
  status: OrderStatus;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryFee: number;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent?: number;
  taxAmount: number;
  total: number;
  totalCost?: number; // Total actual cost of goods sold (COGS) in PKR
  grossProfit?: number; // Revenue minus actual cost (total - tax - totalCost)
  netProfit?: number; // Net profit from this sale in PKR
  profitMarginPercent?: number; // Profit margin percentage (netProfit / netRevenue * 100)
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'partial' | 'due';
  paidAmount: number;
  dueAmount: number;
  cashierId: string;
  cashierName: string;
  notes?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface HeldOrder {
  id: string;
  heldAt: string;
  orderType: OrderType;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  discountAmount: number;
  deliveryFee: number;
  notes?: string;
}

export type StockMovementType = 'purchase' | 'sale' | 'wastage' | 'adjustment' | 'return';

export interface InventoryLedgerEntry {
  id: string;
  date: string;
  ingredientId: string;
  ingredientName: string;
  movementType: StockMovementType;
  changeQty: number; // positive or negative
  previousStock: number;
  newStock: number;
  unit: string;
  referenceId?: string; // orderId, purchaseInvoiceId, wastageId
  notes?: string;
  performedBy: string;
}

export interface WastageRecord {
  id: string;
  date: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalLoss: number;
  reason: string;
  recordedBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  company: string;
  address?: string;
  currentDue: number;
  createdAt: string;
}

export interface PurchaseItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  date: string;
  type: 'purchase_invoice' | 'payment';
  referenceId?: string;
  amount: number;
  balanceAfter: number;
  notes?: string;
  recordedBy: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  currentDue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'order_sale' | 'payment_received';
  referenceId?: string;
  amount: number;
  balanceAfter: number;
  notes?: string;
  recordedBy: string;
}

export type ExpenseCategory = 
  | 'Rent'
  | 'Utilities'
  | 'Gas & Electricity'
  | 'Packaging'
  | 'Cleaning & Sanitation'
  | 'Maintenance'
  | 'Marketing'
  | 'Salaries'
  | 'Misc';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  paidBy: string;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'Cashier' | 'Head Chef' | 'Kitchen Assistant' | 'Manager' | 'Rider' | 'Cleaner';
  phone: string;
  salary: number; // monthly salary OR daily wage amount
  salaryType?: 'monthly' | 'daily'; // 'monthly' (default) or 'daily'
  joinDate: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'half_day' | 'leave';
  notes?: string;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  month: string; // e.g. "September 2026"
  type: 'monthly_salary' | 'daily_wage' | 'advance';
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  paidBy: string;
}

export interface CashbookSession {
  id: string;
  sessionDate: string; // YYYY-MM-DD
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedClosingCash?: number;
  actualClosingCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  openedBy: string;
  closedBy?: string;
  notes?: string;
}

export type CashbookEntryType = 
  | 'opening_balance'
  | 'pos_sale'
  | 'customer_payment'
  | 'capital_added'
  | 'purchase_payment'
  | 'supplier_payment'
  | 'expense'
  | 'salary_payment'
  | 'cash_drop'
  | 'closing_balance';

export interface CashbookEntry {
  id: string;
  sessionId: string;
  date: string; // ISO
  type: CashbookEntryType;
  amount: number; // positive for cash in, negative for cash out
  runningBalance: number;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  description: string;
  recordedBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
}
