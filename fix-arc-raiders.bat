@echo off
echo ================================================
echo Arc Raiders Crash Fix Script
echo ================================================
echo.
echo This will:
echo 1. Run Windows System File Checker
echo 2. Repair Windows Image with DISM
echo 3. Check results
echo.
echo This may take 10-30 minutes...
echo.
pause

echo.
echo [1/2] Running System File Checker...
echo ================================================
sfc /scannow
echo.
echo.

echo [2/2] Running DISM to repair Windows image...
echo ================================================
DISM /Online /Cleanup-Image /RestoreHealth
echo.
echo.

echo ================================================
echo Scan complete! Check above for results.
echo ================================================
echo.
echo If corruption was found and repaired, restart your PC.
echo Then try running Arc Raiders again.
echo.
pause
