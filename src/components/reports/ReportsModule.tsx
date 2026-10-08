import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Order,
  Expense,
  Ingredient,
  PurchaseInvoice,
  Customer,
  Supplier,
  WastageRecord,
  RecipeItem,
  CashbookSession,
  CashbookEntry,
} from '../../types';
import {
  getAllFromStore,
  downloadCsv,
  calculateOrderCostAndProfit,
} from '../../db/indexedDB';
import {
  BarChart3,
  Calendar,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Package,
  Clock,
  Receipt,
  Eye,
  Coins,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
} from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { settings, showToast, triggerPrintReport, dataVersion, setActiveTab } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [wastage, setWastage] = useState<WastageRecord[]>([]);
  const [cashSessions, setCashSessions] = useState<CashbookSession[]>([]);
  const [cashEntries, setCashEntries] = useState<CashbookEntry[]>([]);

  // Filters
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');
  const [activeReportTab, setActiveReportTab] = useState<
    'sales' | 'day_closing' | 'pnl' | 'products' | 'payments' | 'expenses' | 'inventory' | 'dues' | 'voids'
  >('sales');

  // Day Closing Date Selector (Defaults to today)
  const [closingDate, setClosingDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal for inspecting individual order cost & profit
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loadAllReportData = async () => {
      try {
        const [o, exp, ings, recs, purs, custs, sups, waste, sessions, entries] = await Promise.all([
          getAllFromStore<Order>('orders'),
          getAllFromStore<Expense>('expenses'),
          getAllFromStore<Ingredient>('ingredients'),
          getAllFromStore<RecipeItem>('recipes'),
          getAllFromStore<PurchaseInvoice>('purchases'),
          getAllFromStore<Customer>('customers'),
          getAllFromStore<Supplier>('suppliers'),
          getAllFromStore<WastageRecord>('wastage'),
          getAllFromStore<CashbookSession>('cashbook_sessions'),
          getAllFromStore<CashbookEntry>('cashbook_entries'),
        ]);

        setOrders(o);
        setExpenses(exp);
        setIngredients(ings);
        setRecipes(recs);
        setPurchases(purs);
        setCustomers(custs);
        setSuppliers(sups);
        setWastage(waste);
        setCashSessions(sessions);
        setCashEntries(entries);
      } catch (err) {
        console.error('Failed to load reports data', err);
      }
    };
    loadAllReportData();
  }, [dataVersion]);

  // Date Filtering Logic
  const { startDate, endDate, labelRange } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let label = 'Current Month';

    if (timeFilter === 'today') {
      label = 'Today';
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeFilter === 'yesterday') {
      label = 'Yesterday';
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (timeFilter === 'week') {
      label = 'Last 7 Days';
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'month') {
      label = 'This Month';
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      label = 'All Time';
      start = new Date(2025, 0, 1);
    }

    return { startDate: start, endDate: end, labelRange: label };
  }, [timeFilter]);

  // Filtered Collections
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });
  }, [orders, startDate, endDate]);

  const validSalesOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status !== 'voided');
  }, [filteredOrders]);

  const voidedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'voided');
  }, [filteredOrders]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // Calculations
  const grossSales = useMemo(() => {
    return validSalesOrders.reduce((sum, o) => sum + o.total, 0);
  }, [validSalesOrders]);

  const totalDiscounts = useMemo(() => {
    return validSalesOrders.reduce((sum, o) => sum + o.discountAmount, 0);
  }, [validSalesOrders]);

  const totalDeliveryFees = useMemo(() => {
    return validSalesOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  }, [validSalesOrders]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Financial cost & profit calculator for any order (saved or dynamic fallback)
  const getOrderFinancials = (order: Order) => {
    if (order.totalCost !== undefined && order.netProfit !== undefined) {
      const cost = order.totalCost;
      const profit = order.netProfit;
      const margin =
        order.profitMarginPercent ??
        (order.total > 0 ? Number(((profit / order.total) * 100).toFixed(1)) : 0);
      return { cost, profit, margin };
    }
    const analysis = calculateOrderCostAndProfit(
      order.items,
      order.total,
      order.taxAmount || 0,
      recipes,
      ingredients
    );
    return {
      cost: analysis.totalCost,
      profit: analysis.netProfit,
      margin: analysis.profitMarginPercent,
    };
  };

  // Precise total actual cost (COGS) and net profit across valid sales orders
  const totalSalesCost = useMemo(() => {
    return Number(
      validSalesOrders.reduce((sum, o) => sum + getOrderFinancials(o).cost, 0).toFixed(2)
    );
  }, [validSalesOrders, recipes, ingredients]);

  const totalSalesProfit = useMemo(() => {
    return Number(
      validSalesOrders.reduce((sum, o) => sum + getOrderFinancials(o).profit, 0).toFixed(2)
    );
  }, [validSalesOrders, recipes, ingredients]);

  const totalSalesMargin = useMemo(() => {
    return grossSales > 0 ? Number(((totalSalesProfit / grossSales) * 100).toFixed(1)) : 0;
  }, [grossSales, totalSalesProfit]);

  // Backward-compatible COGS and Profit metrics
  const estimatedCogs = totalSalesCost;
  const grossProfit = totalSalesProfit;
  const netOperatingProfit = Number((grossProfit - totalExpenses).toFixed(2));

  // Day Closing Analysis for selected date (closingDate)
  const dayClosingData = useMemo(() => {
    const dayOrders = orders.filter(
      (o) => o.createdAt.startsWith(closingDate) && o.status !== 'voided'
    );
    const dayExpenses = expenses.filter((e) => e.date.startsWith(closingDate));
    const dayVoided = orders.filter(
      (o) => o.createdAt.startsWith(closingDate) && o.status === 'voided'
    );

    const dayGrossSales = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const dayDiscounts = dayOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const dayDeliveryFees = dayOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    let dayCogs = 0;
    for (const o of dayOrders) {
      dayCogs += getOrderFinancials(o).cost;
    }
    dayCogs = Number(dayCogs.toFixed(2));

    const dayGrossProfit = Number((dayGrossSales - dayCogs).toFixed(2));
    const dayMarginPercent =
      dayGrossSales > 0 ? Number(((dayGrossProfit / dayGrossSales) * 100).toFixed(1)) : 0;

    const dayExpensesTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const dayNetProfit = Number((dayGrossProfit - dayExpensesTotal).toFixed(2));

    // Payments for that day
    const payments: Record<string, number> = { cash: 0, card: 0, online: 0, due: 0 };
    for (const o of dayOrders) {
      payments[o.paymentMethod] = (payments[o.paymentMethod] || 0) + o.total;
    }

    // Cash register session for that date
    const session = cashSessions.find((s) => s.sessionDate === closingDate) || null;
    const sessionEntries = session
      ? cashEntries.filter((e) => e.sessionId === session.id)
      : cashEntries.filter((e) => e.date.startsWith(closingDate));

    let cashIn = 0;
    let cashOut = 0;
    for (const e of sessionEntries) {
      if (e.amount > 0) cashIn += e.amount;
      else cashOut += Math.abs(e.amount);
    }

    // Item performance on this day
    const itemMap: Record<
      string,
      { name: string; qty: number; revenue: number; cost: number; profit: number }
    > = {};
    for (const o of dayOrders) {
      for (const it of o.items) {
        if (!itemMap[it.productId]) {
          itemMap[it.productId] = { name: it.productName, qty: 0, revenue: 0, cost: 0, profit: 0 };
        }
        itemMap[it.productId].qty += it.quantity;
        itemMap[it.productId].revenue += it.itemTotal;
        const itCost = it.totalCost ?? (it.unitCost ? it.unitCost * it.quantity : 0);
        itemMap[it.productId].cost += itCost;
        itemMap[it.productId].profit += it.profit ?? (it.itemTotal - itCost);
      }
    }
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty);

    return {
      orderCount: dayOrders.length,
      voidCount: dayVoided.length,
      grossSales: dayGrossSales,
      discounts: dayDiscounts,
      deliveryFees: dayDeliveryFees,
      totalCogs: dayCogs,
      salesGrossProfit: dayGrossProfit,
      salesMarginPercent: dayMarginPercent,
      totalExpenses: dayExpensesTotal,
      netProfit: dayNetProfit,
      payments,
      session,
      cashIn,
      cashOut,
      expectedCash: (session?.openingCash || 0) + cashIn - cashOut,
      topItems,
      dayExpenses,
    };
  }, [closingDate, orders, expenses, cashSessions, cashEntries, recipes, ingredients]);

  // Product sales breakdown
  const productPerformance = useMemo(() => {
    const map: Record<
      string,
      { name: string; qty: number; totalRev: number; totalCost: number; totalProfit: number }
    > = {};
    for (const o of validSalesOrders) {
      for (const it of o.items) {
        if (!map[it.productId]) {
          map[it.productId] = {
            name: it.productName,
            qty: 0,
            totalRev: 0,
            totalCost: 0,
            totalProfit: 0,
          };
        }
        map[it.productId].qty += it.quantity;
        map[it.productId].totalRev += it.itemTotal;
        const itCost = it.totalCost ?? (it.unitCost ? it.unitCost * it.quantity : 0);
        map[it.productId].totalCost += itCost;
        map[it.productId].totalProfit += it.profit ?? (it.itemTotal - itCost);
      }
    }
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [validSalesOrders]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { cash: 0, card: 0, online: 0, due: 0 };
    for (const o of validSalesOrders) {
      map[o.paymentMethod] = (map[o.paymentMethod] || 0) + o.total;
    }
    return map;
  }, [validSalesOrders]);

  // Expense breakdown
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredExpenses) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return map;
  }, [filteredExpenses]);

  // Stock inventory valuation
  const inventoryValuation = useMemo(() => {
    return ingredients.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0);
  }, [ingredients]);

  // Print Report Handler
  const handlePrintCurrentReport = () => {
    let title = 'Sales Performance Report';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeReportTab === 'sales') {
      title = 'Sales, Cost & Net Profit Audit Log';
      headers = [
        'Order #',
        'Date & Time',
        'Type',
        'Customer',
        'Channel',
        'Gross Total',
        'Food Cost (COGS)',
        'Net Profit',
        'Margin %',
      ];
      rows = validSalesOrders.map((o) => {
        const fin = getOrderFinancials(o);
        return [
          o.orderNumber,
          new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
          o.type.toUpperCase(),
          o.customerName || 'Walk-in',
          o.paymentMethod.toUpperCase(),
          `${settings.currency} ${o.total.toLocaleString()}`,
          `${settings.currency} ${fin.cost.toLocaleString()}`,
          `+${settings.currency} ${fin.profit.toLocaleString()}`,
          `${fin.margin}%`,
        ];
      });
    } else if (activeReportTab === 'day_closing') {
      title = `Restaurant Day Closing Z-Report (${closingDate})`;
      headers = ['Category / Item', 'Amount in PKR', 'Details / Audit Notes'];
      rows = [
        ['Gross Sales Revenue', `${settings.currency} ${dayClosingData.grossSales.toLocaleString()}`, `${dayClosingData.orderCount} orders completed`],
        ['Discounts Given', `-${settings.currency} ${dayClosingData.discounts.toLocaleString()}`, 'Promotional deductions'],
        ['Delivery Charges Collected', `+${settings.currency} ${dayClosingData.deliveryFees.toLocaleString()}`, 'Rider dispatch service fees'],
        ['Actual Raw Food Cost (COGS)', `-${settings.currency} ${dayClosingData.totalCogs.toLocaleString()}`, 'Ingredients consumed based on BOM recipes'],
        ['SALES GROSS PROFIT', `${settings.currency} ${dayClosingData.salesGrossProfit.toLocaleString()}`, `${dayClosingData.salesMarginPercent}% gross margin`],
        ['Day Operating Expenses', `-${settings.currency} ${dayClosingData.totalExpenses.toLocaleString()}`, `${dayClosingData.dayExpenses.length} operational expense entries`],
        ['NET RESTAURANT PROFIT', `${settings.currency} ${dayClosingData.netProfit.toLocaleString()}`, 'Bottom line profit for the day after expenses'],
        ['Register Opening Float', `${settings.currency} ${(dayClosingData.session?.openingCash || 0).toLocaleString()}`, 'Opening float recorded at register start'],
        ['Expected Closing Cash', `${settings.currency} ${dayClosingData.expectedCash.toLocaleString()}`, 'Float + Cash In - Cash Out'],
        ['Counted Physical Cash', dayClosingData.session?.actualClosingCash !== undefined ? `${settings.currency} ${dayClosingData.session.actualClosingCash.toLocaleString()}` : 'Register open', 'Physical cash counted on closing'],
        ['Cash Difference', dayClosingData.session?.cashDifference !== undefined ? `${dayClosingData.session.cashDifference > 0 ? '+' : ''}${settings.currency} ${dayClosingData.session.cashDifference.toLocaleString()}` : '0', 'Variance between system and counted cash'],
      ];
    } else if (activeReportTab === 'products') {
      title = 'Product Sales, Cost & Profit Analysis';
      headers = ['Menu Item', 'Qty Sold', 'Revenue', 'Actual Cost', 'Net Profit'];
      rows = productPerformance.map((p) => [
        p.name,
        p.qty,
        `${settings.currency} ${p.totalRev.toLocaleString()}`,
        `${settings.currency} ${Math.round(p.totalCost).toLocaleString()}`,
        `${settings.currency} ${Math.round(p.totalProfit).toLocaleString()}`,
      ]);
    } else if (activeReportTab === 'pnl') {
      title = 'Profit & Loss Statement (P&L)';
      headers = ['Accounting Line Item', 'Amount in PKR', 'Details'];
      rows = [
        ['Gross Sales (POS Invoices)', `${settings.currency} ${grossSales.toLocaleString()}`, 'Total revenue from customer orders'],
        ['Cost of Goods Sold (COGS)', `-${settings.currency} ${estimatedCogs.toLocaleString()}`, 'Raw food ingredients consumption from recipes'],
        ['Gross Profit Margin', `${settings.currency} ${grossProfit.toLocaleString()}`, `${grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0}% Gross Margin`],
        ['Total Operational Expenses', `-${settings.currency} ${totalExpenses.toLocaleString()}`, 'Rent, utilities, salaries, maintenance'],
        ['NET OPERATING PROFIT', `${settings.currency} ${netOperatingProfit.toLocaleString()}`, 'Bottom line profit before taxes'],
      ];
    } else if (activeReportTab === 'expenses') {
      title = 'Expense Expenditure Breakdown';
      headers = ['Date', 'Category', 'Description', 'Channel', 'Amount'];
      rows = filteredExpenses.map((e) => [
        e.date,
        e.category,
        e.description,
        e.paymentMethod,
        `${settings.currency} ${e.amount.toLocaleString()}`,
      ]);
    } else if (activeReportTab === 'dues') {
      title = 'Customer & Supplier Receivables / Payables';
      headers = ['Entity', 'Party Name', 'Phone', 'Current Balance Due'];
      rows = [
        ...customers.filter((c) => c.currentDue > 0).map((c) => [
          'Customer (Receivable)',
          c.name,
          c.phone,
          `${settings.currency} ${c.currentDue.toLocaleString()}`,
        ]),
        ...suppliers.filter((s) => s.currentDue > 0).map((s) => [
          'Supplier (Payable)',
          s.name,
          s.phone,
          `${settings.currency} ${s.currentDue.toLocaleString()}`,
        ]),
      ];
    } else if (activeReportTab === 'voids') {
      title = 'Voided & Cancelled Orders Audit';
      headers = ['Order #', 'Date', 'Type', 'Amount', 'Reason'];
      rows = voidedOrders.map((v) => [
        v.orderNumber,
        new Date(v.createdAt).toLocaleDateString(),
        v.type.toUpperCase(),
        `${settings.currency} ${v.total.toLocaleString()}`,
        v.voidReason || 'No reason specified',
      ]);
    }

    triggerPrintReport({
      title,
      dateRange: activeReportTab === 'day_closing' ? closingDate : labelRange,
      headers,
      rows,
      summary:
        activeReportTab === 'day_closing'
          ? [
              { label: 'Day Sales', value: `${settings.currency} ${dayClosingData.grossSales.toLocaleString()}` },
              { label: 'Day Food Cost', value: `${settings.currency} ${dayClosingData.totalCogs.toLocaleString()}` },
              { label: 'Day Expenses', value: `${settings.currency} ${dayClosingData.totalExpenses.toLocaleString()}` },
              { label: 'Net Profit', value: `${settings.currency} ${dayClosingData.netProfit.toLocaleString()}` },
            ]
          : [
              { label: 'Gross Sales', value: `${settings.currency} ${grossSales.toLocaleString()}` },
              { label: 'Food Cost (COGS)', value: `${settings.currency} ${estimatedCogs.toLocaleString()}` },
              { label: 'Net Sales Profit', value: `${settings.currency} ${grossProfit.toLocaleString()}` },
              { label: 'Total Orders', value: validSalesOrders.length },
            ],
    });
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeReportTab === 'sales') {
      headers = [
        'OrderNumber',
        'Date',
        'Type',
        'Customer',
        'PaymentMethod',
        'GrossTotal',
        'ActualCost',
        'NetProfit',
        'MarginPercent',
      ];
      rows = validSalesOrders.map((o) => {
        const fin = getOrderFinancials(o);
        return [
          o.orderNumber,
          o.createdAt,
          o.type,
          o.customerName || 'Walk-in',
          o.paymentMethod,
          o.total,
          fin.cost,
          fin.profit,
          `${fin.margin}%`,
        ];
      });
    } else if (activeReportTab === 'day_closing') {
      headers = ['Category', 'Amount', 'AuditNotes'];
      rows = [
        ['Date', closingDate, 'Closing Date'],
        ['Gross Sales', dayClosingData.grossSales, `${dayClosingData.orderCount} Orders`],
        ['Discounts', dayClosingData.discounts, 'Promotions'],
        ['Delivery Fees', dayClosingData.deliveryFees, 'Rider Fees'],
        ['Actual Food Cost (COGS)', dayClosingData.totalCogs, 'Recipe Raw Cost'],
        ['Sales Gross Profit', dayClosingData.salesGrossProfit, `${dayClosingData.salesMarginPercent}% Margin`],
        ['Day Operating Expenses', dayClosingData.totalExpenses, 'Expenses'],
        ['Net Restaurant Profit', dayClosingData.netProfit, 'Bottom Line'],
        ['Opening Cash Float', dayClosingData.session?.openingCash || 0, 'Register Float'],
        ['Expected Drawer Cash', dayClosingData.expectedCash, 'System Expected'],
        ['Counted Cash', dayClosingData.session?.actualClosingCash || 0, 'Physical Cash'],
      ];
    } else if (activeReportTab === 'products') {
      headers = ['Product', 'QuantitySold', 'TotalRevenue', 'TotalCost', 'TotalProfit'];
      rows = productPerformance.map((p) => [
        p.name,
        p.qty,
        p.totalRev,
        Math.round(p.totalCost),
        Math.round(p.totalProfit),
      ]);
    } else if (activeReportTab === 'expenses') {
      headers = ['Date', 'Category', 'Description', 'Amount', 'PaymentMethod', 'PaidBy'];
      rows = filteredExpenses.map((e) => [
        e.date,
        e.category,
        e.description,
        e.amount,
        e.paymentMethod,
        e.paidBy,
      ]);
    } else {
      headers = ['Line', 'Amount'];
      rows = [
        ['Gross Sales', grossSales],
        ['Estimated COGS', estimatedCogs],
        ['Gross Profit', grossProfit],
        ['Total Expenses', totalExpenses],
        ['Net Profit', netOperatingProfit],
      ];
    }

    downloadCsv(
      `Tokyo_Crunch_${activeReportTab}_Report_${activeReportTab === 'day_closing' ? closingDate : timeFilter}`,
      headers,
      rows
    );
    showToast('Report data exported to CSV', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Reports & Financial Analytics</h2>
            <p className="text-[11px] text-zinc-400">
              Audit-grade sales logs, P&L profit estimates, ingredient usage & dues aging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Filter Tabs */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            {(['today', 'yesterday', 'week', 'month', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all ${
                  timeFilter === t
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrintCurrentReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Module Navigation Bar */}
      <div className="p-2.5 bg-[#141417] border-b border-zinc-800/80 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        {[
          { id: 'sales', label: 'Sales & Profit Summary', icon: TrendingUp },
          { id: 'day_closing', label: 'Day Closing (Z-Report)', icon: Clock, badge: 'End of Day' },
          { id: 'pnl', label: 'Profit & Loss (P&L)', icon: DollarSign },
          { id: 'products', label: 'Product Sales & Cost', icon: Package },
          { id: 'payments', label: 'Payment Channels', icon: Coins },
          { id: 'expenses', label: 'Expenses', icon: RotateCcw },
          { id: 'inventory', label: 'Stock Valuation', icon: Layers },
          { id: 'dues', label: 'Dues Aging', icon: AlertTriangle },
          { id: 'voids', label: 'Cancelled Orders', icon: X },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeReportTab === tab.id
                ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeReportTab === tab.id ? 'text-[#FF6B00]' : 'text-zinc-400'}`} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF6B00] text-white font-bold uppercase tracking-tight">
                {tab.badge}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => setActiveTab('profit-analysis')}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF6B00] border border-[#FF6B00]/30 shrink-0"
          title="Open Menu Profit Analysis dashboard view"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Menu Profit Analysis (COGS) →</span>
        </button>
      </div>

      {/* Report Content Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* ---------------- SUBTAB 1: SALES & PROFIT SUMMARY ---------------- */}
        {activeReportTab === 'sales' && (
          <div className="space-y-4">
            {/* 4 Summary Financial Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                  Gross Sales Revenue
                </span>
                <span className="font-mono text-xl font-black text-white mt-1 block">
                  {settings.currency} {grossSales.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {validSalesOrders.length} Completed Orders
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                  Actual Food Cost (COGS)
                </span>
                <span className="font-mono text-xl font-bold text-amber-400 mt-1 block">
                  {settings.currency} {totalSalesCost.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Raw ingredients BOM consumed
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                  Net Sales Profit
                </span>
                <span className="font-mono text-xl font-bold text-emerald-400 mt-1 block">
                  +{settings.currency} {totalSalesProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-500 mt-0.5 block">
                  +{totalSalesMargin}% Gross Margin
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                  Avg Ticket Size
                </span>
                <span className="font-mono text-xl font-bold text-[#FF6B00] mt-1 block">
                  {settings.currency}{' '}
                  {validSalesOrders.length > 0
                    ? Math.round(grossSales / validSalesOrders.length).toLocaleString()
                    : 0}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Per customer spend</span>
              </div>
            </div>

            {/* Table of Orders with Cost, Profit & Inspect Action */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3 bg-zinc-950/60 border-b border-zinc-800 flex justify-between items-center">
                <span className="font-bold text-xs text-white">
                  Sales Ledger with Actual Food Cost & Net Profit
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {validSalesOrders.length} Transactions Recorded
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[700px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/40">
                      <th className="py-2.5 px-3 font-semibold">Order #</th>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-2 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Customer</th>
                      <th className="py-2.5 px-2 font-semibold">Channel</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Sale Total</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-400">Actual Cost</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">Net Profit</th>
                      <th className="py-2.5 px-2 text-center font-semibold">Margin</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {validSalesOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-zinc-500 italic font-sans">
                          No sales recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      validSalesOrders.map((o) => {
                        const fin = getOrderFinancials(o);
                        return (
                          <tr key={o.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-white">#{o.orderNumber}</td>
                            <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                              {new Date(o.createdAt).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="py-2.5 px-2 uppercase text-zinc-300 font-semibold text-[10px]">
                              {o.type.replace('_', ' ')}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-white truncate max-w-[120px]">
                              {o.customerName || 'Walk-in'}
                            </td>
                            <td className="py-2.5 px-2 capitalize text-zinc-400">{o.paymentMethod}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              {settings.currency} {o.total.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                              {settings.currency} {fin.cost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                              +{settings.currency} {fin.profit.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-800/40 text-[10px]">
                                {fin.margin}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => setInspectedOrder(o)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 mx-auto transition-colors text-[10px]"
                                title="View recipe cost & profit breakdown"
                              >
                                <Eye className="w-3 h-3 text-[#FF6B00]" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SUBTAB 2: RESTAURANT DAY CLOSING (Z-REPORT) ---------------- */}
        {activeReportTab === 'day_closing' && (
          <div className="space-y-4">
            {/* Closing Date Header & Quick Selector */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="font-extrabold text-base text-white">
                    End-of-Day Restaurant Closing & Net Profit Report (Z-Report)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Audit Certified
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Review total sales revenue, actual raw ingredient costs (COGS), operational expenses, and net profit before locking the register.
                </p>
              </div>

              {/* Date Chooser Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setClosingDate(new Date().toISOString().split('T')[0])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    closingDate === new Date().toISOString().split('T')[0]
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setClosingDate(y.toISOString().split('T')[0]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    (() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      return closingDate === y.toISOString().split('T')[0];
                    })()
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white font-mono focus:outline-none focus:border-[#FF6B00]"
                />
                <button
                  onClick={handlePrintCurrentReport}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Z-Report</span>
                </button>
              </div>
            </div>

            {/* 5 Primary Financial Closing Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Card 1: Gross Sales */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                  1. Gross Sales Revenue
                </span>
                <span className="font-mono text-xl font-black text-white mt-1 block">
                  {settings.currency} {dayClosingData.grossSales.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {dayClosingData.orderCount} orders completed
                </span>
              </div>

              {/* Card 2: Actual Food Cost */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                  2. Actual Food Cost (COGS)
                </span>
                <span className="font-mono text-xl font-black text-amber-400 mt-1 block">
                  -{settings.currency} {dayClosingData.totalCogs.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Raw ingredients consumed
                </span>
              </div>

              {/* Card 3: Sales Gross Profit */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                  3. Sales Gross Profit
                </span>
                <span className="font-mono text-xl font-black text-emerald-400 mt-1 block">
                  +{settings.currency} {dayClosingData.salesGrossProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-500 mt-0.5 block">
                  {dayClosingData.salesMarginPercent}% gross margin
                </span>
              </div>

              {/* Card 4: Day Expenses */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-red-400 uppercase font-semibold block">
                  4. Day Operating Expenses
                </span>
                <span className="font-mono text-xl font-black text-red-400 mt-1 block">
                  -{settings.currency} {dayClosingData.totalExpenses.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {dayClosingData.dayExpenses.length} expense entries
                </span>
              </div>

              {/* Card 5: Net Profit After Closing */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  dayClosingData.netProfit >= 0
                    ? 'bg-emerald-950/40 border-emerald-700/60'
                    : 'bg-red-950/40 border-red-700/60'
                }`}
              >
                <span className="text-[10px] text-zinc-300 uppercase font-bold block">
                  5. Net Restaurant Profit
                </span>
                <span
                  className={`font-mono text-xl font-black mt-1 block ${
                    dayClosingData.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {settings.currency} {dayClosingData.netProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Final profit after all costs
                </span>
              </div>
            </div>

            {/* Reconciliation Split: Cash Register Drawer + Payment Channels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cash Register Reconciliation */}
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-sm text-white">Cash Register Drawer Reconciliation</h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      dayClosingData.session?.status === 'closed'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {dayClosingData.session
                      ? `Session ${dayClosingData.session.status.toUpperCase()}`
                      : 'No Session Logged'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Opening Register Float:</span>
                    <span className="text-white font-bold">
                      {settings.currency} {(dayClosingData.session?.openingCash || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Cash Sales & Injections (Cash In):</span>
                    <span className="text-emerald-400 font-bold">
                      +{settings.currency} {dayClosingData.cashIn.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Cash Expenses & Payouts (Cash Out):</span>
                    <span className="text-red-400 font-bold">
                      -{settings.currency} {dayClosingData.cashOut.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-2 border-t border-zinc-800">
                    <span>Expected Cash in Drawer:</span>
                    <span className="text-amber-400">
                      {settings.currency} {dayClosingData.expectedCash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Physical Counted Cash:</span>
                    <span className="text-white font-bold">
                      {dayClosingData.session?.actualClosingCash !== undefined
                        ? `${settings.currency} ${dayClosingData.session.actualClosingCash.toLocaleString()}`
                        : 'Register currently active'}
                    </span>
                  </div>
                  {dayClosingData.session?.cashDifference !== undefined && (
                    <div className="flex justify-between font-bold pt-1 border-t border-dashed border-zinc-800">
                      <span>Cash Difference (Over / Short):</span>
                      <span
                        className={
                          dayClosingData.session.cashDifference >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }
                      >
                        {dayClosingData.session.cashDifference > 0 ? '+' : ''}
                        {settings.currency} {dayClosingData.session.cashDifference.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Channels Split */}
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#FF6B00]" />
                    <h4 className="font-bold text-sm text-white">Payment Channels on {closingDate}</h4>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    Total: {settings.currency} {dayClosingData.grossSales.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                      Cash Sales
                    </span>
                    <span className="font-mono text-base font-extrabold text-white mt-1 block">
                      {settings.currency} {dayClosingData.payments.cash.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                      Card / POS
                    </span>
                    <span className="font-mono text-base font-extrabold text-blue-400 mt-1 block">
                      {settings.currency} {dayClosingData.payments.card.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                      Online / Bank
                    </span>
                    <span className="font-mono text-base font-extrabold text-purple-400 mt-1 block">
                      {settings.currency} {dayClosingData.payments.online.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                      Customer Credit (Due)
                    </span>
                    <span className="font-mono text-base font-extrabold text-red-400 mt-1 block">
                      {settings.currency} {dayClosingData.payments.due.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items Sold Today with Actual Cost & Profit */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3 bg-zinc-950/60 border-b border-zinc-800 flex justify-between items-center">
                <span className="font-bold text-xs text-white">
                  Menu Items Sold on {closingDate} (Profit & Cost Breakdown)
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {dayClosingData.topItems.length} unique products sold
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[650px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/40">
                      <th className="py-2.5 px-4 font-semibold">Product Name</th>
                      <th className="py-2.5 px-3 font-semibold">Qty Sold</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Revenue</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-400">
                        Actual Food Cost
                      </th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                        Net Profit
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {dayClosingData.topItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 italic font-sans">
                          No products sold on this closing date.
                        </td>
                      </tr>
                    ) : (
                      dayClosingData.topItems.map((item, idx) => {
                        const itemMargin =
                          item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;
                        return (
                          <tr key={idx} className="hover:bg-zinc-800/30">
                            <td className="py-2.5 px-4 font-sans font-bold text-white">{item.name}</td>
                            <td className="py-2.5 px-3 text-[#FF6B00] font-bold">{item.qty}</td>
                            <td className="py-2.5 px-3 text-right text-white">
                              {settings.currency} {item.revenue.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                              {settings.currency} {Math.round(item.cost).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                              +{settings.currency} {Math.round(item.profit).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 font-bold border border-emerald-800/50">
                                {itemMargin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SUBTAB: PROFIT & LOSS ESTIMATE ---------------- */}
        {activeReportTab === 'pnl' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
              <h3 className="font-extrabold text-sm text-white border-b border-zinc-800 pb-2 mb-3">
                Profit & Loss Statement ({labelRange})
              </h3>

              <div className="space-y-3 text-xs font-mono">
                {/* Revenue */}
                <div className="flex justify-between items-center text-white pb-2 border-b border-zinc-800">
                  <span className="font-bold text-sm">Gross Sales Revenue:</span>
                  <span className="font-black text-base text-white">
                    {settings.currency} {grossSales.toLocaleString()}
                  </span>
                </div>

                {/* COGS */}
                <div className="flex justify-between items-center text-amber-400">
                  <span>Less: Cost of Goods Sold (Raw Ingredients BOM):</span>
                  <span>-{settings.currency} {estimatedCogs.toLocaleString()}</span>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between items-center text-emerald-400 font-bold pt-2 border-t border-dashed border-zinc-800">
                  <span>GROSS PROFIT:</span>
                  <span>{settings.currency} {grossProfit.toLocaleString()}</span>
                </div>

                {/* Operating Expenses */}
                <div className="pt-2">
                  <span className="font-sans font-bold text-zinc-400 block mb-1">
                    Operating Expenses:
                  </span>
                  {Object.entries(expenseByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-zinc-400 py-0.5 pl-3">
                      <span>• {cat}:</span>
                      <span>-{settings.currency} {amt.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-red-400 font-semibold pt-1 border-t border-zinc-800">
                    <span>Total Operational Expenses:</span>
                    <span>-{settings.currency} {totalExpenses.toLocaleString()}</span>
                  </div>
                </div>

                {/* Net Operating Profit */}
                <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-zinc-400 block uppercase">
                      Net Estimated Operating Profit
                    </span>
                    <span className="text-[10px] text-zinc-500 font-sans">
                      (Revenue - Raw Cost - Expenses)
                    </span>
                  </div>
                  <span
                    className={`text-2xl font-black ${
                      netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {settings.currency} {netOperatingProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SUBTAB: PRODUCT SALES ---------------- */}
        {activeReportTab === 'products' && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-2.5 px-4 font-semibold">Rank</th>
                  <th className="py-2.5 px-3 font-semibold">Menu Item</th>
                  <th className="py-2.5 px-3 font-semibold">Quantity Sold</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                {productPerformance.map((p, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 px-4 font-bold text-zinc-500">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-white">{p.name}</td>
                    <td className="py-2.5 px-3 font-bold text-[#FF6B00]">{p.qty} units</td>
                    <td className="py-2.5 px-4 text-right font-bold text-white">
                      {settings.currency} {p.totalRev.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------------- SUBTAB: PAYMENT METHODS ---------------- */}
        {activeReportTab === 'payments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {Object.entries(paymentBreakdown).map(([method, amount]) => (
              <div key={method} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-xs uppercase font-bold text-[#FF6B00] block">
                  {method}
                </span>
                <span className="font-mono text-xl font-extrabold text-white mt-1 block">
                  {settings.currency} {amount.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {grossSales > 0 ? Math.round((amount / grossSales) * 100) : 0}% of sales
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- SUBTAB: EXPENSES ---------------- */}
        {activeReportTab === 'expenses' && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">Description</th>
                  <th className="py-2.5 px-3 font-semibold">Channel</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 px-4 text-zinc-400">{e.date}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{e.category}</td>
                    <td className="py-2.5 px-3 font-sans text-zinc-300">{e.description}</td>
                    <td className="py-2.5 px-3 capitalize text-zinc-400">{e.paymentMethod}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-400">
                      {settings.currency} {e.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------------- SUBTAB: STOCK VALUATION ---------------- */}
        {activeReportTab === 'inventory' && (
          <div className="space-y-3">
            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white">Current Warehouse Stock Valuation</h3>
                <p className="text-xs text-zinc-400">Asset value of all raw materials currently on hand</p>
              </div>
              <span className="font-mono text-xl font-extrabold text-[#FF6B00]">
                {settings.currency} {Math.round(inventoryValuation).toLocaleString()}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                    <th className="py-2.5 px-4 font-semibold">Material</th>
                    <th className="py-2.5 px-3 font-semibold">Stock Qty</th>
                    <th className="py-2.5 px-3 font-semibold">Unit Cost</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                  {ingredients.map((ing) => (
                    <tr key={ing.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 font-sans font-bold text-white">{ing.name}</td>
                      <td className="py-2.5 px-3">{ing.currentStock} {ing.unit}</td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {settings.currency} {ing.unitCost} / {ing.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">
                        {settings.currency} {Math.round(ing.currentStock * ing.unitCost).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- SUBTAB: DUES AGING ---------------- */}
        {activeReportTab === 'dues' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Customer Dues */}
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="font-bold text-sm text-blue-400">Customer Receivables</h3>
                <span className="font-mono text-sm font-bold text-white">
                  Total: {settings.currency}{' '}
                  {customers.reduce((sum, c) => sum + (c.currentDue || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {customers.filter((c) => c.currentDue > 0).map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-2 rounded-lg bg-zinc-950 text-xs">
                    <div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-zinc-500">{c.phone}</div>
                    </div>
                    <span className="font-mono font-bold text-red-400">
                      {settings.currency} {c.currentDue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplier Dues */}
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="font-bold text-sm text-amber-400">Supplier Payables</h3>
                <span className="font-mono text-sm font-bold text-white">
                  Total: {settings.currency}{' '}
                  {suppliers.reduce((sum, s) => sum + (s.currentDue || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {suppliers.filter((s) => s.currentDue > 0).map((s) => (
                  <div key={s.id} className="flex justify-between items-center p-2 rounded-lg bg-zinc-950 text-xs">
                    <div>
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-zinc-500">{s.company}</div>
                    </div>
                    <span className="font-mono font-bold text-red-400">
                      {settings.currency} {s.currentDue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- ORDER COST & PROFIT INSPECTOR MODAL ---------------- */}
        {inspectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#FF6B00]" />
                    <h3 className="font-extrabold text-white text-base">
                      Order #{inspectedOrder.orderNumber} · Cost & Profit Breakdown
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {new Date(inspectedOrder.createdAt).toLocaleString()} · {inspectedOrder.type.toUpperCase()} ·{' '}
                    {inspectedOrder.customerName || 'Walk-in Customer'} · {inspectedOrder.paymentMethod.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setInspectedOrder(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items Breakdown Table */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/60">
                        <th className="py-2.5 px-3 font-semibold">Item & Details</th>
                        <th className="py-2.5 px-2 text-center font-semibold">Qty</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Price</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-amber-400">Actual Cost</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">Profit</th>
                        <th className="py-2.5 px-2 text-center font-semibold">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                      {inspectedOrder.items.map((it, idx) => {
                        // Find matching recipe components for this item
                        const itemRecipes = recipes.filter(
                          (r) =>
                            r.productId === it.productId &&
                            (!r.variantName || r.variantName === it.variantName || it.variantName === 'Standard')
                        );
                        const itCost = it.totalCost ?? (it.unitCost ? it.unitCost * it.quantity : 0);
                        const itProfit = it.profit ?? (it.itemTotal - itCost);
                        const itMargin = it.itemTotal > 0 ? Math.round((itProfit / it.itemTotal) * 100) : 0;

                        return (
                          <tr key={idx} className="hover:bg-zinc-900/50">
                            <td className="py-2.5 px-3 font-sans">
                              <div className="font-bold text-white text-xs">{it.productName}</div>
                              {it.variantName && it.variantName !== 'Standard' && (
                                <div className="text-[10px] text-zinc-400">Variant: {it.variantName}</div>
                              )}
                              {it.addons && it.addons.length > 0 && (
                                <div className="text-[10px] text-zinc-400">
                                  Extras: {it.addons.map((a) => a.name).join(', ')}
                                </div>
                              )}
                              {/* Recipe ingredient details */}
                              {itemRecipes.length > 0 && (
                                <div className="text-[9px] text-zinc-500 font-mono mt-1">
                                  BOM: {itemRecipes.map((r) => {
                                    const ing = ingredients.find((i) => i.id === r.ingredientId);
                                    return `${ing?.name || 'Item'} (${r.quantity * it.quantity} ${ing?.unit || ''})`;
                                  }).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-white">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-white">
                              {settings.currency} {it.itemTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                              {settings.currency} {itCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                              +{settings.currency} {itProfit.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/40">
                                {itMargin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                {(() => {
                  const fin = getOrderFinancials(inspectedOrder);
                  return (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>Sale Revenue (Total Paid):</span>
                        <span className="font-bold text-white">
                          {settings.currency} {inspectedOrder.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Total Raw Ingredient Cost (COGS):</span>
                        <span className="font-bold text-amber-400">
                          -{settings.currency} {fin.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold pt-1.5 border-t border-zinc-800 text-sm">
                        <span>Net Profit from this Sale:</span>
                        <span>
                          +{settings.currency} {fin.profit.toLocaleString()}{' '}
                          <span className="text-xs text-emerald-500 font-normal">({fin.margin}% Margin)</span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setInspectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
