import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Staff, AttendanceRecord, SalaryPayment, PaymentMethod } from '../../types';
import {
  getAllFromStore,
  saveToStore,
  deleteFromStore,
  recordSalaryPaymentTransaction,
  downloadCsv,
  addAuditLog,
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
  Pencil,
  Trash2,
  AlertTriangle,
  Briefcase,
  Wallet,
  Calculator,
  Search,
  LayoutGrid,
  List,
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

  // Staff Filters & View
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');
  const [staffViewMode, setStaffViewMode] = useState<'grid' | 'table'>('grid');

  // Add / Edit Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [stName, setStName] = useState('');
  const [stRole, setStRole] = useState<Staff['role']>('Kitchen Assistant');
  const [stPhone, setStPhone] = useState('');
  const [stSalaryType, setStSalaryType] = useState<'monthly' | 'daily'>('monthly');
  const [stSalary, setStSalary] = useState<number>(30000);
  const [stJoinDate, setStJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [stActive, setStActive] = useState<boolean>(true);

  // Delete Confirmation Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  // Salary / Wage Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payStaffId, setPayStaffId] = useState('');
  const [payType, setPayType] = useState<'monthly_salary' | 'daily_wage' | 'advance'>('monthly_salary');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMonth, setPayMonth] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Default month name
  useEffect(() => {
    const curMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    setPayMonth(curMonth);
  }, []);

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
          setPayType(st[0].salaryType === 'daily' ? 'daily_wage' : 'monthly_salary');
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

  // Selected staff in Payout modal
  const selectedPayStaff = useMemo(() => {
    return staffList.find((s) => s.id === payStaffId);
  }, [staffList, payStaffId]);

  // Attendance calculation for daily wage staff
  const dailyWageStats = useMemo(() => {
    if (!selectedPayStaff || selectedPayStaff.salaryType !== 'daily') {
      return { presentCount: 0, halfDayCount: 0, totalDays: 0, suggestedTotal: 0 };
    }
    const staffAtt = attendance.filter((a) => a.staffId === selectedPayStaff.id);
    const presentCount = staffAtt.filter((a) => a.status === 'present').length;
    const halfDayCount = staffAtt.filter((a) => a.status === 'half_day').length;
    const totalDays = presentCount + halfDayCount * 0.5;
    const suggestedTotal = Math.round(totalDays * selectedPayStaff.salary);
    return { presentCount, halfDayCount, totalDays, suggestedTotal };
  }, [selectedPayStaff, attendance]);

  // Filtered staff list for directory
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesRole = staffRoleFilter === 'all' || s.role === staffRoleFilter;
      const q = staffSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [staffList, staffRoleFilter, staffSearchQuery]);

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

  // Open modal to create a new employee
  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setStName('');
    setStRole('Kitchen Assistant');
    setStPhone('');
    setStSalaryType('monthly');
    setStSalary(32000);
    setStJoinDate(new Date().toISOString().split('T')[0]);
    setStActive(true);
    setShowStaffModal(true);
  };

  // Open modal to edit an existing employee
  const handleOpenEditModal = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setStName(staff.name);
    setStRole(staff.role);
    setStPhone(staff.phone);
    setStSalaryType(staff.salaryType || 'monthly');
    setStSalary(staff.salary);
    setStJoinDate(staff.joinDate || new Date().toISOString().split('T')[0]);
    setStActive(staff.active);
    setShowStaffModal(true);
  };

  // Save (Create or Update) Staff
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim() || !stPhone.trim()) {
      showToast('Name and phone number are required', 'warning');
      return;
    }

    const sId = editingStaffId || `staff-${Date.now()}`;
    const newStaff: Staff = {
      id: sId,
      name: stName.trim(),
      role: stRole,
      phone: stPhone.trim(),
      salary: stSalary,
      salaryType: stSalaryType,
      joinDate: stJoinDate,
      active: stActive,
    };

    await saveToStore('staff', newStaff);
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: editingStaffId ? 'EMPLOYEE_UPDATED' : 'EMPLOYEE_CREATED',
      module: 'Staff',
      details: `${editingStaffId ? 'Updated' : 'Created'} employee: ${newStaff.name} (${newStaff.role}, ${newStaff.salaryType === 'daily' ? 'Daily Wage' : 'Monthly'} ${settings.currency} ${newStaff.salary})`,
    });

    showToast(
      editingStaffId ? `Updated employee: ${newStaff.name}` : `Added employee: ${newStaff.name}`,
      'success'
    );
    setShowStaffModal(false);
    setEditingStaffId(null);
    triggerDataRefresh();
  };

  // Open Delete Confirmation
  const handleOpenDeleteConfirm = (staff: Staff) => {
    setStaffToDelete(staff);
    setShowDeleteConfirm(true);
  };

  // Confirm Delete Staff
  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    try {
      await deleteFromStore('staff', staffToDelete.id);
      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'EMPLOYEE_DELETED',
        module: 'Staff',
        details: `Deleted employee record: ${staffToDelete.name} (${staffToDelete.role})`,
      });

      showToast(`Deleted employee: ${staffToDelete.name}`, 'info');
      setShowDeleteConfirm(false);
      setStaffToDelete(null);
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete staff member', 'error');
    }
  };

  // Disburse Salary or Daily Wage
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

      showToast(
        `${payType === 'daily_wage' ? 'Daily wage' : 'Salary'} disbursed, expense recorded & cashbook updated`,
        'success'
      );
      setShowPayoutModal(false);
      setPayNotes('');
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Salary payout failed', 'error');
    }
  };

  const handleExportPayrollCsv = () => {
    const headers = ['Date', 'Employee', 'Period/Month', 'Type', 'Amount', 'Payment Method', 'Paid By'];
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
              Staff directory with daily wage / monthly pay, attendance roll call & salary payouts
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
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
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-[#FF6B00]" />
            <span>+ Add Employee</span>
          </button>

          <button
            onClick={() => {
              if (staffList.length > 0) {
                setPayStaffId(staffList[0].id);
                setPayAmount(staffList[0].salary);
                setPayType(staffList[0].salaryType === 'daily' ? 'daily_wage' : 'monthly_salary');
              }
              setShowPayoutModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
          >
            <DollarSign className="w-4 h-4" />
            <span>Disburse Pay</span>
          </button>
        </div>
      </div>

      {/* ---------------- TAB 1: EMPLOYEES DIRECTORY ---------------- */}
      {activeSubTab === 'staff' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {/* Controls Bar: Search, Role Filter, View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-zinc-900/90 p-2.5 rounded-2xl border border-zinc-800">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Search employee by name, phone or role..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['all', 'Cashier', 'Head Chef', 'Kitchen Assistant', 'Manager', 'Rider', 'Cleaner'] as const).map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => setStaffRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      staffRoleFilter === role
                        ? 'bg-[#FF6B00] text-white shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {role === 'all' ? 'All Roles' : role}
                  </button>
                )
              )}
            </div>

            {/* View Mode Toggle (Grid vs Table) */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setStaffViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  staffViewMode === 'grid'
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setStaffViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  staffViewMode === 'table'
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Table Spreadsheet View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {staffList.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30 text-[#FF6B00]" />
              <p className="text-sm font-semibold">No employees registered yet</p>
              <button
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold"
              >
                + Add First Employee
              </button>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30 text-zinc-400" />
              <p className="text-sm font-semibold">No employees match "{staffSearchQuery}"</p>
              <button
                onClick={() => {
                  setStaffSearchQuery('');
                  setStaffRoleFilter('all');
                }}
                className="mt-2 text-xs text-[#FF6B00] hover:underline"
              >
                Clear Search Filter
              </button>
            </div>
          ) : staffViewMode === 'table' ? (
            /* Table View */
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-3 font-semibold">Designation</th>
                    <th className="py-3 px-3 font-semibold">Contact</th>
                    <th className="py-3 px-3 font-semibold">Compensation</th>
                    <th className="py-3 px-3 font-semibold">Wage / Salary Rate</th>
                    <th className="py-3 px-3 font-semibold">Joined Date</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredStaff.map((st) => (
                    <tr key={st.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span>{st.name}</span>
                        {!st.active && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500 font-bold uppercase">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] uppercase font-bold text-[#FF6B00] px-2 py-0.5 rounded bg-[#FF6B00]/10 border border-[#FF6B00]/20">
                          {st.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-300">{st.phone}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                            st.salaryType === 'daily'
                              ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80'
                              : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                          }`}
                        >
                          {st.salaryType === 'daily' ? 'Daily Wage' : 'Monthly Salary'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {settings.currency} {st.salary.toLocaleString()}
                        <span className="text-[10px] text-zinc-400 font-normal ml-0.5">
                          {st.salaryType === 'daily' ? '/day' : '/month'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-[11px]">{st.joinDate}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            st.active
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {st.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(st)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            title="Edit Employee Profile & Pay"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteConfirm(st)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPayStaffId(st.id);
                              setPayAmount(st.salary);
                              setPayType(st.salaryType === 'daily' ? 'daily_wage' : 'monthly_salary');
                              setShowPayoutModal(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B00]/15 hover:bg-[#FF6B00] border border-[#FF6B00]/30 text-[#FF6B00] hover:text-white text-[11px] font-bold transition-all"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {filteredStaff.map((st) => (
                <div
                  key={st.id}
                  className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm"
                >
                  <div>
                    {/* Header: Name, Designation & Action Buttons */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          <span>{st.name}</span>
                          {!st.active && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500 font-bold uppercase">
                              Inactive
                            </span>
                          )}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-[#FF6B00] px-2 py-0.5 rounded bg-[#FF6B00]/10 border border-[#FF6B00]/20">
                            {st.role}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                              st.salaryType === 'daily'
                                ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80'
                                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                            }`}
                          >
                            {st.salaryType === 'daily' ? 'Daily Wage' : 'Monthly'}
                          </span>
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(st)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Edit Employee Profile & Pay"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteConfirm(st)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Details: Phone & Join Date */}
                    <div className="text-xs text-zinc-400 mt-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{st.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Joined: {st.joinDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wage / Salary & Disburse Pay Button */}
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        {st.salaryType === 'daily' ? 'Wage Rate (Per Day)' : 'Monthly Base'}
                      </span>
                      <span className="font-mono text-sm font-black text-white">
                        {settings.currency} {st.salary.toLocaleString()}
                        <span className="text-[10px] text-zinc-400 font-sans font-normal ml-0.5">
                          {st.salaryType === 'daily' ? '/day' : '/mo'}
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPayStaffId(st.id);
                        setPayAmount(st.salary);
                        setPayType(st.salaryType === 'daily' ? 'daily_wage' : 'monthly_salary');
                        setShowPayoutModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-[#FF6B00] text-zinc-200 hover:text-white text-xs font-bold transition-all active:scale-95"
                    >
                      <Wallet className="w-3.5 h-3.5 text-[#FF6B00] group-hover:text-white" />
                      <span>Pay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 2: DAILY ATTENDANCE ---------------- */}
      {activeSubTab === 'attendance' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
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
                  <th className="py-3 px-3 font-semibold">Pay Type</th>
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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            st.salaryType === 'daily'
                              ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {st.salaryType === 'daily'
                            ? `Daily: ${settings.currency} ${st.salary}/day`
                            : `Monthly: ${settings.currency} ${st.salary}`}
                        </span>
                      </td>
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
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(st, 'half_day')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            currentStatus === 'half_day'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Half-Day
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(st, 'absent')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white shadow-sm'
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
              Salary &amp; Daily Wage Payments History
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
                      No salary or wage payouts recorded yet
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
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            sal.type === 'daily_wage'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-zinc-800 text-zinc-200'
                          }`}
                        >
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

      {/* ---------------- MODAL: ADD / EDIT EMPLOYEE ---------------- */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveStaff}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {editingStaffId ? 'Edit Employee Profile' : 'Add New Employee'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Manage staff details, designation, and salary / daily wage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Designation / Role
                  </label>
                  <select
                    value={stRole}
                    onChange={(e) => setStRole(e.target.value as any)}
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={stPhone}
                    onChange={(e) => setStPhone(e.target.value)}
                    placeholder="03001234567"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Salary Type Toggle (Monthly vs Daily Wage) */}
              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                <label className="block text-[11px] font-bold text-zinc-300 uppercase">
                  Compensation Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStSalaryType('monthly');
                      if (stSalary < 1000) setStSalary(32000);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all text-center ${
                      stSalaryType === 'monthly'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Monthly Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStSalaryType('daily');
                      if (stSalary > 5000) setStSalary(1200);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all text-center ${
                      stSalaryType === 'daily'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Daily Wage (Per Day)
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mt-2 mb-1">
                    {stSalaryType === 'daily'
                      ? `Daily Wage Rate (${settings.currency} per day) *`
                      : `Monthly Base Salary (${settings.currency} per month) *`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">
                      {settings.currency}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={stSalary || ''}
                      onChange={(e) => setStSalary(Number(e.target.value) || 0)}
                      placeholder={stSalaryType === 'daily' ? '1200' : '35000'}
                      className="w-full pl-12 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={stJoinDate}
                    onChange={(e) => setStJoinDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stActive}
                      onChange={(e) => setStActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF6B00] bg-zinc-900 border-zinc-700 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-white">Active Employee</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs shadow-md shadow-[#FF6B00]/25 transition-all"
              >
                {editingStaffId ? 'Update Employee' : 'Save Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: DELETE EMPLOYEE CONFIRMATION ---------------- */}
      {showDeleteConfirm && staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800/80 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-base text-white">Delete Employee Record?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to delete <strong className="text-white">{staffToDelete.name}</strong> ({staffToDelete.role}) from the staff directory?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStaffToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: DISBURSE SALARY / WAGE ---------------- */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleDisburseSalary}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white">Disburse Salary or Wage</h3>
                <p className="text-xs text-zinc-400">
                  Deducts from active Cashbook drawer &amp; records salary expense
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Select Employee *
                </label>
                <select
                  value={payStaffId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    setPayStaffId(chosenId);
                    const s = staffList.find((x) => x.id === chosenId);
                    if (s) {
                      setPayAmount(s.salary);
                      setPayType(s.salaryType === 'daily' ? 'daily_wage' : 'monthly_salary');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} - {s.salaryType === 'daily' ? `Daily: ${s.salary}/day` : `Monthly: ${s.salary}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Daily Wage attendance calculator notice if employee is on daily wage */}
              {selectedPayStaff?.salaryType === 'daily' && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-2xl space-y-1.5 text-cyan-200">
                  <div className="font-bold flex items-center justify-between text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" />
                      <span>Daily Wage Attendance Calculation:</span>
                    </span>
                    <span className="font-mono text-xs">{selectedPayStaff.salary} / day</span>
                  </div>
                  <div className="text-[11px] text-cyan-100/90 leading-tight">
                    Recorded Attendance: <strong>{dailyWageStats.presentCount}</strong> Present + <strong>{dailyWageStats.halfDayCount}</strong> Half-Day = <strong>{dailyWageStats.totalDays}</strong> payable days
                  </div>
                  {dailyWageStats.suggestedTotal > 0 && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="font-bold text-white text-xs">
                        Suggested Wage: {settings.currency} {dailyWageStats.suggestedTotal.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPayAmount(dailyWageStats.suggestedTotal)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition-colors"
                      >
                        Auto-Fill Suggested
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Payout Type
                  </label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    {selectedPayStaff?.salaryType === 'daily' ? (
                      <>
                        <option value="daily_wage">Daily Wage Payout</option>
                        <option value="advance">Wage Advance</option>
                      </>
                    ) : (
                      <>
                        <option value="monthly_salary">Monthly Salary</option>
                        <option value="advance">Salary Advance</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Amount ({settings.currency}) *
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Salary Period / Month
                  </label>
                  <input
                    type="text"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="cash">Cash (Register Drawer)</option>
                    <option value="card">Bank / Card</option>
                    <option value="online">Online / EasyPaisa / JazzCash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid weekly daily wage for 6 days"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs shadow-md shadow-[#FF6B00]/25 transition-all"
              >
                Disburse Payout
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
