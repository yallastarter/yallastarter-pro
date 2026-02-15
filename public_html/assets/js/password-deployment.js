// Password Protection System for YallaStarter - Deployment Version
// Password: Yalla**2025
// Optimized for web hosting (Hostinger)

(function() {
    'use strict';
    
    // Configuration
    const CORRECT_PASSWORD = 'Yalla**2025';
    const MAX_ATTEMPTS = 5;
    const STORAGE_KEY = 'yallastarter_authenticated';
    const ATTEMPTS_KEY = 'yallastarter_attempts';
    
    // Check if already authenticated
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
        return; // User is already authenticated
    }
    
    // Ensure DOM is ready before initializing
    function waitForDOM() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPasswordProtection);
        } else {
            // DOM is already ready
            setTimeout(initPasswordProtection, 100);
        }
    }
    
    // Create password modal with enhanced compatibility
    function createPasswordModal() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'password-overlay';
        overlay.setAttribute('style', 
            'position: fixed;' +
            'top: 0;' +
            'left: 0;' +
            'width: 100%;' +
            'height: 100%;' +
            'background: rgba(0, 0, 0, 0.7);' +
            'z-index: 9999;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
            'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;'
        );
        
        // Create modal box
        const modal = document.createElement('div');
        modal.id = 'password-modal';
        modal.setAttribute('style',
            'background: white;' +
            'padding: 2rem;' +
            'border-radius: 12px;' +
            'box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);' +
            'text-align: center;' +
            'max-width: 400px;' +
            'width: 90%;' +
            'max-height: 90vh;' +
            'overflow-y: auto;'
        );
        
        // Create content with better browser compatibility
        modal.innerHTML = 
            '<div style="margin-bottom: 1.5rem;">' +
                '<h2 style="color: #0B2149; margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600;">' +
                    '🔐 Access Required' +
                '</h2>' +
                '<p style="color: #666; margin: 0; font-size: 0.9rem;">' +
                    'Please enter the password to access YallaStarter' +
                '</p>' +
            '</div>' +
            '<form id="password-form" style="margin-bottom: 1rem;">' +
                '<div style="margin-bottom: 1rem;">' +
                    '<input ' +
                        'type="password" ' +
                        'id="password-input" ' +
                        'placeholder="Enter password" ' +
                        'style="' +
                            'width: 100%;' +
                            'padding: 0.75rem;' +
                            'border: 2px solid #e1e5e9;' +
                            'border-radius: 8px;' +
                            'font-size: 1rem;' +
                            'box-sizing: border-box;' +
                            'transition: border-color 0.3s ease;' +
                        '" ' +
                        'autocomplete="off" ' +
                        'required' +
                    '>' +
                '</div>' +
                '<button ' +
                    'type="submit" ' +
                    'id="submit-btn" ' +
                    'style="' +
                        'width: 100%;' +
                        'padding: 0.75rem;' +
                        'background: #0B2149;' +
                        'color: white;' +
                        'border: none;' +
                        'border-radius: 8px;' +
                        'font-size: 1rem;' +
                        'font-weight: 600;' +
                        'cursor: pointer;' +
                        'transition: all 0.3s ease;' +
                    '"' +
                '>' +
                    'Access Site' +
                '</button>' +
            '</form>' +
            '<div id="error-message" style="' +
                'color: #e74c3c;' +
                'font-size: 0.9rem;' +
                'margin-top: 0.5rem;' +
                'min-height: 1.2rem;' +
                'display: none;' +
            '"></div>' +
            '<div id="attempts-info" style="' +
                'color: #666;' +
                'font-size: 0.8rem;' +
                'margin-top: 1rem;' +
            '"></div>';
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return { overlay: overlay, modal: modal };
    }
    
    // Blur body content with fallback
    function blurBody() {
        var body = document.body;
        var currentStyle = body.getAttribute('style') || '';
        body.setAttribute('style', currentStyle + 
            'filter: blur(5px);' +
            'pointer-events: none;' +
            'user-select: none;' +
            '-webkit-user-select: none;' +
            '-moz-user-select: none;' +
            '-ms-user-select: none;'
        );
    }
    
    // Remove blur and show content
    function showContent() {
        var body = document.body;
        var currentStyle = body.getAttribute('style') || '';
        // Remove blur-related styles
        currentStyle = currentStyle.replace(/filter:\s*blur\([^;]*\);?/g, '');
        currentStyle = currentStyle.replace(/pointer-events:\s*none;?/g, '');
        currentStyle = currentStyle.replace(/user-select:\s*none;?/g, '');
        currentStyle = currentStyle.replace(/-webkit-user-select:\s*none;?/g, '');
        currentStyle = currentStyle.replace(/-moz-user-select:\s*none;?/g, '');
        currentStyle = currentStyle.replace(/-ms-user-select:\s*none;?/g, '');
        body.setAttribute('style', currentStyle);
    }
    
    // Show error message
    function showError(message) {
        var errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    // Hide error message
    function hideError() {
        var errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    // Update attempts info
    function updateAttemptsInfo(attempts, maxAttempts) {
        var attemptsDiv = document.getElementById('attempts-info');
        if (attemptsDiv) {
            var remaining = maxAttempts - attempts;
            if (remaining > 0) {
                attemptsDiv.textContent = remaining + ' attempt' + (remaining > 1 ? 's' : '') + ' remaining';
                attemptsDiv.style.color = '#666';
            } else {
                attemptsDiv.textContent = 'No attempts remaining';
                attemptsDiv.style.color = '#e74c3c';
            }
        }
    }
    
    // Handle form submission
    function handleSubmit(event) {
        event.preventDefault();
        
        var passwordInput = document.getElementById('password-input');
        var submitBtn = document.getElementById('submit-btn');
        var password = passwordInput.value.trim();
        
        if (!password) {
            showError('Please enter a password');
            return;
        }
        
        // Disable form during processing
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking...';
        
        // Simulate processing delay
        setTimeout(function() {
            if (password === CORRECT_PASSWORD) {
                // Correct password
                hideError();
                submitBtn.textContent = 'Access Granted!';
                submitBtn.style.background = '#27ae60';
                
                // Store authentication
                try {
                    sessionStorage.setItem(STORAGE_KEY, 'true');
                } catch (e) {
                    // Fallback for browsers that don't support sessionStorage
                    document.cookie = STORAGE_KEY + '=true; path=/';
                }
                
                // Remove modal and show content
                setTimeout(function() {
                    var overlay = document.getElementById('password-overlay');
                    if (overlay && overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    showContent();
                }, 1000);
                
            } else {
                // Wrong password
                var currentAttempts = 0;
                try {
                    currentAttempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
                    sessionStorage.setItem(ATTEMPTS_KEY, currentAttempts.toString());
                } catch (e) {
                    // Fallback for browsers that don't support sessionStorage
                    currentAttempts = parseInt(getCookie(ATTEMPTS_KEY) || '0') + 1;
                    document.cookie = ATTEMPTS_KEY + '=' + currentAttempts + '; path=/';
                }
                
                if (currentAttempts >= MAX_ATTEMPTS) {
                    showError('Access Denied. Too many failed attempts.');
                    submitBtn.textContent = 'Access Denied';
                    submitBtn.style.background = '#e74c3c';
                    submitBtn.disabled = true;
                    passwordInput.disabled = true;
                } else {
                    showError('Incorrect password. ' + (MAX_ATTEMPTS - currentAttempts) + ' attempt' + (MAX_ATTEMPTS - currentAttempts > 1 ? 's' : '') + ' remaining.');
                    submitBtn.textContent = 'Try Again';
                    submitBtn.disabled = false;
                    passwordInput.value = '';
                    passwordInput.focus();
                }
                
                updateAttemptsInfo(currentAttempts, MAX_ATTEMPTS);
            }
        }, 500);
    }
    
    // Cookie helper functions for fallback
    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
    }
    
    // Initialize password protection
    function initPasswordProtection() {
        // Blur body content
        blurBody();
        
        // Create and show modal
        var modalData = createPasswordModal();
        
        // Focus on password input
        setTimeout(function() {
            var passwordInput = document.getElementById('password-input');
            if (passwordInput) {
                passwordInput.focus();
            }
        }, 200);
        
        // Handle form submission
        var form = document.getElementById('password-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
        
        // Handle Enter key on input
        var passwordInput = document.getElementById('password-input');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    handleSubmit(e);
                }
            });
        }
        
        // Update attempts info
        var currentAttempts = 0;
        try {
            currentAttempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0');
        } catch (e) {
            currentAttempts = parseInt(getCookie(ATTEMPTS_KEY) || '0');
        }
        updateAttemptsInfo(currentAttempts, MAX_ATTEMPTS);
    }
    
    // Start password protection
    waitForDOM();
    
})();
