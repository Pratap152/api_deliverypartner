const express=require('express');
const router=express.Router();
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
const {getProfile}=require('../controllers/profileController')
const {getBankDetails}=require('../controllers/bankDetailsController')
const uploadSelfie = require("../middleware/uploadSelfie");
const { upload } = require("../utils/azureUpload");

const { updateProfile,
  getAllDocuments,
  getWalletDetails,
  updateDocuments,
  getRiderOrderHistory,
  getSlotHistory,
  addOrUpdateBankDetails,
  getMyAssetsSummary,
  getBankDetails_profile,
getMyAssets } = require("../controllers/profileController");

/**
 * @swagger
 * /api/profile/update:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Update rider profile (single field or selfie)
 *     description: >
 *       Updates rider profile details.  
 *       Supports updating **any single text field**, multiple fields, or **selfie upload**.
 *       Selfie is uploaded to Azure Blob Storage and the URL is saved.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               countryCode:
 *                 type: string
 *                 example: "+91"
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               streetAddress:
 *                 type: string
 *                 example: "12-3-456"
 *               area:
 *                 type: string
 *                 example: "Kukatpally"
 *               city:
 *                 type: string
 *                 example: "Hyderabad"
 *               state:
 *                 type: string
 *                 example: "Telangana"
 *               pincode:
 *                 type: string
 *                 example: "500072"
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Upload selfie image (jpg/png). Stored in Azure Blob Storage.
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   example:
 *                     city: Hyderabad
 *                     selfie: https://azurebloburl/selfies/1704692123.jpg
 *       400:
 *         description: No data provided for update
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
 *                   example: No data provided for update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rider not found
 *       500:
 *         description: Server error
 */

router.put("/update", riderAuthMiddleWare,  upload.single("selfie"),
 updateProfile);


/**
 * @swagger
 * /api/profile/rider/profile:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get rider profile
 *     description: >
 *       Fetch the logged-in rider’s profile with clean and required fields only.
 *       This API excludes wallet details, bank details, KYC documents,
 *       permissions, boolean flags, and other internal system fields.
 *       Empty or undefined fields are automatically removed from the response.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
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
 *                   example: Profile fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 694e527648bc25e14034aab0
 *
 *                     # ✅ NEW FIELD
 *                     isPartnerActive:
 *                       type: boolean
 *                       example: true
 *
 *                     phone:
 *                       type: object
 *                       properties:
 *                         countryCode:
 *                           type: string
 *                           example: "+91"
 *                         number:
 *                           type: string
 *                           example: "9988123456"
 *                     personalInfo:
 *                       type: object
 *                       properties:
 *                         fullName:
 *                           type: string
 *                           example: GuruNath
 *                         dob:
 *                           type: string
 *                           format: date
 *                           example: 1995-05-10
 *                     location:
 *                       type: object
 *                       properties:
 *                         city:
 *                           type: string
 *                           example: Visakhapatnam
 *                         area:
 *                           type: string
 *                           example: Dwaraka Nagar
 *
 *                     vehicleInfo:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: bike
 *                     selfie:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           example: https://deliverypartner.blob.core.windows.net/delivery/selfies/selfie.jpg
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                           example: 2025-12-26T10:14:20.586Z
 *                     onboardingStage:
 *                       type: string
 *                       example: KYC_APPROVAL_PENDING
 *                     lastOtpVerifiedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-01T00:00:00.000Z
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
 *                   example: Rider not found
 *       500:
 *         description: Server error
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
 *                   example: Server error
 */
router.get("/rider/profile", riderAuthMiddleWare, getProfile);
// Get bank details
/**
 * @swagger
 * /api/profile/bank-details:
 *   get:
 *     tags: [Profile]
 *     summary: Get rider bank details
 *     description: Fetches saved bank account details for the authenticated rider.
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Bank details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     bankName:
 *                       type: string
 *                       example: HDFC Bank
 *                     accountHolderName:
 *                       type: string
 *                       example: Jagadeesh Kumar
 *                     accountNumber:
 *                       type: string
 *                       example: "123456789012"
 *                     ifscCode:
 *                       type: string
 *                       example: HDFC0001234
 *                     addedBankAccount:
 *                       type: boolean
 *                       example: true
 *
 *       401:
 *         description: Unauthorized or invalid token
 *
 *       500:
 *         description: Server error
 */

