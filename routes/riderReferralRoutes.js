const express = require("express");
const router = express.Router();
const{getReferralProgress,getReferralRewards,getReferralCampaign,shareReferralByCode,referRider,getMyReferralSummary,
  getReferralProgressByNewRider,
  getRefereeProgress,
  getReferrerSummary,
  getReferralEarnings
}=require('../controllers/riderReferralController')
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
/**
 * @swagger
 * /api/refer/rider/all/referrals:
 *   get:
 *     summary: Get referral progress for all referred riders
 *     tags:
 *       - Referral
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [all, pending, completed]
 *         description: Filter referrals by status
 *
 *       - in: query
 *         name: fromDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter referrals from date
 *
 *       - in: query
 *         name: toDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter referrals to date
 *
 *       - in: query
 *         name: programId
 *         required: false
 *         schema:
 *           type: string
 *         description: Referral program ID
 *
 *     responses:
 *       200:
 *         description: Referral progress fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Referral progress fetched successfully
 *
 *                 filters:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: all
 *
 *                     fromDate:
 *                       type: string
 *                       example: 2026-05-01
 *
 *                     toDate:
 *                       type: string
 *                       example: 2026-05-31
 *
 *                     programId:
 *                       type: string
 *                       example: 7a1b2c3d
 *
 *                 program:
 *                   type: object
 *                   properties:
 *                     programId:
 *                       type: string
 *                       example: abc123
 *
 *                     programName:
 *                       type: string
 *                       example: Referral Mega Program
 *
 *                     trackingType:
 *                       type: string
 *                       example: ORDER_BASED
 *
 *                     ruleType:
 *                       type: string
 *                       example: FIXED_TARGET
 *
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *
 *                     weekStartDay:
 *                       type: string
 *                       example: MONDAY
 *
 *                 referrer:
 *                   type: object
 *                   properties:
 *                     riderId:
 *                       type: string
 *
 *                     partnerId:
 *                       type: string
 *
 *                     name:
 *                       type: string
 *                       example: John Rider
 *
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRidersOnboarded:
 *                       type: integer
 *                       example: 10
 *
 *                     targetReachedRiders:
 *                       type: integer
 *                       example: 4
 *
 *                     targetPendingRiders:
 *                       type: integer
 *                       example: 6
 *
 *                     totalEarnings:
 *                       type: number
 *                       example: 2500
 *
 *                 referredRiders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       referralId:
 *                         type: string
 *
 *                       newRiderId:
 *                         type: string
 *
 *                       newRiderName:
 *                         type: string
 *                         example: Ravi Kumar
 *
 *                       newRiderPartnerId:
 *                         type: string
 *                         example: PID12345
 *
 *                       usedReferralCode:
 *                         type: string
 *                         example: REF1001
 *
 *                       referredAt:
 *                         type: string
 *                         format: date-time
 *
 *                       referredDate:
 *                         type: string
 *                         example: 2026-05-13
 *
 *                       referredAtIST:
 *                         type: string
 *                         example: 13/05/2026, 10:30:00 am
 *
 *                       ruleType:
 *                         type: string
 *                         example: FIXED_TARGET
 *
 *                       targetStatus:
 *                         type: string
 *                         enum:
 *                           - TARGET_REACHED
 *                           - TARGET_PENDING
 *
 *                       progress:
 *                         type: object
 *                         properties:
 *                           completedOrders:
 *                             type: integer
 *                             example: 20
 *
 *                           targetOrders:
 *                             type: integer
 *                             example: 50
 *
 *                           remainingOrders:
 *                             type: integer
 *                             example: 30
 *
 *                           progressPercentage:
 *                             type: integer
 *                             example: 40
 *
 *                           status:
 *                             type: string
 *                             example: RUNNING
 *
 *                           isCompleted:
 *                             type: boolean
 *                             example: false
 *
 *                       refereeReward:
 *                         type: object
 *                         properties:
 *                           configuredAmount:
 *                             type: number
 *                             example: 500
 *
 *                           earnedAmount:
 *                             type: number
 *                             example: 200
 *
 *                           eligible:
 *                             type: boolean
 *                             example: true
 *
 *                       referrerReward:
 *                         type: object
 *                         properties:
 *                           configuredAmount:
 *                             type: number
 *                             example: 300
 *
 *                           earnedAmount:
 *                             type: number
 *                             example: 150
 *
 *                           eligible:
 *                             type: boolean
 *                             example: true
 *
 *                       referralUpdated:
 *                         type: boolean
 *                         example: true
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
 *
 *                 message:
 *                   type: string
 *                   example: Unauthorized rider
 *
 *       404:
 *         description: Rider or referral program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: No active referral program found
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
 *
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *
 *                 error:
 *                   type: string
 */
