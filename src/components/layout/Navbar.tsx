import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Flame,
  User as UserIcon,
  KeyRound,
  DollarSign,
  Clock,
  Wifi,
  WifiOff,
  ChefHat,
  ShoppingBag,
  Radio,
  Download,
  Maximize2,
  Minimize2,
  BookOpen,
  Monitor,
} from 'lucide-react';
import { getAllFromStore, getActiveCashSession, getCurrentCashBalance } from '../../db/indexedDB';
import { Order } from '../../types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    users,
    switchUserWithPin,
    settings,
    isOnline,
    activeTab,
    setActiveTab,
    dataVersion,
    isInstallable,
    promptInstall,
    openManualModal,
    openDesktopSetupModal,
  } = useApp();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [activeKitchenOrders, setActiveKitchenOrders] = useState<number>(0);
  const [timeStr, setTimeStr] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update quick metrics (cash register & active kitchen orders)
  useEffect(() => {
    const loadQuickStats = async () => {
      try {
        const session = await getActiveCashSession();
        if (session) {
          const bal = await getCurrentCashBalance(session.id);
          setCashBalance(bal);
        } else {
          setCashBalance(0);
        }

        const orders: Order[] = await getAllFromStore('orders');
        const active = orders.filter(
          (o) => o.status === 'pending' || o.status === 'preparing'
        ).length;
        setActiveKitchenOrders(active);
      } catch (err) {
        console.error('Navbar quick stats failed', err);
      }
    };
    loadQuickStats();
  }, [dataVersion, activeTab]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    const success = switchUserWithPin(pinInput.trim());
    if (success) {
      setPinInput('');
      setPinError('');
      setShowPinModal(false);
    } else {
      setPinError('Invalid PIN code');
      setPinInput('');
    }
  };

  const handleQuickUserSelect = (targetPin: string) => {
    switchUserWithPin(targetPin);
    setShowPinModal(false);
  };

  return (
    <>
      <header className="no-print bg-[#18181b] border-b border-zinc-800 text-zinc-100 h-14 px-4 flex items-center justify-between select-none z-30 sticky top-0">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/20 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-sm tracking-tight text-white uppercase">
                  {settings.name || 'Tokyo Crunch'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30">
                  POS
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium truncate block max-w-[150px] sm:max-w-none">
                {settings.location || 'Itfaq City Commercial Area'}
              </span>
            </div>
          </button>
        </div>

        {/* Center: Live Quick Indicators */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          {/* Active Register Cash */}
          <button
            onClick={() => setActiveTab('cashbook')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            title="Cash in Register (Click to open Cashbook)"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Drawer:</span>
            <span className="font-mono font-bold text-white">
              {settings.currency} {cashBalance.toLocaleString()}
            </span>
          </button>

          {/* Kitchen Orders */}
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              activeKitchenOrders > 0
                ? 'bg-[#FF6B00]/10 border-[#FF6B00]/40 text-[#FF6B00] animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
            title="Kitchen Display Orders"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kitchen:</span>
            <span className="font-mono font-bold">
              {activeKitchenOrders} active
            </span>
          </button>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Right: Network, User, Switch */}
        <div className="flex items-center gap-2">
          {/* 1-System Mode Indicator */}
          <button
            onClick={() => setActiveTab('settings')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 border border-zinc-800 hover:border-[#FF6B00]/40 text-zinc-300 transition-colors"
            title="1-System Standalone Master (Click to view Live Sync Hub)"
          >
            <Radio className="w-3 h-3 text-[#FF6B00]" />
            <span>1-Sys Master</span>
          </button>

          {/* Operations Manual (PDF) Button */}
          <button
            onClick={openManualModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Open Store Operations Manual & Print as PDF"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="hidden sm:inline">Manual (PDF)</span>
          </button>

          {/* Desktop App Setup Button */}
          <button
            onClick={openDesktopSetupModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-[#FF6B00] hover:bg-[#FF6B00]/25 transition-colors"
            title="Desktop Application Setup & Windows Launcher"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop App</span>
          </button>

          {/* Offline / Online Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                : 'bg-amber-950/40 border-amber-800/40 text-amber-400'
            }`}
            title={isOnline ? 'Online + Local IndexedDB Storage' : 'Offline Mode (Local IndexedDB)'}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{isOnline ? 'Offline Ready' : 'Working Offline'}</span>
          </div>

          {/* Fullscreen Button for 1-System Counter */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Counter Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#FF6B00]" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* User Role Badge & Switcher */}
          <button
            onClick={() => setShowPinModal(true)}
            className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[#FF6B00]">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="text-left text-xs leading-none">
              <div className="font-semibold text-white max-w-[85px] truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-[#FF6B00] font-mono uppercase font-bold mt-0.5">
                {currentUser.role}
              </div>
            </div>
            <KeyRound className="w-3 h-3 text-zinc-400 ml-1" />
          </button>
        </div>
      </header>

      {/* Switch User PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center mx-auto mb-2 text-[#FF6B00]">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Switch Active User</h3>
              <p className="text-xs text-zinc-400 mt-1">Enter PIN or select a user role</p>
            </div>

            {/* Quick Switch Profiles */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickUserSelect(u.pin)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    currentUser.id === u.id
                      ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-white'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">{u.name}</div>
                  <div className="text-[10px] text-[#FF6B00] font-mono uppercase mt-0.5">
                    {u.role} (PIN: {u.pin})
                  </div>
                </button>
              ))}
            </div>

            {/* PIN Form */}
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Enter 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full text-center text-xl tracking-widest font-mono py-2.5 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-[#FF6B00]"
                  autoFocus
                />
                {pinError && <p className="text-xs text-red-500 mt-1 text-center">{pinError}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinError('');
                    setPinInput('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold text-xs transition-colors shadow-lg shadow-[#FF6B00]/20"
                >
                  Unlock & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
