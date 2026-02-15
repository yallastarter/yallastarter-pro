// Password Protection System for YallaStarter - VISIBLE INPUT VERSION
// Password: Yalla**2025

(function() {
    'use strict';
    
    // Configuration
    const CORRECT_PASSWORD = 'Yalla**2025';
    const MAX_ATTEMPTS = 5;
    const STORAGE_KEY = 'yallastarter_authenticated';
    const ATTEMPTS_KEY = 'yallastarter_attempts';
    
    console.log('Password protection script loaded');
    
    // Check if already authenticated
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
        console.log('User already authenticated');
        return;
    }
    
    // Immediately blur the body
    document.body.style.filter = 'blur(5px)';
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    
    // Create password modal with inline styles
    function createPasswordModal() {
        console.log('Creating password modal');
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'password-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.fontFamily = 'Arial, sans-serif';
        
        // Create modal box
        const modal = document.createElement('div');
        modal.id = 'password-modal';
        modal.style.backgroundColor = 'white';
        modal.style.padding = '30px';
        modal.style.borderRadius = '12px';
        modal.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.5)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '400px';
        modal.style.width = '90%';
        modal.style.border = '3px solid #0B2149';
        modal.style.position = 'relative';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = '🔐 Access Required';
        title.style.color = '#0B2149';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '24px';
        title.style.fontWeight = 'bold';
        
        // Create subtitle
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Please enter the password to access YallaStarter';
        subtitle.style.color = '#666';
        subtitle.style.margin = '0 0 20px 0';
        subtitle.style.fontSize = '16px';
        
        // Create form
        const form = document.createElement('form');
        form.id = 'password-form';
        form.style.marginBottom = '20px';
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.style.marginBottom = '20px';
        inputContainer.style.width = '100%';
        
        // Create password input
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.id = 'password-input';
        passwordInput.placeholder = 'Enter password';
        passwordInput.autocomplete = 'off';
        passwordInput.required = true;
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '15px';
        passwordInput.style.border = '2px solid #e1e5e9';
        passwordInput.style.borderRadius = '8px';
        passwordInput.style.fontSize = '18px';
        passwordInput.style.boxSizing = 'border-box';
        passwordInput.style.backgroundColor = 'white';
        passwordInput.style.color = '#333';
        passwordInput.style.display = 'block';
        passwordInput.style.margin = '0 auto';
        passwordInput.style.outline = 'none';
        
        // Add focus styles
        passwordInput.addEventListener('focus', function() {
            this.style.borderColor = '#0B2149';
        });
        
        passwordInput.addEventListener('blur', function() {
            this.style.borderColor = '#e1e5e9';
        });
        
        inputContainer.appendChild(passwordInput);
        form.appendChild(inputContainer);
        
        // Create submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.id = 'submit-btn';
        submitBtn.textContent = 'Access Site';
        submitBtn.style.width = '100%';
        submitBtn.style.padding = '15px';
        submitBtn.style.backgroundColor = '#0B2149';
        submitBtn.style.color = 'white';
        submitBtn.style.border = 'none';
        submitBtn.style.borderRadius = '8px';
        submitBtn.style.fontSize = '18px';
        submitBtn.style.fontWeight = 'bold';
        submitBtn.style.cursor = 'pointer';
        submitBtn.style.display = 'block';
        submitBtn.style.margin = '0 auto';
        submitBtn.style.outline = 'none';
        
        // Add hover effect
        submitBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#C7A14A';
        });
        
        submitBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#0B2149';
        });
        
        form.appendChild(submitBtn);
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.marginTop = '10px';
        errorDiv.style.minHeight = '20px';
        errorDiv.style.display = 'none';
        errorDiv.style.textAlign = 'center';
        
        // Create attempts info
        const attemptsDiv = document.createElement('div');
        attemptsDiv.id = 'attempts-info';
        attemptsDiv.style.color = '#666';
        attemptsDiv.style.fontSize = '14px';
        attemptsDiv.style.marginTop = '15px';
        attemptsDiv.style.textAlign = 'center';
        
        // Assemble modal
        modal.appendChild(title);
        modal.appendChild(subtitle);
        modal.appendChild(form);
        modal.appendChild(errorDiv);
        modal.appendChild(attemptsDiv);
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
                submitBtn.style.backgroundColor = '#27ae60';
                
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
                    submitBtn.style.backgroundColor = '#e74c3c';
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
