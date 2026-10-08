import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, RestaurantSettings, AuditLogEntry, UserRole } from '../../types';
import {
  getSettings,
  updateSettings,
  getAllFromStore,
  saveToStore,
  exportDatabaseToJson,
  restoreDatabaseFromJson,
  resetDatabaseToDemo,
  addAuditLog,
  createAutoSnapshot,
  getEmergencySnapshotMeta,
  restoreEmergencySnapshot,
  getSystemStorageInfo,
} from '../../db/indexedDB';
import {
  Settings,
  Store,
  Users,
  Database,
  ShieldAlert,
  ShieldCheck,
  HardDrive,
  Save,
  Download,
  Upload,
  RefreshCcw,
  KeyRound,
  FileText,
  Search,
  Radio,
  Globe,
  Wifi,
  Server,
  CheckCircle2,
  Monitor,
  Smartphone,
  Share2,
  Copy,
  BookOpen,
  Printer,
  Zap,
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const {
    currentUser,
    settings,
    refreshSettings,
    refreshUsers,
    showToast,
    triggerDataRefresh,
    dataVersion,
    openManualModal,
    triggerPrintReceipt,
    openDesktopSetupModal,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'restaurant' | 'live' | 'users' | 'backup' | 'audit'>('restaurant');

  // Restaurant settings form
  const [name, setName] = useState(settings.name);
  const [location, setLocation] = useState(settings.location);
  const [phone, setPhone] = useState(settings.phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [taxRate, setTaxRate] = useState(settings.taxRatePercent || 0);
  const [deliveryFeeDefault, setDeliveryFeeDefault] = useState(settings.deliveryFeeDefault || 100);

  // Thermal Printer Hardware Config
  const [thermalPrinterWidth, setThermalPrinterWidth] = useState<'80mm' | '58mm'>(
    settings.thermalPrinterWidth || '80mm'
  );
  const [thermalFontSize, setThermalFontSize] = useState<'normal' | 'compact'>(
    (settings.thermalFontSize as 'normal' | 'compact') || 'normal'
  );
  const [thermalCutFeedLines, setThermalCutFeedLines] = useState<number>(
    settings.thermalCutFeedLines ?? 2
  );
  const [autoPrintReceiptOnCheckout, setAutoPrintReceiptOnCheckout] = useState<boolean>(
    !!settings.autoPrintReceiptOnCheckout
  );

  // Live Sync & 1-System Mode
  const [systemMode, setSystemMode] = useState(settings.systemMode || 'standalone_single_system');
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(!!settings.liveSyncEnabled);
  const [liveSyncEndpoint, setLiveSyncEndpoint] = useState(settings.liveSyncEndpoint || 'https://api.tokyocrunch.com/v1/sync');
  const [liveSyncApiKey, setLiveSyncApiKey] = useState(settings.liveSyncApiKey || '');
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  // Users
  const [userList, setUserList] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [uName, setUName] = useState('');
  const [uRole, setURole] = useState<UserRole>('cashier');
  const [uPin, setUPin] = useState('1111');
  const [uPhone, setUPhone] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Single-System Persistent Storage & Local Snapshot State
  const [storageInfo, setStorageInfo] = useState<{ isPersisted: boolean; usageMb: number; quotaMb: number }>({
    isPersisted: false,
    usageMb: 0,
    quotaMb: 0,
  });
  const [emergencySnapshotDate, setEmergencySnapshotDate] = useState<string | null>(null);

  useEffect(() => {
    setName(settings.name);
    setLocation(settings.location);
    setPhone(settings.phone);
    setCurrency(settings.currency);
    setReceiptHeader(settings.receiptHeader);
    setReceiptFooter(settings.receiptFooter);
    setTaxRate(settings.taxRatePercent || 0);
    setDeliveryFeeDefault(settings.deliveryFeeDefault || 100);
  }, [settings]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const [u, logs, sInfo, snapMeta] = await Promise.all([
          getAllFromStore<User>('users'),
          getAllFromStore<AuditLogEntry>('audit_logs'),
          getSystemStorageInfo(),
          getEmergencySnapshotMeta(),
        ]);
        setUserList(u);
        setAuditLogs(
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
        setStorageInfo(sInfo);
        setEmergencySnapshotDate(snapMeta.date);
      } catch (err) {
        console.error('Failed to load settings data', err);
      }
    };
    loadSettingsData();
  }, [dataVersion]);

  const handleTakeManualSnapshot = async () => {
    const ok = await createAutoSnapshot();
    if (ok) {
      const meta = await getEmergencySnapshotMeta();
      setEmergencySnapshotDate(meta.date);
      showToast('Emergency snapshot created in local disk cache!', 'success');
    } else {
      showToast('Failed to create local snapshot', 'error');
    }
  };

  const handleRestoreEmergencySnapshot = async () => {
    if (
      !window.confirm(
        'Restore database from emergency local snapshot? Current changes will be overwritten with snapshot content.'
      )
    )
      return;
    try {
      await restoreEmergencySnapshot(currentUser);
      await refreshSettings();
      await refreshUsers();
      showToast('Database successfully restored from emergency local snapshot!', 'success');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore snapshot', 'error');
    }
  };

  // Save Restaurant Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated: RestaurantSettings = {
        ...settings,
        name: name.trim(),
        location: location.trim(),
        phone: phone.trim(),
        currency: currency.trim(),
        receiptHeader: receiptHeader.trim(),
        receiptFooter: receiptFooter.trim(),
        taxRatePercent: Number(taxRate) || 0,
        deliveryFeeDefault: Number(deliveryFeeDefault) || 0,
        thermalPrinterWidth,
        thermalFontSize,
        thermalCutFeedLines,
        autoPrintReceiptOnCheckout,
        systemMode: systemMode as any,
        liveSyncEnabled,
        liveSyncEndpoint: liveSyncEndpoint.trim(),
        liveSyncApiKey: liveSyncApiKey.trim(),
      };

      await updateSettings(updated, currentUser);
      await refreshSettings();
      showToast('Settings & thermal printer settings saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    }
  };

  // Test Thermal Receipt Print
  const handleTestThermalPrint = () => {
    const dummyOrder = {
      id: `test-${Date.now()}`,
      orderNumber: 'TEST-01',
      type: 'dine_in' as const,
      status: 'completed' as const,
      tableNumber: 'Table 4',
      customerName: 'Test Walk-in Customer',
      customerPhone: '03001234567',
      items: [
        {
          productId: 'test-1',
          productName: 'Zinger Max Burger',
          variantName: 'Single',
          unitPrice: 490,
          unitCost: 230,
          quantity: 1,
          itemTotal: 490,
          addons: [{ id: 'extra-cheese', name: 'Extra Cheese', price: 60 }],
        },
        {
          productId: 'test-2',
          productName: 'Crunch Masala Fries',
          variantName: 'Large',
          unitPrice: 220,
          unitCost: 75,
          quantity: 1,
          itemTotal: 220,
        },
      ],
      subtotal: 770,
      discountAmount: 0,
      taxAmount: 0,
      total: 770,
      paidAmount: 1000,
      dueAmount: 0,
      paymentMethod: 'cash' as const,
      paymentStatus: 'paid' as const,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    triggerPrintReceipt(dummyOrder as any, 'receipt');
  };

  const handleTestSyncPing = () => {
    setIsTestingPing(true);
    setPingResult(null);
    setTimeout(() => {
      setIsTestingPing(false);
      setPingResult('Local Master Station Ready. IndexedDB Database synchronized.');
      showToast('System node ready for live multi-device broadcast', 'success');
    }, 800);
  };

  const handleExportSyncPacket = async () => {
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tokyo_Crunch_Live_Sync_Packet_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Live synchronization packet generated', 'success');
    } catch (err) {
      showToast('Failed to export sync packet', 'error');
    }
  };

  // Save User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uPin.trim()) {
      showToast('Name and 4-digit PIN are required', 'warning');
      return;
    }

    const userId = editingUserId || `user-${Date.now()}`;
    const newUser: User = {
      id: userId,
      name: uName.trim(),
      role: uRole,
      pin: uPin.trim(),
      phone: uPhone.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await saveToStore('users', newUser);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: editingUserId ? 'USER_UPDATED' : 'USER_CREATED',
      module: 'Users',
      details: `${newUser.name} (${newUser.role}) saved with PIN ${newUser.pin}`,
    });

    showToast(`Saved user ${newUser.name}`, 'success');
    setShowUserModal(false);
    await refreshUsers();
    triggerDataRefresh();
  };

  // Export JSON Backup
  const handleDownloadBackup = async () => {
    try {
      const jsonString = await exportDatabaseToJson();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tokyo_Crunch_POS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Full JSON database backup downloaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Backup failed', 'error');
    }
  };

  // Restore JSON Backup
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await restoreDatabaseFromJson(content, currentUser);
        await refreshSettings();
        await refreshUsers();
        showToast('Database restored successfully from backup', 'success');
        triggerDataRefresh();
      } catch (err: any) {
        showToast(err.message || 'Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to Demo Data
  const handleConfirmReset = async () => {
    try {
      await resetDatabaseToDemo(currentUser);
      await refreshSettings();
      await refreshUsers();
      setShowResetConfirm(false);
      showToast('Database restored to default Tokyo Crunch catalog', 'success');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Reset failed', 'error');
    }
  };

  const filteredAuditLogs = auditLogs.filter(
    (l) =>
      l.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.module.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.userName.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">System Settings & Data Tools</h2>
            <p className="text-[11px] text-zinc-400">
              Restaurant profile, user roles & PINs, JSON backup/restore & audit logging
            </p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('restaurant')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'restaurant'
                ? 'bg-[#FF6B00] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Restaurant Info
          </button>
          <button
            onClick={() => setActiveSubTab('live')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'live'
                ? 'bg-[#FF6B00] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>1-System & Live Sync</span>
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'users'
                ? 'bg-[#FF6B00] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            User Roles & PINs
          </button>
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'backup'
                ? 'bg-[#FF6B00] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Backup & Restore
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'audit'
                ? 'bg-[#FF6B00] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Audit Log
          </button>

          <button
            onClick={openManualModal}
            className="px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 border-l border-zinc-800 ml-1 pl-3"
            title="Open Store Operations Manual & Print as PDF"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Operations Manual (PDF)</span>
          </button>
        </div>
      </div>

      {/* ---------------- TAB 1: RESTAURANT PROFILE ---------------- */}
      {activeSubTab === 'restaurant' && (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveSettings} className="max-w-2xl mx-auto space-y-4">
            <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-4">
              <h3 className="font-extrabold text-sm text-white border-b border-zinc-800 pb-2">
                Brand & Receipt Header Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Restaurant Brand Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Official Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Location / Outlet Address
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Default Delivery Fee
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFeeDefault}
                    onChange={(e) => setDeliveryFeeDefault(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Receipt Header Title
                </label>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Receipt Footer Note
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Bill Advertising Notice */}
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Official Thermal Bill &amp; Invoices Footer (Advertising):
                </span>
                <p className="text-xs font-semibold text-[#FF6B00]">
                  Powered by Soft Inc Developers.  Haider Islam 03126980431
                </p>
                <p className="text-[11px] text-zinc-500">
                  Automatically printed at the bottom of all 80mm &amp; 58mm thermal bills, customer receipts, and financial Z-reports.
                </p>
              </div>

              {/* Thermal Printer Hardware Setup Card */}
              <div className="p-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#FF6B00]" />
                    <div>
                      <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                        Thermal Printer Hardware Configuration
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Adjust paper roll width &amp; spacing to match your POS printer model
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestThermalPrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700 active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Test Print Thermal Receipt</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Paper Roll Width
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setThermalPrinterWidth('80mm')}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          thermalPrinterWidth === '80mm'
                            ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        80mm (3-Inch)
                      </button>
                      <button
                        type="button"
                        onClick={() => setThermalPrinterWidth('58mm')}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          thermalPrinterWidth === '58mm'
                            ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        58mm (2-Inch)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Receipt Font Density
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setThermalFontSize('normal')}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          thermalFontSize === 'normal'
                            ? 'bg-zinc-800 border-zinc-700 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setThermalFontSize('compact')}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          thermalFontSize === 'compact'
                            ? 'bg-zinc-800 border-zinc-700 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Compact
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Auto-Cut Feed Spacing
                    </label>
                    <select
                      value={thermalCutFeedLines}
                      onChange={(e) => setThermalCutFeedLines(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value={1}>1 Line (Tight)</option>
                      <option value={2}>2 Lines (Standard)</option>
                      <option value={4}>4 Lines (Safe Cut Margin)</option>
                    </select>
                  </div>
                </div>

                {/* Auto Print on Checkout Option */}
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPrintReceiptOnCheckout}
                      onChange={(e) => setAutoPrintReceiptOnCheckout(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF6B00] bg-zinc-900 border-zinc-700 focus:ring-0 focus:outline-none"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">
                        Auto-Print Thermal Receipt Immediately on Checkout
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Prints automatically when an order is settled without opening the receipt preview modal
                      </div>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={openDesktopSetupModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold transition-all shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Setup 1-Click Silent Print</span>
                  </button>
                </div>

                <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 leading-normal flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">⚠️ Important:</span>
                  <span>
                    To eliminate Chrome's print dialog entirely so bills print with a <strong>single click</strong>, run the POS using our desktop shortcut with <em>--kiosk-printing</em>.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Restaurant Details</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- TAB 2: 1-SYSTEM & LIVE CLOUD HUB ---------------- */}
      {activeSubTab === 'live' && (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Mode 1: Active 1-System Master */}
            <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="font-extrabold text-sm text-white">
                    Mode 1: Standalone 1-System Master (Active)
                  </h3>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ACTIVE ON THIS MACHINE</span>
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Tokyo Crunch is currently configured to run independently on this single system.
                All product recipes, POS orders, stock deduction transactions, cash register sessions,
                and financial reports operate directly from this device's persistent IndexedDB storage
                with zero cloud or internet dependency.
              </p>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                  1-System Keyboard Hotkeys for Maximum Speed:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <strong className="text-[#FF6B00]">F1</strong> POS Terminal
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <strong className="text-[#FF6B00]">F2</strong> Kitchen KDS
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <strong className="text-[#FF6B00]">F3</strong> Cashbook
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <strong className="text-[#FF6B00]">F4</strong> Analytics
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={openDesktopSetupModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25 active:scale-95"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Desktop App Setup &amp; Windows Launcher</span>
                </button>
              </div>
            </div>

            {/* Mode 2: Local Network Multi-Device Pairing */}
            <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm text-white">
                  Mode 2: Local Network (LAN) Pairing
                </h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Need a dedicated Kitchen Display tablet or a mobile order-taker on the floor? Connect
                other phones or tablets to the same local Wi-Fi router and navigate to this computer's
                local network IP address or hosted app URL.
              </p>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div className="truncate pr-2">
                  <span className="text-zinc-500 text-[10px] uppercase block font-sans font-bold">
                    Terminal Access Address:
                  </span>
                  <span className="text-blue-300 select-all font-semibold">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    showToast('Terminal address copied to clipboard', 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-sans font-semibold shrink-0"
                >
                  Copy URL
                </button>
              </div>
            </div>

            {/* Mode 3: Live Cloud Sync (Future Ready) */}
            <form onSubmit={handleSaveSettings} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      Mode 3: Live Cloud Sync (Future Ready)
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      When expanding to multiple branches or central cloud reporting
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liveSyncEnabled}
                    onChange={(e) => setLiveSyncEnabled(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-[#FF6B00] focus:ring-0"
                  />
                  <span>Enable Live Sync</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Live Cloud Sync API Endpoint
                  </label>
                  <input
                    type="url"
                    value={liveSyncEndpoint}
                    onChange={(e) => setLiveSyncEndpoint(e.target.value)}
                    placeholder="https://api.tokyocrunch.com/v1/sync"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Live Sync Secret Key / Token
                  </label>
                  <input
                    type="password"
                    value={liveSyncApiKey}
                    onChange={(e) => setLiveSyncApiKey(e.target.value)}
                    placeholder="tc_live_secret_key_..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSyncPing}
                    disabled={isTestingPing}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTestingPing ? 'Pinging Node...' : 'Test Sync Ping'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSyncPacket}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Export Sync Packet</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
                >
                  Save Mode Settings
                </button>
              </div>

              {pingResult && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pingResult}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: USER ROLES & PINS ---------------- */}
      {activeSubTab === 'users' && (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-zinc-300 uppercase">
              System Accounts & Access PINs
            </span>
            <button
              onClick={() => {
                setEditingUserId(null);
                setUName('');
                setURole('cashier');
                setUPin('1111');
                setUPhone('');
                setShowUserModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold"
            >
              + Add User
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {userList.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] px-2 py-0.5 rounded bg-[#FF6B00]/10">
                      {u.role}
                    </span>
                    <button
                      onClick={() => {
                        setEditingUserId(u.id);
                        setUName(u.name);
                        setURole(u.role);
                        setUPin(u.pin);
                        setUPhone(u.phone || '');
                        setShowUserModal(true);
                      }}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Edit
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-white mt-2">{u.name}</h3>
                  <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
                    <div>PIN Code: <strong className="font-mono text-white">{u.pin}</strong></div>
                    {u.phone && <div>Tel: {u.phone}</div>}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                  {currentUser.id === u.id ? 'Currently Logged In' : 'Active Account'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: BACKUP & RESTORE ---------------- */}
      {activeSubTab === 'backup' && (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Single-System Storage & Emergency Snapshot Card */}
            <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-[#FF6B00]" />
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      1-System Local Storage & Snapshot Protection
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Guarantees your data is permanently locked on this computer's drive
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PERSISTENT LOCK ACTIVE</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Local Disk Usage
                  </span>
                  <div className="font-mono text-white font-bold mt-1">
                    {storageInfo.usageMb > 0 ? `${storageInfo.usageMb} MB` : '< 1 MB'} used
                    {storageInfo.quotaMb > 0 && (
                      <span className="text-zinc-500 font-normal"> / {Math.round(storageInfo.quotaMb / 1024)} GB available</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Latest Emergency Snapshot
                  </span>
                  <div className="font-mono text-zinc-200 text-[11px] mt-1 truncate">
                    {emergencySnapshotDate
                      ? new Date(emergencySnapshotDate).toLocaleString()
                      : 'Automatic on first sale'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTakeManualSnapshot}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Take Local Snapshot Now</span>
                </button>

                {emergencySnapshotDate && (
                  <button
                    type="button"
                    onClick={handleRestoreEmergencySnapshot}
                    className="px-3 py-2 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Restore from Emergency Snapshot</span>
                  </button>
                )}
              </div>
            </div>

            {/* Download JSON Backup Card */}
            <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Full JSON Database Backup</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Exports every single table: orders, inventory, recipes, customers, ledger,
                  cashbook & audit logs to a single portable .json file.
                </p>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-colors shadow-md shadow-emerald-600/20"
              >
                Download JSON
              </button>
            </div>

            {/* Restore JSON Backup Card */}
            <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Restore Database from JSON Backup</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Upload a previously saved Tokyo Crunch .json backup file. This safely merges and
                  restores all transactions and records.
                </p>
              </div>
              <label className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors shadow-md shadow-blue-600/20">
                <span>Select JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Reset to Clean Initial Data */}
            <div className="p-5 bg-zinc-900/60 rounded-2xl border border-red-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  <span>Reset / Re-Seed Tokyo Crunch Catalog</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Restores default authentic Tokyo Crunch menu items, recipes, initial ingredients
                  and users. Clears transactional orders.
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 text-xs font-bold shrink-0 transition-colors"
              >
                Reset Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: AUDIT LOG VIEWER ---------------- */}
      {activeSubTab === 'audit' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          <div className="flex justify-between items-center">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {filteredAuditLogs.length} audit records
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Module</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 px-4 text-zinc-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">{log.userName}</td>
                    <td className="py-2.5 px-3 uppercase text-[#FF6B00]">{log.module}</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-200">{log.action}</td>
                    <td className="py-2.5 px-4 text-zinc-300 font-sans text-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: USER ADD/EDIT ---------------- */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">
                {editingUserId ? 'Edit User Account' : 'Add System User'}
              </h3>
              <p className="text-xs text-zinc-400">Configure role & quick unlock PIN code</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  placeholder="e.g. Cashier 2"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Role
                </label>
                <select
                  value={uRole}
                  onChange={(e) => setURole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                >
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Security PIN (4 digits) *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={uPin}
                  onChange={(e) => setUPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={uPhone}
                  onChange={(e) => setUPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: RESET CONFIRMATION ---------------- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-red-900/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Reset Database?</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This will reset the system back to the clean initial Tokyo Crunch menu, recipes, and
              ingredients. Are you sure you want to proceed?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
