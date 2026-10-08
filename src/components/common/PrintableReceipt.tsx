import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  X,
  HelpCircle,
  Scissors,
  ChefHat,
  Receipt,
  Sparkles,
  Zap,
} from 'lucide-react';
import { saveToStore } from '../../db/indexedDB';
import {
  generateReceiptHtml,
  generateKotHtml,
  printThermalDirect,
} from '../../utils/thermalPrinter';

export const PrintableReceipt: React.FC = () => {
  const { printData, closePrintReceipt, settings, refreshSettings, openDesktopSetupModal } = useApp();

  // Local printer preference state
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(
    settings.thermalPrinterWidth || '80mm'
  );
  const [fontSize, setFontSize] = useState<'normal' | 'compact'>(
    (settings.thermalFontSize as 'normal' | 'compact') || 'normal'
  );
  const [feedLines, setFeedLines] = useState<number>(settings.thermalCutFeedLines ?? 2);
  const [showGuide, setShowGuide] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (settings.thermalPrinterWidth) {
      setPaperWidth(settings.thermalPrinterWidth);
    }
  }, [settings.thermalPrinterWidth]);

  if (!printData) return null;
  const { order, mode } = printData;
  const isKot = mode === 'kot';

  // Direct isolated thermal print
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const htmlContent = isKot
        ? generateKotHtml(order, settings, { paperWidth, fontSize, feedLines })
        : generateReceiptHtml(order, settings, { paperWidth, fontSize, feedLines });

      await printThermalDirect(htmlContent, paperWidth);
      closePrintReceipt();
    } catch (e: any) {
      console.error('Thermal print failed, falling back to window.print', e);
      window.print();
      closePrintReceipt();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleWidthChange = async (width: '80mm' | '58mm') => {
    setPaperWidth(width);
    try {
      const updated = { ...settings, thermalPrinterWidth: width };
      await saveToStore('settings', updated);
      await refreshSettings();
    } catch (e) {
      console.error('Failed to save printer width', e);
    }
  };

  const handleFontSizeChange = async (sz: 'normal' | 'compact') => {
    setFontSize(sz);
    try {
      const updated = { ...settings, thermalFontSize: sz };
      await saveToStore('settings', updated);
      await refreshSettings();
    } catch (e) {
      console.error('Failed to save font size', e);
    }
  };

  const handleFeedChange = async (lines: number) => {
    setFeedLines(lines);
    try {
      const updated = { ...settings, thermalCutFeedLines: lines };
      await saveToStore('settings', updated);
      await refreshSettings();
    } catch (e) {
      console.error('Failed to save feed lines', e);
    }
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const is58 = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print-receipt-overlay">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] print-receipt-card">
        {/* Modal Controls Bar */}
        <div className="no-print flex flex-col gap-2 p-3 sm:px-5 sm:py-3.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isKot
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30'
                }`}
              >
                {isKot ? <ChefHat className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-white text-xs sm:text-sm">
                    {isKot ? 'Kitchen Order Ticket (KOT)' : 'POS Customer Bill & Receipt'}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isKot ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isKot ? 'Kitchen Only' : 'Customer Copy'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Thermal Output: {paperWidth} roll ({is58 ? '48mm printable' : '72mm printable'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={openDesktopSetupModal}
                className="p-1.5 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60"
                title="Enable Single-Click Print without Chrome dialog"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">1-Click Silent Print</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className={`p-1.5 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors border ${
                  showGuide
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Printer Setup Guide (Margins & Settings)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Printer Guide</span>
              </button>

              <button
                type="button"
                disabled={isPrinting}
                onClick={handlePrint}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 ${
                  isKot
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-[#FF6B00] hover:bg-[#e05e00] shadow-[#FF6B00]/30'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPrinting ? 'Printing...' : isKot ? 'Print Kitchen KOT' : 'Print Customer Bill'}</span>
              </button>

              <button
                type="button"
                onClick={closePrintReceipt}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                title="Close Preview (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Hardware Switchers (Paper Width, Font, Cut Feed) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
            {/* Paper Width Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
                Paper:
              </span>
              <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleWidthChange('80mm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    paperWidth === '80mm'
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  80mm (3-Inch)
                </button>
                <button
                  type="button"
                  onClick={() => handleWidthChange('58mm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    paperWidth === '58mm'
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  58mm (2-Inch)
                </button>
              </div>
            </div>

            {/* Font Density Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
                Font:
              </span>
              <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleFontSizeChange('normal')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    fontSize === 'normal'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleFontSizeChange('compact')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    fontSize === 'compact'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Cutter Feed Margin */}
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400 text-[10px]">Cut Margin:</span>
              <select
                value={feedLines}
                onChange={(e) => handleFeedChange(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-[#FF6B00]"
              >
                <option value={1}>1 Line (Tight)</option>
                <option value={2}>2 Lines (Standard)</option>
                <option value={4}>4 Lines (Safe Cut)</option>
              </select>
            </div>
          </div>

          {/* Collapsible Thermal Setup Instructions Guide */}
          {showGuide && (
            <div className="mt-1 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="font-bold flex items-center gap-1.5 text-amber-400 text-[11px] uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Browser Thermal Printing Setup (Chrome / Edge):</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-100/90 leading-tight">
                <li>
                  <strong>Destination:</strong> Select your thermal printer (e.g. <em>POS-80, POS-58, Xprinter, Epson TM, Rongta</em>).
                </li>
                <li>
                  <strong>Paper Size:</strong> Choose <strong>80mm Receipt</strong> or <strong>58mm Receipt</strong> (or Roll Paper).
                </li>
                <li>
                  <strong>Margins:</strong> Set to <span className="underline font-bold text-white">None</span> (or Minimum).
                </li>
                <li>
                  <strong>Headers and Footers:</strong> <span className="underline font-bold text-white">Uncheck</span> this option so the browser does not print the website URL or date stamps.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Quick Silent Print Notice Banner */}
        <div className="no-print mx-4 sm:mx-6 mt-3 px-3.5 py-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px]">
              <strong>Stop Chrome's print popup:</strong> Launch Tokyo Crunch with <em>--kiosk-printing</em> to print in 1 single click!
            </span>
          </div>
          <button
            type="button"
            onClick={openDesktopSetupModal}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shrink-0 transition-colors shadow-sm"
          >
            Setup 1-Click
          </button>
        </div>

        {/* Printable Area Wrapper (On-screen preview with realistic paper look) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-950 flex justify-center print-receipt-wrapper">
          <div
            id="printable-receipt"
            className={`${
              is58
                ? 'thermal-width-58mm w-full max-w-[310px] text-[10.5px]'
                : 'thermal-width-80mm w-full max-w-[370px] text-[11px]'
            } bg-white text-black p-4 font-mono select-text shadow-2xl rounded-sm border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0`}
          >
            {/* ----------------- KITCHEN TICKET (KOT) VIEW ----------------- */}
            {isKot ? (
              <div className="space-y-1.5 text-black">
                {/* Header Badge */}
                <div className="text-center border-b-2 border-black pb-1.5">
                  <div className="font-black text-sm uppercase tracking-wider">
                    *** KITCHEN TICKET (KOT) ***
                  </div>
                </div>

                {/* Hero Order Details */}
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-black text-lg">ORDER #{order.orderNumber}</span>
                  <span className="font-black text-xs uppercase px-1.5 py-0.5 border-2 border-black">
                    [{order.type.replace('_', ' ')}]
                  </span>
                </div>

                {/* Big Table Box for Cook */}
                {order.tableNumber && (
                  <div className="border-2 border-black text-center py-1.5 my-1 font-black text-lg uppercase bg-zinc-50">
                    TABLE: {order.tableNumber}
                  </div>
                )}

                <div className="flex justify-between text-[10px] font-bold">
                  <span>TIME: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>SERVER: {order.cashierName || 'POS'}</span>
                </div>

                {order.customerName && order.customerName !== 'Walk-in Customer' && (
                  <div className="text-[10px] font-bold">
                    CUSTOMER: {order.customerName}
                  </div>
                )}

                <div className="border-b-2 border-black my-1.5" />

                {/* Large Cooking Items List */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="border-b border-dashed border-black pb-1.5">
                      <div className="flex items-baseline gap-1.5 font-black text-xs">
                        <span className="text-base font-black w-8">{item.quantity}X</span>
                        <span className="flex-1 uppercase leading-snug">
                          {item.productName}
                          {item.variantName && item.variantName !== 'Standard' && (
                            <span className="text-[10.5px] font-bold"> [{item.variantName.toUpperCase()}]</span>
                          )}
                        </span>
                      </div>

                      {/* Addons */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="pl-8 text-[9.5px] font-bold">
                          {item.addons.map((a, aIdx) => (
                            <div key={aIdx}>+ {a.name.toUpperCase()}</div>
                          ))}
                        </div>
                      )}

                      {/* Item cooking note */}
                      {item.notes && (
                        <div className="pl-8 font-black text-[9.5px] mt-0.5 border border-black p-1 bg-zinc-50">
                          *** NOTE: {item.notes.toUpperCase()} ***
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Special Order Instructions */}
                {order.notes && (
                  <div className="mt-2 p-1.5 border-2 border-black text-[10px]">
                    <div className="font-black">⚠️ SPECIAL KITCHEN INSTRUCTIONS:</div>
                    <div className="font-bold">{order.notes.toUpperCase()}</div>
                  </div>
                )}

                <div className="text-center font-bold text-[9.5px] pt-2">
                  --- END OF KITCHEN ORDER ---
                </div>
              </div>
            ) : (
              /* ----------------- POS CUSTOMER BILL VIEW ----------------- */
              <div className="text-black space-y-1">
                {/* Header */}
                <div className="text-center pb-1">
                  <div className={`${is58 ? 'text-sm' : 'text-base'} font-black tracking-tight uppercase text-black`}>
                    {settings.name || 'Tokyo Crunch'}
                  </div>
                  <div className="text-[9.5px] font-medium text-black">
                    {settings.location || 'Itfaq City Commercial Area'}
                  </div>
                  <div className="text-[9.5px] text-black">
                    Tel: {settings.phone || '03071777948'}
                  </div>
                  {settings.receiptHeader && (
                    <div className="text-[9.5px] font-bold mt-0.5">{settings.receiptHeader}</div>
                  )}
                </div>

                <div className="border-b border-dashed border-black my-1" />

                {/* Order Metadata (Clean Line-by-Line Alignment) */}
                <div className="space-y-0.5 text-[10px] text-black">
                  <div className="flex justify-between font-black text-xs">
                    <span>ORDER: #{order.orderNumber}</span>
                    <span className="uppercase">[{order.type.replace('_', ' ')}]</span>
                  </div>
                  {order.tableNumber && (
                    <div className="font-extrabold text-xs">
                      TABLE: {order.tableNumber}
                    </div>
                  )}
                  <div>DATE: {formattedDate}</div>
                  <div className="flex justify-between">
                    <span>CASHIER: {order.cashierName || 'Staff'}</span>
                    <span>{order.status.toUpperCase()}</span>
                  </div>
                  {order.customerName && order.customerName !== 'Walk-in Customer' && (
                    <div className="pt-0.5">
                      <div className="font-bold">
                        CUST: {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                      </div>
                      {order.deliveryAddress && (
                        <div className="text-[9px]">ADDR: {order.deliveryAddress}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-black my-1" />

                {/* Line Items Table */}
                <div className="w-full">
                  {is58 ? (
                    /* 58mm 2-line layout */
                    <div>
                      <div className="flex justify-between font-black text-[9.5px] border-b border-black pb-0.5 mb-1.5 text-black">
                        <span>ITEM / DESCRIPTION</span>
                        <span className="text-right">TOTAL</span>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="space-y-0.5 text-black">
                            <div className="font-bold text-[10.5px] leading-snug">
                              {item.productName}
                              {item.variantName && item.variantName !== 'Standard' && (
                                <span className="font-normal text-[9.5px]"> ({item.variantName})</span>
                              )}
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="pl-1">
                                {item.quantity}x @ {settings.currency} {item.unitPrice.toLocaleString()}
                              </span>
                              <span className="font-black">
                                {settings.currency} {item.itemTotal.toLocaleString()}
                              </span>
                            </div>
                            {item.addons && item.addons.length > 0 && (
                              <div className="pl-3 text-[9px] text-black">
                                {item.addons.map((ad, aIdx) => (
                                  <div key={aIdx}>
                                    + {ad.name} ({settings.currency} {ad.price})
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <div className="pl-3 text-[9px] font-bold italic text-black">
                                * Note: {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 80mm table layout */
                    <div>
                      <div className="flex justify-between font-black text-[10px] border-b border-black pb-0.5 mb-1.5 text-black">
                        <span className="w-8">QTY</span>
                        <span className="flex-1 text-left">ITEM DESCRIPTION</span>
                        <span className="w-20 text-right">TOTAL</span>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-black">
                            <div className="flex justify-between font-bold text-[11px]">
                              <span className="w-8">{item.quantity}x</span>
                              <span className="flex-1 text-left">
                                {item.productName}
                                {item.variantName && item.variantName !== 'Standard' && (
                                  <span className="font-normal text-[10px]"> ({item.variantName})</span>
                                )}
                              </span>
                              <span className="w-20 text-right font-black">
                                {settings.currency} {item.itemTotal.toLocaleString()}
                              </span>
                            </div>
                            {item.addons && item.addons.length > 0 && (
                              <div className="pl-8 text-[9px] text-black">
                                {item.addons.map((ad, aIdx) => (
                                  <div key={aIdx}>
                                    + {ad.name} ({settings.currency} {ad.price})
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <div className="pl-8 text-[9px] font-bold italic text-black">
                                * Note: {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="border-b border-dashed border-black my-1.5" />
                <div className="space-y-0.5 text-[10px] text-black">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      {settings.currency} {order.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>Discount:</span>
                      <span>
                        -{settings.currency} {order.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>
                        +{settings.currency} {order.deliveryFee.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>
                        {settings.currency} {order.taxAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="border-b border-black my-1" />
                  <div className="flex justify-between font-black text-xs">
                    <span>NET TOTAL:</span>
                    <span>
                      {settings.currency} {order.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="capitalize">Paid via {order.paymentMethod}:</span>
                    <span className="font-bold">
                      {settings.currency} {order.paidAmount.toLocaleString()}
                    </span>
                  </div>
                  {order.dueAmount > 0 && (
                    <div className="flex justify-between font-black text-black">
                      <span>Balance Due:</span>
                      <span>
                        {settings.currency} {order.dueAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                {order.notes && (
                  <div className="mt-1 pt-1 border-t border-dashed border-black text-[9.5px] text-black">
                    <span className="font-bold">INSTRUCTIONS:</span> {order.notes}
                  </div>
                )}

                <div className="border-b border-dashed border-black my-1.5" />

                {/* Footer & Developer Advertising */}
                <div className="text-center text-[9px] text-black space-y-0.5 pt-0.5">
                  <div className="font-bold">
                    {settings.receiptFooter || 'Thank you for choosing Tokyo Crunch! Please visit again.'}
                  </div>
                  <div>Fresh Quality · Crispy Chicken · Halal</div>
                  <div className="pt-1.5 mt-1 border-t border-dashed border-black">
                    <div className="font-extrabold text-[10px] tracking-tight text-black">
                      Powered by Soft Inc Developers.  Haider Islam 03126980431
                    </div>
                    <div className="text-[8px] text-black mt-0.5">
                      Software Solutions · POS Systems · Custom Web &amp; Mobile Apps
                    </div>
                  </div>
                  <div className="pt-0.5 text-[8px] text-black">
                    POS ID: {order.id.slice(-8).toUpperCase()} · Offline-First System
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Cut Paper Feed Padding */}
            <div
              style={{
                height: `${Math.max(1, feedLines) * 6}mm`,
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
