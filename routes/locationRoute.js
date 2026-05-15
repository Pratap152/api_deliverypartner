const express = require("express");
const { getCities, getAreas } = require("../controllers/locationController.js");

const locationRouter = express.Router();
/**
 * @swagger
 * /api/location/cities:
 *   get:
 *     summary: Get all available cities
 *     description: Returns a list of cities where the rider can select their delivery location.
 *     tags:
 *       - Location
 *     responses:
 *       200:
 *         description: Successfully fetched cities
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               cities:
 *                 - Hyderabad
 *                 - Bangalore
 *                 - Chennai
 *                 - Mumbai
 *       500:
 *         description: Server error
 */
locationRouter.get("/cities", getCities);

/**
 * @swagger
 * /api/location/areas:
 *   get:
 *     summary: Get all pincodes and areas for a selected city
 *     description: Returns pincodes with their respective areas based on the selected city.
 *     tags:
 *       - Location
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the city
 *     responses:
 *       200:
 *         description: Successfully fetched pincodes and areas
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               city: Hyderabad
 *               pincodes:
 *                 - code: "500032"
 *                   name: "Gachibowli"
 *                   areas:
 *                     - Gachibowli Main
 *                     - Financial District
 *                     - Nanakramguda
 *       400:
 *         description: City missing / invalid query
 *       404:
 *         description: City not found
 *       500:
 *         description: Server error
 */
locationRouter.get("/areas", getAreas);

module.exports = locationRouter;
