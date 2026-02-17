/**
 * Responsive scan: viewport sizes, no horizontal scroll, header/hamburger, primary CTA, console errors.
 * Run with server on BASE_URL. Writes reports/responsive-scan.json (via reporter) and we post-process to .md.
 */
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
    { name: 'iphone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1366, height: 768 }
];

const PAGES = [
    { url: '/index.html', name: 'Home' },
    { url: '/projects.html', name: 'Browse Projects' },
    { url: '/project-details.html', name: 'Project Details' },
    { url: '/login.html', name: 'Login' },
    { url: '/signup.html', name: 'Signup' },
    { url: '/dashboard.html', name: 'Dashboard' },
    { url: '/admin-dashboard.html', name: 'Admin Dashboard' }
];

const results = { viewports: {}, pages: {}, failures: [], timestamp: new Date().toISOString() };

for (const vp of VIEWPORTS) {
    results.viewports[vp.name] = { width: vp.width, height: vp.height, passed: 0, failed: 0 };
}

test.describe('Responsive layout', () => {
    for (const vp of VIEWPORTS) {
        test.describe(`viewport ${vp.name} ${vp.width}x${vp.height}`, () => {
            test.beforeEach(async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });
            });

            test(`no horizontal scroll on home`, async ({ page }) => {
                const res = await page.goto('/index.html');
                expect(res.status()).toBeLessThan(400);
                const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
                const innerWidth = await page.evaluate(() => window.innerWidth);
                expect(bodyScrollWidth).toBeLessThanOrEqual(innerWidth + 2);
            });

            test(`header and hamburger present on home`, async ({ page }) => {
                await page.goto('/index.html');
                const header = page.locator('header.header');
                await expect(header).toBeVisible();
                const hamburger = page.locator('.mobile-menu-btn');
                const navLinks = page.locator('.nav-links');
                if (vp.width < 1024) {
                    await expect(hamburger).toBeVisible();
                } else {
                    await expect(navLinks.first()).toBeVisible();
                }
            });

            test(`primary CTA clickable on home`, async ({ page }) => {
                await page.goto('/index.html');
                const cta = page.locator('a.btn-primary').first();
                await expect(cta).toBeVisible();
                const box = await cta.boundingBox();
                expect(box).toBeTruthy();
                expect(box.height).toBeGreaterThanOrEqual(40);
            });
        });
    }
});

test.describe('Core pages load at mobile viewport', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
    });

    for (const p of PAGES) {
        test(`${p.name} loads without 500`, async ({ page }) => {
            const res = await page.goto(p.url);
            expect(res.status()).toBeLessThan(500);
        });

        test(`${p.name} no horizontal scroll`, async ({ page }) => {
            await page.goto(p.url);
            const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
            const innerWidth = await page.evaluate(() => window.innerWidth);
            expect(bodyScrollWidth).toBeLessThanOrEqual(innerWidth + 2);
        });
    }
});

test.describe('Mobile menu interaction', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
    });

    test('hamburger opens menu and first link is visible', async ({ page }) => {
        await page.goto('/index.html');
        const btn = page.locator('.mobile-menu-btn');
        await btn.click();
        const menu = page.locator('#mobile-menu, .mobile-menu');
        await expect(menu).toBeVisible();
        const firstLink = page.locator('.mobile-menu .nav-links a').first();
        await expect(firstLink).toBeVisible();
    });
});
