const crypto = require("crypto");
const {notifyRider} = require("../webSocket");
const axios = require("axios");
const { getLatLng } = require("../services/geocodeService");
const prisma=require('../config/prisma');
const getWeather=require('../utils/weather');
const {
  processOrderIncentive
} = require(
  "../services/incentiveService"
);
//  Dummy transaction generator
function generateTxn() {
  return "TXN_" + crypto.randomBytes(6).toString("hex");
}
function generateOrderId(){

      return "ORD-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}


//  helper function
function convertToKg(weight, unit) {
  switch (unit) {
    case "g":
      return weight / 1000;

    case "kg":
      return weight;

    case "ml":
      return weight / 1000;

    case "l":
      return weight;

    default:
      throw new Error("Invalid weight unit");
  }
}

async function createOrder(req, res) {
  try {
    const body = req.body;

    const pickupGeo = await getLatLng(
      body.pickupAddress.addressLine
    );

    const deliveryGeo = await getLatLng(
      body.deliveryAddress.addressLine
    );

    let paymentData = {
      mode: body.payment.mode,
      status: "PENDING"
    };

    if (body.payment.mode === "ONLINE") {
      paymentData.transactionId = generateTxn();
      paymentData.status = "SUCCESS";
    }

    if (body.payment.mode === "COD") {
      paymentData.codPaymentType =
        body.payment.codPaymentType || "CASH";
    }

    let itemTotal = 0;
    let totalWeight = 0;

    for (const item of body.items) {
      itemTotal += item.total;

      
      if (!item.weightPerUnit || !item.weightUnit) {
        return res.status(400).json({
          success: false,
          message: "weightPerUnit and weightUnit are required"
        });
      }

      const weightInKg = convertToKg(
        item.weightPerUnit,
        item.weightUnit.toLowerCase()
      );

      totalWeight += weightInKg * item.quantity;
    }

    
    if (totalWeight > 20) {
      return res.status(400).json({
        success: false,
        message: `Order weight ${totalWeight.toFixed(
          2
        )}kg exceeds 20kg limit for biker`
      });
    }

    const deliveryFee = 40;
    const tax = 5;
    const platformCommission = 10;

    const totalAmount =
      itemTotal + deliveryFee + tax;


    const order = await prisma.order.create({
      data: {
        orderId: generateOrderId(),
        vendorShopName: body.vendorShopName,

        
        totalWeight: totalWeight,

        OrderItems: {
          create: body.items.map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            weightPerUnit: item.weightPerUnit,
            weightUnit: item.weightUnit.toLowerCase() 
          }))
        },

        
        OrderPickupAddress: {
          create: {
            name: body.pickupAddress.name,
            addressLine: body.pickupAddress.addressLine,
            contactNumber:
              body.pickupAddress.contactNumber,
            latitude: pickupGeo.lat,
            longitude: pickupGeo.lng,
            pincode: body.pickupAddress.pincode 
          }
        },

        OrderDeliveryAddress: {
          create: {
            name: body.deliveryAddress.name,
            addressLine:
              body.deliveryAddress.addressLine,
            contactNumber:
              body.deliveryAddress.contactNumber,
            latitude: deliveryGeo.lat,
            longitude: deliveryGeo.lng
          }
        },

        OrderPricing: {
          create: {
            itemTotal,
            deliveryFee,
            tax,
            platformCommission,
            totalAmount
          }
        },

        OrderPayment: {
          create: paymentData
        },
        OrderCod:
          body.payment.mode === "COD"
            ? {
                create: {
                  amount: totalAmount,
                  pendingAmount: totalAmount
                }
              }
            : undefined
      },

      include: {
        OrderPayment: true
      }
    });

  
    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order.orderId,
      totalWeight: totalWeight.toFixed(2) + " kg",
      payment: order.OrderPayment
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}