router.get("/rider/all/referrals",riderAuthMiddleWare, getReferralProgress);
router.get(
  "/rewards",
  riderAuthMiddleWare,
  getReferralRewards
);

// 8. Active referral campaign
router.get(
  "/campaign",
  riderAuthMiddleWare,
  getReferralCampaign
);
// routes/riderReferralRoutes.js
/**
 * @swagger
 * /api/refer/share:
 *   post:
 *     summary: Share referral code
 *     description: Generate a shareable referral message and link using partnerId
 *     tags:
 *       - Referral
 *     security:
 *       - bearerAuth: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *             properties:
 *               partnerId:
 *                 type: string
 *                 example: "P1001"
 *     responses:
 *       200:
 *         description: Referral code ready to share
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
 *                   example: Referral code ready to share
 *                 data:
 *                   type: object
 *                   properties:
 *                     partnerId:
 *                       type: string
 *                       example: "P1001"
 *                     riderName:
 *                       type: string
 *                       nullable: true
 *                       example: "Ramu Kumar"
 *                     shareMessage:
 *                       type: string
 *                       example: "🚴 Join our platform using my referral code *P1001* and earn rewards!"
 *                     shareLink:
 *                       type: string
 *                       example: "https://yourapp.link/referral?code=P1001"
 *       400:
 *         description: partnerId is required
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
 *                   example: partnerId is required
 *       404:
 *         description: Invalid referral code
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
 *                   example: Invalid referral code
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
router.post("/share", riderAuthMiddleWare, shareReferralByCode);
/**
 * @swagger
 * /api/refer/rider/refer:
 *   post:
 *     summary: Refer a new rider
 *     description: Existing logged-in rider can refer a new rider using their partnerId.
 *     tags:
 *       - [Referral]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phoneNumber
 *               - area
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ramu Kumar"
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               area:
 *                 type: string
 *                 example: "Madhapur"
 *     responses:
 *       201:
 *         description: Rider referred successfully
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
 *                   example: "Rider referred successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     referredRiderId:
 *                       type: string
 *                       example: "51820218-8472-49b8-a158-632f85063bdc"
 *                     name:
 *                       type: string
 *                       example: "Ramu Kumar"
 *                     phoneNumber:
 *                       type: string
 *                       example: "9876543210"
 *                     area:
 *                       type: string
 *                       example: "Madhapur"
 *                     referredByPartnerId:
 *                       type: string
 *                       example: "P1001"
 *                     status:
 *                       type: string
 *                       example: "PENDING_ONBOARDING"
 *       400:
 *         description: Bad request / validation error
 *         content:
 *           application/json:
 *             examples:
 *               requiredFields:
 *                 summary: Required fields missing
 *                 value:
 *                   success: false
 *                   message: "name, phoneNumber and area are required"
 *               partnerIdMissing:
 *                 summary: Referrer partnerId missing
 *                 value:
 *                   success: false
 *                   message: "Referrer partnerId not found"
 *               riderAlreadyExists:
 *                 summary: Rider already exists
 *                 value:
 *                   success: false
 *                   message: "Rider already exists with this phone number"
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
 *                   example: "Unauthorized rider"
 *       404:
 *         description: Referrer rider not found
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
 *                   example: "Referrer rider not found"
 *       500:
 *         description: Internal server error
 */
