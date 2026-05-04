const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const emailQueue = require("./emailQueue");

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue } = createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

module.exports = {
  serverAdapter,
  addQueue,
};
