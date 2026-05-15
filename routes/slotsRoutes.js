const express = require("express");
const slotRouter = express.Router();

const { getWeeklySlots, getDailySlots ,bookSlot , cancelSlot ,getCurrentSlot ,getDailySlotsWithStatus, getSlotHistory ,  getCurrentAndNextSlot ,getSlotCapacity} = require("../controllers/slotsController");
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");

/**
 * @swagger
 * /api/slots/week:
 *   get:
 *     tags: [Slots]
 *     summary: Get weekly slots based on rider location
 *     description: >
 *       Fetch slots for a given week.
 *       Slots are automatically filtered using the rider's saved city and pincode.
 *       If weekNumber or year is not provided, current week is used.
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: weekNumber
 *         required: false
 *         schema:
 *           type: number
 *         example: 18
 *         description: Week number (1–52). Defaults to current week
 *
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: number
 *         example: 2026
 *         description: Year. Defaults to current year
 *
 *     responses:
 *       200:
 *         description: Weekly slots fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Weekly slots fetched"
 *               weekNumber: 18
 *               year: 2026
 *               count: 7
 *               data:
 *                 - date: "2026-04-27"
 *                   dayName: "Mon"
 *                   weekNumber: 18
 *                   year: 2026
 *                   cityId: "city-uuid"
 *                   pincodeId: "pincode-uuid"
 *                   slots:
 *                     - slotId: "db7e5fb1-a8fd-43da-bb5f-34d517cf32fc"
 *                       startTime: "06:00"
 *                       endTime: "08:00"
 *                       maxRiders: 40
 *                       bookedRiders: 5
 *                       status: "ACTIVE"
 *
 *       400:
 *         description: Missing or invalid data
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Rider location not set"
 *
 *       404:
 *         description: Invalid city or pincode
 *         content:
 *           application/json:
 *             examples:
 *               cityNotFound:
 *                 value:
 *                   success: false
 *                   message: "City not found"
 *
 *               pincodeNotFound:
 *                 value:
 *                   success: false
 *                   message: "Pincode not found"
 *
 *       201:
 *         description: No slots available
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "No slots found for this week"
 *               weekNumber: 18
 *               year: 2026
 *               count: 0
 *               data: []
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */

slotRouter.get("/week",riderAuthMiddleWare ,getWeeklySlots);

/**
 * @swagger
 * /api/slots/day:
 *   get:
 *     tags: [Slots]
 *     summary: Get daily slots based on rider location
 *     description: >
 *       Fetch all active slots for a specific date.
 *       Slots are automatically filtered using the rider's saved city and pincode.
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-04-27
 *         description: Date for which slots are fetched (YYYY-MM-DD)
 *
 *     responses:
 *       200:
 *         description: Daily slots fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Daily slots fetched"
 *               date: "2026-04-27"
 *               weekNumber: 18
 *               year: 2026
 *               count: 2
 *               data:
 *                 - slotId: "db7e5fb1-a8fd-43da-bb5f-34d517cf32fc"
 *                   startTime: "06:00"
 *                   endTime: "08:00"
 *                   maxRiders: 40
 *                   bookedRiders: 5
 *                   isPeakSlot: false
 *
 *       400:
 *         description: Missing required data
 *         content:
 *           application/json:
 *             examples:
 *               missingDate:
 *                 value:
 *                   success: false
 *                   message: "Date is required (YYYY-MM-DD)"
 *
 *               locationMissing:
 *                 value:
 *                   success: false
 *                   message: "Rider location not set"
 *
 *       404:
 *         description: Invalid city or pincode
 *         content:
 *           application/json:
 *             examples:
 *               cityNotFound:
 *                 value:
 *                   success: false
 *                   message: "City not found"
 *
 *               pincodeNotFound:
 *                 value:
 *                   success: false
 *                   message: "Pincode not found"
 *
 *       201:
 *         description: No slots available
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "No slots found for this date"
 *               date: "2026-04-27"
 *               count: 0
 *               data: []
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */

slotRouter.get("/day",riderAuthMiddleWare, getDailySlots);

