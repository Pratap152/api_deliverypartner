// routes/adminPayoutConfig.routes.js

const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminPayoutConfig.controller");
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const { adminAuthMiddleware } = require("../middleware/adminAuthMiddleware");
const { allowRoles } = require("../middleware/allowRolesMiddleware");



/**
 * @swagger
 * /api/admin/payout-config/city:
 *   post:
 *     summary: Create City Level Payout Configuration
 *     description: Creates a new payout configuration for a city. Existing active config for the same city, scenarioType, and vehicleType will be deactivated automatically.
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - scenarioType
 *               - cityId
 *               - vehicleType
 *               - basePay
 *             properties:
 *               name:
 *                 type: string
 *                 example: Hyderabad Bike Base Config
 *
 *               scenarioType:
 *                 type: string
 *                 enum:
 *                   - NORMAL
 *                   - SURGE
 *                   - PEAK
 *                 example: NORMAL
 *
 *               cityId:
 *                 type: string
 *                 example: city_123
 *
 *               vehicleType:
 *                 type: string
 *                 enum:
 *                   - bike
 *                   - scooty
 *                   - ev
 *                 example: bike
 *
 *               basePay:
 *                 type: number
 *                 example: 40
 *
 *               perKmRate:
 *                 type: number
 *                 example: 8
 *
 *               surgeConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   multiplier:
 *                     type: number
 *                     example: 1.5
 *
 *               peakConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   startTime:
 *                     type: string
 *                     example: "18:00"
 *                   endTime:
 *                     type: string
 *                     example: "22:00"
 *                   extraPay:
 *                     type: number
 *                     example: 20
 *
 *               weatherConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   rainExtraPay:
 *                     type: number
 *                     example: 15
 *                   multiplier:
 *                     type: number
 *                     example: 1.2
 *
 *               notes:
 *                 type: string
 *                 example: Weekend payout configuration
 *
 *               latitude:
 *                 type: number
 *                 example: 17.385
 *
 *               longitude:
 *                 type: number
 *                 example: 78.4867
 *
 *     responses:
 *       201:
 *         description: City payout configuration created successfully
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
 *                   example:
 *                     name: Hyderabad Bike Base Config
 *                     scenarioType: NORMAL
 *                     cityId: city_123
 *                     vehicleType: BIKE
 *                     basePay: 40
 *                     perKmRate: 8
 *
 *       400:
 *         description: Validation Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   examples:
 *                     missingFields:
 *                       value: "name and scenarioType are required"
 *                     invalidCity:
 *                       value: "Invalid cityId. City does not exist"
 *                     noTier:
 *                       value: "Selected city does not have tier configured"
 *                     invalidBasePay:
 *                       value: "basePay must be greater than 0"
 *
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Something went wrong
 */
 router.post("/admin/payout-config/city",
  adminAuthMiddleware,allowRoles("SUPER_ADMIN"), 
  controller.createCityPayoutConfig);


