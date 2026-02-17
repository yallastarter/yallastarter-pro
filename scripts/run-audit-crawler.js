#!/usr/bin/env node
/**
 * Start server on TEST_PORT, run audit crawler (Playwright), then generate
 * reports/audit.json and reports/audit.md from reports/audit-raw.json.
 * Usage: node scripts/run-audit-crawler.js
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const TEST_PORT = process.env.TEST_PORT || 3999;
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function waitForServer(port, maxWait = 30000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tryReq = () => {
            const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        if (JSON.parse(data).status === 'ok') return resolve();
                    } catch (e) {}
                    if (Date.now() - start < maxWait) setTimeout(tryReq, 500);
                    else reject(new Error('Health check failed'));
                });
            });
            req.on('error', () => {
                if (Date.now() - start >= maxWait) return reject(new Error('Server not ready'));
                setTimeout(tryReq, 500);
            });
            req.setTimeout(2000, () => { req.destroy(); setTimeout(tryReq, 500); });
        };
        tryReq();
    });
}

function runAuditTests() {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            BASE_URL: `http://localhost:${TEST_PORT}`,
            E2E_BASE_URL: `http://localhost:${TEST_PORT}`,
            PORT: String(TEST_PORT)
        };
        const p = spawn('npx', ['playwright', 'test', 'tests/audit-crawler.spec.js', '--workers=1', '--reporter=list'], {
            cwd: path.join(__dirname, '..'),
            env,
            shell: true,
            stdio: 'inherit'
        });
        p.on('close', code => (code === 0 ? resolve() : reject(new Error('Playwright exit ' + code))));
    });
}

function generateReports() {
    const rawPath = path.join(REPORTS_DIR, 'audit-raw.json');
    if (!fs.existsSync(rawPath)) {
        console.warn('audit-raw.json not found; audit spec may not have run.');
        return { summary: { critical: 1 }, pages: [], problems: ['Audit raw data missing'] };
    }
    const data = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const problems = [];
    (data.pages || []).forEach(p => {
        if (p.status >= 400) problems.push(`${p.url} → HTTP ${p.status}`);
        if (p.hasHeader === false) problems.push(`${p.url} → missing header`);
        if ((p.url.includes('dashboard') || p.url.includes('coins')) && p.hasSidebar === false)
            problems.push(`${p.url} → missing dashboard sidebar`);
    });
    (data.buttonChecks || []).forEach(b => {
        if (b.check === 'sidebar_and_balance' && b.onCoinsPage === true && !b.hasSidebar)
            problems.push('Coins page missing sidebar');
        if (b.check === 'preset_and_buy_btn' && b.onCoinsPage === true && (!b.presetButtonsExist || !b.buyButtonExists))
            problems.push('Coins preset or Buy button missing');
        if (b.check === 'mobile_no_horizontal_scroll' && b.horizontalOverflow)
            problems.push('Mobile viewport has horizontal scroll');
    });
    if ((data.consoleErrors || []).length > 5)
        problems.push(`${data.consoleErrors.length} console errors captured`);
    if ((data.failedRequests || []).length > 3)
        problems.push(`${data.failedRequests.length} failed network requests`);

    const auditJson = {
        timestamp: data.timestamp,
        baseUrl: data.baseUrl,
        summary: data.summary || {},
        pages: data.pages || [],
        buttonChecks: data.buttonChecks || [],
        consoleErrorCount: (data.consoleErrors || []).length,
        failedRequestCount: (data.failedRequests || []).length,
        problems
    };
    fs.writeFileSync(path.join(REPORTS_DIR, 'audit.json'), JSON.stringify(auditJson, null, 2));

    let md = `# Platform Audit Report\n\n`;
    md += `**Generated:** ${data.timestamp}\n`;
    md += `**Base URL:** ${data.baseUrl}\n\n`;
    md += `## Summary\n\n`;
    md += `- Pages checked: ${(data.pages || []).length}\n`;
    md += `- OK (200): ${(data.summary && data.summary.ok) || 0}\n`;
    md += `- Critical issues: ${(data.summary && data.summary.critical) || 0}\n`;
    md += `- Console errors: ${(data.consoleErrors || []).length}\n`;
    md += `- Failed requests: ${(data.failedRequests || []).length}\n\n`;
    md += `## Problems\n\n`;
    if (problems.length === 0) md += `None.\n`;
    else problems.forEach(p => { md += `- ${p}\n`; });
    md += `\n## Page checks\n\n`;
    (data.pages || []).forEach(p => {
        md += `- \`${p.url}\` → ${p.status} | header: ${p.hasHeader} | sidebar: ${p.hasSidebar}\n`;
    });
    md += `\n## Button / UX checks\n\n`;
    (data.buttonChecks || []).forEach(b => {
        md += `- ${b.page} / ${b.check}: ${JSON.stringify(b)}\n`;
    });
    fs.writeFileSync(path.join(REPORTS_DIR, 'audit.md'), md);
    console.log('Reports written: reports/audit.json, reports/audit.md');
    return auditJson;
}

async function main() {
    process.env.PORT = String(TEST_PORT);
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
        process.env.MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yallastarter_test';
        console.warn('No MONGODB_URI/MONGO_URI set; using local test DB.');
    }
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'audit-test-secret-do-not-use-in-production';

    let serverProc;
    try {
        serverProc = spawn('node', ['server.js'], {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PORT: String(TEST_PORT) },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        serverProc.stdout.on('data', d => process.stdout.write(d));
        serverProc.stderr.on('data', d => process.stderr.write(d));
        await waitForServer(TEST_PORT);
        console.log('Server ready on port', TEST_PORT);
    } catch (e) {
        console.error('Server failed to start:', e.message);
        if (serverProc) serverProc.kill();
        process.exit(1);
    }

    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

    try {
        await runAuditTests();
    } catch (e) {
        console.error('Audit tests failed:', e.message);
    } finally {
        serverProc.kill('SIGTERM');
    }

    const audit = generateReports();
    process.exit((audit.summary && audit.summary.critical > 0) ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
