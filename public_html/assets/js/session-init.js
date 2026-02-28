/**
 * session-init.js
 * Reads localStorage for auth state and dynamically switches the header
 * auth-buttons between guest state (Login/Sign Up) and logged-in state (user dropdown).
 * Include this on ALL public pages (index, about, projects, contact, etc.)
 * AFTER the auth-buttons div exists in the DOM.
 */
(function () {
    var token = localStorage.getItem('token');
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) { }

    var authContainers = document.querySelectorAll('.auth-buttons');
    if (!authContainers.length) return;

    var isArabic = window.location.pathname.includes('-ar.');

    if (token && user) {
        // ---- LOGGED-IN STATE: Replace auth-buttons with user dropdown ----
        var displayName = user.username || user.name || user.email || 'User';
        var avatarHtml = user.photoUrl
            ? '<div id="sessionAvatar" style="width:35px;height:35px;border-radius:50%;background-image:url(' + user.photoUrl + ');background-size:cover;background-position:center;"></div>'
            : '<div id="sessionAvatar" style="width:35px;height:35px;border-radius:50%;background:linear-gradient(135deg,#006c35 0%,#00a651 100%);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="font-size:1rem;color:white;"></i></div>';

        // Translations based on site language
        var dashboardUrl = isArabic ? 'dashboard-ar.html' : 'dashboard.html';
        var profileUrl = isArabic ? 'user-profile-ar.html' : 'user-profile.html'; // Assuming such page exists, or fallback
        var notificationsUrl = isArabic ? 'notifications-ar.html' : 'notifications.html';
        var settingsUrl = isArabic ? 'settings-ar.html' : 'settings.html';

        var txtDashboard = isArabic ? 'لوحة التحكم' : 'Dashboard';
        var txtProfile = isArabic ? 'الملف الشخصي' : 'Profile';
        var txtNotifications = isArabic ? 'الإشعارات' : 'Notifications';
        var txtSettings = isArabic ? 'الإعدادات' : 'Settings';
        var txtLogout = isArabic ? 'تسجيل الخروج' : 'Logout';

        var dropdownHtml = '<div class="user-dropdown">'
            + '<button class="user-dropdown-btn" id="sessionDropdownBtn">'
            + (user.photoUrl
                ? '<div id="headerAvatar" class="user-avatar-small" style="width:35px;height:35px;border-radius:50%;background-image:url(' + user.photoUrl + ');background-size:cover;background-position:center;"></div>'
                : '<div id="headerAvatar" class="user-avatar-small" style="width:35px;height:35px;border-radius:50%;background:linear-gradient(135deg,#006c35 0%,#00a651 100%);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="font-size:1rem;color:white;"></i></div>'
            )
            + '<span id="headerUserName">' + displayName + '</span>'
            + '<i class="fas fa-chevron-down"></i>'
            + '</button>'
            + '<div class="user-dropdown-menu" id="sessionDropdownMenu">'
            + '<a href="' + dashboardUrl + '" class="dropdown-item"><i class="fas fa-tachometer-alt"></i> ' + txtDashboard + '</a>'
            + '<a href="' + profileUrl + '" class="dropdown-item"><i class="fas fa-user"></i> ' + txtProfile + '</a>'
            + '<a href="' + notificationsUrl + '" class="dropdown-item"><i class="fas fa-bell"></i> ' + txtNotifications + '</a>'
            + '<a href="' + settingsUrl + '" class="dropdown-item"><i class="fas fa-cog"></i> ' + txtSettings + '</a>'
            + '<div class="dropdown-divider"></div>'
            + '<a href="javascript:void(0)" class="dropdown-item" id="sessionLogoutBtn"><i class="fas fa-sign-out-alt"></i> ' + txtLogout + '</a>'
            + '</div></div>';

        authContainers.forEach(function (container) {
            // Check if we are on a dashboard page which already has its own logic
            if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('projects-ar')) {
                // On dashboard pages, we only want to update if it's currently guest state (has Login link)
                if (container.querySelector('a[href*="login"]') || !container.innerHTML.trim()) {
                    container.innerHTML = dropdownHtml;
                }
            } else {
                container.innerHTML = dropdownHtml;
            }
        });

        // Wire up dropdown toggles
        document.addEventListener('DOMContentLoaded', function () {
            var btns = document.querySelectorAll('#sessionDropdownBtn');
            var menus = document.querySelectorAll('#sessionDropdownMenu');

            btns.forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    menus.forEach(function (m) { m.classList.toggle('show'); });
                });
            });

            window.addEventListener('click', function (e) {
                if (!e.target.closest('#sessionDropdownBtn')) {
                    menus.forEach(function (m) { m.classList.remove('show'); });
                }
            });

            var logoutBtns = document.querySelectorAll('#sessionLogoutBtn');
            logoutBtns.forEach(function (lb) {
                lb.addEventListener('click', function () {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                });
            });
        });

    } else {
        // ---- GUEST STATE: Ensure standard guest buttons are shown ----
        authContainers.forEach(function (container) {
            // Only overwrite if not already showing guest buttons
            if (!container.querySelector('.btn-primary')) {
                var createUrl = isArabic ? 'create-project-ar.html' : 'create-project.html';
                var loginUrl = isArabic ? 'login-ar.html' : 'login.html';
                var signUrl = isArabic ? 'signup-ar.html' : 'signup.html';

                var txtCreate = isArabic ? 'ابدأ مشروعك' : 'Start a Project';
                var txtLogin = isArabic ? 'تسجيل الدخول' : 'Log In';

                container.innerHTML = '<a href="' + createUrl + '" class="btn btn-primary">' + txtCreate + '</a>'
                    + '<a href="' + loginUrl + '" class="btn btn-link">' + txtLogin + '</a>';
            }
        });
    }
})();