/**
 * @swagger
 * /api/admin/payout-config/pincode:
 *   post:
 *     summary: Create Pincode Level Payout Configuration
 *     description: Creates payout configurations for multiple pincodes under a city and returns consolidated response data.
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - scenarioType
 *               - cityId
 *               - pincodeIds
 *               - vehicleType
 *               - basePay
 *             properties:
 *               name:
 *                 type: string
 *                 example: Hyderabad Surge Config
 *
 *               scenarioType:
 *                 type: string
 *                 enum:
 *                   - NORMAL
 *                   - SURGE
 *                   - PEAK
 *                 example: SURGE
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
 *                   - "500072"
 *                   - "500032"
 *
 *               vehicleType:
 *                 type: string
 *                 enum:
 *                   - BIKE
 *                   - CYCLE
 *                   - EV
 *                 example: bike
 *
 *               basePay:
 *                 type: number
 *                 example: 45
 *
 *               perKmRate:
 *                 type: number
 *                 example: 9
 *
 *               surgeConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   multiplier:
 *                     type: number
 *                     example: 1.8
 *
 *               peakConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   startTime:
 *                     type: string
 *                     example: "18:00"
 *                   endTime:
 *                     type: string
 *                     example: "22:00"
 *                   extraPay:
 *                     type: number
 *                     example: 20
 *
 *               weatherConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   multiplier:
 *                     type: number
 *                     example: 1.3
 *                   rainExtraPay:
 *                     type: number
 *                     example: 15
 *
 *               notes:
 *                 type: string
 *                 example: Weekend surge payout config
 *
 *               latitude:
 *                 type: number
 *                 example: 17.385
 *
 *               longitude:
 *                 type: number
 *                 example: 78.4867
 *
 *     responses:
 *       201:
 *         description: Pincode payout configurations created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Pincode configs created successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     cityId:
 *                       type: string
 *                       example: city_123
 *
 *                     cityTier:
 *                       type: string
 *                       example: tier1
 *
 *                     scenarioType:
 *                       type: string
 *                       example: SURGE
 *
 *                     vehicleType:
 *                       type: string
 *                       example: BIKE
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "500081"
 *                         - "500072"
 *                         - "500032"
 *
 *                     basePay:
 *                       type: number
 *                       example: 45
 *
 *                     perKmRate:
 *                       type: number
 *                       example: 9
 *
 *                     surgeConfig:
 *                       type: object
 *                       example:
 *                         enabled: true
 *                         multiplier: 1.8
 *
 *                     peakConfig:
 *                       type: object
 *                       example:
 *                         enabled: true
 *                         extraPay: 20
 *
 *                     weatherConfig:
 *                       type: object
 *                       example:
 *                         enabled: true
 *                         multiplier: 1.3
 *                         rainExtraPay: 15
 *
 *                     notes:
 *                       type: string
 *                       example: Weekend surge payout config
 *
 *                     createdCount:
 *                       type: integer
 *                       example: 3
 *
 *       400:
 *         description: Validation Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   examples:
 *                     invalidCity:
 *                       value: "Invalid cityId. City does not exist"
 *
 *                     noTier:
 *                       value: "Selected city does not have tier configured"
 *
 *                     invalidPincode:
 *                       value: "These pincodes do not belong to selected city: 500999"
 *
 *                     missingFields:
 *                       value: "cityId, scenarioType, vehicleType are required"
 *
 *                     noPincodes:
 *                       value: "pincodeIds are required"
 *
 *                     invalidBasePay:
 *                       value: "basePay must be greater than 0"
 *
 *                     invalidPerKm:
 *                       value: "perKmRate must be >= 0"
 *
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Something went wrong
 */
  router.post("/admin/payout-config/pincode",
    adminAuthMiddleware,allowRoles("SUPER_ADMIN"), 
    controller.createPincodePayoutConfig);

// /**
//  * @swagger
//  * /api/admin/payout-config/active:
//  *   get:
//  *     summary: Get active payout config by city
//  *     tags: [Admin Payout Config]
//  *     parameters:
//  *       - in: query
//  *         name: cityId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         example: city_001
//  *         description: City ID to fetch active payout config
//  *
//  *     responses:
//  *       200:
//  *         description: Active payout config fetched successfully
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: true
//  *               data:
//  *                 configId: cfg_123
//  *                 scenarioType: HIGH_DEMAND
//  *                 name: High Demand Boost V2
//  *                 cityId: city_001
//  *                 pincodeIds: ["500081"]
//  *                 vehicleType: bike
//  *                 basePay: 35
//  *                 perKmRate: 6
//  *                 surgeConfig:
//  *                   enabled: true
//  *                   minDemand: 50
//  *                   multiplier: 1.8
//  *                 peakConfig:
//  *                   enabled: true
//  *                   start: "18:00"
//  *                   end: "21:00"
//  *                   bonus: 25
//  *                 weatherConfig:
//  *                   RAIN: 40
//  *                 version: 3
//  *                 isActive: true
//  *                 createdAt: "2026-05-05T10:00:00Z"
//  *
//  *       400:
//  *         description: Missing or invalid query params
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: cityId is required
//  *
//  *       404:
//  *         description: No active config found
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: No active config found for this city
//  *
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: Internal server error
//  */

