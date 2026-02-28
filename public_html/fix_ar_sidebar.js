const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('-ar.html'));

const replacements = [
    { old: 'href="dashboard.html"', new: 'href="dashboard-ar.html"' },
    { old: 'href="my-projects.html"', new: 'href="my-projects-ar.html"' },
    { old: 'href="backed-projects.html"', new: 'href="backed-projects-ar.html"' },
    { old: 'href="payments.html"', new: 'href="payments-ar.html"' },
    { old: 'href="coins.html"', new: 'href="coins-ar.html"' },
    { old: 'href="notifications.html"', new: 'href="notifications-ar.html"' },
    { old: 'href="user-profile.html"', new: 'href="user-profile-ar.html"' },
    { old: 'href="settings.html"', new: 'href="settings-ar.html"' },
    { old: 'href="support.html"', new: 'href="support-ar.html"' },
    { old: 'href="coming-soon.html"', new: 'href="#"' }, // For any that were manually set to coming-soon that shouldn't be.
];

// Some pages might have coming-soon.html instead of the actual link because dashboard-ar.html had it.
// Let's replace the whole sidebar link hrefs based on the icon/text.

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Standard EN links that might be lingering
    replacements.forEach(r => {
        content = content.split(r.old).join(r.new);
    });

    // Fix the sidebar specifically where coming-soon.html or other incorrect links are present
    // <a href="..." class="sidebar-menu-link"><i class="fas fa-tachometer-alt sidebar-menu-icon"></i> لوحة التحكم</a> -> dashboard-ar.html
    const sidebarFixes = [
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-tachometer-alt[^>]*><\/i>\s*لوحة التحكم\s*<\/a>/g,
            replace: '<a href="dashboard-ar.html" class="sidebar-menu-link"><i class="fas fa-tachometer-alt sidebar-menu-icon"></i> لوحة التحكم</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-rocket[^>]*><\/i>\s*مشاريعي\s*<\/a>/g,
            replace: '<a href="my-projects-ar.html" class="sidebar-menu-link"><i class="fas fa-rocket sidebar-menu-icon"></i> مشاريعي</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-hand-holding-heart[^>]*><\/i>\s*المشاريع المدعومة\s*<\/a>/g,
            replace: '<a href="backed-projects-ar.html" class="sidebar-menu-link"><i class="fas fa-hand-holding-heart sidebar-menu-icon"></i> المشاريع المدعومة</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-money-bill-wave[^>]*><\/i>\s*المدفوعات\s*<\/a>/g,
            replace: '<a href="payments-ar.html" class="sidebar-menu-link"><i class="fas fa-money-bill-wave sidebar-menu-icon"></i> المدفوعات</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-coins[^>]*><\/i>\s*محفظتي\s*<\/a>/g,
            replace: '<a href="coins-ar.html" class="sidebar-menu-link"><i class="fas fa-coins sidebar-menu-icon"></i> محفظتي</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-bell[^>]*><\/i>\s*الإشعارات\s*<\/a>/g,
            replace: '<a href="notifications-ar.html" class="sidebar-menu-link"><i class="fas fa-bell sidebar-menu-icon"></i> الإشعارات</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-user sidebar-menu-icon[^>]*><\/i>\s*الملف الشخصي\s*<\/a>/g,
            replace: '<a href="user-profile-ar.html" class="sidebar-menu-link"><i class="fas fa-user sidebar-menu-icon"></i> الملف الشخصي</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-cog[^>]*><\/i>\s*الإعدادات\s*<\/a>/g,
            replace: '<a href="settings-ar.html" class="sidebar-menu-link"><i class="fas fa-cog sidebar-menu-icon"></i> الإعدادات</a>'
        },
        {
            regex: /<a href="[^"]*"\s+class="sidebar-menu-link[^"]*">\s*<i class="fas fa-question-circle[^>]*><\/i>\s*المساعدة والدعم\s*<\/a>/g,
            replace: '<a href="support-ar.html" class="sidebar-menu-link"><i class="fas fa-question-circle sidebar-menu-icon"></i> المساعدة والدعم</a>'
        }
    ];

    sidebarFixes.forEach(fix => {
        content = content.replace(fix.regex, fix.replace);
    });

    // Also fix the active links! They lost their "active" class because of the replacement above which strips it.
    // We can restore "active" by checking the file name.
    const urlMap = {
        'dashboard-ar.html': 'dashboard-ar.html',
        'my-projects-ar.html': 'my-projects-ar.html',
        'backed-projects-ar.html': 'backed-projects-ar.html',
        'payments-ar.html': 'payments-ar.html',
        'coins-ar.html': 'coins-ar.html',
        'notifications-ar.html': 'notifications-ar.html',
        'user-profile-ar.html': 'user-profile-ar.html',
        'settings-ar.html': 'settings-ar.html',
        'support-ar.html': 'support-ar.html'
    };

    const activeLink = urlMap[file];
    if (activeLink) {
        // Find the newly replaced string and add 'active'
        const regexActive = new RegExp(`href="${activeLink}" class="sidebar-menu-link"`, 'g');
        content = content.replace(regexActive, `href="${activeLink}" class="sidebar-menu-link active"`);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated links in ${file}`);
    }
});
