const fs = require('fs');
const path = require('path');

const dir = __dirname;
const pages = [
    { name: 'dashboard.html', title: 'لوحة التحكم' },
    { name: 'my-projects.html', title: 'مشاريعي' },
    { name: 'backed-projects.html', title: 'المشاريع المدعومة' },
    { name: 'payments.html', title: 'المدفوعات' },
    { name: 'notifications.html', title: 'الإشعارات' },
    { name: 'coins.html', title: 'محفظتي' },
    { name: 'user-profile.html', title: 'الملف الشخصي' },
    { name: 'settings.html', title: 'الإعدادات' },
    { name: 'support.html', title: 'المساعدة والدعم' },
    { name: 'create-project.html', title: 'إنشاء مشروع' },
    { name: 'project-details.html', title: 'تفاصيل المشروع' }
];

const translations = {
    // Header & Global
    '>Home</a>': '>الرئيسية</a>',
    '>Browse Projects</a>': '>تصفح المشاريع</a>',
    '>How It Works</a>': '>كيف يعمل</a>',
    '>About</a>': '>من نحن</a>',
    '>Contact</a>': '>اتصل بنا</a>',
    '>Log In</a>': '>تسجيل الدخول</a>',
    '>Sign Up</a>': '>حساب جديد</a>',
    '>Log Out</a>': '>تسجيل الخروج</a>',
    '>Logout</a>': '>تسجيل الخروج</a>',
    '>Dashboard</a>': '>لوحة التحكم</a>',
    '>Profile</a>': '>الملف الشخصي</a>',
    '>Settings</a>': '>الإعدادات</a>',

    // Create Project Page
    'Start Your Project': 'ابدأ مشروعك',
    'Turn your innovative ideas into reality with support from our community': 'حول أفكارك المبتكرة إلى واقع بدعم من مجتمعنا',
    'Basic Information': 'معلومات أساسية',
    'Basic Info': 'معلومات أساسية',
    'Project Details': 'تفاصيل المشروع',
    'Funding & Rewards': 'التمويل والمكافآت',
    'Review & Submit': 'المراجعة والإرسال',
    'Project Title': 'عنوان المشروع',
    'Short Description': 'وصف قصير',
    'Goal Amount': 'المبلغ المستهدف',
    'Campaign Duration': 'مدة الحملة',
    'Project Duration (days)': 'مدة المشروع (بالأيام)',
    'Project Video URL': 'رابط فيديو المشروع',
    'Full Description': 'الوصف الكامل',
    'Project Image': 'صورة المشروع',
    'Location': 'الموقع',
    'Next Step': 'الخطوة التالية',
    'Previous Step': 'الخطوة السابقة',
    'Submit Project': 'إرسال المشروع',
    'Step 1': 'الخطوة 1',
    'Step 2': 'الخطوة 2',
    'Step 3': 'الخطوة 3',
    'Step 4': 'الخطوة 4',
    'Category': 'الفئة',
    'Select a category': 'اختر فئة',
    'Select duration': 'اختر المدة',
    'Enter your project title': 'أدخل عنوان مشروعك',
    'City, Saudi Arabia': 'المدينة، المملكة العربية السعودية',
    'Next': 'التالي',
    'Previous': 'السابق',
    'Save as Draft': 'حفظ كمسودة',
    'Entertainment Projects': 'مشاريع ترفيهية',
    'Vision 2030 Projects': 'مشاريع رؤية 2030',
    'Start a Project': 'أنشئ مشروعاً',
    'Created': 'تاريخ الإنشاء',

    // Dashboard Items
    'My Projects': 'مشاريعي',
    'Backed Projects': 'المشاريع المدعومة',
    'Manage</a>': 'إدارة</a>',
    '>raised<': '>تم جمعها<',
    'funded': 'ممول',
    'days left': 'يوم متبقي',
    'Dashboard</h1>': 'لوحة التحكم</h1>',
    'Dashboard</h2>': 'لوحة التحكم</h2>',
    'Total Backed': 'إجمالي الدعم',
    'coins': 'عملة',

    // Links update
    'href="dashboard.html"': 'href="dashboard-ar.html"',
    'href="my-projects.html"': 'href="my-projects-ar.html"',
    'href="backed-projects.html"': 'href="backed-projects-ar.html"',
    'href="payments.html"': 'href="payments-ar.html"',
    'href="coins.html"': 'href="coins-ar.html"',
    'href="notifications.html"': 'href="notifications-ar.html"',
    'href="settings.html"': 'href="settings-ar.html"',
    'href="user-profile.html"': 'href="user-profile-ar.html"',
    'href="support.html"': 'href="support-ar.html"',
    'href="create-project.html"': 'href="create-project-ar.html"',
    'href="project-details.html"': 'href="project-details-ar.html"',
    'href="index.html"': 'href="index-ar.html"',
};

