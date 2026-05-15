const express = require("express");
const router = express.Router();

const {
  createOrder,
  confirmOrder,
  // assignOrderToRider,
   acceptOrder,
   rejectOrder,
   getOrderDetails,
   pickupOrder,
   deliverOrder,
    cancelOrder,
    getOrdersByRider,
    getDeliveredOrdersByRider,
    getCancelledOrdersByRider,
    getSurgeStatus
} = require("../controllers/orderController");

const { riderAuthMiddleWare } = require("../middleware/riderAuthMiddleware");


// ================================
// CREATE ORDER
// ================================
/**

* @swagger

* /api/orders/orderCreate:

*   post:

*     tags:

*       - Orders

*     summary: Create a new order

*     description: >

*       Creates a new order with geolocation, payment handling, and weight-based validation.

*       Converts item weights (g, kg, ml, l) into KG and calculates total order weight.

*       Orders above 20kg are rejected for bike delivery.

*       Also stores pickup location with pincode for rider allocation.

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

*               - vendorShopName

*               - items

*               - pickupAddress

*               - deliveryAddress

*               - payment

*             properties:

*

*               vendorShopName:

*                 type: string

*                 example: Fresh Mart Grocery

*

*               items:

*                 type: array

*                 minItems: 1

*                 items:

*                   type: object

*                   required:

*                     - itemName

*                     - quantity

*                     - price

*                     - total

*                     - weightPerUnit

*                     - weightUnit

*                   properties:

*                     itemName:

*                       type: string

*                       example: Basmati Rice

*

*                     quantity:

*                       type: number

*                       example: 2

*

*                     price:

*                       type: number

*                       example: 60

*

*                     total:

*                       type: number

*                       example: 120

*

*                     weightPerUnit:

*                       type: number

*                       example: 500

*

*                     weightUnit:

*                       type: string

*                       enum: [g, kg, ml, l]

*                       example: g

*

*               pickupAddress:

*                 type: object

*                 required:

*                   - name

*                   - addressLine

*                   - contactNumber

*                   - pincode

*                 properties:

*                   name:

*                     type: string

*                     example: Fresh Mart Store

*

*                   addressLine:

*                     type: string

*                     example: Madhapur, Hyderabad

*

*                   contactNumber:

*                     type: string

*                     example: 9876543210

*

*                   pincode:

*                     type: string

*                     example: 500081

*

*               deliveryAddress:

*                 type: object

*                 required:

*                   - name

*                   - addressLine

*                   - contactNumber

*                 properties:

*                   name:

*                     type: string

*                     example: Rohit Kumar

*

*                   addressLine:

*                     type: string

*                     example: Kukatpally, Hyderabad

*

*                   contactNumber:

*                     type: string

*                     example: 9123456780

*

*               payment:

*                 type: object

*                 required:

*                   - mode

*                 properties:

*                   mode:

*                     type: string

*                     enum: [COD, ONLINE]

*                     example: COD

*

*                   codPaymentType:

*                     type: string

*                     enum: [CASH, UPI]

*                     example: CASH

*

*     responses:

*

*       201:

*         description: Order created successfully

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

*                   example: Order created successfully

*

*                 orderId:

*                   type: string

*                   example: ORD-8F3A2C1B

*

*                 totalWeight:

*                   type: string

*                   example: 4.50 kg

*

*                 payment:

*                   type: object

*                   properties:

*                     mode:

*                       type: string

*                       example: COD

*

*                     status:

*                       type: string

*                       example: PENDING

*

*                     transactionId:

*                       type: string

*                       example: TXN12345

*

*       400:

*         description: Validation error or weight exceeded

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

*                   example: Order weight 22.5kg exceeds 20kg limit for biker

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

*                   example: Order creation failed

*/
 

router.post("/orderCreate", createOrder);

// ================================
// CONFIRM ORDER
// ================================



