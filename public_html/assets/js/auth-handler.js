// Authentication Handler for YallaStarter
class AuthHandler {
    constructor() {
        this.apiBase = window.location.origin;
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
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
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
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
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
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
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(this.user));

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);

            return true;
        }
        return false;
    }

    // Logout user
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
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

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            } else {
                // Token might be invalid
                this.logout();
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
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
            window.location.href = '/login.html';
        }
    }

    // Redirect if authenticated (for login/signup pages)
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = '/dashboard.html';
        }
    }
}

// Create global auth instance
window.auth = new AuthHandler();