async function getRouteInfo(pickupAddress, deliveryAddress) {
  if (!pickupAddress || !deliveryAddress) {
    throw new Error("Pickup or Delivery address missing");
  }

  const pickupLat = pickupAddress.latitude;
  const pickupLng = pickupAddress.longitude;

  const dropLat = deliveryAddress.latitude;
  const dropLng = deliveryAddress.longitude;

  if (
    pickupLat == null || pickupLng == null ||
    dropLat == null || dropLng == null
  ) {
    throw new Error("Invalid pickup/delivery coordinates");
  }

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/directions/json",
    {
      params: {
        origin: `${pickupLat},${pickupLng}`,
        destination: `${dropLat},${dropLng}`,
        key: process.env.GOOGLE_KEY
      }
    }
  );

  if (!response.data.routes?.length) {
    throw new Error("No route found between pickup and drop");
  }

  const leg = response.data.routes[0].legs[0];

  return {
    distanceKm: Number((leg.distance.value / 1000).toFixed(2)),
    etaMinutes: Math.ceil(leg.duration.value / 60)
  };
}

async function confirmOrder(req, res) {

  try {

    const { orderId } = req.params;
 
    /* =========================================================

       FETCH ORDER

    ========================================================= */
 
    const order = await prisma.order.findFirst({

      where: { orderId },

      include: {

        OrderPickupAddress: true,

        OrderDeliveryAddress: true

      }

    });
 
    if (!order) {

      return res.status(404).json({

        success: false,

        message: "Order not found"

      });

    }
 
    if (order.orderStatus !== "CREATED") {

      return res.status(400).json({

        success: false,

        message: "Order already processed"

      });

    }
 
    const now = new Date();
 
    const pickupPincode =

      order.OrderPickupAddress?.pincode;
 
    if (!pickupPincode) {

      return res.status(400).json({

        success: false,

        message: "Pickup pincode missing"

      });

    }
 
    /* =========================================================

       RIDER FILTER

    ========================================================= */
 
    const riders = await prisma.rider.findMany({

      where: {

        isFullyRegistered: true,
 
        orderState: "READY",
 
        isOnline: true,
 
       slotBookings: {

          some: {

            status: "BOOKED",
 
            slotEndAt: {

              gte: now

            }

          }

        },
         
        location: {

          is: {

            pincode: pickupPincode

          }

        }

      },
 
      take: 10,
 
      select: {

        id: true,
 
        isFullyRegistered: true,
 
        location: {

          select: {

            pincode: true

          }

        }

      }

    });
 
    console.log(

      "✅ Eligible Riders:",

      riders.map(r => ({

        id: r.id,

        isFullyRegistered: r.isFullyRegistered,

        pincode: r.location?.pincode

      }))

    );
 
    if (!riders.length) {

      return res.status(400).json({

        success: false,

        message: "No riders available"

      });

    }
 
    /* =========================================================

       ROUTE INFO

    ========================================================= */
 
    const routeInfo = await getRouteInfo(

      order.OrderPickupAddress,

      order.OrderDeliveryAddress

    );
 
    /* =========================================================

       PAYOUT CONFIG

    ========================================================= */
 
    const payoutConfig =

      await prisma.payoutConfig.findFirst({

        where: {

          isActive: true,
 
          OR: [

            {

              pincodeIds: {

                has: pickupPincode

              }

            },
 
            {

              pincodeIds: {

                isEmpty: true

              }

            }

          ]

        },
 
        orderBy: {

          version: "desc"

        }

      });
 
    if (!payoutConfig) {

      return res.status(400).json({

        success: false,

        message: "No payout config found"

      });

    }
 
    const {

      basePay,

      perKmRate,

      surgeConfig,

      peakConfig,

      weatherConfig

    } = payoutConfig;
 
    /* =========================================================

       DISTANCE PAY

    ========================================================= */
 
    let distancePay = 0;
 
    if (routeInfo.distanceKm > 4) {

      distancePay =

        (routeInfo.distanceKm - 4) * perKmRate;

    }
 
    /* =========================================================

       SURGE PAY

    ========================================================= */
 
    let surgePay = 0;
 
    if (surgeConfig?.enabled) {

      const multiplier =

        surgeConfig.multiplier || 1;
 
      surgePay =

        (basePay + distancePay) *

        (multiplier - 1);

    }
 
    /* =========================================================

       PEAK BONUS

    ========================================================= */
 
    let peakBonus = 0;
 
    if (peakConfig?.enabled) {

      const currentHour =

        new Date().getHours();
 
      const start = parseInt(

        peakConfig.start.split(":")[0]

      );
 
      const end = parseInt(

        peakConfig.end.split(":")[0]

      );
 
      if (

        currentHour >= start &&

        currentHour <= end

      ) {

        peakBonus = peakConfig.bonus || 0;

      }

    }
 
    /* =========================================================

       WEATHER BONUS

    ========================================================= */
 
    let weatherBonus = 0;
 
    const weather = await getWeather(

      order.OrderPickupAddress.latitude,

      order.OrderPickupAddress.longitude

    );
 
    const isRaining = weather.isRaining;
 
    if (

      isRaining &&

      weatherConfig?.RAIN

    ) {

      weatherBonus = weatherConfig.RAIN;

    }
 
    /* =========================================================

       TOTAL EARNING

    ========================================================= */
 
    const totalEarning =

      basePay +

      distancePay +

      surgePay +

      peakBonus +

      weatherBonus;
 
    /* =========================================================

       TRANSACTION

    ========================================================= */
 
    await prisma.$transaction(async (tx) => {

      /* -------------------------

         UPDATE ORDER

      ------------------------- */
 
      await tx.order.update({

        where: {

          id: order.id

        },
 
        data: {

          orderStatus: "CONFIRMED"

        }

      });
 
      /* -------------------------

         CREATE ORDER ALLOCATION

      ------------------------- */
 
      await tx.orderAllocation.create({

        data: {

          orderId: order.orderId,
 
          expiresAt: new Date(

            Date.now() + 120000

          ),
 
          OrderCandidateRiders: {

            create: riders.map(r => ({

              riderId: r.id,

              status: "PENDING",

              notifiedAt: new Date()

            }))

          }

        }

      });
 
      /* -------------------------

         CREATE EARNING

      ------------------------- */
 
      await tx.orderRiderEarning.create({

        data: {

          orderId: order.orderId,
 
          basePay,
 
          distancePay,
 
          surgePay,
 
          tips: 0,
 
          totalEarning,
 
          credited: false

        }

      });
 
      /* -------------------------

         CREATE TRACKING

      ------------------------- */
 
      await tx.orderTracking.create({

        data: {

          orderId: order.orderId,
 
          distanceInKm:

            routeInfo.distanceKm,
 
          durationInMin:

            routeInfo.etaMinutes

        }

      });

    });
 
    /* =========================================================

       NOTIFY RIDERS

    ========================================================= */
 
    for (const rider of riders) {

      await notifyRider(rider.id, {

        type: "ORDER_POPUP",
 
        orderId: order.orderId,
 
        vendorShopName:

          order.vendorShopName,
 
        pickupLocation:

          order.OrderPickupAddress,
 
        dropLocation:

          order.OrderDeliveryAddress,
 
        distanceKm:

          routeInfo.distanceKm,
 
        etaMinutes:

          routeInfo.etaMinutes,
 
        estimatedEarning:

          totalEarning

      });

    }
 
    /* =========================================================

       RESPONSE

    ========================================================= */
 
    return res.status(200).json({

      success: true,
 
      message:

        "Order confirmed and sent to riders",
 
      estimatedEarning: totalEarning,
 
      notifiedRiders: riders.length

    });
 
  } catch (err) {

    console.error(

      "❌ Confirm order error:",

      err

    );
 
    return res.status(500).json({

      success: false,
 
      message:

        err.message ||

        "Failed to confirm order"

    });

  }

}
 




