const express = require("express");
const riderRouter = express.Router();

const {
  sendOtp,
  verifyOtp,
  checkStatus,
  updateLocation,
  updateVehicle,
  savePersonalInfo,
  uploadSelfieController,
  uploadPan,
  uploadDL,
  getProfile,
  saveAppPermissions,
  logoutOrDelete,
  onboardingStatus,
  completeKyc,
  refreshAccessToken,
  deviceToken,
  initializeApp,
  toggleRiderStatus,
  updateGPS,
  updateCompanyEmployeeLocation
} = require("../controllers/riderRegisterController");

const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const {upload} = require("../utils/azureUpload");
// const uploadDriving=require('../utils/multerDL')

// ============================================================
//   AUTH & OTP
// ============================================================

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to rider mobile number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number
 */
riderRouter.post("/auth/send-otp", sendOtp);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and login rider
 *     description: Verifies OTP, completes phone verification, creates access + refresh token pair.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *
 *     responses:
 *       200:
 *         description: OTP verified successfully
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
 *                   example: "OTP Verified"
 *                 isNewUser:
 *                   type: boolean
 *                   example: true
 *                 nextStage:
 *                   type: string
 *                   example: "APP_PERMISSIONS"
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR..."
 *                 refreshToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR..."
 *
 *       400:
 *         description: Missing phone or OTP / OTP not generated
 *
 *       401:
 *         description: Incorrect or expired OTP
 *
 *       404:
 *         description: Rider not found
 *
 *       500:
 *         description: Server error verifying OTP
 */

riderRouter.post("/auth/verify-otp", verifyOtp);

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     tags: [Auth]
 *     summary: Check rider registration status
 *     parameters:
 *       - name: phone
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status returned
 *       404:
 *         description: Rider not found
 */
riderRouter.get("/auth/status", checkStatus);


/**
 * @swagger
 * /api/rider/personal-info:
 *   post:
 *     summary: Save rider personal information
 *     description: Saves rider personal info and optional referral code.
 *     tags:
 *       - Rider
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - primaryPhone
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Ravi Kumar
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: 1998-05-10
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               primaryPhone:
 *                 type: string
 *                 example: "9876543210"
 *               secondaryPhone:
 *                 type: string
 *                 example: "9123456780"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ravi@gmail.com
 *               referralCode:
 *                 type: string
 *                 description: Partner ID/referral code of existing active rider
 *                 example: "PARTNER12345"
 *     responses:
 *       200:
 *         description: Personal info saved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Personal info saved successfully
 *               data:
 *                 riderId: "rider-id"
 *                 personalInfo:
 *                   fullName: Ravi Kumar
 *                   dob: "1998-05-10T00:00:00.000Z"
 *                   gender: male
 *                   primaryPhone: "9876543210"
 *                   secondaryPhone: "9123456780"
 *                   email: ravi@gmail.com
 *                 onboardingStage: SELFIE
 *       400:
 *         description: Validation or referral error
 *         content:
 *           application/json:
 *             examples:
 *               requiredFields:
 *                 value:
 *                   success: false
 *                   message: fullName and primaryPhone are required
 *               invalidReferral:
 *                 value:
 *                   success: false
 *                   message: Invalid referral code
 *               ownReferral:
 *                 value:
 *                   success: false
 *                   message: You cannot use your own referral code
 *               inactiveReferral:
 *                 value:
 *                   success: false
 *                   message: Referral code is not active
 *       401:
 *         description: Unauthorized rider
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Unauthorized rider
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Error saving personal info
 */
riderRouter.post("/rider/personal-info", riderAuthMiddleWare, savePersonalInfo);

// ============================================================
//   LOCATION
// ============================================================

/**
 * @swagger
 * /api/rider/location:
 *   post:
 *     tags: [Rider]
 *     summary: Update rider location (city & pincode)
 *     description: Saves selected city and pincode for the rider and moves onboarding to SELECT_VEHICLE stage.
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
 *               - city
 *               - pincode
 *             properties:
 *               city:
 *                 type: string
 *                 example: "Hyderabad"
 *               pincode:
 *                 type: string
 *                 example: "500081"
 *
 *     responses:
 *       200:
 *         description: Location updated successfully
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
 *                   example: Location updated
 *                 location:
 *                   type: object
 *                   properties:
 *                     city:
 *                       type: string
 *                       example: Hyderabad
 *                     pincode:
 *                       type: string
 *                       example: "500081"
 *                 nextStage:
 *                   type: string
 *                   example: SELECT_VEHICLE
 *
 *       400:
 *         description: Missing city or pincode
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: City and pincode are required
 *
 *       404:
 *         description: Invalid pincode
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Invalid pincode
 *
 *       500:
 *         description: Server error
 */

