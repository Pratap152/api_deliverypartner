const express = require("express");
const {submitRiderRating,getRiderRatings ,getRiderWeeklyStats} = require("../controllers/riderRatingController");
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const riderRatingRouter = express.Router();

 /**
 * @swagger
 * /api/rider/rating:
 *   post:
 *     tags: [Rider Rating]
 *     summary: Submit Rider Rating
 *     description: |
 *       Allows a user to submit rating for a delivered order.
 *       Rating is allowed only once per order and only after delivery.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - rating
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: ORD12345
 *
 *               rating:
 *                 type: number
 *                 example: 4.5
 *
 *               review:
 *                 type: string
 *                 example: Fast delivery and polite rider
 *
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Rating submitted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: rate_001
 *                     orderId:
 *                       type: string
 *                       example: ORD12345
 *                     riderId:
 *                       type: string
 *                       example: r1
 *                     rating:
 *                       type: number
 *                       example: 4.5
 *                     review:
 *                       type: string
 *                       example: Fast delivery and polite rider
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-04-27T12:00:00Z
 *
 *       400:
 *         description: Validation or business rule error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Rating must be between 0 and 5
 *
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid orderId
 *
 *       403:
 *         description: Order not allowed for rating
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: You can rate only after delivery
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Server Error
 */
riderRatingRouter.post("/rating",riderAuthMiddleWare,submitRiderRating);


/**
 * @swagger
 * /api/rider/ratings:
 *   get:
 *     tags: [Rider Rating]
 *     summary: Get Logged-in Rider Ratings
 *     description: |
 *       Fetch all ratings of the logged-in rider using JWT token.
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Rider ratings fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 riderId:
 *                   type: string
 *                   example: r1
 *
 *                 averageRating:
 *                   type: number
 *                   example: 4.3
 *
 *                 totalRatings:
 *                   type: number
 *                   example: 25
 *
 *                 ratings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       orderId:
 *                         type: string
 *                         example: ORD123
 *
 *                       rating:
 *                         type: number
 *                         example: 5
 *
 *                       review:
 *                         type: string
 *                         example: Excellent service
 *
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-04-26T10:00:00Z
 *
 *       500:
 *         description: Server error
 */

riderRatingRouter.get("/ratings",riderAuthMiddleWare,getRiderRatings);




/**
 * @swagger
 * /api/rider/rating/weekly:
 *   get:
 *     summary: Get rider performance stats for last 7 days
 *     tags: [Rider Stats]
 *
 *     description: >
 *       Returns total orders, delivered orders, acceptance rate, and average rating
 *       for the logged-in rider in the past 7 days.
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Stats fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     riderId:
 *                       type: string
 *                       example: r1
 *                     period:
 *                       type: string
 *                       example: last_7_days
 *                     totalOrders:
 *                       type: integer
 *                       example: 42
 *                     deliveredOrders:
 *                       type: integer
 *                       example: 35
 *                     acceptanceRate:
 *                       type: number
 *                       example: 83.33
 *                     averageRating:
 *                       type: number
 *                       example: 4.6
 *                     totalRatings:
 *                       type: integer
 *                       example: 18
 *
 *       401:
 *         description: Unauthorized (missing token)
 *
 *       500:
 *         description: Server error
 */
riderRatingRouter.get(
  "/rating/weekly",
  riderAuthMiddleWare,
  getRiderWeeklyStats
);



module.exports = riderRatingRouter;