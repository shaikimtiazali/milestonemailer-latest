require("dotenv").config({
  quiet: true,
});
const nodemailer = require("nodemailer");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Verify SMTP once
(async () => {
  try {
    await transporter.verify();
  } catch (err) {
    logger.error("SMTP Error", { error: err.message });
  }
})();

function getNext7Days() {
  const dates = [];

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);

    dates.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
    });
  }

  return dates;
}

module.exports = {
  getNext7Days,
  transporter,
};
