const express = require("express");
const router = express.Router();
const {
  getPeakSlotProgress,
  getRiderPeakSlotPrograms,
} = require("../controllers/getPeakSlotProgressController");


const {riderAuthMiddleWare} = require("../middleware/riderAuthMiddleware");

/**
 * @swagger
 * /rider/peak-progress:
 *   get:
 *     summary: Get rider peak slot progress
 *     tags: [Rider Peak Progress]
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Successfully fetched rider peak slot progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       slotId:
 *                         type: string
 *                         example: slot_1
 *                       time:
 *                         type: string
 *                         example: "18:00 - 21:00"
 *                       ordersCompleted:
 *                         type: number
 *                         example: 3
 *                       reward:
 *                         type: number
 *                         example: 60
 *                       status:
 *                         type: string
 *                         example: IN_PROGRESS
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */



router.get(
  "/peak-progress",
  riderAuthMiddleWare,
  getPeakSlotProgress
);


/**
 * @swagger
 * /rider/peak-slot-programs:
 *   get:
 *     summary: Get rider peak slot incentive programs
 *     tags: [Rider Peak Incentives]
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Successfully fetched peak slot programs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     oneOf:
 *
 *                       # PER ORDER
 *
 *                       - type: object
 *                         properties:
 *
 *                           name:
 *                             type: string
 *                             example: Evening Peak Bonus
 *
 *                           cityName:
 *                             type: string
 *                             example: Hyderabad
 *
 *                           ruleType:
 *                             type: string
 *                             example: PER_ORDER
 *
 *                           slots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *
 *                                 startTime:
 *                                   type: string
 *                                   example: "18:00"
 *
 *                                 endTime:
 *                                   type: string
 *                                   example: "21:00"
 *
 *                                 reward:
 *                                   type: object
 *                                   properties:
 *
 *                                     amount:
 *                                       type: number
 *                                       example: 20
 *
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *
 *
 *                       # SLAB
 *
 *                       - type: object
 *                         properties:
 *
 *                           name:
 *                             type: string
 *                             example: Weekend Peak Slab Bonus
 *
 *                           cityName:
 *                             type: string
 *                             example: Hyderabad
 *
 *                           ruleType:
 *                             type: string
 *                             example: SLAB
 *
 *                           slots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *
 *                                 startTime:
 *                                   type: string
 *                                   example: "19:00"
 *
 *                                 endTime:
 *                                   type: string
 *                                   example: "23:00"
 *
 *                                 slabs:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *
 *                                       minOrders:
 *                                         type: integer
 *                                         example: 5
 *
 *                                       maxOrders:
 *                                         type: integer
 *                                         example: 10
 *
 *                                       rewardAmount:
 *                                         type: number
 *                                         example: 100
 *
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *
 *
 *                       # FIXED TARGET
 *
 *                       - type: object
 *                         properties:
 *
 *                           name:
 *                             type: string
 *                             example: Daily Flat Bonus
 *
 *                           cityName:
 *                             type: string
 *                             example: Hyderabad
 *
 *                           ruleType:
 *                             type: string
 *                             example: FIXED_TARGET
 *
 *                           target:
 *                             type: object
 *                             properties:
 *
 *                               orders:
 *                                 type: integer
 *                                 example: 20
 *
 *                           reward:
 *                             type: object
 *                             properties:
 *
 *                               amount:
 *                                 type: number
 *                                 example: 200
 *
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *
 *
 *                       # HYBRID
 *
 *                       - type: object
 *                         properties:
 *
 *                           name:
 *                             type: string
 *                             example: Peak Hybrid Bonus
 *
 *                           cityName:
 *                             type: string
 *                             example: Hyderabad
 *
 *                           ruleType:
 *                             type: string
 *                             example: HYBRID
 *
 *                           conditions:
 *                             type: object
 *                             properties:
 *
 *                               minOrders:
 *                                 type: integer
 *                                 example: 20
 *
 *                               minEarnings:
 *                                 type: number
 *                                 example: 1000
 *
 *                               minAcceptanceRate:
 *                                 type: number
 *                                 example: 90
 *
 *                               minCompletionRate:
 *                                 type: number
 *                                 example: 95
 *
 *                           reward:
 *                             type: object
 *                             properties:
 *
 *                               amount:
 *                                 type: number
 *                                 example: 300
 *
 *                           maxPayoutPerDay:
 *                             type: number
 *                             example: 300
 *
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Failed to fetch peak slot programs
 */
router.get(
  "/peak-slot-programs",
  riderAuthMiddleWare,
  getRiderPeakSlotPrograms
);

module.exports = router;
