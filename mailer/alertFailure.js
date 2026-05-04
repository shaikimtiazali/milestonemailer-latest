const nodemailer = require("nodemailer");
const { transporter } = require("../utils/helper");
const logger = require("../utils/logger");

async function alertFailure({ jobName, error, data }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.DEV_EMAIL,
      subject: `Job Failure Alert ${jobName}`,
      html: `
        <h3>Job Failed</h3>
        <p><b>Job "${jobName}" failed.</b></p>
        <p>Error: ${error.message}</p>
        <p>Data: ${JSON.stringify(data)}</p>
      `,
    });
    logger.info("Failure alert sent");
  } catch (err) {
    logger.error("Alert email failed:", err.message);
  }
}

module.exports = alertFailure;