/**
 * @swagger
 * /api/slots/book:
 *   post:
 *     summary: Book slots based on rider location (city + pincode)
 *     tags: [Slots]
 *     description: >
 *       Books one or more slots for the rider.
 *       Slots are automatically filtered using rider's saved city and pincode.
 *       Rider must complete onboarding before booking.
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
 *               - date
 *               - slotIds
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-27"
 *                 description: Slot date (YYYY-MM-DD)
 *
 *               slotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "db7e5fb1-a8fd-43da-bb5f-34d517cf32fc"
 *                   - "aaaf206d-5585-40bb-96ea-88a058955999"
 *
 *     responses:
 *       200:
 *         description: Slots booked successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Slots booked successfully"
 *               bookedCount: 1
 *               failedCount: 1
 *               booked:
 *                 - slotId: "db7e5fb1-a8fd-43da-bb5f-34d517cf32fc"
 *                   date: "2026-04-27"
 *                   startTime: "06:00"
 *                   endTime: "08:00"
 *               failed:
 *                 - slotId: "aaaf206d-5585-40bb-96ea-88a058955999"
 *                   reason: "Slot is full"
 *
 *       400:
 *         description: Invalid request or missing data
 *         content:
 *           application/json:
 *             examples:
 *               missingData:
 *                 value:
 *                   success: false
 *                   message: "date and slotIds[] are required"
 *
 *               noValidSlots:
 *                 value:
 *                   success: false
 *                   message: "No valid slots to book"
 *                   failed:
 *                     - slotId: "abc"
 *                       reason: "Already booked"
 *
 *               locationMissing:
 *                 value:
 *                   success: false
 *                   message: "Rider location not set"
 *
 *       403:
 *         description: Rider not fully onboarded
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Complete onboarding before booking slots"
 *
 *       404:
 *         description: Rider or slots not found
 *         content:
 *           application/json:
 *             examples:
 *               riderNotFound:
 *                 value:
 *                   success: false
 *                   message: "Rider not found"
 *
 *               noSlots:
 *                 value:
 *                   success: false
 *                   message: "No slots found for this date"
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */

slotRouter.post("/book", riderAuthMiddleWare, bookSlot);

/**
 * @swagger
 * /api/slots/cancel/{bookingId}:
 *   delete:
 *     summary: Cancel a booked slot
 *     description: Rider cancels an already booked slot before the slot start time.
 *     tags:
 *       - Slots
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB Booking ID of the slot booking
 *     responses:
 *       200:
 *         description: Slot cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request (invalid bookingId or cannot cancel past slot)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Unauthorized attempt to cancel another rider's booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 */


slotRouter.delete("/cancel/:bookingId", riderAuthMiddleWare, cancelSlot);

/**
 * @swagger
 * /api/slots/current:
 *   get:
 *     summary: Get current running slot or next available slot for today
 *     tags:
 *       - Slots
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Returns the current ACTIVE slot based on rider location (derived from token).
 *       If the current slot has already started, `delayMinutes` indicates how late the rider is.
 *       If the current slot is full, the next available ACTIVE slot is returned.
 *       If no slots are available for today, `data` will be null.
 *
 *     responses:
 *       200:
 *         description: Successfully fetched slot information
 *         content:
 *           application/json:
 *             examples:
 *               currentSlot:
 *                 summary: Current slot available
 *                 value:
 *                   success: true
 *                   message: "Current slot available"
 *                   date: "2025-12-27"
 *                   data:
 *                     daySlotId: "6950f9e348bc25e14034abf1"
 *                     slot:
 *                       slotId: "677fc1000000000000000017"
 *                       startTime: "10:00"
 *                       endTime: "12:00"
 *                       durationInHours: 2
 *                       bookedRiders: 12
 *                       maxRiders: 40
 *                       isPeakSlot: false
 *                       status: "ACTIVE"
 *                     isBooked: false
 *                     delayMinutes: 18
 *
 *               nextSlot:
 *                 summary: Current slot full, showing next slot
 *                 value:
 *                   success: true
 *                   message: "Current slot full, showing next slot"
 *                   date: "2025-12-27"
 *                   data:
 *                     daySlotId: "6950f9e348bc25e14034abf1"
 *                     slot:
 *                       slotId: "677fc1000000000000000018"
 *                       startTime: "12:00"
 *                       endTime: "14:00"
 *                       durationInHours: 2
 *                       bookedRiders: 5
 *                       maxRiders: 40
 *                       isPeakSlot: false
 *                       status: "ACTIVE"
 *                     isBooked: false
 *                     delayMinutes: 0
 *
 *               noSlots:
 *                 summary: No slots available for today
 *                 value:
 *                   success: true
 *                   message: "No available slots for today"
 *                   data: null
 *
 *       400:
 *         description: Rider location not configured
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Rider location not configured"
 *
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Server error"
 */


slotRouter.get("/current", riderAuthMiddleWare, getCurrentSlot);

/**
 * @swagger
 * /api/slots/status:
 *   get:
 *     tags:
 *       - Slots
 *     summary: Get daily slots with booking status
 *     description: >
 *       Returns all slots for a specific date, city, and zone, including rider-specific booking status.  
 *       Filters:
 *       - **status=all** → all slots (available, booked, cancelled)  
 *       - **status=booked** → only slots booked by rider  
 *       - **status=cancelled** → only cancelled slots by rider  
 *       Requires Authorization header.
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           example: "2025-12-01"
 *
 *       - in: query
 *         name: cityId
 *         required: true
 *         description: City name
 *         schema:
 *           type: string
 *           example: "Hyderabad"
 *
 *       - in: query
 *         name: pincodeId
 *         required: true
 *         description: Pincode Id
 *         schema:
 *           type: string
 *           example: "Gachibowli"
 *
 *       - in: query
 *         name: status
 *         required: false
 *         description: >
 *           Filter results:  
 *           - all (default)  
 *           - booked  
 *           - cancelled
 *         schema:
 *           type: string
 *           enum: [all,available, booked, cancelled]
 *           example: "all"
 *
 *     responses:
 *       200:
 *         description: Daily slots fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 date:
 *                   type: string
 *                   example: "2025-12-01"
 *                 count:
 *                   type: number
 *                   example: 9
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       slotId:
 *                         type: string
 *                         example: "677fc1000000000000000011"
 *                       startTime:
 *                         type: string
 *                         example: "06:00"
 *                       endTime:
 *                         type: string
 *                         example: "08:00"
 *                       isBooked:
 *                         type: boolean
 *                         example: true
 *                       isCancelled:
 *                         type: boolean
 *                         example: false
 *                       bookingId:
 *                         type: string
 *                         nullable: true
 *                         example: "6950aa2e12cdfe123ac99871"
 *                       bookingStatus:
 *                         type: string
 *                         example: "BOOKED"
 *
 *       400:
 *         description: Missing required params
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Date, city and zone are required"
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Server error"
 */

