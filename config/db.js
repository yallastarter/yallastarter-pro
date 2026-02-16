const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            // Recommended for Atlas connections
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        console.log('Connecting to MongoDB Atlas...');

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts)
            .then((mongoose) => {
                console.log('MongoDB Atlas connected successfully');
                return mongoose;
            })
            .catch((err) => {
                console.error('MongoDB Atlas connection failed:', err.message);
                cached.promise = null; // Reset so retry is possible
                process.exit(1); // Render will auto-restart the service
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = connectDB;
