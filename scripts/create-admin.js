/**
 * scripts/create-admin.js
 * Creates the admin account for YallaStarter.
 * Run: node scripts/create-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL = 'Admin@yallastarter.com';
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'Admin@yallastarter.com';

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
        if (existing) {
            if (existing.role !== 'admin') {
                existing.role = 'admin';
                await existing.save();
                console.log('Existing account upgraded to admin:', ADMIN_EMAIL);
            } else {
                console.log('Admin account already exists:', ADMIN_EMAIL);
            }
            await mongoose.disconnect();
            return;
        }

        const admin = await User.create({
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL.toLowerCase(),
            password: ADMIN_PASSWORD,
            role: 'admin',
            permissions: {
                canManageProjects: true,
                canManageUsers: true,
                canViewTransactions: true,
                canApprovePayouts: true
            }
        });

        console.log('✅ Admin account created successfully!');
        console.log('   Email:    ', ADMIN_EMAIL);
        console.log('   Password: ', ADMIN_PASSWORD);
        console.log('   ID:       ', admin._id.toString());

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error creating admin:', err.message);
        process.exit(1);
    }
}

createAdmin();
