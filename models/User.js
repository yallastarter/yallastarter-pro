const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'employee', 'manager', 'admin'],
        default: 'user'
    },
    // Granular permissions (used by employee/manager accounts)
    permissions: {
        canManageProjects: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canViewTransactions: { type: Boolean, default: false },
        canApprovePayouts: { type: Boolean, default: false }
    },
    photoUrl: {
        type: String,
        default: null
    },
    coinBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    // Favourite projects (for quick coin sending)
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    bankAccount: {
        accountName: { type: String, default: '' },
        iban: { type: String, default: '' },
        bankName: { type: String, default: '' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    suspended: {
        type: Boolean,
        default: false
    }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1 });

module.exports = mongoose.model('User', UserSchema);
