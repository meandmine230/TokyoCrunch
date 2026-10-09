import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Product,
  Category,
  OrderItem,
  OrderType,
  PaymentMethod,
  Customer,
  HeldOrder,
  ProductVariant,
  SelectedAddon,
  Order,
  Ingredient,
  RecipeItem,
} from '../../types';
import {
  getAllFromStore,
  saveToStore,
  deleteFromStore,
  createPosOrderTransaction,
  updateOrderStatus,
  calculateOrderCostAndProfit,
} from '../../db/indexedDB';
import { playSound } from '../../utils/sound';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  UserPlus,
  Phone,
  MapPin,
  Percent,
  Receipt,
  Utensils,
  Truck,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  ChefHat,
  Download,
  Keyboard,
} from 'lucide-react';
import { generateReceiptHtml, printThermalDirect } from '../../utils/thermalPrinter';

export const PosModule: React.FC = () => {
  const {
    currentUser,
    settings,
    showToast,
    triggerPrintReceipt,
    previewReceipt,
    triggerDataRefresh,
    dataVersion,
    setActiveTab,
    isInstallable,
    promptInstall,
  } = useApp();

  // Catalog State
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [liveKitchenOrders, setLiveKitchenOrders] = useState<Order[]>([]);
  const [showKitchenStrip, setShowKitchenStrip] = useState<boolean>(true);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Cart State
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>('T1');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(settings.deliveryFeeDefault || 100);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-walkin');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Variant / Addon Selection Modal
  const [activeProductForCustomization, setActiveProductForCustomization] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [customItemNote, setCustomItemNote] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Held Orders Modal
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

  // Load Catalog Data
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [cats, prods, custs, held, ords, recs, ings] = await Promise.all([
          getAllFromStore<Category>('categories'),
          getAllFromStore<Product>('products'),
          getAllFromStore<Customer>('customers'),
          getAllFromStore<HeldOrder>('held_orders'),
          getAllFromStore<Order>('orders'),
          getAllFromStore<RecipeItem>('recipes'),
          getAllFromStore<Ingredient>('ingredients'),
        ]);
        setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
        setProducts(prods);
        setCustomers(custs);
        setHeldOrders(held);
        setRecipes(recs);
        setIngredients(ings);

        const activeK = ords.filter((o) => o.status === 'pending' || o.status === 'preparing');
        setLiveKitchenOrders(
          activeK.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } catch (err) {
        console.error('Failed to load POS catalog', err);
      }
    };
    loadCatalog();
  }, [dataVersion]);

  const handleAdvanceKitchenStatus = async (order: Order, nextStatus: any) => {
    try {
      await updateOrderStatus(order.id, nextStatus, currentUser);
      playSound(nextStatus === 'ready' ? 'kitchen' : 'beep');
      showToast(`Kitchen Ticket #${order.orderNumber} marked as ${nextStatus.toUpperCase()}`, 'success');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  // Sync delivery fee with settings
  useEffect(() => {
    if (orderType === 'delivery') {
      setDeliveryFee(settings.deliveryFeeDefault || 100);
    } else {
      setDeliveryFee(0);
    }
  }, [orderType, settings.deliveryFeeDefault]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.available) return false;
      const matchesCategory =
        selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * discountValue) / 100);
    }
    return Math.min(discountValue, subtotal);
  }, [subtotal, discountType, discountValue]);

  const taxAmount = useMemo(() => {
    if (!settings.taxRatePercent || settings.taxRatePercent <= 0) return 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    return Math.round((taxable * settings.taxRatePercent) / 100);
  }, [subtotal, discountAmount, settings.taxRatePercent]);

  const grandTotal = useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const fee = orderType === 'delivery' ? deliveryFee : 0;
    return afterDiscount + taxAmount + fee;
  }, [subtotal, discountAmount, taxAmount, orderType, deliveryFee]);

  // Change Calculation
  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, cashTendered - grandTotal);
  }, [cashTendered, grandTotal, paymentMethod]);

  // Live Cost & Net Profit Analysis for Active Cart
  const liveCostAnalysis = useMemo(() => {
    return calculateOrderCostAndProfit(
      cartItems,
      grandTotal,
      taxAmount,
      recipes,
      ingredients
    );
  }, [cartItems, grandTotal, taxAmount, recipes, ingredients]);

  // Handle Product Tap
  const handleProductTap = (product: Product) => {
    // If product has multiple variants or has addons, open customization modal
    if (product.variants.length > 1 || (product.addons && product.addons.length > 0)) {
      setActiveProductForCustomization(product);
      setSelectedVariant(product.variants[0]);
      setSelectedAddons([]);
      setCustomItemNote('');
      setCustomQty(1);
    } else {
      // Add standard product directly
      const unitPrice = product.variants[0]?.price || product.basePrice;
      addItemToCart({
        productId: product.id,
        productName: product.name,
        variantName: product.variants[0]?.name || 'Standard',
        unitPrice,
        quantity: 1,
        addons: [],
        itemTotal: unitPrice,
      });
      playSound('beep');
    }
  };

  const addItemToCart = (itemData: Omit<OrderItem, 'id'>) => {
    setCartItems((prev) => {
      // Check if exact same item with same variant, addons and notes exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === itemData.productId &&
          i.variantName === itemData.variantName &&
          i.notes === itemData.notes &&
          JSON.stringify(i.addons) === JSON.stringify(itemData.addons)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + itemData.quantity;
        const singleTotal = current.itemTotal / current.quantity;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          itemTotal: singleTotal * newQty,
        };
        return updated;
      } else {
        const newItem: OrderItem = {
          ...itemData,
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        return [...prev, newItem];
      }
    });
  };

  // Confirm Customization
  const handleConfirmCustomization = () => {
    if (!activeProductForCustomization || !selectedVariant) return;

    const addonsCost = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = selectedVariant.price + addonsCost;
    const itemTotal = unitPrice * customQty;

    addItemToCart({
      productId: activeProductForCustomization.id,
      productName: activeProductForCustomization.name,
      variantName: selectedVariant.name,
      unitPrice,
      quantity: customQty,
      addons: selectedAddons,
      itemTotal,
      notes: customItemNote.trim() || undefined,
    });

    playSound('beep');
    setActiveProductForCustomization(null);
  };

  // Update Cart Item Quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const singlePrice = item.itemTotal / item.quantity;
            return {
              ...item,
              quantity: newQty,
              itemTotal: singlePrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    setCartItems([]);
    setDiscountValue(0);
    setOrderNotes('');
  };

  // Hold Order
  const handleHoldOrder = async () => {
    if (cartItems.length === 0) {
      showToast('Cannot hold an empty cart', 'warning');
      return;
    }

    const held: HeldOrder = {
      id: `held-${Date.now()}`,
      heldAt: new Date().toISOString(),
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      customerName: activeCustomer?.name,
      customerPhone: activeCustomer?.phone,
      deliveryAddress: activeCustomer?.address,
      items: cartItems,
      discountAmount,
      deliveryFee,
      notes: orderNotes,
    };

    await saveToStore('held_orders', held);
    setHeldOrders((prev) => [...prev, held]);
    handleClearCart();
    showToast('Order held successfully', 'info');
  };

  // Recall Held Order
  const handleRecallOrder = async (held: HeldOrder) => {
    setCartItems(held.items);
    setOrderType(held.orderType);
    if (held.tableNumber) setTableNumber(held.tableNumber);
    setDiscountValue(held.discountAmount);
    setOrderNotes(held.notes || '');
    await deleteFromStore('held_orders', held.id);
    setHeldOrders((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldOrdersModal(false);
    showToast('Order recalled to cart', 'success');
  };

  // Add Customer Inline
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      showToast('Name and phone are required', 'warning');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || undefined,
      totalOrders: 0,
      totalSpent: 0,
      currentDue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveToStore('customers', newCust);
    setCustomers((prev) => [...prev, newCust]);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    showToast(`Added customer ${newCust.name}`, 'success');
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cartItems.length === 0) {
      showToast('Cart is empty. Select items to order.', 'warning');
      return;
    }
    setCashTendered(grandTotal);
    setShowPaymentModal(true);
  };

  // Complete Order
  const handleCompleteOrder = async () => {
    if (cartItems.length === 0 || isSubmittingOrder) return;

    try {
      setIsSubmittingOrder(true);

      const paidAmount = paymentMethod === 'due' ? 0 : grandTotal;
      const dueAmount = paymentMethod === 'due' ? grandTotal : 0;
      const paymentStatus: 'paid' | 'partial' | 'due' = paymentMethod === 'due' ? 'due' : 'paid';

      const orderData = {
        type: orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        status: 'pending' as const,
        customerId: activeCustomer?.id,
        customerName: activeCustomer?.name || 'Walk-in Customer',
        customerPhone: activeCustomer?.phone,
        deliveryAddress:
          orderType === 'delivery'
            ? activeCustomer?.address || 'Counter Pick'
            : undefined,
        deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
        items: cartItems,
        subtotal,
        discountAmount,
        discountPercent: discountType === 'percent' ? discountValue : undefined,
        taxAmount,
        total: grandTotal,
        paymentMethod,
        paymentStatus,
        paidAmount,
        dueAmount,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        notes: orderNotes.trim() || undefined,
      };

      const finalOrder = await createPosOrderTransaction({
        orderData,
        user: currentUser,
      });

      playSound('success');
      showToast(
        `Order #${finalOrder.orderNumber} placed! Cost: ${settings.currency} ${(finalOrder.totalCost || 0).toLocaleString()} · Net Profit: +${settings.currency} ${(finalOrder.netProfit || 0).toLocaleString()} (${finalOrder.profitMarginPercent || 0}%)`,
        'success'
      );
      setShowPaymentModal(false);
      handleClearCart();
      triggerDataRefresh();

      // Auto silent print if configured, else show receipt preview modal
      if (settings.autoPrintReceiptOnCheckout) {
        await triggerPrintReceipt(finalOrder, 'receipt');
      } else {
        previewReceipt(finalOrder, 'receipt');
      }
    } catch (err: any) {
      console.error('Failed to complete POS order', err);
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#121214]">
      {/* ---------------- LEFT: MENU CATALOG ---------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-zinc-800/80">
        {/* Top Bar: Search & Order Type */}
        <div className="p-3 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Order Type Tabs */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                orderType === 'dine_in'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                orderType === 'takeaway'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                orderType === 'delivery'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Table Selector (if Dine-In) */}
          {orderType === 'dine_in' && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-zinc-400 font-medium">Table:</span>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-[#FF6B00]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={`T${num}`}>
                    Table {num}
                  </option>
                ))}
                <option value="Takeout Bar">Bar Counter</option>
                <option value="Family Hall 1">Hall 1</option>
                <option value="Family Hall 2">Hall 2</option>
              </select>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search burgers, wraps, fries..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B00]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="p-2.5 bg-[#141417] border-b border-zinc-800/80 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-zinc-100 text-zinc-900 font-bold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#FF6B00] text-white font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 auto-rows-max">
          {filteredProducts.map((product) => {
            const hasMultipleVariants = product.variants.length > 1;
            const startingPrice = product.variants[0]?.price || product.basePrice;

            return (
              <button
                key={product.id}
                onClick={() => handleProductTap(product)}
                className="group relative flex flex-col justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-[#FF6B00]/70 hover:bg-zinc-900 transition-all text-left shadow-sm active:scale-[0.98]"
              >
                {product.isPopular && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
                    Hot
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-sm text-zinc-100 group-hover:text-[#FF6B00] transition-colors line-clamp-1 pr-8">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="font-mono font-extrabold text-sm text-white">
                    {settings.currency} {startingPrice.toLocaleString()}
                    {hasMultipleVariants && (
                      <span className="text-[10px] font-normal text-zinc-400 ml-1">+</span>
                    )}
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 group-hover:bg-[#FF6B00] group-hover:text-white transition-colors font-medium">
                    {hasMultipleVariants ? 'Options' : '+ Add'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 1-System Fast Kitchen Prep Ticker */}
        {showKitchenStrip && (
          <div className="bg-[#141417] border-t border-zinc-800 p-2.5 shrink-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                  Kitchen Prep Ticker ({liveKitchenOrders.length})
                </span>
                <span className="text-[10px] text-zinc-500 hidden sm:inline">
                  · 1-System Live Counter
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('kitchen')}
                  className="text-[10px] text-[#FF6B00] hover:underline font-bold"
                >
                  Full KDS View →
                </button>
                <button
                  onClick={() => setShowKitchenStrip(false)}
                  className="text-[10px] text-zinc-500 hover:text-white"
                  title="Hide ticker"
                >
                  ✕
                </button>
              </div>
            </div>

            {liveKitchenOrders.length === 0 ? (
              <div className="text-[11px] text-zinc-500 italic py-1 text-center bg-zinc-950/60 rounded-lg border border-zinc-800/60">
                No orders currently in kitchen prep queue
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {liveKitchenOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs shrink-0 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-1 font-bold text-white">
                        <span className="font-mono text-[#FF6B00]">#{ord.orderNumber}</span>
                        <span className="text-[10px] uppercase font-semibold text-zinc-400">
                          [{ord.type.replace('_', ' ')}]
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 max-w-[140px] truncate">
                        {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                    </div>

                    {ord.status === 'pending' ? (
                      <button
                        onClick={() => handleAdvanceKitchenStatus(ord, 'preparing')}
                        className="px-2 py-0.5 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white text-[10px] font-bold shrink-0 transition-colors"
                      >
                        Cook
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdvanceKitchenStatus(ord, 'ready')}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shrink-0 transition-colors"
                      >
                        Ready
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1-System Fast Hotkeys Bar */}
        <div className="bg-[#121214] border-t border-zinc-800/80 px-3 py-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Shortcuts:</span>
            <span><strong className="text-zinc-300">F1</strong> POS</span>
            <span><strong className="text-zinc-300">F2</strong> Kitchen</span>
            <span><strong className="text-zinc-300">F3</strong> Drawer</span>
            <span><strong className="text-zinc-300">F4</strong> Stats</span>
          </div>

          <div className="flex items-center gap-2 font-sans">
            {!showKitchenStrip && (
              <button
                onClick={() => setShowKitchenStrip(true)}
                className="text-[10px] text-zinc-400 hover:text-white"
              >
                Show Kitchen Bar
              </button>
            )}
            {isInstallable && (
              <button
                onClick={promptInstall}
                className="flex items-center gap-1 text-[10px] text-[#FF6B00] font-bold hover:underline"
              >
                <Download className="w-3 h-3" />
                <span>Install POS App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- RIGHT: ORDER CART & CHECKOUT ---------------- */}
      <div className="w-full lg:w-96 bg-[#161619] border-t lg:border-t-0 flex flex-col h-[520px] lg:h-full shrink-0 shadow-xl">
        {/* Cart Header: Customer Selection & Held Orders */}
        <div className="p-3 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between gap-2">
          {/* Customer Dropdown */}
          <div className="flex-1 flex items-center gap-1.5">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#FF6B00] truncate"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.currentDue > 0 ? `(Due: ${c.currentDue})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Add New Customer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Held Orders Recall Button */}
          <button
            onClick={() => setShowHeldOrdersModal(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              heldOrders.length > 0
                ? 'bg-amber-950/40 border-amber-800 text-amber-400 hover:bg-amber-900/40'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Held Orders"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Held ({heldOrders.length})</span>
          </button>
        </div>

        {/* Customer Detail Banner if Delivery */}
        {orderType === 'delivery' && activeCustomer && (
          <div className="px-3 py-1.5 bg-blue-950/30 border-b border-blue-900/40 text-[11px] text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0 text-blue-400" />
              <span className="truncate">
                {activeCustomer.address || 'No address saved (click + to add)'}
              </span>
            </div>
            <span className="shrink-0 font-mono font-bold text-white">
              Fee: {settings.currency} {deliveryFee}
            </span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-400">Cart is empty</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Click any menu item to start order
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-xs text-white leading-tight">
                      {item.productName}
                      {item.variantName && item.variantName !== 'Standard' && (
                        <span className="text-zinc-400 font-normal ml-1">
                          ({item.variantName})
                        </span>
                      )}
                    </div>
                    {/* Addons */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {item.addons.map((a) => `+ ${a.name}`).join(', ')}
                      </div>
                    )}
                    {/* Notes */}
                    {item.notes && (
                      <div className="text-[10px] text-amber-400/90 font-medium italic mt-0.5">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-right font-mono font-bold text-xs text-white shrink-0">
                    {settings.currency} {item.itemTotal.toLocaleString()}
                  </div>
                </div>

                {/* Qty & Delete Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs">
                  <div className="text-[10px] text-zinc-500 font-mono">
                    <div>{settings.currency} {item.unitPrice.toLocaleString()} each</div>
                    {(() => {
                      const analysis = liveCostAnalysis.itemsWithCost.find((it) => it.id === item.id);
                      if (analysis && analysis.totalCost !== undefined) {
                        return (
                          <div className="text-[9px] text-zinc-400">
                            Cost: {settings.currency} {analysis.totalCost} · Profit: <span className="text-emerald-400 font-semibold">+{settings.currency} {analysis.profit}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveCartItem(item.id)}
                      className="w-6 h-6 rounded bg-red-950/30 hover:bg-red-900/50 text-red-400 flex items-center justify-center ml-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Financial Summary & Discounts */}
        <div className="p-3 bg-[#18181b] border-t border-zinc-800 space-y-2">
          {/* Quick Discount & Notes Accordion */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 flex-1">
              <span className="text-[10px] text-zinc-400">Discount:</span>
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-14 bg-transparent text-right font-mono font-bold text-white focus:outline-none"
              />
              <button
                onClick={() => setDiscountType((t) => (t === 'flat' ? 'percent' : 'flat'))}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                {discountType === 'flat' ? settings.currency : '%'}
              </button>
            </div>

            <button
              onClick={handleHoldOrder}
              disabled={cartItems.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
              title="Hold this order for later"
            >
              <Pause className="w-3 h-3 text-amber-400" />
              <span>Hold</span>
            </button>

            <button
              onClick={handleClearCart}
              disabled={cartItems.length === 0}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Clear Cart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subtotal & Net Total */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400 text-[11px]">
              <span>Subtotal:</span>
              <span className="font-mono text-zinc-200">
                {settings.currency} {subtotal.toLocaleString()}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-400 text-[11px]">
                <span>Discount:</span>
                <span className="font-mono">
                  -{settings.currency} {discountAmount.toLocaleString()}
                </span>
              </div>
            )}
            {orderType === 'delivery' && (
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Delivery Fee:</span>
                <span className="font-mono text-zinc-200">
                  +{settings.currency} {deliveryFee.toLocaleString()}
                </span>
              </div>
            )}
            {/* Live Cost & Net Profit Analysis for this Sale */}
            {cartItems.length > 0 && (
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono space-y-0.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Actual Cost (COGS):</span>
                  <span className="font-bold text-zinc-300">
                    {settings.currency} {liveCostAnalysis.totalCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Net Profit:</span>
                  <span>
                    +{settings.currency} {liveCostAnalysis.netProfit.toLocaleString()}{' '}
                    <span className="text-[10px] text-emerald-500 font-normal">
                      ({liveCostAnalysis.profitMarginPercent}%)
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
              <span className="font-extrabold text-sm text-white">TOTAL DUE:</span>
              <span className="font-mono font-black text-xl text-[#FF6B00]">
                {settings.currency} {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Primary Checkout Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cartItems.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-extrabold text-sm transition-all shadow-lg shadow-[#FF6B00]/25 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Banknote className="w-5 h-5" />
            <span>PAY {settings.currency} {grandTotal.toLocaleString()}</span>
          </button>
        </div>
      </div>

      {/* ---------------- CUSTOMIZATION / VARIANT MODAL ---------------- */}
      {activeProductForCustomization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white">
                {activeProductForCustomization.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {activeProductForCustomization.description}
              </p>
            </div>

            {/* Variants */}
            {activeProductForCustomization.variants.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">
                  Select Size / Variant
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {activeProductForCustomization.variants.map((v) => {
                    const isSelected = selectedVariant?.name === v.name;
                    return (
                      <button
                        key={v.name}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-white shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{v.name}</div>
                        <div className="font-mono text-xs text-[#FF6B00] font-semibold mt-1">
                          {settings.currency} {v.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons */}
            {activeProductForCustomization.addons.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">
                  Add-Ons & Extras (+ PKR 50)
                </label>
                <div className="space-y-1.5">
                  {activeProductForCustomization.addons.map((addon) => {
                    const isChecked = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id));
                          } else {
                            setSelectedAddons((prev) => [...prev, addon]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                          isChecked
                            ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                              isChecked
                                ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                                : 'border-zinc-700'
                            }`}
                          >
                            {isChecked && '✓'}
                          </div>
                          <span>{addon.name}</span>
                        </div>
                        <span className="font-mono text-zinc-400">
                          +{settings.currency} {addon.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Note */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Item Kitchen Note (Optional)
              </label>
              <input
                type="text"
                value={customItemNote}
                onChange={(e) => setCustomItemNote(e.target.value)}
                placeholder="e.g. Extra spicy, no onions, crispy"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCustomQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold flex items-center justify-center hover:bg-zinc-700"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono font-bold text-sm text-white">
                  {customQty}
                </span>
                <button
                  onClick={() => setCustomQty((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold flex items-center justify-center hover:bg-zinc-700"
                >
                  +
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveProductForCustomization(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCustomization}
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold text-xs transition-colors shadow-lg shadow-[#FF6B00]/20"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PAYMENT & TENDER MODAL ---------------- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-white">Finalize Payment</h3>
                <p className="text-xs text-zinc-400">
                  Order Type: <span className="uppercase text-white font-bold">{orderType}</span> · Customer: {activeCustomer?.name}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block font-semibold">TOTAL PAYABLE</span>
                <span className="font-mono text-2xl font-black text-[#FF6B00]">
                  {settings.currency} {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'card', label: 'Card / POS', icon: CreditCard },
                  { id: 'online', label: 'EasyPaisa/Jazz', icon: Smartphone },
                  { id: 'due', label: 'Credit / Due', icon: AlertCircle },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-bold text-center leading-tight">
                        {pm.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tender & Change Calculations */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-300">
                    Cash Tendered from Customer:
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400 font-mono">{settings.currency}</span>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                      className="w-28 text-right font-mono text-base font-extrabold bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#FF6B00]"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick Tender Currency Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[grandTotal, 500, 1000, 2000, 5000].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 font-semibold"
                    >
                      {amt === grandTotal ? 'Exact' : `${settings.currency} ${amt}`}
                    </button>
                  ))}
                </div>

                {/* Return Change Indicator */}
                <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400">CHANGE TO RETURN:</span>
                  <span
                    className={`font-mono font-extrabold text-lg ${
                      changeDue > 0 ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {settings.currency} {changeDue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Due Warning if Credit / Due */}
            {paymentMethod === 'due' && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Customer Ledger Due Alert</span>
                </div>
                <p>
                  This order of {settings.currency} {grandTotal.toLocaleString()} will be recorded
                  under <strong className="text-white">{activeCustomer?.name}</strong>'s ledger as
                  an outstanding receivable due.
                </p>
              </div>
            )}

            {/* General Order Instructions */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Order Notes / Special Requests
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Deliver before 8 PM, extra ketchup sachets, call on arrival"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00] resize-none"
              />
            </div>

            {/* Sale Cost & Net Profit Intelligence */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Actual Recipe Cost (COGS):</span>
                <span className="font-bold text-zinc-300">
                  {settings.currency} {liveCostAnalysis.totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Net Profit from this Sale:</span>
                <span className="font-extrabold text-emerald-400">
                  +{settings.currency} {liveCostAnalysis.netProfit.toLocaleString()}{' '}
                  <span className="text-[10px] text-emerald-500 font-normal">
                    ({liveCostAnalysis.profitMarginPercent}%)
                  </span>
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
              >
                Back to Cart
              </button>
              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmittingOrder}
                className="flex-2 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#FF6B00]/25 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmittingOrder ? 'Processing...' : 'Complete & Print Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- NEW CUSTOMER MODAL ---------------- */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveNewCustomer}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Add Customer</h3>
              <p className="text-xs text-zinc-400">Save for order history, dues & delivery</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Tariq Khan"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 03001234567"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Delivery Address
                </label>
                <textarea
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Sector B, Itfaq City"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold text-xs transition-colors shadow-lg shadow-[#FF6B00]/20"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- HELD ORDERS MODAL ---------------- */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-white">Held Orders</h3>
                <p className="text-xs text-zinc-400">Recall held carts to checkout</p>
              </div>
              <button
                onClick={() => setShowHeldOrdersModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {heldOrders.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No held orders found</p>
              ) : (
                heldOrders.map((h) => {
                  const total = h.items.reduce((sum, i) => sum + i.itemTotal, 0);
                  const time = new Date(h.heldAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {h.customerName || 'Walk-in'}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#FF6B00] px-1.5 py-0.2 bg-[#FF6B00]/10 rounded">
                            {h.orderType} {h.tableNumber ? `(${h.tableNumber})` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {h.items.length} items · {time}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          {settings.currency} {total.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRecallOrder(h)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-semibold"
                        >
                          Recall
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setShowHeldOrdersModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
