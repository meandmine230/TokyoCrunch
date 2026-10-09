@echo off
title Tokyo Crunch POS - Brave Browser Silent Printing Setup (Vercel)
color 0b

echo ====================================================================
echo     TOKYO CRUNCH POS - BRAVE BROWSER SILENT PRINT SETUP (VERCEL)
echo ====================================================================
echo.
echo This tool configures 100%% single-click silent thermal printing for
echo Brave Browser when accessing your Vercel deployment (or any cloud URL).
echo.
echo FIX FOR "SECOND WINDOW OPENING":
echo In Brave, if you already have Brave open, Chromium connects to the
echo existing session and IGNORES the --kiosk-printing flag, opening the
echo Print Preview dialog (the second window).
echo.
echo This script creates an ISOLATED POS profile directory:
echo   %%LOCALAPPDATA%%\TokyoCrunchPOS\BraveProfile
echo with flags: --kiosk-printing --disable-print-preview
echo This guarantees ZERO second windows and INSTANT thermal printing!
echo.
echo ====================================================================
echo.

:: 1. Ask for Vercel URL or use default
set /p VERCEL_URL="Enter your Vercel Deployment URL (e.g. https://your-pos.vercel.app) or press ENTER for default: "

if "%VERCEL_URL%"=="" (
    set "VERCEL_URL=https://tokyo-crunch-pos.vercel.app"
    echo [INFO] No URL entered. Using default: %VERCEL_URL%
)

:: Ensure URL has http/https protocol
echo %VERCEL_URL% | findstr /i "^http://" >nul
if errorlevel 1 (
    echo %VERCEL_URL% | findstr /i "^https://" >nul
    if errorlevel 1 (
        set "VERCEL_URL=https://%VERCEL_URL%"
    )
)

:: 2. Locate Brave Browser executable
set BRAVE_EXE=
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BRAVE_EXE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BRAVE_EXE=%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BRAVE_EXE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

:: Fallback to Chrome or Edge if Brave is not installed
if "%BRAVE_EXE%"=="" (
    if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
        set "BRAVE_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
        echo [NOTICE] Brave not found, using Google Chrome instead.
    ) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
        set "BRAVE_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
        echo [NOTICE] Brave not found, using Google Chrome instead.
    ) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
        set "BRAVE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
        echo [NOTICE] Brave not found, using Microsoft Edge instead.
    )
)

if "%BRAVE_EXE%"=="" (
    echo [ERROR] Brave Browser (or Chrome/Edge) was not found in standard paths!
    echo Please install Brave from https://brave.com
    pause
    exit /b
)

echo.
echo Found Browser: "%BRAVE_EXE%"
echo Target URL:    "%VERCEL_URL%"
echo.

:: 3. Prepare dedicated profile directory
set "PROFILE_DIR=%LOCALAPPDATA%\TokyoCrunchPOS\BraveProfile"
if not exist "%PROFILE_DIR%" (
    mkdir "%PROFILE_DIR%" 2>nul
)

:: 4. Create Desktop Shortcut with isolated profile & silent kiosk flags
set SHORTCUT=%USERPROFILE%\Desktop\Tokyo Crunch POS (Brave Silent Print).lnk
set SCRIPT_DIR=%~dp0

echo Creating Desktop Shortcut with isolated profile and --kiosk-printing...

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%BRAVE_EXE%'; $s.Arguments = '--kiosk-printing --disable-print-preview --user-data-dir=\"' + '%PROFILE_DIR%' + '\" --no-first-run --no-default-browser-check --app=' + '%VERCEL_URL%' + ' --start-maximized'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Tokyo Crunch POS with Single-Click Silent Thermal Printing in Brave'; $s.Save()"

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
    echo CRITICAL 2-STEP SETUP FOR ZERO SECOND WINDOWS:
    echo 1. Set your Thermal Receipt Printer as Windows Default Printer:
    echo    (Windows Settings -^> Bluetooth & devices -^> Printers & scanners
    echo     -^> Select your thermal printer (POS-80 / POS-58 / Xprinter)
    echo     -^> Click "Set as default")
    echo.
    echo 2. Launch Tokyo Crunch POS from the new Desktop Shortcut!
    echo    Because it uses a dedicated profile, it NEVER connects to your
    echo    other open Brave windows, ensuring --kiosk-printing is 100%% ACTIVE!
    echo.
    echo    When you checkout or print an order:
    echo    - Receipt prints IMMEDIATELY to your thermal roll
    echo    - NO Print Preview Dialog
    echo    - NO Second Window!
    echo.
) else (
    echo [WARNING] Could not write shortcut directly to Desktop.
    echo You can manually run or create a shortcut to:
    echo "%BRAVE_EXE%" --kiosk-printing --disable-print-preview --user-data-dir="%PROFILE_DIR%" --app=%VERCEL_URL%
)

pause
