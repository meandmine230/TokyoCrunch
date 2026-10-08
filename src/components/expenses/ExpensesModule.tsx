import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import {
  getAllFromStore,
  createExpenseTransaction,
  downloadCsv,
} from '../../db/indexedDB';
import {
  Receipt,
  Plus,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';

export const ExpensesModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('month');

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Utilities');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDesc, setExpDesc] = useState('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  const categories: ExpenseCategory[] = [
    'Rent',
    'Utilities',
    'Gas & Electricity',
    'Packaging',
    'Cleaning & Sanitation',
    'Maintenance',
    'Marketing',
    'Salaries',
    'Misc',
  ];

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const data = await getAllFromStore<Expense>('expenses');
        setExpenses(
          data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
      } catch (err) {
        console.error('Failed to load expenses', err);
      }
    };
    loadExpenses();
  }, [dataVersion]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0 || !expDesc.trim()) {
      showToast('Enter valid amount and description', 'warning');
      return;
    }

    try {
      await createExpenseTransaction({
        expenseData: {
          category: expCategory,
          amount: expAmount,
          description: expDesc.trim(),
          paymentMethod: expMethod,
          date: expDate,
          paidBy: currentUser.name,
        },
        user: currentUser,
      });

      showToast('Expense recorded & Cashbook updated', 'success');
      setShowAddModal(false);
      setExpAmount(0);
      setExpDesc('');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save expense', 'error');
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (dateFilter === 'today' && !e.date.startsWith(todayStr)) return false;
      if (dateFilter === 'month' && !e.date.startsWith(currentMonthStr)) return false;
      return true;
    });
  }, [expenses, filterCategory, dateFilter, todayStr, currentMonthStr]);

  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Paid By'];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.category,
      e.description,
      e.amount,
      e.paymentMethod,
      e.paidBy,
    ]);
    downloadCsv(`Tokyo_Crunch_Expenses_${todayStr}`, headers, rows);
    showToast('Exported expenses to CSV', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Daily Operational Expenses</h2>
            <p className="text-[11px] text-zinc-400">
              Track rent, gas, electric, cleaning & maintenance costs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Summary */}
      <div className="p-3 bg-[#141417] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                dateFilter === 'today'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                dateFilter === 'month'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                dateFilter === 'all'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Total Expense Sum */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Total Filtered:</span>
          <span className="font-mono text-base font-extrabold text-red-400">
            {settings.currency} {totalExpenseSum.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60 font-mono">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Description</th>
                <th className="py-3 px-3 font-semibold">Channel</th>
                <th className="py-3 px-3 font-semibold">Amount</th>
                <th className="py-3 px-4 text-right font-semibold">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                    No expense records found for this filter
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-zinc-400 font-mono">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[10px] font-semibold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">{exp.description}</td>
                    <td className="py-3 px-3 capitalize text-zinc-400">{exp.paymentMethod}</td>
                    <td className="py-3 px-3 font-mono font-bold text-red-400">
                      {settings.currency} {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400">{exp.paidBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- MODAL: RECORD EXPENSE ---------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveExpense}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Record Expense</h3>
              <p className="text-xs text-zinc-400">
                Cash payments automatically deduct from drawer register
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Expense Category *
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Amount ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expAmount || ''}
                  onChange={(e) => setExpAmount(Number(e.target.value) || 0)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Description / Specific Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. 5kg detergent powder & mop sticks"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Paid From
                  </label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="cash">Cash (Register)</option>
                    <option value="online">Online / Bank</option>
                    <option value="card">Company Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
