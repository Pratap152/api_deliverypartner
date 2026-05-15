const express = require("express");
const router = express.Router();
const { upload } = require("../utils/azureUpload");
const { selectRiderType,employeeDetails,documentDetails,onboardingStatus } = require("../controllers/companySelectionController");
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
/**
 * @swagger
 * /api/company/rider/type:
 *   post:
 *     summary: Select rider type (Individual or Company)
 *     description: |
 *       This API allows a rider to select their onboarding type.
 *       Once selected, the riderType flag is updated to true in RiderOnboarding table.
 *
 *     tags:
 *       - Rider Onboarding
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
 *               - riderType
 *             properties:
 *               riderType:
 *                 type: string
 *                 enum: [INDIVIDUAL_EMPLOYEE, COMPANY_EMPLOYEE]
 *                 example: INDIVIDUAL_EMPLOYEE
 *
 *     responses:
 *       200:
 *         description: Rider type selected successfully
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
 *                   example: Rider type selected successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "uuid"
 *                     riderId:
 *                       type: string
 *                       example: "uuid"
 *                     riderType:
 *                       type: boolean
 *                       example: true
 *                     appPermissionDone:
 *                       type: boolean
 *                       example: true
 *                 selectedType:
 *                   type: string
 *                   example: COMPANY_EMPLOYEE
 *                 nextStage:
 *                   type: string
 *                   example: EMPLOYEE_DETAILS
 *
 *       400:
 *         description: Bad request (missing or invalid riderType)
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: riderType is required
 *
 *       401:
 *         description: Unauthorized (missing token)
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Unauthorized
 *
 *       404:
 *         description: Rider or onboarding record not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Rider not found
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 */
router.post("/rider/type", riderAuthMiddleWare, selectRiderType);


/**
 * @swagger
 * /api/company/rider/employee:
 *   post:
 *     summary: Submit company employee rider details
 *     description: >
 *       Saves employee details for a rider, applies referral code if provided,
 *       updates rider profile, onboarding flags, and moves rider to document details stage.
 *     tags:
 *       - Rider Onboarding
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - empId
 *               - fullName
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "Swiggy"
 *               empId:
 *                 type: string
 *                 example: "EMP12345"
 *               fullName:
 *                 type: string
 *                 example: "Rahul Kumar"
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1998-05-20"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: "male"
 *               secondaryPhone:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "rahul@example.com"
 *               referralCode:
 *                 type: string
 *                 description: Partner ID of existing rider used as referral code
 *                 example: "P1001"
 *     responses:
 *       200:
 *         description: Employee details submitted successfully
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
 *                   example: "Employee details submitted"
 *                 nextStage:
 *                   type: string
 *                   example: "DOCUMENT_DETAILS"
 *                 referralApplied:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Validation error or invalid referral code
 *         content:
 *           application/json:
 *             examples:
 *               requiredFieldsMissing:
 *                 summary: Required fields missing
 *                 value:
 *                   success: false
 *                   message: "companyName, empId, fullName are required"
 *               invalidGender:
 *                 summary: Invalid gender
 *                 value:
 *                   success: false
 *                   message: "Invalid gender"
 *               duplicateEmpId:
 *                 summary: Employee ID already exists
 *                 value:
 *                   success: false
 *                   message: "Employee ID already exists"
 *               invalidReferralCode:
 *                 summary: Invalid referral code
 *                 value:
 *                   success: false
 *                   message: "Invalid referral code"
 *               ownReferralCode:
 *                 summary: Own referral code used
 *                 value:
 *                   success: false
 *                   message: "You cannot use your own referral code"
 *       401:
 *         description: Unauthorized rider
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
 *                   example: "Unauthorized"
 *       404:
 *         description: Rider not found
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
 *                   example: "Rider not found"
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
 *                   example: "Internal server error"
 */
router.post("/rider/employee", riderAuthMiddleWare, employeeDetails);



/**
 * @swagger
 * /api/company/rider/document:
 *   post:
 *     summary: Upload rider document details and selfie
 *     tags:
 *       - Rider Onboarding
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - dlNumber
 *               - panNumber
 *               - type
 *               - selfie
 *             properties:
 *               dlNumber:
 *                 type: string
 *                 example: TS09AB12345678901
 *               panNumber:
 *                 type: string
 *                 example: ABCDE1234F
 *               type:
 *                 type: string
 *                 enum: [ev, bike, scooty]
 *                 example: bike
 *               selfie:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 */
router.post(
  "/rider/document",
  riderAuthMiddleWare,
  upload.single("selfie"),
  documentDetails
);

router.get("/rider/onboarding", riderAuthMiddleWare, onboardingStatus);


// router.post(
//   "/rider/document",
//   riderAuthMiddleWare,
//   upload.single("selfie"),
//   documentDetails
// );
module.exports = router;