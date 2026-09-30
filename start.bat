@echo off
setlocal enabledelayedexpansion

title FINORA - Personal Finance Launcher
cd /d "%~dp0"

echo ====================================================================
echo                   FINORA - Personal Finance System
echo ====================================================================
echo.

:: 1. Try to find Node.js and NPM in standard Windows paths if not in PATH
set "NODE_CMD="
set "NPM_CMD="

:: Check default PATH first
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
)

where npm >nul 2>nul
if %errorlevel% equ 0 (
    set "NPM_CMD=npm"
)

:: If not in PATH, search common Windows install directories
if "%NODE_CMD%"=="" (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        set "PATH=%PATH%;C:\Program Files\nodejs"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files (x86)\nodejs\node.exe"
        set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "NODE_CMD=%LOCALAPPDATA%\Programs\node\node.exe"
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\node"
    ) else if exist "%APPDATA%\npm\node.exe" (
        set "NODE_CMD=%APPDATA%\npm\node.exe"
    )
)

if "%NPM_CMD%"=="" (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
    ) else if exist "C:\Program Files (x86)\nodejs\npm.cmd" (
        set "NPM_CMD=C:\Program Files (x86)\nodejs\npm.cmd"
    ) else if exist "%LOCALAPPDATA%\Programs\node\npm.cmd" (
        set "NPM_CMD=%LOCALAPPDATA%\Programs\node\npm.cmd"
    ) else if exist "%APPDATA%\npm\npm.cmd" (
        set "NPM_CMD=%APPDATA%\npm\npm.cmd"
    )
)

:: If still not found, show instructions and offer to open nodejs.org
if "%NODE_CMD%"=="" (
    echo [ERROR] Node.js is NOT installed on your computer.
    echo.
    echo Node.js is required to run FINORA.
    echo.
    echo Would you like to open the official Node.js download page now? (Y/N)
    set /p "INSTALL_CHOICE=Choice (Y/N): "
    if /i "!INSTALL_CHOICE!"=="Y" (
        start https://nodejs.org/en/download/
    )
    echo.
    echo 1. Download and install Node.js (LTS Version).
    echo 2. During installation, ensure 'Add to PATH' is checked.
    echo 3. Once installed, double-click start.bat again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: %NODE_CMD%

:: If npm wasn't resolved specifically, default to npm
if "%NPM_CMD%"=="" set "NPM_CMD=npm"

:: 2. Setup .env file if missing
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] Creating .env file from .env.example...
        copy /y ".env.example" ".env" >nul
        echo [NOTICE] A default .env was created. AI features stay DISABLED until you
        echo          add a real GEMINI_API_KEY inside the .env file.
    )
)

:: 3. Check and install dependencies if node_modules missing
if not exist "node_modules\" (
    echo [SETUP] Installing required dependencies... This may take a minute.
    call "%NPM_CMD%" install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
)

:: 4. Launch development server in background, then wait for it to be ready
echo.
echo ====================================================================
echo   Starting FINORA Server...
echo   Keep this window open while using FINORA.
echo   Press Ctrl + C to stop the server.
echo ====================================================================
echo.

:: Start the server in a hidden window
start /b "" cmd /c "%NPM_CMD% run dev"

:: Poll the health endpoint until the server is actually ready
echo [WAIT] Waiting for server to be ready...
set /a "MAX_RETRIES=30"
set /a "RETRY=0"
:waitloop
set /a "RETRY+=1"
if !RETRY! gtr !MAX_RETRIES! (
    echo [WARN] Server didn't respond in time. Opening browser anyway...
    goto :openbrowser
)
:: Use curl to check if server is responding
curl.exe -s -m 2 http://localhost:3000/api/health >nul 2>nul
if !errorlevel! equ 0 goto :openbrowser
timeout /t 1 /nobreak >nul
goto :waitloop

:openbrowser
echo [OK] Server is ready!
start http://localhost:3000

:: Keep this window alive so user can see logs and Ctrl+C
:: Re-attach by just waiting on the background process
pause

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Server stopped.
    pause
)
