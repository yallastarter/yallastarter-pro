const fs = require('fs');
const path = require('path');

const dir = 'd:/my business/yallastarter/website main ones/yallastarter/yallastarter html website v12/public_html';

const pagesToProcess = [
    // Vision 2030
    'vision2030-education.html',
    'vision2030-financial.html',
    'vision2030-healthcare.html',
    'vision2030-industrial.html',
    'vision2030-logistics.html',
    'vision2030-sustainability.html',
    'vision2030-tourism.html',

    // Entertainment
    'entertainment-art.html',
    'entertainment-comics.html',
    'entertainment-crafts.html',
    'entertainment-dance.html',
    'entertainment-design.html',
    'entertainment-fashion.html',
    'entertainment-film.html',
    'entertainment-food.html',
    'entertainment-games.html',
    'entertainment-journalism.html',
    'entertainment-music.html',
    'entertainment-photography.html',
    'entertainment-publishing.html',
    'entertainment-technology.html',
    'entertainment-theater.html'
];

pagesToProcess.forEach(file => {
    const engPath = path.join(dir, file);
    const arFile = file.replace('.html', '-ar.html');
    const arPath = path.join(dir, arFile);

    if (fs.existsSync(engPath)) {
        let content = fs.readFileSync(engPath, 'utf8');

        // Basic RTL and Language Switch
        content = content.replace(/lang="en"/g, 'lang="ar" dir="rtl"');
        content = content.replace(/switchLanguage\('en'\)/g, "switchLanguage('ar')"); // Fix existing switcher calls if any are wrong

        // Fix the actual switcher buttons logic
        // In English page: En (Active), Ar (Link to -ar)
        // In Arabic page: Ar (Active), En (Link to original)

        // We will just do a simple replacement for the language switcher block if we can find it
        // OR we can just replace the whole header if we want to be safe, but they vary.

        // Let's try to patch the body style and common elements
        content = content.replace(/<\/head>/, `
    <style>
        body { direction: rtl; text-align: right; font-family: 'Tajawal', 'Poppins', sans-serif; }
        .navbar .nav-links { margin-left: 0; margin-right: auto; }
        .navbar .logo { margin-left: 1rem; margin-right: 0; }
        .footer-links { padding-right: 0; }
        .footer-column h3 { text-align: right; }
        /* Add more RTL fixes as needed */
    </style>
</head>`);

        // Replace Navbar Links (Simulated Translation for common links)
        content = content.replace(/>Home<\/a>/g, '>الرئيسية</a>');
        content = content.replace(/>Browse Projects<\/a>/g, '>تصفح المشاريع</a>');
        content = content.replace(/>How It Works<\/a>/g, '>كيف يعمل</a>');
        content = content.replace(/>About<\/a>/g, '>من نحن</a>');
        content = content.replace(/>Contact<\/a>/g, '>اتصل بنا</a>');
        content = content.replace(/>Log In<\/a>/g, '>تسجيل الدخول</a>');
        content = content.replace(/>Sign Up<\/a>/g, '>حساب جديد</a>');
        content = content.replace(/>Start a Project<\/a>/g, '>ابدأ مشروعك</a>');

        // Replace Footer Titles (Simulated)
        content = content.replace(/>YallaStarter<\/h3>/g, '>يلا ستارتر</h3>');
        content = content.replace(/>For Creators<\/h3>/g, '>للمبدعين</h3>');
        content = content.replace(/>For Backers<\/h3>/g, '>للداعمين</h3>');
        content = content.replace(/>Connect With Us<\/h3>/g, '>تواصل معنا</h3>');

        // Update Links to point to -ar versions
        content = content.replace(/href="index.html"/g, 'href="index-ar.html"');
        content = content.replace(/href="projects.html"/g, 'href="projects-ar.html"');
        content = content.replace(/href="about.html"/g, 'href="about-ar.html"');
        content = content.replace(/href="contact.html"/g, 'href="contact-ar.html"');
        content = content.replace(/href="how-it-works.html"/g, 'href="how-it-works-ar.html"');
        content = content.replace(/href="login.html"/g, 'href="login-ar.html"');
        content = content.replace(/href="signup.html"/g, 'href="signup-ar.html"');
        content = content.replace(/href="create-project.html"/g, 'href="create-project-ar.html"');
        content = content.replace(/href="dashboard.html"/g, 'href="dashboard-ar.html"');

        // Fix Language Switcher
        // Replace the English Switcher block with Arabic Switcher Block
        // Search for <div class="language-switcher">...</div>
        // This is hard to regex perfectly, but we can try to replace the button logic

        // Strategy: Inject a script at the bottom that handles the switcher click to go back to English
        const switcherScript = `
    <script>
        function switchLanguage(lang) {
            if (lang === 'en') {
                window.location.href = '${file}';
            } else if (lang === 'ar') {
                window.location.href = '${arFile}';
            }
        }
    </script>
        `;
        content = content.replace('</body>', switcherScript + '</body>');

        fs.writeFileSync(arPath, content);
        console.log(`Created ${arFile}`);
    }
});
