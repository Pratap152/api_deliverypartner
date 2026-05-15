const express = require("express");
const joiningBonusRouter = express.Router();

const { createProgram ,createProgramTask,getProgramTasks, getAllPrograms, getProgramById, updateProgram, toggleProgramStatus, getTasks, updateTask, deleteTask, getProgramRiders, getRiderProgress} = require("../controllers/adminJoiningBonusController");


/**
 * @swagger
 * /api/admin/joining/bonus/program:
 *   post:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Create a new program
 *     description: >
 *       Creates a new joining bonus/incentive program.
 *       
 *       Features:
 *       - Validates cityIds and pincodeIds
 *       - Prevents duplicate active programs for same pincodes
 *       - Supports JOINING_BONUS specific validation
 *       - Stores multiple cities and pincodes
 *       - Validates date range and validityDays
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             example:
 *               name: Task Based Joining Bonus
 *               description: task based joining bonus
 *               programType: JOINING_BONUS
 *               joiningBonusType: TASK_BASED
 *               trackingType: DAILY
 *               ruleType: TASK
 *               validFrom: 2026-05-08
 *               validTill: 2026-06-30
 *               validityDays: 7
 *               cityIds:
 *                 - city1
 *               pincodeIds:
 *                 - pin1
 *
 *             required:
 *               - name
 *               - programType
 *               - trackingType
 *               - ruleType
 *               - validFrom
 *               - validTill
 *               - validityDays
 *               - cityIds
 *               - pincodeIds
 *
 *             properties:
 *
 *               name:
 *                 type: string
 *                 example: Hyderabad Joining Bonus
 *
 *               description:
 *                 type: string
 *                 example: Rider joining bonus program for Hyderabad city
 *
 *               programType:
 *                 type: string
 *                 enum:
 *                   - JOINING_BONUS
 *                   - INCENTIVE
 *                 example: JOINING_BONUS
 *
 *               joiningBonusType:
 *                 type: string
 *                 enum:
 *                   - TASK_BASED
 *                   - GUARANTEE
 *                   - FIXED
 *                 example: TASK_BASED
 *
 *               trackingType:
 *                 type: string
 *                 enum:
 *                   - DAILY
 *                   - WEEKLY
 *                   - MONTHLY
 *                 example: DAILY
 *
 *               ruleType:
 *                 type: string
 *                 enum:
 *                   - TASK
 *                   - ORDER
 *                   - EARNING
 *                 example: TASK
 *
 *               validFrom:
 *                 type: string
 *                 format: date
 *                 example: 2026-05-08
 *
 *               validTill:
 *                 type: string
 *                 format: date
 *                 example: 2026-06-30
 *
 *               validityDays:
 *                 type: number
 *                 example: 7
 *
 *               cityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - city1
 *                   - city2
 *
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - pin1
 *                   - pin2
 *
 *     responses:
 *
 *       201:
 *         description: Program created successfully
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
 *                 message:
 *                   type: string
 *                   example: Program created successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *
 *                     id:
 *                       type: string
 *                       example: PROG12345
 *
 *                     name:
 *                       type: string
 *                       example: Hyderabad Joining Bonus
 *
 *                     description:
 *                       type: string
 *                       example: Rider joining bonus program for Hyderabad city
 *
 *                     programType:
 *                       type: string
 *                       example: JOINING_BONUS
 *
 *                     joiningBonusType:
 *                       type: string
 *                       example: TASK_BASED
 *
 *                     trackingType:
 *                       type: string
 *                       example: DAILY
 *
 *                     ruleType:
 *                       type: string
 *                       example: TASK
 *
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *
 *                     validityDays:
 *                       type: number
 *                       example: 7
 *
 *                     cityId:
 *                       type: array
 *                       items:
 *                         type: string
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *
 *       400:
 *         description: Validation error
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
 *                   examples:
 *                     missingName:
 *                       value: Program name is required
 *
 *                     invalidDate:
 *                       value: validFrom cannot be greater than validTill
 *
 *                     invalidCities:
 *                       value: Some cityIds are invalid
 *
 *                     invalidPincodes:
 *                       value: Some pincodeIds are invalid
 *
 *                     duplicate:
 *                       value: Program already exists for selected pincodes
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
 *                   example: Internal server error
 */

joiningBonusRouter.post("/program", createProgram);


