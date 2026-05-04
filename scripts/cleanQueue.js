// scripts/cleanQueue.js
require("dotenv").config();
const { Queue } = require("bullmq");

const connection = require("../queue/connection");

async function cleanQueue() {
  const queue = new Queue("emailQueue", { connection });

  // See all repeatable jobs currently in Redis
  const repeatableJobs = await queue.getRepeatableJobs();
  console.log("Current repeatable jobs:", repeatableJobs);

  // Remove all repeatable jobs
  for (const job of repeatableJobs) {
    await queue.removeRepeatableByKey(job.key);
    console.log(`Removed job: ${job.key}`);
  }

  console.log("Done. All old repeatable jobs cleared.");
  await queue.close();
  process.exit(0);
}

cleanQueue().catch((err) => {
  console.error(err);
  process.exit(1);
});
