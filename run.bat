@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo Starting Finora on http://localhost:3000...

:: Start server in background
start /b "" cmd /c "npx tsx server.ts"

:: Wait for server to actually be ready
echo Waiting for server...
set /a "MAX_RETRIES=30"
set /a "RETRY=0"
:waitloop
set /a "RETRY+=1"
if !RETRY! gtr !MAX_RETRIES! (
    echo Server didn't respond in time. Opening browser anyway...
    goto :openbrowser
)
curl.exe -s -m 2 http://localhost:3000/api/health >nul 2>nul
if !errorlevel! equ 0 goto :openbrowser
timeout /t 1 /nobreak >nul
goto :waitloop

:openbrowser
echo Server is ready!
start http://localhost:3000
pause
