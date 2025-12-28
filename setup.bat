@echo off
echo ========================================
echo AI Live Chat Agent - Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Setup Backend
echo Setting up Backend...
cd backend

if not exist ".env" (
    echo Creating .env file...
    copy .env.exmaple .env
    echo [WARNING] Please edit backend\.env and add your GEMINI_API_KEY
)

echo Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend installation failed
    pause
    exit /b 1
)

cd ..

REM Setup Frontend
echo.
echo Setting up Frontend...
cd frontend

echo Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend installation failed
    pause
    exit /b 1
)

cd ..

REM Final Instructions
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Edit backend\.env and add your GEMINI_API_KEY
echo    Get one at: https://makersuite.google.com/app/apikey
echo.
echo 2. Make sure MongoDB is running
echo    - Local: Run 'mongod' command
echo    - Cloud: Use MongoDB Atlas connection string
echo.
echo 3. Start Backend (in a new terminal):
echo    cd backend
echo    npm run dev
echo.
echo 4. Start Frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 5. Open browser to http://localhost:5173
echo.
echo Happy chatting!
echo.
pause