router.get("/bank-details", riderAuthMiddleWare, getBankDetails_profile);
 
/**
 * @swagger
 * /api/profile/assets:
 *   get:
 *     summary: Get rider asset issues and bad condition count
 *     tags: [Rider Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset issues fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     badConditionCount:
 *                       type: integer
 *                       example: 2
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           assetType:
 *                             type: string
 *                             enum: [T_SHIRT, BAG, HELMET, JACKET, ID_CARD, OTHER]
 *                             example: BAG
 *                           assetName:
 *                             type: string
 *                             example: Delivery Bag - Large
 *                           issueType:
 *                             type: string
 *                             enum: [DAMAGED, LOST, WRONG_SIZE, OTHER]
 *                             example: DAMAGED
 *                           description:
 *                             type: string
 *                             example: Bag zip is broken
 *                           status:
 *                             type: string
 *                             enum: [OPEN, IN_PROGRESS, RESOLVED]
 *                             example: OPEN
 *                           raisedAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 */

 
router.get(
  "/assets",
  riderAuthMiddleWare,
  getMyAssetsSummary
);
/**
 * @swagger
 * /api/profile/totalassets:
 *   get:
 *     summary: Get rider asset summary
 *     description: Fetch all assets issued to the logged-in rider along with summary counts and condition status.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assets fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: number
 *                       example: 2
 *                     totalAssets:
 *                       type: number
 *                       example: 3
 *                     badConditionCount:
 *                       type: number
 *                       example: 1
 *                     canRaiseRequest:
 *                       type: boolean
 *                       example: true
 *                     assets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           assetId:
 *                             type: string
 *                             example: "661abc1234567890"
 *                           assetType:
 *                             type: string
 *                             example: "BAG"
 *                           assetName:
 *                             type: string
 *                             example: "Delivery Bag XL"
 *                           quantity:
 *                             type: number
 *                             example: 1
 *                           condition:
 *                             type: string
 *                             example: "BAD"
 *                           issuedDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-29T10:30:00.000Z"
 *                           canRaiseRequest:
 *                             type: boolean
 *                             example: true
 *
 *       401:
 *         description: Unauthorized - Invalid or missing token
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
 *                   example: Authorization token missing
 *
 *       500:
 *         description: Server error
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
 *                   example: Failed to fetch asset summary
 */

router.get(
  "/totalassets",
  riderAuthMiddleWare,
  getMyAssets
);

/**
 * @swagger
 * /api/profile/documents:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get rider KYC documents
 *     description: >
 *       Fetch all KYC-related documents of the logged-in rider in a single API.
 *       This includes Aadhaar, PAN, and Driving License details if available.
 *       No bank details, permissions, or non-KYC profile data are returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documents fetched successfully
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
 *                   example: Documents fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     aadhar:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         isVerified:
 *                           type: boolean
 *                           example: true
 *                         status:
 *                           type: string
 *                           example: approved
 *                     pan:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         number:
 *                           type: string
 *                           example: GUTHT6666H
 *                         image:
 *                           type: string
 *                           example: https://deliverypartner.blob.core.windows.net/delivery/pan/pan.jpg
 *                         status:
 *                           type: string
 *                           example: pending
 *                     drivingLicense:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         number:
 *                           type: string
 *                           example: HJ56567896786786
 *                         frontImage:
 *                           type: string
 *                           example: https://deliverypartner.blob.core.windows.net/delivery/dl-front/front.jpg
 *                         backImage:
 *                           type: string
 *                           example: https://deliverypartner.blob.core.windows.net/delivery/dl-back/back.jpg
 *                         status:
 *                           type: string
 *                           example: pending
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
 *                   example: Rider not found
 *       500:
 *         description: Server error
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
 *                   example: Server error
 */

router.get("/documents", riderAuthMiddleWare, getAllDocuments);

/**
 * @swagger
 * /api/profile/wallet:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get rider wallet details
 *     description: >
 *       Fetch wallet details of the logged-in rider.
 *       This API returns only wallet-related information such as
 *       balance, total earned amount, and total withdrawn amount.
 *       No profile data, KYC documents, bank details, or permissions are included.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details fetched successfully
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
 *                   example: Wallet details fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                       example: 1850
 *                     totalEarned:
 *                       type: number
 *                       example: 7200
 *                     totalWithdrawn:
 *                       type: number
 *                       example: 5350
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
 *                   example: Rider not found
 *       500:
 *         description: Server error
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
 *                   example: Server error
 */

