const prisma=require('../config/prisma');

exports.markDelivered = async (req, res) => {
  try {

    // KEEP AS ObjectId
    const riderId = req.rider._id;
    const { orderId } = req.body;

    const order = await Order.findOne({
      orderId,
      riderId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.riderEarning?.credited === true) {
      return res.json({
        success: false,
        message: "Order already settled"
      });
    }

    // ONLINE payment safety
    if (
      order.payment?.mode === "ONLINE" &&
      order.payment?.status !== "SUCCESS"
    ) {
      return res.status(400).json({
        success: false,
        message: "Online payment not successful"
      });
    }

    //  UPDATE ORDER
  

    order.orderStatus = "DELIVERED";
    order.riderEarning.credited = true;

    await order.save();

    const earning = order.riderEarning.totalEarning || 0;
    const paymentMode = order.payment.mode;
    const codAmount = order.pricing.totalAmount || 0;

    // IST SAFE DATE
    const today = new Date().toLocaleDateString("en-CA");

    //  DAILY STATS
   

    await RiderDailyStats.findOneAndUpdate(
      { riderId, date: today },
      {
        $inc: {
          totalOrders: 1,
          totalEarnings: earning
        },
        $setOnInsert: {
          riderId,
          date: today
        }
      },
      { upsert: true }
    );

    // SLOT HISTORY


    const slotType = order.slotType || "NORMAL";

    await SlotHistory.findOneAndUpdate(
      { riderId, date: today, slotType },
      {
        $inc: {
          completedOrders: 1,
          earnings: earning
        },
        $setOnInsert: {
          riderId,
          date: today,
          slotType
        }
      },
      { upsert: true }
    );

    //  COD CASH HANDLING
   

    let cashLimitExceeded = false;

    if (paymentMode === "COD") {

      const rider = await Rider.findById(riderId);

      const currentCash =
        rider.cashInHand?.balance || 0;

      const updatedCash = currentCash + codAmount;

      const updateObj = {
        cashInHand: {
          balance: updatedCash,
          limit: 2500,
          lastUpdatedAt: new Date()
        }
      };

      if (updatedCash > 2500) {

        updateObj.deliveryStatus = {
          isActive: false,
          inactiveReason: "COD_LIMIT_EXCEEDED",
          updatedAt: new Date()
        };

        cashLimitExceeded = true;
      }

      await Rider.findByIdAndUpdate(riderId, updateObj);
    }

    res.json({
      success: true,
      message: "Order delivered successfully",
      data: {
        orderId,
        earningAdded: earning,
        codCollected: paymentMode === "COD" ? codAmount : 0,
        cashLimitExceeded
      }
    });

  } catch (err) {

    console.error("DELIVERY ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Delivery update failed"
    });
  }
};

//  DASHBOARD (GET)


exports.getDashboard = async (req, res) => {
  try {

    const riderId = req.rider._id;
    const today = new Date().toLocaleDateString("en-CA");

    const stats = await RiderDailyStats.findOne({
      riderId,
      date: today
    });

    res.json({
      success: true,
      totalOrders: stats?.totalOrders || 0,
      totalEarnings: stats?.totalEarnings || 0
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed"
    });
  }
};

// ORDERS HISTORY (GET)


exports.getOrders = async (req, res) => {
  try {

    const riderId = req.rider._id;

    const { status } = req.query;

    const filter = {
      riderId: riderId   // ObjectId match
    };

    if (status) {
      filter.orderStatus = status;
    }

    console.log("ORDERS FILTER:", filter);

    const orders = await Order.find(filter).lean();

    console.log("FOUND ORDERS:", orders.length);

    res.json({
      success: true,
      totalOrders: orders.length,
      data: orders
    });

  } catch (err) {

    console.error("ORDER FETCH ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Order history fetch failed"
    });
  }
};

// SLOT HISTORY (GET)


exports.getSlotHistory = async (req, res) => {
  try {

    const riderId = req.rider._id;

    const date =
      req.query.date || new Date().toLocaleDateString("en-CA");

    const slots = await SlotHistory.find({
      riderId,
      date
    });

    res.json({
      success: true,
      totalSlots: slots.length,
      data: slots
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: "Slot history fetch failed"
    });
  }
};



