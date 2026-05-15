const prisma = require("../config/prisma");

// If rider city/pincode is missing, don't block program fetching.
// If rider city/pincode exists, match global programs OR matching location programs.
const buildProgramLocationFilter = ({ riderCityId, riderPincodeId }) => {
  if (!riderCityId && !riderPincodeId) {
    return {};
  }

  const cityFilter = [
    {
      cityId: {
        isEmpty: true
      }
    }
  ];

  const pincodeFilter = [
    {
      pincodeIds: {
        isEmpty: true
      }
    }
  ];

  if (riderCityId) {
    cityFilter.push({
      cityId: {
        has: riderCityId
      }
    });
  }

  if (riderPincodeId) {
    pincodeFilter.push({
      pincodeIds: {
        has: riderPincodeId
      }
    });
  }

  return {
    AND: [
      {
        OR: cityFilter
      },
      {
        OR: pincodeFilter
      }
    ]
  };
};

const getTargetDetails = (program, completedOrders = 0) => {
  let targetOrders = 0;
  let rewardAmount = 0;

  if (!program) {
    return {
      targetOrders,
      rewardAmount,
      completedOrders,
      remainingOrders: 0,
      targetCompleted: false
    };
  }

  // FIXED_TARGET
  if (program.ruleType === "FIXED_TARGET") {
    const target = program.targets?.[0];

    targetOrders = Number(target?.targetOrders || 0);
    rewardAmount = Number(target?.rewardAmount || 0);
  }

  // TASK
// TASK
if (program.ruleType === "TASK") {
  const groupedTasks = {};

  for (const task of program.tasks || []) {
    const dayNumber = Number(task.dayNumber || 0);

    if (!groupedTasks[dayNumber]) {
      groupedTasks[dayNumber] = [];
    }

    groupedTasks[dayNumber].push(task);
  }

  let totalOrders = 0;
  let totalReward = 0;

  for (const dayTasks of Object.values(groupedTasks)) {
    const firstTask = dayTasks[0];

    // SLAB
    if (firstTask.taskRuleType === "SLAB") {
      const slabs = [...dayTasks].sort(
        (a, b) =>
          Number(a.maxOrders || 0) -
          Number(b.maxOrders || 0)
      );

      const lastSlab = slabs[slabs.length - 1];

      totalOrders += Number(
        lastSlab?.maxOrders || 0
      );

      totalReward += Number(
        lastSlab?.rewardAmount || 0
      );
    }

    // FIXED_TARGET
    if (firstTask.taskRuleType === "FIXED_TARGET") {
      totalOrders += Number(
        firstTask?.targetOrders ||
        firstTask?.minOrders ||
        0
      );

      totalReward += Number(
        firstTask?.rewardAmount ||
        firstTask?.fixedReward ||
        0
      );
    }

    // PER_ORDER
    if (program.ruleType === "PER_ORDER") {
  const target = program.targets?.[0];

  targetOrders = Number(
    target?.targetOrders ||
    target?.ordersCount ||
    1
  );

  rewardAmount = Number(
    target?.rewardAmount ||
    target?.amount ||
    target?.earningAmount ||
    0
  );
}

    // HYBRID
    if (firstTask.taskRuleType === "HYBRID") {
      totalOrders += Number(
        firstTask?.minOrders || 0
      );

      totalReward += Number(
        firstTask?.rewardAmount || 0
      );
    }
  }

  targetOrders = totalOrders;
  rewardAmount = totalReward;
}  // PER_ORDER

if (program.ruleType === "PER_ORDER") {
    const target = program.targets?.[0];

    targetOrders = Number(
      target?.targetOrders ||
      target?.maxOrders ||
      0
    );

    rewardAmount = Number(
      target?.rewardAmount ||
      target?.maxEarning ||
      0
    );
  } // SLAB
  if (program.ruleType === "SLAB") {
    const slabs = [...(program.slabs || [])].sort(
      (a, b) => Number(a.maxValue || 0) - Number(b.maxValue || 0)
    );

    const nextSlab = slabs.find(
      (slab) => completedOrders < Number(slab.maxValue || 0)
    );

    const selectedSlab = nextSlab || slabs[slabs.length - 1];

    if (selectedSlab) {
      targetOrders = Number(selectedSlab.maxValue || 0);
      rewardAmount = Number(selectedSlab.rewardAmount || 0);
    }
  }

  const remainingOrders = Math.max(targetOrders - completedOrders, 0);

  return {
    targetOrders,
    rewardAmount,
    completedOrders,
    remainingOrders,
    targetCompleted: targetOrders > 0 && completedOrders >= targetOrders
  };
};

