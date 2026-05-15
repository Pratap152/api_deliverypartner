const express = require("express");
const adminRouter = express.Router();

const { createWeeklySlots } = require("../controllers/adminSlotController");

adminRouter.post("/create-weekly", createWeeklySlots);

module.exports = adminRouter;