router.get("/admin/payout-config/active",adminAuthMiddleware,allowRoles("ADMIN","SUPER_ADMIN"), controller.getActivePayoutConfig);
/**
 * @swagger
 * /api/admin/all/payout-config:
 *   get:
 *     summary: Get payout configurations
 *     description: Fetches all payout configurations, optionally filtered by cityId, sorted by latest created first.
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter payout configs by city ID
 *         example: "city_6"
 *
 *     responses:
 *
 *       200:
 *         description: Payout configs fetched successfully
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
 *                     type: object
 *                     properties:
 *
 *                       configId:
 *                         type: string
 *                         example: "d30eb1d7-21a6-42c3-80d9-4ad2e8b6cf0f"
 *
 *                       scenarioType:
 *                         type: string
 *                         example: "NORMAL"
 *
 *                       name:
 *                         type: string
 *                         example: "Chennai Base Config"
 *
 *                       cityId:
 *                         type: string
 *                         example: "city_6"
 *
 *                       pincodeIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example:
 *                           - "600001"
 *                           - "600002"
 *
 *                       vehicleType:
 *                         type: string
 *                         example: "BIKE"
 *
 *                       basePay:
 *                         type: number
 *                         example: 40
 *
 *                       perKmRate:
 *                         type: number
 *                         example: 8
 *
 *                       surgeConfig:
 *                         type: object
 *                         example:
 *                           enabled: true
 *                           multiplier: 1.5
 *
 *                       peakConfig:
 *                         type: object
 *                         example:
 *                           enabled: true
 *                           startTime: "18:00"
 *                           endTime: "22:00"
 *                           extraPay: 25
 *
 *                       weatherConfig:
 *                         type: object
 *                         example:
 *                           enabled: true
 *                           isRaining: false
 *                           multiplier: 1.2
 *                           rainExtraPay: 20
 *
 *                       version:
 *                         type: integer
 *                         example: 2
 *
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-21T10:00:00.000Z"
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
 *                   example: "Internal server error"
 */

