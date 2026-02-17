#!/usr/bin/env node
/**
 * Run responsive Playwright tests and write reports/responsive-scan.json + .md
 * Usage: node scripts/run-responsive-scan.js
 * Requires: server running on BASE_URL (default http://localhost:3999) or set E2E_BASE_URL
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3999';

function main() {
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const env = { ...process.env, BASE_URL, E2E_BASE_URL: BASE_URL };
    const outPath = path.join(REPORTS_DIR, 'responsive-scan-results.json');
    const child = spawn(
        'npx',
        ['playwright', 'test', 'tests/responsive-scan.spec.js', '--reporter=json'],
        { cwd: path.join(__dirname, '..'), env, shell: true }
    );
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; process.stdout.write(d); });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('close', (code) => {
        try { fs.writeFileSync(outPath, stdout); } catch (e) {}
        let summary = { timestamp: new Date().toISOString(), baseUrl: BASE_URL, passed: 0, failed: 0, failedTests: [] };
        const resultsPath = outPath;
        if (fs.existsSync(resultsPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
                (data.suites || [data]).forEach(s => walk(s));
                function walk(s) {
                    if (s.specs) s.specs.forEach(spec => {
                        (spec.tests || []).forEach(t => {
                            (t.results || []).forEach(r => {
                                if (r.status === 'passed') summary.passed++;
                                else { summary.failed++; summary.failedTests.push((spec.title || '') + ': ' + (t.title || '')); }
                            });
                        });
                    });
                    if (s.suites) s.suites.forEach(walk);
                }
            } catch (e) {}
        }
        fs.writeFileSync(path.join(REPORTS_DIR, 'responsive-scan.json'), JSON.stringify(summary, null, 2));
        let md = `# Responsive Scan Report\n\nGenerated: ${summary.timestamp}\n\n`;
        md += `- Base URL: ${summary.baseUrl}\n`;
        md += `- Passed: ${summary.passed}\n`;
        md += `- Failed: ${summary.failed}\n\n`;
        if (summary.failedTests.length) {
            md += `## Failed\n\n`;
            summary.failedTests.forEach(t => { md += `- ${t}\n`; });
        }
        md += `\n## Viewports tested\n- 390x844 (iPhone)\n- 768x1024 (tablet)\n- 1366x768 (laptop)\n`;
        fs.writeFileSync(path.join(REPORTS_DIR, 'responsive-scan.md'), md);
        console.log('Report written to reports/responsive-scan.md');
        process.exit(code);
    });
}

main();
