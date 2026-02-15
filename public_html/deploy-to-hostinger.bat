@echo off
echo ========================================
echo YallaStarter Hostinger Deployment Tool
echo ========================================
echo.

echo Checking files for deployment...
echo.

REM Check if required files exist
if not exist "index.html" (
    echo ERROR: index.html not found!
    pause
    exit /b 1
)

if not exist "assets\js\password.js" (
    echo ERROR: password.js not found!
    pause
    exit /b 1
)

echo ✅ All required files found!
echo.

echo Files to upload to Hostinger:
echo - All HTML files (60+ files)
echo - assets/js/password.js
echo - assets/js/password-deployment.js
echo - styles.css
echo - mobile-menu.css
echo - mobile-menu.js
echo - images/ folder
echo - test-password.html (for testing)
echo.

echo ========================================
echo DEPLOYMENT INSTRUCTIONS:
echo ========================================
echo.
echo 1. Log into your Hostinger control panel
echo 2. Go to File Manager
echo 3. Navigate to public_html folder
echo 4. Upload all files maintaining folder structure
echo 5. Test with: yourdomain.com/test-password.html
echo.

echo ========================================
echo FILE STRUCTURE FOR HOSTINGER:
echo ========================================
echo.
echo public_html/
echo ├── index.html
echo ├── index-ar.html
echo ├── about.html
echo ├── projects.html
echo ├── [all other HTML files]
echo ├── test-password.html
echo ├── assets/
echo │   └── js/
echo │       ├── password.js
echo │       └── password-deployment.js
echo ├── styles.css
echo ├── mobile-menu.css
echo ├── mobile-menu.js
echo └── images/
echo     └── [all image files]
echo.

echo ========================================
echo TESTING CHECKLIST:
echo ========================================
echo.
echo After uploading, test these:
echo 1. Visit your main domain
echo 2. Password modal should appear
echo 3. Enter password: Yalla**2025
echo 4. Content should be accessible
echo 5. Test on mobile device
echo 6. Test on different browsers
echo.

echo ========================================
echo TROUBLESHOOTING:
echo ========================================
echo.
echo If password modal doesn't appear:
echo 1. Check browser console for errors (F12)
echo 2. Verify assets/js/password.js is uploaded
echo 3. Check file permissions (644 for files)
echo 4. Clear browser cache
echo.

echo ========================================
echo READY FOR DEPLOYMENT!
echo ========================================
echo.
echo Press any key to continue...
pause >nul

echo.
echo Opening file explorer for easy upload...
explorer .

echo.
echo Deployment guide created: HOSTINGER_DEPLOYMENT_GUIDE.md
echo Test file created: test-password.html
echo.
echo Good luck with your deployment! 🚀
pause
