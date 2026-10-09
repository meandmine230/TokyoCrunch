@echo off
title Tokyo Crunch POS - Desktop & Silent Printing Launcher
color 06

echo ====================================================================
echo     TOKYO CRUNCH POS - SINGLE-CLICK SILENT THERMAL PRINTING
echo ====================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this PC!
    echo Please install Node.js from https://nodejs.org and re-run.
    echo.
    pause
    exit /b
)

:: 2. Check if node_modules exist, if not install
if not exist "node_modules\" (
    echo [SETUP] Initializing POS modules for first-time launch...
    call npm install --legacy-peer-deps
)

:: 3. Launch Vite POS server in the background
echo [STARTING] Launching POS Server on http://localhost:3000...
start "" /b cmd /c "npm run dev"

:: 4. Wait briefly for Vite server to listen on port 3000
timeout /t 3 /nobreak >nul

:: 5. Launch in Native Standalone Window with --kiosk-printing (Single-Click Silent Print)
:: --kiosk-printing BYPASSES Chrome's print preview dialog and prints directly to your thermal printer!
echo [OPENING] Launching POS with 1-Click Silent Thermal Printing...

:: Try Brave Browser
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)
if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)
if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)

:: Try Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)

:: Try Microsoft Edge
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=http://localhost:3000 --start-maximized
    exit
)

:: Fallback standard browser opener
start http://localhost:3000
exit
