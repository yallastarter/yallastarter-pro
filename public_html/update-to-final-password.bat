@echo off
echo ========================================
echo Updating to Final Password Script
echo ========================================
echo.

echo Updating all HTML files to use password-final.js...
echo.

set "OLD_SCRIPT=assets/js/password-fixed.js"
set "NEW_SCRIPT=assets/js/password-final.js"

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
echo All HTML files now use password-final.js
echo.
echo Test the password protection:
echo 1. Open index.html in your browser
echo 2. You should see a password modal with input field
echo 3. Enter password: Yalla**2025
echo 4. Content should be accessible after authentication
echo.
pause
