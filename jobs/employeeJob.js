const connectDB = require("../database/mongo");
const emailQueue = require("../queue/emailQueue");

async function runEmployeeJob() {
  const db = await connectDB();
  const collection = db.collection(process.env.COLLECTION_NAME);

  const today = new Date();

  // Fetch all employees upfront
  const allEmployees = await collection.find({}).toArray();

  // Extract all valid emails once, reused for anniversary BCC
  const allEmails = allEmployees.map((emp) => emp.email).filter(Boolean);

  for (const emp of allEmployees) {
    if (!emp.email) continue;

    const isBirthday =
      emp.birthDay === today.getDate() &&
      emp.birthMonth === today.getMonth() + 1;

    const join = emp.joiningDate ? new Date(emp.joiningDate) : null;

    const isAnniversary =
      join &&
      join.getDate() === today.getDate() &&
      join.getMonth() === today.getMonth();

    if (isBirthday) {
      await emailQueue.add(
        "birthday",
        { employee: emp },
        { jobId: `b-${emp.email}-${today.toDateString()}` },
      );
    }

    if (isAnniversary) {
      const years = today.getFullYear() - join.getFullYear();
      if (!years || years > 0) {
        await emailQueue.add(
          "anniversary",
          { employee: emp, years, allEmails },
          { jobId: `a-${emp.email}-${today.toDateString()}` },
        );
      }
    }
  }
}

module.exports = runEmployeeJob;
