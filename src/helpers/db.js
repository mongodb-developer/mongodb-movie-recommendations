import { MongoClient } from "mongodb";
import config from "../config.js";

let client;
let db;
let isConnecting = false;

export async function connectDB() {
  if (db) return db;

  // If another thread is in the process of connecting, wait for 200 ms & check
  // again to see if the connection is ready
  if (isConnecting) {
    while (isConnecting && !db) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return db;
  }

  isConnecting = true;

  try {
  const uriWithoutPassword = config.mongoDBURI.replace(/\/\/(.*):(.*)@/, '//****:****@');
    console.log(`🔌 Connecting to MongoDB... at ${uriWithoutPassword}`);
    client = new MongoClient(config.mongoDBURI, {
      maxPoolSize: 10,              
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(config.database);

    console.log("✅ MongoDB connected");

    // Listen for connection loss
    client.on("close", () => {
      console.warn("⚠️ MongoDB connection closed");
      db = null; // Force reconnect on next call
    });

    client.on("error", (err) => {
      console.error("❌ MongoDB client error:", err);
      db = null; // Clear cached db on error
    });

    return db;
  } catch (err) {
    console.error("🚨 MongoDB connection failed:", err.message);
    db = null;
    throw err;
  } finally {
    isConnecting = false;
  }
}

export async function getDB() {
  // The purpose of this function is to avoid the need to create a new database
  // connection every time that an endpoint is called. If we have 
  // already connected to MongoDB, then we reuse that connection, otherwise we
  // create a new connection.
  if (!db) {
    return await connectDB();
  }
  return db;
}