async function acceptOrder(req, res) {
  try {
    const { orderId } = req.params;
    const riderId = req.rider.id;


    const order = await prisma.order.findUnique({
      where: { orderId },
      include: { OrderAllocation: true }
    });

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (!order.OrderAllocation)
      return res.status(400).json({ success: false, message: "Order not allocated" });


    //////////////////////////////////////////////////////
// FETCH RIDER
//////////////////////////////////////////////////////

const rider = await prisma.rider.findUnique({
  where: {
    id: riderId
  },

  select: {
    isOnline: true,
    orderState: true,
    isFullyRegistered: true
  }
});

if (!rider) {
  return res.status(404).json({
    success: false,
    message: "Rider not found"
  });
}

//////////////////////////////////////////////////////
// VALIDATIONS
//////////////////////////////////////////////////////

    if (!rider.isFullyRegistered) {
      return res.status(400).json({
        success: false,
        message: "Rider not registered"
      });
    }

    if (!rider.isOnline) {
      return res.status(400).json({
        success: false,
        message: "Rider is offline"
      });
    }

    if (rider.orderState !== "READY") {
      return res.status(400).json({
        success: false,
        message: "Rider is busy"
      });
    }



    //////////////////////////////////////////////////////
// SLOT VALIDATION
//////////////////////////////////////////////////////

    const now = new Date();

    const activeSlotBooking =
      await prisma.slotBooking.findFirst({

        where: {

          riderId,

          status: "BOOKED",

          slotStartAt: {
            lte: now
          },

          slotEndAt: {
            gte: now
          }
        }
      });

    if (!activeSlotBooking) {

      return res.status(400).json({
        success: false,
        message: "No active slot booked"
      });
    }
            

    await prisma.$transaction(async (tx) => {

      // Atomic update (prevents race condition)
      const updated = await tx.order.updateMany({
        where: {
          orderId: orderId,
          orderStatus: "CONFIRMED"
        },
        data: {
          riderId: riderId,
          orderStatus: "ASSIGNED"
        }
      });

      if (updated.count === 0) {
        throw new Error("Order already accepted");
      }

      // Accept this rider
      await tx.orderCandidateRider.updateMany({
        where: {
          allocationId: order.OrderAllocation.id,
          riderId: riderId,
          status: "PENDING"
        },
        data: { status: "ACCEPTED" }
      });

      // Reject others
      await tx.orderCandidateRider.updateMany({
        where: {
          allocationId: order.OrderAllocation.id,
          riderId: { not: riderId },
          status: "PENDING"
        },
        data: { status: "REJECTED" }
      });

      // Mark allocation assigned
      await tx.orderAllocation.update({
        where: { id: order.OrderAllocation.id },
        data: { assignedAt: new Date() }
      });

      // Make rider busy
      await tx.rider.update({
        where: { id: riderId },
        data: {
          orderState: "BUSY",
          currentOrderId: order.id
        }
      });
    });


    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const acceptCount = await prisma.orderCandidateRider.count({
      where: {
        riderId,
        status: "ACCEPTED",
        updatedAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });


    await prisma.riderPerformance.upsert({
      where: {
        riderId_date: {
          riderId,
          date: todayStart
        }
      },
      update: {
        totalOrdersAccepted: acceptCount
      },
      create: {
        riderId,
        date: todayStart,

        // required fields
        periodStart: todayStart,
        periodEnd: todayEnd,

        totalOrdersAccepted: acceptCount,
        totalOrdersRejected: 0,
        totalOrdersAssigned: 0,

        acceptanceRate: 0,
        performanceScore: 0.7
      }
    });


    return res.json({
      success: true,
      message: "Order accepted successfully",
      todayAcceptedOrders: acceptCount
    });

  } catch (err) {
    console.error("Accept order error:", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to accept order"
    });
  }
}
 



