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
  Shield,
  HelpCircle,
  Usb,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  isWebSerialSupported,
  isWebSerialConnected,
  connectWebSerialPrinter,
  disconnectWebSerialPrinter,
} from '../../utils/webSerialPrinter';

interface DesktopSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopSetupModal: React.FC<DesktopSetupModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, promptInstall, showToast, settings } = useApp();
  const [activeTab, setActiveTab] = useState<'brave_vercel' | 'usb_direct' | 'silent' | 'pwa' | 'autostart'>('brave_vercel');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedBraveCmd, setCopiedBraveCmd] = useState(false);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);

  // Auto-detect current URL (e.g. https://your-pos.vercel.app)
  const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tokyo-crunch-pos.vercel.app';
  const [customVercelUrl, setCustomVercelUrl] = useState(defaultUrl);

  if (!isOpen) return null;

  const handleCopyCmd = (text: string, isBrave = false) => {
    navigator.clipboard.writeText(text);
    if (isBrave) {
      setCopiedBraveCmd(true);
      setTimeout(() => setCopiedBraveCmd(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
    showToast('Command copied to clipboard!', 'success');
  };

  const handleDownloadBraveBat = () => {
    const targetUrl = customVercelUrl.trim() || defaultUrl;
    const batContent = `@echo off
title Tokyo Crunch POS - Brave Browser Silent Print Setup (Vercel)
color 0b

echo ====================================================================
echo     TOKYO CRUNCH POS - BRAVE BROWSER SILENT PRINT SETUP (VERCEL)
echo ====================================================================
echo.
echo Target URL: ${targetUrl}
echo.
echo FIX FOR "SECOND WINDOW OPENING":
echo In Brave, if you already have regular tabs open, Chromium merges
echo into the existing session and drops the --kiosk-printing flag.
echo This causes Brave to open its Print Preview dialog (the second window).
echo.
echo This script creates an ISOLATED POS profile:
echo   %%LOCALAPPDATA%\\TokyoCrunchPOS\\BraveProfile
echo with flags: --kiosk-printing --disable-print-preview
echo This guarantees ZERO second windows and INSTANT thermal printing!
echo.
echo ====================================================================
echo.

:: Locate Brave Browser
set BRAVE_EXE=
if exist "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" (
    set "BRAVE_EXE=%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
) else if exist "%ProgramFiles(x86)%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" (
    set "BRAVE_EXE=%ProgramFiles(x86)%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
) else if exist "%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" (
    set "BRAVE_EXE=%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
)

if "%BRAVE_EXE%"=="" (
    if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
        set "BRAVE_EXE=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
        echo [INFO] Brave not found, using Google Chrome.
    ) else if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
        set "BRAVE_EXE=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
        echo [INFO] Brave not found, using Google Chrome.
    ) else if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
        set "BRAVE_EXE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
        echo [INFO] Brave not found, using Microsoft Edge.
    )
)

if "%BRAVE_EXE%"=="" (
    echo [ERROR] Brave Browser (or Chrome/Edge) was not found in standard paths!
    echo Please install Brave from https://brave.com
    pause
    exit /b
)

:: Prepare dedicated profile directory
set "PROFILE_DIR=%LOCALAPPDATA%\\TokyoCrunchPOS\\BraveProfile"
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%" 2>nul

:: Create Desktop Shortcut
set SHORTCUT=%USERPROFILE%\\Desktop\\Tokyo Crunch POS (Brave Silent Print).lnk
set SCRIPT_DIR=%~dp0

echo Creating Desktop Shortcut with isolated profile & --kiosk-printing...

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%BRAVE_EXE%'; $s.Arguments = '--kiosk-printing --disable-print-preview --user-data-dir=\"' + '%PROFILE_DIR%' + '\" --no-first-run --no-default-browser-check --app=${targetUrl} --start-maximized'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Tokyo Crunch POS with Single-Click Silent Thermal Printing in Brave'; $s.Save()"

echo.
if exist "%SHORTCUT%" (
    echo ====================================================================
    echo [SUCCESS] "Tokyo Crunch POS (Brave Silent Print)" shortcut created!
    echo ====================================================================
    echo.
    echo WHERE TO FIND IT:
    echo Look on your Windows Desktop for:
    echo   "Tokyo Crunch POS (Brave Silent Print)"
    echo.
    echo IMPORTANT:
    echo 1. Set your Thermal Receipt Printer as your Windows Default Printer once
    echo    (Windows Settings -> Bluetooth & devices -> Printers & scanners -> Set as default).
    echo 2. Double-click the new Desktop shortcut to launch the POS.
    echo 3. Click Print or Checkout -> prints IMMEDIATELY with ZERO second windows!
    echo.
) else (
    echo [WARNING] Could not create shortcut automatically.
)

pause
`;

    const blob = new Blob([batContent], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Setup-Brave-Vercel-Silent-Print.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded Setup-Brave-Vercel-Silent-Print.bat! Run it on Windows.', 'success');
  };

  const handleConnectUsb = async () => {
    setIsConnectingUsb(true);
    try {
      const res = await connectWebSerialPrinter();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'info');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to connect USB printer', 'error');
    } finally {
      setIsConnectingUsb(false);
    }
  };

  const handleDisconnectUsb = async () => {
    await disconnectWebSerialPrinter();
    showToast('USB Thermal Printer disconnected', 'info');
  };

  const braveManualCmd = `"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --kiosk-printing --disable-print-preview --user-data-dir="%LOCALAPPDATA%\\TokyoCrunchPOS\\BraveProfile" --no-first-run --no-default-browser-check --app=${customVercelUrl.trim() || defaultUrl} --start-maximized`;

  const handleInstallClick = () => {
    if (isInstallable) {
      promptInstall();
    } else {
      showToast('Follow the Chrome/Edge steps below to install to Desktop', 'info');
    }
  };

  const usbConnected = isWebSerialConnected();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] border border-[#FF6B00]/30 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Single-Click Silent Printing Setup</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Zero Second Windows
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Fix print preview popups &amp; print instantly on Brave Browser &amp; Vercel deployments
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
        <div className="flex items-center gap-2 px-6 pt-3.5 pb-2 border-b border-zinc-800/80 bg-zinc-950/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('brave_vercel')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'brave_vercel'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span className="text-sm">🦁</span>
            <span>Brave Browser (Vercel Fix)</span>
          </button>

          <button
            onClick={() => setActiveTab('usb_direct')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'usb_direct'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Usb className="w-3.5 h-3.5 text-blue-400" />
            <span>USB Direct Serial (No Flags)</span>
          </button>

          <button
            onClick={() => setActiveTab('silent')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'silent'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Chrome / Edge Kiosk</span>
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
            <span>App Mode (PWA)</span>
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
          {/* TAB 1: BRAVE BROWSER + VERCEL SILENT PRINT (DIRECT FIX) */}
          {activeTab === 'brave_vercel' && (
            <div className="space-y-4">
              {/* Problem & Solution Banner */}
              <div className="p-4 bg-orange-950/30 border border-orange-800/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#FF6B00] font-bold text-sm">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Why Did Brave Open a Second Window on Vercel?</span>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  The <strong>"second window"</strong> is Brave&apos;s Print Preview dialog. In Chromium and Brave, if you already have regular Brave tabs open, launching a new window with <code className="text-emerald-400 font-mono">--kiosk-printing</code> attaches to the <strong>existing browser session</strong> and ignores the kiosk flag.
                </p>
                <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800 text-[11px] text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>
                    <strong>The Fix:</strong> We supply a dedicated profile (<code className="text-white font-mono">--user-data-dir</code>) and <code className="text-white font-mono">--disable-print-preview</code>. This isolates the POS from your personal tabs and ensures <strong>100% silent, direct printing with ZERO second windows!</strong>
                  </span>
                </div>
              </div>

              {/* Vercel Target URL Configuration */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5">
                <label className="block text-xs font-bold text-white">
                  Your Vercel Deployment URL:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customVercelUrl}
                    onChange={(e) => setCustomVercelUrl(e.target.value)}
                    placeholder="https://your-pos.vercel.app"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white font-mono focus:outline-none focus:border-[#FF6B00]"
                  />
                  <button
                    onClick={handleDownloadBraveBat}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md active:scale-95 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download 1-Click Setup Script (.bat)</span>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Auto-detected from current address: <span className="text-emerald-400 font-mono">{defaultUrl}</span>
                </p>
              </div>

              {/* 3 Step Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Set Default Printer</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Open Windows <strong>Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners</strong>, click your thermal printer (POS-80 / POS-58 / Xprinter) and click <strong className="text-white">&quot;Set as default&quot;</strong>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Run Setup Script</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Click the green <strong>&quot;Download 1-Click Setup Script&quot;</strong> button above, then double-click the downloaded file. It creates a desktop icon called <strong className="text-white">&quot;Tokyo Crunch POS (Brave Silent Print)&quot;</strong>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Launch &amp; Print!</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Launch the POS using that desktop icon. Every time you checkout or click Print, the receipt cuts immediately with <strong>ZERO popups and NO second window!</strong>
                  </p>
                </div>
              </div>

              {/* Manual Shortcut Command */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-400" />
                    <span>Or Copy the Exact Brave Command for Windows Shortcut:</span>
                  </div>
                  <button
                    onClick={() => handleCopyCmd(braveManualCmd, true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold shrink-0 transition-colors"
                  >
                    {copiedBraveCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBraveCmd ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-zinc-900 rounded-lg font-mono text-amber-300 text-[10.5px] break-all leading-normal select-all">
                  {braveManualCmd}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT USB WEB SERIAL (HARDWARE PRINTING - NO FLAGS REQUIRED) */}
          {activeTab === 'usb_direct' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Usb className="w-4 h-4" />
                  <span>Direct USB ESC/POS Printing (Native in Browser)</span>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  Want 100% silent printing without creating any Windows shortcuts or passing any browser flags? Connect your thermal printer directly via <strong>Web Serial API</strong>. The POS sends raw ESC/POS commands directly over USB at lightning speed (&lt;50ms) with <strong>ZERO browser dialogs and ZERO second windows!</strong>
                </p>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    usbConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm flex items-center gap-2">
                      <span>USB Thermal Printer Connection</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        usbConnected
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {usbConnected ? 'Connected & Active' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      {usbConnected
                        ? 'Thermal receipts and KOTs will print directly via USB without any print dialog.'
                        : 'Click Connect to pair your USB thermal receipt printer (Xprinter, Rongta, Epson, Zjiang).'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {usbConnected ? (
                    <button
                      onClick={handleDisconnectUsb}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 text-xs font-bold transition-all border border-zinc-700"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      disabled={isConnectingUsb}
                      onClick={handleConnectUsb}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      <Usb className="w-4 h-4" />
                      <span>{isConnectingUsb ? 'Connecting...' : 'Connect USB Printer'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>How to connect your USB thermal printer:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-zinc-300 text-[11px]">
                  <li>Connect your thermal printer to the PC with a USB cable and turn it ON.</li>
                  <li>Click <strong>&quot;Connect USB Printer&quot;</strong> above.</li>
                  <li>Brave/Chrome will show a popup list of USB devices. Select your USB printer (or USB-Serial port) and click <strong>&quot;Connect&quot;</strong>.</li>
                  <li>Done! From then on, receipts print directly to the printer with zero dialogs.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: CHROME / EDGE KIOSK PRINTING */}
          {activeTab === 'silent' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Single-Click Silent Printing via Chrome / Edge</span>
                </div>
                <p className="text-emerald-100/90 leading-relaxed text-[11px]">
                  Google Chrome and MS Edge provide the official <strong className="text-white font-mono">--kiosk-printing</strong> flag:
                  it completely disables the preview window and sends the receipt straight to your thermal printer with <strong>1 single click!</strong>
                </p>
              </div>

              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Set Your Thermal Printer as Windows Default Printer</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-zinc-300 text-[11px]">
                  <li>Open Windows <strong>Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners</strong>.</li>
                  <li>Click your thermal printer (e.g. <em>POS-80, POS-58, Xprinter, Rongta, Epson</em>).</li>
                  <li>Click <strong className="text-white">&quot;Set as default&quot;</strong>.</li>
                </ol>
              </div>

              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Launch with Automated Silent Print Shortcut</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">Included</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  In your project folder, double-click:
                </p>
                <div className="p-2.5 bg-zinc-900 rounded-lg font-mono text-emerald-400 font-bold flex items-center justify-between">
                  <span>Create-Silent-Print-Chrome-Shortcut.bat</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  This creates a desktop icon called <strong className="text-white">&quot;Tokyo Crunch POS (Silent Print)&quot;</strong> with zero dialogs.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: NATIVE CHROME / EDGE PWA INSTALL */}
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
                    <span>In Google Chrome / Brave</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-zinc-300 text-[11px]">
                    <li>Click the 3 dots or burger menu (<strong className="text-white">⋮</strong>) at top-right.</li>
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
                    <li>Click the 3 dots (<strong className="text-white">...</strong>) at top-right.</li>
                    <li>Hover over <strong className="text-white">Apps</strong>.</li>
                    <li>Click <strong className="text-[#FF6B00]">Install this site as an app</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUTO-START ON PC BOOT */}
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
                    Copy your <strong className="text-white">&quot;Tokyo Crunch POS (Brave Silent Print)&quot;</strong> shortcut into this Startup folder.
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
          <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-2">
            <span>Tokyo Crunch POS</span>
            <span>·</span>
            <span>Single-Click Silent Thermal Printing</span>
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
