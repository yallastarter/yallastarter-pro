const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('-ar.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    if (!content.includes('محفظتي') && content.includes('المدفوعات')) {
        // Try without <li>
        const regex1 = /<a href="payments-ar\.html"\s+class="sidebar-menu-link[^>]*>\s*<i\s+class="fas fa-money-bill-wave[^>]*><\/i>\s*المدفوعات\s*<\/a>/;

        let match = content.match(regex1);
        if (match) {
            const hasLi = content.substring(match.index - 5, match.index).includes('<li');

            let linkHTML;
            if (hasLi) {
                linkHTML = `\n                <li class="sidebar-menu-item"><a href="coins-ar.html" class="sidebar-menu-link${file === 'coins-ar.html' ? ' active' : ''}"><i class="fas fa-coins sidebar-menu-icon"></i> محفظتي</a></li>`;
                // To insert after the closing </li>
                const liEnd = content.indexOf('</li>', match.index);
                if (liEnd !== -1) {
                    content = content.substring(0, liEnd + 5) + linkHTML + content.substring(liEnd + 5);
                }
            } else {
                linkHTML = `\n                    <a href="coins-ar.html" class="sidebar-menu-link${file === 'coins-ar.html' ? ' active' : ''}"><i class="fas fa-coins sidebar-menu-icon"></i> محفظتي</a>`;
                const aEnd = content.indexOf('</a>', match.index);
                if (aEnd !== -1) {
                    content = content.substring(0, aEnd + 4) + linkHTML + content.substring(aEnd + 4);
                }
            }
        }

        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log(`Inserted محفظتي in ${file}`);
        }
    }
});