router.post("/rider/refer", riderAuthMiddleWare, referRider);
/**
 * @swagger
 * /api/refer/summary:
 *   get:
 *     summary: Get logged-in rider referral summary
 *     description: Returns referral earnings, total referred riders, and eligibility status.
 *     tags:
 *       - Referral
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral summary fetched successfully
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
 *                   example: Referral summary fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     referrer:
 *                       type: object
 *                       properties:
 *                         riderId:
 *                           type: string
 *                           example: "rider-uuid"
 *                         name:
 *                           type: string
 *                           example: "Ramu Kumar"
 *                         partnerId:
 *                           type: string
 *                           example: "P1001"
 *                     referralAmountPerRider:
 *                       type: number
 *                       example: 500
 *                     totalReferredRiders:
 *                       type: integer
 *                       example: 5
 *                     totalEligibleRiders:
 *                       type: integer
 *                       example: 3
 *                     totalEarnings:
 *                       type: number
 *                       example: 1500
 *                     referredRiders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           riderId:
 *                             type: string
 *                             example: "uuid-123"
 *                           name:
 *                             type: string
 *                             example: "Ravi Kumar"
 *                           phoneNumber:
 *                             type: string
 *                             example: "9876543210"
 *                           area:
 *                             type: string
 *                             example: "Madhapur"
 *                           isFullyRegistered:
 *                             type: boolean
 *                             example: true
 *                           earningStatus:
 *                             type: string
 *                             enum: [EARNED, PENDING]
 *                             example: EARNED
 *                           earningAmount:
 *                             type: number
 *                             example: 500
 *       400:
 *         description: PartnerId not found for this rider
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: PartnerId not found for this rider
 *       401:
 *         description: Unauthorized rider
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Unauthorized rider
 *       404:
 *         description: Rider not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Rider not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 *               error: Something went wrong
 */
router.get("/summary", riderAuthMiddleWare, getMyReferralSummary);
/**
 * @swagger
 * /api/refer/referral/progress/{newRiderId}:
 *   get:
 *     summary: Get referral progress by new referred rider
 *     tags: [Referral]
 *     description: Fetch referral progress, active referral program details, completed orders, target status, and reward details for a specific referred rider.
 *     parameters:
 *       - in: path
 *         name: newRiderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the newly referred rider
 *         example: "51820218-8472-49b8-a158-632f85063bdc"
 *     responses:
 *       200:
 *         description: New referred rider details fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: New referred rider details fetched successfully
 *               program:
 *                 programId: "ddcffcd4-52dc-4ce6-a475-9ce79a61a5b8"
 *                 programName: "Refer and Earn May Offer"
 *                 validFrom: "2026-05-01T00:00:00.000Z"
 *                 validTill: "2026-05-31T23:59:59.000Z"
 *               data:
 *                 newRiderId: "51820218-8472-49b8-a158-632f85063bdc"
 *                 newRiderName: "Ramu Kumar"
 *                 newRiderPartnerId: "PID960488"
 *                 usedReferralCode: "P1001"
 *                 referredAt: "2026-05-05T06:12:27.583Z"
 *                 referredDate: "2026-05-05"
 *                 referredAtIST: "5/5/2026, 11:42:27 am"
 *                 ordersCompleted: 6
 *                 targetOrders: 10
 *                 targetStatus: TARGET_PENDING
 *                 remainingOrders: 4
 *                 rewardAmount: 500
 *                 rewardEarned: 0
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             examples:
 *               missingNewRiderId:
 *                 value:
 *                   success: false
 *                   message: newRiderId is required
 *               notReferred:
 *                 value:
 *                   success: false
 *                   message: This rider was not referred by anyone
 *               configError:
 *                 value:
 *                   success: false
 *                   message: Referral program targetOrders or rewardAmount not configured properly
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             examples:
 *               programNotFound:
 *                 value:
 *                   success: false
 *                   message: No active referral program found
 *               riderNotFound:
 *                 value:
 *                   success: false
 *                   message: Referred rider not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 *               error: Something went wrong
 */
