@echo off
echo Stopping all Chrome and Node processes...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

echo Starting WhatsApp Bot...
npm run dev
