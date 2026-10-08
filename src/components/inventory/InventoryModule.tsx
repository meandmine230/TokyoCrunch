import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Ingredient, InventoryLedgerEntry, WastageRecord } from '../../types';
import {
  getAllFromStore,
  saveToStore,
  recordStockAdjustmentOrWastage,
  downloadCsv,
} from '../../db/indexedDB';
import {
  Boxes,
  Plus,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Trash,
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const { currentUser, settings, showToast, triggerDataRefresh, dataVersion } = useApp();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<InventoryLedgerEntry[]>([]);
  const [wastageRecords, setWastageRecords] = useState<WastageRecord[]>([]);

  // Navigation tab inside Inventory: 'stock' | 'ledger' | 'wastage'
  const [viewTab, setViewTab] = useState<'stock' | 'ledger' | 'wastage'>('stock');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Ingredient Modal
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState<any>('kg');
  const [ingStock, setIngStock] = useState<number>(0);
  const [ingMinAlert, setIngMinAlert] = useState<number>(10);
  const [ingUnitCost, setIngUnitCost] = useState<number>(100);

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustIngId, setAdjustIngId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'adjustment' | 'wastage'>('adjustment');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  useEffect(() => {
    const loadInventoryData = async () => {
      try {
        const [ings, ledger, waste] = await Promise.all([
          getAllFromStore<Ingredient>('ingredients'),
          getAllFromStore<InventoryLedgerEntry>('inventory_ledger'),
          getAllFromStore<WastageRecord>('wastage'),
        ]);

        setIngredients(ings);
        setLedgerEntries(
          ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
        setWastageRecords(
          waste.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
      } catch (err) {
        console.error('Failed to load inventory data', err);
      }
    };
    loadInventoryData();
  }, [dataVersion]);

  // Open modal
  const handleOpenAddModal = (ing?: Ingredient) => {
    if (ing) {
      setEditingIngId(ing.id);
      setIngName(ing.name);
      setIngUnit(ing.unit);
      setIngStock(ing.currentStock);
      setIngMinAlert(ing.minStockAlert);
      setIngUnitCost(ing.unitCost);
    } else {
      setEditingIngId(null);
      setIngName('');
      setIngUnit('kg');
      setIngStock(0);
      setIngMinAlert(10);
      setIngUnitCost(100);
    }
    setShowAddIngredientModal(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) {
      showToast('Ingredient name is required', 'warning');
      return;
    }

    const ingId = editingIngId || `ing-${Date.now()}`;
    const newIngredient: Ingredient = {
      id: ingId,
      name: ingName.trim(),
      unit: ingUnit,
      currentStock: ingStock,
      minStockAlert: ingMinAlert,
      unitCost: ingUnitCost,
      updatedAt: new Date().toISOString(),
    };

    await saveToStore('ingredients', newIngredient);
    showToast(`Saved ingredient: ${newIngredient.name}`, 'success');
    setShowAddIngredientModal(false);
    triggerDataRefresh();
  };

  // Open Adjust / Wastage Modal
  const handleOpenAdjust = (ingId: string, mode: 'adjustment' | 'wastage') => {
    setAdjustIngId(ingId);
    setAdjustType(mode);
    setAdjustQty(0);
    setAdjustReason(
      mode === 'wastage'
        ? 'Burned/Damaged during preparation'
        : 'Physical stock count correction'
    );
    setShowAdjustModal(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustIngId || adjustQty === 0 || !adjustReason.trim()) {
      showToast('Please fill all adjustment fields', 'warning');
      return;
    }

    try {
      await recordStockAdjustmentOrWastage({
        ingredientId: adjustIngId,
        type: adjustType,
        qtyChange: adjustQty,
        reason: adjustReason.trim(),
        user: currentUser,
      });

      showToast(
        adjustType === 'wastage'
          ? 'Wastage recorded & stock deducted'
          : 'Stock adjusted successfully',
        'success'
      );
      setShowAdjustModal(false);
      triggerDataRefresh();
    } catch (err: any) {
      showToast(err.message || 'Adjustment failed', 'error');
    }
  };

  // CSV Export for Ledger
  const handleExportLedgerCsv = () => {
    const headers = [
      'Date & Time',
      'Ingredient',
      'Movement Type',
      'Change Qty',
      'Unit',
      'Previous Stock',
      'New Stock',
      'Reference',
      'Notes',
      'Performed By',
    ];
    const rows = ledgerEntries.map((l) => [
      l.date,
      l.ingredientName,
      l.movementType.toUpperCase(),
      l.changeQty,
      l.unit,
      l.previousStock,
      l.newStock,
      l.referenceId || '',
      l.notes || '',
      l.performedBy,
    ]);
    downloadCsv(`Tokyo_Crunch_Stock_Ledger_${new Date().toISOString().split('T')[0]}`, headers, rows);
    showToast('Exported stock movement ledger to CSV', 'success');
  };

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ingredients, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214]">
      {/* Top Header */}
      <div className="p-4 bg-[#18181b] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h2 className="font-extrabold text-sm text-white">Inventory & Raw Materials</h2>
            <p className="text-[11px] text-zinc-400">
              Stock control, automated usage ledger & wastage tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setViewTab('stock')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewTab === 'stock'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Stock Items ({ingredients.length})
            </button>
            <button
              onClick={() => setViewTab('ledger')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewTab === 'ledger'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Movement Ledger
            </button>
            <button
              onClick={() => setViewTab('wastage')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewTab === 'wastage'
                  ? 'bg-[#FF6B00] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Wastage Log
            </button>
          </div>

          {viewTab === 'stock' && (
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/25"
            >
              <Plus className="w-4 h-4" />
              <span>+ Raw Item</span>
            </button>
          )}

          {viewTab === 'ledger' && (
            <button
              onClick={handleExportLedgerCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>CSV Export</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- TAB 1: STOCK ITEMS ---------------- */}
      {viewTab === 'stock' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search raw material name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          {/* Ingredients Table */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-3 px-4 font-semibold">Material / Ingredient</th>
                  <th className="py-3 px-3 font-semibold">Current Stock</th>
                  <th className="py-3 px-3 font-semibold">Min Alert</th>
                  <th className="py-3 px-3 font-semibold">Unit Cost</th>
                  <th className="py-3 px-3 font-semibold">Valuation</th>
                  <th className="py-3 px-3 font-semibold">Stock Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStockAlert;
                  const totalValue = Math.round(ing.currentStock * ing.unitCost);

                  return (
                    <tr key={ing.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-bold text-white">
                        {ing.name}
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-sm text-white">
                        {ing.currentStock} <span className="text-zinc-400 text-xs font-normal">{ing.unit}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {ing.minStockAlert} {ing.unit}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-300">
                        {settings.currency} {ing.unitCost} / {ing.unit}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#FF6B00]">
                        {settings.currency} {totalValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>In Stock</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenAdjust(ing.id, 'adjustment')}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                          title="Adjust Stock (+ / -)"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => handleOpenAdjust(ing.id, 'wastage')}
                          className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-semibold"
                          title="Log Wastage"
                        >
                          Wastage
                        </button>
                        <button
                          onClick={() => handleOpenAddModal(ing)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                          title="Edit"
                        >
                          Edit
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

      {/* ---------------- TAB 2: MOVEMENT LEDGER ---------------- */}
      {viewTab === 'ledger' && (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white">Complete Stock Transaction Audit</span>
              <span className="font-mono text-zinc-400">{ledgerEntries.length} entries</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-3 font-semibold">Ingredient</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Change</th>
                  <th className="py-2.5 px-3 font-semibold">New Balance</th>
                  <th className="py-2.5 px-3 font-semibold">Reference</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                  <th className="py-2.5 px-4 text-right font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 italic">
                      No stock movements recorded yet
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((l) => (
                    <tr key={l.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 text-zinc-400">
                        {new Date(l.date).toLocaleString('en-PK', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{l.ingredientName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            l.movementType === 'purchase'
                              ? 'bg-emerald-950 text-emerald-400'
                              : l.movementType === 'sale'
                              ? 'bg-blue-950 text-blue-400'
                              : l.movementType === 'wastage'
                              ? 'bg-red-950 text-red-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {l.movementType}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          l.changeQty > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {l.changeQty > 0 ? `+${l.changeQty}` : l.changeQty} {l.unit}
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">
                        {l.newStock} {l.unit}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">{l.referenceId || '-'}</td>
                      <td className="py-2.5 px-3 text-zinc-300 font-sans text-xs">
                        {l.notes || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400 font-sans text-xs">
                        {l.performedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: WASTAGE LOG ---------------- */}
      {viewTab === 'wastage' && (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white">Wastage & Loss Records</span>
              <span className="font-mono text-zinc-400">{wastageRecords.length} records</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Item</th>
                  <th className="py-2.5 px-3 font-semibold">Quantity Lost</th>
                  <th className="py-2.5 px-3 font-semibold">Loss in PKR</th>
                  <th className="py-2.5 px-3 font-semibold">Reason</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {wastageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                      Zero wastage reported
                    </td>
                  </tr>
                ) : (
                  wastageRecords.map((w) => (
                    <tr key={w.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 text-zinc-400">
                        {new Date(w.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{w.ingredientName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-400">
                        {w.quantity} {w.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-500">
                        {settings.currency} {w.totalLoss.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">{w.reason}</td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">{w.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: ADD / EDIT INGREDIENT ---------------- */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveIngredient}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">
                {editingIngId ? 'Edit Raw Material' : 'Add New Raw Material'}
              </h3>
              <p className="text-xs text-zinc-400">Inventory item tracked for recipes</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="e.g. Fresh Chicken Fillets"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Grams)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="litres">litres (Litres)</option>
                    <option value="ml">ml (Millilitres)</option>
                    <option value="pack">pack (Packets)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Current Stock Qty
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingStock || ''}
                    onChange={(e) => setIngStock(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingMinAlert || ''}
                    onChange={(e) => setIngMinAlert(Number(e.target.value) || 0)}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Unit Cost ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingUnitCost || ''}
                    onChange={(e) => setIngUnitCost(Number(e.target.value) || 0)}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddIngredientModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs"
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- MODAL: STOCK ADJUSTMENT OR WASTAGE ---------------- */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmAdjust}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-white">
                {adjustType === 'wastage' ? 'Log Raw Material Wastage' : 'Manual Stock Adjustment'}
              </h3>
              <p className="text-xs text-zinc-400">
                Item: {ingredients.find((i) => i.id === adjustIngId)?.name}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  {adjustType === 'wastage'
                    ? 'Quantity Lost / Discarded'
                    : 'Quantity Change (+ to add, - to subtract)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustQty || ''}
                  onChange={(e) => setAdjustQty(Number(e.target.value) || 0)}
                  placeholder={adjustType === 'wastage' ? 'e.g. 2' : 'e.g. -5 or 10'}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B00]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Reason / Audit Remarks *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count discrepancy"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs ${
                  adjustType === 'wastage'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-[#FF6B00] hover:bg-[#e05e00]'
                }`}
              >
                Apply Movement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
