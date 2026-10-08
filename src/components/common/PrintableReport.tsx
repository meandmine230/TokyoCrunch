import React from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X } from 'lucide-react';

export const PrintableReport: React.FC = () => {
  const { printReportData, closePrintReport, settings } = useApp();

  if (!printReportData) return null;
  const { title, subtitle, dateRange, headers, rows, summary } = printReportData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Controls */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div>
            <h3 className="font-bold text-white text-base">{title}</h3>
            <p className="text-xs text-zinc-400">Date Filter: {dateRange}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-semibold rounded-lg transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 / PDF</span>
            </button>
            <button
              onClick={closePrintReport}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-6 overflow-y-auto bg-zinc-950 flex justify-center">
          <div
            id="printable-report"
            className="w-full bg-white text-zinc-900 p-8 shadow-xl rounded-lg font-sans text-xs leading-normal select-text"
          >
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-zinc-950">
                  {settings.name || 'Tokyo Crunch'}
                </h1>
                <p className="text-zinc-600 text-xs">
                  {settings.location || 'Itfaq City Commercial Area'} · Tel: {settings.phone || '03071777948'}
                </p>
                <div className="mt-2 text-sm font-bold text-[#FF6B00] uppercase tracking-wide">
                  {title}
                </div>
                {subtitle && <p className="text-zinc-500 text-xs">{subtitle}</p>}
              </div>
              <div className="text-right text-xs text-zinc-600">
                <div className="font-semibold text-zinc-900">Period: {dateRange}</div>
                <div>Generated: {new Date().toLocaleString()}</div>
                <div>Currency: {settings.currency}</div>
              </div>
            </div>

            {/* Summary Highlights */}
            {summary && summary.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3 bg-zinc-50 border border-zinc-200 rounded">
                {summary.map((item, idx) => (
                  <div key={idx} className="p-2">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">{item.label}</span>
                    <span className="text-sm font-bold text-zinc-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-zinc-100 border-y border-zinc-300">
                    {headers.map((h, i) => (
                      <th key={i} className="py-2 px-3 font-bold text-zinc-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length} className="py-6 text-center text-zinc-400 italic">
                        No transactions recorded for this period
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 font-mono text-[11px] text-zinc-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-zinc-500 gap-1.5">
              <div>Tokyo Crunch POS Management System · Offline Ledger Certified</div>
              <div className="font-bold text-zinc-900">
                Powered by Soft Inc Developers.  Haider Islam 03126980431
              </div>
              <div>Page 1 of 1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
