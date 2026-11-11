const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri === "YOUR_MONGODB_CONNECTION_STRING") {
    throw new Error("MONGODB_URI environment variable is not configured.");
  }

  await mongoose.connect(uri, {
    dbName: "mailapp",
    serverSelectionTimeoutMS: 5000,
  });

  console.log("Connected to MongoDB (mailapp)");
}

module.exports = connectDatabase;
