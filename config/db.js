const mongoose = require('mongoose');
require('dotenv').config(); // Ensure environment variables are loaded

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit the process with a failure code
    }
};

module.exports = connectDB;