riderRouter.post("/rider/location", riderAuthMiddleWare, updateLocation);

/**
 * @swagger
 * /api/admin/company-rider/location:
 *   post:
 *     tags:
 *       - Company Employee Location
 *     summary: Update company employee rider location
 *     description: >
 *       Updates the city and pincode location for a company employee rider.
 *       
 *       Features:
 *       - Validates rider existence
 *       - Allows only COMPANY_EMPLOYEE riders
 *       - Validates city and pincode mapping
 *       - Creates or updates rider location
 *       - Marks onboarding citySelected as true
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - riderId
 *               - city
 *               - pincode
 *             properties:
 *
 *               riderId:
 *                 type: string
 *                 example: RIDER12345
 *
 *               city:
 *                 type: string
 *                 example: Hyderabad
 *
 *               pincode:
 *                 type: string
 *                 example: "500081"
 *
 *     responses:
 *
 *       200:
 *         description: Company employee location updated successfully
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
 *                   example: Company employee location updated successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *
 *                     riderId:
 *                       type: string
 *                       example: RIDER12345
 *
 *                     city:
 *                       type: string
 *                       example: Hyderabad
 *
 *                     pincode:
 *                       type: string
 *                       example: "500081"
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
 *                     missingRiderId:
 *                       value: riderId is required
 *
 *                     missingCityPincode:
 *                       value: city and pincode are required
 *
 *                     invalidRiderType:
 *                       value: Location can only be updated for company employee riders
 *
 *       404:
 *         description: Rider or pincode not found
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
 *                     riderNotFound:
 *                       value: Rider not found
 *
 *                     invalidLocation:
 *                       value: Invalid city or pincode
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


riderRouter.post("/admin/company-rider/location", updateCompanyEmployeeLocation );

// ============================================================
//   VEHICLE
// ============================================================

/**
 * @swagger
 * /api/rider/vehicle:
 *   post:
 *     tags: [Rider]
 *     summary: Update rider vehicle type
 *     description: Save selected vehicle type. Allowed values ev, bike, scooty.
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
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [ev, bike, scooty]
 *                 example: bike
 *
 *     responses:
 *       200:
 *         description: Vehicle selected successfully
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
 *                   example: Vehicle selected successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     riderId:
 *                       type: string
 *                     vehicleInfo:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: bike
 *                     onboardingProgress:
 *                       type: object
 *                     onboardingStage:
 *                       type: string
 *                       example: PERSONAL_INFO
 *
 *       400:
 *         description: Invalid vehicle type or missing field
 *
 *       401:
 *         description: Unauthorized
 *
 *       404:
 *         description: Rider not found
 *
 *       500:
 *         description: Server error
 */

riderRouter.post("/rider/vehicle", riderAuthMiddleWare, updateVehicle);



/**
 * @swagger
 * /api/rider/selfie:
 *   post:
 *     tags: [Rider]
 *     summary: Upload rider selfie
 *     description: Upload selfie image file. Field name must be "selfie".
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - selfie
 *             properties:
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Rider selfie image (jpg/png)
 *
 *     responses:
 *       200:
 *         description: Selfie uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Selfie uploaded successfully"
 *                 selfieUrl:
 *                   type: string
 *                   example: "/uploads/selfies/1700000000000-myphoto.jpg"
 *                 file:
 *                   type: object
 *                   properties:
 *                     originalname:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     mimetype:
 *                       type: string
 *
 *       400:
 *         description: Bad request (file missing)
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 *       500:
 *         description: Server error
 */

riderRouter.post(
  "/rider/selfie",
  riderAuthMiddleWare,
  upload.single("selfie"),
  uploadSelfieController
);
// ============================================================
   // KYC DOCUMENTS
// ============================================================ 

/**
 * @swagger
 * /api/rider/pan:
 *   post:
 *     tags: [KYC]
 *     summary: Upload PAN card + PAN number
 *     description: Upload PAN card image and PAN number for rider KYC. Requires JWT authentication.
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - pan
 *               - panNumber
 *             properties:
 *               pan:
 *                 type: string
 *                 format: binary
 *                 description: PAN card image file
 *
 *               panNumber:
 *                 type: string
 *                 example: "ABCDE1234F"
 *                 description: Rider's PAN card number
 *
 *     responses:
 *       200:
 *         description: PAN uploaded successfully
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
 *                   example: PAN uploaded successfully
 *                 imageUrl:
 *                   type: string
 *                   example: "https://your-azure-url.com/pan/12345.png"
 *                 panNumber:
 *                   type: string
 *                   example: "ABCDE1234F"
 *
 *       400:
 *         description: Missing file or invalid PAN number
 *
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 *
 *       404:
 *         description: Rider not found
 *
 *       500:
 *         description: Server error while uploading PAN
 */

