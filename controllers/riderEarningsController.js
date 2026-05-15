const prisma = require('../config/prisma');

const { getISOWeekRange, getCurrentISOWeek } = require("../helpers/getWeekNumber");

exports.new_getEarningsSummary = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const current = getCurrentISOWeek();
    const { start: weekStart, end: weekEnd } =
      getISOWeekRange(current.week, current.year);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const orders = await prisma.order.findMany({
      where: {
        riderId: riderId,
        orderStatus: "DELIVERED",
        updatedAt: {
          gte: monthStart,
          lte: todayEnd
        }
      },
      include: {
        OrderRiderEarning: true
      }
    });

    let todayOrders = 0;
    let todayTotal = 0;
    let todayBase = 0;
    let todayIncentives = 0;
    let todayTips = 0;

    let weekOrders = 0;
    let weekBase = 0;
    let weekIncentives = 0;
    let weekTips = 0;
    let weekTotal = 0;

    let monthOrders = 0;
    let monthBase = 0;
    let monthIncentives = 0;
    let monthTips = 0;
    let monthTotal = 0;

    orders.forEach(order => {
      const deliveredAt = new Date(order.updatedAt);
      const earning = order.OrderRiderEarning || {};

      const totalEarning = earning.totalEarning || 0;
      const basePay = earning.basePay || 0;
      const incentive = earning.surgePay || 0;
      const tips = earning.tips || 0;

      //Today
      if (deliveredAt >= todayStart && deliveredAt <= todayEnd) {
        todayOrders += 1;
        todayTotal += totalEarning;
        todayBase += basePay;
        todayIncentives += incentive;
        todayTips += tips;
      }

      // ---- THIS WEEK ----
      if (deliveredAt >= weekStart && deliveredAt <= weekEnd) {
        weekOrders += 1;
        weekBase += basePay;
        weekIncentives += incentive;
        weekTips += tips;
        weekTotal += totalEarning;
      }

      //MONTH 
      monthOrders += 1;
      monthBase += basePay;
      monthIncentives += incentive;
      monthTips += tips;
      monthTotal += totalEarning;
    });

    res.json({
      today: {
        orders: todayOrders,
        baseEarnings: todayBase,
        incentives: todayIncentives,
        tips: todayTips,
        total: todayTotal
      },
      week: {
        orders: weekOrders,
        baseEarnings: weekBase,
        incentives: weekIncentives,
        tips: weekTips,
        total: weekTotal
      },
      month: {
        orders: monthOrders,
        baseEarnings: monthBase,
        incentives: monthIncentives,
        tips: monthTips,
        total: monthTotal
      }
    });

  } catch (err) {
    console.error("Earnings summary error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



// Bar chart (Mon–Sun)
exports.new_getWeeklyChart = async (req, res) => {
  try {
    const riderId = req.rider.id; //Prisma id

    const rider = await prisma.rider.findUnique({
      where: {
        id: riderId
      },
      select: {
        riderType: true
      }
    });

    const riderType = rider?.riderType;

    
    const current = getCurrentISOWeek();
    const { start, end } = getISOWeekRange(current.week, current.year);

   
    const orders = await prisma.order.findMany({
      where: {
        riderId,
        orderStatus: "DELIVERED",
        updatedAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        OrderRiderEarning: true
      }
    });

    // ---- GROUP BY DAY ----
    const dayMap = {};

    orders.forEach(order => {
      const key = new Date(order.updatedAt).toDateString();

      if (!dayMap[key]) {
        dayMap[key] = {
          orders: 0,
          amount: 0
        };
      }

      dayMap[key].orders += 1;
      dayMap[key].amount += order.OrderRiderEarning?.totalEarning || 0;
    });

    // ---- BUILD WEEK (MON → SUN) ----
    const week = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);

      const key = day.toDateString();
      const data = dayMap[key] || { orders: 0, amount: 0 };

      week.push({
        day: day.toLocaleDateString("en-IN", { weekday: "short" }),
        amount: data.amount,
        orders: data.orders
      });
    }

    if (riderType === "COMPANY_EMPLOYEE") {
      return res.json({
        riderType,
        week: week.map(day => ({
          day: day.day,
          orders: day.orders
        }))
      });
    }

   res.json({
    riderType,
    week
    });

    // res.json({ week });

  } catch (err) {
    console.error("Weekly chart error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.new_getDailyEarnings = async (req, res) => {
  try {
    console.log("Hitted new daily earnings controller");

    const riderId = req.rider.id; 

    let year, month, day;

    if (req.query.date) {
      const parts = req.query.date.split("-").map(Number);

      if (parts.length !== 3) {
        return res.status(400).json({
          message: "Invalid date format. Use YYYY-MM-DD"
        });
      }

      [year, month, day] = parts;
    } else {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth() + 1;
      day = today.getDate();
    }

    const baseDate = new Date(year, month - 1, day);

    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        riderId: riderId,
        orderStatus: "DELIVERED",
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        OrderRiderEarning: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    console.log("orders : " ,orders.length)

    let totalEarnings = 0;
    let baseEarnings = 0;
    let incentives = 0;
    const items = [];

    orders.forEach(order => {
      const earning = order.OrderRiderEarning;

      const amount = earning?.totalEarning || 0;

      const baseAmount =
        earning?.basePay || 0;

      const incentiveAmount =
        earning?.surgePay || 0;

      totalEarnings += amount;

      baseEarnings += baseAmount;

      incentives += incentiveAmount;

      // DELIVERY ENTRY
      items.push({
        type: "DELIVERY",
        orderId: order.orderId,
        amount,
        time: order.updatedAt
      });

      // BONUS ENTRY
      // if (surgePay > 0) {
      //   items.push({
      //     type: "BONUS",
      //     title: "Peak Hour Bonus",
      //     amount: surgePay,
      //     time: order.updatedAt
      //   });
      // }
    });

    const responseDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    res.json({
      date: responseDate,
      totalEarnings,
      baseEarnings,
      incentives,
      items,
      count: items.length
    });

  } catch (err) {
    console.error("Delivery earnings error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};

exports.new_getDeliveryEarnings = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { orderId } = req.params;
    const order = await prisma.order.findFirst({
      where: {
        riderId: riderId,
        orderId: orderId
      },
      include: {
        OrderRiderEarning: true
      }
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const riderEarning = order.OrderRiderEarning || {};

    res.json({
      orderId: order.orderId,
      store: order.vendorShopName,

      totalEarnings: riderEarning.totalEarning || 0,

      breakup: {
        basePay: riderEarning.basePay || 0,
        distancePay: riderEarning.distancePay || 0,
        surgePay: riderEarning.surgePay || 0,
        tips: riderEarning.tips || 0
      },

      status: order.orderStatus,
      time: order.updatedAt
    });

  } catch (err) {
    console.error("Delivery earnings error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


function toISTDate(date) {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

exports.new_getWeeklyEarnings = async (req, res) => {
  try {
    const riderId = req.rider.id || req.rider._id;
  
    let { week, year } = req.query;

    if (!week || !year) {
      const current = getCurrentISOWeek();
      week = current.week;
      year = current.year;
    }

    const { start, end } = getISOWeekRange(Number(week), Number(year));

    const orders = await prisma.order.findMany({
      where: {
        riderId: String(riderId),
        orderStatus: "DELIVERED",
        updatedAt: { gte: start, lte: end }
      },
      select: {
        orderId: true,
        updatedAt: true,
        OrderRiderEarning: {
          select: { totalEarning: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const ordersByDay = {};

    orders.forEach(order => {
      const istDate = toISTDate(order.updatedAt);
      const dayKey = istDate.toDateString();

      if (!ordersByDay[dayKey]) {
        ordersByDay[dayKey] = {
          ordersCount: 0,
          amount: 0,
          orders: []
        };
      }

      const earning = order.OrderRiderEarning?.totalEarning || 0;

      ordersByDay[dayKey].ordersCount += 1;
      ordersByDay[dayKey].amount += earning;

      ordersByDay[dayKey].orders.push({
        orderId: order.orderId,
        amount: earning,
        time: order.updatedAt
      });
    });

    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = toISTDate(new Date(start));
      day.setDate(day.getDate() + i);

      const key = day.toDateString();
      const data = ordersByDay[key] || {
        ordersCount: 0,
        amount: 0,
        orders: []
      };

      days.push({
        day: day.toLocaleDateString("en-IN", { weekday: "long" }),
        date: day.toLocaleDateString("en-CA"),
        orders: data.ordersCount,
        amount: data.amount,
        deliveries: data.orders
      });
    }

    // if (riderType === "COMPANY_EMPLOYEE") {
    //   return res.json({
    //     riderType,
    //     week: Number(week),
    //     year: Number(year),
    //     weekRange: `${toISTDate(start).toDateString()} - ${toISTDate(end).toDateString()}`,

    //     totalOrders: days.reduce((sum, d) => sum + d.orders, 0),

    //     days: days.map(day => ({
    //       day: day.day,
    //       date: day.date,
    //       orders: day.orders,
    //       deliveries: day.deliveries.map(d => ({
    //         orderId: d.orderId,
    //         time: d.time
    //       }))
    //     }))
    //   });
    // }

    const total = days.reduce((sum, d) => sum + d.amount, 0);

    const lastWeekStart = new Date(start);
    lastWeekStart.setDate(start.getDate() - 7);

    const lastWeekEnd = new Date(end);
    lastWeekEnd.setDate(end.getDate() - 7);

    const lastWeekOrders = await prisma.order.findMany({
      where: {
        riderId: String(riderId),
        orderStatus: "DELIVERED",
        updatedAt: { gte: lastWeekStart, lte: lastWeekEnd }
      },
      select: {
        OrderRiderEarning: {
          select: { totalEarning: true }
        }
      }
    });

    const lastWeekTotal = lastWeekOrders.reduce(
      (sum, o) => sum + (o.OrderRiderEarning?.totalEarning || 0),
      0
    );

    const changePercent =
      lastWeekTotal > 0
        ? Math.round(((total - lastWeekTotal) / lastWeekTotal) * 100)
        : 0;


    res.json({
      week: Number(week),
      year: Number(year),
      weekRange: `${toISTDate(start).toDateString()} - ${toISTDate(end).toDateString()}`,
      total,
      changePercent,
      days
    });

  } catch (err) {
    console.error("Weekly earnings error:", err);
    res.status(500).json({ message: err.message });
  }
};


exports.getEarningsHistory = async (req, res) => {
  try {
    const riderId = req.rider._id;

    const {
      from,
      to,
      page = 1,
      limit = 10
    } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: "from and to dates are required (YYYY-MM-DD)"
      });
    }

    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      RiderDailyEarnings.find({
        riderId,
        date: { $gte: startDate, $lte: endDate }
      })
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),

      RiderDailyEarnings.countDocuments({
        riderId,
        date: { $gte: startDate, $lte: endDate }
      })
    ]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      totalRecords: total,
      data: records.map(d => ({
        date: d.date,
        orders: d.ordersCount,
        totalEarnings: d.totalEarnings,
        payoutStatus: d.payoutStatus
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};


