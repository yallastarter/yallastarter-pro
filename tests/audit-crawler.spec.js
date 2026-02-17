/**
 * Full platform audit: crawl pages, record status/console/network,
 * check header/sidebar, test button clicks. Writes reports/audit-raw.json
 * for post-processing into reports/audit.json and reports/audit.md.
 * Run: node scripts/run-audit-crawler.js (starts server + runs this spec).
 */
const path = require('path');
const fs = require('fs');
const { test, expect } = require('@playwright/test');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

const AUDIT_DATA = {
    timestamp: new Date().toISOString(),
    baseUrl: process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3999',
    pages: [],
    consoleErrors: [],
    failedRequests: [],
    buttonChecks: [],
    viewports: { mobile: { w: 390, h: 844 }, tablet: { w: 768, h: 1024 }, desktop: { w: 1366, h: 768 } },
    summary: { totalPages: 0, ok: 0, errors: 0, critical: 0 }
};

function pushPage(url, status, hasHeader, hasSidebar, consoleCount, failedCount, note) {
    const entry = { url, status, hasHeader, hasSidebar, consoleErrors: consoleCount, failedRequests: failedCount };
    if (note) entry.note = note;
    AUDIT_DATA.pages.push(entry);
    if (status >= 400) AUDIT_DATA.summary.critical++;
    else if (status === 200) AUDIT_DATA.summary.ok++;
    else AUDIT_DATA.summary.errors++;
    AUDIT_DATA.summary.totalPages++;
}

test.describe('Audit crawler', () => {
    test.beforeEach(async ({ page }) => {
        const base = AUDIT_DATA.baseUrl;
        page.on('requestfailed', req => {
            const url = req.url();
            if (url.startsWith(base) || url.includes('localhost') || url.includes('127.0.0.1')) {
                AUDIT_DATA.failedRequests.push({ url: url.slice(0, 250), error: (req.failure() && req.failure().message) || 'failed' });
            }
        });
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                AUDIT_DATA.consoleErrors.push({ text: text.slice(0, 400), url: page.url().slice(-100) });
            }
        });
    });

    test('crawl public and key pages', async ({ page }) => {
        const base = AUDIT_DATA.baseUrl;
        const urls = [
            '/', '/index.html', '/login.html', '/signup.html', '/projects.html',
            '/dashboard.html', '/coins.html', '/how-it-works.html', '/about.html', '/contact.html'
        ];
        for (const path of urls) {
            const pageErrorsBefore = AUDIT_DATA.consoleErrors.length;
            const failedBefore = AUDIT_DATA.failedRequests.length;
            const res = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => null);
            const status = res ? res.status() : 0;
            await page.waitForTimeout(800);
            const hasHeader = await page.locator('.header, header, .navbar, nav').first().count() > 0;
            const finalUrl = page.url();
            const isDashboardOrCoins = /dashboard\.html|coins\.html/.test(finalUrl);
            const hasSidebar = isDashboardOrCoins ? (await page.locator('.dashboard-sidebar').count() > 0) : null;
            const consoleCount = AUDIT_DATA.consoleErrors.length - pageErrorsBefore;
            const failedCount = AUDIT_DATA.failedRequests.length - failedBefore;
            pushPage(path || '/', status, hasHeader, hasSidebar, consoleCount, failedCount, isDashboardOrCoins ? (hasSidebar === false ? 'redirected to login or missing sidebar' : null) : null);
        }
    });

    test('coins page has sidebar and balance section when on coins page', async ({ page }) => {
        const base = AUDIT_DATA.baseUrl;
        const res = await page.goto(base + '/coins.html', { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => null);
        const status = res ? res.status() : 0;
        await page.waitForTimeout(1000);
        const finalUrl = page.url();
        const onCoinsPage = finalUrl.includes('coins');
        const hasSidebar = onCoinsPage ? (await page.locator('.dashboard-sidebar').count() > 0) : null;
        const hasBalance = onCoinsPage ? (await page.locator('#balanceDisplay, .wallet-balance').count() > 0) : null;
        AUDIT_DATA.buttonChecks.push({
            page: '/coins.html',
            check: 'sidebar_and_balance',
            hasSidebar,
            hasBalance,
            status,
            onCoinsPage
        });
        if (onCoinsPage && !hasSidebar) AUDIT_DATA.summary.critical++;
    });

    test('coins preset buttons and Buy CTA when on coins page', async ({ page }) => {
        const base = AUDIT_DATA.baseUrl;
        await page.goto(base + '/coins.html', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);
        const onCoinsPage = page.url().includes('coins');
        const preset = onCoinsPage && (await page.locator('.quick-amount-btn').first().count() > 0);
        const buyBtn = onCoinsPage && (await page.locator('#buyBtn, button.coin-btn.buy').first().count() > 0);
        let presetWorked = false;
        if (preset) {
            await page.locator('.quick-amount-btn[data-amount="50"]').first().click().catch(() => {});
            await page.waitForTimeout(200);
            const val = await page.locator('#buyAmount').inputValue().catch(() => '');
            presetWorked = val === '50';
        }
        AUDIT_DATA.buttonChecks.push({
            page: '/coins.html',
            check: 'preset_and_buy_btn',
            onCoinsPage,
            presetButtonsExist: !!preset,
            buyButtonExists: !!buyBtn,
            presetClickSetsAmount: presetWorked
        });
    });

    test('viewport responsiveness - no horizontal scroll on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const res = await page.goto(AUDIT_DATA.baseUrl + '/index.html', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
        if (!res || res.status() !== 200) return;
        await page.waitForTimeout(500);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        const overflow = scrollWidth > clientWidth + 5;
        AUDIT_DATA.buttonChecks.push({
            page: 'viewport',
            check: 'mobile_no_horizontal_scroll',
            viewport: '390x844',
            scrollWidth,
            clientWidth,
            horizontalOverflow: overflow
        });
        if (overflow) AUDIT_DATA.summary.critical++;
    });
});

test.afterAll(() => {
    try {
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        fs.writeFileSync(path.join(REPORTS_DIR, 'audit-raw.json'), JSON.stringify(AUDIT_DATA, null, 2));
    } catch (e) {
        console.error('Could not write audit-raw.json:', e.message);
    }
});
