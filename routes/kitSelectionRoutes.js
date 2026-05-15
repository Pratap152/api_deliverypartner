const router = require('express').Router()
const{createAsset,
    viewAssets,
    requestAsset,
    
    makePayment,
    dispatchAsset,
    raiseIssue,
    markAsDelivered,
    requestJoiningKit, 
    uploadIssueImage,
    verifyIssue,
    completePaymentAndReadyForDispatch

}=require('../controllers/kitSelectionController');
const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");
// const upload = require("../middleware/uploadSelfie");
const { upload } = require("../utils/azureUpload"); 

/**
 * @swagger
 * /api/kit/payment/{requestIds}:
 *   post:
 *     summary: Select payment for joining kit requests
 *     description: >
 *       Allows an authenticated rider to select a payment option (FULL / EMI)
 *       for one or multiple asset requests. Accepts comma-separated requestIds.
 *       Creates or updates payment records and EMI plan if applicable.
 *     tags:
 *       - Joining Kit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestIds
 *         required: true
 *         description: Comma-separated asset request IDs
 *         schema:
 *           type: string
 *           example: eb311c97-8da7-4805-8952-8f920fca96a2,2d8748ad-d134-420b-a88b-1284e83d437b
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMode
 *               - paymentType
 *             properties:
 *               paymentMode:
 *                 type: string
 *                 enum: [ONLINE, CASH, UPI, CARD]
 *                 example: ONLINE
 *               paymentType:
 *                 type: string
 *                 enum: [FULL, EMI]
 *                 example: EMI
 *               emiMonths:
 *                 type: integer
 *                 description: Required only if paymentType is EMI
 *                 example: 3
 *     responses:
 *       200:
 *         description: Payment option selected successfully
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
 *                   example: Payment selected successfully
 *                 totalAmount:
 *                   type: number
 *                   example: 1500
 *                 totalRequests:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: pay_12345
 *                       assetRequestId:
 *                         type: string
 *                         example: eb311c97-8da7-4805-8952-8f920fca96a2
 *                       amount:
 *                         type: number
 *                         example: 750
 *                       paymentMode:
 *                         type: string
 *                         example: ONLINE
 *                       paymentType:
 *                         type: string
 *                         example: EMI
 *                       status:
 *                         type: string
 *                         enum: [PENDING, SUCCESS, FAILED]
 *                         example: PENDING
 *       400:
 *         description: Bad request / validation error
 *         content:
 *           application/json:
 *             examples:
 *               missingRequestIds:
 *                 summary: requestIds missing
 *                 value:
 *                   success: false
 *                   message: requestIds are required
 *               invalidEmi:
 *                 summary: EMI months missing
 *                 value:
 *                   success: false
 *                   message: emiMonths required for EMI
 *       401:
 *         description: Unauthorized rider
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Unauthorized
 *       404:
 *         description: Some requests not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Some requests not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Something went wrong
 *               error: Internal server error
 */
router.post('/payment/:requestIds', riderAuthMiddleWare, makePayment);



/**
 * @swagger
 * /api/kit/rider/joining-kit:
 *   post:
 *     summary: Request joining kit
 *     tags:
 *       - Joining Kit
 *     security:
 *       - bearerAuth: []
 *     description: Rider can request joining kit using HOME_DELIVERY or PICKUP. If kit is already pending/in progress, request will be blocked.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - deliveryMode
 *                   - name
 *                   - completeAddress
 *                   - pincode
 *                 properties:
 *                   deliveryMode:
 *                     type: string
 *                     enum: [HOME_DELIVERY]
 *                     example: HOME_DELIVERY
 *                   name:
 *                     type: string
 *                     example: Ravi Kumar
 *                   completeAddress:
 *                     type: string
 *                     example: H.No 12, Madhapur, Hyderabad
 *                   pincode:
 *                     type: string
 *                     example: "500081"
 *               - type: object
 *                 required:
 *                   - deliveryMode
 *                   - pickupLocationId
 *                 properties:
 *                   deliveryMode:
 *                     type: string
 *                     enum: [PICKUP]
 *                     example: PICKUP
 *                   pickupLocationId:
 *                     type: string
 *                     example: pickup-location-id
 *     responses:
 *       201:
 *         description: Joining kit requested successfully
 *       400:
 *         description: Validation error or joining kit already in progress
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Something went wrong
 */