/**
 *
 * @swagger
 * /api/orders/{orderId}/confirm:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Confirm order and notify nearby riders
 *     description: >
 *       Confirms a newly created order, finds eligible active riders,
 *       calculates distance, ETA, and estimated earnings,
 *       and sends real-time order popup notifications via WebSocket.
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: ORD-12345
 *
 *     responses:
 *       200:
 *         description: Order confirmed and notifications sent successfully
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
 *                   example: Order confirmed and sent to riders
 *                 notifiedRiders:
 *                   type: integer
 *                   example: 5
 *
 *       400:
 *         description: Bad request (order already processed or no riders available)
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
 *                   example: No riders available
 *
 *       404:
 *         description: Order not found
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
 *                   example: Order not found
 *
 *       500:
 *         description: Internal server error while confirming order
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
 *                   example: Failed to confirm order
 */
 
 
 

router.patch("/:orderId/confirm", confirmOrder);

// ================================
// ASSIGN ORDER TO RIDER
// ================================
// router.patch("/:orderId/assign", assignOrderToRider);

// ================================
// RIDER ACCEPT ORDER
// ================================


/**
 * @swagger
 * /api/orders/{orderId}/accept:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Rider accepts an order
 *     description: >
 *       Allows an authenticated rider to accept a CONFIRMED order within the allocation window.
 *       The first rider to accept gets assigned.
 *       Once accepted, all other candidate riders are automatically rejected.
 *       This operation is atomic to avoid race conditions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Unique order ID to accept
 *         schema:
 *           type: string
 *         example: ORD-F95B0DB0
 *     responses:
 *       200:
 *         description: Order accepted and assigned successfully
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
 *                   example: "Order assigned successfully"
 *                 orderId:
 *                   type: string
 *                   example: ORD-F95B0DB0
 *       409:
 *         description: Order already assigned, expired, or rider not eligible
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
 *                   example: "Order already assigned or expired"
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Internal server error
 */



router.patch("/:orderId/accept",riderAuthMiddleWare, acceptOrder);

// ================================
// RIDER REJECT ORDER
// ================================


/**
 * @swagger
 * /api/orders/{orderId}/reject:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Rider rejects an order
 *     description: >
 *       Allows an authenticated rider to reject a CONFIRMED order during the allocation window.
 *       The rider must be one of the allocated candidate riders and must be in PENDING state.
 *       The rejection is handled atomically to prevent race conditions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Unique order ID to reject
 *         schema:
 *           type: string
 *         example: ORD-F95B0DB0
 *     responses:
 *       200:
 *         description: Order rejected successfully
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
 *                   example: "Order rejected successfully"
 *                 pendingRiders:
 *                   type: number
 *                   description: Number of riders still in PENDING state
 *                   example: 3
 *       409:
 *         description: Order already assigned or cannot be rejected
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
 *                   example: "Order already assigned or cannot be rejected"
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Internal server error
 */

 router.patch("/:orderId/reject",riderAuthMiddleWare, rejectOrder);

// ================================
// GET ORDER DETAILS
// ================================

