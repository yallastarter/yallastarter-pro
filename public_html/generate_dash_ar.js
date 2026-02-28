const fs = require('fs');
const path = require('path');

const dir = __dirname;
const layoutFile = path.join(dir, 'dashboard-ar.html');
const layoutContent = fs.readFileSync(layoutFile, 'utf8');

const contentStartMarker = '<div class="dashboard-content">';
const contentStartIdx = layoutContent.indexOf(contentStartMarker);
const layoutTop = layoutContent.substring(0, contentStartIdx + contentStartMarker.length);
const scriptsIdx = layoutContent.indexOf('<script src="assets/js/auth-handler.js">');
const layoutBottomContainerEnd = '\n    </div>\n\n    ';
const layoutBottom = layoutBottomContainerEnd + layoutContent.substring(scriptsIdx);

const pages = [
    { name: 'my-projects.html', title: 'مشاريعي', iconClass: 'fa-rocket', hasSidebar: true },
    { name: 'backed-projects.html', title: 'المشاريع المدعومة', iconClass: 'fa-hand-holding-heart', hasSidebar: true },
    { name: 'payments.html', title: 'المدفوعات', iconClass: 'fa-money-bill-wave', hasSidebar: true },
    { name: 'notifications.html', title: 'الإشعارات', iconClass: 'fa-bell', hasSidebar: true },
    { name: 'settings.html', title: 'الإعدادات', iconClass: 'fa-cog', hasSidebar: false }
];

const translations = {
    'My Projects': 'مشاريعي',
    'Backed Projects': 'المشاريع المدعومة',
    'Create New Project': 'إنشاء مشروع جديد',
    'Create Project': 'إنشاء مشروع',
    'Browse Projects': 'تصفح المشاريع',
    'Loading projects…': 'جاري تحميل المشاريع...',
    'Loading backed projects…': 'جاري تحميل المشاريع المدعومة...',
    'No projects yet': 'لا توجد مشاريع بعد',
    'No backed projects yet': 'لم تقم بدعم أي مشاريع بعد',
    'Ready to share your idea with the world?': 'هل أنت مستعد لمشاركة فكرتك مع العالم؟',
    "You haven't backed any projects. Discover amazing projects to support!": 'لم تقم بدعم أي مشاريع. اكتشف مشاريع رائعة لدعمها!',
    'Start a Project': 'ابدأ مشروعك',
    'Payments': 'المدفوعات',
    'My Wallet': 'محفظتي',
    'Total Backed': 'إجمالي الدعم',
    'Total Received': 'إجمالي المستلم',
    'Pending Transactions': 'المعاملات المعلقة',
    'Total Transactions': 'إجمالي المعاملات',
    'Transaction History': 'سجل المعاملات',
    'Export CSV': 'تصدير CSV',
    'Date': 'التاريخ',
    'Description': 'الوصف',
    'Type': 'النوع',
    'Amount': 'المبلغ',
    'Status': 'الحالة',
    'Loading transactions...': 'جاري تحميل المعاملات...',
    'Payment Methods': 'طرق الدفع',
    'Bank Card': 'بطاقة بنكية',
    'No card saved': 'لا توجد بطاقة محفوظة',
    'No payment methods saved yet.': 'لا توجد طرق دفع محفوظة بعد.',
    'Add Payment Method': 'إضافة طريقة دفع',
    'SAR': 'ريال',
    'Default': 'الافتراضي',
    'Notifications': 'الإشعارات',
    'Mark All Read': 'تحديد الكل كمقروء',
    'All': 'الكل',
    'Unread': 'غير مقروء',
    'Projects': 'المشاريع',
    'Funding': 'التمويل',
    'System': 'النظام',
    'Loading notifications...': 'جاري تحميل الإشعارات...',
    'Settings': 'الإعدادات',
    'Manage your account preferences and settings': 'إدارة تفضيلات حسابك وإعداداته',
    'Account Information': 'معلومات الحساب',
    'Username': 'اسم المستخدم',
    'Enter your username': 'أدخل اسم المستخدم',
    'Email Address': 'عنوان البريد الإلكتروني',
    'Enter your email': 'أدخل بريدك الإلكتروني',
    'Save Changes': 'حفظ التغييرات',
    'Change Password': 'تغيير كلمة المرور',
    'Current Password': 'كلمة المرور الحالية',
    'Enter current password': 'أدخل كلمة المرور الحالية',
    'New Password': 'كلمة المرور الجديدة',
    'Enter new password': 'أدخل كلمة المرور الجديدة',
    'Confirm New Password': 'تأكيد كلمة المرور الجديدة',
    'Update Password': 'تحديث كلمة المرور',
    'Notification Preferences': 'تفضيلات الإشعارات',
    'Email Notifications': 'إشعارات البريد الإلكتروني',
    'Receive email updates about your projects and backed campaigns': 'تلقي تحديثات عبر البريد الإلكتروني حول مشاريعك',
    'Project Updates': 'تحديثات المشروع',
    'Get notified when projects you backed post updates': 'احصل على إشعارات بتحديثات المشاريع المدعومة',
    'Newsletter': 'النشرة البريدية',
    'Receive our weekly newsletter with featured projects': 'احصل على نشرتنا الأسبوعية بالمشاريع المميزة'
};