router.get(
  "/admin/all/payout-config",
  adminAuthMiddleware,allowRoles("ADMIN","SUPER_ADMIN"),
  controller.getPayoutConfigs
);
/**
 * @swagger
 * /api/admin/payout-config/history:
 *   get:
 *     summary: Get Payout Config History (City Level + Pincode Level)
 *     tags: [Admin Payout Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         example: city_123
 *         description: City ID
 *
 *       - in: query
 *         name: scenarioType
 *         required: false
 *         schema:
 *           type: string
 *         example: PEAK
 *         description: Filter by scenario type
 *
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [CITY, PINCODE]
 *         example: CITY
 *         description: Filter payout config type
 *
 *       - in: query
 *         name: pincode
 *         required: false
 *         schema:
 *           type: string
 *         example: 500081
 *         description: Filter specific pincode history
 *
 *     responses:
 *       200:
 *         description: Payout config history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 total:
 *                   type: number
 *                   example: 2
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       configId:
 *                         type: string
 *                         example: cfg_123
 *
 *                       type:
 *                         type: string
 *                         example: CITY
 *
 *                       name:
 *                         type: string
 *                         example: Hyderabad Bike Config
 *
 *                       version:
 *                         type: number
 *                         example: 3
 *
 *                       scenarioType:
 *                         type: string
 *                         example: PEAK
 *
 *                       cityId:
 *                         type: string
 *                         example: city_123
 *
 *                       pincodeIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["500081"]
 *
 *                       vehicleType:
 *                         type: string
 *                         example: BIKE
 *
 *                       basePay:
 *                         type: number
 *                         example: 50
 *
 *                       perKmRate:
 *                         type: number
 *                         example: 10
 *
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-05-21T10:00:00.000Z
 *
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-05-21T12:00:00.000Z
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: cityId is required
 *
 *       404:
 *         description: No payout config history found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: No payout config history found
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
 *
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get(
  "/admin/payout-config/history",
  adminAuthMiddleware,allowRoles("ADMIN","SUPER_ADMIN"),
  controller.getPayoutConfigHistory
);


 /**
 * @swagger
 * /api/admin/payout-config/base-pay:
 *   patch:
 *     summary: Update base pay for city or pincode level payout config
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID
 *         example: city_126
 *
 *       - in: query
 *         name: pincodeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional pincode ID for pincode-level config
 *         example: 500081
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - basePay
 *             properties:
 *               basePay:
 *                 type: number
 *                 example: 45
 *
 *     responses:
 *       200:
 *         description: Base pay updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Base pay updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: d30eb1d7-21a6-42c3-80d9-4ad2e8b6cf0f
 *
 *                     cityId:
 *                       type: string
 *                       example: city_126
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "500081"
 *                         - "500032"
 *
 *                     basePay:
 *                       type: number
 *                       example: 45
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: cityId is required
 *
 *       404:
 *         description: Payout config not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Payout config not found
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
 *
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.patch("/admin/payout-config/base-pay",adminAuthMiddleware,allowRoles("SUPER_ADMIN"),controller.updateBasePay)


/**
 * @swagger
 * /api/admin/distance-pay:
 *   patch:
 *     summary: Update per KM distance pay for city or pincode level payout config
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID
 *         example: city_126
 *
 *       - in: query
 *         name: pincodeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional pincode ID for pincode-level config
 *         example: 500081
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - perKmRate
 *             properties:
 *               perKmRate:
 *                 type: number
 *                 example: 8
 *
 *     responses:
 *       200:
 *         description: Distance Pay Per KM rate updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Per KM rate updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: d30eb1d7-21a6-42c3-80d9-4ad2e8b6cf0f
 *
 *                     cityId:
 *                       type: string
 *                       example: city_126
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "500081"
 *                         - "500032"
 *
 *                     perKmRate:
 *                       type: number
 *                       example: 8
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: perKmRate must be greater than or equal to 0
 *
 *       404:
 *         description: Payout config not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Payout config not found
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
 *
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.patch("/admin/distance-pay",adminAuthMiddleware,allowRoles("SUPER_ADMIN"),controller.updateDistancePay)

/**
 * @swagger
 * /api/admin/surge-config:
 *   patch:
 *     summary: Update surge configuration for city or pincode level payout config
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID
 *         example: city_126
 *
 *       - in: query
 *         name: pincodeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional pincode ID for pincode-level config
 *         example: 500081
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - surgeConfig
 *             properties:
 *               surgeConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   multiplier:
 *                     type: number
 *                     example: 1.5
 *
 *                   minLiveOrders:
 *                     type: integer
 *                     example: 20
 *
 *                   extraPay:
 *                     type: number
 *                     example: 15
 *
 *     responses:
 *       200:
 *         description: Surge config updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Surge config updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: d30eb1d7-21a6-42c3-80d9-4ad2e8b6cf0f
 *
 *                     cityId:
 *                       type: string
 *                       example: city_126
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "500081"
 *                         - "500032"
 *
 *                     surgeConfig:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                           example: true
 *
 *                         multiplier:
 *                           type: number
 *                           example: 1.5
 *
 *                         minLiveOrders:
 *                           type: integer
 *                           example: 20
 *
 *                         extraPay:
 *                           type: number
 *                           example: 15
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: multiplier must be > 0
 *
 *       404:
 *         description: Payout config not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Payout config not found
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
 *
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.patch("/admin/surge-config",adminAuthMiddleware,allowRoles("SUPER_ADMIN"),controller.updateSurgeConfig)
/**
 * @swagger
 * /api/admin/weather-config:
 *   patch:
 *     summary: Update weather configuration for city or pincode level payout config
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID
 *         example: city_126
 *
 *       - in: query
 *         name: pincodeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional pincode ID for pincode-level config
 *         example: 500081
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - weatherConfig
 *             properties:
 *               weatherConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   multiplier:
 *                     type: number
 *                     example: 1.3
 *
 *                   rainExtraPay:
 *                     type: number
 *                     example: 20
 *
 *     responses:
 *       200:
 *         description: Weather config updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Weather config updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: d30eb1d7-21a6-42c3-80d9-4ad2e8b6cf0f
 *
 *                     cityId:
 *                       type: string
 *                       example: city_126
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "500081"
 *                         - "500032"
 *
 *                     weatherConfig:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                           example: true
 *
 *                         multiplier:
 *                           type: number
 *                           example: 1.3
 *
 *                         rainExtraPay:
 *                           type: number
 *                           example: 20
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: multiplier must be > 0
 *
 *       404:
 *         description: Payout config not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *
 *                 message:
 *                   type: string
 *                   example: Payout config not found
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
 *
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.patch("/admin/weather-config",adminAuthMiddleware,allowRoles("SUPER_ADMIN"), controller.updateWeatherConfig);
/**
 * @swagger
 * /api/admin/rollback:
 *   post:
 *     summary: Rollback payout config by city or pincode
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         example: city_121
 *         description: City ID
 *
 *       - in: query
 *         name: pincodeId
 *         required: false
 *         schema:
 *           type: string
 *         example: "500053"
 *         description: Optional pincode ID for pincode-level rollback
 *
 *     responses:
 *       200:
 *         description: Rollback successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: "Rollback successful"
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "ec324bc0-f89d-43b2-bdfc-83c81c4d5892"
 *
 *                     cityId:
 *                       type: string
 *                       example: "city_121"
 *
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "500053"
 *
 *                     version:
 *                       type: integer
 *                       example: 2
 *
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *
 *       400:
 *         description: Validation error or no rollback version found
 *
 *       500:
 *         description: Internal server error
 */
