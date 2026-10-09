@echo off
title Create Single-Click Silent Printing Desktop Shortcut
color 0a

echo ====================================================================
echo    CREATING SINGLE-CLICK SILENT THERMAL PRINTING SHORTCUT
echo ====================================================================
echo.

set SHORTCUT=%USERPROFILE%\Desktop\Tokyo Crunch POS (Silent Print).lnk
set SCRIPT_DIR=%~dp0
set BATCH_TARGET=%SCRIPT_DIR%Start-Tokyo-Crunch-POS.bat

:: Find Brave, Chrome or Edge executable
set BROWSER_EXE=
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BROWSER_EXE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BROWSER_EXE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
)

if "%BROWSER_EXE%"=="" (
    echo [FALLBACK] Browser path not found in default locations.
    echo Linking to Start-Tokyo-Crunch-POS.bat directly...
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%BATCH_TARGET%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Tokyo Crunch POS with Single-Click Silent Printing'; $s.Save()"
) else (
    echo Found Browser: %BROWSER_EXE%
    set "PROFILE_DIR=%LOCALAPPDATA%\TokyoCrunchPOS\BrowserProfile"
    if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%" 2>nul
    echo Creating direct Windows Shortcut with --kiosk-printing and isolated profile...
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%BROWSER_EXE%'; $s.Arguments = '--kiosk-printing --disable-print-preview --user-data-dir=\"' + '%PROFILE_DIR%' + '\" --no-first-run --no-default-browser-check --app=http://localhost:3000 --start-maximized'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Tokyo Crunch POS with Single-Click Silent Printing'; $s.Save()"
)

echo.
if exist "%SHORTCUT%" (
    echo ====================================================================
    echo [SUCCESS] "Tokyo Crunch POS (Silent Print)" icon created on Desktop!
    echo ====================================================================
    echo.
    echo HOW TO USE:
    echo 1. Set your thermal printer as Windows Default Printer once.
    echo 2. Double-click the new "Tokyo Crunch POS (Silent Print)" desktop icon.
    echo 3. Click "Print" on any order - it prints INSTANTLY with NO Chrome window!
    echo.
) else (
    echo [NOTE] Please run as Administrator or check desktop permissions.
)

pause
