import React, { useState } from 'react';
import {
  Monitor,
  Download,
  X,
  CheckCircle2,
  Terminal,
  Power,
  ExternalLink,
  Laptop,
  Sparkles,
  Copy,
  Check,
  Zap,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DesktopSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopSetupModal: React.FC<DesktopSetupModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, promptInstall, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'silent' | 'windows' | 'pwa' | 'autostart'>('silent');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const handleCopyCmd = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    showToast('Command copied to clipboard', 'success');
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleInstallClick = () => {
    if (isInstallable) {
      promptInstall();
    } else {
      showToast('Follow the Chrome/Edge steps below to install to Desktop', 'info');
    }
  };

  const kioskCmd = `chrome.exe --kiosk-printing --app=http://localhost:3000`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] border border-[#FF6B00]/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Single-Click Silent Printing &amp; Desktop Setup</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  No Chrome Dialog
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Print thermal receipts instantly with 1 single click (Zero Chrome popups)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-zinc-800/80 bg-zinc-950/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('silent')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'silent'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ 1-Click Silent Printing</span>
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'windows'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Windows Desktop Launcher</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'pwa'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Chrome App Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('autostart')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'autostart'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>Auto-Start on Boot</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: 1-CLICK SILENT PRINTING (THE SOLUTION) */}
          {activeTab === 'silent' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>How to Stop the Chrome Print Window &amp; Print Instantly</span>
                </div>
                <p className="text-emerald-100/90 leading-relaxed text-[11px]">
                  By default, Google Chrome forces a print preview dialog where you have to press "Print" a second time. 
                  In professional retail POS, Chrome provides the official <strong className="text-white font-mono">--kiosk-printing</strong> flag:
                  it <strong>completely disables the preview window</strong> and sends the receipt straight to your thermal printer with <strong>1 single click!</strong>
                </p>
              </div>

              {/* Step 1: Default Printer */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Set Your Thermal Printer as Windows Default Printer</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Because silent printing skips the dialog, Windows needs to know which printer to send the job to:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-zinc-300 text-[11px]">
                  <li>Open Windows <strong>Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners</strong>.</li>
                  <li>Click your thermal printer (e.g. <em>POS-80, POS-58, Xprinter, Rongta, Epson</em>).</li>
                  <li>Click <strong className="text-white">"Set as default"</strong>.</li>
                </ol>
              </div>

              {/* Step 2: 1-Click Batch File to Create Desktop Icon */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Launch with Automated Silent Print Shortcut</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">Recommended</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  In your project folder, double-click this new script:
                </p>
                <div className="p-2.5 bg-zinc-900 rounded-lg font-mono text-emerald-400 font-bold flex items-center justify-between">
                  <span>Create-Silent-Print-Chrome-Shortcut.bat</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  This creates a desktop icon called <strong className="text-white">"Tokyo Crunch POS (Silent Print)"</strong>. Double-click that icon to run POS — from then on, clicking Print or completing checkout prints immediately with <strong>NO Chrome preview window!</strong>
                </p>
              </div>

              {/* Step 3: Manual Command Alternative */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Manual Chrome Shortcut Command</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  If you want to edit your existing Chrome shortcut: right-click it &rarr; <strong>Properties</strong> &rarr; add to <strong>Target</strong>:
                </p>
                <div className="p-2.5 bg-zinc-900 rounded-lg font-mono text-amber-300 text-[11px] flex items-center justify-between">
                  <span className="truncate pr-2">--kiosk-printing --app=http://localhost:3000</span>
                  <button
                    onClick={() => handleCopyCmd('--kiosk-printing --app=http://localhost:3000')}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold shrink-0"
                  >
                    {copiedCmd ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 1-CLICK WINDOWS BATCH LAUNCHER */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#FF6B00] font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Permanent Desktop Icon &amp; Launcher Files Included</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  Both <code className="text-[#FF6B00] font-mono">Start-Tokyo-Crunch-POS.bat</code> and <code className="text-[#FF6B00] font-mono">Create-Desktop-Shortcut.bat</code> now include the <code className="text-emerald-400 font-mono">--kiosk-printing</code> flag!
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Step 1: Create the Desktop Icon</span>
                    <span className="text-[10px] text-[#FF6B00] font-mono">One-time setup</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    In your project folder, double-click:
                  </p>
                  <div className="p-2.5 bg-zinc-900 rounded-lg font-mono text-emerald-400 font-bold flex items-center justify-between">
                    <span>Create-Desktop-Shortcut.bat</span>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Step 2: Launch Like a Native Desktop Software</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Everyday use</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Double-click the <strong className="text-white">"Tokyo Crunch POS"</strong> shortcut on your desktop. It starts everything in the background and opens in a standalone window with 1-click silent printing enabled!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NATIVE CHROME / EDGE PWA INSTALL */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-white text-sm">
                    Install via Browser App Engine
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Registers Tokyo Crunch POS in Windows Start Menu and Taskbar
                  </p>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>In Google Chrome</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-zinc-300 text-[11px]">
                    <li>Click the 3 vertical dots (<strong className="text-white">⋮</strong>) at top-right.</li>
                    <li>Hover over <strong className="text-white">Cast, save and share</strong>.</li>
                    <li>Click <strong className="text-[#FF6B00]">Install Tokyo Crunch POS...</strong></li>
                  </ol>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>In Microsoft Edge</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-zinc-300 text-[11px]">
                    <li>Click the 3 horizontal dots (<strong className="text-white">...</strong>) at top-right.</li>
                    <li>Hover over <strong className="text-white">Apps</strong>.</li>
                    <li>Click <strong className="text-[#FF6B00]">Install this site as an app</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUTO-START ON PC BOOT */}
          {activeTab === 'autostart' && (
            <div className="space-y-3">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Power className="w-4 h-4 text-[#FF6B00]" />
                  <span>Turn On Counter PC &rarr; POS Opens Automatically</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  For a dedicated billing counter, you can configure Windows to open Tokyo Crunch POS automatically the moment you turn on the computer in the morning:
                </p>
              </div>

              <ol className="space-y-2 text-zinc-300 text-[11px]">
                <li className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-start gap-2">
                  <span className="font-bold text-[#FF6B00]">1.</span>
                  <div>
                    Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono">Win + R</kbd> on your keyboard, type:
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-zinc-900 text-emerald-400 font-mono font-bold">
                        shell:startup
                      </code>
                      <button
                        onClick={() => handleCopyCmd('shell:startup')}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold"
                      >
                        {copiedCmd ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-start gap-2">
                  <span className="font-bold text-[#FF6B00]">2.</span>
                  <div>
                    The Windows <strong>Startup folder</strong> will open in File Explorer.
                  </div>
                </li>
                <li className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-start gap-2">
                  <span className="font-bold text-[#FF6B00]">3.</span>
                  <div>
                    Copy your <strong className="text-white">"Tokyo Crunch POS (Silent Print)"</strong> desktop shortcut into this Startup folder.
                  </div>
                </li>
              </ol>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Done! Whenever staff turn on the counter PC, Tokyo Crunch POS will launch automatically with 1-click silent thermal printing.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-medium">
            Tokyo Crunch POS · Single-Click Silent Thermal Printing
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
