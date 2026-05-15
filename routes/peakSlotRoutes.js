const express = require("express");
const router = express.Router();
const controller = require("../controllers/peakSlotController");
const prisma = require("../config/prisma");
 
/**
 * @swagger
 * /admin/incentives/peak-slot:
 *   post:
 *     summary: Create SLAB Peak Slot Incentive
 *     tags: [Peak Slot Incentives]
 *     description: Create slab-based peak slot incentive
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             ruleType: SLAB
 *             name: Peak Slab Bonus
 *             cityName: Hyderabad
 *
 *             pincodeIds:
 *               - "500082"
 *
 *             dateRange:
 *               startDate: "2026-05-01"
 *               endDate: "2026-05-31"
 *
 *             slots:
 *               - startTime: "18:00"
 *                 endTime: "21:00"
 *
 *                 daysOfWeek:
 *                   - MON
 *                   - TUE
 *                   - WED
 *                   - THU
 *                   - FRI
 *                   - SAT
 *                   - SUN
 *
 *                 slabs:
 *                   - minOrders: 5
 *                     maxOrders: 10
 *                     rewardAmount: 100
 *
 *                   - minOrders: 11
 *                     maxOrders: 20
 *                     rewardAmount: 200
 *
 *             isActive: true
 *
 *     responses:
 *       201:
 *         description: SLAB peak slot incentive created successfully
 *
 *       400:
 *         description: Validation error
 *
 *       500:
 *         description: Server error
 */


router.post("/peak-slot",controller.createPeakSlot)
 
 
 
/**
 * @swagger
 * /admin/incentives/peak-slot/{id}:
 *   put:
 *     summary: Update Peak Slot Incentive
 *     tags: [Peak Slot Incentives]
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: peak_001
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
 *                 example: Updated Evening Peak
 *               isActive:
 *                 type: boolean
 *                 example: false
 *
 *     responses:
 *       200:
 *         description: Updated successfully
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
 *                   example: Peak slot updated successfully
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
 
router.put("/peak-slot/:id", controller.updatePeakSlot);
 
/**
 * @swagger
 * /admin/incentives/peak-slot:
 *   get:
 *     summary: Get all Peak Slot Incentives
 *     tags: [Peak Slot Incentives]
 *
 *     responses:
 *       200:
 *         description: Successfully fetched peak slot incentives
 *
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: array
 *
 *                   items:
 *                     type: object
 *
 *                     properties:
 *
 *                       id:
 *                         type: string
 *                         example: peak_001
 *
 *                       name:
 *                         type: string
 *                         example: Evening Peak Bonus
 *
 *                       ruleType:
 *                         type: string
 *                         example: PER_ORDER
 *
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *
 *                       pincodeIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example:
 *                           - "500081"
 *                           - "500032"
 *
 *                       slotId:
 *                         type: string
 *                         example: slot_001
 *
 *                       startTime:
 *                         type: string
 *                         example: "18:00"
 *
 *                       endTime:
 *                         type: string
 *                         example: "21:00"
 *
 *                       slotTiming:
 *                         type: string
 *                         example: "18:00 - 21:00"
 *
 *                       daysOfWeek:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example:
 *                           - MON
 *                           - TUE
 *
 *                       slots:
 *                         type: array
 *
 *                         items:
 *                           type: object
 *
 *                           properties:
 *
 *                             slotId:
 *                               type: string
 *                               example: slot_001
 *
 *                             startTime:
 *                               type: string
 *                               example: "18:00"
 *
 *                             endTime:
 *                               type: string
 *                               example: "21:00"
 *
 *                             slotTiming:
 *                               type: string
 *                               example: "18:00 - 21:00"
 *
 *                             daysOfWeek:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example:
 *                                 - SAT
 *                                 - SUN
 *
 *                             ruleType:
 *                               type: string
 *                               example: PER_ORDER
 *
 *                       target:
 *                         type: object
 *
 *                         properties:
 *                           orders:
 *                             type: number
 *                             example: 20
 *
 *                       conditions:
 *                         type: object
 *
 *                         properties:
 *                           minOrders:
 *                             type: number
 *                             example: 20
 *
 *                           minEarnings:
 *                             type: number
 *                             example: 1000
 *
 *                           minAcceptanceRate:
 *                             type: number
 *                             example: 90
 *
 *                           minCompletionRate:
 *                             type: number
 *                             example: 95
 *
 *                       reward:
 *                         type: object
 *
 *                         properties:
 *                           amount:
 *                             type: number
 *                             example: 300
 *
 *                       maxPayoutPerDay:
 *                         type: number
 *                         example: 300
 *
 *       500:
 *         description: Server error
 */
router.get("/peak-slot",controller.getAllPeakSlots)
 
 
/**
 * @swagger
 * /admin/incentives/peak-slot/{id}:
 *   get:
 *     summary: Get single Peak Slot Incentive details
 *     tags: [Peak Slot Incentives]
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: peak_001
 *
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: peak_001
 *
 *                     name:
 *                       type: string
 *                       example: Evening Peak Bonus
 *
 *                     cityName:
 *                       type: string
 *                       example: Hyderabad
 *
 *                     slots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                             example: "18:00"
 *
 *                           endTime:
 *                             type: string
 *                             example: "21:00"
 *
 *                           daysOfWeek:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["MON", "TUE"]
 *
 *                           ruleType:
 *                             type: string
 *                             example: PER_ORDER
 *
 *                           reward:
 *                             type: object
 *                             properties:
 *                               amount:
 *                                 type: number
 *                                 example: 20
 *
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.get("/peak-slot/:id", controller.getPeakSlotById);


/**
 * @swagger
 * /admin/incentives/peak-slot/{id}:
 *   delete:
 *     summary: Delete Peak Slot Program
 *     description: >
 *       Deletes a peak slot program by ID.
 *       Deletion is only allowed if no slot is currently active.
 *       A slot is considered active when:
 *       - Current day matches slot daysOfWeek
 *       - Current time is within startMinutes and endMinutes
 *
 *     tags:
 *       - Peak Slot Incentives
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Program ID of the peak slot to delete
 *         schema:
 *           type: string
 *           example: c38edbe3-7c34-47c0-bc03-d4108f169f8b
 *
 *     responses:
 *       200:
 *         description: Peak slot deleted successfully
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
 *                   example: Peak slot deleted successfully
 *
 *       400:
 *         description: Cannot delete while slot is active
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
 *                   example: Cannot delete peak slot while it is active
 *
 *       404:
 *         description: Program not found
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
 *                   example: Peak slot not found
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
 *                   example: Something went wrong
 */
 

router.delete("/peak-slot/:id", controller.deletePeakSlot);

module.exports = router;
 