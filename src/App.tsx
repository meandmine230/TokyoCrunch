/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PosModule } from './components/pos/PosModule';
import { KitchenModule } from './components/kitchen/KitchenModule';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { MenuModule } from './components/menu/MenuModule';
import { RecipesModule } from './components/recipes/RecipesModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { PurchasesModule } from './components/purchases/PurchasesModule';
import { CustomersModule } from './components/customers/CustomersModule';
import { ExpensesModule } from './components/expenses/ExpensesModule';
import { StaffModule } from './components/staff/StaffModule';
import { CashbookModule } from './components/cashbook/CashbookModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { PrintableReceipt } from './components/common/PrintableReceipt';
import { PrintableReport } from './components/common/PrintableReport';
import { OperationsManualModal } from './components/common/OperationsManualModal';
import { DesktopSetupModal } from './components/common/DesktopSetupModal';
import { Menu as MenuIcon, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeTab,
    toast,
    showManualModal,
    closeManualModal,
    showDesktopSetupModal,
    closeDesktopSetupModal,
  } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'pos':
        return <PosModule />;
      case 'kitchen':
        return <KitchenModule />;
      case 'dashboard':
        return <DashboardModule initialView="overview" />;
      case 'profit-analysis':
        return <DashboardModule initialView="profit-analysis" />;
      case 'menu':
        return <MenuModule />;
      case 'recipes':
        return <RecipesModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'purchases':
        return <PurchasesModule />;
      case 'customers':
        return <CustomersModule />;
      case 'expenses':
        return <ExpensesModule />;
      case 'staff':
        return <StaffModule />;
      case 'cashbook':
        return <CashbookModule />;
      case 'reports':
        return <ReportsModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <PosModule />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121214] text-zinc-100 font-sans select-none print:h-auto print:w-auto print:overflow-visible print:bg-white print:text-black">
      {/* Top Navbar */}
      <div className="no-print">
        <Navbar />
      </div>

      {/* Main Body Area */}
      <div className="flex-1 flex overflow-hidden relative no-print">
        {/* Sidebar Navigation */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Mobile Sidebar Hamburger Toggle (Floating bottom-left) */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="no-print md:hidden fixed bottom-4 left-4 z-30 w-11 h-11 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg shadow-black/50 active:scale-95"
          title="Open Menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        {/* Active Module Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {renderActiveModule()}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-white shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Printable Overlays (Visible during window.print()) */}
      <PrintableReceipt />
      <PrintableReport />
      <OperationsManualModal isOpen={showManualModal} onClose={closeManualModal} />
      <DesktopSetupModal isOpen={showDesktopSetupModal} onClose={closeDesktopSetupModal} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
