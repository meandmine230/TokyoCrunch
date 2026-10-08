@echo off
title Create Tokyo Crunch POS Desktop Shortcut
color 0a

set SCRIPT_DIR=%~dp0
set TARGET=%SCRIPT_DIR%Start-Tokyo-Crunch-POS.bat
set SHORTCUT=%USERPROFILE%\Desktop\Tokyo Crunch POS.lnk

echo =======================================================
echo    CREATING "TOKYO CRUNCH POS" DESKTOP SHORTCUT
echo =======================================================
echo.

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Tokyo Crunch Restaurant POS Desktop App'; $s.Save()"

if exist "%SHORTCUT%" (
    echo [SUCCESS] Desktop icon created successfully on your Windows Desktop!
    echo.
    echo Location: %SHORTCUT%
    echo.
    echo From now on, simply double-click the "Tokyo Crunch POS" icon
    echo on your Windows Desktop to launch the system like a native app!
) else (
    echo [NOTE] Shortcut creation via PowerShell skipped. You can manually right-click
    echo "Start-Tokyo-Crunch-POS.bat" and choose "Send to -> Desktop (create shortcut)".
)

echo.
pause
