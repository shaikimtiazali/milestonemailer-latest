const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const employeeRoutes = require("./routes/employes");
// const morgan = require("morgan");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { serverAdapter } = require("./queue/board");
const logger = require("./utils/logger");
const emailQueue = require("./queue/emailQueue");
const connection = require("./queue/connection");
const { Worker } = require("bullmq");
const runEmployeeJob = require("./jobs/employeeJob");
const sendMail = require("./mailer/sendMail");
const alertFailure = require("./mailer/alertFailure");
dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Milestone Mailer API with Swagger",
      version: "1.0.0",
      description: "Api's for Milestone Mailer",
    },
    servers: [
      {
        url: process.env.BASE_URL || `http://localhost:${PORT}`,
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
// app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://milestonemailer-latest.onrender.com", // your Render URL
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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("Welcome to the Milestone Mailer API");
});

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
    lockDuration: 300000,
    lockRenewTime: 150000,
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
  const CRON = "0 9 * * *"; // Every day at 9:00 AM
  const existingJob = await emailQueue.getJob("process-employees");
  if (existingJob) {
    logger.info("Existing scheduler job found, skipping creation");
    return;
  }

  await emailQueue.add(
    "process-employees",
    {},
    {
      jobId: "process-employees",
      repeat: { cron: CRON, tz: "Asia/Kolkata" },
    },
  );

  logger.info("Scheduler Started", { cron: CRON });
}

(async () => {
  try {
    await startScheduler();

    app.listen(PORT, () => {
      logger.info(`Server is running on port http://localhost:${PORT}`);
      logger.info(
        `BullMQ Dashboard is running on port http://localhost:${PORT}/admin/queues`,
      );
    });
  } catch (err) {
    logger.error("Startup failed", { error: err.message });
    process.exit(1);
  }
})();
