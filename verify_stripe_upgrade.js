const http = require('http');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const PORT = 3002;
process.env.PORT = PORT;
process.env.NODE_ENV = 'test';

let server;

async function startServer() {
    return new Promise((resolve, reject) => {
        server = spawn('node', ['server.js'], {
            cwd: __dirname,
            env: { ...process.env, PORT }
        });

        server.stdout.on('data', (data) => {
            const msg = data.toString();
            console.log(`[SERVER] ${msg.trim()}`);
            if (msg.includes('started') || msg.includes('running on port')) {
                resolve();
            }
        });

        server.stderr.on('data', (data) => console.error(`[SERVER_ERR] ${data.toString()}`));
        server.on('error', reject);
        setTimeout(() => reject(new Error('Server start timeout')), 15000);
    });
}

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ statusCode: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    try {
        await startServer();
        console.log('✅ Server running.');

        const testEventId = `evt_test_${Date.now()}`;
        const testSessionId = `cs_test_${Date.now()}`;
        const testUserId = '65dbf4f9e8d4a67b8c123456'; // Mock ObjectId format

        const webhookPayload = {
            id: testEventId,
            type: 'checkout.session.completed',
            livemode: false,
            data: {
                object: {
                    id: testSessionId,
                    payment_intent: 'pi_test_123',
                    metadata: {
                        userId: testUserId,
                        coins: '50',
                        amountMinor: '5000',
                        currency: 'sar',
                        type: 'coin_purchase'
                    }
                }
            }
        };

        console.log('\n1. Sending webhook (first time)...');
        const res1 = await request('POST', '/api/coins/webhook', webhookPayload);
        console.log('Response 1:', res1.statusCode, res1.body);

        console.log('\n2. Sending same webhook (duplicate)...');
        const res2 = await request('POST', '/api/coins/webhook', webhookPayload);
        console.log('Response 2:', res2.statusCode, res2.body);

        if (res2.body.duplicate !== true) {
            console.error('❌ Idempotency check failed: Second request should be marked as duplicate.');
        } else {
            console.log('✅ Idempotency check passed.');
        }

        console.log('\n3. Checking Health Endpoint...');
        const resHealth = await request('GET', '/api/coins/health');
        console.log('Health:', resHealth.body);

        console.log('\n✅ Verification complete.');
    } catch (err) {
        console.error('❌ Test failed:', err.message);
    } finally {
        if (server) server.kill();
        process.exit();
    }
}

runTests();
