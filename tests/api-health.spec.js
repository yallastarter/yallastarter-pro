/**
 * API health and contract checks.
 * Run with server on BASE_URL (default http://localhost:3999).
 */
const { test, expect } = require('@playwright/test');

test('GET /api/health returns 200 and status ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
});

test('POST /api/auth/login without body returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
});

test('POST /api/auth/signup without body returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/signup', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
});

test('GET /api/projects returns 200 and array', async ({ request }) => {
    const res = await request.get('/api/projects');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(Array.isArray(body.data)).toBe(true);
});

test('GET /api/admin/dashboard without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/dashboard');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
});

test('GET /api/coins/balance without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/coins/balance');
    expect(res.status()).toBe(401);
});