router.get("/wallet", riderAuthMiddleWare, getWalletDetails);
/**
 * @swagger
 * /api/profile/documents/update:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Upload or update PAN and Driving License
 *     description: >
 *       Upload PAN or Driving License images using OCR.
 *       If OCR fails twice, manual update is allowed.
 *
 *       **Flow**
 *       - Upload image (PAN / DL)
 *       - If image is blur → retry upload
 *       - After 2 failed OCR attempts → manual update allowed
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               panImage:
 *                 type: string
 *                 format: binary
 *                 description: PAN card image
 *               dlFrontImage:
 *                 type: string
 *                 format: binary
 *                 description: Driving License front image
 *               dlBackImage:
 *                 type: string
 *                 format: binary
 *                 description: Driving License back image (optional)
 *
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               panNumber:
 *                 type: string
 *                 example: ABCDE1234F
 *                 description: Manual PAN update (allowed only after OCR failure)
 *               dlNumber:
 *                 type: string
 *                 example: DL1420110012345
 *                 description: Manual Driving License update (allowed only after OCR failure)
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: 2030-05-12
 *                 description: Driving License expiry date (manual entry)
 *
 *     responses:
 *       200:
 *         description: Document uploaded or updated successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     pan:
 *                       type: object
 *                       properties:
 *                         number:
 *                           type: string
 *                           example: ABCDE1234F
 *                     image:
 *                       type: string
 *                       example: https://deliverypartner.blob.core.windows.net/delivery/pan/sample.webp
 *                     drivingLicense:
 *                       type: object
 *                       properties:
 *                         number:
 *                           type: string
 *                           example: DL1420110012345
 *
 *       400:
 *         description: OCR failed or no valid input
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
 *                   example: PAN image is blur. Please upload a clear image.
 *                 allowManual:
 *                   type: boolean
 *                   example: false
 *
 *       403:
 *         description: Manual update not allowed
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
 *                   example: Manual PAN update not allowed yet
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */

router.put(
  "/documents/update",
  riderAuthMiddleWare,        
  upload.fields([
    { name: "panImage", maxCount: 1 },
    { name: "dlFrontImage", maxCount: 1 },
    { name: "dlBackImage", maxCount: 1 }
  ]),
  updateDocuments
);

