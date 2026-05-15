const prisma = require("../config/prisma");
 function getISTDayRange() {

  const now = new Date();

  const istNow = new Date(
    now.getTime() + (5.5 * 60 * 60 * 1000)
  );

  const start = new Date(Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
    -5,
    -30,
    0,
    0
  ));

  const end = new Date(Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + 1,
    -5,
    -30,
    0,
    0
  ));

  return { start, end };
}
const getDailyIncentive = async (req, res) => {
  try {
const riderId =
  req.rider?.id || req.rider?.riderId;
    if (!riderId) {
      return res.status(400).json({
        message: "Rider ID missing in token",
      });
    }
 
const { start, end } = getISTDayRange();
// GET RIDER LOCATION
 
const riderLocation =
  await prisma.riderLocation.findUnique({
    where: { riderId }
  });
 
if (!riderLocation) {
  return res.json({
    programId: null,
    type: "DAILY",
    ordersCompleted: 0,
    rewardEarned: 0,
    status: "NO_ACTIVE_PROGRAM",
  });
}
 
const riderPincode =
  riderLocation.pincode
    ? String(riderLocation.pincode).trim()
    : null;
 
const riderCityId =
  riderLocation.cityId || null;
 
const now = new Date();
 
let program = null;
 
// PINCODE FIRST
 
if (riderPincode) {
  program = await prisma.program.findFirst({
    where: {
      programType: "DAILY_TARGET",
      trackingType: "DAILY",
      isActive: true,
      validFrom: { lte: now },
      validTill: { gte: now },
      pincodeIds: {
        has: riderPincode
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
 
// FALLBACK CITY
 
if (!program && riderCityId) {
  program = await prisma.program.findFirst({
    where: {
      programType: "DAILY_TARGET",
      trackingType: "DAILY",
      isActive: true,
      validFrom: { lte: now },
      validTill: { gte: now },
      cityId: {
        has: riderCityId
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
 
    if (!program) {
      return res.json({
        programId: null,
        type: "DAILY",
        ordersCompleted: 0,
        rewardEarned: 0,
        status: "NO_ACTIVE_PROGRAM",
      });
    }
 
    //  Find today's progress
    let progress = await prisma.programProgress.findFirst({
      where: {
        riderId,
        programId: program.id,
date: {
  gte: start,
  lt: end,
},
      },
    });
    let status = "NOT_STARTED";
 
   if (!progress) {
  return res.json({
    programId: program.id,
    type: "DAILY",
    ordersCompleted: 0,
    rewardEarned: 0,
    status: "NOT_STARTED",
  });
}
 
if (progress.achieved) {
  status = "ACHIEVED";
}
else if (progress.totalOrders > 0) {
  status = "IN_PROGRESS";
}
 
    return res.json({
      programId: progress.programId,
      type: "DAILY",
      ordersCompleted: progress.totalOrders,
      rewardEarned: progress.rewardAmount,
      status,
    });
 
  } catch (error) {
    console.error("ERROR:", error);
 
    return res.status(500).json({
      message: error.message,
    });
  }
};
 
const getRiderDailyPrograms = async (req, res) => {
  try {
    const riderId =
  req.rider?.id || req.rider?.riderId;
 
    // GET RIDER LOCATION
 
    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId }
    });
 
    if (!riderLocation) {
      return res.json({ success: true, data: [] });
    }
 
    // PREPARE VARIABLES
 
    const riderPincode = riderLocation.pincode
      ? String(riderLocation.pincode).trim()
      : null;
 
    const riderCityId = riderLocation.cityId || null;
 
    const now = new Date();
    /// FETCH PROGRAMS (PINCODE FIRST)
 
    let programs = [];
 
    if (riderPincode) {
      programs = await prisma.program.findMany({
        where: {
          programType: "DAILY_TARGET",
          trackingType: "DAILY",
          isActive: true,
          validFrom: { lte: now },
          validTill: { gte: now },
          pincodeIds: { has: riderPincode }
        },
        include: {
          slabs: true,
          targets: true,
          rules: true,
  tasks: true
        },
        orderBy: { createdAt: "desc" }
      });
    }
 
    // FALLBACK TO CITY
    if (!programs.length && riderCityId) {
      programs = await prisma.program.findMany({
        where: {
          programType: "DAILY_TARGET",
          trackingType: "DAILY",
          isActive: true,
          validFrom: { lte: now },
          validTill: { gte: now },
          cityId: { has: riderCityId }
        },
        include: {
          slabs: true,
          targets: true,
          rules: true,
          tasks: true
        },
        orderBy: { createdAt: "desc" }
      });
    }
 
const response = programs.map((p) => {

  let maxPayoutPerDay = p.maxPayoutPerDay;

  if (maxPayoutPerDay === null) {
    if (
      p.ruleType === "SLAB"
      && p.slabs?.length
    ) {

      maxPayoutPerDay = Math.max(
        ...p.slabs.map((s) => s.rewardAmount)
      );
    }

    else if (
      p.ruleType === "FIXED_TARGET"
      && p.targets?.[0]
    ) {

      maxPayoutPerDay =
        p.targets[0].rewardAmount;
    }

    else if (
      p.ruleType === "PER_ORDER"
    ) {

      maxPayoutPerDay =
        p.maxPayoutPerDay || 0;
    }

    else if (
      p.ruleType === "HYBRID"
      && p.targets?.[0]
    ) {

      maxPayoutPerDay =
        p.targets[0].rewardAmount;
    }

    else if (
      p.ruleType === "TASK"
      && p.tasks?.length
    ) {

      const taskRewards = p.tasks.map((t) => {

        if (t.taskRuleType === "FIXED_TARGET") {
          return t.fixedReward || 0;
        }

        if (t.taskRuleType === "HYBRID") {
          return t.rewardAmount || 0;
        }

        if (t.taskRuleType === "PER_ORDER") {
          return t.maxEarning || 0;
        }

        if (
          t.taskRuleType === "SLAB"
          && p.slabs?.length
        ) {

          return Math.max(
            ...p.slabs.map(
              (s) => s.rewardAmount
            )
          );
        }

        return 0;
      });

      maxPayoutPerDay =
        Math.max(...taskRewards);
    }
  }

  const result = {

    name: p.name,

    cityId:
      p.cityId?.[0] || null,

    dateRange: {
      startDate: p.validFrom,
      endDate: p.validTill
    },

    ruleType: p.ruleType,

    maxPayoutPerDay,

    isActive: p.isActive
  };

  if (
    p.ruleType === "SLAB"
    && p.slabs?.length
  ) {

    result.slabs = p.slabs.map((s) => ({
      minOrders: s.minValue,
      maxOrders: s.maxValue,
      rewardAmount: s.rewardAmount
    }));
  }


  if (p.ruleType === "FIXED_TARGET") {

    result.target = {
      orders:
        p.targets?.[0]?.targetOrders || null
    };

    result.reward = {
      amount:
        p.targets?.[0]?.rewardAmount || null
    };
  }


  if (p.ruleType === "PER_ORDER") {

    result.reward = {
      perOrderAmount:
        p.rules?.[0]?.perOrderAmount || 0
    };
  }


  if (p.ruleType === "HYBRID") {

    result.conditions = {

      minOrders:
        p.rules?.[0]?.minOrders || null,

      minEarnings:
        p.rules?.[0]?.minEarnings || null,

      minAcceptanceRate:
        p.minAcceptanceRate || null,

      minCompletionRate:
        p.minCompletionRate || null
    };

    result.reward = {
      amount:
        p.targets?.[0]?.rewardAmount || null
    };
  }

  // if (
  //   p.ruleType === "TASK"
  //   && p.tasks?.length
  // ) {

  //   result.tasks = p.tasks.map((t) => {

  //     const task = {

  //       dayNumber:
  //         t.dayNumber,

  //       taskRuleType:
  //         t.taskRuleType
  //     };


  //     if (
  //       t.taskRuleType === "FIXED_TARGET"
  //     ) {

  //       task.target = {
  //         orders:
  //           t.targetOrders
  //       };

  //       task.reward = {
  //         amount:
  //           t.fixedReward
  //       };
  //     }

  //     else if (
  //       t.taskRuleType === "PER_ORDER"
  //     ) {

  //       task.rewardPerOrder =
  //         t.rewardPerOrder;

  //       task.maxOrders =
  //         t.maxOrders;

  //       task.maxEarning =
  //         t.maxEarning;
  //     }


  //     else if (
  //       t.taskRuleType === "HYBRID"
  //     ) {

  //       task.conditions = {

  //         minOrders:
  //           t.minOrders,

  //         minAcceptanceRate:
  //           t.minAcceptanceRate,

  //         minEarnings:
  //           t.minEarnings
  //       };

  //       task.reward = {
  //         amount:
  //           t.rewardAmount
  //       };
  //     }

  //     else if (
  //       t.taskRuleType === "SLAB"
  //     ) {

  //       task.slabs = p.slabs
  //         .sort(
  //           (a, b) =>
  //             a.minValue - b.minValue
  //         )
  //         .map((s) => ({
  //           minOrders:
  //             s.minValue,

  //           maxOrders:
  //             s.maxValue,

  //           rewardAmount:
  //             s.rewardAmount
  //         }));
  //     }

  //     return task;
  //   });
  // }
if (
  p.ruleType === "TASK"
  && p.tasks?.length
) {

  result.slots = p.tasks.map((t) => {

    const slot = {

      slotId: t.id,

      slotName:
        t.slotName || t.name,

      slotType:
        t.slotType || "NORMAL_SLOT",

      startTime:
        t.startTime,

      endTime:
        t.endTime,

      tasks: []
    };

    const task = {
      taskRuleType:
        t.taskRuleType
    };

    if (
      t.taskRuleType === "FIXED_TARGET"
    ) {

      task.target = {
        orders:
          t.targetOrders || 0
      };

      task.reward = {
        amount:
          t.fixedReward || 0
      };
    }

    else if (
      t.taskRuleType === "PER_ORDER"
    ) {

      task.rewardPerOrder =
        t.rewardPerOrder || 0;

      task.maxOrders =
        t.maxOrders || 0;

      task.maxEarning =
        t.maxEarning || 0;
    }

    else if (
      t.taskRuleType === "HYBRID"
    ) {

      task.conditions = {

        minOrders:
          t.minOrders || 0,

        minAcceptanceRate:
          t.minAcceptanceRate || 0,

        minEarnings:
          t.minEarnings || 0
      };

      task.reward = {
        amount:
          t.rewardAmount || 0
      };
    }
    else if (
      t.taskRuleType === "SLAB"
    ) {

      task.slabs = p.slabs
        ?.filter(
          (s) => s.taskId === t.id
        )
        ?.sort(
          (a, b) =>
            a.minValue - b.minValue
        )
        ?.map((s) => ({
          minOrders:
            s.minValue,

          maxOrders:
            s.maxValue,

          rewardAmount:
            s.rewardAmount
        })) || [];
    }

    slot.tasks.push(task);

    return slot;
  });

  result.slotSummary = {

    totalSlots:
      result.slots.length,

    normalSlots:
      result.slots.filter(
        (s) =>
          s.slotType ===
          "NORMAL_SLOT"
      ).length,

    peakSlots:
      result.slots.filter(
        (s) =>
          s.slotType ===
          "PEAK_SLOT"
      ).length
  };

  // REMOVE OLD TASKS KEY
  delete result.tasks;
}
  return result;
});
    // RESPONSE
 
    return res.json({
      success: true,
      data: response
    });
 
  } catch (error) {
    console.error("Daily programs error:", error);
 
    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily programs"
    });
  }
};
 
module.exports = {
  getDailyIncentive,
  getRiderDailyPrograms,
};