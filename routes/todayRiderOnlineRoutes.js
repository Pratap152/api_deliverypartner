const router = require('express').Router()
const {getRiderOnlineStatus}=require('../controllers/todayRiderOnlineController')
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
/**
 * @swagger
 * /api/status/online-status:
 *   get:
 *     summary: Get rider online status
 *     description: Fetch the current rider online status and total online minutes for today.
 *     tags:
 *       - Rider Status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rider online status fetched successfully
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
 *                   example: Rider online status fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     isOnline:
 *                       type: boolean
 *                       example: true
 *                     totalOnlineMinutesToday:
 *                       type: integer
 *                       example: 120
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
 *         description: Something went wrong
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
 *                   example: Something went wrong
 */
router.get(
  "/online-status",
  riderAuthMiddleWare,
  getRiderOnlineStatus
);
module.exports = router;