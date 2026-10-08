import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { getAllFromStore, updateOrderStatus, voidOrderTransaction } from '../../db/indexedDB';
import { playSound } from '../../utils/sound';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Printer,
  AlertTriangle,
  RotateCcw,
  Utensils,
  ShoppingBag,
  Truck,
  Filter,
  Volume2,
  RefreshCw,
} from 'lucide-react';

export const KitchenModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerPrintReceipt, triggerDataRefresh, dataVersion } =
    useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [voidModalOrder, setVoidModalOrder] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevPendingCountRef = useRef<number>(-1);

  // Clock tick for elapsed time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const loadOrders = async () => {
    try {
      const allOrders = await getAllFromStore<Order>('orders');
      // Sort newest first
      const sorted = allOrders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sorted);

      // Check for incoming new tickets for audio chime
      const currentPending = sorted.filter((o) => o.status === 'pending').length;
      if (prevPendingCountRef.current !== -1 && currentPending > prevPendingCountRef.current) {
        playSound('kitchen');
        showToast('🔔 New kitchen order ticket arrived!', 'info');
      }
      prevPendingCountRef.current = currentPending;
    } catch (err) {
      console.error('Failed to load kitchen orders', err);
    }
  };

  // Load orders on dataVersion and on 3-second live polling interval
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [dataVersion]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Order status advancement
  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, nextStatus, currentUser);
      playSound(nextStatus === 'ready' ? 'kitchen' : 'beep');
      showToast(`Order #${order.orderNumber} moved to ${nextStatus.toUpperCase()}`, 'success');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order', 'error');
    }
  };

  // Void order
  const handleConfirmVoid = async () => {
    if (!voidModalOrder || !voidReason.trim()) {
      showToast('Please provide a reason to void this order', 'warning');
      return;
    }

    try {
      await voidOrderTransaction({
        orderId: voidModalOrder.id,
        reason: voidReason.trim(),
        user: currentUser,
      });
      playSound('alert');
      showToast(`Order #${voidModalOrder.orderNumber} voided and stock restored.`, 'info');
      setVoidModalOrder(null);
      setVoidReason('');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to void order', 'error');
    }
  };

  // Filtered orders
  const activeOrders = orders.filter((o) => {
    if (filterType !== 'all' && o.type !== filterType) return false;
    return true;
  });

  const pendingOrders = activeOrders.filter((o) => o.status === 'pending');
  const preparingOrders = activeOrders.filter((o) => o.status === 'preparing');
  const readyOrders = activeOrders.filter((o) => o.status === 'ready');
  const completedOrders = activeOrders.filter((o) => o.status === 'completed').slice(0, 10);

  // Time elapsed formatter
  const getElapsedBadge = (createdAtIso: string) => {
    const elapsedMinutes = Math.floor((currentTime - new Date(createdAtIso).getTime()) / (1000 * 60));
    let colorClass = 'bg-emerald-950/60 border-emerald-800 text-emerald-400';
    if (elapsedMinutes >= 15) {
      colorClass = 'bg-red-950/80 border-red-700 text-red-400 animate-pulse font-bold';
    } else if (elapsedMinutes >= 8) {
      colorClass = 'bg-amber-950/60 border-amber-800 text-amber-400';
    }

    return (
      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-mono flex items-center gap-1 ${colorClass}`}>
        <Clock className="w-3 h-3" />
        <span>{elapsedMinutes}m</span>
      </span>
    );
  };

  const renderOrderCard = (order: Order) => {
    const isNew = order.status === 'pending';
    const isPreparing = order.status === 'preparing';
    const isReady = order.status === 'ready';

    return (
      <div
        key={order.id}
        className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all shadow-md ${
          isNew
            ? 'bg-zinc-900 border-[#FF6B00]/60 ring-1 ring-[#FF6B00]/40'
            : isPreparing
            ? 'bg-zinc-900 border-amber-500/40'
            : isReady
            ? 'bg-zinc-900 border-emerald-500/40'
            : 'bg-zinc-950 border-zinc-800 opacity-60'
        }`}
      >
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white tracking-wide">
                  #{order.orderNumber}
                </span>
                <span className="text-[10px] uppercase font-bold text-[#FF6B00] px-1.5 py-0.2 bg-[#FF6B00]/15 rounded flex items-center gap-1">
                  {order.type === 'dine_in' && <Utensils className="w-2.5 h-2.5" />}
                  {order.type === 'takeaway' && <ShoppingBag className="w-2.5 h-2.5" />}
                  {order.type === 'delivery' && <Truck className="w-2.5 h-2.5" />}
                  <span>{order.type.replace('_', ' ')}</span>
                  {order.tableNumber && <span>({order.tableNumber})</span>}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Cust: {order.customerName || 'Walk-in'}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {getElapsedBadge(order.createdAt)}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 py-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-mono font-extrabold text-white text-sm bg-zinc-800 px-1.5 py-0.5 rounded leading-none shrink-0">
                    {item.quantity}x
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-zinc-100 text-xs">
                      {item.productName}
                    </span>
                    {item.variantName && item.variantName !== 'Standard' && (
                      <span className="text-zinc-400 ml-1">({item.variantName})</span>
                    )}

                    {/* Addons */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[11px] text-[#FF6B00] font-medium mt-0.5">
                        {item.addons.map((a) => `+ ${a.name}`).join(', ')}
                      </div>
                    )}

                    {/* Item Notes */}
                    {item.notes && (
                      <div className="text-[11px] text-red-400 font-bold bg-red-950/30 px-1.5 py-0.5 rounded mt-0.5">
                        ⚠️ {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* General Notes */}
          {order.notes && (
            <div className="mt-2 p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
              <strong className="text-zinc-400">Order Note:</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => triggerPrintReceipt(order, 'kot')}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Print Kitchen Ticket (KOT)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {currentUser.role === 'admin' && order.status !== 'completed' && order.status !== 'voided' && (
              <button
                onClick={() => setVoidModalOrder(order)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors"
                title="Void / Cancel Order"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Progression Button */}
          {isNew && (
            <button
              onClick={() => handleAdvanceStatus(order, 'preparing')}
              className="flex-1 py-1.5 px-3 rounded-lg bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Start Cook</span>
            </button>
          )}

          {isPreparing && (
            <button
              onClick={() => handleAdvanceStatus(order, 'ready')}
              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Ready</span>
            </button>
          )}

          {isReady && (
            <button
              onClick={() => handleAdvanceStatus(order, 'completed')}
              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Serve / Dispatch</span>
            </button>
          )}

          {order.status === 'completed' && (
            <span className="text-[11px] text-zinc-500 font-mono">Completed</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header Filter */}
      <div className="p-3 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Kitchen Display System (KDS)</h2>
            <p className="text-[11px] text-zinc-400">
              Live prep orders & cooking tickets
            </p>
          </div>
        </div>

        {/* Order Type Filter & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Real-time indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live KDS Sync</span>
          </div>

          {/* Test Chime Button */}
          <button
            onClick={() => {
              playSound('kitchen');
              showToast('🔔 Kitchen Order Bell chimed!', 'info');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
            title="Test kitchen arrival bell chime"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="hidden md:inline">Test Bell</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Force refresh tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF6B00]' : ''}`} />
          </button>

          {/* Type Filter */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'all' ? 'bg-[#FF6B00] text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('dine_in')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'dine_in' ? 'bg-[#FF6B00] text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setFilterType('takeaway')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'takeaway' ? 'bg-[#FF6B00] text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Takeaway
            </button>
            <button
              onClick={() => setFilterType('delivery')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'delivery' ? 'bg-[#FF6B00] text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Delivery
            </button>
          </div>
        </div>
      </div>

      {/* 4 Column Kanban Board */}
      <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 overflow-hidden">
        {/* COLUMN 1: NEW / PENDING */}
        <div className="bg-[#161619] border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-pulse" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                New Tickets
              </h3>
            </div>
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00]">
              {pendingOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
            {pendingOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 text-xs italic">
                No new orders in queue
              </div>
            ) : (
              pendingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div className="bg-[#161619] border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                Cooking / Grill
              </h3>
            </div>
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 text-xs italic">
                Nothing cooking currently
              </div>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* COLUMN 3: READY */}
        <div className="bg-[#161619] border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                Ready at Counter
              </h3>
            </div>
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
            {readyOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 text-xs italic">
                No orders waiting for pickup
              </div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* COLUMN 4: RECENTLY COMPLETED */}
        <div className="bg-[#161619] border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden hidden xl:flex">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-zinc-300">
                Dispatched
              </h3>
            </div>
            <span className="font-mono text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {completedOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
            {completedOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 text-xs italic">
                No completed orders yet
              </div>
            ) : (
              completedOrders.map(renderOrderCard)
            )}
          </div>
        </div>
      </div>

      {/* Void Modal */}
      {voidModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">
                Void Order #{voidModalOrder.orderNumber}?
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              Voiding will restore all recipe ingredients back to stock and reverse cash/dues entries.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Reason for Cancellation *
              </label>
              <input
                type="text"
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Customer cancelled, wrong item prepared"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-600/20"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
