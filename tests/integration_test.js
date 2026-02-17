const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.TEST_PORT || 3099; // Avoid conflict with dev server (3000) or other tests
process.env.PORT = PORT;

// Import the app
const app = require('../server');

let server;
let testUserToken;
let testUserId;
let testProjectId;

const TEST_USER = {
    username: 'test_user_integration',
    email: 'test_integration@example.com',
    password: 'password123'
};

const TEST_PROJECT = {
    title: 'Test Integration Project',
    description: 'A project created during automated integration testing.',
    category: 'technology',
    location: 'Riyadh',
    goalAmount: 1000,
    currentAmount: 0,
    deadline: new Date(Date.now() + 86400000) // Tomorrow
};

async function runTests() {
    try {
        console.log('Starting Integration Tests...');

        // Start Server
        await new Promise((resolve) => {
            server = app.listen(PORT, () => {
                console.log(`Test server running on port ${PORT}`);
                resolve();
            });
        });

        // wait for DB connection
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 1. Signup
        console.log('\n--- Testing Signup ---');
        await makeRequest('/api/auth/signup', 'POST', TEST_USER)
            .then(data => {
                if (data.success) {
                    console.log('Signup Successful');
                    testUserToken = data.token;
                    testUserId = data.user.id;
                } else {
                    console.error('Signup Error Data:', JSON.stringify(data, null, 2));
                    throw new Error(`Signup Failed: ${data.message}`);
                }
            });

        // 2. Login
        console.log('\n--- Testing Login ---');
        await makeRequest('/api/auth/login', 'POST', {
            email: TEST_USER.email,
            password: TEST_USER.password
        }).then(data => {
            if (data.success && data.token) {
                console.log('Login Successful');
                // Ensure token works
                testUserToken = data.token;
            } else {
                throw new Error(`Login Failed: ${data.message}`);
            }
        });

        // 3. Create Project
        console.log('\n--- Testing Create Project ---');
        await makeRequest('/api/projects', 'POST', TEST_PROJECT, testUserToken)
            .then(data => {
                if (data.success) {
                    console.log('Create Project Successful');
                    testProjectId = data.data._id;
                } else {
                    throw new Error(`Create Project Failed: ${data.error}`);
                }
            });

        // 4. Get Project Details
        console.log('\n--- Testing Get Project Details ---');
        await makeRequest(`/api/projects/${testProjectId}`, 'GET')
            .then(data => {
                if (data.success && data.data.title === TEST_PROJECT.title) {
                    console.log('Get Project Details Successful');
                } else {
                    throw new Error('Get Project Details Failed or Data Mismatch');
                }
            });

        console.log('\nTests Completed Successfully!');

    } catch (error) {
        console.error('\nTEST FAILED:', error.message);
    } finally {
        // Cleanup
        if (testUserId) {
            await User.findByIdAndDelete(testUserId);
            console.log('Test User Deleted');
        }
        if (testProjectId) {
            await Project.findByIdAndDelete(testProjectId);
            console.log('Test Project Deleted');
        }

        mongoose.connection.close();
        server.close();
        process.exit(0);
    }
}

function makeRequest(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

runTests();