async function rejectOrder(req, res) {
  try {
    const { orderId } = req.params;
    const riderId = req.rider.id;
 
    
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: { OrderAllocation: true }
    });
 
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
 
    if (!order.OrderAllocation) {
      return res.status(400).json({
        success: false,
        message: "Order not allocated"
      });
    }
 
    const result = await prisma.orderCandidateRider.updateMany({
      where: {
        allocationId: order.OrderAllocation.id,
        riderId,
        status: "PENDING"
      },
      data: {
        status: "REJECTED"
      }
    });
 
    if (result.count === 0) {
      return res.status(409).json({
        success: false,
        message: "Order already handled or not assigned"
      });
    }
 
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
 
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
 
    const rejectCount = await prisma.orderCandidateRider.count({
      where: {
        riderId,
        status: "REJECTED",
        updatedAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });
 
   
    let warning = null;
 
    if (rejectCount >= 5 && rejectCount < 10) {
      warning = "Too many rejections today. Please accept orders.";
    }
 
    if (rejectCount >= 10) {
      //  mark rider inactive
      await prisma.rider.update({
        where: { id: riderId },
        data: {
          isOnline: false
        }
      });
 
      warning = " You are temporarily blocked due to high rejections";
    }
 

    return res.json({
      success: true,
      message: "Order rejected successfully",
      todayRejectCount: rejectCount,
      warning
    });
 
  } catch (err) {
    console.error("Reject order error:", err);
 
    return res.status(500).json({
      success: false,
      message: "Failed to reject order"
    });
  }
}
 