/**
 * @swagger
 * /api/admin/joining/bonus/programTask:
 *   post:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Create program task
 *     description: >
 *       Creates a task for a TASK_BASED joining bonus program.
 *
 *       Features:
 *       - Supports multiple task types
 *       - Validates task conditions dynamically
 *       - Prevents duplicate tasks for same day + type
 *       - Ensures task dayNumber is within program validity
 *       - Only TASK_BASED programs can have tasks
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *               - dayNumber
 *               - taskType
 *               - rewardAmount
 *             properties:
 *
 *               programId:
 *                 type: string
 *                 example: PROG12345
 *
 *               dayNumber:
 *                 type: number
 *                 example: 1
 *
 *               taskType:
 *                 type: string
 *                 enum:
 *                   - ORDERS
 *                   - ACCEPTANCE_RATE
 *                   - PEAK_SLOTS
 *                   - EARNINGS
 *                 example: ORDERS
 *
 *               minOrders:
 *                 type: number
 *                 example: 10
 *
 *               minAcceptanceRate:
 *                 type: number
 *                 example: 90
 *
 *               minPeakSlots:
 *                 type: number
 *                 example: 5
 *
 *               minEarnings:
 *                 type: number
 *                 example: 2000
 *
 *               rewardAmount:
 *                 type: number
 *                 example: 100
 *
 *     responses:
 *
 *       201:
 *         description: Program task created successfully
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
 *                 message:
 *                   type: string
 *                   example: Program task created successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *
 *                     id:
 *                       type: string
 *                       example: TASK12345
 *
 *                     programId:
 *                       type: string
 *                       example: PROG12345
 *
 *                     dayNumber:
 *                       type: number
 *                       example: 1
 *
 *                     taskType:
 *                       type: string
 *                       example: ORDERS
 *
 *                     minOrders:
 *                       type: number
 *                       example: 10
 *
 *                     minAcceptanceRate:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *
 *                     minPeakSlots:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *
 *                     minEarnings:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *
 *                     rewardAmount:
 *                       type: number
 *                       example: 100
 *
 *       400:
 *         description: Validation error
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
 *                   examples:
 *
 *                     invalidDay:
 *                       value: Valid dayNumber is required
 *
 *                     invalidReward:
 *                       value: Valid rewardAmount is required
 *
 *                     missingOrders:
 *                       value: minOrders is required for ORDERS task
 *
 *                     missingAcceptance:
 *                       value: minAcceptanceRate is required for ACCEPTANCE_RATE task
 *
 *                     missingPeakSlots:
 *                       value: minPeakSlots is required for PEAK_SLOTS task
 *
 *                     missingEarnings:
 *                       value: minEarnings is required for EARNINGS task
 *
 *                     invalidProgramType:
 *                       value: Tasks can only be created for TASK_BASED programs
 *
 *                     exceedsValidity:
 *                       value: Day 10 exceeds program validity of 7 days
 *
 *                     duplicateTask:
 *                       value: Task already exists for Day 1 with type ORDERS
 *
 *       404:
 *         description: Program not found
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
 *                   example: Program not found
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

joiningBonusRouter.post("/programTask", createProgramTask);


/**
 * @swagger
 * /api/admin/joining/bonus/program:
 *   get:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Get program tasks
 *     description: >
 *       Fetches all tasks for a given programId.
 *       Tasks are returned in ascending order of dayNumber.
 *
 *
 *     parameters:
 *       - in: query
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *         example: PROG12345
 *
 *     responses:
 *
 *       200:
 *         description: Program tasks fetched successfully
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
 *                 message:
 *                   type: string
 *                   example: Program tasks fetched
 *
 *                 count:
 *                   type: number
 *                   example: 3
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *
 *                       id:
 *                         type: string
 *                         example: TASK12345
 *
 *                       programId:
 *                         type: string
 *                         example: PROG12345
 *
 *                       dayNumber:
 *                         type: number
 *                         example: 1
 *
 *                       taskType:
 *                         type: string
 *                         example: ORDERS
 *
 *                       minOrders:
 *                         type: number
 *                         example: 10
 *
 *                       minAcceptanceRate:
 *                         type: number
 *                         example: null
 *
 *                       minPeakSlots:
 *                         type: number
 *                         example: null
 *
 *                       minEarnings:
 *                         type: number
 *                         example: null
 *
 *                       rewardAmount:
 *                         type: number
 *                         example: 100
 *
 *       400:
 *         description: Missing programId
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
 *                   example: programId is required
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

joiningBonusRouter.get("/program", getProgramTasks);


/**
 * @swagger
 * /api/admin/joining/bonus/programs:
 *   get:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Get all programs
 *     description: >
 *       Fetches all programs based on filters.
 *       Supports filtering by isActive and programType.
 *       Results are sorted by latest created programs first.
 *
 *
 *     parameters:
 *       - in: query
 *         name: isActive
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter active or inactive programs
 *         example: "true"
 *
 *       - in: query
 *         name: programType
 *         required: true
 *         schema:
 *           type: string
 *         description: Type of program
 *         example: INCENTIVE
 *
 *     responses:
 *
 *       200:
 *         description: Programs fetched successfully
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
 *                         example: Weekly Delivery Bonus
 *
 *                       description:
 *                         type: string
 *                         example: Riders earn bonus for completing weekly tasks
 *
 *                       programType:
 *                         type: string
 *                         example: INCENTIVE
 *
 *                       trackingType:
 *                         type: string
 *                         example: ORDER_COUNT
 *
 *                       ruleType:
 *                         type: string
 *                         example: THRESHOLD
 *
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *
 *                       validTill:
 *                         type: string
 *                         format: date-time
 *
 *                       validityDays:
 *                         type: number
 *                         example: 30
 *
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *
 *                       cityId:
 *                         type: array
 *                         items:
 *                           type: string
 *
 *                       pincodeIds:
 *                         type: array
 *                         items:
 *                           type: string
 *
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *
 *       400:
 *         description: Missing required query parameters
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
 *                   example: isActive and programType is required
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

joiningBonusRouter.get("/programs", getAllPrograms);

/**
 * @swagger
 * /api/admin/joining/bonus/programs/{programId}:
 *   get:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Get program by ID
 *     description: >
 *       Fetches a program by its ID along with related data including:
 *       tasks, slabs, and rules.
 *
 *
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique Program ID
 *         example: PROG12345
 *
 *     responses:
 *
 *       200:
 *         description: Program fetched successfully
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
 *                     id:
 *                       type: string
 *                       example: PROG12345
 *
 *                     name:
 *                       type: string
 *                       example: Weekly Delivery Bonus
 *
 *                     description:
 *                       type: string
 *                       example: Riders earn bonus for completing weekly tasks
 *
 *                     programType:
 *                       type: string
 *                       example: INCENTIVE
 *
 *                     trackingType:
 *                       type: string
 *                       example: ORDER_COUNT
 *
 *                     ruleType:
 *                       type: string
 *                       example: THRESHOLD
 *
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *
 *                     validityDays:
 *                       type: number
 *                       example: 30
 *
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *
 *                     cityId:
 *                       type: array
 *                       items:
 *                         type: string
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *
 *                           id:
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
 *                           minOrders:
 *                             type: number
 *                             example: 10
 *
 *                           rewardAmount:
 *                             type: number
 *                             example: 100
 *
 *                     slabs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: SLAB123
 *
 *                     rules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: RULE123
 *
 *       400:
 *         description: Missing programId
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
 *                   example: programId is required
 *
 *       404:
 *         description: Program not found
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
 *                   example: Program not found
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

joiningBonusRouter.get("/programs/:programId", getProgramById);

/**
 * @swagger
 * /api/admin/joining/bonus/programs/{programId}:
 *   put:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Update a program
 *     description: >
 *       Updates a program before it starts.
 *       Program cannot be updated if it has already started (validFrom passed).
 *       Also validates date ranges, prevents overlapping programs for same city/pincode,
 *       and ensures existing tasks do not exceed validityDays.
 *
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique Program ID
 *         example: PROG12345
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *
 *               name:
 *                 type: string
 *                 example: Updated Weekly Bonus
 *
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-06-01T00:00:00.000Z
 *
 *               validTill:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-07-01T00:00:00.000Z
 *
 *               cityId:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["CITY123", "CITY456"]
 *
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["500081", "500032"]
 *
 *     responses:
 *
 *       200:
 *         description: Program updated successfully
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
 *                 message:
 *                   type: string
 *                   example: Program updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *
 *                     id:
 *                       type: string
 *                       example: PROG12345
 *
 *                     name:
 *                       type: string
 *                       example: Updated Weekly Bonus
 *
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *
 *                     cityId:
 *                       type: array
 *                       items:
 *                         type: string
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *
 *       400:
 *         description: Validation or business rule error
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
 *                   example: Cannot update active or started program
 *
 *       404:
 *         description: Program not found
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
 *                   example: Program not found
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

joiningBonusRouter.put("/programs/:programId", updateProgram);

/**
 * @swagger
 * /api/admin/joining/bonus/programs/{programId}/status:
 *   patch:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Activate or deactivate a program
 *     description: >
 *       Toggles the active status of a program.
 *       
 *       Activation rules:
 *       - Cannot activate expired programs
 *       - Must have valid date range
 *       - Must contain at least one task
 *       - validityDays must be defined
 *       - No overlapping active program in same city/pincode
 *
 *       Deactivation rules:
 *       - Cannot deactivate a currently running program
 *
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique Program ID
 *         example: PROG12345
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *
 *               isActive:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *
 *       200:
 *         description: Program status updated successfully
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
 *                 message:
 *                   type: string
 *                   example: Program activated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *
 *                     id:
 *                       type: string
 *                       example: PROG12345
 *
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *
 *       400:
 *         description: Validation or business rule error
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
 *                   example: Cannot activate expired program
 *
 *       404:
 *         description: Program not found
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
 *                   example: Program not found
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

joiningBonusRouter.patch("/programs/:programId/status", toggleProgramStatus);

/**
 * @swagger
 * /api/admin/joining/bonus/programs/{programId}/tasks:
 *   get:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Get tasks for a program
 *     description: >
 *       Fetches all tasks for a given program.
 *       Tasks are sorted by dayNumber in ascending order.
 *       
 *       Additional checks:
 *       - Returns empty list if no tasks exist
 *       - Logs warning if tasks exceed validityDays
 *       - Logs warning if duplicate dayNumber exists
 *
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique Program ID
 *         example: PROG12345
 *
 *     responses:
 *
 *       200:
 *         description: Tasks fetched successfully
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
 *                   example: 3
 *
 *                 programMeta:
 *                   type: object
 *                   properties:
 *
 *                     validityDays:
 *                       type: number
 *                       example: 7
 *
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *
 *                       id:
 *                         type: string
 *                         example: TASK12345
 *
 *                       programId:
 *                         type: string
 *                         example: PROG12345
 *
 *                       dayNumber:
 *                         type: number
 *                         example: 1
 *
 *                       taskType:
 *                         type: string
 *                         example: ORDERS
 *
 *                       minOrders:
 *                         type: number
 *                         example: 10
 *
 *                       minAcceptanceRate:
 *                         type: number
 *                         example: null
 *
 *                       minPeakSlots:
 *                         type: number
 *                         example: null
 *
 *                       minEarnings:
 *                         type: number
 *                         example: null
 *
 *                       rewardAmount:
 *                         type: number
 *                         example: 100
 *
 *       400:
 *         description: Missing programId
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
 *                   example: programId is required
 *
 *       404:
 *         description: Program not found
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
 *                   example: Program not found
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

joiningBonusRouter.get("/programs/:programId/tasks", getTasks);


/**
 * @swagger
 * /api/admin/joining/bonus/tasks/{taskId}:
 *   put:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Update a program task
 *     description: >
 *       Updates a program task before the program starts.
 *       
 *       Rules:
 *       - Cannot update task if program already started
 *       - dayNumber must be >= 1 and within program validityDays
 *       - Duplicate dayNumber not allowed within same program
 *       - rewardAmount must be greater than 0
 *       - taskType must be valid
 *       - At least one condition field must be provided
 *
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique Task ID
 *         example: TASK12345
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *
 *               dayNumber:
 *                 type: number
 *                 example: 2
 *
 *               taskType:
 *                 type: string
 *                 enum: [ORDERS, ACCEPTANCE_RATE, PEAK_SLOTS, EARNINGS]
 *                 example: ORDERS
 *
 *               minOrders:
 *                 type: number
 *                 example: 15
 *
 *               minAcceptanceRate:
 *                 type: number
 *                 example: 85
 *
 *               minPeakSlots:
 *                 type: number
 *                 example: 3
 *
 *               minEarnings:
 *                 type: number
 *                 example: 500
 *
 *               rewardAmount:
 *                 type: number
 *                 example: 150
 *
 *     responses:
 *
 *       200:
 *         description: Task updated successfully
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
 *                 message:
 *                   type: string
 *                   example: Task updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *
 *                     id:
 *                       type: string
 *                       example: TASK12345
 *
 *                     programId:
 *                       type: string
 *                       example: PROG12345
 *
 *                     dayNumber:
 *                       type: number
 *                       example: 2
 *
 *                     taskType:
 *                       type: string
 *                       example: ORDERS
 *
 *                     minOrders:
 *                       type: number
 *                       example: 15
 *
 *                     minAcceptanceRate:
 *                       type: number
 *                       example: null
 *
 *                     minPeakSlots:
 *                       type: number
 *                       example: null
 *
 *                     minEarnings:
 *                       type: number
 *                       example: null
 *
 *                     rewardAmount:
 *                       type: number
 *                       example: 150
 *
 *       400:
 *         description: Validation or business rule error
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
 *                   example: Cannot update task after program started
 *
 *       404:
 *         description: Task not found
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
 *                   example: Task not found
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

joiningBonusRouter.put("/tasks/:taskId", updateTask);

/**
 * @swagger
 * /api/admin/joining/bonus/tasks/{taskId}:
 *   delete:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Delete a program task
 *     description: >
 *       Deletes a program task before the program starts.
 *       
 *       Rules:
 *       - Cannot delete task if program already started
 *       - Cannot delete if any rider has started task progress
 *       - Cannot delete if program progress already exists
 *
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique Task ID
 *         example: TASK12345
 *
 *     responses:
 *
 *       200:
 *         description: Task deleted successfully
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
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *
 *       400:
 *         description: Validation or business rule error
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
 *                   example: Cannot delete task after program started
 *
 *       404:
 *         description: Task not found
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
 *                   example: Task not found
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

joiningBonusRouter.delete("/tasks/:taskId", deleteTask);

/**
 * @swagger
 * /api/admin/joining/bonus/programs/{programId}/riders:
 *   get:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Get riders enrolled in a program
 *     description: >
 *       Fetch paginated list of riders enrolled in a program.
 *       Supports filtering by enrollment status.
 *
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         example: PROG12345
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         example: 10
 *
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, EXPIRED]
 *         example: ACTIVE
 *
 *     responses:
 *
 *       200:
 *         description: Riders fetched successfully
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
 *                   example: 25
 *
 *                 page:
 *                   type: number
 *                   example: 1
 *
 *                 limit:
 *                   type: number
 *                   example: 10
 *
 *                 programMeta:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Weekly Bonus
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                     validTill:
 *                       type: string
 *                       format: date-time
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *
 *                       id:
 *                         type: string
 *                         example: ENROLL123
 *
 *                       status:
 *                         type: string
 *                         example: ACTIVE
 *
 *                       enrolledAt:
 *                         type: string
 *                         format: date-time
 *
 *                       rider:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: RIDER123
 *                           phoneNumber:
 *                             type: string
 *                             example: 9876543210
 *                           isOnline:
 *                             type: boolean
 *                             example: true
 *                           isFullyRegistered:
 *                             type: boolean
 *                             example: true
 *
 *       400:
 *         description: Invalid input or filters
 *       404:
 *         description: Program not found
 *       500:
 *         description: Server error
 */


