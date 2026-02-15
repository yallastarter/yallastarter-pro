@echo off
echo Adding password protection to all HTML files...

REM Get list of all HTML files
for %%f in (*.html) do (
    echo Processing %%f...
    
    REM Check if password script is already added
    findstr /C:"password.js" "%%f" >nul
    if errorlevel 1 (
        REM Add password script before the closing body tag
        powershell -Command "(Get-Content '%%f') -replace '</body>', '    <!-- Password Protection Script -->\n    <script src=\"assets/js/password.js\"></script>\n</body>' | Set-Content '%%f'"
        echo Added password protection to %%f
    ) else (
        echo Password protection already exists in %%f
    )
)

echo.
echo Password protection has been added to all HTML files!
echo.
echo Password: Nova2025!
echo.
pause
