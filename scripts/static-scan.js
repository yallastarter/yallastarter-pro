#!/usr/bin/env node
/**
 * Static site crawl: scan all public_html/*.html for broken links and missing assets.
 * Writes reports/static-scan.json and reports/static-scan.md
 * Run: node scripts/static-scan.js
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public_html');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

const report = {
    timestamp: new Date().toISOString(),
    pagesScanned: 0,
    pagesWithErrors: 0,
    brokenLinks: [],
    missingAssets: [],
    consoleErrors: [], // placeholder; real console errors need browser
    summary: { brokenLinkCount: 0, missingAssetCount: 0 }
};

// Known valid routes (not files under public_html)
const VALID_ROUTES = new Set([
    '/api/health', '/api/auth/login', '/api/auth/signup', '/api/auth/google', '/api/auth/google/callback',
    '/api/auth/me', '/api/projects', '/api/coins/balance', '/api/admin/dashboard'
]);

function getAllHtmlFiles(dir, list = []) {
    if (!fs.existsSync(dir)) return list;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) getAllHtmlFiles(full, list);
        else if (e.name.endsWith('.html')) list.push(path.relative(PUBLIC_DIR, full).replace(/\\/g, '/'));
    }
    return list;
}

function resolveUrl(fromPagePath, href) {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return { external: true };
    const clean = href.split('?')[0].split('#')[0].trim();
    if (!clean) return null;
    let resolved = clean.startsWith('/') ? clean.slice(1) : path.join(path.dirname(fromPagePath), clean).replace(/\\/g, '/');
    if (resolved.startsWith('/')) resolved = resolved.slice(1);
    return { path: resolved };
}

function fileExists(relativePath) {
    const full = path.join(PUBLIC_DIR, relativePath);
    return fs.existsSync(full);
}

function extractRefs(html) {
    const hrefs = [];
    const srcs = [];
    const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
    const srcRe = /src\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = hrefRe.exec(html))) hrefs.push(m[1].trim());
    while ((m = srcRe.exec(html))) srcs.push(m[1].trim());
    return { hrefs, srcs };
}

function main() {
    if (!fs.existsSync(PUBLIC_DIR)) {
        console.error('public_html not found');
        process.exit(1);
    }
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

    let htmlFiles = getAllHtmlFiles(PUBLIC_DIR);
    htmlFiles = htmlFiles.filter(f => !f.startsWith('partials/'));
    report.pagesScanned = htmlFiles.length;
    const allCheckedPaths = new Set();

    for (const page of htmlFiles) {
        const content = fs.readFileSync(path.join(PUBLIC_DIR, page), 'utf8');
        const { hrefs, srcs } = extractRefs(content);

        for (const href of hrefs) {
            const resolved = resolveUrl(page, href);
            if (!resolved) continue;
            if (resolved.external) continue;
            const targetPath = resolved.path;
            if (VALID_ROUTES.has('/' + targetPath)) continue;
            if (targetPath.startsWith('api/')) continue;
            const key = page + ' -> ' + targetPath;
            if (allCheckedPaths.has(key)) continue;
            allCheckedPaths.add(key);
            if (targetPath.endsWith('.html') || !path.extname(targetPath)) {
                const checkPath = targetPath.endsWith('.html') ? targetPath : targetPath + '.html';
                if (!fileExists(checkPath) && !fileExists(targetPath)) {
                    report.brokenLinks.push({ from: page, href, resolved: targetPath });
                }
            } else {
                if (!fileExists(targetPath)) {
                    report.missingAssets.push({ from: page, href, resolved: targetPath });
                }
            }
        }

        for (const src of srcs) {
            const resolved = resolveUrl(page, src);
            if (!resolved) continue;
            if (resolved.external) continue;
            const targetPath = resolved.path;
            const key = page + ' -> ' + targetPath;
            if (allCheckedPaths.has(key)) continue;
            allCheckedPaths.add(key);
            if (!fileExists(targetPath)) {
                report.missingAssets.push({ from: page, src, resolved: targetPath });
            }
        }
    }

    report.summary.brokenLinkCount = report.brokenLinks.length;
    report.summary.missingAssetCount = report.missingAssets.length;
    report.pagesWithErrors = new Set([...report.brokenLinks, ...report.missingAssets].map(x => x.from)).size;

    fs.writeFileSync(path.join(REPORTS_DIR, 'static-scan.json'), JSON.stringify(report, null, 2));

    let md = `# Static Scan Report\n\nGenerated: ${report.timestamp}\n\n`;
    md += `- Pages scanned: ${report.pagesScanned}\n`;
    md += `- Pages with errors: ${report.pagesWithErrors}\n`;
    md += `- Broken links: ${report.summary.brokenLinkCount}\n`;
    md += `- Missing assets: ${report.summary.missingAssetCount}\n\n`;
    if (report.brokenLinks.length) {
        md += `## Broken Links\n\n| From | Link | Resolved |\n|------|------|----------|\n`;
        report.brokenLinks.forEach(b => { md += `| ${b.from} | ${b.href} | ${b.resolved} |\n`; });
    }
    if (report.missingAssets.length) {
        md += `\n## Missing Assets\n\n| From | Ref | Resolved |\n|------|-----|----------|\n`;
        report.missingAssets.forEach(a => { md += `| ${a.from} | ${a.href || a.src} | ${a.resolved} |\n`; });
    }
    fs.writeFileSync(path.join(REPORTS_DIR, 'static-scan.md'), md);

    console.log('Static scan complete:', report.summary);
    process.exit(report.summary.brokenLinkCount + report.summary.missingAssetCount > 0 ? 1 : 0);
}

main();