slotRouter.get("/status", riderAuthMiddleWare, getDailySlotsWithStatus);


/**
 * @swagger
 * /api/slots/history:
 *   get:
 *     summary: Get weekly slot history for rider
 *     description: >
 *       Returns slot history for the selected week.  
 *       Includes weekly summary (completed, cancelled, no-shows, failed)  
 *       and day-wise slot details for all 7 days — even if the rider has no bookings on some days.
 *
 *     tags:
 *       - Slots
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: weekNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: ISO Week number (1–53)
 *
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *         description: Year (defaults to current year if empty)
 *
 *     responses:
 *       200:
 *         description: Weekly slot history fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Weekly slot history fetched"
 *               weekNumber: 51
 *               year: 2025
 *               summary:
 *                 totalSlots: 5
 *                 completed: 2
 *                 cancelled: 1
 *                 noShow: 1
 *                 failed: 1
 *               days:
 *                 - date: "2025-12-15"
 *                   totalSlots: 0
 *                   completed: 0
 *                   cancelled: 0
 *                   noShow: 0
 *                   failed: 0
 *                   slots: []
 *                 - date: "2025-12-16"
 *                   totalSlots: 1
 *                   completed: 0
 *                   cancelled: 1
 *                   noShow: 0
 *                   failed: 0
 *                   slots:
 *                     - _id: "65abd3fe283f91578bc12344"
 *                       date: "2025-12-16"
 *                       slotId: "677fc1ab0000000000000156"
 *                       startTime: "10:00"
 *                       endTime: "12:00"
 *                       status: "CANCELLED_BY_RIDER"
 *
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "weekNumber is required"
 *
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Unauthorized"
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Server error"
 */


slotRouter.get("/history", riderAuthMiddleWare, getSlotHistory);

/**
 * @swagger
 * /api/slots/activeSlots:
 *   get:
 *     tags: [Slots]
 *     summary: Get current running slot and next upcoming booked slot
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Returns the rider's current active booked slot (if time is between slot start & end).  
 *       Also returns the next upcoming booked slot for today or the next day.
 *     responses:
 *       200:
 *         description: Current & next slot fetched
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               currentSlot:
 *                 date: "2026-01-03"
 *                 startTime: "08:00"
 *                 endTime: "10:00"
 *                 status: "BOOKED"
 *               nextSlot:
 *                 date: "2026-01-03"
 *                 startTime: "12:00"
 *                 endTime: "14:00"
 *                 status: "BOOKED"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */


slotRouter.get("/activeSlots", riderAuthMiddleWare, getCurrentAndNextSlot);


/**
 * @swagger
 * /api/slots/{slotId}/capacity:
 *   get:
 *     summary: Get booking capacity and booked rider IDs for a slot
 *     tags:
 *       - Slots
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Returns booking capacity details for a specific slot on a given date.
 *       Includes the list of booked rider IDs from the slot schema, total booked count,
 *       available rider capacity, and booking eligibility.
 *
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the slot
 *
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           example: "2025-12-27"
 *         description: >
 *           Slot date in YYYY-MM-DD format.
 *           Defaults to today (IST) if not provided.
 *
 *     responses:
 *       200:
 *         description: Slot capacity details fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Slot capacity fetched successfully"
 *               data:
 *                 slotId: "677fc1000000000000000017"
 *                 date: "2025-12-27"
 *                 startTime: "10:00"
 *                 endTime: "12:00"
 *                 maxRiders: 40
 *                 riders:
 *                   - "69807073949c7c446ddbe1d9"
 *                   - "69807073949c7c446ddbe1e0"
 *                 bookedRidersCount: 2
 *                 availableRiders: 38
 *                 isFull: false
 *                 canBook: true
 *
 *       400:
 *         description: Missing or invalid slotId
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "slotId is required"
 *
 *       404:
 *         description: Slot not found for the given date
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Slot not found"
 *
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Server error"
 */



slotRouter.get("/:slotId/capacity", riderAuthMiddleWare, getSlotCapacity);


module.exports = slotRouter;