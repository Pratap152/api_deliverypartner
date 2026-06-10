const express = require("express");
const router = express.Router();
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const controller = require("../controllers/riderZoneController");

/**
 * @swagger
 * /api/rider/zone-point:
 *   get:
 *     summary: Get zone points for logged in rider
 *     tags: [Rider Zone Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of zone points based on rider pincode
 *       404:
 *         description: Rider not found
 */
router.get("/zone-point",
  riderAuthMiddleWare,
  controller.getRiderZonePoints
);

module.exports = router;