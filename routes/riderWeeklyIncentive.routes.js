const express = require("express");
const router = express.Router();
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const controller = require("../controllers/riderWeeklyIncentive.controller");

/**
 * @swagger
 * tags:
 *   name: Rider Weekly Programs
 *   description: Rider APIs for Weekly Programs (Incentives)
 */

/**
 * @swagger
 * /api/rider/programs/weekly:
 *   get:
 *     summary: Get available weekly incentive programs
 *     description: Returns all active weekly incentives available for the rider based on pincode.
 *     tags: [Rider Weekly Programs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Incentives fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - programId: "prog_1"
 *                   name: "Weekly Superstar Bonus"
 *                   type: "WEEKLY"
 *                   ruleType: "SLAB"
 *                   validFrom: "2026-05-01"
 *                   validTill: "2026-06-30"
 *                   maxReward: 2000
 */
router.get("/rider/programs/weekly",
  riderAuthMiddleWare,
  controller.getRiderWeeklyPrograms
);



/**
 * @swagger
 * /api/rider/programs/weekly/progress:
 *   get:
 *     summary: Get rider weekly incentive progress
 *     description: Returns progress (orders, rewards, status) for rider incentives.
 *     tags: [Rider Weekly Programs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - programId: "prog_1"
 *                   type: "WEEKLY"
 *                   ordersCompleted: 45
 *                   rewardEarned: 800
 *                   status: "IN_PROGRESS"
 */
router.get("/rider/programs/weekly/progress",
  riderAuthMiddleWare,
  controller.getWeeklyIncentives
);

module.exports = router;