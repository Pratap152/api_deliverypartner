const express = require("express");
const router = express.Router();
 
const controller = require("../controllers/adminDailyIncentive.controller");
 
/**
* @swagger
* tags:
*   name: Admin Daily Incentives
*   description: Admin APIs for Daily Incentive Programs
*/
 
/**
* @swagger
* /api/admin/incentive/daily:
*   post:
*     summary: Create Daily Incentive (SLAB / FIXED / HYBRID / TASK)
*     tags: [Admin Daily Incentives]
*
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*
*             required:
*               - name
*               - ruleType
*               - dateRange
*
*             properties:
*
*               name:
*                 type: string
*                 example: Daily Order Boost
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
*               daysOfWeek:
*                 type: array
*                 items:
*                   type: string
*                   enum:
*                     - MON
*                     - TUE
*                     - WED
*                     - THU
*                     - FRI
*                     - SAT
*                     - SUN
*
*               dateRange:
*                 type: object
*                 properties:
*
*                   startDate:
*                     type: string
*                     example: 2026-05-01
*
*                   endDate:
*                     type: string
*                     example: 2026-05-31
*
*               ruleType:
*                 type: string
*                 enum:
*                   - SLAB
*                   - FIXED_TARGET
*                   - HYBRID
*                   - TASK
*               slabs:
*                 type: array
*                 items:
*                   type: object
*
*                   properties:
*
*                     minOrders:
*                       type: integer
*                       example: 10
*
*                     maxOrders:
*                       type: integer
*                       example: 20
*
*                     rewardAmount:
*                       type: number
*                       example: 100
*               target:
*                 type: object
*                 properties:
*
*                   orders:
*                     type: integer
*                     example: 20
*
*               reward:
*                 type: object
*                 properties:
*
*                   amount:
*                     type: number
*                     example: 200
*               conditions:
*                 type: object
*                 properties:
*
*                   minOrders:
*                     type: integer
*                     example: 20
*
*                   minEarnings:
*                     type: number
*                     example: 1000
*
*                   minAcceptanceRate:
*                     type: number
*                     example: 90
*
*                   minCompletionRate:
*                     type: number
*                     example: 95
*               tasks:
*                 type: array
*                 items:
*                   type: object
*
*                   properties:
*
*                     dayNumber:
*                       type: integer
*                       example: 1
*
*                     taskRuleType:
*                       type: string
*                       enum:
*                         - FIXED_TARGET
*                         - PER_ORDER
*                         - HYBRID
*                         - SLAB
*                     target:
*                       type: object
*                       properties:
*
*                         orders:
*                           type: integer
*                           example: 10
*
*                     reward:
*                       type: object
*                       properties:
*
*                         amount:
*                           type: number
*                           example: 100
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
*                     conditions:
*                       type: object
*                       properties:
*
*                         minOrders:
*                           type: integer
*                           example: 20
*
*                         minAcceptanceRate:
*                           type: number
*                           example: 90
*
*                         minEarnings:
*                           type: number
*                           example: 1000
*                     slabs:
*                       type: array
*                       items:
*                         type: object
*
*                         properties:
*
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
*               constraints:
*                 type: object
*                 properties:
*
*                   minAcceptanceRate:
*                     type: number
*                     example: 85
*
*                   minCompletionRate:
*                     type: number
*                     example: 90
*
*               maxPayoutPerDay:
*                 type: number
*                 example: 500
*
*               isActive:
*                 type: boolean
*                 example: true
*
*     responses:
*       200:
*         description: Daily incentive created successfully
*         content:
*           application/json:
*             examples:
*
*               slab:
*                 summary: SLAB
*                 value:
*                   success: true
*                   message: Daily slab incentive created
*                   data:
*                     id: daily_001
*
*               fixed:
*                 summary: FIXED_TARGET
*                 value:
*                   success: true
*                   message: Daily fixed target incentive created
*                   data:
*                     id: daily_002
*
*               hybrid:
*                 summary: HYBRID
*                 value:
*                   success: true
*                   message: Daily hybrid incentive created
*                   data:
*                     id: daily_003
*
*               task:
*                 summary: TASK
*                 value:
*                   success: true
*                   message: Daily task incentive created
*                   data:
*                     id: daily_004
*/
router.post("/daily", controller.createDailyIncentive);
 
/**
* @swagger
* /api/admin/incentive/daily/{id}:
*   put:
*     summary: Update Daily Incentive
*     tags: [Admin Daily Incentives]
*
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         example: daily_001
*
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*
*             properties:
*
*               name:
*                 type: string
*                 example: Updated Daily Boost
*
*               maxPayoutPerDay:
*                 type: number
*                 example: 600
*
*               isActive:
*                 type: boolean
*                 example: false
*
*     responses:
*       200:
*         description: Daily incentive updated
*/
router.put("/daily/:id", controller.updateDailyIncentive);
 
/**
* @swagger
* /api/admin/incentive/daily:
*   get:
*     summary: Get all daily incentives
*     tags: [Admin Daily Incentives]
*
*     responses:
*       200:
*         description: Daily incentives fetched successfully
*/
router.get("/daily", controller.getAllDailyIncentives);
 
/**
* @swagger
* /api/admin/incentive/daily/{id}:
*   get:
*     summary: Get single daily incentive
*     tags: [Admin Daily Incentives]
*
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*
*     responses:
*       200:
*         description: Daily incentive details
*/
router.get("/daily/:id", controller.getDailyIncentiveById);
 
/**
* @swagger
* /api/admin/incentive/daily/{id}:
*   delete:
*     summary: Delete Daily Incentive
*     tags: [Admin Daily Incentives]
*
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*
*     responses:
*       200:
*         description: Daily incentive deleted successfully
*/
router.delete("/daily/:id", controller.deleteDailyIncentive);
 
module.exports = router;