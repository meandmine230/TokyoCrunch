import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Order,
  Ingredient,
  RecipeItem,
  Expense,
  Customer,
  Supplier,
} from '../../types';
import {
  getAllFromStore,
  getActiveCashSession,
  getCurrentCashBalance,
  calculateOrderCostAndProfit,
} from '../../db/indexedDB';
import { ProfitAnalysisView } from './ProfitAnalysisView';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Receipt,
  Users,
  Truck,
  ArrowRight,
  Flame,
  ChefHat,
  Package,
  Percent,
  Coins,
  BarChart3,
  Layers,
} from 'lucide-react';

interface DashboardModuleProps {
  initialView?: 'overview' | 'profit-analysis';
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ initialView = 'overview' }) => {
  const { settings, setActiveTab, dataVersion } = useApp();
  const [dashboardView, setDashboardView] = useState<'overview' | 'profit-analysis'>(initialView);

  useEffect(() => {
    if (initialView) {
      setDashboardView(initialView);
    }
  }, [initialView]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashInDrawer, setCashInDrawer] = useState<number>(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [o, ing, rec, exp, cust, sup, session] = await Promise.all([
          getAllFromStore<Order>('orders'),
          getAllFromStore<Ingredient>('ingredients'),
          getAllFromStore<RecipeItem>('recipes'),
          getAllFromStore<Expense>('expenses'),
          getAllFromStore<Customer>('customers'),
          getAllFromStore<Supplier>('suppliers'),
          getActiveCashSession(),
        ]);

        setOrders(o);
        setIngredients(ing);
        setRecipes(rec);
        setExpenses(exp);
        setCustomers(cust);
        setSuppliers(sup);

        if (session) {
          const bal = await getCurrentCashBalance(session.id);
          setCashInDrawer(bal);
        } else {
          setCashInDrawer(0);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    loadDashboardData();
  }, [dataVersion]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper to retrieve actual cost and net profit from every order
  const getOrderFinancials = (order: Order) => {
    if (order.totalCost !== undefined && order.netProfit !== undefined) {
      return {
        cost: order.totalCost,
        profit: order.netProfit,
        margin:
          order.profitMarginPercent ??
          (order.total > 0 ? Number(((order.netProfit / order.total) * 100).toFixed(1)) : 0),
      };
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

  // Filter today's transactions
  const todaysOrders = useMemo(() => {
    return orders.filter((o) => o.createdAt.startsWith(todayStr) && o.status !== 'voided');
  }, [orders, todayStr]);

  const todaysGrossSales = useMemo(() => {
    return todaysOrders.reduce((sum, o) => sum + o.total, 0);
  }, [todaysOrders]);

  const todaysActualCost = useMemo(() => {
    return Number(todaysOrders.reduce((sum, o) => sum + getOrderFinancials(o).cost, 0).toFixed(2));
  }, [todaysOrders, recipes, ingredients]);

  const todaysNetProfit = useMemo(() => {
    return Number(todaysOrders.reduce((sum, o) => sum + getOrderFinancials(o).profit, 0).toFixed(2));
  }, [todaysOrders, recipes, ingredients]);

  const todaysProfitMargin = useMemo(() => {
    return todaysGrossSales > 0
      ? Number(((todaysNetProfit / todaysGrossSales) * 100).toFixed(1))
      : 0;
  }, [todaysGrossSales, todaysNetProfit]);

  const todaysExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(todayStr))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayStr]);

  const todaysOperatingProfit = useMemo(() => {
    return Number((todaysNetProfit - todaysExpenses).toFixed(2));
  }, [todaysNetProfit, todaysExpenses]);

  const totalCustomerDues = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  }, [customers]);

  const totalSupplierDues = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.currentDue || 0), 0);
  }, [suppliers]);

  // Low stock ingredients
  const lowStockItems = useMemo(() => {
    return ingredients.filter((i) => i.currentStock <= i.minStockAlert);
  }, [ingredients]);

  // Best Sellers Ranking with Cost and Profit
  const bestSellers = useMemo(() => {
    const itemMap: Record<
      string,
      { name: string; qty: number; revenue: number; cost: number; profit: number }
    > = {};
    for (const order of orders) {
      if (order.status === 'voided') continue;
      for (const item of order.items) {
        if (!itemMap[item.productId]) {
          itemMap[item.productId] = { name: item.productName, qty: 0, revenue: 0, cost: 0, profit: 0 };
        }
        itemMap[item.productId].qty += item.quantity;
        itemMap[item.productId].revenue += item.itemTotal;
        const itemCost = item.totalCost ?? (item.unitCost ? item.unitCost * item.quantity : 0);
        itemMap[item.productId].cost += itemCost;
        itemMap[item.productId].profit += item.profit ?? (item.itemTotal - itemCost);
      }
    }
    return Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [orders]);

  // Recent 6 Orders
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [orders]);

  if (dashboardView === 'profit-analysis') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
        {/* Top View Selector Bar */}
        <div className="px-4 py-2.5 bg-[#141417] border-b border-zinc-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => setDashboardView('overview')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Executive Overview</span>
            </button>
            <button
              onClick={() => setDashboardView('profit-analysis')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF6B00] text-white shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Profit Analysis (COGS vs Revenue)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold shadow-md shadow-[#FF6B00]/20 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Open POS</span>
            </button>
          </div>
        </div>

        <ProfitAnalysisView
          onNavigateToRecipes={() => setActiveTab('recipes')}
          onNavigateToMenu={() => setActiveTab('menu')}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#121214] space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {settings.name || 'Tokyo Crunch'}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live POS Operating
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {settings.location} · Contact: {settings.phone}
          </p>
        </div>

        {/* Quick action buttons & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => setDashboardView('overview')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF6B00] text-white shadow-sm"
            >
              Overview
            </button>
            <button
              onClick={() => setDashboardView('profit-analysis')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Profit Analysis
            </button>
          </div>

          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Open POS</span>
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold transition-all"
          >
            <ChefHat className="w-4 h-4 text-[#FF6B00]" />
            <span>Kitchen</span>
          </button>
        </div>
      </div>

      {/* Real-Time Profitability & Food Cost Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Today's Net Profit from Sales */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-zinc-900 border border-emerald-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Today's Net Profit from Sales</span>
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
              +{todaysProfitMargin}% Margin
            </span>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-black text-emerald-400">
              {settings.currency} {todaysNetProfit.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
              <span>Gross Sales: {settings.currency} {todaysGrossSales.toLocaleString()}</span>
              <span>Food Cost: {settings.currency} {todaysActualCost.toLocaleString()}</span>
            </div>
            <button
              onClick={() => setDashboardView('profit-analysis')}
              className="mt-3 w-full py-1.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Per-Item Profit Analysis & COGS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Cost of Goods Sold (Actual Food Cost) */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-400" />
              <span>Actual Food Cost (COGS)</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">From Recipe BOM</span>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-black text-amber-400">
              {settings.currency} {todaysActualCost.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Exact raw material ingredient costs consumed today
            </div>
          </div>
        </div>

        {/* Card 3: Net Bottom-Line Operating Profit */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#FF6B00]" />
              <span>Net Bottom-Line Profit</span>
            </span>
            <span className="text-[10px] text-zinc-500">After Expenses</span>
          </div>
          <div className="mt-3">
            <div className={`font-mono text-2xl font-black ${todaysOperatingProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {settings.currency} {todaysOperatingProfit.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Expenses deducted: -{settings.currency} {todaysExpenses.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 6 Key Executive Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Metric 1: Today Sales */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Today's Sales</span>
            <div className="p-1.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl font-extrabold text-white">
              {settings.currency} {todaysGrossSales.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {todaysOrders.length} orders placed today
            </div>
          </div>
        </div>

        {/* Metric 2: Cash in Drawer */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Cash in Drawer</span>
            <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl font-extrabold text-emerald-400">
              {settings.currency} {cashInDrawer.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Current register float
            </div>
          </div>
        </div>

        {/* Metric 3: Today's Expenses */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Today Expenses</span>
            <div className="p-1.5 rounded-lg bg-red-950 text-red-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl font-extrabold text-white">
              {settings.currency} {todaysExpenses.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Daily operational costs
            </div>
          </div>
        </div>

        {/* Metric 4: Customer Dues */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Customer Dues</span>
            <div className="p-1.5 rounded-lg bg-blue-950 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl font-extrabold text-blue-400">
              {settings.currency} {totalCustomerDues.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Receivable credit balances
            </div>
          </div>
        </div>

        {/* Metric 5: Supplier Payables */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Supplier Dues</span>
            <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl font-extrabold text-amber-400">
              {settings.currency} {totalSupplierDues.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Payables for raw goods
            </div>
          </div>
        </div>

        {/* Metric 6: Low Stock Alert */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Low Stock Items</span>
            <div className={`p-1.5 rounded-lg ${lowStockItems.length > 0 ? 'bg-red-950 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`font-mono text-xl font-extrabold ${lowStockItems.length > 0 ? 'text-red-400' : 'text-white'}`}>
              {lowStockItems.length} items
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {lowStockItems.length > 0 ? 'Reorder needed now' : 'Stock levels healthy'}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Low Stock Warnings + Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Warning Box */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#FF6B00]" />
              <h3 className="font-bold text-sm text-white">Inventory Stock Status</h3>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 flex-1">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs italic">
                All raw materials and ingredients are above threshold levels.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-red-900/40 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white">{item.name}</div>
                    <div className="text-[10px] text-zinc-400">
                      Minimum Alert Threshold: {item.minStockAlert} {item.unit}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-red-400 block">
                      {item.currentStock} {item.unit} left
                    </span>
                    <button
                      onClick={() => setActiveTab('purchases')}
                      className="text-[10px] font-semibold text-[#FF6B00] hover:underline"
                    >
                      + Order Stock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Best Selling Items */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#FF6B00]" />
              <h3 className="font-bold text-sm text-white">Top Selling Items</h3>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1">
            {bestSellers.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs italic">
                No completed sales recorded yet. Place orders via POS to track top sellers.
              </div>
            ) : (
              bestSellers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-white">{item.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {item.qty} units sold
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-white">
                      {settings.currency} {item.revenue.toLocaleString()}
                    </div>
                    <div className="font-mono text-[10px] text-emerald-400 font-semibold">
                      +{settings.currency} {item.profit.toLocaleString()} profit
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Orders Feed */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#FF6B00]" />
            <h3 className="font-bold text-sm text-white">Recent POS Transactions & Profitability</h3>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Full Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-2 font-semibold">Order #</th>
                <th className="pb-2 font-semibold">Date & Time</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Customer</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Payment</th>
                <th className="pb-2 font-semibold text-right">Gross Sale</th>
                <th className="pb-2 font-semibold text-right">Actual Cost</th>
                <th className="pb-2 font-semibold text-right text-emerald-400">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-zinc-500 italic font-sans">
                    No orders recorded yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => {
                  const fin = getOrderFinancials(ord);
                  return (
                    <tr key={ord.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 font-bold text-white">
                        #{ord.orderNumber}
                      </td>
                      <td className="py-2.5 text-zinc-400 font-sans">
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 uppercase text-[10px] font-bold text-zinc-300 font-sans">
                        {ord.type.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 text-zinc-300 font-sans">
                        {ord.customerName || 'Walk-in'}
                      </td>
                      <td className="py-2.5 font-sans">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            ord.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-400'
                              : ord.status === 'voided'
                              ? 'bg-red-950 text-red-400'
                              : 'bg-[#FF6B00]/15 text-[#FF6B00]'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 capitalize text-zinc-400 font-sans">
                        {ord.paymentMethod}
                      </td>
                      <td className="py-2.5 font-bold text-white text-right">
                        {settings.currency} {ord.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-amber-300/90 text-right">
                        {settings.currency} {fin.cost.toLocaleString()}
                      </td>
                      <td className="py-2.5 font-bold text-emerald-400 text-right">
                        +{settings.currency} {fin.profit.toLocaleString()}{' '}
                        <span className="text-[10px] text-emerald-500 font-normal">
                          ({fin.margin}%)
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
  );
};
