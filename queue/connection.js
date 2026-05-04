require("dotenv").config({
  quiet: true,
});
const IORedis = require("ioredis");
const logger = require("../utils/logger");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  db: 0,
});

connection.on("connect", () => {
  logger.info("Connected to Redis successfully.");
});

connection.on("error", (err) => {
  logger.error("Redis connection error:", err);
});

module.exports = connection;
