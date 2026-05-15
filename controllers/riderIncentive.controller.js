// controllers/riderIncentive.controller.js

const prisma = require("../config/prisma");


// =========================
// 🔥 COMMON FORMATTER
// =========================
function formatIncentive(inc, progress, extra = {}) {

  if (inc.incentiveType === "PEAK_SLOT") {
    return {
      id: inc.id,
      title: inc.title,
      type: inc.incentiveType,
      reward: inc.reward,

      slots: extra.slots || [],

      progress: {
        completedPeakSlots: extra.completedPeakSlots || 0,
        eligible: extra.completedPeakSlots >= inc.targetSlots
      }
    };
  }

  if (inc.incentiveType === "WEEKLY_TARGET") {
    return {
      id: inc.id,
      title: inc.title,
      type: inc.incentiveType,
      validFrom: inc.validFrom,
      validTill: inc.validTill,
      target: inc.target,
      reward: inc.reward,

      days: extra.days || [],

      progress: {
        totalOrders: progress?.totalOrders || 0,
        achievedReward: progress?.achievedReward || 0,
        eligible: progress?.eligible || false
      }
    };
  }

  // DAILY
  return {
    id: inc.id,
    title: inc.title,
    type: inc.incentiveType,
    validFrom: inc.validFrom,
    validTill: inc.validTill,
    target: inc.target,
    reward: inc.reward,

    progress: {
      totalOrders: progress?.totalOrders || 0,
      achievedReward: progress?.achievedReward || 0,
      eligible: progress?.eligible || false
    }
  };
}


// =========================
// 🔥 GET PEAK SLOT DATA (NO DUPLICATES)
// =========================
async function getPeakSlotData(riderId) {

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const slots = await prisma.slot.findMany({
    where: {
      isPeakSlot: true,
      slotStartAt: {
        gte: todayStart,
        lte: todayEnd
      }
    },
    include: {
      riderBookings: {
        where: { riderId },
        select: { id: true }
      }
    }
  });

  const slotMap = new Map();

  slots.forEach(slot => {

    const key = `${slot.slotStartAt.toISOString()}-${slot.startTime}-${slot.endTime}`;
    const orders = slot.riderBookings.length;

    if (!slotMap.has(key)) {
      slotMap.set(key, {
        date: slot.slotStartAt.toISOString().split("T")[0],
        startTime: slot.startTime,
        endTime: slot.endTime,
        orders: 0
      });
    }

    slotMap.get(key).orders += orders;
  });

  const finalSlots = Array.from(slotMap.values()).map(s => ({
    ...s,
    completed: s.orders > 0
  }));

  return {
    slots: finalSlots,
    completedPeakSlots: finalSlots.filter(s => s.completed).length
  };
}


// =========================
// 🔥 WEEKLY BREAKDOWN
// =========================
async function getWeeklyBreakdown(riderId, startDate, endDate) {

  const slots = await prisma.slot.findMany({
    where: {
      slotStartAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    include: {
      riderBookings: {
        where: { riderId },
        select: { id: true }
      }
    }
  });

  const dayMap = {};

  slots.forEach(slot => {

    const date = slot.slotStartAt.toISOString().split("T")[0];

    if (!dayMap[date]) {
      dayMap[date] = {
        date,
        peak: { orders: 0, slotsCompleted: 0 },
        normal: { orders: 0, slotsCompleted: 0 }
      };
    }

    const orders = slot.riderBookings.length;
    const type = slot.isPeakSlot ? "peak" : "normal";

    dayMap[date][type].orders += orders;

    if (orders > 0) {
      dayMap[date][type].slotsCompleted += 1;
    }
  });

  return Object.values(dayMap);
}


// =========================
// 🔥 FETCH ONLY ACTIVE INCENTIVES
// =========================
async function getActiveIncentives(riderId) {

  const now = new Date();

  const incentives = await prisma.incentive.findMany({
    where: {
      status: "ACTIVE",
      validFrom: { lte: now },
      validTill: { gte: now }
    }
  });

  const progressList = await prisma.riderIncentiveProgress.findMany({
    where: { riderId }
  });

  return { incentives, progressList };
}


exports.getAllIncentivesWithProgress = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const now = new Date();

    // ✅ ONLY ACTIVE incentives
    const incentives = await prisma.incentive.findMany({
      where: {
        status: "ACTIVE",
        validFrom: { lte: now },
        validTill: { gte: now }
      },
      orderBy: { validFrom: "asc" }
    });

    const progressList = await prisma.riderIncentiveProgress.findMany({
      where: { riderId }
    });

    const data = [];

    for (const inc of incentives) {
      const progress = progressList.find(p => p.incentiveId === inc.id);

      // =========================
      // 🔥 PEAK
      // =========================
      if (inc.incentiveType === "PEAK_SLOT") {
        const peakData = await getPeakSlotData(riderId);

        data.push({
          id: inc.id,
          title: inc.title,
          type: inc.incentiveType,
          reward: inc.reward,

          slots: peakData.slots,

          progress: {
            completedPeakSlots: peakData.completedPeakSlots,
            eligible: peakData.completedPeakSlots >= inc.targetSlots
          }
        });

        continue;
      }

      // =========================
      // 🔥 WEEKLY
      // =========================
      if (inc.incentiveType === "WEEKLY_TARGET") {
        const days = await getWeeklyBreakdown(
          riderId,
          inc.validFrom,
          inc.validTill
        );

        // ✅ CALCULATE TOTAL ORDERS
        const totalOrders = days.reduce((sum, d) => {
          return sum + d.peak.orders + d.normal.orders;
        }, 0);

        data.push({
          id: inc.id,
          title: inc.title,
          type: inc.incentiveType,
          validFrom: inc.validFrom,
          validTill: inc.validTill,
          target: inc.target,
          reward: inc.reward,

          days,

          progress: {
            totalOrders,
            achievedReward: progress?.achievedReward || 0,
            eligible: totalOrders >= inc.target
          }
        });

        continue;
      }

      // =========================
      // 🔥 DAILY (ONLY CURRENT)
      // =========================
      if (inc.incentiveType === "DAILY_TARGET") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // ✅ Skip old/future daily incentives
        if (inc.validFrom > todayEnd || inc.validTill < todayStart) {
          continue;
        }

        data.push({
          id: inc.id,
          title: inc.title,
          type: inc.incentiveType,
          validFrom: inc.validFrom,
          validTill: inc.validTill,
          target: inc.target,
          reward: inc.reward,

          progress: {
            totalOrders: progress?.totalOrders || 0,
            achievedReward: progress?.achievedReward || 0,
            eligible: (progress?.totalOrders || 0) >= inc.target
          }
        });
      }
    }

    return res.json({ success: true, data });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed"
    });
  }
};




