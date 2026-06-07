require("dotenv").config({ quiet: true });
const { Queue } = require("bullmq");
const connection = require("../queue/connection");
const logger = require("../utils/logger");

async function cleanQueue() {
  const queue = new Queue("emailQueue", { connection });

  logger.info("=== BullMQ Queue Cleanup Started ===");

  // 1. Remove job schedulers (replaces deprecated getRepeatableJobs)
  try {
    const schedulers = await queue.getJobSchedulers();
    logger.info(`Found ${schedulers.length} job scheduler(s)`);

    for (const scheduler of schedulers) {
      await queue.removeJobScheduler(scheduler.key);
      logger.info("Removed job scheduler", {
        key: scheduler.key,
        name: scheduler.name,
      });
    }
  } catch (err) {
    logger.error("Failed to remove job schedulers", { error: err.message });
    throw err;
  }

  logger.info("=== Queue Cleanup Completed Successfully ===");
  await queue.close();
}

module.exports = cleanQueue;