riderRouter.post(
  "/rider/pan",
  riderAuthMiddleWare,
  upload.single("pan"),
  uploadPan
);

/**
 * @swagger
 * /api/rider/dl:
 *   post:
 *     tags: [KYC]
 *     summary: Upload Driving License front, back images + DL number
 *     description: Uploads DL images and DL number. Updates rider onboarding & KYC status.
 *     
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - front
 *               - back
 *               - dlNumber
 *             properties:
 *               front:
 *                 type: string
 *                 format: binary
 *                 description: Driving License front image
 *               back:
 *                 type: string
 *                 format: binary
 *                 description: Driving License back image
 *               dlNumber:
 *                 type: string
 *                 example: "DL-0420110149646"
 *                 description: Driving License number
 *
 *     responses:
 *       200:
 *         description: Driving Licence uploaded successfully
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
 *                   example: Driving Licence uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     frontImage:
 *                       type: string
 *                       example: "uploads/dl/front.jpg"
 *                     backImage:
 *                       type: string
 *                       example: "uploads/dl/back.jpg"
 *                     dlNumber:
 *                       type: string
 *                       example: "DL-0420110149646"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *
 *       400:
 *         description: Missing fields or invalid DL number
 *       404:
 *         description: Rider not found
 *       500:
 *         description: Server error
 */

riderRouter.post(
  "/rider/dl",
  riderAuthMiddleWare,
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]),
  uploadDL
);
/**
 * @swagger
 * /api/rider/app-permissions:
 *   post:
 *     summary: Save Rider App Permissions
 *     tags: [Rider Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - camera
 *               - foregroundLocation
 *               - backgroundLocation
 *             properties:
 *               camera:
 *                 type: boolean
 *                 example: true
 *               foregroundLocation:
 *                 type: boolean
 *                 example: true
 *               backgroundLocation:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Permissions granted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Permissions saved successfully
 *               allPermissionsGranted: true
 *               nextStage: EMPLOYEE_TYPE
 *       400:
 *         description: Invalid input or onboarding restriction
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       500:
 *         description: Internal server error
 */
riderRouter.post(
  "/rider/app-permissions",
  riderAuthMiddleWare,
  saveAppPermissions
);



// ============================================================
//   GET PROFILE
// ============================================================

/**
 * @swagger
 * /api/rider/profile:
 *   get:
 *     tags: [Rider Profile]
 *     summary: Get rider complete profile
 *     security:
 *       - bearerAuth: [] 
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       404:
 *         description: Rider not found
 */
riderRouter.get("/rider/profile", riderAuthMiddleWare, getProfile);



/**
 * @swagger
 * /api/rider/logout:
 *   delete:
 *     tags: [Auth]
 *     summary: Logout rider (removes refresh token & device token)
 *     description: Clears the rider's refresh token and device token. Requires Bearer Auth.
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: "Logged out successfully"
 *
 *       401:
 *         description: Unauthorized (missing or invalid access token)
 *
 *       500:
 *         description: Server error while logging out
 */

riderRouter.delete("/rider/logout", riderAuthMiddleWare,logoutOrDelete)

/**
 * @swagger
 * /api/rider/onboarding-status:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get rider onboarding stage and progress
 *     description: Returns the current onboarding stage and all progress flags for the rider. Requires JWT authentication.
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Onboarding status fetched successfully
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
 *                   example: Onboarding status fetched successfully
 *                 onboardingStage:
 *                   type: string
 *                   example: "PAN_UPLOAD"
 *                   description: Current onboarding stage of the rider
 *                 onboardingProgress:
 *                   type: object
 *                   properties:
 *                     phoneVerified:
 *                       type: boolean
 *                       example: true
 *                     appPermissionDone:
 *                       type: boolean
 *                       example: true
 *                     citySelected:
 *                       type: boolean
 *                       example: true
 *                     vehicleSelected:
 *                       type: boolean
 *                       example: false
 *                     personalInfoSubmitted:
 *                       type: boolean
 *                       example: false
 *                     selfieUploaded:
 *                       type: boolean
 *                       example: false
 *                     aadharVerified:
 *                       type: boolean
 *                       example: false
 *                     panUploaded:
 *                       type: boolean
 *                       example: true
 *                     dlUploaded:
 *                       type: boolean
 *                       example: false
 *
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *
 *       404:
 *         description: Rider not found
 *
 *       500:
 *         description: Server error while fetching onboarding status
 */



