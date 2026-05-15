const express = require("express");
const router = express.Router();

const controller = require("../controllers/adminWeeklyIncentive.controller");

/**
 * @swagger
 * tags:
 *   name: Admin Weekly Incentives
 *   description: Weekly incentive management APIs
 */

/**
 * @swagger
 * /api/admin/programs/weekly:
 *   post:
 *     summary: Create Weekly Incentive (SLAB / FIXED_TARGET / HYBRID / TASK)
 *     tags: [Admin Weekly Incentives]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ruleType
 *               - dateRange
 *               - weekConfig
 *             properties:
 *               name:
 *                 type: string
 *                 example: Weekly Superstar Bonus
 *
 *               cityId:
 *                 type: string
 *                 example: city_123
 *
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "500081"
 *
 *               weekConfig:
 *                 type: object
 *                 properties:
 *                   weekStartDay:
 *                     type: string
 *                     enum:
 *                       - MON
 *                       - TUE
 *                       - WED
 *                       - THU
 *                       - FRI
 *                       - SAT
 *                       - SUN
 *                     example: MON
 *
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     example: 2026-05-01
 *                   endDate:
 *                     type: string
 *                     example: 2026-06-30
 *
 *               ruleType:
 *                 type: string
 *                 enum:
 *                   - SLAB
 *                   - FIXED_TARGET
 *                   - HYBRID
 *                   - TASK
 *
 *               slabs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     minOrders:
 *                       type: integer
 *                       example: 50
 *
 *                     maxOrders:
 *                       type: integer
 *                       example: 100
 *
 *                     rewardAmount:
 *                       type: number
 *                       example: 500
 *
 *               target:
 *                 type: object
 *                 properties:
 *                   orders:
 *                     type: integer
 *                     example: 100
 *
 *               reward:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                     example: 1000
 *
 *               conditions:
 *                 type: object
 *                 properties:
 *                   minOrders:
 *                     type: integer
 *                     example: 100
 *
 *                   minEarnings:
 *                     type: number
 *                     example: 5000
 *
 *                   minAcceptanceRate:
 *                     type: number
 *                     example: 90
 *
 *                   minCompletionRate:
 *                     type: number
 *                     example: 95
 *
 *               consistencyRule:
 *                 type: object
 *                 properties:
 *                   minActiveDays:
 *                     type: integer
 *                     example: 5
 *
 *                   minOrdersPerDay:
 *                     type: integer
 *                     example: 10
 *
 *               constraints:
 *                 type: object
 *                 properties:
 *                   minAcceptanceRate:
 *                     type: number
 *                     example: 85
 *
 *                   minCompletionRate:
 *                     type: number
 *                     example: 90
 *
 *               maxPayoutPerWeek:
 *                 type: number
 *                 example: 2000
 *
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *
 *                     dayNumber:
 *                       type: integer
 *                       example: 1
 *
 *                     taskType:
 *                       type: string
 *                       enum:
 *                         - FIXED_TARGET
 *                         - PER_ORDER
 *                         - HYBRID
 *                         - SLAB
 *
 *                     target:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: integer
 *                           example: 10
 *
 *                     reward:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           example: 100
 *
 *                     rewardPerOrder:
 *                       type: number
 *                       example: 20
 *
 *                     maxOrders:
 *                       type: integer
 *                       example: 10
 *
 *                     maxEarning:
 *                       type: number
 *                       example: 200
 *
 *                     conditions:
 *                       type: object
 *                       properties:
 *                         minOrders:
 *                           type: integer
 *                           example: 10
 *
 *                         minEarnings:
 *                           type: number
 *                           example: 1000
 *
 *                         minAcceptanceRate:
 *                           type: number
 *                           example: 90
 *
 *                     slabs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           minOrders:
 *                             type: integer
 *                             example: 5
 *
 *                           maxOrders:
 *                             type: integer
 *                             example: 10
 *
 *                           rewardAmount:
 *                             type: number
 *                             example: 100
 *
 *               isActive:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       200:
 *         description: Weekly incentive created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Weekly incentive created successfully
 *               data:
 *                 id: weekly_001
 *                 name: Weekly Superstar Bonus
 *                 ruleType: SLAB
 */
router.post("/weekly", controller.createWeeklyIncentive);

/**
 * @swagger
 * /api/admin/programs/weekly/{id}:
 *   put:
 *     summary: Update Weekly Incentive
 *     tags: [Admin Weekly Incentives]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: program_123
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Weekly Bonus
 *
 *               maxPayoutPerWeek:
 *                 type: number
 *                 example: 2500
 *
 *               isActive:
 *                 type: boolean
 *                 example: false
 *
 *     responses:
 *       200:
 *         description: Weekly incentive updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Weekly incentive updated
 */
router.put("/weekly/:id", controller.updateWeeklyIncentive);

/**
 * @swagger
 * /api/admin/programs/weekly:
 *   get:
 *     summary: Get all weekly incentives
 *     tags: [Admin Weekly Incentives]
 *     responses:
 *       200:
 *         description: List of weekly incentives
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "program_123"
 *                   name: "Weekly Superstar Bonus"
 *                   ruleType: "SLAB"
 *                   isActive: true
 */
router.get("/weekly", controller.getAllWeeklyIncentives);

/**
 * @swagger
 * /api/admin/programs/weekly/{id}:
 *   get:
 *     summary: Get weekly incentive details
 *     tags: [Admin Weekly Incentives]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Weekly incentive details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "program_123"
 *                 name: "Weekly Superstar Bonus"
 *                 ruleType: "SLAB"
 *                 slabs:
 *                   - minOrders: 80
 *                     maxOrders: 100
 *                     rewardAmount: 800
 *                 constraints:
 *                   minAcceptanceRate: 85
 */
router.get("/weekly/:id", controller.getWeeklyIncentiveById);
/**
 * @swagger
 * /api/admin/programs/weekly/{id}:
 *   delete:
 *     summary: Delete Weekly Incentive
 *     description: Deletes a weekly incentive ONLY if it is UPCOMING
 *     tags: [Admin Weekly Incentives]
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: program_123
 *
 *     responses:
 *       200:
 *         description: Program deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Program deleted successfully
 *
 *       400:
 *         description: Cannot delete running/expired program
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Cannot delete program. Status is RUNNING
 *
 *       404:
 *         description: Program not found
 *
 *       500:
 *         description: Internal server error
 */
router.delete("/weekly/:id", controller.deleteWeeklyIncentive);
module.exports = router;