const express = require("express");
const router = express.Router();

const {
  getDailyIncentive,
  getRiderDailyPrograms,
} = require("../controllers/riderDailyIncentive.controller");

const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");

/**
 * @swagger
 * /api/rider/program/daily/progress:
 *   get:
 *     summary: Get daily incentive for logged-in rider
 *     tags: [Rider Daily Incentives]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */

router.get("/rider/program/daily/progress", riderAuthMiddleWare, getDailyIncentive);

/**
 * @swagger
 * /api/rider/programs/daily:
 *   get:
 *     summary: Get daily incentives for logged-in rider
 *     description: Returns active daily incentive programs based on rider location (pincode and city).
 *     tags: [Rider Daily Incentives]
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Daily incentives fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       programId:
 *                         type: string
 *                         example: "abc123"
 *
 *                       name:
 *                         type: string
 *                         example: "Daily Order Boost"
 *
 *                       type:
 *                         type: string
 *                         example: "DAILY"
 *
 *                       ruleType:
 *                         type: string
 *                         enum: [SLAB, FIXED_TARGET, HYBRID]
 *
 *                       status:
 *                         type: string
 *                         enum: [UPCOMING, RUNNING, EXPIRED]
 *
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *
 *                       validTill:
 *                         type: string
 *                         format: date-time
 *
 *                       maxReward:
 *                         type: number
 *                         example: 300
 *
 *                       slabs:
 *                         type: array
 *                         description: Present only for SLAB type
 *                         items:
 *                           type: object
 *                           properties:
 *                             minOrders:
 *                               type: number
 *                               example: 10
 *                             maxOrders:
 *                               type: number
 *                               example: 20
 *                             rewardAmount:
 *                               type: number
 *                               example: 100
 *
 *                       target:
 *                         type: object
 *                         description: Present only for FIXED_TARGET type
 *                         properties:
 *                           orders:
 *                             type: number
 *                             example: 20
 *
 *                       reward:
 *                         type: object
 *                         description: Present for FIXED_TARGET and HYBRID
 *                         properties:
 *                           amount:
 *                             type: number
 *                             example: 200
 *
 *                       conditions:
 *                         type: object
 *                         description: Present only for HYBRID type
 *                         properties:
 *                           minOrders:
 *                             type: number
 *                             example: 20
 *                           minEarnings:
 *                             type: number
 *                             example: 1000
 *                           minAcceptanceRate:
 *                             type: number
 *                             example: 90
 *                           minCompletionRate:
 *                             type: number
 *                             example: 95
 *
 *       401:
 *         description: Unauthorized (Invalid or missing token)
 *
 *       500:
 *         description: Internal server error
 */
router.get("/rider/programs/daily", riderAuthMiddleWare, getRiderDailyPrograms);

module.exports = router;