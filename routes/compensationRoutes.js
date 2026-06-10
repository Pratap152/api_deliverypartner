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
 /**
 * @swagger
 * /api/admin/compensation-config/{id}:
 *   put:
 *     summary: Update Employee Compensation Configuration
 *     description: Update an existing compensation configuration. Supports partial updates for salary, per-order amount, targets, tracking type, location mapping, rider type, and status.
 *     tags:
 *       - Compensation Config
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Compensation Configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tier 1 Salary Updated
 *               cityTier:
 *                 type: string
 *                 enum:
 *                   - TIER_1
 *                   - TIER_2
 *                   - TIER_3
 *                 example: TIER_1
 *               cityId:
 *                 type: string
 *                 example: 5f8d0d55-bd7c-4f5e-9f2a-123456789abc
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "500081"
 *                   - "500032"
 *               riderType:
 *                 type: string
 *                 enum:
 *                   - COMPANY_EMPLOYEE
 *                   - FREELANCER
 *                 example: COMPANY_EMPLOYEE
 *               compensationType:
 *                 type: string
 *                 enum:
 *                   - SALARY
 *                   - PER_ORDER
 *                   - HYBRID
 *                 example: HYBRID
 *               monthlySalary:
 *                 type: number
 *                 example: 20000
 *               perOrderAmount:
 *                 type: number
 *                 example: 15
 *               targetOrders:
 *                 type: integer
 *                 example: 500
 *               trackingType:
 *                 type: string
 *                 enum:
 *                   - DAILY
 *                   - WEEKLY
 *                   - MONTHLY
 *                 example: MONTHLY
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Compensation configuration updated successfully
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
 *                   example: Compensation configuration updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     cityTier:
 *                       type: string
 *                     cityId:
 *                       type: string
 *                       nullable: true
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     riderType:
 *                       type: string
 *                     compensationType:
 *                       type: string
 *                     monthlySalary:
 *                       type: number
 *                       nullable: true
 *                     perOrderAmount:
 *                       type: number
 *                       nullable: true
 *                     targetOrders:
 *                       type: integer
 *                       nullable: true
 *                     trackingType:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
 *                   example: monthlySalary is required for SALARY
 *       404:
 *         description: Compensation configuration not found
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
 *                   example: Compensation configuration not found
 *       409:
 *         description: Duplicate compensation configuration exists
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
 *                   example: Compensation configuration already exists
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
 *                   example: Internal Server Error
 */
router.put( "/admin/compensation-config/:id", compensationController.updateCompensationConfig ); 
 // Status Change 
router.patch( "/admin/compensation-config/:id/status", compensationController.updateCompensationStatus ); 
 // Delete 
router.delete( "/admin/compensation-config/:id", compensationController.deleteCompensationConfig ); 
/**
 * @swagger
 * /api/admin/salary-config:
 *   post:
 *     summary: Create Employee Compensation Configuration
 *     description: Create a new compensation configuration for employee riders. Supports SALARY, PER_ORDER, and HYBRID compensation types.
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
 *                 example: Tier 1 Salary Config
 *               cityTier:
 *                 type: string
 *                 enum:
 *                   - TIER_1
 *                   - TIER_2
 *                   - TIER_3
 *                 example: TIER_1
 *               cityId:
 *                 type: string
 *                 example: 5f8d0d55-bd7c-4f5e-9f2a-123456789abc
 *               pincodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "500081"
 *                   - "500032"
 *               riderType:
 *                 type: string
 *                 enum:
 *                   - COMPANY_EMPLOYEE
 *                   - FREELANCER
 *                 example: COMPANY_EMPLOYEE
 *               compensationType:
 *                 type: string
 *                 enum:
 *                   - SALARY
 *                   - PER_ORDER
 *                   - HYBRID
 *                 example: SALARY
 *               monthlySalary:
 *                 type: number
 *                 example: 18000
 *               perOrderAmount:
 *                 type: number
 *                 example: 10
 *               targetOrders:
 *                 type: integer
 *                 example: 500
 *               trackingType:
 *                 type: string
 *                 enum:
 *                   - DAILY
 *                   - WEEKLY
 *                   - MONTHLY
 *                 example: MONTHLY
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
 *                   example: Compensation configuration created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     cityTier:
 *                       type: string
 *                       nullable: true
 *                     cityId:
 *                       type: string
 *                       nullable: true
 *                     pincodeIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     riderType:
 *                       type: string
 *                     compensationType:
 *                       type: string
 *                     monthlySalary:
 *                       type: number
 *                       nullable: true
 *                     perOrderAmount:
 *                       type: number
 *                       nullable: true
 *                     targetOrders:
 *                       type: integer
 *                       nullable: true
 *                     trackingType:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation Error
 *         content:
 *           application/json:
 *             examples:
 *               MissingName:
 *                 value:
 *                   success: false
 *                   message: Name is required
 *               MissingSalary:
 *                 value:
 *                   success: false
 *                   message: monthlySalary is required for SALARY
 *               MissingPerOrder:
 *                 value:
 *                   success: false
 *                   message: perOrderAmount is required for PER_ORDER
 *               InvalidTrackingType:
 *                 value:
 *                   success: false
 *                   message: Invalid trackingType
 *       409:
 *         description: Compensation configuration already exists
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
 *                   example: Compensation configuration already exists
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
 *                   example: Internal Server Error
 */
router.post(
  "/admin/salary-config",
  compensationController.createSalaryConfig
);
module.exports = router;