// Sort keys by length descending to avoid partial matches
const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);

pages.forEach(page => {
    const engPath = path.join(dir, page.name);
    const arFile = page.name.replace('.html', '-ar.html');
    const arPath = path.join(dir, arFile);

    if (fs.existsSync(engPath)) {
        let content = fs.readFileSync(engPath, 'utf8');
        content = content.replace(/lang="en"/, 'lang="ar" dir="rtl"');
        content = content.replace(/<title>.*<\/title>/, `<title>${page.title} - يلا ستارتر</title>`);

        // Add RTL Overrides
        const rtlStyles = `
    <style>
        body { font-family: 'Tajawal', sans-serif; text-align: right; direction: rtl; }
        .dashboard-sidebar { border-right: none; border-left: 1px solid var(--neutral-200); }
        .sidebar-menu-icon { margin-right: 0; margin-left: 1rem; }
        .sidebar-menu-link.active { border-right: none; border-left: 3px solid var(--primary); }
        .nav-links { margin-left: auto; margin-right: 0; }
        .logo { margin-left: 1rem; margin-right: 0; }
        .user-avatar { margin-right: 0; margin-left: 1rem; }
        /* Fix dropdown for RTL */
        .user-dropdown-menu { right: auto; left: 0; text-align: right; transform-origin: top left; }
        .dropdown-item { display: flex !important; align-items: center; gap: 10px; flex-direction: row; }
        .dropdown-item i { margin-left: 0; margin-right: 0; }
        /* Fix spinner for RTL */
        .fa-spin { display: inline-block; }
    </style>
</head>`;
        content = content.replace(/<\/head>/, rtlStyles);

        for (const en of sortedKeys) {
            content = content.split(en).join(translations[en]);
        }

        // Card Titles
        const cardTitles = {
            'Backed Projects': 'المشاريع المدعومة',
            'Active Projects': 'المشاريع النشطة',
            'Successful Projects': 'المشاريع الناجحة',
            'Total Raised': 'إجمالي ما تم جمعه',
            'Total Backed': 'إجمالي الدعم',
            'Dashboard': 'لوحة التحكم'
        };
        for (const [en, ar] of Object.entries(cardTitles)) {
            const r = new RegExp(`(<h[23][^>]*>)\\s*${en}\\s*(</h[23]>)`, 'g');
            content = content.replace(r, `$1${ar}$2`);
        }


        // Subtitle Multi-line Fix
        const subtitleEn = /Turn your innovative ideas into reality with support from our[\s\n\r]*community/g;
        content = content.replace(subtitleEn, 'حول أفكارك المبتكرة إلى واقع بدعم من مجتمعنا');

        // Mobile Menu Dashboard Links Injection

        const isDashboard = page.name.includes('dashboard') || page.name.includes('projects') ||
            page.name.includes('payments') || page.name.includes('notifications') ||
            page.name.includes('coins') || page.name.includes('profile') ||
            page.name.includes('settings') || page.name.includes('project-details') ||
            page.name.includes('create-project');

        if (isDashboard) {
            const mobileLinksRegex = /<div class="mobile-menu">[\s\S]*?<ul class="nav-links">([\s\S]*?)<\/ul>/;
            const dashLinks = `
                <li><a href="dashboard-ar.html">لوحة التحكم</a></li>
                <li><a href="my-projects-ar.html">مشاريعي</a></li>
                <li><a href="backed-projects-ar.html">المشاريع المدعومة</a></li>
                <li><a href="create-project-ar.html">إنشاء مشروع</a></li>
            `;
            content = content.replace(mobileLinksRegex, (match, p1) => {
                return match.replace(p1, dashLinks + p1);
            });
        }

        // --- Robust Regex translation for Sidebar & Menus (handles split lines) ---
        const sidebarMap = {
            'Dashboard': 'لوحة التحكم',
            'My Projects': 'مشاريعي',
            'Backed Projects': 'المشاريع المدعومة',
            'Payments': 'المدفوعات',
            'My Wallet': 'محفظتي',
            'Notifications': 'الإشعارات',
            'Profile': 'الملف الشخصي',
            'Settings': 'الإعدادات',
            'Help & Support': 'المساعدة والدعم',
            'Logout': 'تسجيل الخروج',
            'Create Project': 'إنشاء مشروع',
            'Create a Project': 'أنشئ مشروعاً'
        };

        for (const [en, ar] of Object.entries(sidebarMap)) {
            // Match <i ...></i> followed by any amount of whitespace (including newlines) and the English label
            const regex = new RegExp(`(<i[^>]*></i>)[\\s\\n\\r]*${en}`, 'g');
            content = content.replace(regex, `$1 ${ar}`);
            // Match > followed by any amount of whitespace and the English label followed by whitespace and </a>
            const regexA = new RegExp(`(>)[\\s\\n\\r]*${en}[\\s\\n\\r]*(</a>)`, 'g');
            content = content.replace(regexA, `$1 ${ar} $2`);
        }

        // --- Post-translation Cleanup (Restore broken JS & Add safety) ---
        content = content.replace(/const user = window\.auth\.getUser\(\);/g, 'const user = window.auth ? window.auth.getUser() : null;');
        content = content.replace(/window\.auth\.getUser\(\)/g, '(window.auth ? window.auth.getUser() : null)');
        content = content.replace(/const token = window\.auth \? window\.auth\.getToken\(\) : localStorage\.getItem\('token'\);/g, "const token = (window.auth && typeof window.auth.getToken === 'function') ? window.auth.getToken() : localStorage.getItem('token');");

        content = content.replace(/canتعديل/g, 'canEdit');
        content = content.replace(/const تعديل/g, 'const Edit');
        content = content.replace(/reممول/g, 'refunded');
        content = content.replace(/new التاريخ/g, 'new Date');
        content = content.replace(/toLocaleالتاريخString/g, 'toLocaleDateString');
        content = content.replace(/headerالمستخدمName/g, 'headerUserName');
        content = content.replace(/getالمستخدم\(\)/g, 'getUser()');
        content = content.replace(/sidebarالمستخدمName/g, 'sidebarName');
        content = content.replace(/sidebarالمستخدمEmail/g, 'sidebarEmail');
        content = content.replace(/sidebarالمستخدمAvatar/g, 'sidebarAvatar');
        content = content.replace(/المستخدمName/g, 'userName');
        content = content.replace(/المستخدمEmail/g, 'userEmail');
        content = content.replace(/headerالمستخدمAvatar/g, 'headerAvatar');
        content = content.replace(/id="المستخدم/g, 'id="user');
        content = content.replace(/window\.auth\.لوحة التحكم/g, 'window.auth.dashboard');
        content = content.replace(/window\.auth\.logout\(\)/g, "window.auth.logout()");

        // Fix the specific user profile update block to be safer
        content = content.replace(/if \(user\) \{/g, 'if (user && document.getElementById("userName")) {');

        // Finish
        if (!content.includes('session-init.js')) {
            content = content.replace(/(<script src="assets\/js\/auth-handler\.js">)/, '<script src="assets/js/session-init.js"></script>\n    $1');
        }

        // Add safety delay to any function call that starts with load (loadMyProjects, loadDashboardData, etc.)
        content = content.replace(/(\s)(load\w+\(\);)/g, '$1setTimeout(() => { $2 }, 500);');

        // Final manual translations for any missed stat labels
        content = content.replace(/>Total Raised</g, '>إجمالي ما تم جمعه<');
        content = content.replace(/>Active Projects</g, '>المشاريع النشطة<');
        content = content.replace(/>Successful Projects</g, '>المشاريع الناجحة<');
        content = content.replace(/>Backed Projects</g, '>المشاريع المدعومة<');

        fs.writeFileSync(arPath, content);
        console.log(`Verified & Created: ${arFile}`);
    }
});