router.post("/admin/rollback",adminAuthMiddleware,allowRoles("SUPER_ADMIN"), controller.rollbackPayoutConfig);

// /**
//  * @swagger
//  * /api/admin/{id}/status:
//  *   patch:
//  *     summary: Toggle payout config status
//  *     tags: [Admin Payout Config]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         example: cfg_123
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               isActive:
//  *                 type: boolean
//  *                 example: false
//  *     responses:
//  *       200:
//  *         description: Status updated
//  *       400:
//  *         description: Cannot deactivate only active config
//  */
router.patch("/admin/:id/status",adminAuthMiddleware,allowRoles("SUPER_ADMIN"), controller.togglePayoutConfigStatus);

// /**
//  * @swagger
//  * /api/rider/payout/surge-status:
//  *   get:
//  *     summary: Get rider surge status
//  *     tags: [Surge]
//  *     description: Fetches current surge status based on authenticated rider location
//  *
//  *     security:
//  *       - bearerAuth: []
//  *
//  *     responses:
//  *       200:
//  *         description: Surge status fetched successfully
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: true
//  *               data:
//  *                 isSurgeActive: true
//  *                 scenarioType: HIGH_DEMAND
//  *                 multiplier: 1.8
//  *                 minDemand: 50
//  *
//  *       401:
//  *         description: Unauthorized
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: Unauthorized
//  *
//  *       404:
//  *         description: No active config found
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: No active config found
//  *
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: Internal server error
//  */


/**
 * @swagger
 * /api/admin/update/payout-config/city:
 *   put:
 *     summary: Update city payout config
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         example: city_121
 *         description: City ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - scenarioType
 *               - vehicleType
 *               - basePay
 *               - perKmRate
 *
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated City Config"
 *
 *               scenarioType:
 *                 type: string
 *                 example: "NORMAL"
 *
 *               vehicleType:
 *                 type: string
 *                 example: "bike"
 *
 *               basePay:
 *                 type: number
 *                 example: 50
 *
 *               perKmRate:
 *                 type: number
 *                 example: 8
 *
 *               surgeConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   multiplier:
 *                     type: number
 *                     example: 1.5
 *
 *                   minLiveOrders:
 *                     type: number
 *                     example: 20
 *
 *                   extraPay:
 *                     type: number
 *                     example: 25
 *
 *               peakConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   startTime:
 *                     type: string
 *                     example: "18:00"
 *
 *                   endTime:
 *                     type: string
 *                     example: "22:00"
 *
 *                   extraPay:
 *                     type: number
 *                     example: 15
 *
 *               weatherConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   multiplier:
 *                     type: number
 *                     example: 1.3
 *
 *                   rainExtraPay:
 *                     type: number
 *                     example: 20
 *
 *               notes:
 *                 type: string
 *                 example: "Updated city payout config"
 *
 *     responses:
 *       200:
 *         description: City payout config updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: "City payout config updated successfully"
 *
 *                 data:
 *                   type: object
 *
 *       400:
 *         description: Validation error
 *
 *       404:
 *         description: City payout config not found
 *
 *       500:
 *         description: Internal server error
 */