pages.forEach(page => {
    const engPath = path.join(dir, page.name);
    const arFile = page.name.replace('.html', '-ar.html');
    const arPath = path.join(dir, arFile);

    if (fs.existsSync(engPath)) {
        let engContent = fs.readFileSync(engPath, 'utf8');
        let innerContent = '';

        if (page.hasSidebar) {
            let contentStart = engContent.indexOf('<div class="dashboard-content">');
            let contentStartAlt = engContent.indexOf('<div class="payments-content">');
            let contentStartAlt2 = engContent.indexOf('<div class="notifications-content">');

            if (contentStart !== -1) contentStart += '<div class="dashboard-content">'.length;
            else if (contentStartAlt !== -1) contentStart = contentStartAlt + '<div class="payments-content">'.length;
            else if (contentStartAlt2 !== -1) contentStart = contentStartAlt2 + '<div class="notifications-content">'.length;

            if (contentStart !== -1) {
                // Find script tag and walk back two </div>
                let scriptStart = engContent.indexOf('<script', contentStart);
                let end1 = engContent.lastIndexOf('</div>', scriptStart);
                let contentEnd = engContent.lastIndexOf('</div>', end1 - 1);

                innerContent = engContent.substring(contentStart, contentEnd);
            }
        } else {
            // No sidebar, like settings.html
            let contentStart = engContent.indexOf('<div class="settings-container">');
            if (contentStart !== -1) {
                let scriptStart = engContent.indexOf('<script', contentStart);
                let contentEnd = engContent.lastIndexOf('</div>', scriptStart);
                innerContent = engContent.substring(contentStart, contentEnd);
                innerContent = '<div class="settings-container" style="max-width:none; margin:0; padding:0;">' + innerContent.substring(innerContent.indexOf('>') + 1);
            }
        }

        if (innerContent) {
            // Translate text
            for (const [en, ar] of Object.entries(translations)) {
                const regex = new RegExp(en.replace(/[.*+?^$\/(){}[]\\\\]/g, '\\$&'), 'g');
                innerContent = innerContent.replace(regex, ar);
            }

            // Adjust links
            innerContent = innerContent.replace(/href="projects\.html"/g, 'href="projects-ar.html"');
            innerContent = innerContent.replace(/href="coins\.html"/g, 'href="coins-ar.html"');
            innerContent = innerContent.replace(/href="project-details\.html\?id=/g, 'href="project-details-ar.html?id=');

            let newFileContent = layoutTop + innerContent + layoutBottom;
            newFileContent = newFileContent.replace(/<title>.*<\/title>/, `<title>${page.title} - يلا ستارتر</title>`);

            // Fix active sidebar link
            newFileContent = newFileContent.replace(/class="sidebar-menu-link active"/g, 'class="sidebar-menu-link"');
            const linkRegex = new RegExp(`class="sidebar-menu-link">\\s*<i class="fas ${page.iconClass} sidebar-menu-icon"><\\/i> ${page.title}<\\/a>`, 'g');
            newFileContent = newFileContent.replace(linkRegex, `class="sidebar-menu-link active"><i class="fas ${page.iconClass} sidebar-menu-icon"></i> ${page.title}</a>`);

            fs.writeFileSync(arPath, newFileContent);
            console.log(`Created ${arFile}`);
        } else {
            console.log(`Could not find content in ${page.name}`);
        }
    }
});
