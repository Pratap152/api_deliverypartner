const express = require("express");
const router = express.Router();

const {riderAuthMiddleWare} = require("../middleware/riderAuthMiddleware");

const {
  goOnline,
  goOffline
} = require("../controllers/riderStatus.controller");

// ----------------------
// Rider Status APIs
// ----------------------
/**
 * @swagger
 * /api/rider/status/online:
 *   patch:
 *     tags: [Rider Status]
 *     summary: Set Rider Online
 *     description: Marks rider as ONLINE and updates login timestamp. Blocks if account is suspended or KYC pending.
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Rider successfully set to ONLINE
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
 *                   example: Rider is now ONLINE
 *
 *                 # NEW FIELD
 *                 isPartnerActive:
 *                   type: boolean
 *                   example: true
 *
 *                 riderStatus:
 *                   type: object
 *                   properties:
 *                     isOnline:
 *                       type: boolean
 *                       example: true
 *                     lastLoginAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-02T08:30:00.000Z"
 *                     lastLogoutAt:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     totalOnlineMinutesToday:
 *                       type: number
 *                       example: 120
 *                 deliveryStatus:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *
 *       400:
 *         description: Rider already online
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
 *                   example: Rider already online
 *
 *       403:
 *         description: Rider not allowed to go online (account suspended or KYC pending)
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
 *                   example: Rider is not allowed to go online
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

router.patch("/online", riderAuthMiddleWare, goOnline);
/**
 * @swagger
 * /api/rider/status/offline:
 *   patch:
 *     summary: Rider go offline
 *     tags:
 *       - Rider Status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 enum:
 *                   - MANUAL_OFF
 *                   - KYC_PENDING
 *                   - ACCOUNT_SUSPENDED
 *                   - OUT_OF_SERVICE_AREA
 *                   - COD_LIMIT_EXCEEDED
 *                 example: MANUAL_OFF
 *     responses:
 *       200:
 *         description: Rider successfully went offline
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
 *                   example: Rider is now OFFLINE
 *                 reminder:
 *                   type: string
 *                   nullable: true
 *                   example: Previous day session expired. Today's online timing calculated from 12:00 AM only.
 *                 rider:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 6ceef092-d8cd-4c70-8720-5af0aa51678b
 *                     isOnline:
 *                       type: boolean
 *                       example: false
 *                     isPartnerActive:
 *                       type: boolean
 *                       example: false
 *                 riderStatus:
 *                   type: object
 *                   properties:
 *                     isOnline:
 *                       type: boolean
 *                       example: false
 *                     lastLoginAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-05-12T04:42:10.575Z
 *                     lastLogoutAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-05-12T10:24:18.670Z
 *                     totalOnlineMinutesToday:
 *                       type: integer
 *                       example: 342
 *                     onlineMinutesDate:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-05-12T00:00:00.000Z
 *                 deliveryStatus:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *                     inactiveReason:
 *                       type: string
 *                       example: MANUAL_OFF
 *       400:
 *         description: Invalid request
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
 *                   example: Rider already offline
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
 *                   example: Server error
 */
router.patch("/offline", riderAuthMiddleWare, goOffline);

module.exports = router;
