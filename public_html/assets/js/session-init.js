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
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) {}

    var authContainers = document.querySelectorAll('.auth-buttons');
    if (!authContainers.length) return;

    if (token && user) {
        // ---- LOGGED-IN STATE: Replace auth-buttons with user dropdown ----
        var displayName = user.username || user.name || user.email || 'User';
        var avatarHtml = user.photoUrl
            ? '<div id="sessionAvatar" style="width:35px;height:35px;border-radius:50%;background-image:url(' + user.photoUrl + ');background-size:cover;background-position:center;"></div>'
            : '<div id="sessionAvatar" style="width:35px;height:35px;border-radius:50%;background:linear-gradient(135deg,#006c35 0%,#00a651 100%);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="font-size:1rem;color:white;"></i></div>';

        var dropdownHtml = '<div class="user-dropdown">'
            + '<button class="user-dropdown-btn" id="sessionDropdownBtn">'
            + avatarHtml
            + '<span id="sessionUserName">' + displayName + '</span>'
            + '<i class="fas fa-chevron-down"></i>'
            + '</button>'
            + '<div class="user-dropdown-menu" id="sessionDropdownMenu">'
            + '<a href="dashboard.html" class="dropdown-item"><i class="fas fa-tachometer-alt"></i> Dashboard</a>'
            + '<a href="user-profile.html" class="dropdown-item"><i class="fas fa-user"></i> Profile</a>'
            + '<a href="notifications.html" class="dropdown-item"><i class="fas fa-bell"></i> Notifications</a>'
            + '<a href="settings.html" class="dropdown-item"><i class="fas fa-cog"></i> Settings</a>'
            + '<div class="dropdown-divider"></div>'
            + '<a href="javascript:void(0)" class="dropdown-item" id="sessionLogoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>'
            + '</div></div>';

        authContainers.forEach(function (container) {
            container.innerHTML = dropdownHtml;
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
                container.innerHTML = '<a href="create-project.html" class="btn btn-primary">Start a Project</a>'
                    + '<a href="login.html" class="btn btn-link">Log In</a>';
            }
        });
    }
})();
