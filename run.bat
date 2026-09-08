@echo off
cd /d "%~dp0"
echo Starting Finora on http://localhost:3000...
start "" cmd /c "timeout /t 5 >nul & start http://localhost:3000"
npx tsx server.ts
pause
