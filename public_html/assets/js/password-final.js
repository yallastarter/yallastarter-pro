// Password Protection System for YallaStarter - FINAL VERSION
// Password: Yalla**2025

(function() {
    'use strict';
    
    // Configuration
    const CORRECT_PASSWORD = 'Yalla**2025';
    const MAX_ATTEMPTS = 5;
    const STORAGE_KEY = 'yallastarter_authenticated';
    const ATTEMPTS_KEY = 'yallastarter_attempts';
    
    // Debug logging
    console.log('Password protection script loaded');
    
    // Check if already authenticated
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
        console.log('User already authenticated');
        return; // User is already authenticated
    }
    
    // Immediately blur the body to prevent content visibility
    document.body.style.cssText += `
        filter: blur(5px) !important;
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
    `;
    
    // Create password modal
    function createPasswordModal() {
        console.log('Creating password modal');
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'password-overlay';
        overlay.setAttribute('style', 
            'position: fixed !important;' +
            'top: 0 !important;' +
            'left: 0 !important;' +
            'width: 100% !important;' +
            'height: 100% !important;' +
            'background: rgba(0, 0, 0, 0.8) !important;' +
            'z-index: 99999 !important;' +
            'display: flex !important;' +
            'justify-content: center !important;' +
            'align-items: center !important;' +
            'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;'
        );
        
        // Create modal box
        const modal = document.createElement('div');
        modal.id = 'password-modal';
        modal.setAttribute('style',
            'background: white !important;' +
            'padding: 2rem !important;' +
            'border-radius: 12px !important;' +
            'box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;' +
            'text-align: center !important;' +
            'max-width: 400px !important;' +
            'width: 90% !important;' +
            'max-height: 90vh !important;' +
            'overflow-y: auto !important;' +
            'position: relative !important;' +
            'border: 2px solid #0B2149 !important;'
        );
        
        // Create content with explicit styling
        modal.innerHTML = 
            '<div style="margin-bottom: 1.5rem;">' +
                '<h2 style="color: #0B2149; margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600; text-align: center;">' +
                    '🔐 Access Required' +
                '</h2>' +
                '<p style="color: #666; margin: 0; font-size: 0.9rem; text-align: center;">' +
                    'Please enter the password to access YallaStarter' +
                '</p>' +
            '</div>' +
            '<form id="password-form" style="margin-bottom: 1rem;">' +
                '<div style="margin-bottom: 1rem; width: 100%;">' +
                    '<input ' +
                        'type="password" ' +
                        'id="password-input" ' +
                        'placeholder="Enter password" ' +
                        'style="' +
                            'width: 100% !important;' +
                            'padding: 12px !important;' +
                            'border: 2px solid #e1e5e9 !important;' +
                            'border-radius: 8px !important;' +
                            'font-size: 16px !important;' +
                            'box-sizing: border-box !important;' +
                            'transition: border-color 0.3s ease !important;' +
                            'background: white !important;' +
                            'color: #333 !important;' +
                            'display: block !important;' +
                            'margin: 0 auto !important;' +
                        '" ' +
                        'autocomplete="off" ' +
                        'required' +
                    '>' +
                '</div>' +
                '<button ' +
                    'type="submit" ' +
                    'id="submit-btn" ' +
                    'style="' +
                        'width: 100% !important;' +
                        'padding: 12px !important;' +
                        'background: #0B2149 !important;' +
                        'color: white !important;' +
                        'border: none !important;' +
                        'border-radius: 8px !important;' +
                        'font-size: 16px !important;' +
                        'font-weight: 600 !important;' +
                        'cursor: pointer !important;' +
                        'transition: all 0.3s ease !important;' +
                        'display: block !important;' +
                        'margin: 0 auto !important;' +
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
                'text-align: center;' +
            '"></div>' +
            '<div id="attempts-info" style="' +
                'color: #666;' +
                'font-size: 0.8rem;' +
                'margin-top: 1rem;' +
                'text-align: center;' +
            '"></div>';
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        console.log('Password modal created and added to DOM');
        return { overlay: overlay, modal: modal };
    }
    
    // Remove blur and show content
    function showContent() {
        console.log('Showing content - removing blur');
        document.body.style.filter = '';
        document.body.style.pointerEvents = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.mozUserSelect = '';
        document.body.style.msUserSelect = '';
    }
    
    // Show error message
    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    // Hide error message
    function hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    // Update attempts info
    function updateAttemptsInfo(attempts, maxAttempts) {
        const attemptsDiv = document.getElementById('attempts-info');
        if (attemptsDiv) {
            const remaining = maxAttempts - attempts;
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
        console.log('Form submitted');
        
        const passwordInput = document.getElementById('password-input');
        const submitBtn = document.getElementById('submit-btn');
        const password = passwordInput.value.trim();
        
        console.log('Password entered:', password);
        
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
                console.log('Correct password entered');
                // Correct password
                hideError();
                submitBtn.textContent = 'Access Granted!';
                submitBtn.style.background = '#27ae60';
                
                // Store authentication
                sessionStorage.setItem(STORAGE_KEY, 'true');
                
                // Remove modal and show content
                setTimeout(function() {
                    const overlay = document.getElementById('password-overlay');
                    if (overlay && overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    showContent();
                }, 1000);
                
            } else {
                console.log('Incorrect password entered');
                // Wrong password
                const currentAttempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
                sessionStorage.setItem(ATTEMPTS_KEY, currentAttempts.toString());
                
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
    
    // Initialize password protection
    function initPasswordProtection() {
        console.log('Initializing password protection');
        
        // Create and show modal
        const modalData = createPasswordModal();
        
        // Focus on password input after a short delay
        setTimeout(function() {
            const passwordInput = document.getElementById('password-input');
            if (passwordInput) {
                passwordInput.focus();
                console.log('Password input focused');
            } else {
                console.error('Password input not found!');
            }
        }, 500);
        
        // Handle form submission
        const form = document.getElementById('password-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
            console.log('Form event listener added');
        } else {
            console.error('Form not found!');
        }
        
        // Handle Enter key on input
        const passwordInput = document.getElementById('password-input');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    handleSubmit(e);
                }
            });
            console.log('Input event listener added');
        } else {
            console.error('Password input not found for keypress!');
        }
        
        // Update attempts info
        const currentAttempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0');
        updateAttemptsInfo(currentAttempts, MAX_ATTEMPTS);
    }
    
    // Start password protection immediately
    console.log('Starting password protection');
    initPasswordProtection();
    
})();