/**
 * @swagger
 * /api/orders/{orderId}/details:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get order details by orderId
 *     description: >
 *       Fetches limited order details using the orderId.
 *       Only selected fields like items, addresses, and pricing are returned.
 *       Rider, allocation, payment, and settlement details are intentionally excluded.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Unique order ID
 *         schema:
 *           type: string
 *           example: ORD-F95B0DB0
 *     responses:
 *       200:
 *         description: Order details fetched successfully
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
 *                   example: Order details fetched successfully
 *                 filteredOrder:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6971bf46b086deb130aac60b
 *                     orderId:
 *                       type: string
 *                       example: ORD-F95B0DB0
 *                     vendorShopName:
 *                       type: string
 *                       example: Daily Needs Store
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           itemName:
 *                             type: string
 *                             example: Basmati Rice
 *                           quantity:
 *                             type: number
 *                             example: 5
 *                           price:
 *                             type: number
 *                             example: 60
 *                           total:
 *                             type: number
 *                             example: 300
 *                     pickupAddress:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: Daily Needs Store
 *                         lat:
 *                           type: number
 *                           example: 17.42
 *                         lng:
 *                           type: number
 *                           example: 78.39
 *                         addressLine:
 *                           type: string
 *                           example: Miyapur
 *                         contactNumber:
 *                           type: string
 *                           example: "9012345679"
 *                     deliveryAddress:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: Anil Sharma
 *                         lat:
 *                           type: number
 *                           example: 17.46
 *                         lng:
 *                           type: number
 *                           example: 78.41
 *                         addressLine:
 *                           type: string
 *                           example: Kukatpally
 *                         contactNumber:
 *                           type: string
 *                           example: "9898989896"
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         itemTotal:
 *                           type: number
 *                           example: 580
 *                         deliveryFee:
 *                           type: number
 *                           example: 0
 *                         tax:
 *                           type: number
 *                           example: 0
 *                         platformCommission:
 *                           type: number
 *                           example: 0
 *                         totalAmount:
 *                           type: number
 *                           example: 580
 *       404:
 *         description: Order not found
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
 *                   example: Order not found
 *       500:
 *         description: Internal server error
 */
router.get("/:orderId/details", getOrderDetails);





// ================================
// PICKUP ORDER
// ================================

/**
 * @swagger
 * /api/orders/{orderId}/pickup:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Mark order as picked up
 *     description: >
 *       This API is used by the assigned rider to mark an order as picked up.
 *       <br/><br/>
 *       <b>Validations:</b>
 *       <ul>
 *         <li>Order must be in <b>ASSIGNED</b> state</li>
 *         <li>Rider must be the assigned rider</li>
 *       </ul>
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: ORD-4DDF0D72
 *     responses:
 *       200:
 *         description: Order picked up successfully
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
 *                   example: "Order picked up successfully"
 *                 orderStatus:
 *                   type: string
 *                   example: "PICKED_UP"
 *       400:
 *         description: Invalid order state
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
 *                   example: "Order is not ready for pickup"
 *       403:
 *         description: Rider not assigned to this order
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
 *                   example: "You are not assigned to this order"
 *       404:
 *         description: Order not found
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
 *                   example: "Order not found"
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Server error
 */


router.patch("/:orderId/pickup",riderAuthMiddleWare, pickupOrder);

/*
////////////////////////////////////////

          deliver

//////////////////////////////////////////// // 
*/

/**
 * @swagger
 * /api/orders/{orderId}/deliver:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Mark order as delivered
 *     description: >
 *       This API is used by the assigned rider to mark an order as delivered.
 *       <br/><br/>
 *       <b>Business Logic:</b>
 *       <ul>
 *         <li>Order must be in <b>PICKED_UP</b> state</li>
 *         <li>Rider must be the assigned rider</li>
 *         <li>Rider earning is credited to wallet (once)</li>
 *         <li>If payment mode is <b>COD</b>, cash is added to rider cash-in-hand</li>
 *         <li>COD limit is enforced</li>
 *         <li>Rider state is reset to READY</li>
 *       </ul>
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: ORD-80C55161
 *     responses:
 *       200:
 *         description: Order delivered successfully
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
 *                   example: "Order delivered successfully"
 *                 orderId:
 *                   type: string
 *                   example: ORD-80C55161
 *                 earningCredited:
 *                   type: number
 *                   example: 78
 *                 codCollected:
 *                   type: number
 *                   example: 520
 *       400:
 *         description: Invalid order state or COD limit exceeded
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
 *                   example: "Order cannot be delivered. Current status: ASSIGNED"
 *       403:
 *         description: Rider not assigned to this order
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
 *                   example: "You are not assigned to this order"
 *       404:
 *         description: Order or rider not found
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
 *                   example: "Order not found"
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Server error
 */

router.patch("/:orderId/deliver",riderAuthMiddleWare,deliverOrder);



/*
==============================================
=                                            = 
             cancelOrder         
=                                            =
==============================================
*/


