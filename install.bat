@echo off
echo Installing Virtual Study Group Application...
echo.

echo Installing Backend Dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Installing Frontend Dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo.
echo Next steps:
echo 1. Make sure MongoDB is installed and running
echo 2. Update backend/.env with your configuration
echo 3. Run start.bat to start the application
echo.
pause
