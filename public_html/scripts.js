// ==========================================
// YallaStarter - Main JavaScript
// ==========================================

// Toast Notification Helper
function showToast(message, type = 'error') {
    const existing = document.querySelector('.ys-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `ys-toast ys-toast--${type}`;
    toast.innerHTML = `
        <span class="ys-toast__icon">${type === 'success' ? '\u2713' : '\u26a0'}</span>
        <span class="ys-toast__msg">${message}</span>
    `;

    if (!document.getElementById('ys-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'ys-toast-styles';
        style.textContent = `
            .ys-toast { position: fixed; top: 24px; right: 24px; z-index: 10000;
                padding: 14px 22px; border-radius: 10px; display: flex; align-items: center; gap: 10px;
                font-family: 'Poppins', sans-serif; font-size: 0.95rem; font-weight: 500;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15); animation: ysToastIn 0.3s ease; max-width: 420px; }
            .ys-toast--error { background: #fff0f0; color: #c0392b; border-left: 4px solid #e74c3c; }
            .ys-toast--success { background: #f0fff4; color: #006c35; border-left: 4px solid #006c35; }
            .ys-toast__icon { font-size: 1.2rem; flex-shrink: 0; }
            .ys-toast--fade-out { animation: ysToastOut 0.3s ease forwards; }
            @keyframes ysToastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ysToastOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-12px); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('ys-toast--fade-out'); setTimeout(() => toast.remove(), 300); }, 4000);
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.style.display = mobileMenu.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Accordion Functionality
    const accordionItems = document.querySelectorAll('.accordion-item');

    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');

        if (header && content) {
            header.addEventListener('click', () => {
                item.classList.toggle('active');

                if (item.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                } else {
                    content.style.maxHeight = 0;
                }
            });
        }
    });

    // Category Tabs
    const categoryTabs = document.querySelectorAll('.category-tab');

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // In a real implementation, this would filter projects by category
        });
    });

    // Project Tabs
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabItems.length > 0 && tabContents.length > 0) {
        tabItems.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                tabItems.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                if (tabContents[index]) {
                    tabContents[index].classList.add('active');
                }
            });
        });
    }

    // NOTE: Login and signup form handling is done by auth-handler.js and
    // inline scripts in login.html / signup.html. Do NOT add duplicate handlers here.


    // Character Counter for Textareas
    const textareas = document.querySelectorAll('textarea[maxlength]');

    textareas.forEach(textarea => {
        const maxLength = textarea.getAttribute('maxlength');
        const counterId = textarea.getAttribute('data-counter');
        const counter = document.getElementById(counterId);

        if (counter) {
            textarea.addEventListener('input', () => {
                const count = textarea.value.length;
                counter.textContent = count;
            });
        }
    });

    // File Upload Preview
    const fileUploads = document.querySelectorAll('.file-upload');

    fileUploads.forEach(upload => {
        const input = upload.querySelector('input[type="file"]');

        if (input) {
            upload.addEventListener('click', () => {
                input.click();
            });

            input.addEventListener('change', () => {
                if (input.files.length > 0) {
                    const fileName = input.files[0].name;
                    const textElement = upload.querySelector('.file-upload-text');

                    if (textElement) {
                        textElement.textContent = `Selected file: ${fileName}`;
                    }
                }
            });
        }
    });

    // Language Switcher
    const languageSwitcher = document.querySelector('.language-switcher');

    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', (e) => {
            const language = e.target.value;

            if (language === 'ar') {
                document.body.classList.add('rtl');
            } else {
                document.body.classList.remove('rtl');
            }
        });
    }
    // Dashboard Logic
    if (window.location.pathname.includes('dashboard')) {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token) {
            const isAr = window.location.pathname.includes('-ar');
            window.location.href = isAr ? 'login-ar.html' : 'login.html';
        }

        // Update User Info
        if (user) {
            document.querySelectorAll('.user-name').forEach(el => el.textContent = user.username);
            document.querySelectorAll('.user-email').forEach(el => el.textContent = user.email);
        }

        // Logout
        // Target both English and Arabic logout links
        const logoutLinks = document.querySelectorAll('a[href*="index"]');
        logoutLinks.forEach(link => {
            const text = link.textContent.trim();
            // Check for "Logout" or Arabic equivalent or specific class
            if (text.includes('Logout') || text.includes('تسجيل الخروج') || link.classList.contains('logout-link')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    const isAr = window.location.pathname.includes('-ar');
                    window.location.href = isAr ? 'index-ar.html' : 'index.html';
                });
            }
        });
    }

    // Removed legacy Create Project Logic block that was conflicting with form-specific handlers
    // Browse Projects Logic
    const projectsGrid = document.querySelector('.projects-grid');
    if (projectsGrid && window.location.pathname.includes('projects.html')) {
        async function loadProjects() {
            try {
                // Show loading state (optional, or just keep static as skeleton)
                // projectsGrid.innerHTML = '<p>Loading projects...</p>';

                const res = await fetch('/api/projects');
                const data = await res.json();

                if (data.success && data.data.length > 0) {
                    projectsGrid.innerHTML = ''; // Clear static content

                    data.data.forEach(project => {
                        // Calculate percentage
                        const percent = Math.min(100, Math.round((project.currentAmount / project.goalAmount) * 100));

                        const projectCard = `
                        <a href="project-details.html?id=${project._id}" class="project-card">
                            <div class="project-image">
                                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="${project.title}" loading="lazy">
                            </div>
                            <div class="project-content">
                                <div class="project-category">${project.category || 'General'}</div>
                                <h3 class="project-title">${project.title}</h3>
                                <p class="project-description">${project.description.substring(0, 100)}...</p>
                                <div class="project-meta">
                                    <div>${project.currentAmount} SAR raised</div>
                                    <div>${percent}% funded</div>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${percent}%;"></div>
                                </div>
                            </div>
                        </a>
                        `;
                        projectsGrid.innerHTML += projectCard;
                    });
                } else {
                    projectsGrid.innerHTML = '<p>No active projects found. Be the first to start one!</p>';
                }
            } catch (err) {
                console.error('Failed to load projects:', err);
            }
        }


        loadProjects();

        // Dynamic Project Loading for Arabic Page
        async function loadProjectsAr() {
            const projectsGrid = document.querySelector('.projects-grid');
            // Only run on the projects-ar main listing page
            if (!projectsGrid || !window.location.pathname.includes('projects-ar.html')) return;

            try {
                const res = await fetch('/api/projects');
                const data = await res.json();

                if (data.success && data.data.length > 0) {
                    projectsGrid.innerHTML = ''; // Clear static content
                    data.data.forEach(project => {
                        const percent = Math.min(100, Math.round((project.currentAmount / project.goalAmount) * 100));

                        // Note: Content like title/description will likely be in English if DB is English only
                        // We display it as is, but UI elements are in Arabic
                        const projectCard = `
                <a href="project-details-ar.html?id=${project._id}" class="project-card">
                    <div class="project-image">
                        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="${project.title}" loading="lazy">
                    </div>
                    <div class="project-content">
                        <div class="project-category">${project.category || 'عام'}</div>
                        <h3 class="project-title">${project.title}</h3>
                        <p class="project-description">${project.description.substring(0, 100)}...</p>
                        <div class="project-meta">
                            <div>${project.currentAmount} ر.س</div>
                            <div>${percent}%</div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                </a>
                `;
                        projectsGrid.insertAdjacentHTML('beforeend', projectCard);
                    });
                } else {
                    projectsGrid.innerHTML = '<p style="text-align:center; width:100%;">لا توجد مشاريع حاليا.</p>';
                }
            } catch (err) {
                console.error('Error loading projects (AR):', err);
                // Fallback to static content if fetch fails
                projectsGrid.innerHTML = '<p style="text-align:center;">حدث خطأ في تحميل المشاريع.</p>';
            }
        }

        // Run Arabic loader
        loadProjectsAr();

    }
});

// ==========================================
// Google OAuth Login Handler
// ==========================================
// Google OAuth Login Handler
document.addEventListener('DOMContentLoaded', function () {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default link behavior if it's an anchor

            // Use window.auth handler if available, otherwise direct redirect
            if (window.auth) {
                window.auth.loginWithGoogle();
            } else {
                window.location.href = '/api/auth/google';
            }
        });
    }

    // Check for Google OAuth callback params handled by auth-handler.js
    if (window.auth && window.location.search.includes('token=') && window.location.search.includes('user=')) {
        if (window.auth.handleOAuthCallback()) {
            // Callback handled successfully
            console.log('Google login successful');
        }
    }

    // Development Notice Popup Logic
    const devPopup = document.getElementById('dev-popup');
    const devPopupClose = document.getElementById('dev-popup-close');
    const devPopupAck = document.getElementById('dev-popup-ack');

    if (devPopup) {
        // Show popup after a short delay if not already acknowledged in this session
        if (!sessionStorage.getItem('devPopupAck')) {
            setTimeout(() => {
                devPopup.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            }, 1000);
        }

        function closePopup() {
            devPopup.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
            sessionStorage.setItem('devPopupAck', 'true');
        }

        if (devPopupClose) {
            devPopupClose.addEventListener('click', closePopup);
        }

        if (devPopupAck) {
            devPopupAck.addEventListener('click', closePopup);
        }

        // Close on click outside content
        devPopup.addEventListener('click', (e) => {
            if (e.target === devPopup) {
                closePopup();
            }
        });
    }
});