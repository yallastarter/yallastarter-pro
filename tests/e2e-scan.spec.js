/**
 * E2E scan: home page load, nav links, key CTAs, network/console failures.
 * Run with server on BASE_URL (default http://localhost:3999).
 * Generates reports/e2e-scan.json and reports/e2e-scan.md via post-process (see scripts/e2e-scan.js).
 */
const { test, expect } = require('@playwright/test');

const FAILED_REQUESTS = [];
const CONSOLE_ERRORS = [];

test.beforeEach(async ({ page }) => {
    page.on('requestfailed', req => {
        const url = req.url();
        if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('onrender.com')) {
            FAILED_REQUESTS.push({ url: url.slice(0, 200), failure: req.failure()?.message || 'unknown' });
        }
    });
    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error') {
            const text = msg.text();
            CONSOLE_ERRORS.push({ text: text.slice(0, 300), location: msg.location().url?.()?.slice(-80) });
        }
    });
});

test('home page loads', async ({ page }) => {
    const res = await page.goto('/index.html');
    expect(res.status()).toBe(200);
});

test('login page loads', async ({ page }) => {
    const res = await page.goto('/login.html');
    expect(res.status()).toBe(200);
});

test('signup page loads', async ({ page }) => {
    const res = await page.goto('/signup.html');
    expect(res.status()).toBe(200);
});

test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForURL(/\/(login|dashboard\.html)/, { timeout: 5000 }).catch(() => {});
    const url = page.url();
    const hasLogin = url.includes('login');
    const hasDashboardWithAuth = url.includes('dashboard') && (url.includes('token=') || await page.evaluate(() => !!localStorage.getItem('token')));
    expect(hasLogin || hasDashboardWithAuth).toBeTruthy();
});

test('projects page loads', async ({ page }) => {
    const res = await page.goto('/projects.html');
    expect(res.status()).toBe(200);
});

test('coins page redirects or loads', async ({ page }) => {
    const res = await page.goto('/coins.html');
    expect([200, 302]).toContain(res.status());
});

test('main nav links from home', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');
    const navLinks = await page.locator('nav a[href], .navbar a[href], .nav-links a[href]').all();
    const hrefs = [];
    for (const a of navLinks.slice(0, 15)) {
        const href = await a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) hrefs.push(href);
    }
    for (const href of hrefs) {
        const path = href.startsWith('http') ? new URL(href).pathname : href.split('?')[0];
        if (!path.endsWith('.html') && path !== '/' && !path.startsWith('/api')) continue;
        const res = await page.goto(path.startsWith('/') ? path : '/' + path, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => null);
        if (res && res.status() >= 400) {
            FAILED_REQUESTS.push({ url: path, failure: `HTTP ${res.status()}` });
        }
    }
});

test('API health', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
});
