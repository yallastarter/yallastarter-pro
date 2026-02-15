@echo off
echo ========================================
echo Updating to Mobile-Optimized Password Script
echo ========================================
echo.

echo Updating all HTML files to use password-mobile.js...
echo.

set "OLD_SCRIPT=assets/js/password-clear.js"
set "NEW_SCRIPT=assets/js/password-mobile.js"

for /r %%f in (*.html) do (
    echo Processing %%f...
    powershell -Command "(Get-Content '%%f') -replace '%OLD_SCRIPT%', '%NEW_SCRIPT%' | Set-Content '%%f'"
    echo Updated %%f
)

echo.
echo ========================================
echo Update Complete!
echo ========================================
echo.
echo All HTML files now use password-mobile.js
echo.
echo Mobile Optimizations Applied:
echo - Responsive modal sizing for mobile devices
echo - Touch-friendly button sizes (44px minimum)
echo - Font size 16px to prevent iOS zoom
echo - Mobile-specific padding and margins
echo - Touch event handlers for mobile
echo - Responsive font sizes
echo.
echo Test the password protection:
echo 1. Open index.html on desktop and mobile
echo 2. Password modal should be perfectly sized for each device
echo 3. Enter password: Yalla**2025
echo 4. Content should be accessible after authentication
echo.
pause
