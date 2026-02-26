require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const NEW_PASSWORD = 'Admin@yallastarter.com';

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas');

    const admin = await User.findOne({ role: 'admin' }).select('+password');
    if (!admin) {
        console.log('No admin found!');
        process.exit(1);
    }

    admin.password = NEW_PASSWORD;
    await admin.save();
    console.log(`✅ Password reset for admin: ${admin.email}`);
    console.log(`   New password: ${NEW_PASSWORD}`);

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
