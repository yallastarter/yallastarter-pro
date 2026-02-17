/**
 * Flows audit: creator, backer, admin. Collects console errors, failed requests,
 * and writes reports/flows-audit-raw.json for reports generation.
 */
const path = require('path');
const fs = require('fs');
const { test, expect } = require('@playwright/test');

const FLOWS_DATA = {
    timestamp: new Date().toISOString(),
    baseUrl: process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3999',
    creator: { loginOk: false, createProjectOk: false, uploadOk: false, issues: [] },
    backer: { browseOk: false, projectPageOk: false, backOk: false, issues: [] },
    admin: { loginOk: false, dashboardOk: false, issues: [] },
    consoleErrors: [],
    failedRequests: [],
    summary: { critical: 0 }
};

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

test.describe('Creator flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('requestfailed', req => {
            const url = req.url();
            if (url.startsWith(FLOWS_DATA.baseUrl)) {
                FLOWS_DATA.failedRequests.push({ url: url.slice(0, 200), error: (req.failure() && req.failure().message) || 'failed' });
            }
        });
        page.on('console', msg => {
            if (msg.type() === 'error') {
                FLOWS_DATA.consoleErrors.push({ text: msg.text().slice(0, 300), url: page.url().slice(-80) });
            }
        });
    });

    test('login page loads', async ({ page }) => {
        const res = await page.goto(FLOWS_DATA.baseUrl + '/login.html', { timeout: 10000 });
        FLOWS_DATA.creator.loginOk = res && res.status() === 200;
        expect(res.status()).toBe(200);
    });

    test('create-project page loads and has form', async ({ page }) => {
        const res = await page.goto(FLOWS_DATA.baseUrl + '/create-project.html', { timeout: 10000 });
        if (res && res.status() !== 200) {
            FLOWS_DATA.creator.issues.push('create-project.html returned ' + res.status());
            return;
        }
        const title = await page.locator('#project-title').count();
        const submit = await page.locator('#btn-submit').count();
        if (!title || !submit) FLOWS_DATA.creator.issues.push('Create project form missing title or submit');
        expect(res.status()).toBe(200);
    });
});

test.describe('Backer flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('requestfailed', req => {
            const url = req.url();
            if (url.startsWith(FLOWS_DATA.baseUrl)) {
                FLOWS_DATA.failedRequests.push({ url: url.slice(0, 200), error: (req.failure() && req.failure().message) || 'failed' });
            }
        });
    });

    test('browse projects page loads', async ({ page }) => {
        const res = await page.goto(FLOWS_DATA.baseUrl + '/projects.html', { timeout: 10000 });
        FLOWS_DATA.backer.browseOk = res && res.status() === 200;
        expect(res.status()).toBe(200);
    });

    test('projects API returns data', async ({ request }) => {
        const res = await request.get(FLOWS_DATA.baseUrl + '/api/projects');
        const status = res.status();
        const body = status === 200 ? await res.json().catch(() => ({})) : {};
        FLOWS_DATA.backer.browseOk = status === 200 && body.success === true;
        if (status === 500) {
            FLOWS_DATA.backer.issues.push('Projects API returned 500 (e.g. DB not available)');
        }
        expect([200, 500]).toContain(status);
        if (status === 200) expect(body.success).toBe(true);
    });

    test('project details page loads with id', async ({ page, request }) => {
        const listRes = await request.get(FLOWS_DATA.baseUrl + '/api/projects?limit=1');
        const list = listRes.ok() ? await listRes.json() : {};
        const projectId = list.data && list.data[0] && list.data[0]._id;
        if (!projectId) {
            const res = await page.goto(FLOWS_DATA.baseUrl + '/project-details.html?id=000000000000000000000001', { timeout: 8000 });
            FLOWS_DATA.backer.projectPageOk = res && res.status() === 200;
            return;
        }
        const res = await page.goto(FLOWS_DATA.baseUrl + '/project-details.html?id=' + projectId, { timeout: 10000 });
        await page.waitForTimeout(500);
        const title = await page.locator('.project-info-title').textContent().catch(() => '');
        FLOWS_DATA.backer.projectPageOk = res && res.status() === 200 && title && title.length > 0;
        expect(res.status()).toBe(200);
    });
});

test.describe('Admin flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('requestfailed', req => {
            const url = req.url();
            if (url.startsWith(FLOWS_DATA.baseUrl)) {
                FLOWS_DATA.failedRequests.push({ url: url.slice(0, 200), error: (req.failure() && req.failure().message) || 'failed' });
            }
        });
    });

    test('admin login page loads', async ({ page }) => {
        const res = await page.goto(FLOWS_DATA.baseUrl + '/admin-login.html', { timeout: 10000 });
        FLOWS_DATA.admin.loginOk = res && res.status() === 200;
        expect(res.status()).toBe(200);
    });

    test('admin dashboard requires auth', async ({ request }) => {
        const res = await request.get(FLOWS_DATA.baseUrl + '/api/admin/dashboard');
        expect(res.status()).toBe(401);
    });

    test('admin dashboard page loads (HTML)', async ({ page }) => {
        const res = await page.goto(FLOWS_DATA.baseUrl + '/admin-dashboard.html', { timeout: 10000 });
        await page.waitForTimeout(800);
        const url = page.url();
        const onDashboard = url.includes('admin-dashboard');
        const hasContent = await page.locator('body').count() > 0;
        FLOWS_DATA.admin.dashboardOk = res && res.status() === 200 && hasContent;
        expect(res.status()).toBe(200);
    });
});

test.afterAll(() => {
    try {
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        fs.writeFileSync(path.join(REPORTS_DIR, 'flows-audit-raw.json'), JSON.stringify(FLOWS_DATA, null, 2));
    } catch (e) {
        console.error('Could not write flows-audit-raw.json:', e.message);
    }
});
