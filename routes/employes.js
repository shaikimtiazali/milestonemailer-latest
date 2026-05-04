const express = require("express");
const connectDB = require("../database/mongo");
const { getNext7Days } = require("../utils/helper");
const logger = require("../utils/logger");
const emailQueue = require("../queue/emailQueue");
const router = express.Router();

/**
 * @swagger
 * /employee/all:
 *   get:
 *     summary: Retrieve a list of employees
 *     description: Returns an array of employee objects.
 *     responses:
 *       200:
 *         description: A list of employees.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */

router.get("/all", async (req, res) => {
  try {
    const db = await connectDB();
    const employees = await db
      .collection(process.env.COLLECTION_NAME)
      .find({})
      .toArray();
    res.json(employees);
  } catch (error) {
    logger.error("Error fetching employees:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /employee/upcoming-events:
 *   get:
 *     summary: Retrieve upcoming events for employees
 *     description: Returns a list of upcoming birthdays and anniversaries.
 *     responses:
 *       200:
 *         description: A list of upcoming events.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */

router.get("/upcoming-events", async (req, res) => {
  try {
    const db = await connectDB();
    const upcomingDates = getNext7Days();
    //Birthdays
    const birthdays = await db
      .collection(process.env.COLLECTION_NAME)
      .find({
        $or: upcomingDates.map((d) => ({
          birthDay: d.day,
          birthMonth: d.month,
        })),
      })
      .toArray();
    //Anniversaries
    const anniversaries = await db
      .collection(process.env.COLLECTION_NAME)
      .find({
        $or: upcomingDates.map((d) => ({
          $expr: {
            $and: [
              { $eq: [{ $dayOfMonth: "$joiningDate" }, d.day] },
              { $eq: [{ $month: "$joiningDate" }, d.month] },
            ],
          },
        })),
      })
      .toArray();

    // Add years
    const anniversariesWithYears = anniversaries.map((emp) => ({
      ...emp,
      years: new Date().getFullYear() - new Date(emp.joiningDate).getFullYear(),
    }));
    res.json({
      success: true,
      data: {
        birthdays,
        anniversaries: anniversariesWithYears,
      },
    });
  } catch (error) {
    logger.error("Error fetching upcoming events:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /employee/add-employee:
 *   post:
 *     summary: Add a new employee
 *     description: Creates a new employee record.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   name:
 *                     type: string
 */

router.post("/employee", async (req, res) => {
  try {
    const db = await connectDB();

    const employee = {
      ...req.body,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(process.env.COLLECTION_NAME).insertOne(employee);

    res.status(201).json({
      message: "Employee added successfully",
    });
  } catch (error) {
    logger.error("Error adding employee:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /employee/test-birthday:
 *   get:
 *     summary: Test birthday email job
 *     description: Adds a birthday email job to the queue.
 *     responses:
 *       200:
 *         description: Birthday job added.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */

router.get("/test-birthday", async (req, res) => {
  await emailQueue.add("birthday", {
    employee: {
      name: "Imtiaz Ali",
      email: "imtiazali.ali36@gmail.com",
      birthDay: 8,
      birthMonth: 4,
      joiningDate: "2023-04-08",
    },
    allEmails: [
      "imtiazali.ali36@gmail.com",
      "shaikimtiazali6@gmail.com",
      "imtiazalis@aapmor.com",
    ],
  });

  res.send("Birthday job added");
});

/**
 * @swagger
 * /employee/test-anniversary:
 *   get:
 *     summary: Test anniversary email job
 *     description: Adds an anniversary email job to the queue.
 *     responses:
 *       200:
 *         description: Anniversary job added.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */

router.get("/test-anniversary", async (req, res) => {
  await emailQueue.add("anniversary", {
    employee: {
      name: "Imtiaz Ali",
      email: "imtiazali.ali36@gmail.com",
      joiningDate: "2023-05-04",
    },
    years: 3,
    allEmails: [
      "shaikimtiazali6@gmail.com",
      "imtiazalis@aapmor.com",
      process.env.MANAGER_EMAIL,
    ],
  });

  res.send("Anniversary job added");
});
module.exports = router;
