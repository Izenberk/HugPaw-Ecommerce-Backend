// config/mongo.js
import mongoose from "mongoose";

export async function connectMongo(explicitUri) {
  // Prefer explicit param, then MONGO_URI, then MONGODB_URI (both supported)
  const uri = explicitUri || process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MongoDB URI. Set MONGO_URI (or MONGODB_URI) in env.");
  }

  // Attach listeners BEFORE connecting
  mongoose.connection.on("connected", () => {
    // mask creds in logs
    const safe = uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    console.log(`✅ MongoDB connected: ${safe}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err?.message || err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
  });

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 20_000,
      // dbName: "hugpaw", // optional: set if your URI doesn't include a db
    });
    return mongoose.connection;
  } catch (err) {
    console.error("💥 Initial MongoDB connection failed:", err?.message || err);
    // In production, fail fast so we don't run the API without a DB
    if (process.env.NODE_ENV === "production") process.exit(1);
    throw err; // let dev see the stack
  }
}
