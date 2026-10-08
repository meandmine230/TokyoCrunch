import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Supplier,
  PurchaseInvoice,
  PurchaseItem,
  Ingredient,
  PaymentMethod,
  SupplierLedgerEntry,
} from '../../types';
import {
  getAllFromStore,
  saveToStore,
  createPurchaseTransaction,
  recordSupplierPaymentTransaction,
  downloadCsv,
} from '../../db/indexedDB';
import {
  Truck,
  Plus,
  Receipt,
  DollarSign,
  FileSpreadsheet,
  Building,
  Phone,
  Trash2,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';

export const PurchasesModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerEntry[]>([]);

  // Active view: 'invoices' | 'suppliers' | 'ledger'
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'suppliers' | 'ledger'>('invoices');
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<string>('');

  // New Purchase Invoice Modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchSupplierId, setPurchSupplierId] = useState('');
  const [purchInvoiceNum, setPurchInvoiceNum] = useState('');
  const [purchDate, setPurchDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchItems, setPurchItems] = useState<PurchaseItem[]>([]);
  const [purchPaidAmount, setPurchPaidAmount] = useState<number>(0);
  const [purchPaymentMethod, setPurchPaymentMethod] = useState<PaymentMethod>('cash');
  const [purchNotes, setPurchNotes] = useState('');

  // Row input for purchase items
  const [selectedIngId, setSelectedIngId] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUnitCost, setItemUnitCost] = useState<number>(100);

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supCompany, setSupCompany] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Supplier Payment Modal
  const [showPaySupplierModal, setShowPaySupplierModal] = useState(false);
  const [paySupId, setPaySupId] = useState('');
  const [paySupAmount, setPaySupAmount] = useState<number>(0);
  const [paySupMethod, setPaySupMethod] = useState<PaymentMethod>('cash');
  const [paySupNotes, setPaySupNotes] = useState('');

  useEffect(() => {
    const loadPurchasesData = async () => {
      try {
        const [sups, purs, ings, sLedger] = await Promise.all([
          getAllFromStore<Supplier>('suppliers'),
          getAllFromStore<PurchaseInvoice>('purchases'),
          getAllFromStore<Ingredient>('ingredients'),
          getAllFromStore<SupplierLedgerEntry>('supplier_ledger'),
        ]);

        setSuppliers(sups);
        setPurchases(
          purs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        setIngredients(ings);
        setSupplierLedger(
          sLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );

        if (sups.length > 0 && !selectedSupplierForLedger) {
          setSelectedSupplierForLedger(sups[0].id);
        }
        if (ings.length > 0 && !selectedIngId) {
          setSelectedIngId(ings[0].id);
          setItemUnitCost(ings[0].unitCost);
        }
      } catch (err) {
        console.error('Failed to load purchases data', err);
      }
    };
    loadPurchasesData();
  }, [dataVersion]);

  // When ingredient selection changes, sync default unit cost
  const handleSelectIng = (id: string) => {
    setSelectedIngId(id);
    const found = ingredients.find((i) => i.id === id);
    if (found) {
      setItemUnitCost(found.unitCost);
    }
  };

  // Add Item to Purchase Cart
  const handleAddPurchaseItem = () => {
    if (!selectedIngId || itemQty <= 0 || itemUnitCost < 0) {
      showToast('Select valid item, quantity and cost', 'warning');
      return;
    }
    const ing = ingredients.find((i) => i.id === selectedIngId);
    if (!ing) return;

    const totalCost = Number((itemQty * itemUnitCost).toFixed(2));
    const newItem: PurchaseItem = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: ing.unit,
      quantity: itemQty,
      unitCost: itemUnitCost,
      totalCost,
    };

    setPurchItems((prev) => [...prev, newItem]);
    setItemQty(1);
  };

  const handleRemovePurchaseItem = (idx: number) => {
    setPurchItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculate invoice total
  const purchTotalAmount = useMemo(() => {
    return purchItems.reduce((sum, item) => sum + item.totalCost, 0);
  }, [purchItems]);

  const purchDueAmount = useMemo(() => {
    return Math.max(0, purchTotalAmount - purchPaidAmount);
  }, [purchTotalAmount, purchPaidAmount]);

  // Open New Purchase Modal
  const handleOpenPurchaseModal = () => {
    setPurchSupplierId(suppliers[0]?.id || '');
    setPurchInvoiceNum(`PINV-${Date.now().toString().slice(-6)}`);
    setPurchDate(new Date().toISOString().split('T')[0]);
    setPurchItems([]);
    setPurchPaidAmount(0);
    setPurchPaymentMethod('cash');
    setPurchNotes('');
    setShowPurchaseModal(true);
  };

  // Submit Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchSupplierId || purchItems.length === 0) {
      showToast('Supplier and at least 1 item are required', 'warning');
      return;
    }

    const supplier = suppliers.find((s) => s.id === purchSupplierId);
    if (!supplier) return;

    try {
      await createPurchaseTransaction({
        invoiceData: {
          invoiceNumber: purchInvoiceNum.trim() || `PINV-${Date.now().toString().slice(-5)}`,
          supplierId: supplier.id,
          supplierName: supplier.name,
          date: purchDate,
          items: purchItems,
          totalAmount: purchTotalAmount,
          paidAmount: purchPaidAmount,
          dueAmount: purchDueAmount,
          paymentMethod: purchPaymentMethod,
          notes: purchNotes.trim() || undefined,
          recordedBy: currentUser.name,
        },
        user: currentUser,
      });

      showToast('Purchase recorded & stock updated atomically', 'success');
      setShowPurchaseModal(false);
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to record purchase', 'error');
    }
  };

  // Save New Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      showToast('Supplier name and phone are required', 'warning');
      return;
    }

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: supName.trim(),
      company: supCompany.trim() || supName.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim() || undefined,
      currentDue: 0,
      createdAt: new Date().toISOString(),
    };

    await saveToStore('suppliers', newSup);
    showToast(`Supplier ${newSup.name} saved`, 'success');
    setShowSupplierModal(false);
    setSupName('');
    setSupCompany('');
    setSupPhone('');
    setSupAddress('');
    triggerDataRefresh();
  };

  // Pay Supplier
  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupId || paySupAmount <= 0) {
      showToast('Enter valid payment amount', 'warning');
      return;
    }

    try {
      await recordSupplierPaymentTransaction({
        supplierId: paySupId,
        amount: paySupAmount,
        paymentMethod: paySupMethod,
        notes: paySupNotes.trim() || undefined,
        user: currentUser,
      });

      showToast('Supplier payment logged & cashbook updated', 'success');
      setShowPaySupplierModal(false);
      setPaySupAmount(0);
      setPaySupNotes('');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Payment disbursement failed', 'error');
    }
  };

  // Filtered ledger for active selected supplier
  const activeSupplierLedger = useMemo(() => {
    return supplierLedger.filter((l) => l.supplierId === selectedSupplierForLedger);
  }, [supplierLedger, selectedSupplierForLedger]);

  const activeSupplierObj = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierForLedger);
  }, [suppliers, selectedSupplierForLedger]);

  // Export Invoices CSV
  const handleExportPurchasesCsv = () => {
    const headers = [
      'Invoice #',
      'Date',
      'Supplier',
      'Total Amount',
      'Paid Amount',
      'Due Balance',
      'Payment Method',
      'Recorded By',
    ];
    const rows = purchases.map((p) => [
      p.invoiceNumber,
      p.date,
      p.supplierName,
      p.totalAmount,
      p.paidAmount,
      p.dueAmount,
      p.paymentMethod,
      p.recordedBy,
    ]);
    downloadCsv(`Tokyo_Crunch_Purchases_${new Date().toISOString().split('T')[0]}`, headers, rows);
    showToast('Exported purchase invoices to CSV', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Purchases & Suppliers</h2>
            <p className="text-[11px] text-zinc-400">
              Procurement invoices, stock receipts & supplier credit ledgers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeSubTab === 'invoices'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Invoices ({purchases.length})
            </button>
            <button
              onClick={() => setActiveSubTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeSubTab === 'suppliers'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveSubTab('ledger')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeSubTab === 'ledger'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Supplier Ledger
            </button>
          </div>

          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
          >
            <Building className="w-4 h-4 text-zinc-400" />
            <span>+ Supplier</span>
          </button>

          <button
            onClick={handleOpenPurchaseModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Purchase</span>
          </button>
        </div>
      </div>

      {/* ---------------- TAB 1: INVOICES ---------------- */}
      {activeSubTab === 'invoices' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-300 uppercase">
              Purchases History
            </span>
            <button
              onClick={handleExportPurchasesCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Supplier</th>
                  <th className="py-3 px-3 font-semibold">Items</th>
                  <th className="py-3 px-3 font-semibold">Total Amount</th>
                  <th className="py-3 px-3 font-semibold">Paid</th>
                  <th className="py-3 px-3 font-semibold">Due Balance</th>
                  <th className="py-3 px-4 text-right font-semibold">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 italic">
                      No purchase invoices recorded yet. Click '+ New Purchase' to receive stock.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{p.date}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-200">{p.supplierName}</td>
                      <td className="py-3 px-3 text-zinc-400">
                        {p.items.map((i) => `${i.quantity} ${i.unit} ${i.ingredientName}`).join(', ')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {settings.currency} {p.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400">
                        {settings.currency} {p.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {p.dueAmount > 0 ? (
                          <span className="text-red-400 font-bold">
                            {settings.currency} {p.dueAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Paid in full</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">{p.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: SUPPLIERS DIRECTORY ---------------- */}
      {activeSubTab === 'suppliers' && (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-white">{s.name}</h3>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {s.company}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 mt-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{s.phone}</span>
                    </div>
                    {s.address && <div>Addr: {s.address}</div>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">
                      Current Payable Due
                    </span>
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        s.currentDue > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {settings.currency} {(s.currentDue || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {s.currentDue > 0 && (
                      <button
                        onClick={() => {
                          setPaySupId(s.id);
                          setPaySupAmount(s.currentDue);
                          setShowPaySupplierModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      >
                        Pay Due
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSupplierForLedger(s.id);
                        setActiveSubTab('ledger');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                    >
                      Ledger
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: SUPPLIER LEDGER ---------------- */}
      {activeSubTab === 'ledger' && (
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* Supplier Picker Sidebar */}
          <div className="w-full lg:w-72 bg-[#161619] border-r border-zinc-800 p-2 overflow-y-auto shrink-0 h-48 lg:h-full">
            <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 block">
              Select Supplier
            </span>
            <div className="space-y-1">
              {suppliers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSupplierForLedger(s.id)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex justify-between items-center ${
                    selectedSupplierForLedger === s.id
                      ? 'bg-[#FF6B00] text-white font-semibold shadow-sm'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/60'
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="text-[10px] opacity-80">{s.phone}</div>
                  </div>
                  <span className="font-mono text-[11px] font-bold shrink-0">
                    {settings.currency} {s.currentDue || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeSupplierObj && (
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-white">{activeSupplierObj.name}</h3>
                  <p className="text-xs text-zinc-400">
                    {activeSupplierObj.company} · Phone: {activeSupplierObj.phone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase block font-semibold">
                      Outstanding Due
                    </span>
                    <span className="font-mono font-bold text-red-400 text-base">
                      {settings.currency} {(activeSupplierObj.currentDue || 0).toLocaleString()}
                    </span>
                  </div>
                  {activeSupplierObj.currentDue > 0 && (
                    <button
                      onClick={() => {
                        setPaySupId(activeSupplierObj.id);
                        setPaySupAmount(activeSupplierObj.currentDue);
                        setShowPaySupplierModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Make Payment
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60 font-mono">
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Ref #</th>
                    <th className="py-2.5 px-3 font-semibold">Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Balance After</th>
                    <th className="py-2.5 px-4 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {activeSupplierLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                        No transactions recorded for this supplier
                      </td>
                    </tr>
                  ) : (
                    activeSupplierLedger.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-4 text-zinc-400">
                          {new Date(l.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              l.type === 'purchase_invoice'
                                ? 'bg-amber-950 text-amber-400'
                                : 'bg-emerald-950 text-emerald-400'
                            }`}
                          >
                            {l.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">{l.referenceId || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {settings.currency} {l.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#FF6B00]">
                          {settings.currency} {l.balanceAfter.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-300 font-sans text-xs">
                          {l.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: NEW PURCHASE INVOICE ---------------- */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitPurchase}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Record Purchase / Stock Receipt</h3>
              <p className="text-xs text-zinc-400">
                Automatically increments raw material stock & records ledger entries
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Supplier *
                </label>
                <select
                  value={purchSupplierId}
                  onChange={(e) => setPurchSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.company})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Invoice / Bill #
                </label>
                <input
                  type="text"
                  value={purchInvoiceNum}
                  onChange={(e) => setPurchInvoiceNum(e.target.value)}
                  placeholder="e.g. INV-1049"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={purchDate}
                  onChange={(e) => setPurchDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            {/* Line Items Adder */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
              <label className="block text-xs font-bold text-zinc-300 uppercase">
                Add Stock Items
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedIngId}
                  onChange={(e) => handleSelectIng(e.target.value)}
                  className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={itemQty || ''}
                  onChange={(e) => setItemQty(Number(e.target.value) || 0)}
                  placeholder="Qty"
                  className="w-20 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                />

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemUnitCost || ''}
                  onChange={(e) => setItemUnitCost(Number(e.target.value) || 0)}
                  placeholder="Cost"
                  className="w-24 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddPurchaseItem}
                  className="px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold"
                >
                  + Add Item
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {purchItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{item.ingredientName}</span>
                      <span className="text-zinc-400 font-mono ml-2">
                        {item.quantity} {item.unit} @ {settings.currency} {item.unitCost}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">
                        {settings.currency} {item.totalCost.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePurchaseItem(idx)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials & Payment */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-300">Total Purchase Cost:</span>
                <span className="font-mono text-[#FF6B00] text-base">
                  {settings.currency} {purchTotalAmount.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Amount Paid Now
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={purchTotalAmount}
                    value={purchPaidAmount || ''}
                    onChange={(e) => setPurchPaidAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Payment Disbursed Via
                  </label>
                  <select
                    value={purchPaymentMethod}
                    onChange={(e) => setPurchPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="cash">Cash (Drawer)</option>
                    <option value="online">Online / Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              {purchDueAmount > 0 && (
                <div className="text-xs text-amber-400 font-semibold flex justify-between">
                  <span>Balance Due Added to Supplier:</span>
                  <span className="font-mono">
                    {settings.currency} {purchDueAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Purchase Notes
              </label>
              <input
                type="text"
                value={purchNotes}
                onChange={(e) => setPurchNotes(e.target.value)}
                placeholder="e.g. Good quality chicken batch, weighed at delivery"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save Invoice & Add Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: NEW SUPPLIER ---------------- */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Add Supplier</h3>
              <p className="text-xs text-zinc-400">Track vendors for poultry, buns & packaging</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Haji Aslam"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Company / Vendor Name
                </label>
                <input
                  type="text"
                  value={supCompany}
                  onChange={(e) => setSupCompany(e.target.value)}
                  placeholder="e.g. Al-Madina Fresh Poultry"
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
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="e.g. 03009876543"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="e.g. Grain Market Sector B"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save Vendor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: PAY SUPPLIER DUE ---------------- */}
      {showPaySupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handlePaySupplier}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Pay Supplier Due</h3>
              <p className="text-xs text-zinc-400">
                Disburse payment & deduct from Cashbook automatically
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Payment Amount ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paySupAmount || ''}
                  onChange={(e) => setPaySupAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Payment Channel
                </label>
                <select
                  value={paySupMethod}
                  onChange={(e) => setPaySupMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                >
                  <option value="cash">Cash in Register (Deducts from Cashbook)</option>
                  <option value="online">Online Banking / JazzCash</option>
                  <option value="card">Card / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Notes / Receipt #
                </label>
                <input
                  type="text"
                  value={paySupNotes}
                  onChange={(e) => setPaySupNotes(e.target.value)}
                  placeholder="e.g. Paid weekly poultry bill via cash"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPaySupplierModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Disburse Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