// /**
//  * @swagger
//  * /api/rider/onboarding-status:
//  *   get:
//  *     summary: Get Rider Onboarding Status
//  *     description: Returns onboarding stage and progress based on rider type (INDIVIDUAL or COMPANY)
//  *     tags:
//  *       - Rider Onboarding
//  *     security:
//  *       - bearerAuth: []
//  *
//  *     responses:
//  *       200:
//  *         description: Onboarding status fetched successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: Onboarding status fetched successfully
//  *                 onboardingStage:
//  *                   type: string
//  *                   example: EMPLOYEE_DETAILS
//  *                 onboardingProgress:
//  *                   type: object
//  *                   description: Dynamic response based on riderType
//  *                   oneOf:
//  *                     - type: object
//  *                       description: Individual Rider Flow
//  *                       properties:
//  *                         riderId:
//  *                           type: string
//  *                         phoneVerified:
//  *                           type: boolean
//  *                         appPermissionDone:
//  *                           type: boolean
//  *                         citySelected:
//  *                           type: boolean
//  *                         vehicleSelected:
//  *                           type: boolean
//  *                         personalInfoSubmitted:
//  *                           type: boolean
//  *                         selfieUploaded:
//  *                           type: boolean
//  *                         aadharVerified:
//  *                           type: boolean
//  *                         panUploaded:
//  *                           type: boolean
//  *                         dlUploaded:
//  *                           type: boolean
//  *                         kycCompleted:
//  *                           type: boolean
//  *                         riderType:
//  *                           type: boolean
//  *
//  *                     - type: object
//  *                       description: Company Employee Flow
//  *                       properties:
//  *                         riderId:
//  *                           type: string
//  *                         phoneVerified:
//  *                           type: boolean
//  *                         appPermissionDone:
//  *                           type: boolean
//  *                         employeeDetailsSubmitted:
//  *                           type: boolean
//  *                         documentDetailsSubmitted:
//  *                           type: boolean
//  *                         employeeKycVerified:
//  *                           type: boolean
//  *                         kycCompleted:
//  *                           type: boolean
//  *                         riderType:
//  *                           type: boolean
//  *
//  *                 isFullyRegistered:
//  *                   type: boolean
//  *                   example: false
//  *
//  *       401:
//  *         description: Unauthorized
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: Unauthorized: Rider token invalid
//  *
//  *       404:
//  *         description: Rider not found
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: Rider not found
//  *
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             example:
//  *               success: false
//  *               message: Server error while fetching onboarding status
//  */

riderRouter.get("/rider/onboarding-status", riderAuthMiddleWare,onboardingStatus)


/**
 * @swagger
 * /api/rider/complete-kyc:
 *   post:
 *     summary: Complete rider KYC after all onboarding steps
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC completed successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "KYC completed and rider fully registered"
 *               onboardingStage: "COMPLETED"
 *               onboardingProgress:
 *                 phoneVerified: true
 *                 appPermissionDone: true
 *                 citySelected: true
 *                 vehicleSelected: true
 *                 personalInfoSubmitted: true
 *                 selfieUploaded: true
 *                 aadharVerified: true
 *                 panUploaded: true
 *                 dlUploaded: true
 *                 kycCompleted: true
 *               isFullyRegistered: true
 *
 *       400:
 *         description: Onboarding steps incomplete
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Onboarding steps not completed"
 *               missingSteps:
 *                 - "appPermissionDone"
 *                 - "citySelected"
 *                 - "aadharVerified"
 *
 *       404:
 *         description: Onboarding record not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Onboarding record not found"
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Server error while completing KYC"
 */



riderRouter.post("/rider/complete-kyc",riderAuthMiddleWare,completeKyc );


/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Generate new access token using refresh token
 *     description: Returns a new access token and rotates the refresh token. Does NOT require Bearer auth.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR..."
 *
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR..."
 *                 refreshToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR..." 
 *
 *       401:
 *         description: Invalid or expired refresh token
 *
 *       500:
 *         description: Server error refreshing token
 */

riderRouter.post("/auth/refresh-token", refreshAccessToken);

