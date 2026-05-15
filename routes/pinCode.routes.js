const express = require('express')

const {
  createCity,
  updatePincodeStatus,
  updateAreaStatus,
  getCityDetails
} = require('../controllers/pinCodeController')

const pinCodeRouter = express.Router()


/**
 * @swagger
 * /api/pincode/admin/city/create:
 *   post:
 *     tags:
 *       - Admin Pincode
 *     summary: Create or Update City with Pincodes and Areas
 *     description: |
 *       Creates a new city if it does not exist.
 *       If the city already exists:
 *       - Adds new pincodes
 *       - Adds new areas to existing pincodes
 *       - Throws error if duplicate area is provided
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city
 *             properties:
 *               city:
 *                 type: object
 *                 required:
 *                   - name
 *                   - state
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Hyderabad
 *                   state:
 *                     type: string
 *                     example: Telangana
 *                   isActive:
 *                     type: boolean
 *                     example: true
 *                   pincodes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required:
 *                         - code
 *                         - name
 *                       properties:
 *                         code:
 *                           type: string
 *                           example: "500081"
 *                         name:
 *                           type: string
 *                           example: "Madhapur / Hitech City"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         areas:
 *                           type: array
 *                           items:
 *                             type: object
 *                             required:
 *                               - name
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: Madhapur
 *                               isActive:
 *                                 type: boolean
 *                                 example: true
 *     responses:
 *       200:
 *         description: City created or updated successfully
 *         content:
 *           application/json:
 *             examples:
 *               create:
 *                 summary: New city created
 *                 value:
 *                   success: true
 *                   message: City created successfully
 *                   data:
 *                     cityId: "abc123"
 *                     name: "Hyderabad"
 *                     state: "Telangana"
 *                     totalPincodes: 3
 *                     createdAt: "2026-04-24T12:00:00.000Z"
 *               update:
 *                 summary: Existing city updated
 *                 value:
 *                   success: true
 *                   message: City updated successfully
 *                   data:
 *                     cityId: "abc123"
 *                     addedPincodes: 1
 *                     addedAreas: 2
 *       400:
 *         description: Validation or duplicate error
 *         content:
 *           application/json:
 *             examples:
 *               missingData:
 *                 summary: Missing city data
 *                 value:
 *                   success: false
 *                   message: City data is required
 *               duplicateArea:
 *                 summary: Duplicate area
 *                 value:
 *                   success: false
 *                   message: Area 'Madhapur' already exists in pincode 500081
 *       500:
 *         description: Internal server error
 */

pinCodeRouter.post('/admin/city/create', createCity)

/**
 * @swagger
 * /api/pincode/admin/pincode/status:
 *   patch:
 *     tags:
 *       - Admin Pincode
 *     summary: Enable/Disable a pincode
 *     description: Updates the active status of a pincode under a city.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityName
 *               - pincode
 *               - isActive
 *             properties:
 *               cityName:
 *                 type: string
 *                 example: Hyderabad
 *               pincode:
 *                 type: string
 *                 example: "500081"
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Pincode status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Pincode status updated successfully
 *               data:
 *                 pincode: "500081"
 *                 isActive: false
 *       404:
 *         description: Pincode not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Pincode not found
 *       500:
 *         description: Internal server error
 */

pinCodeRouter.patch('/admin/pincode/status', updatePincodeStatus)

/**
 * @swagger
 * /api/pincode/admin/area/status:
 *   patch:
 *     tags:
 *       - Admin Pincode
 *     summary: Enable/Disable an area
 *     description: Updates the active status of an area inside a pincode.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityName
 *               - pincode
 *               - areaName
 *               - isActive
 *             properties:
 *               cityName:
 *                 type: string
 *                 example: Hyderabad
 *               pincode:
 *                 type: string
 *                 example: "500081"
 *               areaName:
 *                 type: string
 *                 example: Madhapur
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Area status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Area status updated successfully
 *               data:
 *                 areaName: Madhapur
 *                 isActive: false
 *       404:
 *         description: Area not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Area not found
 *       500:
 *         description: Internal server error
 */

pinCodeRouter.patch('/admin/area/status', updateAreaStatus)

/**
 * @swagger
 * /api/pincode/admin/city/{cityId}:
 *   get:
 *     tags:
 *       - Admin Pincode
 *     summary: Get full city details
 *     description: Fetch city along with pincodes and areas.
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         example: ckxyz123
 *     responses:
 *       200:
 *         description: City fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 cityId: "ckxyz123"
 *                 name: Hyderabad
 *                 state: Telangana
 *                 isActive: true
 *                 pincodes:
 *                   - code: "500081"
 *                     name: Madhapur / Hitech City
 *                     isActive: false
 *                     areas:
 *                       - name: Madhapur
 *                         isActive: false
 *                       - name: Hitech City
 *                         isActive: true
 *       404:
 *         description: City not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: City not found
 *       500:
 *         description: Internal server error
 */

pinCodeRouter.get('/admin/city/:cityId', getCityDetails)

module.exports = pinCodeRouter