// =========================
// 📅 WEEKLY
// =========================
exports.getWeeklyIncentives = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const { incentives, progressList } =
      await getIncentives(riderId, "WEEKLY_TARGET");

    const data = await Promise.all(
      incentives.map(async (inc) => {
        const progress = progressList.find(p => p.incentiveId === inc.id);

        const days = await getWeeklyBreakdown(
          riderId,
          inc.validFrom,
          inc.validTill
        );

        return formatIncentive(inc, progress, { days });
      })
    );

    res.json({ success: true, data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};


// =========================
// 🔥 PEAK
// =========================
exports.getPeakIncentives = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const { incentives } =
      await getIncentives(riderId, "PEAK_SLOT");

    const peakData = await getPeakSlotData(riderId);

    const data = incentives.map((inc) => ({
      id: inc.id,
      title: inc.title,
      type: inc.incentiveType,
      reward: inc.reward,
      targetSlots: inc.targetSlots,

      slots: peakData.slots,

      progress: {
        completedPeakSlots: peakData.completedPeakSlots,
        eligible: peakData.completedPeakSlots >= inc.targetSlots
      }
    }));

    res.json({ success: true, data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};


// =========================
// 🔎 SINGLE
// =========================
exports.getIncentiveByIdWithProgress = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { id } = req.params;

    const inc = await prisma.incentive.findUnique({
      where: { id }
    });

    if (!inc) {
      return res.status(404).json({
        success: false,
        message: "Not found"
      });
    }

    const progress = await prisma.riderIncentiveProgress.findFirst({
      where: { riderId, incentiveId: id }
    });

    // 🔥 PEAK
    if (inc.incentiveType === "PEAK_SLOT") {
      const peakData = await getPeakSlotData(riderId);

      return res.json({
        success: true,
        data: formatIncentive(inc, progress, {
          slots: peakData.slots,
          completedPeakSlots: peakData.completedPeakSlots,
          eligible: peakData.completedPeakSlots >= inc.targetSlots
        })
      });
    }

    // 🔥 WEEKLY
    if (inc.incentiveType === "WEEKLY_TARGET") {
      const days = await getWeeklyBreakdown(
        riderId,
        inc.validFrom,
        inc.validTill
      );

      return res.json({
        success: true,
        data: formatIncentive(inc, progress, { days })
      });
    }

    // 🔥 DAILY
    return res.json({
      success: true,
      data: formatIncentive(inc, progress)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};

exports.getDailyIncentives = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const incentives = await prisma.incentive.findMany({
      where: {
        incentiveType: "DAILY_TARGET",
        status: "ACTIVE",
        validFrom: { gte: todayStart },
        validTill: { lte: todayEnd }
      }
    });

    const progressList = await prisma.riderIncentiveProgress.findMany({
      where: { riderId }
    });

    let data = incentives.map((inc) => {
      const progress = progressList.find(
        (p) => p.incentiveId === inc.id
      );

      const totalOrders = progress?.totalOrders || 0;

      return {
        id: inc.id,
        title: inc.title,
        type: inc.incentiveType,
        validFrom: inc.validFrom,
        validTill: inc.validTill,
        target: inc.target || 0,
        reward: inc.reward || 0,
        progress: {
          totalOrders,
          achievedReward: progress?.achievedReward || 0,
          eligible: totalOrders >= (inc.target || 0)
        }
      };
    });

    // 🔥 DEFAULT FALLBACK IF EMPTY
    if (data.length === 0) {
      data = [
        {
          id: null,
          title: "Daily Order Bonus",
          type: "DAILY_TARGET",
          validFrom: null,
          validTill: null,
          target: 0,
          reward: 0,
          progress: {
            totalOrders: 0,
            achievedReward: 0,
            eligible: false
          }
        }
      ];
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily incentives"
    });
  }
};