/**
 * @swagger
 * /api/rider/device-token:
 *   post:
 *     tags: [Rider]
 *     summary: Save or update rider device token (FCM token)
 *     description: Stores the rider's device token used for push notifications. Requires Bearer Auth.
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
 *               - deviceToken
 *             properties:
 *               deviceToken:
 *                 type: string
 *                 example: "d6G4fgP9sjX9k0W8eD12:APA91bGv3V..."
 *                 description: FCM device token
 *
 *     responses:
 *       200:
 *         description: Device token saved successfully
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
 *                   example: "Device token saved successfully"
 *
 *       400:
 *         description: Missing device token
 *
 *       401:
 *         description: Unauthorized (Invalid or missing access token)
 *
 *       500:
 *         description: Server error while saving device token
 */

riderRouter.post("/rider/device-token", riderAuthMiddleWare ,deviceToken )

/**
 * @swagger
 * /api/rider/initialize:
 *   get:
 *     tags: [Auth]
 *     summary: Initialize app - determine whether rider goes to home or onboarding
 *     description: |
 *       Returns rider onboarding status or final home screen status.
 *       Requires a valid Access Token (handled in middleware).
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Initialization result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "FULLY_REGISTERED"
 *                   description: |
 *                     Possible values:
 *                     - FULLY_REGISTERED → go to Home
 *                     - ONBOARDING_PENDING → continue onboarding
 *                 nextPage:
 *                   type: string
 *                   example: "HOME"
 *                   description: Returned only when rider is fully registered
 *                 nextStage:
 *                   type: string
 *                   example: "PERSONAL_INFO"
 *                   description: Returned only when onboarding is pending
 *                 rider:
 *                   type: object
 *                   description: Rider object data
 *
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *
 *       500:
 *         description: Server error
 */


riderRouter.get("/rider/initialize", riderAuthMiddleWare, initializeApp);


  
/**
 * @swagger
 * /api/rider/online-offline-status:
 *   patch:
 *     tags:
 *       - Rider
 *     summary: Toggle rider online/offline status
 *     description: >
 *       Allows the rider to switch between ONLINE and OFFLINE.  
 *       Rider **cannot go ONLINE if GPS is disabled** (`gps.isEnabled = false`).
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isOnline:
 *                 type: boolean
 *                 example: true
 *                 description: true → Online, false → Offline
 *
 *     responses:
 *       200:
 *         description: Rider status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Rider is now ONLINE"
 *               data:
 *                 isOnline: true
 *                 lastOnlineAt: "2026-01-03T10:20:00.000Z"
 *
 *       400:
 *         description: Validation or GPS error
 *         content:
 *           application/json:
 *             examples:
 *               gpsDisabled:
 *                 summary: GPS is OFF, rider cannot go online
 *                 value:
 *                   success: false
 *                   message: "Please enable GPS to go online"
 *               invalidBody:
 *                 summary: Invalid request
 *                 value:
 *                   success: false
 *                   message: "isOnline must be true or false"
 *
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 *
 *       404:
 *         description: Rider not found
 *
 *       500:
 *         description: Server error
 */


riderRouter.patch(
  "/rider/online-offline-status",
  riderAuthMiddleWare,
  toggleRiderStatus
);


/**
 * @swagger
 * /api/rider/gps-status:
 *   patch:
 *     tags:
 *       - GPS
 *     summary: Update rider GPS permission & location
 *     description: >
 *       Updates the rider's GPS status.  
 *       If GPS is disabled from phone settings, the app must send `isEnabled: false`.  
 *       If GPS is enabled, latitude and longitude are required.
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isEnabled:
 *                 type: boolean
 *                 example: true
 *               lat:
 *                 type: number
 *                 example: 12.9716
 *               lng:
 *                 type: number
 *                 example: 77.5946
 *
 *     responses:
 *       200:
 *         description: GPS status updated
 *         content:
 *           application/json:
 *             examples:
 *               enabled:
 *                 summary: GPS Enabled
 *                 value:
 *                   success: true
 *                   message: "GPS updated successfully"
 *                   data:
 *                     isEnabled: true
 *                     location:
 *                       lat: 12.9716
 *                       lng: 77.5946
 *               disabled:
 *                 summary: GPS Disabled
 *                 value:
 *                   success: true
 *                   message: "GPS disabled"
 *                   data:
 *                     isEnabled: false
 *                     lastLocation: null
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Latitude and longitude required when GPS is enabled"
 *
 *       500:
 *         description: Server error
 */


riderRouter.patch(
  "/rider/gps-status",
  riderAuthMiddleWare,
   updateGPS
);

module.exports = riderRouter;
