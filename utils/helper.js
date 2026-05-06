require("dotenv").config({
  quiet: true,
});
const nodemailer = require("nodemailer");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  tls: {
    servername: "smtp.office365.com",
  },
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

const calculateYears = (joiningDate) => {
  const joinDate = new Date(joiningDate);
  const today = new Date();

  let years = today.getFullYear() - joinDate.getFullYear();

  const hasNotCompletedYear =
    today.getMonth() < joinDate.getMonth() ||
    (today.getMonth() === joinDate.getMonth() &&
      today.getDate() < joinDate.getDate());

  if (hasNotCompletedYear) {
    years--;
  }

  return years;
};

module.exports = {
  getNext7Days,
  transporter,
  calculateYears,
};
