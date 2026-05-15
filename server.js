const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const employeeRoutes = require("./routes/employes");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const basicAuth = require("express-basic-auth");
const { serverAdapter } = require("./queue/board");
const logger = require("./utils/logger");
const emailQueue = require("./queue/emailQueue");
const connection = require("./queue/connection");
const { Worker } = require("bullmq");
const runEmployeeJob = require("./jobs/employeeJob");
const sendMail = require("./mailer/sendMail");
const alertFailure = require("./mailer/alertFailure");
const cleanQueue = require("./scripts/cleanQueue");
dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Milestone Mailer API",
      version: "1.0.0",
      description: "Api's for Milestone Mailer",
    },
    servers: [
      {
        url: BASE_URL,
        description:
          process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
  },
  // Path to the API docs (files containing JSDoc comments)
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(helmet());
app.use(compression());
app.use("/employee", employeeRoutes);
app.use("/admin/queues", serverAdapter.getRouter());
app.use(
  "/",
  swaggerUi.serve,
  basicAuth({
    users: { admin: "admin" },
    challenge: true, // Shows the browser's login popup
  }),
  swaggerUi.setup(swaggerSpec),
);

// Worker
const worker = new Worker(
  "emailQueue",
  async (job) => {
    logger.info("Processing Job", { type: job.name });

    if (job.name === "process-employees") {
      return await runEmployeeJob();
    }

    if (job.name === "birthday" || job.name === "anniversary") {
      return await sendMail(job.data, job.name);
    }
  },
  {
    connection,
    // lockDuration: 300000,
    // lockRenewTime: 150000,
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || "5"),
  },
);

worker.on("completed", (job) => {
  logger.info("Job completed", { jobId: job.id });
});

worker.on("failed", async (job, err) => {
  logger.error("Job failed", { jobId: job?.id, error: err.message });

  await alertFailure({
    jobName: job?.name,
    error: err.message,
    data: job?.data,
  });
});

// Scheduler
async function startScheduler() {
  const CRON = "* * * * *"; // Every day at 9:00 AM

  await emailQueue.upsertJobScheduler(
    "process-employees",
    {
      pattern: CRON,
      tz: "Asia/Kolkata",
    },
    {
      opts: {
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 20 },
      },
    },
  );

  logger.info("Scheduler registered", { cron: CRON });
}

async function getScheduledJobs(queue) {
  const repeatable = await queue.getRepeatableJobs();
  logger.info("Repeatable Jobs:", repeatable);
}

(async () => {
  try {
    await cleanQueue();
    await startScheduler();
    await getScheduledJobs(emailQueue);

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${BASE_URL}`);
      logger.info(
        `BullMQ Dashboard is running on port ${BASE_URL}/admin/queues`,
      );
    });
  } catch (err) {
    logger.error("Startup failed", { error: err.message });
    process.exit(1);
  }
})();
