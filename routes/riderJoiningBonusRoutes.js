const express = require("express");
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const { getAvailablePrograms , getProgramDetails,joinProgram,getMyPrograms,getMyProgramProgress,getTodayTask} = require("../controllers/riderJoiningBonusController");
const riderJoiningBonusRouter = express.Router();



/**
 * @swagger
 * /api/rider/joining/bonus/programs/myProgress:
 *   get:
 *     tags:
 *       - Rider Joining Bonus
 *     summary: Get logged-in rider program progress
 *     description: >
 *       Fetches the active joining bonus program progress for the logged-in rider.
 *       
 *       Logic:
 *       - Retrieves latest ACTIVE enrollment
 *       - Automatically marks program as EXPIRED if expired
 *       - Returns all tasks with progress
 *       - Provides summary (completed, pending, rewards)
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *
 *       200:
 *         description: Program progress fetched successfully
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
 *                   type: object
 *                   properties:
 *
 *                     program:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: PROG12345
 *                         name:
 *                           type: string
 *                           example: Joining Bonus Program
 *                         validityDays:
 *                           type: number
 *                           example: 7
 *                         validFrom:
 *                           type: string
 *                           format: date-time
 *                         validTill:
 *                           type: string
 *                           format: date-time
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *
 *                     enrollment:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: ACTIVE
 *                         enrolledAt:
 *                           type: string
 *                           format: date-time
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalTasks:
 *                           type: number
 *                           example: 5
 *                         completedTasks:
 *                           type: number
 *                           example: 2
 *                         pendingTasks:
 *                           type: number
 *                           example: 3
 *                         totalRewardEarned:
 *                           type: number
 *                           example: 200
 *
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *
 *                           taskId:
 *                             type: string
 *                             example: TASK123
 *
 *                           dayNumber:
 *                             type: number
 *                             example: 1
 *
 *                           taskType:
 *                             type: string
 *                             example: ORDERS
 *
 *                           conditions:
 *                             type: object
 *                             properties:
 *                               minOrders:
 *                                 type: number
 *                                 example: 10
 *                               minAcceptanceRate:
 *                                 type: number
 *                                 example: null
 *                               minPeakSlots:
 *                                 type: number
 *                                 example: null
 *                               minEarnings:
 *                                 type: number
 *                                 example: null
 *
 *                           rewardAmount:
 *                             type: number
 *                             example: 100
 *
 *                           isCompleted:
 *                             type: boolean
 *                             example: true
 *
 *                           progressValue:
 *                             type: number
 *                             example: 8
 *
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *
 *       404:
 *         description: No active program found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: No active joining bonus program found
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Server error
 */

riderJoiningBonusRouter.get("/programs/myProgress",riderAuthMiddleWare, getMyProgramProgress);

/**
 * @swagger
 * /api/rider/joining/bonus/programs:
 *   get:
 *     tags:
 *       - Rider Joining Bonus
 *     security:
 *       - bearerAuth: []
 *     summary: Get available programs for rider
 *     description: >
 *       Fetches all active JOINING_BONUS programs available for the logged-in rider.
 *       
 *       Logic:
 *       - Filters only active programs
 *       - Filters based on current date (validFrom - validTill)
 *       - Filters based on rider's city & pincode
 *       - Returns only preview of tasks (first 2 tasks)
 *       - Includes enrollment status if rider already joined
 *
 *     responses:
 *
 *       200:
 *         description: Available programs fetched successfully
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
 *                 count:
 *                   type: number
 *                   example: 2
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *
 *                       id:
 *                         type: string
 *                         example: PROG12345
 *
 *                       name:
 *                         type: string
 *                         example: Joining Bonus Program
 *
 *                       validityDays:
 *                         type: number
 *                         example: 7
 *
 *                       rewardPreview:
 *                         type: number
 *                         example: 300
 *
 *                       isEnrolled:
 *                         type: boolean
 *                         example: true
 *
 *                       enrollmentStatus:
 *                         type: string
 *                         example: ACTIVE
 *
 *                       tasksPreview:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *
 *                             id:
 *                               type: string
 *                               example: TASK123
 *
 *                             dayNumber:
 *                               type: number
 *                               example: 1
 *
 *                             taskType:
 *                               type: string
 *                               example: ORDERS
 *
 *                             rewardAmount:
 *                               type: number
 *                               example: 100
 *
 *       400:
 *         description: Rider location not set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Rider location not set
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Server error
 */

riderJoiningBonusRouter.get("/programs", riderAuthMiddleWare,getAvailablePrograms);

/**
 * @swagger
 * /api/rider/joining/bonus/programs/{programId}:
 *   get:
 *     summary: Get program details with tasks
 *     tags: [Rider Joining Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Program details fetched
 *       404:
 *         description: Program not found
 */
riderJoiningBonusRouter.get("/programs/:programId",riderAuthMiddleWare, getProgramDetails);

/**
 * @swagger
 * /api/rider/joining/bonus/programs/{programId}/join:
 *   post:
 *     summary: Join a joining bonus program
 *     tags: [Rider Joining Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Joined successfully
 *       400:
 *         description: Already joined / Program not active
 */
riderJoiningBonusRouter.post("/programs/:programId/join", riderAuthMiddleWare,joinProgram);

/**
 * @swagger
 * /api/rider/joining/bonus/my-programs:
 *   get:
 *     summary: Get rider enrolled programs
 *     tags: [Rider Joining Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrolled programs fetched
 */
riderJoiningBonusRouter.get("/my-programs", riderAuthMiddleWare,getMyPrograms);



/**
 * @swagger
 * /api/rider/joining/bonus/programs/{programId}/today-task:
 *   get:
 *     summary: Get today's task for the program
 *     tags: [Rider Joining Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Today's task fetched
 */
riderJoiningBonusRouter.get("/programs/:programId/today-task", riderAuthMiddleWare,getTodayTask);

module.exports = riderJoiningBonusRouter;