router.get("/referral/progress/:newRiderId", getReferralProgressByNewRider);
/**
 * @swagger
 * /api/refer/referral/referee-progress:
 *   get:
 *     summary: Get individual referee progress
 *     description: >
 *       Fetches referral progress for the logged-in rider who was referred by another rider.
 *       This API returns active referral program details, rider referral information,
 *       completed orders, earned amount, target status, and rule-based progress.
 *     tags:
 *       - Referral
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Individual referee progress fetched successfully
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
 *                   example: Individual referee progress fetched successfully
 *                 program:
 *                   type: object
 *                   properties:
 *                     programId:
 *                       type: string
 *                       example: "a6ca374e-ec95-461d-9edd-50989c73090c"
 *                     programName:
 *                       type: string
 *                       example: "Task Based Referral Program"
 *                     trackingType:
 *                       type: string
 *                       example: "DAILY"
 *                     ruleType:
 *                       type: string
 *                       example: "TASK"
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-01T00:00:00.000Z"
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-31T23:59:59.000Z"
 *                     weekStartDay:
 *                       type: string
 *                       example: "MON"
 *                 data:
 *                   type: object
 *                   properties:
 *                     riderId:
 *                       type: string
 *                       example: "0d2504e9-9c37-4428-a480-97237814a7d4"
 *                     riderName:
 *                       type: string
 *                       example: "Ravi Kumar"
 *                     riderPartnerId:
 *                       type: string
 *                       example: "PID470349"
 *                     usedReferralCode:
 *                       type: string
 *                       example: "PID431096"
 *                     referredAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-07T11:39:42.411Z"
 *                     referredDate:
 *                       type: string
 *                       example: "2026-05-07"
 *                     referredAtIST:
 *                       type: string
 *                       example: "7/5/2026, 5:09:42 pm"
 *                     ruleType:
 *                       type: string
 *                       example: "TASK"
 *                     targetStatus:
 *                       type: string
 *                       example: "TARGET_PENDING"
 *                     overallProgress:
 *                       type: object
 *                       properties:
 *                         completedDays:
 *                           type: integer
 *                           example: 1
 *                         totalDays:
 *                           type: integer
 *                           example: 3
 *                         earnedAmount:
 *                           type: number
 *                           example: 100
 *                         remainingAmount:
 *                           type: number
 *                           example: 500
 *                         progressPercentage:
 *                           type: number
 *                           example: 33
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           dayNumber:
 *                             type: integer
 *                             example: 1
 *                           taskRuleType:
 *                             type: string
 *                             example: "SLAB"
 *                           slabs:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 minOrders:
 *                                   type: integer
 *                                   example: 1
 *                                 maxOrders:
 *                                   type: integer
 *                                   example: 5
 *                                 rewardAmount:
 *                                   type: number
 *                                   example: 100
 *                           progress:
 *                             type: object
 *                             properties:
 *                               completedOrders:
 *                                 type: integer
 *                                 example: 3
 *                               currentSlabReward:
 *                                 type: number
 *                                 example: 100
 *                               earnedAmount:
 *                                 type: number
 *                                 example: 100
 *                               nextTargetOrders:
 *                                 type: integer
 *                                 example: 6
 *                               remainingOrders:
 *                                 type: integer
 *                                 example: 3
 *                               status:
 *                                 type: string
 *                                 example: "COMPLETED"
 *                               isCompleted:
 *                                 type: boolean
 *                                 example: true
 *                               progressPercentage:
 *                                 type: number
 *                                 example: 50
 *                     refereeReward:
 *                       type: object
 *                       properties:
 *                         eligible:
 *                           type: boolean
 *                           example: true
 *                         amount:
 *                           type: number
 *                           example: 100
 *       400:
 *         description: Rider was not referred by anyone
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
 *                   example: This rider was not referred by anyone
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
 *       404:
 *         description: Rider or active referral program not found
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
 *                   examples:
 *                     riderNotFound:
 *                       value: Rider not found
 *                     programNotFound:
 *                       value: No active referral program found
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
 *                   example: Cannot read properties of undefined (reading 'order')
 */
router.get(
  "/referral/referee-progress",
  riderAuthMiddleWare,
  getRefereeProgress
);

router.get(
  "/referral/referrer-summary",
  riderAuthMiddleWare,
  getReferrerSummary
);

router.get(
  "/referral/earnings",
  riderAuthMiddleWare,
  getReferralEarnings
);
module.exports=router;