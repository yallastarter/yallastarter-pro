/**
 * Clear all users from the database
 * Usage: node scripts/clear-users.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI not set in .env');
    process.exit(1);
}

async function clearUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = require('../models/User');
        const Transaction = require('../models/Transaction');
        const Project = require('../models/Project');

        // Clear all collections
        const userCount = await User.countDocuments();
        const txCount = await Transaction.countDocuments();
        const projCount = await Project.countDocuments();

        await User.deleteMany({});
        await Transaction.deleteMany({});
        await Project.deleteMany({});

        console.log(`✅ Cleared ${userCount} users, ${txCount} transactions, ${projCount} projects`);
        console.log('Database is clean. The admin user will be re-seeded on next server start.');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

clearUsers();
