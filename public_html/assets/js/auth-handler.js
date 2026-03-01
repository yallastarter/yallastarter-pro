// Authentication Handler for YallaStarter
class AuthHandler {
    constructor() {
        this.apiBase = window.location.origin;
        this.token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        this.user = JSON.parse(userStr || 'null');

        // Initialize Idle Timer (30 minutes)
        this.idleThreshold = 30 * 60 * 1000;
        this.initIdleTimer();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Sign up new user
    async signup(userData) {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                const storage = userData.remember ? localStorage : sessionStorage;
                storage.setItem('token', data.token);
                storage.setItem('user', JSON.stringify(data.user));
                this.updateLastActivity();
                return { success: true, message: 'Account created successfully!' };
            } else {
                return { success: false, message: data.message || 'Signup failed' };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }

    // Login user
    async login(credentials) {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                const storage = credentials.remember ? localStorage : sessionStorage;
                storage.setItem('token', data.token);
                storage.setItem('user', JSON.stringify(data.user));
                this.updateLastActivity();
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }

    // Google OAuth login
    async loginWithGoogle() {
        // Redirect to Google OAuth endpoint
        window.location.href = `${this.apiBase}/api/auth/google`;
    }

    // Handle OAuth callback
    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userStr = urlParams.get('user');

        if (token && userStr) {
            this.token = token;
            this.user = JSON.parse(decodeURIComponent(userStr));
            // Default Google login to sessionStorage (Survives reload, not tab close)
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(this.user));
            this.updateLastActivity();

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);

            return true;
        }
        return false;
    }

    // Logout user
    logout(reason = '') {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('lastAuthActivity');

        const isAr = window.location.pathname.includes('-ar.');
        let loginUrl = isAr ? '/login-ar.html' : '/login.html';
        if (reason) loginUrl += `?reason=${encodeURIComponent(reason)}`;
        window.location.href = loginUrl;
    }

    // Get user profile
    async getProfile() {
        if (!this.token) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const response = await fetch(`${this.apiBase}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            // Only log out if the server explicitly rejects the token (401/403)
            if (response.status === 401 || response.status === 403) {
                this.logout();
                return { success: false, message: 'Session expired. Please log in again.' };
            }

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            } else {
                // API returned an error but not a 401/403 — keep session alive
                return { success: false, message: data.message };
            }
        } catch (error) {
            // Network error — do NOT log out, user may just be offline
            console.warn('Profile fetch failed (network error), keeping session:', error);
            return { success: false, message: 'Network error' };
        }
    }

    // Update user profile
    async updateProfile(updates) {
        if (!this.token) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const response = await fetch(`${this.apiBase}/api/auth/update-profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    // Upload profile photo
    async uploadPhoto(file) {
        if (!this.token) {
            return { success: false, message: 'Not authenticated' };
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch(`${this.apiBase}/api/auth/upload-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.user.photoUrl = data.photoUrl;
                localStorage.setItem('user', JSON.stringify(this.user));
                return { success: true, photoUrl: data.photoUrl };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    // Protect page (redirect to login if not authenticated)
    protectPage() {
        if (!this.isAuthenticated()) {
            const isAr = window.location.pathname.includes('-ar.');
            window.location.href = isAr ? '/login-ar.html' : '/login.html';
        }
    }

    // Redirect if authenticated (for login/signup pages)
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            const isAr = window.location.pathname.includes('-ar.');
            window.location.href = isAr ? '/dashboard-ar.html' : '/dashboard.html';
        }
    }

    // --- Idle Timer Logic ---
    initIdleTimer() {
        if (!this.isAuthenticated()) return;

        // Check for existing inactivity
        const lastActivity = parseInt(localStorage.getItem('lastAuthActivity') || Date.now());
        if (Date.now() - lastActivity > this.idleThreshold) {
            return this.logout('timeout');
        }

        // Set up event listeners for activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(evt => {
            window.addEventListener(evt, () => this.updateLastActivity(), { passive: true });
        });

        // Periodic check every minute
        setInterval(() => {
            const lastActive = parseInt(localStorage.getItem('lastAuthActivity') || Date.now());
            if (Date.now() - lastActive > this.idleThreshold) {
                this.logout('timeout');
            }
        }, 60000);
    }

    updateLastActivity() {
        if (this.isAuthenticated()) {
            localStorage.setItem('lastAuthActivity', Date.now());
        }
    }
}

// Create global auth instance
window.auth = new AuthHandler();
