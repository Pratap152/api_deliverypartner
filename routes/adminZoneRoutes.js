const express = require("express");
const adminZoneRoutes = express.Router();

const {
  createZone,
  createZonePoint,
  getZonePoints,
  updateZonePoint,
  deleteZonePoint
} = require("../controllers/adminZoneController");



/**
 * @swagger
 * /admin/create/zone-point:
 *   post:
 *     summary: Create a new Zone
 *     description: Admin can create a zone using name, city, and state
 *     tags: [Admin Zone Points]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - city
 *               - state
 *             properties:
 *               name:
 *                 type: string
 *                 example: Madhapur Zone
 *               city:
 *                 type: string
 *                 example: Hyderabad
 *               state:
 *                 type: string
 *                 example: Telangana
 *     responses:
 *       201:
 *         description: Zone created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Zone created successfully
 *               data:
 *                 id: ckz123abc456
 *                 name: Madhapur Zone
 *                 city: Hyderabad
 *                 state: Telangana
 *                 isActive: true
 *                 createdAt: 2026-05-05T10:00:00.000Z
 *                 updatedAt: 2026-05-05T10:00:00.000Z
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Missing required fields
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Something went wrong
 */
adminZoneRoutes.post("/create/zone-point", createZone);


// ADMIN APIs

/**
 * @swagger
 * /admin/zone-point:
 *   post:
 *     summary: Create a new zone pickup point
 *     description: Admin can create a pickup address for a zone. Latitude and longitude are automatically generated from the address using Google Geocoding API.
 *     tags: [Admin Zone Points]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - addressLine1
 *               - city
 *               - state
 *               - pincode
 *               - zoneId
 *             properties:
 *               name:
 *                 type: string
 *                 example: PB House
 *
 *               addressLine1:
 *                 type: string
 *                 example: No.7, HUDA Techno Enclave
 *
 *               addressLine2:
 *                 type: string
 *                 example: 1st Floor, Near Cyber Towers
 *
 *               city:
 *                 type: string
 *                 example: Hyderabad
 *
 *               state:
 *                 type: string
 *                 example: Telangana
 *
 *               pincode:
 *                 type: string
 *                 example: "500081"
 *
 *               zoneId:
 *                 type: string
 *                 example: zone1001
 *
 *     responses:
 *       201:
 *         description: Zone pickup point created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: cmotti7yc0001rqj8nzk055t6
 *                 name: PB House
 *                 addressLine1: No.7, HUDA Techno Enclave
 *                 addressLine2: 1st Floor, Near Cyber Towers
 *                 city: Hyderabad
 *                 state: Telangana
 *                 pincode: "500081"
 *                 radiusInMeters: 3000
 *                 zoneId: zone1001
 *                 isActive: true
 *                 createdAt: 2026-05-06T08:51:04.258Z
 *                 updatedAt: 2026-05-06T08:51:04.258Z
 *
 *       400:
 *         description: Invalid zoneId or missing required fields
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Invalid zoneId. Zone does not exist.
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 */
adminZoneRoutes.post("/zone-point", createZonePoint);

/**
 * @swagger
 * /admin/zone-point:
 *   get:
 *     summary: Get all addresses
 *     tags: [Admin Zone Points]
 *     parameters:
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *       - in: query
 *         name: pincode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of addresses
 */

adminZoneRoutes.get("/zone-point", getZonePoints);

// /**
//  * @swagger
//  * /admin/zone-point/{id}:
//  *   put:
//  *     summary: Update address
//  *     tags: [Admin Zone Points]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *     responses:
//  *       200:
//  *         description: Updated successfully
//  */
// adminZoneRoutes.put("/zone-point/:id", updateZonePoint);

// /**
//  * @swagger
//  * /admin/zone-point/{id}:
//  *   delete:
//  *     summary: Delete address
//  *     tags: [Admin Zone Points]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *     responses:
//  *       200:
//  *         description: Deleted successfully
//  */
// adminZoneRoutes.delete("/zone-point/:id", deleteZonePoint);

module.exports = adminZoneRoutes;