async function getOrderDetails(req, res) {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { orderId },
      include: {
        OrderItems: true,
        OrderPickupAddress: true,
        OrderDeliveryAddress: true,
        OrderPricing: true,
        OrderRiderEarning: {
          include: {
            OrderSurges: true
          }
        },
        OrderPayment: true,
        OrderAllocation: {
          include: {
            OrderCandidateRiders: true
          }
        },
        OrderSettlement: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    
    const formattedOrder = {
      _id: order.id, 
      orderId: order.orderId,
      vendorShopName: order.vendorShopName,
      orderStatus: order.orderStatus,
      totalWeight: order.totalWeight,
      weightUnit: "kg",

      items: order.OrderItems.map(item => ({
        _id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        weightPerUnit: item.weightPerUnit,
        weightUnit: item.weightUnit
      })),

      pickupAddress: order.OrderPickupAddress
        ? {
            name: order.OrderPickupAddress.name,
            addressLine: order.OrderPickupAddress.addressLine,
            contactNumber: order.OrderPickupAddress.contactNumber,
            lat: order.OrderPickupAddress.latitude,
            lng: order.OrderPickupAddress.longitude
          }
        : null,

      deliveryAddress: order.OrderDeliveryAddress
        ? {
            name: order.OrderDeliveryAddress.name,
            addressLine: order.OrderDeliveryAddress.addressLine,
            contactNumber: order.OrderDeliveryAddress.contactNumber,
            lat: order.OrderDeliveryAddress.latitude,
            lng: order.OrderDeliveryAddress.longitude
          }
        : null,

      pricing: order.OrderPricing
        ? {
            itemTotal: order.OrderPricing.itemTotal,
            deliveryFee: order.OrderPricing.deliveryFee,
            tax: order.OrderPricing.tax,
            platformCommission: order.OrderPricing.platformCommission,
            totalAmount: order.OrderPricing.totalAmount
          }
        : null,

      riderEarning: order.OrderRiderEarning
        ? {
            basePay: order.OrderRiderEarning.basePay,
            distancePay: order.OrderRiderEarning.distancePay,
            surgePay: order.OrderRiderEarning.surgePay,
            tips: order.OrderRiderEarning.tips,
            totalEarning: order.OrderRiderEarning.totalEarning,
            credited: order.OrderRiderEarning.credited
          }
        : null,

      payment: order.OrderPayment
        ? {
            mode: order.OrderPayment.mode,
            status: order.OrderPayment.status
          }
        : null,

      allocation: order.OrderAllocation
        ? {
            expiresAt: order.OrderAllocation.expiresAt,
            candidateRiders:
              order.OrderAllocation.OrderCandidateRiders.map(r => ({
                _id: r.id,
                riderId: r.riderId,
                status: r.status,
                notifiedAt: r.notifiedAt
              }))
          }
        : null,

      settlement: order.OrderSettlement
        ? {
            riderEarningAdded: order.OrderSettlement.riderEarningAdded,
            vendorSettled: order.OrderSettlement.vendorSettled
          }
        : null,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      riderId: order.riderId
    };

    return res.status(200).json({
      success: true,
      message: "Order details fetched successfully",
      orderStatus: order.orderStatus,
      order: formattedOrder
    });

  } catch (err) {
    console.error("Get order details error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details"
    });
  }
}


async function pickupOrder(req, res) {
  try {
    const { orderId } = req.params;
    const riderId  = req.rider.id;

    const order = await prisma.Order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

 
    if (order.orderStatus !== "ASSIGNED") {
      return res.status(400).json({
        success: false,
        message: "Order is not ready for pickup"
      });
    }


    if (!order.riderId || order.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order"
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderId },
        data: {
          orderStatus: "PICKED_UP"
        }
      });

      await tx.orderTracking.updateMany({
        where: { orderId: order.id },
        data: {
          durationInMin: null
        }
      });
    });

    notifyRider(riderId.toString(), {
      type: "ORDER_PICKED_UP",
      orderId: order.orderId
    });

    return res.status(200).json({
      success: true,
      message: "Order picked up successfully",
      orderStatus: "PICKED_UP"
    });

  } catch (err) {
    console.error("Pickup order error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to pickup order"
    });
  }
}


const getDateKey = (date = new Date()) =>

  date.toISOString().split("T")[0]; // YYYY-MM-DD
 
const getWeekKey = (date = new Date()) => {

  const d = new Date(date);

  const year = d.getFullYear();

  const week = Math.ceil(

    ((d - new Date(year, 0, 1)) / 86400000 +

      new Date(year, 0, 1).getDay() +

      1) / 7

  );

  return `${year}-W${week}`;

};

