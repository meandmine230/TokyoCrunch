import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, CustomerLedgerEntry, PaymentMethod } from '../../types';
import {
  getAllFromStore,
  saveToStore,
  recordCustomerPaymentTransaction,
  downloadCsv,
} from '../../db/indexedDB';
import {
  Users,
  Plus,
  DollarSign,
  Phone,
  MapPin,
  Search,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';

export const CustomersModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Collect Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payCustId, setPayCustId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Add/Edit Customer Modal
  const [showCustModal, setShowCustModal] = useState(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const [c, cl] = await Promise.all([
          getAllFromStore<Customer>('customers'),
          getAllFromStore<CustomerLedgerEntry>('customer_ledger'),
        ]);

        setCustomers(c);
        setCustomerLedger(
          cl.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );

        if (c.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(c[0].id);
        }
      } catch (err) {
        console.error('Failed to load customers data', err);
      }
    };
    loadCustomerData();
  }, [dataVersion]);

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  const activeCustomerLedger = useMemo(() => {
    return customerLedger.filter((l) => l.customerId === selectedCustomerId);
  }, [customerLedger, selectedCustomerId]);

  const handleOpenCollectPayment = (customer: Customer) => {
    setPayCustId(customer.id);
    setPayAmount(customer.currentDue || 0);
    setPayMethod('cash');
    setPayNotes('Due balance payment');
    setShowPayModal(true);
  };

  const handleConfirmCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustId || payAmount <= 0) {
      showToast('Enter valid payment amount', 'warning');
      return;
    }

    try {
      await recordCustomerPaymentTransaction({
        customerId: payCustId,
        amount: payAmount,
        paymentMethod: payMethod,
        notes: payNotes.trim() || undefined,
        user: currentUser,
      });

      showToast('Payment received & Cashbook updated', 'success');
      setShowPayModal(false);
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Payment collection failed', 'error');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      showToast('Name and phone are required', 'warning');
      return;
    }

    const cId = editingCustId || `cust-${Date.now()}`;
    const targetCust = customers.find((c) => c.id === cId);

    const newCust: Customer = {
      id: cId,
      name: custName.trim(),
      phone: custPhone.trim(),
      address: custAddress.trim() || undefined,
      totalOrders: targetCust?.totalOrders || 0,
      totalSpent: targetCust?.totalSpent || 0,
      currentDue: targetCust?.currentDue || 0,
      createdAt: targetCust?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveToStore('customers', newCust);
    showToast(`Customer ${newCust.name} saved`, 'success');
    setShowCustModal(false);
    triggerDataRefresh();
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  const handleExportCustomersCsv = () => {
    const headers = ['Name', 'Phone', 'Address', 'Total Orders', 'Total Spent', 'Current Due'];
    const rows = customers.map((c) => [
      c.name,
      c.phone,
      c.address || '',
      c.totalOrders,
      c.totalSpent,
      c.currentDue,
    ]);
    downloadCsv(`Tokyo_Crunch_Customers_${new Date().toISOString().split('T')[0]}`, headers, rows);
    showToast('Exported customer directory to CSV', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Customers & Credit Accounts</h2>
            <p className="text-[11px] text-zinc-400">
              Customer order history, dues balance & payment recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCustomersCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Export</span>
          </button>
          <button
            onClick={() => {
              setEditingCustId(null);
              setCustName('');
              setCustPhone('');
              setCustAddress('');
              setShowCustModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Customer</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Customer List */}
        <div className="w-full lg:w-80 bg-[#161619] border-r border-zinc-800 flex flex-col h-72 lg:h-full shrink-0">
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or phone..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>

          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomerId;

              return (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#FF6B00] text-white font-semibold shadow-md shadow-[#FF6B00]/20'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate font-semibold">{cust.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                      {cust.phone}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    {cust.currentDue > 0 ? (
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-black/30 text-white' : 'bg-red-950/60 text-red-400'
                        }`}
                      >
                        Due: {cust.currentDue}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400">Clear</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Customer Account & Statement */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeCustomer ? (
            <>
              {/* Customer Profile Banner */}
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">{activeCustomer.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                      {activeCustomer.totalOrders} Orders
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      {activeCustomer.phone}
                    </span>
                    {activeCustomer.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {activeCustomer.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                      Total Spent
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {settings.currency} {activeCustomer.totalSpent.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right pl-4 border-l border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                      Current Due
                    </span>
                    <span
                      className={`font-mono text-base font-extrabold ${
                        activeCustomer.currentDue > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {settings.currency} {activeCustomer.currentDue.toLocaleString()}
                    </span>
                  </div>

                  {activeCustomer.currentDue > 0 && (
                    <button
                      onClick={() => handleOpenCollectPayment(activeCustomer)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                    >
                      Collect Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Ledger Statement */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3 border-b border-zinc-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-white">Account Statement & Due History</span>
                  <span className="font-mono text-zinc-400">
                    {activeCustomerLedger.length} ledger entries
                  </span>
                </div>

                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Ref #</th>
                      <th className="py-2.5 px-3 font-semibold">Amount</th>
                      <th className="py-2.5 px-3 font-semibold">Balance Due</th>
                      <th className="py-2.5 px-4 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {activeCustomerLedger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 italic font-sans">
                          No credit transactions or dues recorded for this customer.
                        </td>
                      </tr>
                    ) : (
                      activeCustomerLedger.map((l) => (
                        <tr key={l.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-4 text-zinc-400">
                            {new Date(l.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                l.type === 'order_sale'
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
                          <td className="py-2.5 px-3 font-bold text-red-400">
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
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
              Select a customer to view ledger
            </div>
          )}
        </div>
      </div>

      {/* ---------------- MODAL: COLLECT PAYMENT ---------------- */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmCollectPayment}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Receive Due Payment</h3>
              <p className="text-xs text-zinc-400">
                Customer: {customers.find((c) => c.id === payCustId)?.name}
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
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Payment Received Via
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                >
                  <option value="cash">Cash (Adds to Register Cashbook)</option>
                  <option value="online">Online / EasyPaisa / JazzCash</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid in full at counter"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: ADD / EDIT CUSTOMER ---------------- */}
      {showCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">
                {editingCustId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-zinc-400">Customer account for orders & delivery</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Dr. Adnan"
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
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="e.g. 03219876543"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Delivery Address
                </label>
                <textarea
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="e.g. Commercial Area Block 2"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCustModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
