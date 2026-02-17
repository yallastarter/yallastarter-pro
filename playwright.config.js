// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3999';

module.exports = defineConfig({
    testDir: './tests',
    outputDir: './reports/playwright-output',
    reporter: [
        ['list'],
        ['html', { outputFolder: './reports/playwright-html', open: 'never' }],
        ['json', { outputFile: './reports/playwright-results.json' }]
    ],
    use: {
        baseURL: BASE_URL,
        trace: 'off',
        video: 'off',
        screenshot: 'off',
        ignoreHTTPSErrors: true
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    timeout: 15000,
    expect: { timeout: 5000 }
});
