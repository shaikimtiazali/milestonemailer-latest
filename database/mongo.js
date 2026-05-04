const { MongoClient } = require("mongodb");
const Logger = require("../utils/logger");
let db;

async function connectDB() {
  if (db) return db;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.DB_NAME);
  Logger.info("Connected to MongoDB");
  return db;
}

module.exports = connectDB;
