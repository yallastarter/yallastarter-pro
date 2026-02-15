const fs = require('fs');
const path = require('path');

const dir = 'd:/my business/yallastarter/website main ones/yallastarter/yallastarter html website v12/public_html';

fs.readdir(dir, (err, files) => {
    if (err) throw err;

    const arFiles = files.filter(f => f.endsWith('-ar.html'));

    arFiles.forEach(file => {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // map of English file -> Arabic file
        // We can't just mistakenly replace "index.html" inside "index-ar.html" if it's already "index-ar.html"
        // But since we are looking for href="X.html", safe to replace if X doesn't end in -ar

        // Fix Navigation Text first (if missed)
        content = content.replace(/>Entertainment Projects<\/a>/g, '>الترفيه الإبداعي</a>');
        content = content.replace(/>Vision 2030 Projects<\/a>/g, '>مشاريع رؤية 2030</a>');
        content = content.replace(/>MIND71 AI<\/a>/g, '>MIND71 AI</a>'); // valid in both usually

        // Fix Breadcrumbs/Titles
        content = content.replace(/>All Film<\/a>/g, '>كل الأفلام</a>');
        content = content.replace(/Film Categories/g, 'فئات الأفلام');
        content = content.replace(/Film Projects/g, 'مشاريع الأفلام');

        // General Link Fixer
        const linksToFix = [
            'entertainment.html', 'vision2030.html', 'mind71.html', 'projects.html',
            'entertainment-film.html', 'vision2030-technology.html',
            // Add all the subpages we created
            'vision2030-education.html', 'vision2030-financial.html', 'vision2030-healthcare.html',
            'vision2030-industrial.html', 'vision2030-logistics.html', 'vision2030-sustainability.html',
            'vision2030-tourism.html',
            'entertainment-art.html', 'entertainment-comics.html', 'entertainment-crafts.html',
            'entertainment-dance.html', 'entertainment-design.html', 'entertainment-fashion.html',
            'entertainment-food.html', 'entertainment-games.html', 'entertainment-journalism.html',
            'entertainment-music.html', 'entertainment-photography.html', 'entertainment-publishing.html',
            'entertainment-technology.html', 'entertainment-theater.html'
        ];

        linksToFix.forEach(link => {
            // Regex to find href="link" not followed by -ar
            // simple string replace is safer if we match exact quote
            const arLink = link.replace('.html', '-ar.html');
            // Global replace
            const regex = new RegExp(`href="${link}"`, 'g');
            content = content.replace(regex, `href="${arLink}"`);

            // Also handle query params like projects.html?category=...
            const regex2 = new RegExp(`href="projects.html\\?`, 'g');
            content = content.replace(regex2, `href="projects-ar.html?`);
        });

        // Specific Fixes for "entertainment-film-ar.html" nav to point to itself properly? 
        // No, linking to itself is fine with -ar.

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(`Fixed links in ${file}`);
        }
    });
});
