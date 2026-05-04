require("dotenv").config({
  quiet: true,
});
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const logger = require("../utils/logger");

const connection = require("./connection");

const emailQueue = new Queue("emailQueue", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

emailQueue.on("completed", (job) => {
  logger.info(`Job with ID ${job.id} has been completed.`);
});

emailQueue.on("failed", (job) => {
  logger.error(`Job with ID ${job.id} has failed.`);
});
module.exports = emailQueue;
