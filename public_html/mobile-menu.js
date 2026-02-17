// Universal Mobile Menu Solution for YallaStarter - ENHANCED VERSION
// This script ensures mobile menu works on ALL pages and ALL screen sizes

(function () {
    'use strict';

    // Wait for DOM to be ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            document.attachEvent('onreadystatechange', function () {
                if (document.readyState !== 'loading') {
                    fn();
                }
            });
        }
    }

    // Mobile Menu Class
    class MobileMenu {
        constructor() {
            this.menuBtn = null;
            this.menu = null;
            this.closeBtn = null;
            this.isOpen = false;
            this.isAnimating = false;
            this.touchStartY = 0;
            this.touchEndY = 0;
            this.init();
        }

        init() {
            this.findElements();
            if (this.elementsExist()) {
                this.bindEvents();
                this.setupResizeHandler();
                this.ensureMobileMenuVisibility();
                this.setupTouchHandlers();
                console.log('Mobile Menu initialized successfully');
            } else {
                console.error('Mobile Menu elements not found');
            }
        }

        findElements() {
            this.menuBtn = document.querySelector('.mobile-menu-btn');
            this.menu = document.querySelector('.mobile-menu');
            this.closeBtn = document.querySelector('.mobile-close-btn');

            console.log('Mobile Menu Elements Found:', {
                button: this.menuBtn,
                menu: this.menu,
                closeBtn: this.closeBtn
            });
        }

        elementsExist() {
            return this.menuBtn && this.menu && this.closeBtn;
        }

        bindEvents() {
            // Mobile menu button click
            this.menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });

            // Close button click
            this.closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeMenu();
            });

            // Click outside to close
            document.addEventListener('click', (e) => {
                if (this.isOpen && !this.menu.contains(e.target) && !this.menuBtn.contains(e.target)) {
                    this.closeMenu();
                }
            });

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeMenu();
                }
            });

            // Prevent menu from closing when clicking inside
            this.menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        setupTouchHandlers() {
            // Touch events for mobile
            if ('ontouchstart' in window) {
                this.menuBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.toggleMenu();
                }, { passive: false });

                this.closeBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.closeMenu();
                }, { passive: false });

                // Swipe to close functionality
                this.menu.addEventListener('touchstart', (e) => {
                    this.touchStartY = e.touches[0].clientY;
                }, { passive: true });

                this.menu.addEventListener('touchend', (e) => {
                    this.touchEndY = e.changedTouches[0].clientY;
                    const swipeDistance = this.touchStartY - this.touchEndY;

                    // Swipe up to close (minimum 50px)
                    if (swipeDistance > 50) {
                        this.closeMenu();
                    }
                }, { passive: true });
            }
        }

        setupResizeHandler() {
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.ensureMobileMenuVisibility();
                    if (window.innerWidth >= 1024 && this.isOpen) {
                        this.closeMenu();
                    }
                }, 250);
            });
        }

        ensureMobileMenuVisibility() {
            const isMobile = window.innerWidth <= 1023;

            if (this.menuBtn) {
                if (isMobile) {
                    this.menuBtn.style.display = 'flex';
                    this.menuBtn.style.visibility = 'visible';
                    this.menuBtn.style.opacity = '1';
                } else {
                    this.menuBtn.style.display = 'none';
                    this.menuBtn.style.visibility = 'hidden';
                    this.menuBtn.style.opacity = '0';
                }
            }
        }

        toggleMenu() {
            if (this.isAnimating) return;

            if (this.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        }

        // Update isOpen state when header class changes
        updateMenuState() {
            const header = document.querySelector('header.header');
            if (header) {
                this.isOpen = header.classList.contains('nav-open');
            }
        }

        openMenu() {
            if (this.isOpen || this.isAnimating) return;

            this.isAnimating = true;

            // Get header element
            const header = document.querySelector('header.header');
            if (header) {
                header.classList.add('nav-open');
            }

            this.menuBtn.classList.add('active');
            document.documentElement.classList.add('no-scroll');
            document.body.classList.add('no-scroll');

            // Focus management for accessibility
            this.menu.setAttribute('aria-hidden', 'false');
            this.menuBtn.setAttribute('aria-expanded', 'true');

            // Set focus to first focusable element
            const firstFocusable = this.menu.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }

            this.isOpen = true;
            console.log('Mobile menu opened');

            // Animation complete
            setTimeout(() => {
                this.isAnimating = false;
            }, 300);
        }

        closeMenu() {
            if (!this.isOpen || this.isAnimating) return;

            this.isAnimating = true;

            // Get header element
            const header = document.querySelector('header.header');
            if (header) {
                header.classList.remove('nav-open');
            }

            this.menuBtn.classList.remove('active');
            document.documentElement.classList.remove('no-scroll');
            document.body.classList.remove('no-scroll');

            // Accessibility
            this.menu.setAttribute('aria-hidden', 'true');
            this.menuBtn.setAttribute('aria-expanded', 'false');

            // Return focus to menu button
            this.menuBtn.focus();

            console.log('Mobile menu closed');

            this.isOpen = false;
            this.isAnimating = false;
        }

        // Public methods for external control
        open() {
            this.openMenu();
        }

        close() {
            this.closeMenu();
        }

        isMenuOpen() {
            return this.isOpen;
        }
    }

    // Initialize when DOM is ready
    ready(() => {
        console.log('Initializing Mobile Menu...');

        // Create mobile menu instance
        const mobileMenu = new MobileMenu();

        // Make it globally accessible for debugging and external control
        window.yallaStarterMobileMenu = mobileMenu;

        // Add ARIA attributes for accessibility
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const menu = document.querySelector('.mobile-menu');

        if (menuBtn) {
            menuBtn.setAttribute('aria-label', 'Toggle mobile menu');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.setAttribute('aria-controls', 'mobile-menu');
        }

        if (menu) {
            menu.setAttribute('id', 'mobile-menu');
            menu.setAttribute('aria-label', 'Mobile navigation menu');
            menu.setAttribute('aria-hidden', 'true');
        }

        // Initialize language switcher functionality
        initializeLanguageSwitcher();

        // Additional debugging
        setTimeout(() => {
            const screenWidth = window.innerWidth;
            const isMobile = screenWidth <= 1023;
            console.log(`Screen width: ${screenWidth}px, Is mobile: ${isMobile}`);

            if (isMobile) {
                const menuBtn = document.querySelector('.mobile-menu-btn');
                if (menuBtn) {
                    const computedStyle = window.getComputedStyle(menuBtn);
                    console.log('Mobile menu button computed styles:', {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity
                    });
                }
            }
        }, 100);

        // Performance monitoring
        if ('performance' in window) {
            const perfObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.includes('mobile-menu')) {
                        console.log('Mobile menu performance:', entry);
                    }
                }
            });

            try {
                perfObserver.observe({ entryTypes: ['measure'] });
            } catch (e) {
                console.log('Performance monitoring not supported');
            }
        }
    });

    // Language Switcher Functionality
    function initializeLanguageSwitcher() {
        const currentPath = window.location.pathname;
        const currentFilename = currentPath.split('/').pop() || 'index.html';

        // Get all language switchers on the page
        const languageSwitchers = document.querySelectorAll('.language-switcher');

        languageSwitchers.forEach(switcher => {
            const buttons = switcher.querySelectorAll('.language-btn');

            buttons.forEach(button => {
                button.addEventListener('click', function (e) {
                    e.preventDefault();

                    const targetLang = this.textContent.trim();
                    let targetUrl;

                    if (targetLang === 'English' || targetLang === 'English') {
                        // Switch to English
                        if (currentFilename.includes('-ar.html')) {
                            // Remove -ar.html suffix
                            targetUrl = currentFilename.replace('-ar.html', '.html');
                        } else if (currentFilename === 'index-ar.html') {
                            targetUrl = 'index.html';
                        } else {
                            targetUrl = 'index.html';
                        }
                    } else if (targetLang === 'العربية' || targetLang === 'العربية') {
                        // Switch to Arabic
                        if (currentFilename.endsWith('.html') && !currentFilename.includes('-ar.html')) {
                            // Add -ar.html suffix
                            targetUrl = currentFilename.replace('.html', '-ar.html');
                        } else if (currentFilename === 'index.html') {
                            targetUrl = 'index-ar.html';
                        } else {
                            targetUrl = 'index-ar.html';
                        }
                    }

                    if (targetUrl) {
                        window.location.href = targetUrl;
                    }
                });
            });
        });

        // Update active states based on current language
        updateLanguageSwitcherStates();
    }

    function updateLanguageSwitcherStates() {
        const currentPath = window.location.pathname;
        const currentFilename = currentPath.split('/').pop() || 'index.html';
        const isArabic = currentFilename.includes('-ar.html');

        const languageSwitchers = document.querySelectorAll('.language-switcher');

        languageSwitchers.forEach(switcher => {
            const buttons = switcher.querySelectorAll('.language-btn');

            buttons.forEach(button => {
                const buttonText = button.textContent.trim();
                button.classList.remove('active');

                if (isArabic && (buttonText === 'العربية' || buttonText === 'العربية')) {
                    button.classList.add('active');
                } else if (!isArabic && (buttonText === 'English' || buttonText === 'English')) {
                    button.classList.add('active');
                }
            });
        });
    }

})();
