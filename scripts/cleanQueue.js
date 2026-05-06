require("dotenv").config({ quiet: true });
const { Queue } = require("bullmq");

const connection = require("../queue/connection");

async function cleanQueue() {
  const queue = new Queue("emailQueue", { connection });

  console.log("Cleaning BullMQ Queue...\n");

  // 1. Remove repeatable jobs
  const repeatableJobs = await queue.getRepeatableJobs();
  console.log(`Found ${repeatableJobs.length} repeatable jobs`);

  for (const job of repeatableJobs) {
    await queue.removeRepeatableByKey(job.key);
    console.log(`Removed repeatable job: ${job.key}`);
  }

  // 2. Clean all job states
  console.log("Cleaning job states...");

  await queue.drain(true); // removes waiting + delayed
  console.log("Waiting & delayed jobs cleared");

  await queue.clean(0, 1000, "active");
  console.log("Active jobs cleared");

  await queue.clean(0, 1000, "completed");
  console.log("Completed jobs cleared");

  await queue.clean(0, 1000, "failed");
  console.log("Failed jobs cleared");

  // Optional: paused jobs
  await queue.clean(0, 1000, "paused");
  console.log("Paused jobs cleared");

  console.log("Queue cleanup completed successfully!");

  await queue.close();
  process.exit(0);
}

cleanQueue().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
