import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Product,
  Category,
  Ingredient,
  RecipeItem,
  Order,
} from '../../types';
import {
  getAllFromStore,
  saveToStore,
  deleteFromStore,
  addAuditLog,
} from '../../db/indexedDB';
import {
  TrendingUp,
  Search,
  Download,
  Printer,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Percent,
  Coins,
  Package,
  ShoppingBag,
  ArrowUpDown,
  Sparkles,
  Edit2,
  Plus,
  Trash2,
  X,
  RefreshCw,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface ProfitAnalysisViewProps {
  onNavigateToRecipes?: (productId?: string) => void;
  onNavigateToMenu?: () => void;
}

type TimeframeFilter = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';
type MarginFilter = 'all' | 'high' | 'healthy' | 'moderate' | 'low' | 'no_bom';
type SortField =
  | 'totalNetProfit'
  | 'realizedMarginPercent'
  | 'unitMarginPercent'
  | 'totalRevenue'
  | 'unitsSold'
  | 'totalCOGS'
  | 'basePrice'
  | 'unitCost';
type SortOrder = 'asc' | 'desc';

interface ItemFinancialMetric {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  available: boolean;
  basePrice: number;
  hasRecipe: boolean;
  unitCost: number; // Recipe food cost per base unit
  unitProfit: number;
  unitMarginPercent: number;
  variants: {
    name: string;
    price: number;
    unitCost: number;
    unitProfit: number;
    marginPercent: number;
    unitsSold: number;
    revenue: number;
    cogs: number;
    profit: number;
  }[];
  unitsSold: number;
  totalRevenue: number;
  totalCOGS: number;
  totalNetProfit: number;
  realizedMarginPercent: number;
  cogsRatioPercent: number; // Food cost % of revenue
  quadrant: 'star' | 'workhorse' | 'gem' | 'underperformer';
  ingredientsCount: number;
}

export const ProfitAnalysisView: React.FC<ProfitAnalysisViewProps> = ({
  onNavigateToRecipes,
  onNavigateToMenu,
}) => {
  const { settings, triggerPrintReport, showToast, dataVersion, triggerDataRefresh, openManualModal } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & State
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('all');
  const [sortField, setSortField] = useState<SortField>('totalNetProfit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Drill-down Modal State
  const [inspectItem, setInspectItem] = useState<ItemFinancialMetric | null>(null);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);

  // Quick In-Place BOM Editor Modal
  const [editingBomProduct, setEditingBomProduct] = useState<Product | null>(null);
  const [bomIngredientId, setBomIngredientId] = useState<string>('');
  const [bomQty, setBomQty] = useState<number>(1);
  const [bomVariantTarget, setBomVariantTarget] = useState<string>('Standard');

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prod, cat, ing, rec, ord] = await Promise.all([
        getAllFromStore<Product>('products'),
        getAllFromStore<Category>('categories'),
        getAllFromStore<Ingredient>('ingredients'),
        getAllFromStore<RecipeItem>('recipes'),
        getAllFromStore<Order>('orders'),
      ]);
      setProducts(prod);
      setCategories(cat);
      setIngredients(ing);
      setRecipes(rec);
      setOrders(ord);
    } catch (err) {
      console.error('Failed to load profit analysis data', err);
      showToast('Could not load profit analysis data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  // Ingredient Map for O(1) lookups
  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const ing of ingredients) {
      map.set(ing.id, ing);
    }
    return map;
  }, [ingredients]);

  // Category Map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Date filtering logic for orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return orders.filter((o) => {
      if (o.status === 'voided') return false;

      const orderDate = new Date(o.createdAt);

      switch (timeframe) {
        case 'today':
          return o.createdAt.startsWith(todayStr);
        case 'yesterday':
          return o.createdAt.startsWith(yesterdayStr);
        case '7days':
          return orderDate >= sevenDaysAgo;
        case '30days':
          return orderDate >= thirtyDaysAgo;
        case 'custom':
          if (customStartDate && o.createdAt < `${customStartDate}T00:00:00`) return false;
          if (customEndDate && o.createdAt > `${customEndDate}T23:59:59`) return false;
          return true;
        case 'all':
        default:
          return true;
      }
    });
  }, [orders, timeframe, customStartDate, customEndDate]);

  // Helper to calculate recipe cost for product and optional variant
  const calculateRecipeUnitCost = (productId: string, variantName?: string) => {
    const matchedRecipes = recipes.filter(
      (r) =>
        r.productId === productId &&
        (!r.variantName || r.variantName === variantName || variantName === 'Standard' || !variantName)
    );

    let cost = 0;
    for (const rec of matchedRecipes) {
      const ing = ingredientMap.get(rec.ingredientId);
      if (ing) {
        cost += rec.quantity * ing.unitCost;
      }
    }
    return Number(cost.toFixed(2));
  };

  // Compute Full Financial Metrics per Menu Item
  const menuFinancials: ItemFinancialMetric[] = useMemo(() => {
    // 1. First pass: aggregate order sales per product & variant
    const salesMap: Record<
      string,
      {
        unitsSold: number;
        revenue: number;
        cogs: number;
        variants: Record<string, { unitsSold: number; revenue: number; cogs: number }>;
      }
    > = {};

    for (const order of filteredOrders) {
      for (const item of order.items) {
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = {
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            variants: {},
          };
        }

        const entry = salesMap[item.productId];
        entry.unitsSold += item.quantity;
        entry.revenue += item.itemTotal;

        // Calculate COGS: use recorded item.totalCost if available, else dynamically from recipe
        let itemCogs = item.totalCost;
        if (itemCogs === undefined || itemCogs === null) {
          const unitCogs = calculateRecipeUnitCost(item.productId, item.variantName);
          itemCogs = unitCogs * item.quantity;
        }
        entry.cogs += itemCogs;

        // Variant level sales
        const varName = item.variantName || 'Standard';
        if (!entry.variants[varName]) {
          entry.variants[varName] = { unitsSold: 0, revenue: 0, cogs: 0 };
        }
        entry.variants[varName].unitsSold += item.quantity;
        entry.variants[varName].revenue += item.itemTotal;
        entry.variants[varName].cogs += itemCogs;
      }
    }

    // 2. Map every product in the catalog
    const metrics: ItemFinancialMetric[] = products.map((product) => {
      const prodRecipes = recipes.filter((r) => r.productId === product.id);
      const hasRecipe = prodRecipes.length > 0;
      const baseUnitCost = calculateRecipeUnitCost(product.id, 'Standard');
      const basePrice = product.basePrice || 0;
      const unitProfit = Number(Math.max(0, basePrice - baseUnitCost).toFixed(2));
      const unitMarginPercent =
        basePrice > 0 ? Number(((unitProfit / basePrice) * 100).toFixed(1)) : 0;

      // Variants calculation
      const variantMetrics = (product.variants || []).map((v) => {
        const vCost = calculateRecipeUnitCost(product.id, v.name) || baseUnitCost;
        const vPrice = v.price || basePrice;
        const vProfit = Number(Math.max(0, vPrice - vCost).toFixed(2));
        const vMargin = vPrice > 0 ? Number(((vProfit / vPrice) * 100).toFixed(1)) : 0;

        const salesEntry = salesMap[product.id]?.variants?.[v.name] || {
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
        };

        return {
          name: v.name,
          price: vPrice,
          unitCost: vCost,
          unitProfit: vProfit,
          marginPercent: vMargin,
          unitsSold: salesEntry.unitsSold,
          revenue: Number(salesEntry.revenue.toFixed(2)),
          cogs: Number(salesEntry.cogs.toFixed(2)),
          profit: Number((salesEntry.revenue - salesEntry.cogs).toFixed(2)),
        };
      });

      const actualSales = salesMap[product.id] || {
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
      };

      const totalRevenue = Number(actualSales.revenue.toFixed(2));
      const totalCOGS = Number(actualSales.cogs.toFixed(2));
      const totalNetProfit = Number((totalRevenue - totalCOGS).toFixed(2));

      // Realized margin based on actual sales, fallback to theoretical base unit margin
      const realizedMarginPercent =
        totalRevenue > 0
          ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1))
          : unitMarginPercent;

      const cogsRatioPercent =
        totalRevenue > 0
          ? Number(((totalCOGS / totalRevenue) * 100).toFixed(1))
          : basePrice > 0
          ? Number(((baseUnitCost / basePrice) * 100).toFixed(1))
          : 0;

      return {
        productId: product.id,
        productName: product.name,
        categoryId: product.categoryId,
        categoryName: categoryMap.get(product.categoryId) || 'General',
        available: product.available,
        basePrice,
        hasRecipe,
        unitCost: baseUnitCost,
        unitProfit,
        unitMarginPercent,
        variants: variantMetrics,
        unitsSold: actualSales.unitsSold,
        totalRevenue,
        totalCOGS,
        totalNetProfit,
        realizedMarginPercent,
        cogsRatioPercent,
        quadrant: 'underperformer', // Assigned below
        ingredientsCount: prodRecipes.length,
      };
    });

    // 3. Compute BCG Matrix Quadrants (Stars, Workhorses, Hidden Gems, Underperformers)
    const validItems = metrics.filter((m) => m.hasRecipe);
    const avgUnitsSold =
      validItems.length > 0
        ? validItems.reduce((sum, m) => sum + m.unitsSold, 0) / validItems.length
        : 1;
    const avgMargin = 50; // Standard food margin threshold (50%)

    for (const m of metrics) {
      if (m.unitsSold >= avgUnitsSold && m.realizedMarginPercent >= avgMargin) {
        m.quadrant = 'star';
      } else if (m.unitsSold >= avgUnitsSold && m.realizedMarginPercent < avgMargin) {
        m.quadrant = 'workhorse';
      } else if (m.unitsSold < avgUnitsSold && m.realizedMarginPercent >= avgMargin) {
        m.quadrant = 'gem';
      } else {
        m.quadrant = 'underperformer';
      }
    }

    return metrics;
  }, [products, recipes, ingredientMap, categoryMap, filteredOrders]);

  // Aggregate Totals across All Menu Items
  const aggregateSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalUnits = 0;

    for (const m of menuFinancials) {
      totalRevenue += m.totalRevenue;
      totalCOGS += m.totalCOGS;
      totalUnits += m.unitsSold;
    }

    const totalNetProfit = Number((totalRevenue - totalCOGS).toFixed(2));
    const overallMargin =
      totalRevenue > 0 ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const overallCogsRatio =
      totalRevenue > 0 ? Number(((totalCOGS / totalRevenue) * 100).toFixed(1)) : 0;

    // Top Profit Generator
    const sortedByProfit = [...menuFinancials].sort((a, b) => b.totalNetProfit - a.totalNetProfit);
    const topItem = sortedByProfit[0];

    // Highest Margin Item (with at least 1 sale or theoretical)
    const sortedByMargin = [...menuFinancials]
      .filter((m) => m.hasRecipe && m.basePrice > 0)
      .sort((a, b) => b.realizedMarginPercent - a.realizedMarginPercent);
    const highestMarginItem = sortedByMargin[0];

    // Missing BOM count
    const missingBomCount = menuFinancials.filter((m) => !m.hasRecipe).length;

    // Matrix counts
    const starsCount = menuFinancials.filter((m) => m.quadrant === 'star').length;
    const workhorseCount = menuFinancials.filter((m) => m.quadrant === 'workhorse').length;
    const gemCount = menuFinancials.filter((m) => m.quadrant === 'gem').length;
    const underperformerCount = menuFinancials.filter((m) => m.quadrant === 'underperformer').length;

    return {
      totalRevenue,
      totalCOGS,
      totalNetProfit,
      overallMargin,
      overallCogsRatio,
      totalUnits,
      topItem,
      highestMarginItem,
      missingBomCount,
      starsCount,
      workhorseCount,
      gemCount,
      underperformerCount,
    };
  }, [menuFinancials]);

  // Filtered & Sorted Menu Items
  const filteredAndSortedItems = useMemo(() => {
    let list = menuFinancials.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesCat = item.categoryName.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      // Category
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      // Margin Filter
      if (marginFilter === 'no_bom') {
        return !item.hasRecipe;
      }
      if (marginFilter === 'high') {
        return item.hasRecipe && item.realizedMarginPercent >= 60;
      }
      if (marginFilter === 'healthy') {
        return item.hasRecipe && item.realizedMarginPercent >= 45 && item.realizedMarginPercent < 60;
      }
      if (marginFilter === 'moderate') {
        return item.hasRecipe && item.realizedMarginPercent >= 30 && item.realizedMarginPercent < 45;
      }
      if (marginFilter === 'low') {
        return item.hasRecipe && item.realizedMarginPercent < 30;
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [menuFinancials, searchQuery, selectedCategory, marginFilter, sortField, sortOrder]);

  // Handle Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Open Item Drill-down
  const handleOpenInspect = (item: ItemFinancialMetric) => {
    setInspectItem(item);
    setSimulatedPrice(item.basePrice);
  };

  // Open Quick BOM Editor
  const handleOpenBomEditor = (item: ItemFinancialMetric) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      setEditingBomProduct(prod);
      if (ingredients.length > 0) {
        setBomIngredientId(ingredients[0].id);
      }
      setBomQty(1);
      setBomVariantTarget(prod.variants.length > 0 ? prod.variants[0].name : 'Standard');
    }
  };

  // Add Recipe Item in Quick Editor
  const handleAddBomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBomProduct || !bomIngredientId || bomQty <= 0) return;

    try {
      const newRec: RecipeItem = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: editingBomProduct.id,
        variantName: bomVariantTarget,
        ingredientId: bomIngredientId,
        quantity: Number(bomQty),
      };

      await saveToStore('recipes', newRec);
      await addAuditLog({
        userId: 'admin',
        userName: 'Admin',
        action: 'add_recipe_item',
        module: 'recipes',
        details: `Added ${bomQty} of ingredient to ${editingBomProduct.name} (${bomVariantTarget})`,
      });

      showToast('Ingredient added to recipe BOM', 'success');
      triggerDataRefresh();
    } catch (err) {
      console.error('Failed to add BOM ingredient', err);
      showToast('Failed to add recipe ingredient', 'error');
    }
  };

  // Remove Recipe Item in Quick Editor
  const handleRemoveBomItem = async (recipeId: string) => {
    try {
      await deleteFromStore('recipes', recipeId);
      showToast('Ingredient removed from recipe BOM', 'info');
      triggerDataRefresh();
    } catch (err) {
      console.error('Failed to remove recipe item', err);
      showToast('Failed to remove recipe item', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'Category',
      'Available',
      'Has Recipe BOM',
      'Selling Price (PKR)',
      'Recipe COGS (PKR)',
      'Unit Profit (PKR)',
      'Unit Margin %',
      'Units Sold',
      'Total Revenue (PKR)',
      'Total COGS (PKR)',
      'Total Net Profit (PKR)',
      'Realized Margin %',
      'Food Cost Ratio %',
      'Menu Quadrant',
    ];

    const rows = filteredAndSortedItems.map((item) => [
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.categoryName.replace(/"/g, '""')}"`,
      item.available ? 'Yes' : 'No',
      item.hasRecipe ? 'Yes' : 'No',
      item.basePrice,
      item.unitCost,
      item.unitProfit,
      `${item.unitMarginPercent}%`,
      item.unitsSold,
      item.totalRevenue,
      item.totalCOGS,
      item.totalNetProfit,
      `${item.realizedMarginPercent}%`,
      `${item.cogsRatioPercent}%`,
      item.quadrant.toUpperCase(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `TokyoCrunch_Menu_Profit_Analysis_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Executive Report
  const handlePrintReport = () => {
    const headers = [
      'Menu Item',
      'Category',
      'Price',
      'Recipe COGS',
      'Unit Profit',
      'Margin %',
      'Sold Qty',
      'Total Revenue',
      'Total COGS',
      'Net Profit',
    ];

    const rows = filteredAndSortedItems.map((item) => [
      item.productName,
      item.categoryName,
      `${settings.currency} ${item.basePrice}`,
      item.hasRecipe ? `${settings.currency} ${item.unitCost}` : 'No BOM',
      `${settings.currency} ${item.unitProfit}`,
      `${item.realizedMarginPercent}%`,
      item.unitsSold,
      `${settings.currency} ${item.totalRevenue.toLocaleString()}`,
      `${settings.currency} ${item.totalCOGS.toLocaleString()}`,
      `${settings.currency} ${item.totalNetProfit.toLocaleString()}`,
    ]);

    triggerPrintReport({
      title: 'Menu Item Profitability & COGS Analysis',
      subtitle: `${settings.name} · Formula: Revenue vs Recipe Cost of Goods Sold`,
      dateRange: `Timeframe: ${timeframe.toUpperCase()} (${new Date().toLocaleDateString()})`,
      headers,
      rows,
      summary: [
        { label: 'Total Menu Revenue', value: `${settings.currency} ${aggregateSummary.totalRevenue.toLocaleString()}` },
        { label: 'Total Recipe COGS', value: `${settings.currency} ${aggregateSummary.totalCOGS.toLocaleString()}` },
        { label: 'Total Net Food Profit', value: `${settings.currency} ${aggregateSummary.totalNetProfit.toLocaleString()}` },
        { label: 'Overall Food Margin', value: `${aggregateSummary.overallMargin}%` },
        { label: 'Average Food Cost Ratio', value: `${aggregateSummary.overallCogsRatio}%` },
      ],
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214] text-zinc-100">
      {/* Top Header & Contextual Controls */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-zinc-800/80 bg-[#141417] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#FF6B00]" />
                <span>Menu Profit Analysis</span>
              </h1>
              <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                Live Recipe BOM Costing
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Compare total revenue against total cost-of-goods-sold (COGS) defined in recipes · Track net profit margins per item
            </p>
          </div>

          {/* Action Buttons: Export, Print, Refresh */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors shadow-sm"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors shadow-sm"
              title="Print Executive Report"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Print Report</span>
            </button>

            <button
              onClick={openManualModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors shadow-sm"
              title="Open Operations Manual SOP & Print as PDF"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>SOP Manual (PDF)</span>
            </button>

            <button
              onClick={() => triggerDataRefresh()}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeframe & Category Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Segmented Timeframe Switcher */}
          <div className="flex items-center p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom Range' },
              ] as { id: TimeframeFilter; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  timeframe === t.id
                    ? 'bg-[#FF6B00] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-[#FF6B00]"
              />
              <span className="text-zinc-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Revenue */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span>Total Menu Revenue</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                {aggregateSummary.totalUnits} items sold
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono tracking-tight text-white">
                {settings.currency} {aggregateSummary.totalRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                <span>Gross sales in {timeframe === 'all' ? 'catalog lifetime' : timeframe}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Recipe COGS (Food Cost) */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Total Recipe COGS</span>
              </span>
              <span className="font-mono text-[11px] text-amber-400/90 font-bold">
                {aggregateSummary.overallCogsRatio}% of revenue
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono tracking-tight text-amber-400">
                {settings.currency} {aggregateSummary.totalCOGS.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                <span>Calculated from ingredient portions & unit prices</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Net Profit from Menu */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-900 border border-emerald-800/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Total Net Food Profit</span>
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                {aggregateSummary.overallMargin}% Margin
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                +{settings.currency} {aggregateSummary.totalNetProfit.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                <span>Revenue minus raw material ingredients</span>
              </div>
            </div>
          </div>

          {/* Card 4: Top Profit Driver */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                <span>Top Profit Contributor</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-[#FF6B00]">Rank #1</span>
            </div>
            <div className="mt-3">
              <div className="text-base font-bold text-white truncate" title={aggregateSummary.topItem?.productName}>
                {aggregateSummary.topItem?.productName || 'None yet'}
              </div>
              <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center justify-between">
                <span>Profit: {settings.currency} {aggregateSummary.topItem?.totalNetProfit.toLocaleString() || 0}</span>
                <span className="text-zinc-400">({aggregateSummary.topItem?.realizedMarginPercent || 0}% margin)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Revenue vs. COGS Comparison Bar (Top 6 Items) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">
                Revenue vs. COGS Distribution (Top Revenue Generators)
              </h2>
              <p className="text-xs text-zinc-400">
                Visual split between Food Cost (COGS) and Net Profit Margin
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-500/80" />
                <span className="text-zinc-400">Recipe COGS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-zinc-400">Net Profit</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {menuFinancials
              .filter((m) => m.totalRevenue > 0)
              .sort((a, b) => b.totalRevenue - a.totalRevenue)
              .slice(0, 5)
              .map((item) => {
                const cogsPercent = item.cogsRatioPercent;
                const profitPercent = Math.max(0, 100 - cogsPercent);

                return (
                  <div key={item.productId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                        {item.productName}
                      </span>
                      <div className="font-mono text-[11px] text-zinc-300 flex items-center gap-3">
                        <span className="text-zinc-400">
                          Rev: <strong className="text-white">{settings.currency} {item.totalRevenue.toLocaleString()}</strong>
                        </span>
                        <span className="text-amber-400">
                          COGS: {settings.currency} {item.totalCOGS.toLocaleString()} ({cogsPercent}%)
                        </span>
                        <span className="text-emerald-400 font-bold">
                          Profit: +{settings.currency} {item.totalNetProfit.toLocaleString()} ({item.realizedMarginPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800/80">
                      <div
                        style={{ width: `${Math.min(100, cogsPercent)}%` }}
                        className="bg-amber-500/80 h-full transition-all"
                        title={`COGS: ${cogsPercent}%`}
                      />
                      <div
                        style={{ width: `${Math.min(100, profitPercent)}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Net Profit: ${profitPercent}%`}
                      />
                    </div>
                  </div>
                );
              })}

            {menuFinancials.filter((m) => m.totalRevenue > 0).length === 0 && (
              <div className="py-6 text-center text-xs text-zinc-500 font-sans italic">
                No settled sales recorded for this timeframe yet. Theoretical recipe margins are calculated below!
              </div>
            )}
          </div>
        </div>

        {/* Menu Engineering BCG Quadrants Filter Chips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => setMarginFilter(marginFilter === 'high' ? 'all' : 'high')}
            className={`p-3 rounded-xl border text-left transition-all ${
              marginFilter === 'high'
                ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🌟 High Margin (≥60%)</span>
              </span>
              <span className="font-mono text-emerald-300 font-bold">{aggregateSummary.starsCount}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">High profitability items; prime drivers</p>
          </button>

          <button
            onClick={() => setMarginFilter(marginFilter === 'healthy' ? 'all' : 'healthy')}
            className={`p-3 rounded-xl border text-left transition-all ${
              marginFilter === 'healthy'
                ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-400 flex items-center gap-1.5">
                <span>🟢 Healthy (45% - 60%)</span>
              </span>
              <span className="font-mono text-blue-300 font-bold">{aggregateSummary.workhorseCount}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Standard target restaurant margin</p>
          </button>

          <button
            onClick={() => setMarginFilter(marginFilter === 'low' ? 'all' : 'low')}
            className={`p-3 rounded-xl border text-left transition-all ${
              marginFilter === 'low'
                ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                <span>⚠️ Low Margin (&lt;30%)</span>
              </span>
              <span className="font-mono text-red-300 font-bold">
                {menuFinancials.filter((m) => m.hasRecipe && m.realizedMarginPercent < 30).length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Requires price review or portion tuning</p>
          </button>

          <button
            onClick={() => setMarginFilter(marginFilter === 'no_bom' ? 'all' : 'no_bom')}
            className={`p-3 rounded-xl border text-left transition-all ${
              marginFilter === 'no_bom'
                ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>📝 Missing Recipe BOM</span>
              </span>
              <span className="font-mono text-amber-300 font-bold">{aggregateSummary.missingBomCount}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Items without mapped raw ingredients</p>
          </button>
        </div>

        {/* Search, Category, and Margin Filter Controls */}
        <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by item name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="w-full md:w-auto flex items-center flex-wrap gap-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Margin Filter Dropdown */}
            <select
              value={marginFilter}
              onChange={(e) => setMarginFilter(e.target.value as MarginFilter)}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
            >
              <option value="all">All Margin Tiers</option>
              <option value="high">High Margin (≥ 60%)</option>
              <option value="healthy">Healthy Margin (45% - 59.9%)</option>
              <option value="moderate">Moderate Margin (30% - 44.9%)</option>
              <option value="low">Low Margin (&lt; 30%)</option>
              <option value="no_bom">Missing Recipe BOM</option>
            </select>

            {/* Reset Filters */}
            {(searchQuery || selectedCategory !== 'all' || marginFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setMarginFilter('all');
                }}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Detailed High-Density Menu Items Table Grid */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/80 select-none">
                  <th className="py-3 px-4 font-semibold text-left font-sans">Menu Item</th>
                  <th className="py-3 px-3 font-semibold text-left font-sans">Category</th>
                  <th
                    onClick={() => handleSort('basePrice')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('unitCost')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Recipe COGS</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('unitMarginPercent')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Unit Margin</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('unitsSold')}
                    className="py-3 px-3 font-semibold text-center cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Units Sold</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalRevenue')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Revenue</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalCOGS')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total COGS</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalNetProfit')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Net Profit</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('realizedMarginPercent')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white transition-colors font-sans"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Realized Margin</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 font-semibold text-center font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                {filteredAndSortedItems.map((item) => {
                  const isExpanded = expandedProductId === item.productId;
                  const hasVariants = item.variants && item.variants.length > 0;

                  return (
                    <React.Fragment key={item.productId}>
                      <tr className="hover:bg-zinc-800/40 transition-colors group">
                        {/* Name */}
                        <td className="py-3 px-4 font-sans text-white font-semibold">
                          <div className="flex items-center gap-2">
                            {hasVariants && (
                              <button
                                onClick={() =>
                                  setExpandedProductId(isExpanded ? null : item.productId)
                                }
                                className="p-0.5 text-zinc-500 hover:text-white"
                                title="Toggle variants"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            <div>
                              <span className="block">{item.productName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {item.hasRecipe ? (
                                  <span>{item.ingredientsCount} ingredients mapped</span>
                                ) : (
                                  <span className="text-amber-400">⚠️ No recipe BOM</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 text-zinc-400 font-sans">
                          {item.categoryName}
                        </td>

                        {/* Base Price */}
                        <td className="py-3 px-3 text-right font-bold text-white">
                          {settings.currency} {item.basePrice}
                        </td>

                        {/* Recipe COGS */}
                        <td className="py-3 px-3 text-right">
                          {item.hasRecipe ? (
                            <span className="text-amber-400 font-semibold">
                              {settings.currency} {item.unitCost}
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">None</span>
                          )}
                        </td>

                        {/* Unit Margin % */}
                        <td className="py-3 px-3 text-right">
                          {item.hasRecipe ? (
                            <div>
                              <span
                                className={`font-bold ${
                                  item.unitMarginPercent >= 55
                                    ? 'text-emerald-400'
                                    : item.unitMarginPercent >= 40
                                    ? 'text-blue-400'
                                    : item.unitMarginPercent >= 25
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {item.unitMarginPercent}%
                              </span>
                              <span className="text-[10px] text-zinc-500 block">
                                (+{settings.currency} {item.unitProfit})
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>

                        {/* Units Sold */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold ${
                              item.unitsSold > 0
                                ? 'bg-zinc-800 text-zinc-200'
                                : 'text-zinc-600'
                            }`}
                          >
                            {item.unitsSold}
                          </span>
                        </td>

                        {/* Total Revenue */}
                        <td className="py-3 px-3 text-right font-bold text-zinc-200">
                          {settings.currency} {item.totalRevenue.toLocaleString()}
                        </td>

                        {/* Total COGS */}
                        <td className="py-3 px-3 text-right text-amber-400">
                          {settings.currency} {item.totalCOGS.toLocaleString()}
                        </td>

                        {/* Net Profit */}
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          +{settings.currency} {item.totalNetProfit.toLocaleString()}
                        </td>

                        {/* Realized Margin with Visual Mini-Bar */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, item.realizedMarginPercent))}%`,
                                }}
                                className={`h-full ${
                                  item.realizedMarginPercent >= 55
                                    ? 'bg-emerald-400'
                                    : item.realizedMarginPercent >= 40
                                    ? 'bg-blue-400'
                                    : item.realizedMarginPercent >= 25
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                }`}
                              />
                            </div>
                            <span
                              className={`font-bold ${
                                item.realizedMarginPercent >= 55
                                  ? 'text-emerald-400'
                                  : item.realizedMarginPercent >= 40
                                  ? 'text-blue-400'
                                  : item.realizedMarginPercent >= 25
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {item.realizedMarginPercent}%
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenInspect(item)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-sans text-[10px] font-semibold transition-colors"
                              title="Inspect recipe BOM and margin simulator"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleOpenBomEditor(item)}
                              className="p-1 rounded bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF6B00] border border-[#FF6B00]/30 transition-colors"
                              title="Edit BOM in simple side"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Variant Row Breakdown if expanded */}
                      {isExpanded &&
                        item.variants.map((v, vIdx) => (
                          <tr
                            key={vIdx}
                            className="bg-zinc-950/70 border-b border-zinc-800/40 text-[10px] text-zinc-400"
                          >
                            <td className="py-2 pl-9 pr-3 font-sans text-zinc-300">
                              ↳ Variant: <strong className="text-white">{v.name}</strong>
                            </td>
                            <td className="py-2 px-3 text-zinc-500 font-sans">
                              {item.categoryName}
                            </td>
                            <td className="py-2 px-3 text-right text-zinc-300 font-mono">
                              {settings.currency} {v.price}
                            </td>
                            <td className="py-2 px-3 text-right text-amber-400/90 font-mono">
                              {settings.currency} {v.unitCost}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-zinc-300">
                              {v.marginPercent}%
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-zinc-300">
                              {v.unitsSold}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-zinc-300">
                              {settings.currency} {v.revenue.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-amber-400/80">
                              {settings.currency} {v.cogs.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400">
                              +{settings.currency} {v.profit.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400">
                              {v.revenue > 0
                                ? Number(((v.profit / v.revenue) * 100).toFixed(1))
                                : v.marginPercent}
                              %
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[9px] text-zinc-500 font-sans">Variant</span>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

                {filteredAndSortedItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-500 font-sans">
                      No menu items matched your filter or search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------------- ITEM DETAIL & MARGIN SIMULATOR MODAL ---------------- */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-wider">
                  {inspectItem.categoryName}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {inspectItem.productName}
                </h3>
                <p className="text-xs text-zinc-400">
                  Recipe Food Cost (COGS) & Margin Breakdown
                </p>
              </div>

              <button
                onClick={() => setInspectItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Economics Card */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs">
              <div>
                <span className="text-zinc-500 block font-sans text-[11px]">Selling Price</span>
                <span className="text-white font-bold text-base">
                  {settings.currency} {inspectItem.basePrice}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block font-sans text-[11px]">Recipe COGS</span>
                <span className="text-amber-400 font-bold text-base">
                  {settings.currency} {inspectItem.unitCost}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block font-sans text-[11px]">Net Profit Margin</span>
                <span className="text-emerald-400 font-bold text-base">
                  +{settings.currency} {inspectItem.unitProfit} ({inspectItem.unitMarginPercent}%)
                </span>
              </div>
            </div>

            {/* Recipe BOM Ingredients Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Recipe Bill of Materials (BOM Components)
              </h4>
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/60 text-[11px]">
                      <th className="py-2 px-3 font-semibold font-sans">Ingredient</th>
                      <th className="py-2 px-2 text-center">Portion Used</th>
                      <th className="py-2 px-2 text-right">Raw Unit Cost</th>
                      <th className="py-2 px-3 text-right">Ingredient Cost</th>
                      <th className="py-2 px-2 text-right">% of COGS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {(() => {
                      const itemRecipes = recipes.filter(
                        (r) => r.productId === inspectItem.productId
                      );

                      if (itemRecipes.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-zinc-500 font-sans italic">
                              No recipe mapped yet for this product. Click "Edit Recipe BOM" below to add!
                            </td>
                          </tr>
                        );
                      }

                      return itemRecipes.map((r) => {
                        const ing = ingredientMap.get(r.ingredientId);
                        const cost = ing ? r.quantity * ing.unitCost : 0;
                        const share =
                          inspectItem.unitCost > 0
                            ? Number(((cost / inspectItem.unitCost) * 100).toFixed(1))
                            : 0;

                        return (
                          <tr key={r.id}>
                            <td className="py-2 px-3 font-sans text-white font-medium">
                              {ing?.name || 'Raw Ingredient'}
                              {r.variantName && r.variantName !== 'Standard' && (
                                <span className="ml-1.5 text-[9px] text-zinc-500">
                                  ({r.variantName})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-300">
                              {r.quantity} {ing?.unit || 'unit'}
                            </td>
                            <td className="py-2 px-2 text-right text-zinc-400">
                              {settings.currency} {ing?.unitCost || 0}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-400">
                              {settings.currency} {Number(cost.toFixed(2))}
                            </td>
                            <td className="py-2 px-2 text-right text-zinc-400">
                              {share}%
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* What-If Margin Simulator */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>What-If Price & Margin Simulator</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-sans">
                  Simulate price changes on margin %
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Simulated Selling Price ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simulatedPrice || ''}
                    onChange={(e) => setSimulatedPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="flex-1 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">
                    Simulated Margin %
                  </span>
                  {(() => {
                    const simProfit = Math.max(0, simulatedPrice - inspectItem.unitCost);
                    const simMargin =
                      simulatedPrice > 0
                        ? Number(((simProfit / simulatedPrice) * 100).toFixed(1))
                        : 0;
                    const deltaMargin = Number((simMargin - inspectItem.unitMarginPercent).toFixed(1));

                    return (
                      <div className="flex items-baseline gap-2 font-mono">
                        <span className="text-base font-bold text-emerald-400">
                          {simMargin}%
                        </span>
                        <span
                          className={`text-xs ${
                            deltaMargin >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          ({deltaMargin >= 0 ? `+${deltaMargin}` : deltaMargin}%)
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setInspectItem(null);
                  handleOpenBomEditor(inspectItem);
                }}
                className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit This Item's Recipe BOM</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- QUICK IN-PLACE BOM EDITOR MODAL ---------------- */}
      {editingBomProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-2 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#FF6B00] tracking-wider">
                  Quick Recipe BOM Editor
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {editingBomProduct.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  Update ingredients, quantities, and food cost in real-time
                </p>
              </div>

              <button
                onClick={() => setEditingBomProduct(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Ingredient Form */}
            <form onSubmit={handleAddBomItem} className="space-y-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-xs font-bold text-zinc-300 block uppercase">
                Add Ingredient Component
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <select
                    value={bomIngredientId}
                    onChange={(e) => setBomIngredientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({settings.currency} {ing.unitCost}/{ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={bomQty || ''}
                    onChange={(e) => setBomQty(Number(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-white text-center focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {editingBomProduct.variants.length > 0 && (
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Portion Variant (leave Standard for all)
                  </label>
                  <select
                    value={bomVariantTarget}
                    onChange={(e) => setBomVariantTarget(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  >
                    <option value="Standard">Standard (All Portions)</option>
                    {editingBomProduct.variants.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient Component</span>
              </button>
            </form>

            {/* Active Components List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-300 block uppercase">
                Current BOM Components
              </span>
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/60 text-[11px]">
                      <th className="py-2 px-3 font-semibold">Ingredient</th>
                      <th className="py-2 px-2 text-center">Portion</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {recipes
                      .filter((r) => r.productId === editingBomProduct.id)
                      .map((rec) => {
                        const ing = ingredientMap.get(rec.ingredientId);
                        const cost = ing ? rec.quantity * ing.unitCost : 0;

                        return (
                          <tr key={rec.id}>
                            <td className="py-2 px-3 font-sans text-white">
                              {ing?.name || 'Raw Material'}
                              {rec.variantName && rec.variantName !== 'Standard' && (
                                <span className="ml-1 text-[9px] text-zinc-500">
                                  ({rec.variantName})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-300">
                              {rec.quantity} {ing?.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-400">
                              {settings.currency} {Number(cost.toFixed(2))}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveBomItem(rec.id)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                    {recipes.filter((r) => r.productId === editingBomProduct.id).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500 font-sans italic">
                          No ingredients assigned to this recipe yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingBomProduct(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
