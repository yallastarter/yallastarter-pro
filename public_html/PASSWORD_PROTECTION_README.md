# YallaStarter Password Protection System

## Overview
This password protection system adds a secure access gate to your YallaStarter website. Users must enter the correct password before they can view any content on the site.

## Features
- **Password Gate**: Modal dialog requiring password entry before site access
- **Multiple Attempts**: Users get 5 attempts before being locked out
- **Session Storage**: Once authenticated, users stay logged in for the session
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **NovaMind Branding**: Styled with your brand colors (#0B2149 dark blue, #C7A14A gold)
- **Global Protection**: Applied to all HTML pages in the project

## Password
**Default Password**: `Yalla**2025`

## Files Added/Modified

### New Files
- `assets/js/password.js` - Main password protection script
- `add-password-protection.bat` - Windows batch script to add protection to all HTML files
- `PASSWORD_PROTECTION_README.md` - This documentation file

### Modified Files
- `index.html` - Added password protection script
- `index-ar.html` - Added password protection script  
- `about.html` - Added password protection script

## How It Works

1. **Page Load**: When any HTML page loads, the password protection script runs immediately
2. **Content Blur**: The page content is blurred and made non-interactive
3. **Modal Display**: A styled modal appears asking for the password
4. **Password Validation**: User enters password and clicks "Access Site"
5. **Success**: If correct, modal disappears and content becomes accessible
6. **Failure**: If wrong, error message shows and user can try again
7. **Lockout**: After 5 failed attempts, access is denied for the session

## Security Features

- **Frontend Only**: This is a demo-level protection, not suitable for sensitive data
- **Session Storage**: Authentication persists only for the browser session
- **Attempt Limiting**: Prevents brute force attacks with attempt counter
- **No Server Required**: Works entirely in the browser

## Customization

### Changing the Password
Edit `assets/js/password.js` and change this line:
```javascript
const CORRECT_PASSWORD = 'Yalla**2025';
```

### Changing Maximum Attempts
Edit `assets/js/password.js` and change this line:
```javascript
const MAX_ATTEMPTS = 5;
```

### Styling
The modal uses inline CSS that can be customized in the `createPasswordModal()` function in `password.js`.

## Adding Protection to More Pages

### Method 1: Manual Addition
Add this line before the closing `</body>` tag in any HTML file:
```html
<script src="assets/js/password.js"></script>
```

### Method 2: Batch Script (Windows)
Run the `add-password-protection.bat` file to automatically add protection to all HTML files.

### Method 3: PowerShell Script
```powershell
Get-ChildItem -Filter "*.html" | ForEach-Object {
    $content = Get-Content $_.FullName
    if ($content -notcontains '    <script src="assets/js/password.js"></script>') {
        $content = $content -replace '</body>', '    <script src="assets/js/password.js"></script>`n</body>'
        Set-Content -Path $_.FullName -Value $content
        Write-Host "Added password protection to $($_.Name)"
    }
}
```

## Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Password Not Working
1. Check that the password is exactly `Yalla**2025` (case-sensitive)
2. Clear browser cache and try again
3. Check browser console for JavaScript errors

### Modal Not Appearing
1. Ensure `password.js` is in the correct path: `assets/js/password.js`
2. Check that the script is included before the closing `</body>` tag
3. Verify the file exists and is accessible

### Styling Issues
1. Check that the modal styles are not being overridden by other CSS
2. Ensure the z-index is high enough (currently set to 9999)
3. Verify responsive design is working on mobile devices

## Removing Password Protection

To remove password protection from a specific page, simply remove or comment out this line:
```html
<script src="assets/js/password.js"></script>
```

To remove from all pages, run this PowerShell command:
```powershell
Get-ChildItem -Filter "*.html" | ForEach-Object {
    $content = Get-Content $_.FullName
    $content = $content -replace '    <script src="assets/js/password.js"></script>`n', ''
    Set-Content -Path $_.FullName -Value $content
    Write-Host "Removed password protection from $($_.Name)"
}
```

## Support

For technical support or customization requests, contact the development team.

---

**Note**: This is a frontend-only password protection system designed for demo purposes. For production use with sensitive data, implement proper server-side authentication.
