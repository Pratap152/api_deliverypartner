const express = require("express"); 
const router = express.Router(); 
const compensationController = require("../controllers/compensationController"); 
// Create 
/**
 * @swagger
 * /api/admin/compensation-config:
 *   post:
 *     summary: Create Employee Compensation Configuration
 *     description: >
 *       Creates a compensation configuration for riders based on either
 *       City Tier, City, or Pincode scope. Only one location scope can be provided.
 *     tags:
 *       - Compensation Config
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
 *               - riderType
 *               - compensationType
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tier 1 Delivery Executive Compensation
 *               riderType:
 *                 type: string
 *                 enum:
 *                   - EMPLOYEE
 *                   - PARTNER
 *                 example: EMPLOYEE
 *               compensationType:
 *                 type: string
 *                 enum:
 *                   - MONTHLY
 *                   - PER_ORDER
 *                 example: MONTHLY
 *               cityTier:
 *                 type: string
 *                 enum:
 *                   - TIER_1
 *                   - TIER_2
 *                   - TIER_3
 *                 example: TIER_1
 *               cityId:
 *                 type: string
 *                 example: clx123456789
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "500081"
 *                   - "500082"
 *     responses:
 *       201:
 *         description: Compensation configuration created successfully
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
 *                   example: Compensation config created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: clxabc12345
 *                     name:
 *                       type: string
 *                       example: Tier 1 Delivery Executive Compensation
 *                     riderType:
 *                       type: string
 *                       example: EMPLOYEE
 *                     compensationType:
 *                       type: string
 *                       example: MONTHLY
 *                     tier:
 *                       type: string
 *                       example: TIER_1
 *                     cityIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - city123
 *                         - city456
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
 *                 message:
 *                   type: string
 *                   examples:
 *                     missingName:
 *                       value: Name is required
 *                     missingRiderType:
 *                       value: Rider type is required
 *                     invalidLocation:
 *                       value: Provide exactly one of cityTier, cityId or pincodeIds
 *                     duplicateConfig:
 *                       value: Compensation configuration already exists
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
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post( "/admin/compensation-config", compensationController.createCompensationConfig ); 
// List 
router.get( "/admin/compensation-config", compensationController.getCompensationConfigs ); 
// Get By Id 
router.get( "/admin/compensation-config/:id", compensationController.getCompensationConfigById ); 
 // Update 
router.put( "/admin/compensation-config/:id", compensationController.updateCompensationConfig ); 
 // Status Change 
router.patch( "/admin/compensation-config/:id/status", compensationController.updateCompensationStatus ); 
 // Delete 
router.delete( "/admin/compensation-config/:id", compensationController.deleteCompensationConfig ); 
/**
 * @swagger
 * /api/admin/salary-config:
 *   post:
 *     summary: Create or Update Salary Configuration
 *     description: >
 *       Creates or updates a monthly salary configuration for a rider type
 *       based on Tier, City, or Pincode compensation configuration.
 *       The API first finds an existing SALARY compensation configuration
 *       and then creates/updates the corresponding salary record.
 *     tags:
 *       - Compensation Config
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - riderType
 *               - monthlySalary
 *             properties:
 *               riderType:
 *                 type: string
 *                 enum:
 *                   - EMPLOYEE
 *                   - PARTNER
 *                 example: EMPLOYEE
 *               cityTier:
 *                 type: string
 *                 enum:
 *                   - TIER_1
 *                   - TIER_2
 *                   - TIER_3
 *                 example: TIER_1
 *               cityId:
 *                 type: string
 *                 example: clx123456789
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "500081"
 *                   - "500082"
 *               monthlySalary:
 *                 type: number
 *                 example: 25000
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Salary configuration saved successfully
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
 *                   example: Salary config saved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     configId:
 *                       type: string
 *                       example: clxabc12345
 *                     monthlySalary:
 *                       type: number
 *                       example: 25000
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
 *                 message:
 *                   type: string
 *                   example: Valid monthly salary is required
 *
 *       404:
 *         description: Compensation Configuration Not Found
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
 *                   example: Compensation config not found
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
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post(
  "/admin/salary-config",
  compensationController.createSalaryConfig
);
module.exports = router;