/**
 * @swagger
 * /api/profile/orders/history:
 *   get:
 *     summary: Get rider delivered order history
 *     description: Fetch rider delivered orders with earnings, ratings, distance, and order details.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, daily, weekly, monthly]
 *         required: false
 *         description: Filter orders by date range
 *         example: monthly
 *     responses:
 *       200:
 *         description: Rider order history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 filter:
 *                   type: string
 *                   example: monthly
 *                 totalOrders:
 *                   type: integer
 *                   example: 57
 *                 totalRiderEarnings:
 *                   type: number
 *                   example: 4069.05
 *                 totalDistance:
 *                   type: number
 *                   example: 357.81
 *                 avgRating:
 *                   type: number
 *                   example: 4.5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       orderId:
 *                         type: string
 *                         example: ORD-A76D2A14
 *
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             itemName:
 *                               type: string
 *                               example: Basmati Rice
 *                             quantity:
 *                               type: integer
 *                               example: 2
 *                             price:
 *                               type: number
 *                               example: 60
 *                             total:
 *                               type: number
 *                               example: 120
 *
 *                       pricing:
 *                         type: object
 *                         properties:
 *                           itemTotal:
 *                             type: number
 *                             example: 120
 *                           deliveryFee:
 *                             type: number
 *                             example: 40
 *                           tax:
 *                             type: number
 *                             example: 5
 *                           platformCommission:
 *                             type: number
 *                             example: 10
 *                           totalAmount:
 *                             type: number
 *                             example: 165
 *                           riderEarning:
 *                             type: number
 *                             example: 70.85
 *                           earningBreakup:
 *                             type: object
 *                             properties:
 *                               basePay:
 *                                 type: number
 *                                 example: 40
 *                               distancePay:
 *                                 type: number
 *                                 example: 30.85
 *                               surgePay:
 *                                 type: number
 *                                 example: 0
 *                               tips:
 *                                 type: number
 *                                 example: 0
 *                               totalEarning:
 *                                 type: number
 *                                 example: 70.85
 *                               credited:
 *                                 type: boolean
 *                                 example: true
 *                               creditedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2026-05-06T06:38:14.497Z
 *
 *                       distanceTravelled:
 *                         type: number
 *                         example: 6.17
 *
 *                       durationInMin:
 *                         type: integer
 *                         example: 15
 *
 *                       pickupAddress:
 *                         type: string
 *                         example: Madhapur, Hyderabad
 *
 *                       deliveredAddress:
 *                         type: string
 *                         example: Kukatpally, Hyderabad
 *
 *                       rating:
 *                         type: number
 *                         example: 4.5
 *
 *                       review:
 *                         type: string
 *                         nullable: true
 *                         example: Good delivery service
 *
 *                       deliveredAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-05-06T06:38:14.524Z
 *
 *       400:
 *         description: Rider ID missing
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
 *                   example: Rider ID missing
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
 *                   example: Server error
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get(
  "/orders/history",
  riderAuthMiddleWare,
  getRiderOrderHistory
);
/**
 * @swagger
 * /api/profile/slots/history:
 *   get:
 *     summary: Get Rider Slot History & Earnings
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Returns rider slot booking history along with completed orders,
 *       canceled orders and total earnings.
 *       Supports daily, weekly and monthly filters.
 *
 *     parameters:
 *       - in: query
 *         name: filter
 *         required: false
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Filter slot history by date range
 *         example: weekly
 *
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Required when filter=daily (YYYY-MM-DD)
 *         example: 2026-01-27
 *
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *         description: Required when filter=monthly (1-12)
 *         example: 1
 *
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *         description: Required when filter=monthly (YYYY)
 *         example: 2026
 *
 *     responses:
 *       200:
 *         description: Slot history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 filter:
 *                   type: string
 *                   example: weekly
 *
 *                 totalSlots:
 *                   type: integer
 *                   example: 5
 *
 *                 totalEarnings:
 *                   type: number
 *                   example: 650
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       slotBookingId:
 *                         type: string
 *                         example: 65cfd123ab91e1208e22d11
 *
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: 2026-01-25
 *
 *                       startTime:
 *                         type: string
 *                         example: "09:00"
 *
 *                       endTime:
 *                         type: string
 *                         example: "13:00"
 *
 *                       slotStatus:
 *                         type: string
 *                         enum: [ACTIVE, COMPLETED, CANCELED]
 *                         example: COMPLETED
 *
 *                       totalOrders:
 *                         type: integer
 *                         example: 12
 *
 *                       completedOrders:
 *                         type: integer
 *                         example: 10
 *
 *                       canceledOrders:
 *                         type: integer
 *                         example: 2
 *
 *                       slotEarnings:
 *                         type: number
 *                         example: 180
 *
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
 *                   example: Unauthorized
 *
 *       500:
 *         description: Server error
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

router.get(
  "/slots/history",
  riderAuthMiddleWare,
  getSlotHistory
);
/**
 * @swagger
 * /api/profile/bank-details:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Add or update rider bank details
 *     description: >
 *       Adds or updates the rider's bank details.
 *       The request body must contain a `bankDetails` object.
 *       Bank verification status will be reset to PENDING on update.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankDetails
 *             properties:
 *               bankDetails:
 *                 type: object
 *                 required:
 *                   - bankName
 *                   - accountHolderName
 *                   - accountType
 *                   - branch
 *                   - accountNumber
 *                   - ifscCode
 *                 properties:
 *                   bankName:
 *                     type: string
 *                     example: HDFC Bank
 *                   accountHolderName:
 *                     type: string
 *                     example: Gurunath
 *                   accountType:
 *                     type: string
 *                     enum: [SAVINGS, CURRENT]
 *                     example: SAVINGS
 *                   branch:
 *                     type: string
 *                     example: Madhapur
 *                   accountNumber:
 *                     type: string
 *                     example: "987654321098"
 *                   ifscCode:
 *                     type: string
 *                     example: HDFC0001234
 *     responses:
 *       200:
 *         description: Bank details saved successfully
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
 *                   example: Bank details saved successfully
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
 *                 message:
 *                   type: string
 *                   example: All bank details are required
 *       401:
 *         description: Unauthorized rider
 *       500:
 *         description: Server error
 */

router.put(

  "/bank-details",

  riderAuthMiddleWare,

  addOrUpdateBankDetails

);




module.exports=router;