router.post("/rider/joining-kit", riderAuthMiddleWare, requestJoiningKit);
router.post('/admin/assets', createAsset)
/**
 * @swagger
 * /api/kit/rider/assets:
 *   get:
 *     tags:
 *       - Rider Assets
 *     summary: Get all assets issued to the logged-in rider
 *     description: Returns the rider's assets along with quantity, free/paid status, issued and returned dates, and condition.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rider assets fetched successfully
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
 *                   example: Rider assets fetched successfully
 *                 totalAssets:
 *                   type: integer
 *                   example: 3
 *                 freeAssetsCount:
 *                   type: integer
 *                   example: 2
 *                 paidAssetsCount:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "item-uuid-1234"
 *                       riderAssetsId:
 *                         type: string
 *                         format: uuid
 *                         example: "rider-assets-uuid"
 *                       assetType:
 *                         type: string
 *                         enum: [T_SHIRT, BAG, HELMET, JACKET, ID_CARD, OTHER]
 *                         example: "BAG"
 *                       assetName:
 *                         type: string
 *                         example: "Delivery Bag"
 *                       issuedDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-23T10:23:00.000Z"
 *                       returnedDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: null
 *                       status:
 *                         type: string
 *                         enum: [ISSUED, RETURNED, LOST]
 *                         example: "ISSUED"
 *                       condition:
 *                         type: string
 *                         enum: [GOOD, BAD]
 *                         example: "GOOD"
 *                       isFree:
 *                         type: boolean
 *                         example: true
 *                       quantity:
 *                         type: integer
 *                         example: 1
 *       401:
 *         description: Unauthorized - rider token missing or invalid
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
 *         description: No assets issued to this rider
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
 *                   example: "No assets issued to this rider"
 *                 totalAssets:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   type: array
 *                   items: {}
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
 *                   example: "Something went wrong while fetching rider assets"
 *                 error:
 *                   type: string
 *                   example: "Database connection error"
 */
router.get('/rider/assets',riderAuthMiddleWare, viewAssets)
/**
 * @swagger
 * api/kit/rider/request:
 *   post:
 *     tags:
 *       - Rider Assets
 *     summary: Request an asset
 *     description: Rider can request an asset. If the asset is within the free limit, status will be READY_FOR_DISPATCH; otherwise, PAYMENT_PENDING.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetType
 *               - quantity
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [T_SHIRT, BAG, HELMET, JACKET, ID_CARD, OTHER]
 *                 example: "BAG"
 *               quantity:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Asset request created successfully
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
 *                   example: Asset request created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "1eecf7ae-d5d0-4d77-886f-eb96931c1e17"
 *                     riderId:
 *                       type: string
 *                       format: uuid
 *                       example: "rider-uuid-1234"
 *                     assetType:
 *                       type: string
 *                       example: "BAG"
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED, PAYMENT_PENDING, READY_FOR_DISPATCH, DISPATCHED, COMPLETED, CANCELLED]
 *                       example: "PAYMENT_PENDING"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-23T10:23:00.000Z"
 *                 price:
 *                   type: number
 *                   example: 0
 *                 isFree:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - missing assetType or quantity
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
 *                   example: "assetType and quantity are required"
 *       401:
 *         description: Unauthorized - invalid or missing rider token
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
 *         description: Asset not found
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
 *                   example: "Asset not found"
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
 *                   example: "Something went wrong"
 *                 error:
 *                   type: string
 *                   example: "Detailed error message"
 */
router.post('/rider/request',riderAuthMiddleWare, requestAsset)
// router.post('/admin/approve', approveRequest)
router.post(
  "/asset-issues/:issueId/upload-image",
  riderAuthMiddleWare ,
  upload.single("image"),
  uploadIssueImage
);

