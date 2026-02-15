// Password Protection System for YallaStarter
// Password: Yalla**2025

(function() {
    'use strict';
    
    // Configuration
    const CORRECT_PASSWORD = 'Yalla**2025';
    const MAX_ATTEMPTS = 5;
    const STORAGE_KEY = 'yallastarter_authenticated';
    
    // Check if already authenticated
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
        return; // User is already authenticated
    }
    
    // Create password modal
    function createPasswordModal() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'password-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        // Create modal box
        const modal = document.createElement('div');
        modal.id = 'password-modal';
        modal.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 400px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        `;
        
        // Create content
        modal.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h2 style="color: #0B2149; margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600;">
                    🔐 Access Required
                </h2>
                <p style="color: #666; margin: 0; font-size: 0.9rem;">
                    Please enter the password to access YallaStarter
                </p>
            </div>
            
            <form id="password-form" style="margin-bottom: 1rem;">
                <div style="margin-bottom: 1rem;">
                    <input 
                        type="password" 
                        id="password-input" 
                        placeholder="Enter password"
                        style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e1e5e9;
                            border-radius: 8px;
                            font-size: 1rem;
                            box-sizing: border-box;
                            transition: border-color 0.3s ease;
                        "
                        autocomplete="off"
                    >
                </div>
                
                <button 
                    type="submit" 
                    id="submit-btn"
                    style="
                        width: 100%;
                        padding: 0.75rem;
                        background: #0B2149;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    "
                >
                    Access Site
                </button>
            </form>
            
            <div id="error-message" style="
                color: #e74c3c;
                font-size: 0.9rem;
                margin-top: 0.5rem;
                min-height: 1.2rem;
                display: none;
            "></div>
            
            <div id="attempts-info" style="
                color: #666;
                font-size: 0.8rem;
                margin-top: 1rem;
            "></div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return { overlay, modal };
    }
    
    // Blur body content
    function blurBody() {
        document.body.style.cssText += `
            filter: blur(5px);
            pointer-events: none;
            user-select: none;
        `;
    }
    
    // Remove blur and show content
    function showContent() {
        document.body.style.filter = '';
        document.body.style.pointer-events = '';
        document.body.style.userSelect = '';
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
                attemptsDiv.textContent = `${remaining} attempt${remaining > 1 ? 's' : ''} remaining`;
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
        
        const passwordInput = document.getElementById('password-input');
        const submitBtn = document.getElementById('submit-btn');
        const password = passwordInput.value.trim();
        
        if (!password) {
            showError('Please enter a password');
            return;
        }
        
        // Disable form during processing
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking...';
        
        // Simulate processing delay
        setTimeout(() => {
            if (password === CORRECT_PASSWORD) {
                // Correct password
                hideError();
                submitBtn.textContent = 'Access Granted!';
                submitBtn.style.background = '#27ae60';
                
                // Store authentication
                sessionStorage.setItem(STORAGE_KEY, 'true');
                
                // Remove modal and show content
                setTimeout(() => {
                    const overlay = document.getElementById('password-overlay');
                    if (overlay) {
                        overlay.remove();
                    }
                    showContent();
                }, 1000);
                
            } else {
                // Wrong password
                const currentAttempts = parseInt(sessionStorage.getItem('password_attempts') || '0') + 1;
                sessionStorage.setItem('password_attempts', currentAttempts.toString());
                
                if (currentAttempts >= MAX_ATTEMPTS) {
                    showError('Access Denied. Too many failed attempts.');
                    submitBtn.textContent = 'Access Denied';
                    submitBtn.style.background = '#e74c3c';
                    submitBtn.disabled = true;
                    passwordInput.disabled = true;
                } else {
                    showError(`Incorrect password. ${MAX_ATTEMPTS - currentAttempts} attempt${MAX_ATTEMPTS - currentAttempts > 1 ? 's' : ''} remaining.`);
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
        // Blur body content
        blurBody();
        
        // Create and show modal
        const { overlay, modal } = createPasswordModal();
        
        // Focus on password input
        setTimeout(() => {
            const passwordInput = document.getElementById('password-input');
            if (passwordInput) {
                passwordInput.focus();
            }
        }, 100);
        
        // Handle form submission
        const form = document.getElementById('password-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
        
        // Handle Enter key on input
        const passwordInput = document.getElementById('password-input');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSubmit(e);
                }
            });
        }
        
        // Update attempts info
        const currentAttempts = parseInt(sessionStorage.getItem('password_attempts') || '0');
        updateAttemptsInfo(currentAttempts, MAX_ATTEMPTS);
    }
    
    // Start password protection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPasswordProtection);
    } else {
        initPasswordProtection();
    }
    
    // Reset attempts on page refresh (optional)
    // sessionStorage.removeItem('password_attempts');
    
})();
