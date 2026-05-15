const express = require("express");
const router = express.Router();

const {getRiderHomeBanners} = require("../controllers/bannerController");
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");

/**
 * @swagger
 * /api/banner/home-banners:
 *   get:
 *     summary: Get rider home banner status
 *     description: >
 *       Fetches rider home banner/card statuses including Add Bank Details,
 *       Joining Kit, Joining Bonus, Refer and Earn, and Daily Incentives.
 *       The API checks rider bank verification, kit delivery status, active joining bonus,
 *       referral program, and daily incentive progress.
 *     tags:
 *       - Rider Home
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Home banners fetched successfully
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
 *                   example: Home banners fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bank:
 *                       type: object
 *                       properties:
 *                         labelName:
 *                           type: string
 *                           example: Add Bank Details
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         isCompleted:
 *                           type: boolean
 *                           example: false
 *                         status:
 *                           type: string
 *                           enum:
 *                             - PENDING
 *                             - UNDER_REVIEW
 *                             - COMPLETED
 *                           example: PENDING
 *                         message:
 *                           type: string
 *                           example: Please add your bank details to receive payouts.
 *
 *                     kit:
 *                       type: object
 *                       properties:
 *                         labelName:
 *                           type: string
 *                           example: Joining Kit
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         isCompleted:
 *                           type: boolean
 *                           example: true
 *                         status:
 *                           type: string
 *                           enum:
 *                             - NOT_REQUESTED
 *                             - REQUESTED
 *                             - APPROVED
 *                             - SHIPPED
 *                             - DELIVERED
 *                           example: DELIVERED
 *                         message:
 *                           type: string
 *                           example: Your joining kit has been delivered.
 *
 *                     joiningBonus:
 *                       type: object
 *                       properties:
 *                         labelName:
 *                           type: string
 *                           example: Joining Bonus
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         isCompleted:
 *                           type: boolean
 *                           example: false
 *                         status:
 *                           type: string
 *                           enum:
 *                             - NOT_AVAILABLE
 *                             - ACTIVE
 *                             - TARGET_COMPLETED
 *                             - COMPLETED
 *                           example: ACTIVE
 *                         message:
 *                           type: string
 *                           example: Complete 3 more orders to earn ₹500 joining bonus.
 *                         ordersCompleted:
 *                           type: integer
 *                           example: 2
 *                         targetOrders:
 *                           type: integer
 *                           example: 5
 *                         remainingOrders:
 *                           type: integer
 *                           example: 3
 *                         rewardAmount:
 *                           type: number
 *                           example: 500
 *
 *                     referAndEarn:
 *                       type: object
 *                       properties:
 *                         labelName:
 *                           type: string
 *                           example: Refer and Earn
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         isCompleted:
 *                           type: boolean
 *                           example: false
 *                         status:
 *                           type: string
 *                           enum:
 *                             - ACTIVE
 *                             - NOT_AVAILABLE
 *                           example: ACTIVE
 *                         message:
 *                           type: string
 *                           example: Refer riders and earn rewards.
 *
 *                     dailyIncentive:
 *                       type: object
 *                       properties:
 *                         labelName:
 *                           type: string
 *                           example: Daily Incentives
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         isCompleted:
 *                           type: boolean
 *                           example: false
 *                         status:
 *                           type: string
 *                           enum:
 *                             - NOT_AVAILABLE
 *                             - ACTIVE
 *                             - TARGET_COMPLETED
 *                           example: ACTIVE
 *                         message:
 *                           type: string
 *                           example: Complete 4 more orders to earn ₹200 reward.
 *                         ordersCompleted:
 *                           type: integer
 *                           example: 1
 *                         targetOrders:
 *                           type: integer
 *                           example: 5
 *                         remainingOrders:
 *                           type: integer
 *                           example: 4
 *                         rewardAmount:
 *                           type: number
 *                           example: 200
 *             example:
 *               success: true
 *               message: Home banners fetched successfully
 *               data:
 *                 bank:
 *                   labelName: Add Bank Details
 *                   isAvailable: true
 *                   isCompleted: false
 *                   status: PENDING
 *                   message: Please add your bank details to receive payouts.
 *                 kit:
 *                   labelName: Joining Kit
 *                   isAvailable: true
 *                   isCompleted: true
 *                   status: DELIVERED
 *                   message: Your joining kit has been delivered.
 *                 joiningBonus:
 *                   labelName: Joining Bonus
 *                   isAvailable: true
 *                   isCompleted: false
 *                   status: ACTIVE
 *                   message: Complete 3 more orders to earn ₹500 joining bonus.
 *                   ordersCompleted: 2
 *                   targetOrders: 5
 *                   remainingOrders: 3
 *                   rewardAmount: 500
 *                 referAndEarn:
 *                   labelName: Refer and Earn
 *                   isAvailable: true
 *                   isCompleted: false
 *                   status: ACTIVE
 *                   message: Refer riders and earn rewards.
 *                 dailyIncentive:
 *                   labelName: Daily Incentives
 *                   isAvailable: true
 *                   isCompleted: false
 *                   status: ACTIVE
 *                   message: Complete 4 more orders to earn ₹200 reward.
 *                   ordersCompleted: 1
 *                   targetOrders: 5
 *                   remainingOrders: 4
 *                   rewardAmount: 200
 *
 *       401:
 *         description: Unauthorized rider
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
 *                   example: Unauthorized rider
 *
 *       404:
 *         description: Rider not found
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
 *                   example: Rider not found
 *
 *       500:
 *         description: Internal server error
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
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: Something went wrong
 */

router.get(
  "/home-banners",
  riderAuthMiddleWare,
  getRiderHomeBanners
);

module.exports = router;