router.put(
  "/admin/update/payout-config/city",
  adminAuthMiddleware,allowRoles("SUPER_ADMIN"),
  controller.updateCityPayoutConfig
);
/**
 * @swagger
 * /api/admin/payout-config/update:
 *   patch:
 *     summary: Update payout configuration
 *     description: |
 *       Update payout configuration based on Tier, City, or Pincode level.
 *
 *       Query Parameters:
 *       - tier → Update all configs belonging to a city tier.
 *       - cityId → Update all configs for a specific city.
 *       - pincodeIds → Update specific pincode-level configs.
 *
 *       Optional:
 *       - configType=city → Only update city-level configs.
 *       - configType=pincode → Only update pincode-level configs.
 *
 *     tags:
 *       - Admin Payout Config
 *
 *     parameters:
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [TIER_1, TIER_2, TIER_3]
 *         required: false
 *         description: City tier to update.
 *
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: City ID to update.
 *
 *       - in: query
 *         name: pincodeIds
 *         schema:
 *           type: string
 *         required: false
 *         example: "500001,500002,500003"
 *         description: Comma-separated pincode IDs.
 *
 *       - in: query
 *         name: configType
 *         schema:
 *           type: string
 *           enum: [city, pincode]
 *         required: false
 *         description: Filter city-level or pincode-level configs.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basePay:
 *                 type: number
 *                 example: 30
 *
 *               perKmRate:
 *                 type: number
 *                 example: 5
 *
 *               surgeConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   multiplier:
 *                     type: number
 *                     example: 1.5
 *
 *               peakConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   bonus:
 *                     type: number
 *                     example: 20
 *
 *               weatherConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                   bonus:
 *                     type: number
 *                     example: 10
 *
 *     responses:
 *       200:
 *         description: Payout configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Payout configs updated successfully
 *
 *                 updatedCount:
 *                   type: integer
 *                   example: 5
 *
 *                 updatedFields:
 *                   type: object
 *                   example:
 *                     basePay: 40
 *                     perKmRate: 6
 *
 *                 data:
 *                   type: object
 *                   example:
 *                     cityId: "d7f5d1f3-1234-5678-9abc-1234567890ab"
 *                     pincodeIds:
 *                       - "500001"
 *                       - "500002"
 *
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Please provide tier or cityId or pincodeIds in query
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 */
router.patch(
  "/admin/payout-config/update",
    adminAuthMiddleware,allowRoles("SUPER_ADMIN"),
controller.updatePayoutConfig
);


/**
 * @swagger
 * /api/admin/update/payout-config/pincode:
 *   put:
 *     summary: Update pincode payout config
 *     tags:
 *       - Admin Payout Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         example: city_121
 *         description: City ID
 *
 *       - in: query
 *         name: pincodeId
 *         required: true
 *         schema:
 *           type: string
 *         example: "500053"
 *         description: Pincode ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - scenarioType
 *               - vehicleType
 *               - basePay
 *               - perKmRate
 *
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Pincode Config"
 *
 *               scenarioType:
 *                 type: string
 *                 example: "SURGE"
 *
 *               vehicleType:
 *                 type: string
 *                 example: "bike"
 *
 *               basePay:
 *                 type: number
 *                 example: 60
 *
 *               perKmRate:
 *                 type: number
 *                 example: 10
 *
 *               surgeConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   multiplier:
 *                     type: number
 *                     example: 1.5
 *
 *                   minLiveOrders:
 *                     type: number
 *                     example: 20
 *
 *                   extraPay:
 *                     type: number
 *                     example: 25
 *
 *               peakConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   startTime:
 *                     type: string
 *                     example: "18:00"
 *
 *                   endTime:
 *                     type: string
 *                     example: "22:00"
 *
 *                   extraPay:
 *                     type: number
 *                     example: 15
 *
 *               weatherConfig:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *
 *                   multiplier:
 *                     type: number
 *                     example: 1.3
 *
 *                   rainExtraPay:
 *                     type: number
 *                     example: 20
 *
 *               notes:
 *                 type: string
 *                 example: "Updated pincode payout config"
 *
 *     responses:
 *       200:
 *         description: Pincode payout config updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: "Pincode payout config updated successfully"
 *
 *                 data:
 *                   type: object
 *
 *       400:
 *         description: Validation error
 *
 *       404:
 *         description: Payout config not found
 *
 *       500:
 *         description: Internal server error
 */
router.put(
  "/admin/update/payout-config/pincode",
  adminAuthMiddleware,allowRoles("SUPER_ADMIN"),
  controller.updatePincodePayoutConfig
);


router.get("/rider/payout/surge-status",riderAuthMiddleWare,controller.getSurgeStatus);
module.exports = router;