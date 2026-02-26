const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public_html');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let count = 0;

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');

    // Inject into English footer (after Support)
    if (content.includes('<li><a href="support.html">Support</a></li>') && !content.includes('admin-login.html')) {
        content = content.replace(
            '<li><a href="support.html">Support</a></li>',
            '<li><a href="support.html">Support</a></li>\n                        <li><a href="admin-login.html" class="employee-access-link"><i class="fas fa-user-shield" style="margin-right: 5px; opacity: 0.7;"></i>Employee Access</a></li>'
        );
        fs.writeFileSync(p, content);
        count++;
    }
    // Inject into Arabic footer (after Support)
    else if (content.includes('<li><a href="support-ar.html">الدعم</a></li>') && !content.includes('admin-login.html')) {
        content = content.replace(
            '<li><a href="support-ar.html">الدعم</a></li>',
            '<li><a href="support-ar.html">الدعم</a></li>\n                        <li><a href="admin-login.html" class="employee-access-link"><i class="fas fa-user-shield" style="margin-left: 5px; opacity: 0.7;"></i>وصول الموظفين</a></li>'
        );
        fs.writeFileSync(p, content);
        count++;
    }
});

console.log(`Successfully added Employee Access link to ${count} files.`);
