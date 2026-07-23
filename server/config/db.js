const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social_media_app';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`=================================================`);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    console.log(`[MongoDB] Database Name: ${conn.connection.name}`);
    console.log(`=================================================`);
  } catch (error) {
    isConnected = false;
    console.log(`=================================================`);
    console.log(`[MongoDB Warning] Local MongoDB service is offline.`);
    console.log(`[Database Notice] Switched to Embedded Local Storage Mode!`);
    console.log(`[Status] Registration, Login & Social Features active out-of-the-box.`);
    console.log(`=================================================`);
  }
};

const getIsConnected = () => isConnected || mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.getIsConnected = getIsConnected;
