@echo off
echo Starting Virtual Study Group Application...
echo.

echo Starting MongoDB (if installed locally)...
start "MongoDB" cmd /k "mongod --dbpath C:\data\db"
timeout /t 3 >nul

echo.
echo Starting Backend Server...
cd /d "%~dp0backend"
start "Backend" cmd /k "npm run dev"

echo.
echo Starting Frontend Development Server...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm start"

echo.
echo All services started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
