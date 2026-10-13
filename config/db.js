const mongoose = require('mongoose');

let mongoServer = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/driveease';
    
    // Attempt standard connection first with 3s timeout
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[DriveEase DB] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[DriveEase DB] Production MongoDB Connection Error:', err.message);
        throw err;
      }

      console.warn('[DriveEase DB] Standard MongoDB connection not available. Falling back to MongoDB In-Memory Server for zero-friction local development & testing...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create({
        instance: {
          launchTimeout: 120000,
        },
      });
      const memUri = mongoServer.getUri();
      
      const conn = await mongoose.connect(memUri);
      console.log(`[DriveEase DB] Embedded MongoDB In-Memory Server Connected at ${memUri}`);
      return conn;
    }
  } catch (error) {
    console.error(`[DriveEase DB] Critical Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
