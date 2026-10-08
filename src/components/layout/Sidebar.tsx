import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Scroll,
  Boxes,
  Truck,
  Users,
  Receipt,
  UserCheck,
  BookOpen,
  BarChart3,
  Settings,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeTab, setActiveTab, currentUser, openManualModal } = useApp();

  const navItems = [
    { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, highlight: true },
    { id: 'kitchen', label: 'Kitchen (KDS)', icon: ChefHat },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profit-analysis', label: 'Profit Analysis', icon: TrendingUp },
    { id: 'menu', label: 'Menu Catalog', icon: UtensilsCrossed },
    { id: 'recipes', label: 'Recipes (BOM)', icon: Scroll },
    { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
    { id: 'purchases', label: 'Purchases & Suppliers', icon: Truck },
    { id: 'customers', label: 'Customers & Dues', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'staff', label: 'Staff & Payroll', icon: UserCheck },
    { id: 'cashbook', label: 'Cashbook Register', icon: BookOpen },
    { id: 'reports', label: 'Reports & P&L', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="no-print fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={`no-print fixed md:sticky top-14 left-0 bottom-0 w-60 bg-[#141417] border-r border-zinc-800/80 flex flex-col z-40 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all text-left ${
                  isActive
                    ? 'bg-[#FF6B00] text-white font-semibold shadow-md shadow-[#FF6B00]/25'
                    : item.highlight
                    ? 'bg-zinc-900/90 text-white hover:bg-zinc-800 border border-zinc-800/70'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : item.highlight ? 'text-[#FF6B00]' : 'text-zinc-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.id === 'pos' && !isActive && (
                  <span className="ml-auto text-[10px] font-mono bg-[#FF6B00]/20 text-[#FF6B00] px-1.5 py-0.5 rounded">
                    HOT
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex flex-col gap-1 bg-[#121214]">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="font-semibold text-zinc-300">Tokyo Crunch</span>
            <span className="font-mono text-[10px] text-emerald-400">v1.0 Offline</span>
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            Itfaq City Commercial Area
          </div>
          <button
            onClick={openManualModal}
            className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold transition-colors"
            title="Open Store Operations Manual & Print as PDF"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Operations Manual (PDF)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
