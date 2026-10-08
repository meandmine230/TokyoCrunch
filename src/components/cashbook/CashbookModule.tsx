import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CashbookSession, CashbookEntry } from '../../types';
import {
  getAllFromStore,
  saveToStore,
  getActiveCashSession,
  addAuditLog,
  downloadCsv,
} from '../../db/indexedDB';
import {
  BookOpen,
  Plus,
  Minus,
  Lock,
  Unlock,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const CashbookModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [activeSession, setActiveSession] = useState<CashbookSession | null>(null);
  const [sessions, setSessions] = useState<CashbookSession[]>([]);
  const [entries, setEntries] = useState<CashbookEntry[]>([]);

  // Open Session Modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openFloat, setOpenFloat] = useState<number>(5000);
  const [openNotes, setOpenNotes] = useState('');

  // Close Session Modal (Reconciliation)
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedPhysicalCash, setCountedPhysicalCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Manual Cash Drop / Float Injection Modal
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualType, setManualType] = useState<'capital_added' | 'cash_drop'>('cash_drop');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualDesc, setManualDesc] = useState('');

  useEffect(() => {
    const loadCashbook = async () => {
      try {
        const [allSessions, allEntries] = await Promise.all([
          getAllFromStore<CashbookSession>('cashbook_sessions'),
          getAllFromStore<CashbookEntry>('cashbook_entries'),
        ]);

        setSessions(
          allSessions.sort(
            (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
          )
        );
        const open = allSessions.find((s) => s.status === 'open') || null;
        setActiveSession(open);

        setEntries(
          allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
      } catch (err) {
        console.error('Failed to load cashbook', err);
      }
    };
    loadCashbook();
  }, [dataVersion]);

  // Active Session Entries
  const sessionEntries = useMemo(() => {
    if (!activeSession) return [];
    return entries.filter((e) => e.sessionId === activeSession.id);
  }, [entries, activeSession]);

  // Current Expected Cash in Register Calculation
  const { totalCashIn, totalCashOut, expectedCashInDrawer } = useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;

    for (const item of sessionEntries) {
      if (item.paymentMethod === 'cash') {
        if (item.amount > 0) {
          cashIn += item.amount;
        } else {
          cashOut += Math.abs(item.amount);
        }
      }
    }

    return {
      totalCashIn: cashIn,
      totalCashOut: cashOut,
      expectedCashInDrawer: cashIn - cashOut,
    };
  }, [sessionEntries]);

  // Open New Session
  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSession) {
      showToast('A cashbook session is already open', 'warning');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newSession: CashbookSession = {
      id: `cash-session-${Date.now()}`,
      sessionDate: todayStr,
      openedAt: new Date().toISOString(),
      openingCash: openFloat,
      status: 'open',
      openedBy: currentUser.name,
      notes: openNotes.trim() || undefined,
    };

    const initialEntry: CashbookEntry = {
      id: `cbe-${Date.now()}`,
      sessionId: newSession.id,
      date: new Date().toISOString(),
      type: 'opening_balance',
      amount: openFloat,
      runningBalance: openFloat,
      paymentMethod: 'cash',
      description: 'Opening register float',
      recordedBy: currentUser.name,
    };

    await saveToStore('cashbook_sessions', newSession);
    await saveToStore('cashbook_entries', initialEntry);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CASHBOOK_SESSION_OPENED',
      module: 'Cashbook',
      details: `Opened register session with float PKR ${openFloat}`,
    });

    showToast(`Register opened with PKR ${openFloat} float`, 'success');
    setShowOpenModal(false);
    triggerDataRefresh();
  };

  // Close Session
  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    const diff = countedPhysicalCash - expectedCashInDrawer;

    const updatedSession: CashbookSession = {
      ...activeSession,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name,
      expectedClosingCash: expectedCashInDrawer,
      actualClosingCash: countedPhysicalCash,
      cashDifference: diff,
      notes: closeNotes.trim() || undefined,
    };

    await saveToStore('cashbook_sessions', updatedSession);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CASHBOOK_SESSION_CLOSED',
      module: 'Cashbook',
      details: `Closed session. Expected: ${expectedCashInDrawer}, Actual: ${countedPhysicalCash}, Diff: ${diff}`,
    });

    showToast(`Cashbook closed. Difference: ${diff > 0 ? '+' : ''}${diff}`, 'info');
    setShowCloseModal(false);
    triggerDataRefresh();
  };

  // Manual Cash Injection or Cash Drop
  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      showToast('Open a register session first', 'warning');
      return;
    }
    if (manualAmount <= 0 || !manualDesc.trim()) {
      showToast('Enter valid amount and description', 'warning');
      return;
    }

    const isDrop = manualType === 'cash_drop';
    const amountVal = isDrop ? -manualAmount : manualAmount;

    const newEntry: CashbookEntry = {
      id: `cbe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: activeSession.id,
      date: new Date().toISOString(),
      type: manualType,
      amount: amountVal,
      runningBalance: 0,
      paymentMethod: 'cash',
      description: manualDesc.trim(),
      recordedBy: currentUser.name,
    };

    await saveToStore('cashbook_entries', newEntry);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: isDrop ? 'CASH_DROP' : 'CAPITAL_ADDED',
      module: 'Cashbook',
      details: `${isDrop ? 'Cash Drop' : 'Capital Added'}: PKR ${manualAmount} (${manualDesc})`,
    });

    showToast(isDrop ? 'Cash drop recorded' : 'Cash float added', 'success');
    setShowManualEntryModal(false);
    setManualAmount(0);
    setManualDesc('');
    triggerDataRefresh();
  };

  // Export CSV
  const handleExportCashbookCsv = () => {
    const headers = ['Date', 'Type', 'Amount', 'Channel', 'Description', 'Recorded By'];
    const rows = sessionEntries.map((e) => [
      e.date,
      e.type.replace('_', ' ').toUpperCase(),
      e.amount,
      e.paymentMethod,
      e.description,
      e.recordedBy,
    ]);
    downloadCsv(`Tokyo_Crunch_Cashbook_${activeSession?.sessionDate || 'session'}`, headers, rows);
    showToast('Exported active cashbook to CSV', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Cashbook & Drawer Register</h2>
            <p className="text-[11px] text-zinc-400">
              Shift register reconciliation, cash drawer tracking & daily closures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <>
              <button
                onClick={() => {
                  setManualType('cash_drop');
                  setManualAmount(0);
                  setShowManualEntryModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold"
              >
                <Minus className="w-4 h-4 text-red-400" />
                <span>Cash Drop</span>
              </button>

              <button
                onClick={() => {
                  setManualType('capital_added');
                  setManualAmount(0);
                  setShowManualEntryModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Float</span>
              </button>

              <button
                onClick={() => {
                  setCountedPhysicalCash(expectedCashInDrawer);
                  setShowCloseModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/25"
              >
                <Lock className="w-4 h-4" />
                <span>Close Register</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25"
            >
              <Unlock className="w-4 h-4" />
              <span>Open Register Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Register Summary Cards */}
      <div className="p-4 bg-[#141417] border-b border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
            Register Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeSession ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="font-extrabold text-sm text-white">
              {activeSession ? 'OPEN (Shift Active)' : 'CLOSED'}
            </span>
          </div>
          {activeSession && (
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Opened by {activeSession.openedBy}
            </span>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
            Total Cash In (Today)
          </span>
          <span className="font-mono text-base font-extrabold text-emerald-400 mt-1 block">
            +{settings.currency} {totalCashIn.toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Sales & inflows</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
            Total Cash Out (Today)
          </span>
          <span className="font-mono text-base font-extrabold text-red-400 mt-1 block">
            -{settings.currency} {totalCashOut.toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Expenses & stock</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-[#FF6B00]/40 ring-1 ring-[#FF6B00]/20">
          <span className="text-[10px] text-zinc-400 uppercase font-bold block">
            Current Drawer Cash
          </span>
          <span className="font-mono text-xl font-black text-white mt-1 block">
            {settings.currency} {expectedCashInDrawer.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#FF6B00] font-semibold block mt-0.5">
            Expected in physical register
          </span>
        </div>
      </div>

      {/* Session Entries Table */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-zinc-300 uppercase">
            Active Register Cash Log
          </span>
          {activeSession && (
            <button
              onClick={handleExportCashbookCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60 font-mono">
                <th className="py-3 px-4 font-semibold">Time</th>
                <th className="py-3 px-3 font-semibold">Transaction Type</th>
                <th className="py-3 px-3 font-semibold">Description</th>
                <th className="py-3 px-3 font-semibold">Ref #</th>
                <th className="py-3 px-3 font-semibold">Inflow (+)</th>
                <th className="py-3 px-3 font-semibold">Outflow (-)</th>
                <th className="py-3 px-4 text-right font-semibold">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {sessionEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 italic font-sans">
                    No cash transactions recorded in this register session yet.
                  </td>
                </tr>
              ) : (
                sessionEntries.map((entry) => {
                  const isInflow = entry.amount >= 0;

                  return (
                    <tr key={entry.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 text-zinc-400">
                        {new Date(entry.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            entry.type === 'pos_sale'
                              ? 'bg-emerald-950 text-emerald-400'
                              : entry.type === 'expense'
                              ? 'bg-red-950 text-red-400'
                              : entry.type === 'purchase_payment'
                              ? 'bg-amber-950 text-amber-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {entry.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-xs text-white">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">{entry.referenceId || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {isInflow ? `+${settings.currency} ${entry.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-red-400">
                        {!isInflow
                          ? `-${settings.currency} ${Math.abs(entry.amount).toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400 font-sans text-xs">
                        {entry.recordedBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- MODAL: OPEN REGISTER ---------------- */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleOpenSession}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Open Cash Register</h3>
              <p className="text-xs text-zinc-400">Start day or shift register session</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Opening Cash Float ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={openFloat || ''}
                  onChange={(e) => setOpenFloat(Number(e.target.value) || 0)}
                  placeholder="5000"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Session Notes
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="e.g. Morning Shift - Cashier 1"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Open Register
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: CLOSE REGISTER RECONCILIATION ---------------- */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCloseSession}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">End Shift & Close Drawer</h3>
              <p className="text-xs text-zinc-400">Perform physical cash count reconciliation</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                <span className="text-zinc-400">System Expected Cash:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {settings.currency} {expectedCashInDrawer.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Actual Physical Cash Counted *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={countedPhysicalCash || ''}
                  onChange={(e) => setCountedPhysicalCash(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-extrabold text-white focus:outline-none focus:border-[#FF6B00]"
                  autoFocus
                />
              </div>

              {/* Difference */}
              <div className="p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Difference (Short/Over):</span>
                <span
                  className={`font-mono font-bold ${
                    countedPhysicalCash - expectedCashInDrawer === 0
                      ? 'text-emerald-400'
                      : countedPhysicalCash - expectedCashInDrawer > 0
                      ? 'text-blue-400'
                      : 'text-red-400'
                  }`}
                >
                  {countedPhysicalCash - expectedCashInDrawer > 0 ? '+' : ''}
                  {settings.currency} {(countedPhysicalCash - expectedCashInDrawer).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Closing Notes
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. Safe handover to evening supervisor"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Confirm Closure
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: CASH DROP / FLOAT ---------------- */}
      {showManualEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveManualEntry}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">
                {manualType === 'cash_drop' ? 'Cash Drop / Withdrawal' : 'Add Register Float'}
              </h3>
              <p className="text-xs text-zinc-400">
                Direct register adjustment recorded in cashbook audit
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Amount ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={manualAmount || ''}
                  onChange={(e) => setManualAmount(Number(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Purpose / Description *
                </label>
                <input
                  type="text"
                  required
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder={
                    manualType === 'cash_drop'
                      ? 'e.g. Mid-day safe drop deposit'
                      : 'e.g. Extra change coin float from bank'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowManualEntryModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs ${
                  manualType === 'cash_drop'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-[#FF6B00] hover:bg-[#e05e00]'
                }`}
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
