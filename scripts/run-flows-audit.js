#!/usr/bin/env node
/**
 * Start server, run flows-audit Playwright tests, generate reports/flows-audit.json and reports/flows-audit.md.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const TEST_PORT = process.env.TEST_PORT || 3998;
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

function runFlowsTests() {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            BASE_URL: `http://localhost:${TEST_PORT}`,
            E2E_BASE_URL: `http://localhost:${TEST_PORT}`,
            PORT: String(TEST_PORT)
        };
        const p = spawn('npx', ['playwright', 'test', 'tests/flows-audit.spec.js', '--workers=1', '--reporter=list'], {
            cwd: path.join(__dirname, '..'),
            env,
            shell: true,
            stdio: 'inherit'
        });
        p.on('close', code => (code === 0 ? resolve() : reject(new Error('Playwright exit ' + code))));
    });
}

function generateReports() {
    const rawPath = path.join(REPORTS_DIR, 'flows-audit-raw.json');
    if (!fs.existsSync(rawPath)) {
        const out = { timestamp: new Date().toISOString(), issues: ['Flows audit raw data missing'], problems: ['Run failed or no data'] };
        fs.writeFileSync(path.join(REPORTS_DIR, 'flows-audit.json'), JSON.stringify(out, null, 2));
        fs.writeFileSync(path.join(REPORTS_DIR, 'flows-audit.md'), '# Flows Audit\n\nNo data. Run `npm run flows-audit`.\n');
        return out;
    }
    const data = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const problems = [];
    if (data.creator && data.creator.issues && data.creator.issues.length) {
        data.creator.issues.forEach(i => problems.push('[Creator] ' + i));
    }
    if (data.backer && data.backer.issues && data.backer.issues.length) {
        data.backer.issues.forEach(i => problems.push('[Backer] ' + i));
    }
    if (data.admin && data.admin.issues && data.admin.issues.length) {
        data.admin.issues.forEach(i => problems.push('[Admin] ' + i));
    }
    if ((data.failedRequests || []).length > 5) {
        problems.push('Failed requests: ' + data.failedRequests.length);
    }
    if ((data.consoleErrors || []).length > 10) {
        problems.push('Console errors: ' + data.consoleErrors.length);
    }
    const auditJson = {
        timestamp: data.timestamp,
        baseUrl: data.baseUrl,
        creator: data.creator,
        backer: data.backer,
        admin: data.admin,
        consoleErrorCount: (data.consoleErrors || []).length,
        failedRequestCount: (data.failedRequests || []).length,
        problems
    };
    fs.writeFileSync(path.join(REPORTS_DIR, 'flows-audit.json'), JSON.stringify(auditJson, null, 2));

    let md = `# Flows Audit Report\n\n**Generated:** ${data.timestamp}\n**Base URL:** ${data.baseUrl}\n\n`;
    md += `## Summary\n\n`;
    md += `- Creator: login=${data.creator && data.creator.loginOk}, createProject=${data.creator && data.creator.createProjectOk}\n`;
    md += `- Backer: browse=${data.backer && data.backer.browseOk}, projectPage=${data.backer && data.backer.projectPageOk}\n`;
    md += `- Admin: login=${data.admin && data.admin.loginOk}, dashboard=${data.admin && data.admin.dashboardOk}\n`;
    md += `- Console errors: ${(data.consoleErrors || []).length}\n`;
    md += `- Failed requests: ${(data.failedRequests || []).length}\n\n`;
    md += `## Problems\n\n`;
    if (problems.length === 0) md += `None.\n`;
    else problems.forEach(p => { md += `- ${p}\n`; });
    md += `\n## Status\n\n`;
    md += `| Flow | Status |\n|------|--------|\n`;
    md += `| Creator (login, create form) | ${(data.creator && data.creator.loginOk) ? 'OK' : 'Check' } |\n`;
    md += `| Backer (browse, project page) | ${(data.backer && data.backer.browseOk) ? 'OK' : 'Check' } |\n`;
    md += `| Admin (login page, dashboard HTML) | ${(data.admin && data.admin.dashboardOk) ? 'OK' : 'Check' } |\n`;
    fs.writeFileSync(path.join(REPORTS_DIR, 'flows-audit.md'), md);
    console.log('Reports written: reports/flows-audit.json, reports/flows-audit.md');
    return auditJson;
}

async function main() {
    process.env.PORT = String(TEST_PORT);
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
        process.env.MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yallastarter_test';
    }
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'flows-audit-secret';

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
        await runFlowsTests();
    } catch (e) {
        console.error('Flows audit tests failed:', e.message);
    } finally {
        serverProc.kill('SIGTERM');
    }

    generateReports();
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
