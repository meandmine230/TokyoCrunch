import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, RestaurantSettings, Order } from '../types';
import { getSettings, getAllFromStore, initializeDatabase, createAutoSnapshot } from '../db/indexedDB';
import { initialUsers, initialSettings } from '../db/seedData';
import { playSound } from '../utils/sound';
import {
  generateReceiptHtml,
  generateKotHtml,
  printThermalDirect,
} from '../utils/thermalPrinter';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface PrintReceiptData {
  order: Order;
  mode: 'receipt' | 'kot';
}

export interface PrintableReportData {
  title: string;
  subtitle?: string;
  dateRange: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string | number }[];
}

interface AppContextType {
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchUserWithPin: (pin: string) => boolean;
  settings: RestaurantSettings;
  refreshSettings: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  isOnline: boolean;
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  printData: PrintReceiptData | null;
  triggerPrintReceipt: (order: Order, mode?: 'receipt' | 'kot', forceModal?: boolean) => void;
  previewReceipt: (order: Order, mode?: 'receipt' | 'kot') => void;
  closePrintReceipt: () => void;
  printReportData: PrintableReportData | null;
  triggerPrintReport: (data: PrintableReportData) => void;
  closePrintReport: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dataVersion: number;
  triggerDataRefresh: () => void;
  isInstallable: boolean;
  promptInstall: () => void;
  showManualModal: boolean;
  openManualModal: () => void;
  closeManualModal: () => void;
  showDesktopSetupModal: boolean;
  openDesktopSetupModal: () => void;
  closeDesktopSetupModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('tokyo_crunch_sync_bus');
  } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [settings, setSettings] = useState<RestaurantSettings>(initialSettings);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [toast, setToast] = useState<Toast | null>(null);
  const [printData, setPrintData] = useState<PrintReceiptData | null>(null);
  const [printReportData, setPrintReportData] = useState<PrintableReportData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [dataVersion, setDataVersion] = useState<number>(1);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const triggerDataRefresh = () => {
    setDataVersion((v) => v + 1);
    try {
      syncChannel?.postMessage({ type: 'REFRESH_BROADCAST', timestamp: Date.now() });
      if (typeof window !== 'undefined') {
        localStorage.setItem('tokyo_crunch_sync_ping', String(Date.now()));
      }
    } catch {}

    // 1-System safety: Auto snapshot after database modifications
    if (typeof window !== 'undefined') {
      window.clearTimeout((window as any).__tc_snap_timer);
      (window as any).__tc_snap_timer = window.setTimeout(() => {
        createAutoSnapshot().catch(() => {});
      }, 2500);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToast({ id, type, message });
    if (type === 'success') playSound('beep');
    if (type === 'error' || type === 'warning') playSound('alert');
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 3500);
  };

  const refreshSettings = async () => {
    try {
      const s = await getSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const refreshUsers = async () => {
    try {
      const u = await getAllFromStore<User>('users');
      if (u && u.length > 0) {
        setUsers(u);
        const found = u.find((x) => x.id === currentUser.id);
        if (found) setCurrentUser(found);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await refreshSettings();
      await refreshUsers();
    };
    init();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA Install Prompt for 1-system installation
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 1-System Fast Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if inside an active input or textarea (unless F keys)
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('kitchen');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('cashbook');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('dashboard');
      } else if (e.key === 'Escape') {
        if (printData) setPrintData(null);
        if (printReportData) setPrintReportData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cross-tab real-time sync bus
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data?.type === 'REFRESH_BROADCAST') {
          setDataVersion((v) => v + 1);
        }
      };
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'tokyo_crunch_sync_ping') {
        setDataVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [printData, printReportData]);

  const promptInstall = () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          setIsInstallable(false);
          showToast('Tokyo Crunch POS installed to desktop!', 'success');
        }
        setDeferredInstallPrompt(null);
      });
    } else {
      showToast('To install, use Chrome/Edge menu > "Install Tokyo Crunch"', 'info');
    }
  };

  const switchUserWithPin = (pin: string): boolean => {
    const matched = users.find((u) => u.pin === pin.trim() && u.active);
    if (matched) {
      setCurrentUser(matched);
      showToast(`Switched user to ${matched.name} (${matched.role.toUpperCase()})`, 'success');
      return true;
    }
    showToast('Invalid PIN code', 'error');
    return false;
  };

  const triggerPrintReceipt = async (
    order: Order,
    mode: 'receipt' | 'kot' = 'receipt',
    forceModal = false
  ) => {
    if (forceModal) {
      setPrintData({ order, mode });
      return;
    }

    // Direct single-click silent printing
    try {
      const htmlContent =
        mode === 'kot'
          ? generateKotHtml(order, settings, {
              paperWidth: settings.thermalPrinterWidth || '80mm',
              fontSize: (settings.thermalFontSize as any) || 'normal',
              feedLines: settings.thermalCutFeedLines ?? 2,
            })
          : generateReceiptHtml(order, settings, {
              paperWidth: settings.thermalPrinterWidth || '80mm',
              fontSize: (settings.thermalFontSize as any) || 'normal',
              feedLines: settings.thermalCutFeedLines ?? 2,
            });

      await printThermalDirect(htmlContent, settings.thermalPrinterWidth || '80mm');
      playSound('beep');
      showToast(
        mode === 'kot'
          ? `⚡ Kitchen KOT #${order.orderNumber} printed!`
          : `⚡ Thermal Receipt #${order.orderNumber} printed!`,
        'success'
      );
    } catch (err) {
      console.warn('Silent thermal print failed, opening preview modal', err);
      setPrintData({ order, mode });
    }
  };

  const previewReceipt = (order: Order, mode: 'receipt' | 'kot' = 'receipt') => {
    setPrintData({ order, mode });
  };

  const closePrintReceipt = () => {
    setPrintData(null);
  };

  const triggerPrintReport = (data: PrintableReportData) => {
    setPrintReportData(data);
  };

  const closePrintReport = () => {
    setPrintReportData(null);
  };

  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const openManualModal = () => setShowManualModal(true);
  const closeManualModal = () => setShowManualModal(false);

  const [showDesktopSetupModal, setShowDesktopSetupModal] = useState<boolean>(false);
  const openDesktopSetupModal = () => setShowDesktopSetupModal(true);
  const closeDesktopSetupModal = () => setShowDesktopSetupModal(false);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser,
        switchUserWithPin,
        settings,
        refreshSettings,
        refreshUsers,
        isOnline,
        toast,
        showToast,
        printData,
        triggerPrintReceipt,
        previewReceipt,
        closePrintReceipt,
        printReportData,
        triggerPrintReport,
        closePrintReport,
        activeTab,
        setActiveTab,
        dataVersion,
        triggerDataRefresh,
        isInstallable,
        promptInstall,
        showManualModal,
        openManualModal,
        closeManualModal,
        showDesktopSetupModal,
        openDesktopSetupModal,
        closeDesktopSetupModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