exports.getCashInHand = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        riderId,
        OrderPayment: {
          mode: "COD", 
        },
      },
      include: {
        OrderPayment: true,
        OrderPricing: true,
        OrderCod: true,
        OrderDeliveryAddress: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let pendingOrdersCount = 0;
    let pendingAmount = 0;
    let latestDeposit = 0;
    let latestDepositAt = null;

    const cashOrderHistory = [];

    for (const order of orders) {
      // SAFE TOTAL AMOUNT
      const totalAmount =
        Number(order.OrderCod?.amount) ||
        Number(order.OrderPricing?.totalAmount) ||
        0;

      const depositedAmount = Number(
        order.OrderCod?.depositedAmount || 0
      );

      // ✅ SAFE PENDING
      let pending = Number(order.OrderCod?.pendingAmount);

      if (isNaN(pending)) {
        pending = Math.max(totalAmount - depositedAmount, 0);
      }

      if (pending > 0) {
        pendingOrdersCount++;
        pendingAmount += pending;
      }

      if (
        order.OrderCod?.depositedAt &&
        (!latestDepositAt ||
          order.OrderCod.depositedAt > latestDepositAt)
      ) {
        latestDepositAt = order.OrderCod.depositedAt;
        latestDeposit = depositedAmount;
      }

      cashOrderHistory.push({
        orderId: order.orderId,
        customerName:
          order.OrderDeliveryAddress?.name || "Customer",
        totalAmount,
        depositedAmount,
        pendingAmount: pending,
        status:
          pending === 0
            ? "DEPOSITED"
            : depositedAmount > 0
            ? "PARTIAL_DEPOSITED"
            : "PENDING",
        collectedAt: order.OrderCod?.collectedAt || null,
        depositedAt: order.OrderCod?.depositedAt || null,
      });
    }

    const MAX_LIMIT = 2500;

    return res.status(200).json({
      success: true,
      data: {
        cashSummary: {
          totalCashCollected: pendingAmount,
          currency: "INR",
          toDeposit: pendingAmount,
          depositRequired: pendingAmount > 0,
          maxAllowed: MAX_LIMIT,
          canTakeNewOrders: pendingAmount <= MAX_LIMIT,
          depositMode: "FULL_ONLY",
        },
        latestDeposit,
        pendingOrdersSummary: {
          pendingOrdersCount,
          pendingAmount,
        },
        cashOrderHistory,
        rules: {
          depositWithinHours: 24,
          warningMessage:
            "Partial deposit is not allowed. Rider must deposit full pending cash. COD orders are blocked if limit exceeds ₹2500.",
        },
      },
    });
  } catch (error) {
    console.error("getCashInHand error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cash balance",
    });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const riderId = req.rider._id;

    // 1️Fetch rider info
    const rider = await Rider.findById(riderId)
      .select("wallet cashInHand bankDetails")
      .lean();

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    // Calculate pending COD from delivered orders
    const codOrders = await Order.find({
      riderId,
      "payment.mode": "COD",
      orderStatus: "DELIVERED",
      "cod.status": "PENDING"
    }).select("cod.amount").lean();

    const pendingCodAmount = codOrders.reduce(
      (sum, o) => sum + (o.cod?.amount || 0),
      0
    );

    // Determine actions
    const actions = {
      canWithdraw: rider.wallet.balance >= 500, // Minimum withdrawal threshold
      canAddMoney: true,
      bankLinked: !!(
        rider.bankDetails &&
        rider.bankDetails.addedBankAccount &&
        rider.bankDetails.verifiedAt
      )
    };

    //  Build response
    return res.status(200).json({
      success: true,
      data: {
        walletSummary: {
          availableBalance: rider.wallet.balance, // Only wallet balance
          pendingCodAmount,                       // Pending COD
          currency: "INR",
          actions
        },
        recentTransactions: [] // No transaction history table
      }
    });

  } catch (error) {
    console.error("WALLET SUMMARY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet summary"
    });
  }
};
