import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Staff, AttendanceRecord, SalaryPayment, PaymentMethod } from '../../types';
import {
  getAllFromStore,
  saveToStore,
  recordSalaryPaymentTransaction,
  downloadCsv,
} from '../../db/indexedDB';
import {
  UserCheck,
  Plus,
  Calendar,
  DollarSign,
  Phone,
  FileSpreadsheet,
  Check,
  X,
  Clock,
} from 'lucide-react';

export const StaffModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);

  // Subtab: 'staff' | 'attendance' | 'payroll'
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'attendance' | 'payroll'>('staff');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // New Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [stName, setStName] = useState('');
  const [stRole, setStRole] = useState<any>('Kitchen Assistant');
  const [stPhone, setStPhone] = useState('');
  const [stSalary, setStSalary] = useState<number>(30000);
  const [stJoinDate, setStJoinDate] = useState(new Date().toISOString().split('T')[0]);

  // Salary Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payStaffId, setPayStaffId] = useState('');
  const [payType, setPayType] = useState<'monthly_salary' | 'advance'>('monthly_salary');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMonth, setPayMonth] = useState('September 2026');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    const loadStaffData = async () => {
      try {
        const [st, att, sal] = await Promise.all([
          getAllFromStore<Staff>('staff'),
          getAllFromStore<AttendanceRecord>('attendance'),
          getAllFromStore<SalaryPayment>('salary_payments'),
        ]);

        setStaffList(st);
        setAttendance(att);
        setSalaryPayments(
          sal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );

        if (st.length > 0 && !payStaffId) {
          setPayStaffId(st[0].id);
          setPayAmount(st[0].salary);
        }
      } catch (err) {
        console.error('Failed to load staff data', err);
      }
    };
    loadStaffData();
  }, [dataVersion]);

  // Attendance for selected date
  const todaysAttendance = useMemo(() => {
    return attendance.filter((a) => a.date === selectedDate);
  }, [attendance, selectedDate]);

  const handleMarkAttendance = async (
    staff: Staff,
    status: 'present' | 'absent' | 'half_day' | 'leave'
  ) => {
    const existing = todaysAttendance.find((a) => a.staffId === staff.id);
    const recId = existing?.id || `att-${Date.now()}-${staff.id}`;

    const newRecord: AttendanceRecord = {
      id: recId,
      staffId: staff.id,
      staffName: staff.name,
      date: selectedDate,
      status,
    };

    await saveToStore('attendance', newRecord);
    setAttendance((prev) => [...prev.filter((a) => a.id !== recId), newRecord]);
    showToast(`Marked ${staff.name} as ${status.toUpperCase()}`, 'info');
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim() || !stPhone.trim()) {
      showToast('Name and phone are required', 'warning');
      return;
    }

    const sId = editingStaffId || `staff-${Date.now()}`;
    const newStaff: Staff = {
      id: sId,
      name: stName.trim(),
      role: stRole,
      phone: stPhone.trim(),
      salary: stSalary,
      joinDate: stJoinDate,
      active: true,
    };

    await saveToStore('staff', newStaff);
    showToast(`Saved employee: ${newStaff.name}`, 'success');
    setShowStaffModal(false);
    triggerDataRefresh();
  };

  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStaffId || payAmount <= 0) {
      showToast('Enter a valid payout amount', 'warning');
      return;
    }
    const targetStaff = staffList.find((s) => s.id === payStaffId);
    if (!targetStaff) return;

    try {
      await recordSalaryPaymentTransaction({
        paymentData: {
          staffId: targetStaff.id,
          staffName: targetStaff.name,
          date: new Date().toISOString().split('T')[0],
          month: payMonth,
          type: payType,
          amount: payAmount,
          paymentMethod: payMethod,
          notes: payNotes.trim() || undefined,
          paidBy: currentUser.name,
        },
        user: currentUser,
      });

      showToast('Salary disbursed, expense recorded & cashbook updated', 'success');
      setShowPayoutModal(false);
      setPayNotes('');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Salary payout failed', 'error');
    }
  };

  const handleExportPayrollCsv = () => {
    const headers = ['Date', 'Employee', 'Month', 'Type', 'Amount', 'Payment Method', 'Paid By'];
    const rows = salaryPayments.map((p) => [
      p.date,
      p.staffName,
      p.month,
      p.type.replace('_', ' ').toUpperCase(),
      p.amount,
      p.paymentMethod,
      p.paidBy,
    ]);
    downloadCsv(`Tokyo_Crunch_Payroll_${selectedDate}`, headers, rows);
    showToast('Exported payroll history to CSV', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Staff, Attendance & Payroll</h2>
            <p className="text-[11px] text-zinc-400">
              Staff directory, daily attendance roll call & salary disbursements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveSubTab('staff')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeSubTab === 'staff'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Employees ({staffList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('attendance')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeSubTab === 'attendance'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Daily Attendance
            </button>
            <button
              onClick={() => setActiveSubTab('payroll')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeSubTab === 'payroll'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Salary Payments
            </button>
          </div>

          <button
            onClick={() => {
              setEditingStaffId(null);
              setStName('');
              setStPhone('');
              setStSalary(32000);
              setShowStaffModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 text-[#FF6B00]" />
            <span>+ Employee</span>
          </button>

          <button
            onClick={() => {
              if (staffList.length > 0) {
                setPayStaffId(staffList[0].id);
                setPayAmount(staffList[0].salary);
              }
              setShowPayoutModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <DollarSign className="w-4 h-4" />
            <span>Disburse Salary</span>
          </button>
        </div>
      </div>

      {/* ---------------- TAB 1: EMPLOYEES DIRECTORY ---------------- */}
      {activeSubTab === 'staff' && (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {staffList.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-white">{st.name}</h3>
                    <span className="text-[10px] uppercase font-bold text-[#FF6B00] px-2 py-0.5 rounded bg-[#FF6B00]/10">
                      {st.role}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 mt-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{st.phone}</span>
                    </div>
                    <div>Joined: {st.joinDate}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">
                      Monthly Base
                    </span>
                    <span className="font-mono text-sm font-extrabold text-white">
                      {settings.currency} {st.salary.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setPayStaffId(st.id);
                      setPayAmount(st.salary);
                      setShowPayoutModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: DAILY ATTENDANCE ---------------- */}
      {activeSubTab === 'attendance' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold uppercase">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              Roll call: {todaysAttendance.length} / {staffList.length} marked
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-3 font-semibold">Designation</th>
                  <th className="py-3 px-3 font-semibold">Current Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Quick Attendance Tap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {staffList.map((st) => {
                  const record = todaysAttendance.find((a) => a.staffId === st.id);
                  const currentStatus = record?.status || 'unmarked';

                  return (
                    <tr key={st.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-bold text-white">{st.name}</td>
                      <td className="py-3 px-3 text-zinc-400">{st.role}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            currentStatus === 'present'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : currentStatus === 'absent'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : currentStatus === 'half_day'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleMarkAttendance(st, 'present')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(st, 'half_day')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            currentStatus === 'half_day'
                              ? 'bg-amber-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Half-Day
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(st, 'absent')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Absent
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: SALARY PAYOUTS ---------------- */}
      {activeSubTab === 'payroll' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-300 uppercase">
              Salary & Advance Payments History
            </span>
            <button
              onClick={handleExportPayrollCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60 font-mono">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Employee</th>
                  <th className="py-3 px-3 font-semibold">Period / Month</th>
                  <th className="py-3 px-3 font-semibold">Type</th>
                  <th className="py-3 px-3 font-semibold">Disbursed Via</th>
                  <th className="py-3 px-3 font-semibold">Amount</th>
                  <th className="py-3 px-4 text-right font-semibold">Disbursed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {salaryPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
                      No salary payouts recorded yet
                    </td>
                  </tr>
                ) : (
                  salaryPayments.map((sal) => (
                    <tr key={sal.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-400 font-mono">
                        {new Date(sal.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">{sal.staffName}</td>
                      <td className="py-3 px-3 text-zinc-300">{sal.month}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
                          {sal.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 capitalize text-zinc-400">{sal.paymentMethod}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {settings.currency} {sal.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">{sal.paidBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: NEW EMPLOYEE ---------------- */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveStaff}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Add Staff Member</h3>
              <p className="text-xs text-zinc-400">Employee profile & monthly base salary</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={stName}
                  onChange={(e) => setStName(e.target.value)}
                  placeholder="e.g. Bilal Ahmed"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Role / Job
                  </label>
                  <select
                    value={stRole}
                    onChange={(e) => setStRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Head Chef">Head Chef</option>
                    <option value="Kitchen Assistant">Kitchen Assistant</option>
                    <option value="Manager">Manager</option>
                    <option value="Rider">Delivery Rider</option>
                    <option value="Cleaner">Cleaner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Base Salary ({settings.currency})
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    value={stSalary || ''}
                    onChange={(e) => setStSalary(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={stPhone}
                  onChange={(e) => setStPhone(e.target.value)}
                  placeholder="e.g. 03034445566"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={stJoinDate}
                  onChange={(e) => setStJoinDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: DISBURSE SALARY ---------------- */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleDisburseSalary}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">Disburse Salary Payout</h3>
              <p className="text-xs text-zinc-400">
                Logged as salary expense & deducted from Cashbook register
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Select Employee *
                </label>
                <select
                  value={payStaffId}
                  onChange={(e) => {
                    setPayStaffId(e.target.value);
                    const s = staffList.find((x) => x.id === e.target.value);
                    if (s) setPayAmount(s.salary);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} - Base: {s.salary})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Payout Type
                  </label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="monthly_salary">Monthly Salary</option>
                    <option value="advance">Salary Advance</option>
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
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Salary Month
                  </label>
                  <input
                    type="text"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    placeholder="e.g. September 2026"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Channel
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="cash">Cash (Register)</option>
                    <option value="online">Online / Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Notes / Voucher #
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Full settlement for month"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Disburse Cash
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
