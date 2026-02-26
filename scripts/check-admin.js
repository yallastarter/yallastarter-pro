require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas');

    // List all admin/staff accounts
    const admins = await User.find({ role: { $in: ['admin', 'manager', 'employee'] } }).select('-password');
    console.log('\n=== ADMIN/STAFF ACCOUNTS ===');
    admins.forEach(u => {
        console.log(`  - username: ${u.username}, email: ${u.email}, role: ${u.role}`);
    });

    // Also try to find by email variants
    const byEmail = await User.findOne({ email: 'admin@yallastarter.com' }).select('-password');
    const byEmailCap = await User.findOne({ email: { $regex: /^admin@yallastarter\.com$/i } }).select('-password');
    console.log('\n=== SEARCH: admin@yallastarter.com ===');
    console.log(byEmail ? `Found: ${byEmail.username} role=${byEmail.role}` : 'Not found');
    console.log(byEmailCap ? `Found (case-insensitive): ${byEmailCap.username} role=${byEmailCap.role}` : 'Not found (case-insensitive)');

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