/**
 * @swagger
 * /api/kit/rider/issue/{requestId}:
 *   post:
 *     summary: Raise issue for delivered asset
 *     description: >
 *       Allows a rider to raise an issue (damage, missing, etc.) for a delivered asset.
 *       Issue can only be raised after the asset request status is COMPLETED.
 *     tags:
 *       - Rider Asset Issues
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: Asset request ID
 *         schema:
 *           type: string
 *           example: eb311c97-8da7-4805-8952-8f920fca96a2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetType
 *               - description
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [T_SHIRT, BAG, HELMET, JACKET, ID_CARD]
 *                 example: HELMET
 *               description:
 *                 type: string
 *                 example: Helmet visor is broken
 *               issueType:
 *                 type: string
 *                 enum: [DAMAGED, MISSING, WRONG_ITEM, OTHER]
 *                 example: DAMAGED
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/image.jpg
 *     responses:
 *       201:
 *         description: Issue raised successfully
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
 *                   example: Issue raised successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: issue_123
 *                     requestId:
 *                       type: string
 *                       example: eb311c97-8da7-4805-8952-8f920fca96a2
 *                     riderAssetsId:
 *                       type: string
 *                       example: ra_123
 *                     assetType:
 *                       type: string
 *                       example: HELMET
 *                     assetName:
 *                       type: string
 *                       example: Helmet
 *                     issueType:
 *                       type: string
 *                       example: DAMAGED
 *                     description:
 *                       type: string
 *                       example: Helmet visor is broken
 *                     imageUrl:
 *                       type: string
 *                       nullable: true
 *                       example: https://example.com/image.jpg
 *                     status:
 *                       type: string
 *                       enum: [OPEN, IN_PROGRESS, RESOLVED, REJECTED]
 *                       example: OPEN
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-05-05T10:30:00.000Z
 *       400:
 *         description: Bad request / validation error
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: assetType and description are required
 *               notDelivered:
 *                 summary: Asset not delivered yet
 *                 value:
 *                   success: false
 *                   message: You can raise issue only after asset is delivered
 *       401:
 *         description: Unauthorized rider
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Unauthorized
 *       403:
 *         description: Forbidden - not owner of asset request
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: You are not allowed to raise issue for this request
 *       404:
 *         description: Resource not found
 *         content:
 *           application/json:
 *             examples:
 *               requestNotFound:
 *                 summary: Asset request not found
 *                 value:
 *                   success: false
 *                   message: Asset request not found
 *               assetNotAssigned:
 *                 summary: Asset not assigned to rider
 *                 value:
 *                   success: false
 *                   message: This asset type is not assigned to the rider
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Something went wrong
 *               error: Internal server error
 */
router.post('/rider/issue/:requestId', riderAuthMiddleWare ,
     raiseIssue)
/**
 * @swagger
 * /api/kit/asset/mark-delivered/{requestIds}:
 *   post:
 *     summary: Mark assets as delivered (Admin)
 *     description: >
 *       Marks one or multiple shipped assets as DELIVERED.
 *       Updates shipment status, asset request status to COMPLETED,
 *       and creates rider asset records.
 *       Accepts comma-separated requestIds.
 *     tags:
 *       - Admin Kit Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestIds
 *         required: true
 *         description: Comma-separated asset request IDs
 *         schema:
 *           type: string
 *           example: eb311c97-8da7-4805-8952-8f920fca96a2,2d8748ad-d134-420b-a88b-1284e83d437b
 *     responses:
 *       200:
 *         description: Assets marked as delivered successfully
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
 *                   example: Assets delivered and rider assets created successfully
 *                 totalDelivered:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: ship_123
 *                       assetRequestId:
 *                         type: string
 *                         example: eb311c97-8da7-4805-8952-8f920fca96a2
 *                       deliveryStatus:
 *                         type: string
 *                         enum: [SHIPPED, IN_TRANSIT, DELIVERED]
 *                         example: DELIVERED
 *                       deliveredDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-05-05T12:30:00.000Z
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: requestIds are required
 *       404:
 *         description: Some shipments not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Some shipments not found
 *               foundShipmentRequestIds:
 *                 - eb311c97-8da7-4805-8952-8f920fca96a2
 *               missingRequestIds:
 *                 - 2d8748ad-d134-420b-a88b-1284e83d437b
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Something went wrong
 *               error: Internal server error
 */
