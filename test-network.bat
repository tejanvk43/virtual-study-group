@echo off
echo === Virtual Study Group Network Test ===
echo.

echo Adding Windows Firewall Rules (requires Administrator)...
netsh advfirewall firewall delete rule name="VSG Backend" >nul 2>&1
netsh advfirewall firewall delete rule name="VSG Frontend" >nul 2>&1
netsh advfirewall firewall add rule name="VSG Backend" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="VSG Frontend" dir=in action=allow protocol=TCP localport=3000

echo.
echo Getting Network IP Address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set "ip=%%a"
    setlocal enabledelayedexpansion
    set "ip=!ip: =!"
    if "!ip:~0,3!"=="192" (
        echo Network IP: !ip!
        echo.
        echo Access URLs:
        echo Frontend: http://!ip!:3000
        echo Backend:  http://!ip!:5000
        goto :found
    )
    endlocal
)
:found

echo.
echo Testing localhost connectivity...
curl -s http://localhost:5000/health >nul 2>&1 && echo ✓ Localhost backend OK || echo ✗ Localhost backend FAILED

echo.
echo Firewall rules added. Test remote access now.
pause