joiningBonusRouter.get("/programs/:programId/riders", getProgramRiders);

/**
 * @swagger
 * /api/admin/joining/bonus/programs/{programId}/riders/{riderId}:
 *   get:
 *     tags:
 *       - Admin Joining Bonus
 *     summary: Get rider progress in a program
 *     description: >
 *       Fetch detailed progress of a rider including:
 *       - Task-wise progress
 *       - Completion status
 *       - Rewards earned
 *       - Overall program progress
 *
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: string
 *         example: PROG12345
 *
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *         example: RIDER123
 *
 *     responses:
 *
 *       200:
 *         description: Rider progress fetched successfully
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
 *                           example: Weekly Bonus
 *                         validityDays:
 *                           type: number
 *                           example: 7
 *                         validFrom:
 *                           type: string
 *                           format: date-time
 *                         validTill:
 *                           type: string
 *                           format: date-time
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
 *                           example: 3
 *                         pendingTasks:
 *                           type: number
 *                           example: 2
 *                         totalRewardEarned:
 *                           type: number
 *                           example: 300
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
 *                               minAcceptanceRate:
 *                                 type: number
 *                               minPeakSlots:
 *                                 type: number
 *                               minEarnings:
 *                                 type: number
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
 *                             example: 10
 *
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *
 *                     overallProgress:
 *                       type: object
 *                       nullable: true
 *
 *       400:
 *         description: Missing programId or riderId
 *       404:
 *         description: Program or enrollment not found
 *       500:
 *         description: Server error
 */

joiningBonusRouter.get("/programs/:programId/riders/:riderId", getRiderProgress);

module.exports = joiningBonusRouter;