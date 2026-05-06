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
 *     tags: [Employee]
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
    res.json({
      success: true,
      totalEmployees: employees.length,
      data: { employees },
    });
  } catch (error) {
    logger.error("Error fetching employees:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /employee/upcoming-events:
 *   get:
 *     summary: Retrieve upcoming events for employees
 *     tags: [Employee]
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
      .sort({ birthDay: 1 })
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
      .sort({ joiningDate: 1 })
      .toArray();

    // Add years
    const anniversariesWithYears = anniversaries.map((emp) => ({
      ...emp,
      years: new Date().getFullYear() - new Date(emp.joiningDate).getFullYear(),
    }));
    res.json({
      success: true,
      totalEvents: birthdays.length + anniversariesWithYears.length,
      data: {
        birthdays,
        anniversaries: anniversariesWithYears,
      },
    });
  } catch (error) {
    logger.error("Error fetching upcoming events:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /employee/add-employee:
 *   post:
 *     summary: Add a new employee
 *     tags: [Employee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - employeeno
 *               - employeeid
 *               - email
 *               - birthDay
 *               - birthMonth
 *               - joiningDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Shaik Imtiaz Ali"
 *               employeeno:
 *                 type: string
 *                 example: "TEST100"
 *               employeeid:
 *                 type: integer
 *                 example: 999
 *               email:
 *                 type: string
 *                 example: "imtiazali.ali36@gmail.com"
 *               birthDay:
 *                 type: integer
 *                 example: 5
 *               birthMonth:
 *                 type: integer
 *                 example: 5
 *               joiningDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2022-05-04T00:00:00.000Z"
 *           examples:
 *             SampleEmployee:
 *               summary: Sample employee payload
 *               value:
 *                 name: "Shaik Imtiaz Ali"
 *                 employeeno: "TEST100"
 *                 employeeid: 999
 *                 email: "imtiazali.ali36@gmail.com"
 *                 birthDay: 5
 *                 birthMonth: 5
 *                 joiningDate: "2022-05-04T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Employee added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee added successfully"
 */

router.post("/add-employee", async (req, res) => {
  try {
    const db = await connectDB();

    const body = { ...req.body };

    // Convert joiningDate from MongoDB extended JSON to JS Date
    if (body.joiningDate?.$date) {
      body.joiningDate = new Date(body.joiningDate.$date);
    }

    const employee = {
      ...body,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(process.env.COLLECTION_NAME).insertOne(employee);

    res.status(201).json({
      success: true,
      message: "Employee added successfully",
    });
  } catch (error) {
    logger.error("Error adding employee:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /employee/test-birthday:
 *   get:
 *     summary: Test birthday email job
 *     tags: [Employee]
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

  res.json({ success: true, message: "Birthday job added" });
});

/**
 * @swagger
 * /employee/test-anniversary:
 *   get:
 *     summary: Test anniversary email job
 *     tags: [Employee]
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

  res.json({ success: true, message: "Anniversary job added" });
});
module.exports = router;
