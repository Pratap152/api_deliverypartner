const prisma = require("../config/prisma");

exports.submitRiderRating = async (req, res) => {
  try {
    const riderIdFromToken = req.rider.id; 

    const { orderId, rating, review } = req.body;

    //  Validate rating
    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 0 and 5"
      });
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Invalid orderId"
      });
    }

    //  Status checks
    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order is cancelled, rating not allowed"
      });
    }

    if (order.orderStatus !== "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "You can rate only after delivery"
      });
    }

    // Ensure rider matches
    if (order.riderId !== riderIdFromToken) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to rate this order"
      });
    }

    //  Duplicate check
    const existingRating = await prisma.riderRating.findFirst({
      where: { orderId }
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "Rating already submitted for this order"
      });
    }

    // Save rating
    const ratingData = await prisma.riderRating.create({
      data: {
        orderId,
        riderId: riderIdFromToken,
        rating,
        review
      }
    });

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      data: ratingData
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



exports.getRiderRatings = async (req, res) => {
  try {
    const riderId = req.rider.id; 
    const ratings = await prisma.riderRating.findMany({
      where: { riderId },
      orderBy: { createdAt: "desc" },
    });

    let sum = 0;

    ratings.forEach((r) => {
      sum += r.rating;
    });

    const averageRating =
      ratings.length === 0 ? 0 : sum / ratings.length;

    return res.json({
      success: true,
      riderId,
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings: ratings.length,
      ratings,
    });
  } catch (err) {
      console.error(" REAL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




exports.getRiderWeeklyStats = async (req, res) => {
  try {
    const riderId = req.rider.id;

    // exact last 7 days
    const endDate = new Date();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // orders
    const orders = await prisma.order.findMany({
      where: {
        riderId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        orderStatus: true,
      },
    });

    // allocations
    const allocations = await prisma.orderAllocation.findMany({
      where: {
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
        Order: {
          riderId,
        },
      },
      include: {
        Order: {
          select: {
            orderStatus: true,
          },
        },
      },
    });

    const totalOrders = orders.length;

    // delivered
    const deliveredOrders = orders.filter(
      (o) => o.orderStatus === "DELIVERED"
    ).length;

    // total allocations assigned
    const assignedCount = allocations.length;

    // accepted allocations
    const acceptedCount = allocations.filter(
      (a) =>
        a.Order?.orderStatus === "ASSIGNED" ||
        a.Order?.orderStatus === "PICKED_UP" ||
        a.Order?.orderStatus === "DELIVERED"
    ).length;

    const acceptanceRate =
      assignedCount > 0
        ? (acceptedCount / assignedCount) * 100
        : 0;

    // ratings
    const ratings = await prisma.riderRating.findMany({
      where: {
        riderId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        rating: true,
      },
    });

    const totalRatings = ratings.length;

    const averageRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        riderId,
        period: "last_7_days",
        totalOrders,
        deliveredOrders,
        assignedCount,
        acceptedCount,
        acceptanceRate: Number(acceptanceRate.toFixed(2)),
        averageRating: Number(averageRating.toFixed(2)),
        totalRatings,
      },
    });
  } catch (error) {
    console.error("Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};