router.post('/asset/mark-delivered/:requestIds', markAsDelivered)
/**
 * @swagger
 * /api/kit/admin/dispatch/{assetRequestIds}:
 *   post:
 *     summary: Dispatch assets (Admin)
 *     description: >
 *       Dispatch one or multiple asset requests by providing courier details.
 *       Only requests with status READY_FOR_DISPATCH can be dispatched.
 *       Accepts comma-separated assetRequestIds.
 *     tags:
 *       - Admin Kit Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetRequestIds
 *         required: true
 *         description: Comma-separated asset request IDs
 *         schema:
 *           type: string
 *           example: eb311c97-8da7-4805-8952-8f920fca96a2,2d8748ad-d134-420b-a88b-1284e83d437b
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courierName
 *               - trackingId
 *             properties:
 *               courierName:
 *                 type: string
 *                 example: Delhivery
 *               trackingId:
 *                 type: string
 *                 example: TRK123456789
 *     responses:
 *       200:
 *         description: Assets dispatched successfully
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
 *                   example: Assets dispatched successfully
 *                 totalDispatched:
 *                   type: integer
 *                   example: 2
 *                 assetRequestIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - eb311c97-8da7-4805-8952-8f920fca96a2
 *                     - 2d8748ad-d134-420b-a88b-1284e83d437b
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: ship_123
 *                       assetRequestId:
 *                         type: string
 *                         example: eb311c97-8da7-4805-8952-8f920fca96a2
 *                       courierName:
 *                         type: string
 *                         example: Delhivery
 *                       trackingId:
 *                         type: string
 *                         example: TRK123456789
 *                       dispatchDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-05-05T10:30:00.000Z
 *                       deliveryStatus:
 *                         type: string
 *                         enum: [SHIPPED, IN_TRANSIT, DELIVERED]
 *                         example: SHIPPED
 *       400:
 *         description: Bad request / invalid status / missing fields
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: assetRequestIds param, courierName and trackingId are required
 *               noValidIds:
 *                 summary: No valid IDs after parsing
 *                 value:
 *                   success: false
 *                   message: No valid assetRequestIds found in params
 *               invalidStatus:
 *                 summary: Requests not ready for dispatch
 *                 value:
 *                   success: false
 *                   message: Some assets are not ready for dispatch
 *                   invalidRequestIds:
 *                     - id1
 *                   statuses:
 *                     - id: id1
 *                       status: PAYMENT_PENDING
 *       404:
 *         description: Requests not found
 *         content:
 *           application/json:
 *             examples:
 *               noneFound:
 *                 summary: No requests found
 *                 value:
 *                   success: false
 *                   message: No asset requests found
 *               someNotFound:
 *                 summary: Some requests missing
 *                 value:
 *                   success: false
 *                   message: Some asset requests were not found
 *                   notFoundIds:
 *                     - id1
 *                     - id2
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Something went wrong while dispatching asset
 *               error: Internal server error
 */
router.post('/admin/dispatch/:assetRequestIds', dispatchAsset)
router.post("/issues/:issueId/verify",  verifyIssue);
/**
 * @swagger
 * /api/kit/payments/complete/{requestIds}:
 *   patch:
 *     summary: Complete payment and move asset requests to ready for dispatch
 *     description: >
 *       Marks pending payment records as SUCCESS for one or multiple asset requests
 *       and updates those asset requests to READY_FOR_DISPATCH.
 *       The request IDs should belong to the logged-in rider.
 *       Multiple request IDs can be passed as comma-separated values.
 *     tags:
 *       - Rider Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestIds
 *         required: true
 *         schema:
 *           type: string
 *           example: "7f9a4c2e-89a2-4c41-a785-b0d4f654a111,4cb1a42e-d4b2-4045-a2cb-cc427c9e2222"
 *         description: Single or comma-separated asset request IDs.
 *     responses:
 *       200:
 *         description: Payment completed and requests moved to ready for dispatch
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
 *                   example: Payment completed successfully. Requests moved to ready for dispatch
 *                 totalRequests:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "7f9a4c2e-89a2-4c41-a785-b0d4f654a111"
 *                       riderId:
 *                         type: string
 *                         example: "0d2504e9-9c37-4428-a480-97237814a7d4"
 *                       status:
 *                         type: string
 *                         example: "READY_FOR_DISPATCH"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-09T08:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-09T09:00:00.000Z"
 *                       Payment:
 *                         oneOf:
 *                           - type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "pay_12345"
 *                               assetRequestId:
 *                                 type: string
 *                                 example: "7f9a4c2e-89a2-4c41-a785-b0d4f654a111"
 *                               status:
 *                                 type: string
 *                                 example: "SUCCESS"
 *                               paidAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2026-05-09T09:00:00.000Z"
 *                           - type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   example: "pay_12345"
 *                                 assetRequestId:
 *                                   type: string
 *                                   example: "7f9a4c2e-89a2-4c41-a785-b0d4f654a111"
 *                                 status:
 *                                   type: string
 *                                   example: "SUCCESS"
 *                                 paidAt:
 *                                   type: string
 *                                   format: date-time
 *                                   example: "2026-05-09T09:00:00.000Z"
 *       400:
 *         description: requestIds missing
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
 *                   example: requestIds are required
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
 *                   example: Unauthorized rider
 *       500:
 *         description: Internal server error or validation failure inside transaction
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
 *                     invalidRequests:
 *                       value: Some asset requests are invalid or do not belong to this rider
 *                     paymentNotFound:
 *                       value: Payment record not found for some requests
 *                     serverError:
 *                       value: Something went wrong
 */
router.patch(
  "/payments/complete/:requestIds",
  riderAuthMiddleWare,
  completePaymentAndReadyForDispatch
);


module.exports = router