const isPeakSlot = (date) => {

  const hour = new Date(date).getHours();

  return hour >= 6 && hour < 10; 

};
 
async function deliverOrder(req, res) {
  try {
    const { orderId } = req.params;
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "riderId required",
      });
    }

    // Fetch order outside transaction
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        OrderRiderEarning: true,
        OrderPayment: true,
        OrderPricing: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "PICKED_UP") {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${order.orderStatus}`,
      });
    }

    if (order.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: "Not assigned to this order",
      });
    }

    //Ensure payment record exists BEFORE transaction
    if (!order.OrderPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment record not found for this order",
      });
    }

    const earning = Number(order.OrderRiderEarning?.totalEarning || 0);
    let codCollected = 0;

    await prisma.$transaction(
      async (tx) => {

        //  Ensure wallet exists
        await tx.riderWallet.upsert({
          where: { riderId },
          update: {},
          create: { riderId },
        });

        //  Credit earning safely
        if (!order.OrderRiderEarning?.credited && earning > 0) {
          await tx.riderWallet.update({
            where: { riderId },
            data: {
              balance: { increment: earning },
              totalEarned: { increment: earning },
            },
          });

          await tx.orderRiderEarning.update({
            where: { orderId },
            data: {
              credited: true,
              creditedAt: new Date(),
            },
          });

          await tx.orderSettlement.upsert({
            where: { orderId },
            update: { riderEarningAdded: true },
            create: {
              orderId,
              riderEarningAdded: true,
            },
          });
        }

        //  Handle COD
        if (order.OrderPayment.mode === "COD") {
          codCollected = Number(order.OrderPricing?.totalAmount || 0);

          const cash = await tx.riderCashInHand.upsert({
            where: { riderId },
            update: {},
            create: { riderId },
          });

          if (cash.balance + codCollected > cash.limit) {
            throw "COD_LIMIT_EXCEEDED";
          }

          await tx.riderCashInHand.update({
            where: { riderId },
            data: {
              balance: { increment: codCollected },
              lastUpdatedAt: new Date(),
            },
          });
        }


    // Get rider active slot booking
      const now = new Date();

      const slotBooking = await tx.slotBooking.findFirst({
        where: {
          riderId,
          status: "BOOKED",

          slotStartAt: {
            lte: now,
          },

          slotEndAt: {
            gte: now,
          },
        },
      });


        await tx.orderSlotInfo.upsert({
        where: { orderId },

        update: {
          slotBookingId: slotBooking?.id,
          slotId: slotBooking?.slotId,
          isSlotBooked: true,
          isPeakSlot: slotBooking?.isPeakSlot,
          slotStartAt: slotBooking?.slotStartAt,
          slotEndAt: slotBooking?.slotEndAt,
        },

        create: {
          orderId,
          slotBookingId: slotBooking?.id,
          slotId: slotBooking?.slotId,
          isSlotBooked: true,
          isPeakSlot: slotBooking?.isPeakSlot,
          slotStartAt: slotBooking?.slotStartAt,
          slotEndAt: slotBooking?.slotEndAt,
        },
      });



        //  Update order
        await tx.order.update({
          where: { orderId },
          data: { orderStatus: "DELIVERED" },
        });

        //  SAFER: use updateMany instead of update
        await tx.orderPayment.updateMany({
          where: { orderId },
          data: { status: "SUCCESS" },
        });

        //     await tx.orderSlotInfo.upsert({
        //   where: { orderId },
        //   update: {
        //     isSlotBooked: false,
        //   },
        //   create: {
        //     orderId,
        //     isSlotBooked: false,
        //   },
        // });

        

        //  Reset rider state
        await tx.rider.update({
          where: { id: riderId },
          data: {
            orderState: "READY",
            currentOrderId: null,
          },
        });
      },
      { timeout: 10000 }
    );
await processOrderIncentive({
  riderId,
  orderId
});
    return res.status(200).json({
      success: true,
      message: "Order delivered successfully",
      orderId,
      orderStatus: "DELIVERED",
      earningCredited: earning,
      codCollected,
    });

  } catch (err) {

    if (err === "COD_LIMIT_EXCEEDED") {
      return res.status(400).json({
        success: false,
        message: "COD limit exceeded",
      });
    }

    console.error("Deliver order error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to deliver order",
    });
  }
}
 

 
async function cancelOrder(req, res) {
  try {
    const { orderId } = req.params;
    const riderId = req.rider.id;
    const { reasonCode, reasonText } = req.body;

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "riderId is required"
      });
    }

   
    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

   
    if (["DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled"
      });
    }

    if (!order.riderId) {
      return res.status(400).json({
        success: false,
        message: "Order has no assigned rider"
      });
    }

    if (order.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order"
      });
    }

   const result = await prisma.$transaction(async (tx) => {
  const updatedOrder = await tx.order.update({
    where: { orderId },
    data: { orderStatus: "CANCELLED" }
  });

  await tx.rider.updateMany({
    where: {
      id: riderId,
      currentOrderId: order.id
    },
    data: {
      orderState: "READY",
      currentOrderId: null
    }
  });

  await tx.orderCancelIssue.upsert({
    where: { orderId:  order.orderId }, 
    update: {
      cancelledBy: "RIDER",
      reasonCode,
      reasonText
    },
    create: {
      orderId:  order.orderId, 
      cancelledBy: "RIDER",
      reasonCode,
      reasonText
    }
  });

  return updatedOrder;
});


    notifyRider(riderId, {
      type: "ORDER_CANCELLED",
      orderId,
      reason: reasonCode
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      orderStatus: result.orderStatus,

      cancelIssue: {
        cancelledBy: "RIDER",
        reasonCode,
        reasonText
      }
    });

  } catch (err) {
    console.error("Cancel order error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to cancel order"
    });
  }
}

async function getOrdersByRider(req, res) {
  try {
    const riderId  = req.rider._id;

    const riderObjectId = new mongoose.Types.ObjectId(riderId);

    const orders = await Order.aggregate([
      {
        $match: {
          $or: [
            { riderId: riderObjectId },
            { "allocation.candidateRiders.riderId": riderObjectId }
          ]
        }
      },

      // Extract this rider's candidate object
      {
        $addFields: {
          riderCandidate: {
            $first: {
              $filter: {
                input: "$allocation.candidateRiders",
                as: "cr",
                cond: { $eq: ["$$cr.riderId", riderObjectId] }
              }
            }
          }
        }
      },

      // Decide rider relation with order
      {
        $addFields: {
          riderRelation: {
            $cond: [
              { $eq: ["$riderId", riderObjectId] },
              "ACCEPTED",
              {
                $cond: [
                  { $eq: ["$riderCandidate.status", "REJECTED"] },
                  "REJECTED",
                  {
                    $cond: [
                      { $eq: ["$riderCandidate.status", "TIMEOUT"] },
                      "TIMEOUT",
                      "NOTIFIED"
                    ]
                  }
                ]
              }
            ]
          }
        }
      },

      // Sorting latest first
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      riderId,
      totalOrders: orders.length,
      orders
    });

  } catch (err) {
    console.error("Full rider order activity error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rider order activity"
    });
  }
}


async function getDeliveredOrdersByRider(req, res) {
  try {
    const  riderId  = req.rider._id;

    const orders = await Order.find({
      riderId,
      orderStatus: "DELIVERED"
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      riderId,
      totalDeliveredOrders: orders.length,
      orders
    });

  } catch (err) {
    console.error("Delivered orders error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivered orders"
    });
  }
}


async function getCancelledOrdersByRider(req, res) {
  try {
    const riderId = req.rider._id;

    const orders = await Order.find({
      riderId,
      orderStatus: "CANCELLED"
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      riderId,
      totalCancelledOrders: orders.length,
      orders
    });

  } catch (err) {
    console.error("Cancelled orders error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cancelled orders"
    });
  }
}

// async function getSurgeStatus(req, res)  {

//   try {

//     //////////////////////////////////////////////////////
//     // RIDER ID FROM TOKEN
//     //////////////////////////////////////////////////////

//     const riderId = req.rider.id;

//     //////////////////////////////////////////////////////
//     // FETCH RIDER
//     //////////////////////////////////////////////////////

//     const rider = await prisma.rider.findUnique({
//       where: {
//         id: riderId
//       },

//       include: {
//         location: true
//       }
//     });

//     if (!rider) {
//       return res.status(404).json({
//         success: false,
//         message: "Rider not found"
//       });
//     }

//     const pincode = rider.location?.pincode;

//     const lat = rider.location?.latitude;

//     const lng = rider.location?.longitude;

//     console.log(rider);
// console.log(rider.location);

//     if (!pincode || !lat || !lng) {
//       return res.status(400).json({
//         success: false,
//         message: "Rider location incomplete"
//       });
//     }

//     //////////////////////////////////////////////////////
//     // FETCH PAYOUT CONFIG
//     //////////////////////////////////////////////////////

//     const payoutConfig =
//       await prisma.payoutConfig.findFirst({

//         where: {
//           isActive: true,

//           pincodeIds: {
//             has: pincode
//           }
//         },

//         orderBy: {
//           version: "desc"
//         }
//       });

//     if (!payoutConfig) {

//       return res.status(200).json({
//         success: true,

//         data: {
//           surgeActive: false,
//           surgeAmount: 0
//         }
//       });
//     }

//     //////////////////////////////////////////////////////
//     // WEATHER CHECK
//     //////////////////////////////////////////////////////

//     const weather =
//       await getWeather(lat, lng);

//     //////////////////////////////////////////////////////
//     // SURGE LOGIC
//     //////////////////////////////////////////////////////

//     let surgeActive = false;

//     let multiplier = 1;

//     if (
//       weather.isRaining &&
//       payoutConfig.surgeConfig?.enabled
//     ) {

//       surgeActive = true;

//       multiplier =
//         payoutConfig.surgeConfig.multiplier || 1.5;
//     }

//     //////////////////////////////////////////////////////
//     // SURGE AMOUNT
//     //////////////////////////////////////////////////////

//     let surgeAmount = 0;

//     if (surgeActive) {

//       surgeAmount =
//         payoutConfig.basePay *
//         (multiplier - 1);
//     }

//     //////////////////////////////////////////////////////
//     // RESPONSE
//     //////////////////////////////////////////////////////

//     return res.status(200).json({
//       success: true,

//       data: {

//         riderId,

//         pincode,

//         weather: {
//           isRaining: weather.isRaining
//         },

//         surgeActive,

//         multiplier,

//         surgeAmount
//       }
//     });

//   } catch (err) {

//     console.error(err);

//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

async function getSurgeStatus(req, res) {

  try {

    //////////////////////////////////////////////////////
    // RIDER FROM TOKEN
    //////////////////////////////////////////////////////

    const riderId = req.rider.id;

    //////////////////////////////////////////////////////
    // FETCH RIDER
    //////////////////////////////////////////////////////

    const rider = await prisma.rider.findUnique({
      where: {
        id: riderId
      },

      include: {
        location: true
      }
    });

    if (!rider || !rider.location?.pincode) {
      return res.status(400).json({
        success: false,
        message: "Rider pincode not found"
      });
    }

    const pincode = rider.location.pincode;

    //////////////////////////////////////////////////////
    // FETCH PAYOUT CONFIG
    //////////////////////////////////////////////////////

    const payoutConfig =
      await prisma.payoutConfig.findFirst({

        where: {
          isActive: true,

          pincodeIds: {
            has: pincode
          }
        },

        orderBy: {
          version: "desc"
        }
      });

    //////////////////////////////////////////////////////
    // NO CONFIG
    //////////////////////////////////////////////////////

    if (!payoutConfig) {

      return res.status(200).json({
        success: true,

        data: {
          surgeActive: false,
          surgeAmount: 0
        }
      });
    }

    //////////////////////////////////////////////////////
    // SURGE LOGIC
    //////////////////////////////////////////////////////

    const surgeConfig =
      payoutConfig.surgeConfig || {};

    const surgeActive =
      surgeConfig.enabled === true;

    //////////////////////////////////////////////////////
    // SURGE AMOUNT
    //////////////////////////////////////////////////////

    let surgeAmount = 0;

    if (surgeActive) {

      const multiplier =
        surgeConfig.multiplier || 1;

      surgeAmount =
        payoutConfig.basePay *
        (multiplier - 1);
    }

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////

    return res.status(200).json({
      success: true,

      data: {

      

        surgeActive,

        multiplier:
          surgeConfig.multiplier || 1,

        surgeAmount
      }
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


module.exports = { createOrder,confirmOrder,acceptOrder,rejectOrder,getOrderDetails,pickupOrder,deliverOrder, cancelOrder,getOrdersByRider,getDeliveredOrdersByRider,getCancelledOrdersByRider,getSurgeStatus};
 
 