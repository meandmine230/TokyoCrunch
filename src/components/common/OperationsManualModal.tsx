import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  Download,
  X,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  ChefHat,
  Scroll,
  TrendingUp,
  Clock,
  HardDrive,
  Flame,
} from 'lucide-react';

interface OperationsManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OperationsManualModal: React.FC<OperationsManualModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings } = useApp();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const link = document.createElement('a');
    link.href = '/OPERATIONS_MANUAL.md';
    link.download = `Tokyo_Crunch_Operations_Manual_SOP_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header with PDF Print Action Controls */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#141417]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Operations Manual & SOP Guide (PDF Document)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Official Standard Operating Procedures for Counter, Kitchen & Profit Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#FF6B00]/25 active:scale-95"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
              title="Download Raw Markdown Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .MD</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Viewer Body (Styled specifically for A4 Print and screen reading) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-950 flex justify-center">
          <article
            id="printable-manual"
            className="w-full max-w-3xl bg-white text-zinc-900 p-8 sm:p-12 shadow-2xl rounded-xl font-sans text-xs leading-relaxed select-text space-y-8 print:p-0 print:shadow-none print:w-full print:max-w-none"
          >
            {/* Document Cover & Letterhead */}
            <header className="border-b-2 border-zinc-900 pb-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded bg-[#FF6B00] flex items-center justify-center text-white print:border print:border-black">
                    <Flame className="w-4 h-4 fill-white text-white" />
                  </div>
                  <span className="text-xl font-black uppercase tracking-tight text-zinc-950">
                    {settings.name || 'Tokyo Crunch'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-zinc-700">
                  {settings.location || 'Itfaq City Commercial Area'} · Official Hotline: {settings.phone || '03071777948'}
                </p>
                <div className="mt-2 text-sm font-extrabold uppercase tracking-wide text-[#FF6B00] print:text-black">
                  Store Operations Manual & Standard Operating Procedures (SOP)
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Document ID: SOP-TC-2026-V1.0 · Single-System &amp; Offline POS Architecture
                </p>
                <div className="mt-1 text-[11px] font-bold text-zinc-800">
                  Powered by Soft Inc Developers.  Haider Islam 03126980431
                </div>
              </div>

              <div className="text-right text-[11px] text-zinc-600 font-mono space-y-0.5">
                <div><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Classification:</strong> Internal Operations</div>
                <div><strong>Base Currency:</strong> {settings.currency || 'PKR'}</div>
                <div><strong>System Mode:</strong> Offline-First Local Cache</div>
              </div>
            </header>

            {/* Quick Executive Summary Callout */}
            <section className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 break-inside-avoid">
              <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Executive Operating Mandate</span>
              </h2>
              <p className="text-zinc-700 leading-normal">
                This manual establishes the mandatory workflow for daily store opening, POS order taking,
                live kitchen execution, recipe ingredient portioning (BOM), real-time profit tracking,
                and end-of-day register reconciliation at <strong>Tokyo Crunch</strong>. Every shift must follow these procedures to maintain strict food cost control (target food cost: 28%–35%) and ensure 100% financial audit integrity.
              </p>
            </section>

            {/* Section 1 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">01.</span>
                <span>Daily Store Opening & Cash Register Session</span>
              </h2>
              <p className="text-zinc-700">
                Every business day must start with an active cash register session to guarantee cash drawer auditability:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-zinc-800">
                <li>
                  <strong>Staff PIN Login:</strong> Click the user avatar on the top right. Enter your 4-digit PIN (Cashier: <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">1234</code>, Manager: <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">5678</code>, Admin: <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">9999</code>).
                </li>
                <li>
                  <strong>Open Cash Drawer Session:</strong> Navigate to <strong>Cashbook Register</strong> in the sidebar. Click <strong>Open New Session</strong>.
                </li>
                <li>
                  <strong>Count Opening Float:</strong> Count all physical currency notes and coins in the till (standard opening float: PKR 5,000). Enter this exact count into the system.
                </li>
                <li>
                  <strong>Verify Balance:</strong> The live drawer balance will immediately display in the top navigation bar.
                </li>
              </ol>
            </section>

            {/* Section 2 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">02.</span>
                <span>POS Counter Operations (Taking Orders)</span>
              </h2>
              <p className="text-zinc-700">
                The POS terminal operates offline-first with zero lag and instant ingredient cost tracking:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-800">
                <li>
                  <strong>Order Channel:</strong> Select <strong>Dine In</strong>, <strong>Takeaway</strong>, or <strong>Delivery</strong> from the top segmented control.
                </li>
                <li>
                  <strong>Item Selection:</strong> Click any category tab or use the search bar. For items with portion sizes (e.g. <em>Single / Double</em>, <em>2 pcs / 4 pcs</em>, <em>Half / Full</em>), select the requested portion.
                </li>
                <li>
                  <strong>Addons & Modifiers:</strong> Add Extra Cheese (+PKR 28 cost) or Sliced Jalapeños (+PKR 8 cost) as requested by customer.
                </li>
                <li>
                  <strong>Live Margin Review:</strong> Review the live badge at the cart footer displaying <code>Gross Sale | Recipe COGS | Net Profit (+Margin %)</code>.
                </li>
                <li>
                  <strong>Payment Collection:</strong> Select <strong>Cash</strong>, <strong>Card</strong>, <strong>Online (JazzCash/EasyPaisa)</strong>, or <strong>Due</strong>. For cash, input received funds to view exact change return.
                </li>
                <li>
                  <strong>Order Completion:</strong> Tap <strong>Settle Order</strong> to automatically print the customer receipt and dispatch the order to the Kitchen Display System (KDS).
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">03.</span>
                <span>Kitchen Display System (KDS) & Order Fulfillment</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded">
                  <span className="font-bold text-orange-900 block uppercase text-[10px]">1. Pending (Orange)</span>
                  <span className="text-zinc-700 text-[11px]">Ticket received from POS; kitchen prepares ingredients according to recipe standard.</span>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <span className="font-bold text-blue-900 block uppercase text-[10px]">2. Preparing (Blue)</span>
                  <span className="text-zinc-700 text-[11px]">Frying chicken, grilling patties, toasting buns, or wrapping shawarmas.</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="font-bold text-emerald-900 block uppercase text-[10px]">3. Ready (Green)</span>
                  <span className="text-zinc-700 text-[11px]">Food plated/boxed; cashier calls customer number or hands off to delivery rider.</span>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">04.</span>
                <span>Recipe Bill of Materials (BOM) & Food Cost Management</span>
              </h2>
              <p className="text-zinc-700">
                To keep food costs predictable, every menu item has a strict Bill of Materials mapping:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px] text-left">
                  <thead>
                    <tr className="bg-zinc-100 border-y border-zinc-300">
                      <th className="py-1.5 px-2 font-bold text-zinc-900">Menu Item</th>
                      <th className="py-1.5 px-2 font-bold text-zinc-900">Standard Portion Recipe BOM</th>
                      <th className="py-1.5 px-2 text-right font-bold text-zinc-900">Approx COGS</th>
                      <th className="py-1.5 px-2 text-right font-bold text-zinc-900">Selling Price</th>
                      <th className="py-1.5 px-2 text-right font-bold text-zinc-900">Target Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    <tr>
                      <td className="py-1.5 px-2 font-semibold">Zinger Max (Single)</td>
                      <td className="py-1.5 px-2">1 Bun, 150g Chicken Fillet, 30g Sauce, Batter, Box</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 230</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 490</td>
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-700">53.1%</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold">Chicken Filetto</td>
                      <td className="py-1.5 px-2">1 Bun, 130g Fillet, Mayo, Packaging Box</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 185</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 420</td>
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-700">56.0%</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold">Crispy Tortilla Wrap</td>
                      <td className="py-1.5 px-2">1 Tortilla, 160g Chicken Fillet, 40g Sauce, Paper</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 215</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 460</td>
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-700">53.3%</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold">Zinger Shawarma</td>
                      <td className="py-1.5 px-2">1 Pita Bread, 120g Chicken Fillet, 30g Garlic Sauce</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 145</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 320</td>
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-700">54.7%</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold">Plain Fries (Full)</td>
                      <td className="py-1.5 px-2">400g Cut Potatoes, Seasoning, Paper Box</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 90</td>
                      <td className="py-1.5 px-2 text-right font-mono">PKR 290</td>
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-700">69.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-zinc-600 mt-1 italic">
                * Note: To edit any BOM, open <strong>Menu Catalog</strong>, tap the orange <strong>BOM</strong> button on the product card, and adjust ingredients directly in the side panel.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">05.</span>
                <span>Menu Profit Analysis & Pricing Simulator</span>
              </h2>
              <p className="text-zinc-700">
                Store Managers must review the <strong>Profit Analysis</strong> dashboard at least once per week:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-800">
                <li>
                  <strong>Monitor Boston Consulting Group (BCG) Matrix:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 text-zinc-700">
                    <li><strong>🌟 High Margin (≥60%):</strong> Prime sales drivers (Fries, Shawarmas, Drinks). Keep prominent on POS.</li>
                    <li><strong>🟢 Healthy Margin (45%–60%):</strong> Signature items (Zinger Max, Wraps). Maintain consistent portion control.</li>
                    <li><strong>⚠️ Low Margin (&lt;30%):</strong> Flagged items. Use the What-If Price Simulator to model price increases (+20 to +50 PKR) or reduce raw material portions.</li>
                  </ul>
                </li>
                <li>
                  <strong>What-If Margin Simulator:</strong> In Profit Analysis, click <strong>Inspect</strong> on any item to model new selling prices and see the instant margin percentage outcome before printing new menus.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">06.</span>
                <span>Daily Shift Closing & Z-Report Protocol</span>
              </h2>
              <p className="text-zinc-700">
                At store closing, the Head Cashier and Shift Manager must perform the mandatory physical cash audit:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-zinc-800">
                <li>
                  <strong>Physical Cash Drawer Count:</strong> Count all notes and coins physically inside the till.
                </li>
                <li>
                  <strong>Close Active Session:</strong> In <strong>Cashbook Register</strong>, tap <strong>Close Active Session</strong> and input the exact physical cash amount.
                </li>
                <li>
                  <strong>Difference Audit:</strong> The system automatically compares physical cash against expected sales float:
                  <div className="p-2 my-1 bg-zinc-100 rounded font-mono text-[11px] text-zinc-900 border border-zinc-200">
                    Expected Cash = Opening Float + Cash Sales + Cash In - Cash Out<br />
                    Discrepancy (Over / Short) = Counted Cash - Expected Cash
                  </div>
                </li>
                <li>
                  <strong>Print Day Closing Z-Report:</strong> Navigate to <strong>Reports &amp; P&amp;L</strong> &rarr; <strong>Day Closing (Z-Report)</strong> and print the signed receipt for physical filing.
                </li>
              </ol>
            </section>

            {/* Section 7 */}
            <section className="space-y-2 break-inside-avoid">
              <h2 className="text-sm font-extrabold uppercase text-zinc-950 border-b border-zinc-300 pb-1 flex items-center gap-1.5">
                <span className="text-[#FF6B00] print:text-black">07.</span>
                <span>Emergency Offline Continuity & Data Backups</span>
              </h2>
              <p className="text-zinc-700 leading-relaxed">
                Tokyo Crunch POS runs locally in browser storage using <code>navigator.storage.persist()</code>. All sales and recipe data are permanently preserved on the machine even during power outages or internet disruptions.
              </p>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded space-y-1 text-zinc-800">
                <div className="font-bold text-zinc-900">Weekly Backup Procedure:</div>
                <div>1. Go to <strong>Settings &amp; Audit</strong> &rarr; <strong>Backup &amp; Restore</strong>.</div>
                <div>2. Click <strong>Download JSON Backup</strong>.</div>
                <div>3. Save the exported JSON file to a store USB flash drive or secure store cloud folder.</div>
              </div>
            </section>

            {/* Document Sign-Off Block */}
            <footer className="pt-6 border-t-2 border-zinc-900 space-y-6 break-inside-avoid">
              <div className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                Official Operational Sign-Off & Verification
              </div>
              <div className="grid grid-cols-3 gap-6 pt-4 text-center text-xs">
                <div className="border-t border-zinc-400 pt-2">
                  <span className="font-bold text-zinc-900 block">Head Cashier</span>
                  <span className="text-zinc-500 text-[10px] block mt-0.5">Signature & Date</span>
                </div>
                <div className="border-t border-zinc-400 pt-2">
                  <span className="font-bold text-zinc-900 block">Kitchen Supervisor</span>
                  <span className="text-zinc-500 text-[10px] block mt-0.5">Signature & Date</span>
                </div>
                <div className="border-t border-zinc-400 pt-2">
                  <span className="font-bold text-zinc-900 block">Store General Manager</span>
                  <span className="text-zinc-500 text-[10px] block mt-0.5">Signature & Date</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-zinc-500 pt-4 border-t border-zinc-200 font-mono space-y-1">
                <div className="font-bold text-zinc-900 text-xs font-sans">
                  Powered by Soft Inc Developers.  Haider Islam 03126980431
                </div>
                <div>
                  Tokyo Crunch · Itfaq City Commercial Area · Tel: 03071777948 · Printed on {new Date().toLocaleString()}
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
};
