const jwt = require("jsonwebtoken");
const prisma=require('../config/prisma');

exports.handoverCodCash = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { amount } = req.body;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid deposit amount",
      });
    }

    /* FETCH DELIVERED COD ORDERS (NOT FULLY DEPOSITED) */
    const codOrders = await prisma.order.findMany({
      where: {
        riderId,
        orderStatus: "DELIVERED",
        OrderPayment: {
          mode: "COD",
        },
        OrderCod: {
          status: {
            in: ["PENDING", "PARTIAL_DEPOSITED"],
          },
        },
      },
      include: {
        OrderCod: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });


    if (!codOrders.length) {
      return res.status(400).json({
        success: false,
        message: "No pending COD amount to deposit",
      });
    }

    /*  CALCULATE TOTAL PENDING */
    let totalPending = 0;

    for (const order of codOrders) {
      const codAmount = order.OrderCod?.pendingAmount || 0;
      const depositedAmount = order.OrderCod?.depositedAmount || 0;

      totalPending += codAmount - depositedAmount;
      console.log("----> totalPending : ",totalPending)
    }

    if (totalPending <= 0) {
      return res.status(400).json({
        success: false,
        message: "No pending COD amount to deposit",
      });
    }

    /*  NO PARTIAL DEPOSIT ALLOWED */
    if (Number(amount) !== totalPending) {
      return res.status(400).json({
        success: false,
        message: `Partial deposit not allowed. Deposit full amount ₹${totalPending}`,
      });
    }

    /*  UPDATE ALL ORDERS TO DEPOSITED */
    await prisma.$transaction(
  codOrders.map((order) =>
    prisma.orderCod.update({
      where: { id: order.OrderCod.id },   
      data: {
        status: "DEPOSITED",
        depositedAmount: order.OrderCod.pendingAmount,
        depositedAt: new Date(),
      },
    })
  )
);

    return res.status(200).json({
      success: true,
      message: `COD amount ₹${amount} handed over successfully`,
    });

  } catch (error) {
    console.error(" handoverCodCash error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.withdrawFromWallet = async (req, res) => {
  try {
    //  Safely resolve riderId
    let riderId = req.rider?._id;

    if (!riderId && req.headers.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      riderId = decoded.riderId || decoded.id || decoded._id;
    }

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const { amount } = req.body;

    // 1Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount"
      });
    }

    //  Fetch rider wallet
    const rider = await Rider.findById(riderId)
      .select("wallet")
      .lean();

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    const availableBalance = rider.wallet?.balance || 0;

    //  Business rules
    if (amount < 500) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is ₹500"
      });
    }

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance"
      });
    }

    //  Calculate new balance
    const updatedBalance = availableBalance - amount;

    //  Generate transaction ID
    const transactionId = `WD-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    //  Save transaction
    await WalletTransaction.create({
      riderId,
      transactionId,
      type: "WITHDRAW",
      amount,
      balanceAfterTransaction: updatedBalance,
      status: "SUCCESS"
    });

    // Update rider wallet
    await Rider.updateOne(
      { _id: riderId },
      { $set: { "wallet.balance": updatedBalance } }
    );

    //  Response
    return res.status(200).json({
      success: true,
      message: "Withdrawal successful",
      data: {
        transactionId,
        withdrawnAmount: amount,
        availableBalance: updatedBalance,
        currency: "INR"
      }
    });

  } catch (error) {
    console.error("WITHDRAW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to withdraw amount"
    });
  }
};
