const express = require("express");
const riderEarningsRouter = express.Router();

const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const { new_getDeliveryEarnings , new_getDailyEarnings , new_getWeeklyEarnings , new_getWeeklyChart ,new_getEarningsSummary,getEarningsHistory,getTransactionById} = require("../controllers/riderEarningsController");

/**
 * @swagger
 * /api/rider/earnings/new/history:
 *   get:
 *     summary: Get rider earnings history
 *     description: >
 *       Returns paginated earnings history for the logged-in rider
 *       within the given date range.
 *     tags:
 *       - Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           example: 2026-01-01
 *       - in: query
 *         name: to
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           example: 2026-01-31
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number for pagination
 *         schema:
 *           type: number
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of records per page
 *         schema:
 *           type: number
 *           example: 10
 *     responses:
 *       200:
 *         description: Earnings history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                   example: 1
 *                 limit:
 *                   type: number
 *                   example: 10
 *                 totalRecords:
 *                   type: number
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: 2026-01-15T00:00:00.000Z
 *                       orders:
 *                         type: number
 *                         example: 12
 *                       totalEarnings:
 *                         type: number
 *                         example: 450
 *                       payoutStatus:
 *                         type: string
 *                         example: PENDING
 *       400:
 *         description: Invalid or missing date range
 *       401:
 *         description: Unauthorized – rider token missing or invalid
 *       500:
 *         description: Internal server error
 */


riderEarningsRouter.get( "/new/history", riderAuthMiddleWare,getEarningsHistory);

/**
 * @swagger
 * /api/rider/earnings/new/new_summary:
 *   get:
 *     summary: Get rider earnings summary (today, week, month)
 *     description: >
 *       Returns earnings summary for the logged-in rider using delivered orders.
 *       Includes today's earnings, current week total, and current month breakdown.
 *     tags:
 *       - New Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 today:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: number
 *                       example: 6
 *                     baseEarnings:
 *                       type: number
 *                       example: 0
 *                     incentives:
 *                       type: number
 *                       example: 0
 *                     tips:
 *                       type: number
 *                       example: 0
 *                     total:
 *                       type: number
 *                       example: 842
 *                 week:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 6710
 *                 month:
 *                   type: object
 *                   properties:
 *                     baseEarnings:
 *                       type: number
 *                       example: 18240
 *                     incentives:
 *                       type: number
 *                       example: 3420
 *                     tips:
 *                       type: number
 *                       example: 820
 *                     total:
 *                       type: number
 *                       example: 22480
 *       401:
 *         description: Unauthorized – rider token missing or invalid
 *       500:
 *         description: Internal server error
 */


riderEarningsRouter.get("/new/new_summary", riderAuthMiddleWare, new_getEarningsSummary);


/**
 * @swagger
 * /api/rider/earnings/new/new_weekly-chart:
 *   get:
 *     summary: Get rider weekly earnings chart (current ISO week)
 *     description: >
 *       Returns day-wise earnings and order count for the current ISO week
 *       (Monday to Sunday) for the logged-in rider.
 *       This API is used to render the weekly earnings chart.
 *     tags:
 *       - New Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly chart data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 week:
 *                   type: array
 *                   description: Day-wise earnings summary for the current week
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         example: Mon
 *                       amount:
 *                         type: number
 *                         example: 450
 *                       orders:
 *                         type: number
 *                         example: 12
 *       401:
 *         description: Unauthorized – rider token missing or invalid
 *       500:
 *         description: Internal server error
 */


riderEarningsRouter.get("/new/new_weekly-chart", riderAuthMiddleWare, new_getWeeklyChart);


/**
 * @swagger
 * /api/rider/earnings/new/new_daily:
 *   get:
 *     summary: Get rider daily earnings (new)
 *     description: >
 *       Returns daily earnings for the logged-in rider based on delivered orders.
 *       Includes delivery earnings and bonus entries (if applicable).
 *       If date is not provided, current date is used.
 *     tags:
 *       - New Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         description: Date for which earnings are required (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           example: 2026-01-30
 *     responses:
 *       200:
 *         description: Daily earnings fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   example: 2026-01-30
 *                 totalEarnings:
 *                   type: number
 *                   example: 450
 *                 items:
 *                   type: array
 *                   description: List of daily earning entries
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: DELIVERY
 *                       orderId:
 *                         type: string
 *                         example: ORD-3C9F27B0
 *                       amount:
 *                         type: number
 *                         example: 112.6
 *                       time:
 *                         type: string
 *                         example: 2026-01-30T08:46:47.160Z
 *                       title:
 *                         type: string
 *                         nullable: true
 *                         example: Peak Hour Bonus
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Unauthorized – rider token missing or invalid
 *       500:
 *         description: Internal server error
 */