/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Report issue / Cancel order
 *     description: >
 *       This API is used by the assigned rider to report an issue and cancel the order
 *       when the customer is not responding or any delivery issue occurs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: ORD-DR-2864
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reasonCode
 *             properties:
 *               reasonCode:
 *                 type: string
 *                 description: Cancellation reason code
 *                 example: "CUSTOMER_NOT_RESPONDING"
 *               reasonText:
 *                 type: string
 *                 description: Additional remarks from rider
 *                 example: "Customer phone switched off for 2 minutes"
 *     responses:
 *       200:
 *         description: Order cancelled successfully
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
 *                   example: "Order cancelled successfully"
 *                 cancelIssue:
 *                   type: object
 *                   properties:
 *                     cancelledBy:
 *                       type: string
 *                       example: "RIDER"
 *                     reasonCode:
 *                       type: string
 *                       example: "CUSTOMER_NOT_RESPONDING"
 *                     reasonText:
 *                       type: string
 *                       example: "Customer phone switched off for 2 minutes"
 *       400:
 *         description: Invalid order state
 *       403:
 *         description: Rider not assigned to this order
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Server error
 */

router.patch("/:orderId/cancel",riderAuthMiddleWare,cancelOrder);




/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get full order activity of logged-in rider
 *     description: >
 *       Returns all orders related to the authenticated rider, including:
 *       <ul>
 *         <li>Orders where the rider was notified</li>
 *         <li>Accepted orders</li>
 *         <li>Rejected orders</li>
 *         <li>Timed out orders</li>
 *         <li>Assigned orders</li>
 *         <li>Delivered orders</li>
 *         <li>Cancelled orders</li>
 *       </ul>
 *       Each order is returned with full order details.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full rider order activity fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalNotified:
 *                       type: number
 *                       example: 12
 *                     accepted:
 *                       type: number
 *                       example: 6
 *                     rejected:
 *                       type: number
 *                       example: 3
 *                     timedOut:
 *                       type: number
 *                       example: 2
 *                     delivered:
 *                       type: number
 *                       example: 5
 *                     cancelled:
 *                       type: number
 *                       example: 1
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Full order document
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Server error
 */

router.get("/stats",riderAuthMiddleWare,getOrdersByRider);


/**
 * @swagger
 * /api/orders/delivered:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get delivered orders of logged-in rider
 *     description: >
 *       Returns all orders with status <b>DELIVERED</b> for the authenticated rider.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delivered orders fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 5
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Full order document
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Server error
 */


router.get("/:riderId/delivered",riderAuthMiddleWare,getDeliveredOrdersByRider);




/**
 * @swagger
 * /api/orders/cancelled:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get cancelled orders of logged-in rider
 *     description: >
 *       Returns all orders with status <b>CANCELLED</b> for the authenticated rider.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cancelled orders fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 2
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Full order document
 *       401:
 *         description: Unauthorized (rider not authenticated)
 *       500:
 *         description: Server error
 */

router.get("/cancelled",riderAuthMiddleWare,getCancelledOrdersByRider);



/**
 * @swagger
 * /api/orders/rider/surge-status:
 *   get:
 *     summary: Get rider surge eligibility status
 *     description: Checks whether the logged-in rider is eligible for surge pricing based on rider pincode and payout configuration.
 *     tags:
 *       - Orders
 * 
 *     security:
 *       - bearerAuth: []
 * 
 *     responses:
 *       200:
 *         description: Surge status fetched successfully
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
 *                   properties:
 * 
 *                     surgeActive:
 *                       type: boolean
 *                       example: true
 * 
 *                     multiplier:
 *                       type: number
 *                       example: 1.5
 * 
 *                     surgeAmount:
 *                       type: number
 *                       example: 50
 * 
 *       400:
 *         description: Rider pincode not found
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
 *                   example: Rider pincode not found
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
 *                   example: Failed to fetch surge status
 */
router.get("/rider/surge-status", riderAuthMiddleWare, getSurgeStatus);


module.exports = router;
