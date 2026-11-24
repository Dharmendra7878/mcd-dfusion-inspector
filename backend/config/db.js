const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Fatal: MONGO_URI is not set. Add it to backend/.env.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Fatal: MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