const getRiderHomeBanners = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const now = new Date();

    const rider = await prisma.rider.findUnique({
      where: {
        id: riderId
      },
      include: {
        bankDetails: true,
        kitAddress: true,
        profile: true
      }
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    const riderCityId =
      rider.cityId ||
      rider.profile?.cityId ||
      rider.profile?.city ||
      null;

    const riderPincodeId =
      rider.pincodeId ||
      rider.profile?.pincodeId ||
      rider.profile?.pincode ||
      null;

    const locationFilter = buildProgramLocationFilter({
      riderCityId,
      riderPincodeId
    });

    
    // BANK
    
    const bankAdded =
      !!rider.bankDetails?.accountNumber &&
      !!rider.bankDetails?.ifscCode;

    const bankVerified =
      rider.bankDetails?.bankVerificationStatus === "VERIFIED";

    let bankStatus = "PENDING";
    let bankMessage = "Please add your bank details to receive payouts.";

    if (bankAdded && !bankVerified) {
      bankStatus = "UNDER_REVIEW";
      bankMessage = "Bank details are under verification.";
    }

    if (bankAdded && bankVerified) {
      bankStatus = "COMPLETED";
      bankMessage = "Bank details verified successfully.";
    }

    // true means bank is completed/verified
    const bank = bankVerified;

    
    // KIT

    const kitRequest = await prisma.assetRequest.findFirst({
      where: {
        riderId
      },
      include: {
        Shipment: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const shipmentStatus = kitRequest?.Shipment?.deliveryStatus || null;

    const kitDelivered =
      rider.kitAddress?.onboardingKitStatus === true ||
      kitRequest?.status === "COMPLETED" ||
      shipmentStatus === "DELIVERED";

    let kitStatus = "NOT_REQUESTED";
    let kitMessage = "Please select your joining kit.";

    if (kitRequest?.status === "PENDING") {
      kitStatus = "REQUESTED";
      kitMessage = "Your joining kit request is submitted.";
    }

    if (kitRequest?.status === "APPROVED") {
      kitStatus = "APPROVED";
      kitMessage = "Your joining kit request is approved.";
    }

    if (shipmentStatus === "SHIPPED") {
      kitStatus = "SHIPPED";
      kitMessage = "Your joining kit has been shipped.";
    }

    if (shipmentStatus === "DELIVERED" || kitRequest?.status === "COMPLETED") {
      kitStatus = "DELIVERED";
      kitMessage = "Your joining kit has been delivered.";
    }

    // true means kit is delivered
    const kit = kitDelivered;

    
    // JOINING BONUS
    
    const joiningBonusProgram = await prisma.program.findFirst({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: {
          lte: now
        },
        validTill: {
          gte: now
        },
        ...locationFilter
      },
      include: {
        targets: true,
        tasks: true,
        slabs: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    let joiningBonus = false;
    let joiningBonusStatus = "NOT_AVAILABLE";
    let joiningBonusMessage = "No joining bonus available.";
    let joiningBonusOrdersCompleted = 0;
    let joiningBonusTargetOrders = 0;
    let joiningBonusRemainingOrders = 0;
    let joiningBonusRewardAmount = 0;

    if (joiningBonusProgram) {
      const joiningBonusPayout = await prisma.programPayout.findFirst({
        where: {
          riderId,
          programId: joiningBonusProgram.id,
          triggerType: "PROGRAM_COMPLETION"
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      const joiningBonusCompleted = !!joiningBonusPayout;

      const startDate =
        rider.createdAt && rider.createdAt > joiningBonusProgram.validFrom
          ? rider.createdAt
          : joiningBonusProgram.validFrom;

      joiningBonusOrdersCompleted = await prisma.order.count({
        where: {
          riderId,
          orderStatus: "DELIVERED",
          createdAt: {
            gte: startDate,
            lte: joiningBonusProgram.validTill
          }
        }
      });

const joiningTarget = getTargetDetails(
  joiningBonusProgram,
  joiningBonusOrdersCompleted
);

joiningBonusTargetOrders = joiningTarget.targetOrders;
joiningBonusRemainingOrders = joiningTarget.remainingOrders;
joiningBonusRewardAmount = joiningTarget.rewardAmount;

// true means joining bonus program is available
joiningBonus = true;

const trackingLabelMap = {
  DAILY: "today",
  WEEKLY: "this week",
  MONTHLY: "this month"
};

const trackingLabel =
  trackingLabelMap[joiningBonusProgram.trackingType] || "this period";

if (joiningBonusCompleted) {
  joiningBonusStatus = "COMPLETED";

  joiningBonusMessage =
    `You have successfully earned ₹${joiningBonusRewardAmount} joining bonus.`;

} else if (joiningTarget.targetCompleted) {
  joiningBonusStatus = "TARGET_COMPLETED";

  joiningBonusMessage =
    `Target completed. You are eligible to earn ₹${joiningBonusRewardAmount}.`;

} else {
  joiningBonusStatus = "ACTIVE";

  joiningBonusMessage =
    `Complete ${joiningBonusRemainingOrders} more orders ${trackingLabel} to get ₹${joiningBonusRewardAmount} joining bonus.`;
}  }

    
    // REFER AND EARN

    const referralProgram = await prisma.program.findFirst({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: {
          lte: now
        },
        validTill: {
          gte: now
        },
        ...locationFilter
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const referAndEarn = !!referralProgram;

    const referAndEarnStatus = referAndEarn
      ? "ACTIVE"
      : "NOT_AVAILABLE";

    const referAndEarnMessage = referAndEarn
      ? "Refer riders and earn rewards."
      : "Refer and earn is not available for your location.";

    
    // DAILY INCENTIVE
    
    const dailyIncentiveProgram = await prisma.program.findFirst({
      where: {
        programType: "INCENTIVE",
        trackingType: "DAILY",
        isActive: true,
        validFrom: {
          lte: now
        },
        validTill: {
          gte: now
        },
        ...locationFilter
      },
      include: {
        targets: true,
        tasks: true,
        slabs: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    let dailyIncentive = false;
    let dailyIncentiveStatus = "NOT_AVAILABLE";
    let dailyIncentiveMessage = "No daily incentive available today.";
    let dailyIncentiveOrdersCompleted = 0;
    let dailyIncentiveTargetOrders = 0;
    let dailyIncentiveRemainingOrders = 0;
    let dailyIncentiveRewardAmount = 0;

    if (dailyIncentiveProgram) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      dailyIncentiveOrdersCompleted = await prisma.order.count({
        where: {
          riderId,
          orderStatus: "DELIVERED",
          createdAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      });

      const dailyTarget = getTargetDetails(
        dailyIncentiveProgram,
        dailyIncentiveOrdersCompleted
      );

      dailyIncentiveTargetOrders = dailyTarget.targetOrders;
      dailyIncentiveRemainingOrders = dailyTarget.remainingOrders;
      dailyIncentiveRewardAmount = dailyTarget.rewardAmount;

      // true means daily incentive program is available
      dailyIncentive = true;

      if (dailyTarget.targetCompleted) {
        dailyIncentiveStatus = "TARGET_COMPLETED";
        dailyIncentiveMessage = `Target completed. You are eligible to earn ₹${dailyIncentiveRewardAmount} reward.`;
      } else {
        dailyIncentiveStatus = "ACTIVE";
        dailyIncentiveMessage = `Complete ${dailyIncentiveRemainingOrders} more orders to earn ₹${dailyIncentiveRewardAmount} reward.`;
      }
    }

return res.status(200).json({
  success: true,
  message: "Home banners fetched successfully",
  data: {
    bank: {
      labelName: "Add Bank Details",
      isAvailable: true,
      isCompleted: bank,
      status: bankStatus,
      message: bankMessage
    },

    kit: {
      labelName: "Joining Kit",
      isAvailable: true,
      isCompleted: kit,
      status: kitStatus,
      message: kitMessage
    },

    joiningBonus: {
      labelName: "Joining Bonus",
      isAvailable: joiningBonus,
      isCompleted: joiningBonusStatus === "COMPLETED",
      status: joiningBonusStatus,
      message: joiningBonusMessage,
      ordersCompleted: joiningBonusOrdersCompleted,
      targetOrders: joiningBonusTargetOrders,
      remainingOrders: joiningBonusRemainingOrders,
      rewardAmount: joiningBonusRewardAmount
    },

    referAndEarn: {
      labelName: "Refer and Earn",
      isAvailable: referAndEarn,
      isCompleted: false,
      status: referAndEarnStatus,
      message: referAndEarnMessage
    },

    dailyIncentive: {
      labelName: "Daily Incentives",
      isAvailable: dailyIncentive,
      isCompleted: dailyIncentiveStatus === "TARGET_COMPLETED",
      status: dailyIncentiveStatus,
      message: dailyIncentiveMessage,
      ordersCompleted: dailyIncentiveOrdersCompleted,
      targetOrders: dailyIncentiveTargetOrders,
      remainingOrders: dailyIncentiveRemainingOrders,
      rewardAmount: dailyIncentiveRewardAmount
    }
  }
});
  } catch (error) {
    console.error("Get Rider Home Banners Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  getRiderHomeBanners
};