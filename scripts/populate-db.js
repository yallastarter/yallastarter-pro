
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Project = require('../models/Project');
const Transaction = require('../models/Transaction');

dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/yallastarter';

const users = [
    { username: 'creator1', email: 'creator1@example.com', password: 'password123', role: 'user', coinBalance: 500, totalEarned: 1000, totalSpent: 0 },
    { username: 'backer1', email: 'backer1@example.com', password: 'password123', role: 'user', coinBalance: 1000, totalEarned: 2000, totalSpent: 1000 },
    { username: 'whale_investor', email: 'whale@example.com', password: 'password123', role: 'user', coinBalance: 50000, totalEarned: 100000, totalSpent: 50000 }
];

const projects = [
    { title: 'Eco-Friendly Smart Watch', description: 'A solar-powered smartwatch made from recycled materials.', category: 'Tech', goalAmount: 5000, currentAmount: 1200, status: 'active' },
    { title: 'Learn Arabic VR', description: 'Immersive VR experience to learn Arabic languages.', category: 'Education', goalAmount: 10000, currentAmount: 8500, status: 'active' },
    { title: 'Community Garden Riyadh', description: 'Urban gardening project for the community.', category: 'Community', goalAmount: 2000, currentAmount: 2000, status: 'completed' },
    { title: 'Indie Film: Desert Rose', description: 'A short film about Bedouin culture.', category: 'Film', goalAmount: 15000, currentAmount: 0, status: 'draft' }
];

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const seedData = async () => {
    await connectDB();

    try {
        // Create Users
        console.log('Seeding Users...');
        const createdUsers = [];
        for (const u of users) {
            let user = await User.findOne({ email: u.email });
            if (!user) {
                user = await User.create(u);
            }
            createdUsers.push(user);
        }

        // Create Projects
        console.log('Seeding Projects...');
        const createdProjects = [];
        for (let i = 0; i < projects.length; i++) {
            const p = projects[i];
            const creator = createdUsers[0]; // Assign to first creator
            let project = await Project.findOne({ title: p.title });
            if (!project) {
                project = await Project.create({ ...p, creator: creator._id });
            }
            createdProjects.push(project);
        }

        // Create Transactions (Past 30 days)
        console.log('Seeding Transactions...');
        const backer = createdUsers[1];
        const whale = createdUsers[2];

        // Random purchases
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            await Transaction.create({
                type: 'purchase',
                from: backer._id,
                amount: Math.floor(Math.random() * 500) + 100,
                status: 'completed',
                stripeSessionId: `sess_${Math.random()}`,
                createdAt: date
            });
        }

        // Whale purchase
        await Transaction.create({
            type: 'purchase',
            from: whale._id,
            amount: 50000,
            status: 'completed',
            stripeSessionId: `sess_whale_${Math.random()}`,
            createdAt: new Date()
        });

        // Sends
        for (let i = 0; i < 5; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 20));

            await Transaction.create({
                type: 'send',
                from: backer._id,
                to: createdUsers[0]._id,
                project: createdProjects[1]._id,
                amount: 100,
                status: 'completed',
                createdAt: date
            });
        }

        console.log('✅ Database populated with dummy data!');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
