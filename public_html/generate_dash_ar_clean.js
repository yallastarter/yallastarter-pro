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
    '>لوحة التحكم</a>': '>لوحة التحكم</a>',

    // Sidebar & Menus (Including split lines)
    '</i> Dashboard': '</i> لوحة التحكم',
    '</i> My Projects': '</i> مشاريعي',
    '</i> Backed Projects': '</i> المشاريع المدعومة',
    '</i> Payments': '</i> المدفوعات',
    '</i> My Wallet': '</i> محفظتي',
    '</i> Notifications': '</i> الإشعارات',
    '</i> Profile': '</i> الملف الشخصي',
    '</i> Settings': '</i> الإعدادات',
    '</i> Help & Support': '</i> المساعدة والدعم',
    '</i> Logout': '</i> تسجيل الخروج',
    '> Dashboard': '> لوحة التحكم',
    '> My Projects': '> مشاريعي',
    '> Backed Projects': '> المشاريع المدعومة',
    '> Payments': '> المدفوعات',
    '> My Wallet': '> محفظتي',
    '> Notifications': '> الإشعارات',
    '> Profile': '> الملف الشخصي',
    '> Settings': '> الإعدادات',
    '> Help & Support': '> المساعدة والدعم',
    '> Logout': '> تسجيل الخروج',

    // Dashboard Landing Page specific
    '<div class="stat-label">Total Balance</div>': '<div class="stat-label">إجمالي الرصيد</div>',
    '<div class="stat-label">Active Projects</div>': '<div class="stat-label">المشاريع النشطة</div>',
    '<div class="stat-label">Successful Projects</div>': '<div class="stat-label">المشاريع الناجحة</div>',
    '<div class="stat-label">Total Backers</div>': '<div class="stat-label">إجمالي الداعمين</div>',
    '<div class="stat-label">Total Raised</div>': '<div class="stat-label">إجمالي ما تم جمعه</div>',
    '<div class="stat-label">Total Backed</div>': '<div class="stat-label">إجمالي الدعم</div>',
    '<div class="tab-item active">My Projects</div>': '<div class="tab-item active">مشاريعي</div>',
    '<div class="tab-item">Backed Projects</div>': '<div class="tab-item">المشاريع المدعومة</div>',

    '>Total Balance</h2>': '>إجمالي الرصيد</h2>',
    '>Active Projects</h2>': '>المشاريع النشطة</h2>',
    '>Successful Projects</h2>': '>المشاريع الناجحة</h2>',
    '>Total Backers</h2>': '>إجمالي الداعمين</h2>',
    '>Total Raised</h2>': '>إجمالي ما تم جمعه</h2>',
    '>Successful Projects</h3>': '>المشاريع الناجحة</h3>',
    '>Active Projects</h3>': '>المشاريع النشطة</h3>',
    '>Backed Projects</h2>': '>المشاريع المدعومة</h2>',
    '>My Projects</h2>': '>مشاريعي</h2>',
    'View All': 'عرض الكل',
    'Quick Actions': 'إجراءات سريعة',
    '>Create a Project</a>': '>أنشئ مشروعاً</a>',
    'Recent Activity': 'النشاط الأخير',
    'No recent activity': 'لا يوجد نشاط أخير',
    'Loading dashboard data...': 'جاري تحميل بيانات لوحة التحكم...',
    '>Backed Projects</a>': '>المشاريع المدعومة</a>',

    // Titles & Headers
    '<h1 class="dashboard-title">Dashboard</h1>': '<h1 class="dashboard-title">لوحة التحكم</h1>',
    '<h1 class="dashboard-title">My Projects</h1>': '<h1 class="dashboard-title">مشاريعي</h1>',
    '<h1 class="dashboard-title">Payments</h1>': '<h1 class="dashboard-title">المدفوعات</h1>',
    '<h1 class="dashboard-title">Settings</h1>': '<h1 class="dashboard-title">الإعدادات</h1>',
    '<h1 class="dashboard-title">Backed Projects</h1>': '<h1 class="dashboard-title">المشاريع المدعومة</h1>',
    'class="dashboard-title">Notifications': 'class="dashboard-title">الإشعارات',

    // Specific placeholders & Dynamic Content
    'Loading your projects…': 'جاري تحميل مشاريعك...',
    'Loading transactions...': 'جاري تحميل المعاملات...',
    'Loading notifications...': 'جاري تحميل الإشعارات...',
    'No projects yet': 'لا توجد مشاريع بعد',
    "You haven't created any projects. Start your first one!": "لم تقم بإنشاء أي مشاريع بعد. ابدأ مشروعك الأول!",
    '>raised<': '>تم جمعها<',
    'funded': 'ممول',
    'days left': 'يوم متبقي',
    '>Create Project</a>': '>إنشاء مشروع</a>',
    ' View</a>': ' عرض</a>',
    ' Edit</a>': ' تعديل</a>',
    ' Delete</button>': ' حذف</button>',
    '>Total Raised<': '>إجمالي ما تم جمعه<',
    'Total Backed': 'إجمالي الدعم',
    'Total Received': 'إجمالي المستلم',
    'Pending Transactions': 'المعاملات المعلقة',
    'Total Transactions': 'إجمالي المعاملات',
    'No transactions found.': 'لم يتم العثور على معاملات.',

    // Status Labels
    ": '✅ Active'": ": '✅ نشط'",
    ": '📝 Draft'": ": '📝 مسودة'",
    ": '⏳ Pending Review'": ": '⏳ قيد المراجعة'",
    ": '🏁 Completed'": ": '🏁 اكتمل'",
    ": '❌ Rejected'": ": '❌ مرفوض'",
    '>Active</span>': '>نشط</span>',
    '>Draft</span>': '>مسودة</span>',
    '>LIVE</span>': '>مباشر</span>',
    '>OFFLINE</span>': '>غير متصل</span>',
    '>🏁 ENDED</span>': '>🏁 انتهى</span>',
    '❌ Rejected by admin': '❌ مرفوض من قبل المشرف',
    'Delete "${title}"?': 'حذف "${title}"؟',
    'their coins will be refunded automatically.': 'سيتم استرداد عملاتهم تلقائياً.',

    // Profile & Settings
    '>Profile Details</h2>': '>تفاصيل الملف الشخصي</h2>',
    '>Security Settings</h2>': '>إعدادات الأمان</h2>',
    'Save Changes': 'حفظ التغييرات',
    'Update Profile': 'تحديث الملف الشخصي',
    'Full Name': 'الاسم الكامل',
    'Email Address': 'البريد الإلكتروني',
    'Phone Number': 'رقم الهاتف',
    'Current Password': 'كلمة المرور الحالية',
    'New Password': 'كلمة المرور الجديدة',
    'Confirm New Password': 'تأكيد كلمة المرور الجديدة',

    // Payments Table
    '<th>Date</th>': '<th>التاريخ</th>',
    '<th>Description</th>': '<th>الوصف</th>',
    '<th>Type</th>': '<th>النوع</th>',
    '<th>Amount</th>': '<th>المبلغ</th>',
    '<th>Status</th>': '<th>الحالة</th>',
    '>Payment Methods</h2>': '>طرق الدفع</h2>',
    '>Bank Card</div>': '>بطاقة بنكية</div>',
    'Export CSV': 'تصدير CSV',
    'Mark All Read': 'تحديد الكل كمقروء',

    // Currency
    'SAR ': 'ريال ',
    'SAR 0': 'ريال 0',

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

        // Broad Card Title translation
        const cardTitles = {
            'Backed Projects': 'المشاريع المدعومة',
            'Active Projects': 'المشاريع النشطة',
            'Successful Projects': 'المشاريع الناجحة',
            'Total Raised': 'إجمالي ما تم جمعه'
        };
        for (const [en, ar] of Object.entries(cardTitles)) {
            const r = new RegExp(`(<h[23][^>]*>)\\s*${en}\\s*(</h[23]>)`, 'g');
            content = content.replace(r, `$1${ar}$2`);
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
