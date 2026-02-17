const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function connectDB(retries = MAX_RETRIES) {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        // Mongoose 7+ defaults strictQuery to false; be explicit
        mongoose.set('strictQuery', false);

        const opts = {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        // Support both MONGO_URI and MONGODB_URI (Atlas / Render convention)
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('FATAL: No MongoDB URI. Set MONGODB_URI or MONGO_URI.');
            process.exit(1);
        }
        const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
        console.log(`Connecting to MongoDB (${maskedUri.substring(0, 60)}...)`);

        cached.promise = mongoose.connect(mongoUri, opts)
            .then((mongoose) => {
                console.log('✅ MongoDB connected successfully');
                return mongoose;
            })
            .catch(async (err) => {
                console.error(`❌ MongoDB connection failed: ${err.message}`);
                cached.promise = null; // Reset so retry is possible

                if (retries > 0) {
                    console.log(`   Retrying in ${RETRY_DELAY / 1000}s... (${retries} attempts remaining)`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return connectDB(retries - 1);
                }

                console.error('FATAL: All MongoDB connection attempts failed. Exiting.');
                process.exit(1); // Render will auto-restart the service
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = connectDB;