riderEarningsRouter.get("/new/new_daily", riderAuthMiddleWare, new_getDailyEarnings);


/**
 * @swagger
 * /api/rider/earnings/new/new_delivery/{orderId}:
 *   get:
 *     summary: Get rider delivery earnings by order ID (new)
 *     description: >
 *       Returns detailed earnings breakup for a specific order delivered
 *       by the logged-in rider. Uses the Order schema as the source of truth.
 *     tags:
 *       - New Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Order ID for which delivery earnings are required
 *         schema:
 *           type: string
 *           example: ORD-3C9F27B0
 *     responses:
 *       200:
 *         description: Delivery earnings fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                   example: ORD-3C9F27B0
 *                 store:
 *                   type: string
 *                   example: Fresh Mart Grocery
 *                 totalEarnings:
 *                   type: number
 *                   example: 112.6
 *                 breakup:
 *                   type: object
 *                   properties:
 *                     basePay:
 *                       type: number
 *                       example: 40
 *                     distancePay:
 *                       type: number
 *                       example: 72.6
 *                     surgePay:
 *                       type: number
 *                       example: 0
 *                     tips:
 *                       type: number
 *                       example: 0
 *                 status:
 *                   type: string
 *                   example: DELIVERED
 *                 time:
 *                   type: string
 *                   example: 2026-01-30T08:46:47.160Z
 *       401:
 *         description: Unauthorized – rider token missing or invalid
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */


riderEarningsRouter.get(
  "/new/new_delivery/:id",
  riderAuthMiddleWare,
  new_getDeliveryEarnings
);

/**
 * @swagger
 * /api/rider/earnings/new/new_weekly:
 *   get:
 *     summary: Get rider weekly earnings with deliveries (new)
 *     description: >
 *       Returns weekly earnings for the logged-in rider based on ISO week
 *       (Monday to Sunday). Includes day-wise order count, total amount,
 *       delivered orders per day, and comparison with previous week.
 *       If week and year are not provided, the current ISO week is used.
 *     tags:
 *       - New Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: week
 *         required: false
 *         description: ISO week number (1–53)
 *         schema:
 *           type: number
 *           example: 5
 *       - in: query
 *         name: year
 *         required: false
 *         description: Year for the ISO week
 *         schema:
 *           type: number
 *           example: 2026
 *     responses:
 *       200:
 *         description: Weekly earnings fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 week:
 *                   type: number
 *                   example: 5
 *                 year:
 *                   type: number
 *                   example: 2026
 *                 weekRange:
 *                   type: string
 *                   example: Mon Jan 26 2026 - Sun Feb 01 2026
 *                 total:
 *                   type: number
 *                   example: 337.8
 *                 changePercent:
 *                   type: number
 *                   description: Percentage change compared to previous week
 *                   example: 0
 *                 days:
 *                   type: array
 *                   description: Day-wise earnings and deliveries (Mon–Sun)
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         example: Friday
 *                       date:
 *                         type: string
 *                         example: 2026-01-30
 *                       orders:
 *                         type: number
 *                         example: 2
 *                       amount:
 *                         type: number
 *                         example: 225.2
 *                       deliveries:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             orderId:
 *                               type: string
 *                               example: ORD-A60BE9A8
 *                             amount:
 *                               type: number
 *                               example: 112.6
 *                             time:
 *                               type: string
 *                               example: 2026-01-30T08:46:47.160Z
 *       401:
 *         description: Unauthorized – rider token missing or invalid
 *       500:
 *         description: Internal server error
 */



riderEarningsRouter.get("/new/new_weekly", riderAuthMiddleWare, new_getWeeklyEarnings);
/**
 * @swagger
 * /api/rider/earnings/new/transaction/{transactionId}:
 *   get:
 *     summary: Get transaction details by transaction ID
 *     tags:
 *       - Rider Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rider wallet transaction ID
 *     responses:
 *       200:
 *         description: Transaction details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionId:
 *                   type: string
 *                   example: "1"
 *                 type:
 *                   type: string
 *                   example: "INCENTIVE"
 *                 amount:
 *                   type: number
 *                   example: 100
 *                 description:
 *                   type: string
 *                   example: "Daily incentive credited"
 *                 referenceId:
 *                   type: string
 *                   example: "1"
 *                 status:
 *                   type: string
 *                   example: "CREDITED"
 *                 creditedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-05-23T23:59:00.312Z"
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transaction not found
 *       500:
 *         description: Internal server error
 */
riderEarningsRouter.get(
  "/new/transaction/:transactionId",
  riderAuthMiddleWare,
  getTransactionById
);


module.exports = riderEarningsRouter;