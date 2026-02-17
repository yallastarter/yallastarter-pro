#!/usr/bin/env node
/**
 * Start server on TEST_PORT (3999), wait for /api/health, run Playwright e2e + API tests,
 * then write reports/e2e-scan.json and reports/e2e-scan.md.
 * Usage: node scripts/run-e2e-scan.js
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

function runPlaywright() {
    return new Promise((resolve, reject) => {
        const env = { ...process.env, BASE_URL: `http://localhost:${TEST_PORT}`, E2E_BASE_URL: `http://localhost:${TEST_PORT}` };
        const p = spawn('npx', ['playwright', 'test', '--reporter=json', '--output=reports/playwright-results.json'], {
            cwd: path.join(__dirname, '..'),
            env,
            shell: true,
            stdio: 'inherit'
        });
        p.on('close', code => (code === 0 ? resolve() : reject(new Error('Playwright exit ' + code))));
    });
}

async function main() {
    process.env.PORT = String(TEST_PORT);
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
        process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/yallastarter_test';
        console.warn('No MONGODB_URI/MONGO_URI; using local test DB (may fail if MongoDB not running).');
    }
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

    let playOk = false;
    try {
        await runPlaywright();
        playOk = true;
    } catch (e) {
        console.error('Playwright run failed:', e.message);
    } finally {
        serverProc.kill('SIGTERM');
    }

    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const resultsPath = path.join(__dirname, '..', 'reports', 'playwright-results.json');
    let summary = { timestamp: new Date().toISOString(), serverPort: TEST_PORT, passed: 0, failed: 0, failedTests: [], critical: 0 };
    if (fs.existsSync(resultsPath)) {
        try {
            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            const suites = results.suites || [results];
            function walk(s) {
                if (s.specs) for (const spec of s.specs) for (const t of spec.tests || []) for (const r of t.results || []) {
                    if (r.status === 'passed') summary.passed++;
                    else { summary.failed++; summary.failedTests.push(spec.title + ': ' + (t.title || '')); }
                }
                if (s.suites) s.suites.forEach(walk);
            }
            walk({ suites });
        } catch (e) {}
    }
    summary.critical = summary.failed;

    fs.writeFileSync(path.join(REPORTS_DIR, 'e2e-scan.json'), JSON.stringify(summary, null, 2));
    let md = `# E2E Scan Report\n\nGenerated: ${summary.timestamp}\n\n`;
    md += `- Server: http://localhost:${summary.serverPort}\n`;
    md += `- Passed: ${summary.passed}\n`;
    md += `- Failed: ${summary.failed}\n`;
    md += `- Critical: ${summary.critical}\n\n`;
    if (summary.failedTests.length) {
        md += `## Failed Tests\n\n`;
        summary.failedTests.forEach(t => { md += `- ${t}\n`; });
    }
    fs.writeFileSync(path.join(REPORTS_DIR, 'e2e-scan.md'), md);
    console.log('E2E report written to reports/e2e-scan.md');
    process.exit(summary.critical > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
