const nodemailer = require("nodemailer");
const renderTemplate = require("../templates/renderTemplate");
const { transporter } = require("../utils/helper");
const logger = require("../utils/logger");

async function sendMail(data, type) {
  if (!["birthday", "anniversary"].includes(type)) return;
  const user = data?.employee;

  if (!user || !user.email) {
    throw new Error(
      `Missing employee email in job data: ${JSON.stringify(data)}`,
    );
  }

  const to = [user.email];
  const cc = process.env.MANAGER_EMAIL ? [process.env.MANAGER_EMAIL] : [];
  let bcc = [];

  if (type === "anniversary") {
    const allEmails = (data.allEmails || []).filter(Boolean);

    bcc = [...new Set(allEmails)].filter(
      (email) => email !== user.email && !cc.includes(email),
    );
  }

  let subject = "";
  let html = "";

  // BIRTHDAY
  if (type === "birthday") {
    subject = `Happy Birthday ${user.name}!`;

    html = renderTemplate("birthday", {
      name: user.name,
      company: process.env.COMPANY_NAME,
    });
  }

  // ANNIVERSARY
  if (type === "anniversary") {
    const years = data.years;

    if (!years || years <= 0) {
      throw new Error(`Invalid anniversary years (${years}) for ${user.email}`);
    }

    const yearLabel = years > 1 ? "Years" : "Year";

    subject = `${user.name} - ${years} ${yearLabel} Anniversary`;

    html = renderTemplate("anniversary", {
      name: user.name,
      years,
      yearLabel,
      company: process.env.COMPANY_NAME,
    });
  }

  logger.info("Sending email", {
    type,
    to,
    cc,
    bccCount: bcc.length,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      cc,
      bcc,
      subject,
      html,
    });

    logger.info("Email Sent", {
      type,
      employee: user.email,
    });
  } catch (error) {
    logger.error("Email Failed", {
      error: error.message,
      user: user.email,
    });

    throw error;
  }
}

module.exports = sendMail;
