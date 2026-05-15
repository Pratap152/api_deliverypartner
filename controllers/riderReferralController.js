const prisma = require("../config/prisma");

const {
  calculatePercentage,
  removeEmptyValues,
  getReferralCurrentDayNumber,
  getDayRangeFromRefereeJoinedDate,
  getTaskStatus,
  getOrderStats
} = require("../utils/referralProgressHelper");

const buildReferredRiderProgressByRule = async ({
   prisma,
  program,
  referee,
  overallStats
}) => {
  const ruleType = program.ruleType;

  
  // FIXED_TARGET
  
  if (ruleType === "FIXED_TARGET") {
    const target = program.targets?.[0];

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    const targetOrders = Number(target?.targetOrders || 0);
    const refereeRewardAmount = Number(target?.rewardAmount || 0);
    const referrerRewardAmount = Number(referrerTask?.rewardAmount || 0);

    const isCompleted =
      targetOrders > 0 &&
      overallStats.completedOrders >= targetOrders;

    return removeEmptyValues({
      ruleType: "FIXED_TARGET",

      target: {
        orders: targetOrders
      },

      progress: {
        completedOrders: overallStats.completedOrders,
        targetOrders,
        remainingOrders: Math.max(
          targetOrders - overallStats.completedOrders,
          0
        ),
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage: calculatePercentage(
          overallStats.completedOrders,
          targetOrders
        )
      },

      refereeReward: {
        configuredAmount: refereeRewardAmount,
        earnedAmount: isCompleted ? refereeRewardAmount : 0,
        eligible: isCompleted
      },

      referrerReward: {
        configuredAmount: referrerRewardAmount,
        earnedAmount: isCompleted ? referrerRewardAmount : 0,
        eligible: isCompleted
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  
  // SLAB
  
  if (ruleType === "SLAB") {
    const refereeSlabs =
      program.slabs
        ?.filter((slab) => slab.role === "REFEREE")
        .map((slab) => ({
          minOrders: Number(slab.minValue || 0),
          maxOrders: Number(slab.maxValue || 0),
          rewardAmount: Number(slab.rewardAmount || 0)
        }))
        .sort((a, b) => a.minOrders - b.minOrders) || [];

    const referrerSlabs =
      program.slabs
        ?.filter((slab) => slab.role === "REFERRER")
        .map((slab) => ({
          minOrders: Number(slab.minValue || 0),
          maxOrders: Number(slab.maxValue || 0),
          rewardAmount: Number(slab.rewardAmount || 0)
        }))
        .sort((a, b) => a.minOrders - b.minOrders) || [];

    const completedOrders = overallStats.completedOrders;

    const currentRefereeSlab = refereeSlabs.find(
      (slab) =>
        completedOrders >= slab.minOrders &&
        completedOrders <= slab.maxOrders
    );

    const currentReferrerSlab = referrerSlabs.find(
      (slab) =>
        completedOrders >= slab.minOrders &&
        completedOrders <= slab.maxOrders
    );

    const nextSlab = refereeSlabs.find(
      (slab) => completedOrders < slab.minOrders
    );

    const maxTargetOrders =
      refereeSlabs.length > 0
        ? Math.max(...refereeSlabs.map((slab) => slab.maxOrders))
        : 0;

    const isCompleted = Boolean(currentRefereeSlab);

    return removeEmptyValues({
      ruleType: "SLAB",

      slabs: refereeSlabs,

      progress: {
        completedOrders,
        currentSlabReward: Number(currentRefereeSlab?.rewardAmount || 0),
        nextTargetOrders: nextSlab?.minOrders,
        remainingOrders: nextSlab
          ? Math.max(nextSlab.minOrders - completedOrders, 0)
          : 0,
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage: calculatePercentage(
          completedOrders,
          maxTargetOrders
        )
      },

      refereeReward: {
        configuredAmount: Number(currentRefereeSlab?.rewardAmount || 0),
        earnedAmount: isCompleted
          ? Number(currentRefereeSlab?.rewardAmount || 0)
          : 0,
        eligible: isCompleted
      },

      referrerReward: {
        configuredAmount: Number(currentReferrerSlab?.rewardAmount || 0),
        earnedAmount: isCompleted
          ? Number(currentReferrerSlab?.rewardAmount || 0)
          : 0,
        eligible: isCompleted
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  
  // PER_ORDER
  
  if (ruleType === "PER_ORDER") {
    const refereeTask = program.tasks?.find(
      (task) => task.role === "REFEREE"
    );

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    const completedOrders = overallStats.completedOrders;

    const refereeRewardPerOrder = Number(refereeTask?.rewardPerOrder || 0);
    const refereeMaxOrders = Number(refereeTask?.maxOrders || completedOrders);
    const refereeMaxEarning = Number(refereeTask?.maxEarning || 0);

    const referrerRewardPerOrder = Number(referrerTask?.rewardPerOrder || 0);
    const referrerMaxOrders = Number(referrerTask?.maxOrders || completedOrders);
    const referrerMaxEarning = Number(referrerTask?.maxEarning || 0);

    const refereeEligibleOrders = Math.min(completedOrders, refereeMaxOrders);
    const referrerEligibleOrders = Math.min(completedOrders, referrerMaxOrders);

    const refereeCalculatedReward =
      refereeEligibleOrders * refereeRewardPerOrder;

    const referrerCalculatedReward =
      referrerEligibleOrders * referrerRewardPerOrder;

    const refereeEarnedAmount = refereeMaxEarning
      ? Math.min(refereeCalculatedReward, refereeMaxEarning)
      : refereeCalculatedReward;

    const referrerEarnedAmount = referrerMaxEarning
      ? Math.min(referrerCalculatedReward, referrerMaxEarning)
      : referrerCalculatedReward;

    const isCompleted = completedOrders > 0;

    return removeEmptyValues({
      ruleType: "PER_ORDER",

      progress: {
        completedOrders,
        eligibleOrders: refereeEligibleOrders,
        status: isCompleted ? "RUNNING" : "PENDING",
        isCompleted,
        progressPercentage: calculatePercentage(
          completedOrders,
          refereeMaxOrders
        )
      },

      refereeReward: {
        rewardPerOrder: refereeRewardPerOrder,
        configuredAmount: refereeMaxEarning || refereeCalculatedReward,
        earnedAmount: refereeEarnedAmount,
        eligible: refereeEarnedAmount > 0
      },

      referrerReward: {
        rewardPerOrder: referrerRewardPerOrder,
        configuredAmount: referrerMaxEarning || referrerCalculatedReward,
        earnedAmount: referrerEarnedAmount,
        eligible: referrerEarnedAmount > 0
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  
  // HYBRID
  
  if (ruleType === "HYBRID") {
    const refereeTask = program.tasks?.find(
      (task) => task.role === "REFEREE"
    );

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    const minOrders = Number(refereeTask?.minOrders || 0);
    const minEarnings = Number(refereeTask?.minEarnings || 0);
    const minAcceptanceRate = Number(refereeTask?.minAcceptanceRate || 0);
    const minCompletionRate = Number(refereeTask?.minCompletionRate || 0);

    const refereeRewardAmount = Number(refereeTask?.rewardAmount || 0);
    const referrerRewardAmount = Number(referrerTask?.rewardAmount || 0);

    const missingConditions = [];

    if (minOrders > 0 && overallStats.completedOrders < minOrders) {
      missingConditions.push(`Orders below ${minOrders}`);
    }

    if (minEarnings > 0 && overallStats.totalEarnings < minEarnings) {
      missingConditions.push(`Earnings below ${minEarnings}`);
    }

    if (
      minAcceptanceRate > 0 &&
      overallStats.acceptanceRate < minAcceptanceRate
    ) {
      missingConditions.push(`Acceptance rate below ${minAcceptanceRate}%`);
    }

    if (
      minCompletionRate > 0 &&
      overallStats.completionRate < minCompletionRate
    ) {
      missingConditions.push(`Completion rate below ${minCompletionRate}%`);
    }

    const isCompleted = missingConditions.length === 0;

    const progressPercentage = Math.round(
      (
        (
          (minOrders > 0
            ? Math.min(overallStats.completedOrders / minOrders, 1)
            : 1) +
          (minEarnings > 0
            ? Math.min(overallStats.totalEarnings / minEarnings, 1)
            : 1) +
          (minAcceptanceRate > 0
            ? Math.min(overallStats.acceptanceRate / minAcceptanceRate, 1)
            : 1) +
          (minCompletionRate > 0
            ? Math.min(overallStats.completionRate / minCompletionRate, 1)
            : 1)
        ) / 4
      ) * 100
    );

    return removeEmptyValues({
      ruleType: "HYBRID",

      conditions: {
        minOrders,
        minEarnings,
        minAcceptanceRate,
        minCompletionRate
      },

      progress: {
        completedOrders: overallStats.completedOrders,
        requiredOrders: minOrders,

        currentEarnings: overallStats.totalEarnings,
        requiredEarnings: minEarnings,

        currentAcceptanceRate: overallStats.acceptanceRate,
        requiredAcceptanceRate: minAcceptanceRate,

        currentCompletionRate: overallStats.completionRate,
        requiredCompletionRate: minCompletionRate,

        eligible: isCompleted,
        missingConditions,
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage
      },

      refereeReward: {
        configuredAmount: refereeRewardAmount,
        earnedAmount: isCompleted ? refereeRewardAmount : 0,
        eligible: isCompleted
      },

      referrerReward: {
        configuredAmount: referrerRewardAmount,
        earnedAmount: isCompleted ? referrerRewardAmount : 0,
        eligible: isCompleted
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  
  // TASK - DAY WISE
  
  if (ruleType === "TASK") {
    const refereeTasks =
      program.tasks?.filter((task) => task.role === "REFEREE") || [];

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    const referrerRewardAmount = Number(referrerTask?.rewardAmount || 0);

    const currentDayNumber = getReferralCurrentDayNumber(referee);

    const groupedTasks = {};

    for (const task of refereeTasks) {
      const dayNumber = Number(task.dayNumber || 0);

      if (!groupedTasks[dayNumber]) {
        groupedTasks[dayNumber] = {
          dayNumber,
          taskRuleType: task.taskRuleType,
          rawTasks: []
        };
      }

      groupedTasks[dayNumber].rawTasks.push(task);
    }

    const tasks = [];

    for (const dayTask of Object.values(groupedTasks).sort(
      (a, b) => a.dayNumber - b.dayNumber
    )) {
      const { start, end } = getDayRangeFromRefereeJoinedDate(
        referee,
        dayTask.dayNumber
      );

      const dayStats = await getOrderStats({
        prisma,
        riderId: referee.id,
        start,
        end
      });

      if (dayTask.taskRuleType === "SLAB") {
        const slabs = dayTask.rawTasks
          .map((task) => ({
            minOrders: Number(task.minOrders || 0),
            maxOrders: Number(task.maxOrders || 0),
            rewardAmount: Number(task.rewardAmount || 0)
          }))
          .sort((a, b) => a.minOrders - b.minOrders);

        const currentSlab = slabs.find(
          (slab) =>
            dayStats.completedOrders >= slab.minOrders &&
            dayStats.completedOrders <= slab.maxOrders
        );

        const nextSlab = slabs.find(
          (slab) => dayStats.completedOrders < slab.minOrders
        );

        const maxOrdersForDay =
          slabs.length > 0
            ? Math.max(...slabs.map((slab) => slab.maxOrders))
            : 0;

        const currentSlabReward = Number(currentSlab?.rewardAmount || 0);
        const isCompleted = Boolean(currentSlab);

        const statusValue = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType: dayTask.taskRuleType,
            slabs,

            progress: {
              completedOrders: dayStats.completedOrders,
              currentSlabReward,
              earnedAmount: currentSlabReward,
              nextTargetOrders: nextSlab?.minOrders,
              remainingOrders: nextSlab
                ? Math.max(nextSlab.minOrders - dayStats.completedOrders, 0)
                : 0,
              status: statusValue,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                maxOrdersForDay
              )
            }
          })
        );
      }

      if (dayTask.taskRuleType === "PER_ORDER") {
        const task = dayTask.rawTasks[0];

        const rewardPerOrder = Number(task.rewardPerOrder || 0);
        const maxOrders = Number(task.maxOrders || dayStats.completedOrders);
        const maxEarning = Number(task.maxEarning || 0);

        const eligibleOrders = Math.min(dayStats.completedOrders, maxOrders);

        const calculatedReward = eligibleOrders * rewardPerOrder;

        const earnedAmount = maxEarning
          ? Math.min(calculatedReward, maxEarning)
          : calculatedReward;

        const isCompleted =
          maxOrders > 0 &&
          dayStats.completedOrders >= maxOrders;

        const statusValue = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType: dayTask.taskRuleType,
            rewardPerOrder,
            maxOrders,
            maxEarning,

            progress: {
              completedOrders: dayStats.completedOrders,
              earnedAmount,
              remainingOrders: Math.max(
                maxOrders - dayStats.completedOrders,
                0
              ),
              remainingAmount: maxEarning
                ? Math.max(maxEarning - earnedAmount, 0)
                : 0,
              status: statusValue,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                maxOrders
              )
            }
          })
        );
      }

      if (dayTask.taskRuleType === "FIXED_TARGET") {
        const task = dayTask.rawTasks[0];

        const targetOrders = Number(task.targetOrders || task.minOrders || 0);
        const rewardAmount = Number(task.rewardAmount || task.fixedReward || 0);

        const isCompleted =
          targetOrders > 0 &&
          dayStats.completedOrders >= targetOrders;

        const statusValue = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType: dayTask.taskRuleType,

            target: {
              orders: targetOrders
            },

            reward: {
              amount: rewardAmount
            },

            progress: {
              completedOrders: dayStats.completedOrders,
              targetOrders,
              remainingOrders: Math.max(
                targetOrders - dayStats.completedOrders,
                0
              ),
              earnedAmount: isCompleted ? rewardAmount : 0,
              status: statusValue,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                targetOrders
              )
            }
          })
        );
      }

      if (dayTask.taskRuleType === "HYBRID") {
        const task = dayTask.rawTasks[0];

        const minOrders = Number(task.minOrders || 0);
        const minEarnings = Number(task.minEarnings || 0);
        const minAcceptanceRate = Number(task.minAcceptanceRate || 0);
        const minCompletionRate = Number(task.minCompletionRate || 0);
        const rewardAmount = Number(task.rewardAmount || 0);

        const missingConditions = [];

        if (minOrders > 0 && dayStats.completedOrders < minOrders) {
          missingConditions.push(`Orders below ${minOrders}`);
        }

        if (minEarnings > 0 && dayStats.totalEarnings < minEarnings) {
          missingConditions.push(`Earnings below ${minEarnings}`);
        }

        if (
          minAcceptanceRate > 0 &&
          dayStats.acceptanceRate < minAcceptanceRate
        ) {
          missingConditions.push(`Acceptance rate below ${minAcceptanceRate}%`);
        }

        if (
          minCompletionRate > 0 &&
          dayStats.completionRate < minCompletionRate
        ) {
          missingConditions.push(`Completion rate below ${minCompletionRate}%`);
        }

        const isCompleted = missingConditions.length === 0;

        const statusValue = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType: dayTask.taskRuleType,

            conditions: {
              minOrders,
              minEarnings,
              minAcceptanceRate,
              minCompletionRate
            },

            reward: {
              amount: rewardAmount
            },

            progress: {
              completedOrders: dayStats.completedOrders,
              requiredOrders: minOrders,

              currentEarnings: dayStats.totalEarnings,
              requiredEarnings: minEarnings,

              currentAcceptanceRate: dayStats.acceptanceRate,
              requiredAcceptanceRate: minAcceptanceRate,

              currentCompletionRate: dayStats.completionRate,
              requiredCompletionRate: minCompletionRate,

              eligible: isCompleted,
              missingConditions,
              earnedAmount: isCompleted ? rewardAmount : 0,
              status: statusValue,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                minOrders
              )
            }
          })
        );
      }
    }

    const completedDays = tasks.filter(
      (task) => task.progress?.isCompleted
    ).length;

    const refereeEarnedAmount = tasks.reduce((sum, task) => {
      return sum + Number(task.progress?.earnedAmount || 0);
    }, 0);

    const maxReward = tasks.reduce((sum, task) => {
      if (task.taskRuleType === "SLAB") {
        const maxDayReward =
          task.slabs?.length > 0
            ? Math.max(...task.slabs.map((slab) => slab.rewardAmount))
            : 0;

        return sum + maxDayReward;
      }

      if (task.reward?.amount) {
        return sum + Number(task.reward.amount || 0);
      }

      if (task.maxEarning) {
        return sum + Number(task.maxEarning || 0);
      }

      return sum;
    }, 0);

    const isAllTasksCompleted =
      completedDays === tasks.length &&
      tasks.length > 0;

    return removeEmptyValues({
      ruleType: "TASK",

      overallProgress: {
        completedDays,
        totalDays: tasks.length,
        earnedAmount: refereeEarnedAmount,
        remainingAmount: Math.max(maxReward - refereeEarnedAmount, 0),
        progressPercentage: calculatePercentage(completedDays, tasks.length)
      },

      tasks,

      refereeReward: {
        configuredAmount: maxReward,
        earnedAmount: refereeEarnedAmount,
        eligible: refereeEarnedAmount > 0
      },

      referrerReward: {
        configuredAmount: referrerRewardAmount,
        earnedAmount: isAllTasksCompleted ? referrerRewardAmount : 0,
        eligible: isAllTasksCompleted
      },

      targetStatus: isAllTasksCompleted
        ? "TARGET_REACHED"
        : "TARGET_PENDING"
    });
  }

  return {
    ruleType,
    targetStatus: "TARGET_PENDING"
  };
};


// GET REFERRAL PROGRESS FOR ALL REFERRED RIDERS
exports.getReferralProgress = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    const {
      status = "all",
      fromDate,
      toDate,
      programId
    } = req.query;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: { profile: true }
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    if (!rider.partnerId) {
      return res.status(400).json({
        success: false,
        message: "Rider does not have partnerId"
      });
    }

    const now = new Date();

    const programWhere = {
      programType: "REFERRAL",
      isActive: true,
      validFrom: { lte: now },
      validTill: { gte: now }
    };

    if (programId) {
      programWhere.id = programId;
    }

    const program = await prisma.program.findFirst({
      where: programWhere,
      include: {
        targets: true,
        tasks: true,
        slabs: true,
        referralConfig: true
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "No active referral program found"
      });
    }

    const riderWhere = {
      referredByPartnerId: rider.partnerId
    };

    if (fromDate || toDate) {
      riderWhere.createdAt = {};

      if (fromDate) {
        riderWhere.createdAt.gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        riderWhere.createdAt.lte = endDate;
      }
    }

    const referredRiders = await prisma.rider.findMany({
      where: riderWhere,
      include: { profile: true },
      orderBy: { createdAt: "desc" }
    });

    let referrals = await Promise.all(
      referredRiders.map(async (referee) => {
        const overallStats = await getOrderStats({
          prisma,
          riderId: referee.id,
          start: program.validFrom,
          end: program.validTill
        });

        const ruleBasedData = await buildReferredRiderProgressByRule({
            prisma,
            program,
          referee,
          overallStats
        });

        const existingReferral = await prisma.referral.findUnique({
          where: {
            referrerId_refereeId: {
              referrerId: rider.id,
              refereeId: referee.id
            }
          }
        });

        const isTargetReached =
          ruleBasedData.targetStatus === "TARGET_REACHED";

        const referral = await prisma.referral.upsert({
          where: {
            referrerId_refereeId: {
              referrerId: rider.id,
              refereeId: referee.id
            }
          },
          update: {
            programId: program.id,
            referralCode: rider.partnerId,
            totalOrders: overallStats.completedOrders,
            targetOrders:
              ruleBasedData?.progress?.targetOrders ||
              ruleBasedData?.target?.orders ||
              0,
            isCompleted: isTargetReached,

            completedAt:
              isTargetReached && !existingReferral?.completedAt
                ? new Date()
                : existingReferral?.completedAt || null,

            rewardGiven: isTargetReached,

            rewardGivenAt:
              isTargetReached && !existingReferral?.rewardGivenAt
                ? new Date()
                : existingReferral?.rewardGivenAt || null
          },
          create: {
            referrerId: rider.id,
            refereeId: referee.id,
            programId: program.id,
            referralCode: rider.partnerId,
            totalOrders: overallStats.completedOrders,
            targetOrders:
              ruleBasedData?.progress?.targetOrders ||
              ruleBasedData?.target?.orders ||
              0,
            isCompleted: isTargetReached,
            completedAt: isTargetReached ? new Date() : null,
            rewardGiven: isTargetReached,
            rewardGivenAt: isTargetReached ? new Date() : null
          }
        });

        return removeEmptyValues({
          referralId: referral.id,

          newRiderId: referee.id,
          newRiderName: referee.profile?.fullName || "",
          newRiderPartnerId: referee.partnerId || "",
          usedReferralCode: referee.referredByPartnerId || "",

          referredAt: referee.createdAt,
          referredDate: referee.createdAt.toISOString().split("T")[0],
          referredAtIST: referee.createdAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
          }),

          ...ruleBasedData,

          referralUpdated: true
        });
      })
    );

    if (status === "pending") {
      referrals = referrals.filter(
        (item) => item.targetStatus === "TARGET_PENDING"
      );
    }

    if (status === "completed") {
      referrals = referrals.filter(
        (item) => item.targetStatus === "TARGET_REACHED"
      );
    }

    const targetReachedCount = referrals.filter(
      (item) => item.targetStatus === "TARGET_REACHED"
    ).length;

    const totalReferralEarnings = referrals.reduce((sum, item) => {
      return sum + Number(item.referrerReward?.earnedAmount || 0);
    }, 0);

    return res.status(200).json({
      success: true,
      message: "Referral progress fetched successfully",

      filters: removeEmptyValues({
        status,
        fromDate,
        toDate,
        programId
      }),

      program: removeEmptyValues({
        programId: program.id,
        programName: program.name,
        trackingType: program.trackingType,
        ruleType: program.ruleType,
        validFrom: program.validFrom,
        validTill: program.validTill,
        weekStartDay: program.weekStartDay
      }),

      referrer: removeEmptyValues({
        riderId: rider.id,
        partnerId: rider.partnerId,
        name: rider.profile?.fullName || ""
      }),

      summary: {
        totalRidersOnboarded: referrals.length,
        targetReachedRiders: targetReachedCount,
        targetPendingRiders: referrals.length - targetReachedCount,
        totalEarnings: totalReferralEarnings
      },

      referredRiders: referrals
    });
  } catch (error) {
    console.error("Referral Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
exports.getReferralRewards = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const referrals = await prisma.referral.findMany({
      where: {
        referrerId: riderId
      },
      include: {
        program: {
          include: {
            targets: true,
            slabs: true
          }
        }
      }
    });

    let earned = 0;
    let pending = 0;

    referrals.forEach((referral) => {
      let rewardAmount = 0;

      if (referral.program?.ruleType === "SLAB") {
        const slab = referral.program.slabs.find((item) => {
          const totalOrders = referral.totalOrders || 0;

          return (
            totalOrders >= item.minValue &&
            (item.maxValue === null || totalOrders <= item.maxValue)
          );
        });

        rewardAmount = slab?.rewardAmount || 0;
      } else {
        rewardAmount = referral.program?.targets[0]?.rewardAmount || 0;
      }

      if (referral.rewardGiven) {
        earned += rewardAmount;
      } else if (referral.isCompleted) {
        pending += rewardAmount;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        earned,
        pending
      }
    });
  } catch (error) {
    console.error("Get referral rewards error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
exports.getReferralCampaign = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const riderLocation = await prisma.riderLocation.findUnique({
      where: {
        riderId
      }
    });

    if (!riderLocation || !riderLocation.pincode) {
      return res.status(404).json({
        success: false,
        message: "Rider pincode not found"
      });
    }

    const riderPincode = String(riderLocation.pincode).trim();
    const today = new Date();

    const programs = await prisma.program.findMany({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: {
          lte: today
        },
        validTill: {
          gte: today
        }
      },
      include: {
        referralConfig: true,
        targets: true,
        slabs: true,
        tasks: true
      },
      orderBy: {
        priority: "asc"
      }
    });

    const campaign = programs.find((program) => {
      const pincodeIds = Array.isArray(program.pincodeIds)
        ? program.pincodeIds.map((pin) => String(pin).trim())
        : [];

      return pincodeIds.includes(riderPincode);
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "No active referral campaign found for this rider"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        programId: campaign.id,
        name: campaign.name,
        description: campaign.description,
        ruleType: campaign.ruleType,

        targetOrders: campaign.targets[0]?.targetOrders || 0,

        rewardFlow: campaign.referralConfig?.rewardFlow || null,

        slabs: campaign.slabs.map((slab) => ({
          min: slab.minValue,
          max: slab.maxValue,
          reward: slab.rewardAmount
        })),

        tasks: campaign.tasks.map((task) => ({
          role: task.role,
          dayNumber: task.dayNumber,
          minOrders: task.minOrders,
          reward: task.rewardAmount
        })),

        validFrom: campaign.validFrom,
        validTill: campaign.validTill
      }
    });
  } catch (error) {
    console.error("Get referral campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


exports.shareReferralByCode = async (req, res) => {
  try {
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "partnerId is required"
      });
    }

    // 🔍 Validate if referral code exists
    const rider = await prisma.rider.findUnique({
      where: { partnerId },
      include: {
        profile: true
      }
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code"
      });
    }

    // Create share message (you can customize)
    const shareMessage = `🚴 Join our platform using my referral code *${partnerId}* and earn rewards!\n\nDownload app: https://yourapp.link/referral?code=${partnerId}`;

    return res.status(200).json({
      success: true,
      message: "Referral code ready to share",
      data: {
        partnerId,
        riderName: rider.profile?.fullName || null,
        shareMessage,
        shareLink: `https://yourapp.link/referral?code=${partnerId}`
      }
    });

  } catch (error) {
    console.error("Share referral error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};





exports.referRider = async (req, res) => {
  try {
    const referrerId = req.rider?.id;

    if (!referrerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const { name, phoneNumber, area } = req.body;

    if (!name || !phoneNumber || !area) {
      return res.status(400).json({
        success: false,
        message: "name, phoneNumber and area are required"
      });
    }

    const referrer = await prisma.rider.findUnique({
      where: { id: referrerId }
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer rider not found"
      });
    }

    if (!referrer.partnerId) {
      return res.status(400).json({
        success: false,
        message: "Referrer partnerId not found"
      });
    }

    const existingRider = await prisma.rider.findUnique({
      where: { phoneNumber }
    });

    if (existingRider) {
      return res.status(400).json({
        success: false,
        message: "Rider already exists with this phone number"
      });
    }

    const newRider = await prisma.rider.create({
      data: {
        phoneNumber,
        referredByPartnerId: referrer.partnerId,
        onboardingStage: "PHONE_VERIFICATION",
        isFullyRegistered: false,

        profile: {
          create: {
            fullName: name
          }
        },

        location: {
          create: {
            area
          }
        }
      },
      include: {
        profile: true,
        location: true
      }
    });

    return res.status(201).json({
      success: true,
      message: "Rider referred successfully",
      data: {
        referredRiderId: newRider.id,
        name: newRider.profile?.fullName,
        phoneNumber: newRider.phoneNumber,
        area: newRider.location?.area,
        referredByPartnerId: newRider.referredByPartnerId,
        status: "PENDING_ONBOARDING"
      }
    });

  } catch (error) {
    console.error("Refer rider error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};



exports.getMyReferralSummary = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const referralAmountPerRider = 500;

    const referrer = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        profile: true
      }
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    if (!referrer.partnerId) {
      return res.status(400).json({
        success: false,
        message: "PartnerId not found for this rider"
      });
    }

    const referredRiders = await prisma.rider.findMany({
      where: {
        referredByPartnerId: referrer.partnerId
      },
      include: {
        profile: true,
        location: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const totalReferredRiders = referredRiders.length;

    const eligibleRiders = referredRiders.filter(
      rider => rider.isFullyRegistered === true
    );

    const totalEligibleRiders = eligibleRiders.length;

    const totalEarnings = totalEligibleRiders * referralAmountPerRider;

    return res.status(200).json({
      success: true,
      message: "Referral summary fetched successfully",
      data: {
        referrer: {
          riderId: referrer.id,
          name: referrer.profile?.fullName || null,
          partnerId: referrer.partnerId
        },
        referralAmountPerRider,
        totalReferredRiders,
        totalEligibleRiders,
        totalEarnings,
        referredRiders: referredRiders.map(rider => ({
          riderId: rider.id,
          name: rider.profile?.fullName || null,
          phoneNumber: rider.phoneNumber,
          area: rider.location?.area || null,
          isFullyRegistered: rider.isFullyRegistered,
          earningStatus: rider.isFullyRegistered
            ? "EARNED"
            : "PENDING",
          earningAmount: rider.isFullyRegistered
            ? referralAmountPerRider
            : 0
        }))
      }
    });

  } catch (error) {
    console.error("Referral summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
exports.getReferralProgressByNewRider = async (req, res) => {
  try {
    const { newRiderId } = req.params;

    if (!newRiderId) {
      return res.status(400).json({
        success: false,
        message: "newRiderId is required"
      });
    }

    // Get active referral program created by admin
    const now = new Date();

    const program = await prisma.program.findFirst({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: {
          lte: now
        },
        validTill: {
          gte: now
        }
      },
      include: {
        targets: true,
        tasks: true,
        slabs: true,
        referralConfig: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "No active referral program found"
      });
    }

    //  Admin configured values
    const targetOrders =
      program.targets?.[0]?.targetOrders ||
      program.tasks?.[0]?.minOrders ||
      0;

    const rewardAmount =
      program.targets?.[0]?.rewardAmount ||
      program.tasks?.[0]?.rewardAmount ||
      program.slabs?.[0]?.rewardAmount ||
      0;

    if (!targetOrders || !rewardAmount) {
      return res.status(400).json({
        success: false,
        message: "Referral program targetOrders or rewardAmount not configured properly"
      });
    }

    const referee = await prisma.rider.findUnique({
      where: { id: newRiderId },
      include: {
        profile: true
      }
    });

    if (!referee) {
      return res.status(404).json({
        success: false,
        message: "Referred rider not found"
      });
    }

    if (!referee.referredByPartnerId) {
      return res.status(400).json({
        success: false,
        message: "This rider was not referred by anyone"
      });
    }

    const ordersCompleted = await prisma.order.count({
      where: {
        riderId: newRiderId,
        orderStatus: "DELIVERED"
      }
    });

    const targetReached = ordersCompleted >= targetOrders;

    const referredAtIST = referee.createdAt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    });

    return res.status(200).json({
      success: true,
      message: "New referred rider details fetched successfully",

      program: {
        programId: program.id,
        programName: program.name,
        validFrom: program.validFrom,
        validTill: program.validTill
      },

      data: {
        newRiderId: referee.id,
        newRiderName: referee.profile?.fullName || null,
        newRiderPartnerId: referee.partnerId || null,
        usedReferralCode: referee.referredByPartnerId,

        referredAt: referee.createdAt,
        referredDate: referee.createdAt.toISOString().split("T")[0],
        referredAtIST,

        ordersCompleted,
        targetOrders,

        targetStatus: targetReached ? "TARGET_REACHED" : "TARGET_PENDING",
        remainingOrders: Math.max(targetOrders - ordersCompleted, 0),

        rewardAmount,
        rewardEarned: targetReached ? rewardAmount : 0
      }
    });

  } catch (error) {
    console.error("Referral Progress By New Rider Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};










// RULE BASED RESPONSE BUILDER

const buildIndividualRefereeResponse = async ({
   prisma,
  program,
  referee,
  riderId,
  overallStats
}) => {
  const ruleType = program.ruleType;

  // =====================================================
  // FIXED_TARGET
  // =====================================================
  if (ruleType === "FIXED_TARGET") {
    const target = program.targets?.[0];

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    const targetOrders = Number(target?.targetOrders || 0);
    const refereeRewardAmount = Number(target?.rewardAmount || 0);
    const referrerRewardAmount = Number(referrerTask?.rewardAmount || 0);

    const completedOrders = overallStats.completedOrders;

    const isCompleted =
      targetOrders > 0 && completedOrders >= targetOrders;

    return removeEmptyValues({
      ruleType: "FIXED_TARGET",

      target: {
        orders: targetOrders
      },

      reward: {
        amount: refereeRewardAmount
      },

      progress: {
        completedOrders,
        targetOrders,
        remainingOrders: Math.max(targetOrders - completedOrders, 0),
        earnedAmount: isCompleted ? refereeRewardAmount : 0,
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage: calculatePercentage(completedOrders, targetOrders)
      },

      refereeReward: {
        eligible: isCompleted,
        amount: isCompleted ? refereeRewardAmount : 0
      },

      referrerReward: {
        amount: referrerRewardAmount
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  // =====================================================
  // SLAB
  // =====================================================
  if (ruleType === "SLAB") {
    const refereeSlabs =
      program.slabs
        ?.filter((slab) => slab.role === "REFEREE")
        .map((slab) => ({
          minOrders: Number(slab.minValue || 0),
          maxOrders: Number(slab.maxValue || 0),
          rewardAmount: Number(slab.rewardAmount || 0)
        }))
        .sort((a, b) => a.minOrders - b.minOrders) || [];

    const completedOrders = overallStats.completedOrders;

    const currentSlab = refereeSlabs.find(
      (slab) =>
        completedOrders >= slab.minOrders &&
        completedOrders <= slab.maxOrders
    );

    const nextSlab = refereeSlabs.find(
      (slab) => completedOrders < slab.minOrders
    );

    const maxTargetOrders =
      refereeSlabs.length > 0
        ? Math.max(...refereeSlabs.map((slab) => slab.maxOrders))
        : 0;

    const currentSlabReward = Number(currentSlab?.rewardAmount || 0);
    const isCompleted = Boolean(currentSlab);

    return removeEmptyValues({
      ruleType: "SLAB",

      slabs: refereeSlabs,

      progress: {
        completedOrders,
        currentSlabReward,
        nextTargetOrders: nextSlab?.minOrders,
        remainingOrders: nextSlab
          ? Math.max(nextSlab.minOrders - completedOrders, 0)
          : 0,
        earnedAmount: currentSlabReward,
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage: calculatePercentage(
          completedOrders,
          maxTargetOrders
        )
      },

      refereeReward: {
        eligible: isCompleted,
        amount: currentSlabReward
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  // =====================================================
  // PER_ORDER
  // =====================================================
  if (ruleType === "PER_ORDER") {
    const refereeTask = program.tasks?.find(
      (task) => task.role === "REFEREE"
    );

    const rewardPerOrder = Number(refereeTask?.rewardPerOrder || 0);
    const maxOrders = Number(refereeTask?.maxOrders || overallStats.completedOrders);
    const maxEarning = Number(refereeTask?.maxEarning || 0);

    const completedOrders = overallStats.completedOrders;
    const eligibleOrders = Math.min(completedOrders, maxOrders);

    const calculatedReward = eligibleOrders * rewardPerOrder;

    const earnedAmount = maxEarning
      ? Math.min(calculatedReward, maxEarning)
      : calculatedReward;

    const isCompleted =
      maxOrders > 0 && completedOrders >= maxOrders;

    return removeEmptyValues({
      ruleType: "PER_ORDER",

      rewardPerOrder,
      maxOrders,
      maxEarning,

      progress: {
        completedOrders,
        eligibleOrders,
        earnedAmount,
        remainingOrders: Math.max(maxOrders - completedOrders, 0),
        remainingAmount: maxEarning
          ? Math.max(maxEarning - earnedAmount, 0)
          : 0,
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage: calculatePercentage(completedOrders, maxOrders)
      },

      refereeReward: {
        eligible: earnedAmount > 0,
        amount: earnedAmount
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  // =====================================================
  // HYBRID
  // =====================================================
  if (ruleType === "HYBRID") {
    const refereeTask = program.tasks?.find(
      (task) => task.role === "REFEREE"
    );

    const minOrders = Number(refereeTask?.minOrders || 0);
    const minEarnings = Number(refereeTask?.minEarnings || 0);
    const minAcceptanceRate = Number(refereeTask?.minAcceptanceRate || 0);
    const minCompletionRate = Number(refereeTask?.minCompletionRate || 0);
    const rewardAmount = Number(refereeTask?.rewardAmount || 0);

    const missingConditions = [];

    if (minOrders > 0 && overallStats.completedOrders < minOrders) {
      missingConditions.push(`Orders below ${minOrders}`);
    }

    if (minEarnings > 0 && overallStats.totalEarnings < minEarnings) {
      missingConditions.push(`Earnings below ${minEarnings}`);
    }

    if (
      minAcceptanceRate > 0 &&
      overallStats.acceptanceRate < minAcceptanceRate
    ) {
      missingConditions.push(`Acceptance rate below ${minAcceptanceRate}%`);
    }

    if (
      minCompletionRate > 0 &&
      overallStats.completionRate < minCompletionRate
    ) {
      missingConditions.push(`Completion rate below ${minCompletionRate}%`);
    }

    const isCompleted = missingConditions.length === 0;

    const progressPercentage = Math.round(
      (
        (
          (minOrders > 0
            ? Math.min(overallStats.completedOrders / minOrders, 1)
            : 1) +
          (minEarnings > 0
            ? Math.min(overallStats.totalEarnings / minEarnings, 1)
            : 1) +
          (minAcceptanceRate > 0
            ? Math.min(overallStats.acceptanceRate / minAcceptanceRate, 1)
            : 1) +
          (minCompletionRate > 0
            ? Math.min(overallStats.completionRate / minCompletionRate, 1)
            : 1)
        ) / 4
      ) * 100
    );

    return removeEmptyValues({
      ruleType: "HYBRID",

      conditions: {
        minOrders,
        minEarnings,
        minAcceptanceRate,
        minCompletionRate
      },

      reward: {
        amount: rewardAmount
      },

      progress: {
        completedOrders: overallStats.completedOrders,
        requiredOrders: minOrders,

        currentEarnings: overallStats.totalEarnings,
        requiredEarnings: minEarnings,

        currentAcceptanceRate: overallStats.acceptanceRate,
        requiredAcceptanceRate: minAcceptanceRate,

        currentCompletionRate: overallStats.completionRate,
        requiredCompletionRate: minCompletionRate,

        eligible: isCompleted,
        missingConditions,
        earnedAmount: isCompleted ? rewardAmount : 0,
        status: isCompleted ? "COMPLETED" : "RUNNING",
        isCompleted,
        progressPercentage
      },

      refereeReward: {
        eligible: isCompleted,
        amount: isCompleted ? rewardAmount : 0
      },

      targetStatus: isCompleted ? "TARGET_REACHED" : "TARGET_PENDING"
    });
  }

  // =====================================================
  // TASK - DAY WISE PROGRESS
  // =====================================================
  if (ruleType === "TASK") {
    const refereeTasks =
      program.tasks?.filter((task) => task.role === "REFEREE") || [];

    const currentDayNumber = getReferralCurrentDayNumber(referee);

    const groupedTasks = {};

    for (const task of refereeTasks) {
      const dayNumber = Number(task.dayNumber || 0);

      if (!groupedTasks[dayNumber]) {
        groupedTasks[dayNumber] = {
          dayNumber,
          taskRuleType: task.taskRuleType,
          rawTasks: []
        };
      }

      groupedTasks[dayNumber].rawTasks.push(task);
    }

    const tasks = [];

    for (const dayTask of Object.values(groupedTasks).sort(
      (a, b) => a.dayNumber - b.dayNumber
    )) {
      const { start, end } = getDayRangeFromRefereeJoinedDate(
        referee,
        dayTask.dayNumber
      );

      const dayStats = await getOrderStats({
          prisma,

        riderId,
        start,
        end
      });

      const taskRuleType = dayTask.taskRuleType;

      // -----------------------------------------------
      // TASK + SLAB
      // -----------------------------------------------
      if (taskRuleType === "SLAB") {
        const slabs = dayTask.rawTasks
          .map((task) => ({
            minOrders: Number(task.minOrders || 0),
            maxOrders: Number(task.maxOrders || 0),
            rewardAmount: Number(task.rewardAmount || 0)
          }))
          .sort((a, b) => a.minOrders - b.minOrders);

        const currentSlab = slabs.find(
          (slab) =>
            dayStats.completedOrders >= slab.minOrders &&
            dayStats.completedOrders <= slab.maxOrders
        );

        const nextSlab = slabs.find(
          (slab) => dayStats.completedOrders < slab.minOrders
        );

        const maxOrdersForDay =
          slabs.length > 0
            ? Math.max(...slabs.map((slab) => slab.maxOrders))
            : 0;

        const currentSlabReward = Number(currentSlab?.rewardAmount || 0);
        const isCompleted = Boolean(currentSlab);

        const status = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType,
            slabs,

            progress: {
              completedOrders: dayStats.completedOrders,
              currentSlabReward,
              earnedAmount: currentSlabReward,

              nextTargetOrders: nextSlab?.minOrders,
              remainingOrders: nextSlab
                ? Math.max(nextSlab.minOrders - dayStats.completedOrders, 0)
                : 0,

              status,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                maxOrdersForDay
              )
            }
          })
        );
      }

      // -----------------------------------------------
      // TASK + PER_ORDER
      // -----------------------------------------------
      if (taskRuleType === "PER_ORDER") {
        const task = dayTask.rawTasks[0];

        const rewardPerOrder = Number(task.rewardPerOrder || 0);
        const maxOrders = Number(task.maxOrders || dayStats.completedOrders);
        const maxEarning = Number(task.maxEarning || 0);

        const eligibleOrders = Math.min(dayStats.completedOrders, maxOrders);
        const calculatedReward = eligibleOrders * rewardPerOrder;

        const earnedAmount = maxEarning
          ? Math.min(calculatedReward, maxEarning)
          : calculatedReward;

        const isCompleted =
          maxOrders > 0 && dayStats.completedOrders >= maxOrders;

        const status = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType,
            rewardPerOrder,
            maxOrders,
            maxEarning,

            progress: {
              completedOrders: dayStats.completedOrders,
              eligibleOrders,
              earnedAmount,
              remainingOrders: Math.max(
                maxOrders - dayStats.completedOrders,
                0
              ),
              remainingAmount: maxEarning
                ? Math.max(maxEarning - earnedAmount, 0)
                : 0,
              status,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                maxOrders
              )
            }
          })
        );
      }

      // -----------------------------------------------
      // TASK + FIXED_TARGET
      // -----------------------------------------------
      if (taskRuleType === "FIXED_TARGET") {
        const task = dayTask.rawTasks[0];

        const targetOrders = Number(task.targetOrders || task.minOrders || 0);
        const rewardAmount = Number(task.rewardAmount || task.fixedReward || 0);

        const isCompleted =
          targetOrders > 0 && dayStats.completedOrders >= targetOrders;

        const status = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType,

            target: {
              orders: targetOrders
            },

            reward: {
              amount: rewardAmount
            },

            progress: {
              completedOrders: dayStats.completedOrders,
              targetOrders,
              remainingOrders: Math.max(
                targetOrders - dayStats.completedOrders,
                0
              ),
              earnedAmount: isCompleted ? rewardAmount : 0,
              status,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                targetOrders
              )
            }
          })
        );
      }

      // -----------------------------------------------
      // TASK + HYBRID
      // -----------------------------------------------
      if (taskRuleType === "HYBRID") {
        const task = dayTask.rawTasks[0];

        const minOrders = Number(task.minOrders || 0);
        const minEarnings = Number(task.minEarnings || 0);
        const minAcceptanceRate = Number(task.minAcceptanceRate || 0);
        const minCompletionRate = Number(task.minCompletionRate || 0);
        const rewardAmount = Number(task.rewardAmount || 0);

        const missingConditions = [];

        if (minOrders > 0 && dayStats.completedOrders < minOrders) {
          missingConditions.push(`Orders below ${minOrders}`);
        }

        if (minEarnings > 0 && dayStats.totalEarnings < minEarnings) {
          missingConditions.push(`Earnings below ${minEarnings}`);
        }

        if (
          minAcceptanceRate > 0 &&
          dayStats.acceptanceRate < minAcceptanceRate
        ) {
          missingConditions.push(`Acceptance rate below ${minAcceptanceRate}%`);
        }

        if (
          minCompletionRate > 0 &&
          dayStats.completionRate < minCompletionRate
        ) {
          missingConditions.push(`Completion rate below ${minCompletionRate}%`);
        }

        const isCompleted = missingConditions.length === 0;

        const status = getTaskStatus({
          isCompleted,
          dayNumber: dayTask.dayNumber,
          currentDayNumber
        });

        tasks.push(
          removeEmptyValues({
            dayNumber: dayTask.dayNumber,
            taskRuleType,

            conditions: {
              minOrders,
              minEarnings,
              minAcceptanceRate,
              minCompletionRate
            },

            reward: {
              amount: rewardAmount
            },

            progress: {
              completedOrders: dayStats.completedOrders,
              requiredOrders: minOrders,

              currentEarnings: dayStats.totalEarnings,
              requiredEarnings: minEarnings,

              currentAcceptanceRate: dayStats.acceptanceRate,
              requiredAcceptanceRate: minAcceptanceRate,

              currentCompletionRate: dayStats.completionRate,
              requiredCompletionRate: minCompletionRate,

              eligible: isCompleted,
              missingConditions,
              earnedAmount: isCompleted ? rewardAmount : 0,
              status,
              isCompleted,
              progressPercentage: calculatePercentage(
                dayStats.completedOrders,
                minOrders
              )
            }
          })
        );
      }
    }

    const completedDays = tasks.filter(
      (task) => task.progress?.isCompleted
    ).length;

    const earnedAmount = tasks.reduce((sum, task) => {
      return sum + Number(task.progress?.earnedAmount || 0);
    }, 0);

    const maxReward = tasks.reduce((sum, task) => {
      if (task.taskRuleType === "SLAB") {
        const maxDayReward =
          task.slabs?.length > 0
            ? Math.max(...task.slabs.map((slab) => slab.rewardAmount))
            : 0;

        return sum + maxDayReward;
      }

      if (task.reward?.amount) {
        return sum + Number(task.reward.amount || 0);
      }

      if (task.maxEarning) {
        return sum + Number(task.maxEarning || 0);
      }

      return sum;
    }, 0);

    return removeEmptyValues({
      ruleType: "TASK",

      overallProgress: {
        completedDays,
        totalDays: tasks.length,
        earnedAmount,
        remainingAmount: Math.max(maxReward - earnedAmount, 0),
        progressPercentage: calculatePercentage(completedDays, tasks.length)
      },

      tasks,

      refereeReward: {
        eligible: earnedAmount > 0,
        amount: earnedAmount
      },

      targetStatus:
        completedDays === tasks.length && tasks.length > 0
          ? "TARGET_REACHED"
          : "TARGET_PENDING"
    });
  }

  return removeEmptyValues({
    ruleType,

    progress: {
      completedOrders: overallStats.completedOrders,
      earnedAmount: 0,
      status: "RUNNING",
      isCompleted: false
    },

    targetStatus: "TARGET_PENDING"
  });
};


// GET INDIVIDUAL REFEREE PROGRESS 

exports.getRefereeProgress = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const referee = await prisma.rider.findUnique({
      where: {
        id: riderId
      },
      include: {
        profile: true
      }
    });

    if (!referee) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    if (!referee.referredByPartnerId) {
      return res.status(400).json({
        success: false,
        message: "This rider was not referred by anyone"
      });
    }

    const now = new Date();

    const program = await prisma.program.findFirst({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: {
          lte: now
        },
        validTill: {
          gte: now
        }
      },
      include: {
        referralConfig: true,
        targets: true,
        tasks: true,
        slabs: true
      },
      orderBy: [
        {
          priority: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "No active referral program found"
      });
    }

    const overallStats = await getOrderStats({
        prisma,

      riderId,
      start: program.validFrom,
      end: program.validTill
    });

    const ruleBasedData = await buildIndividualRefereeResponse({
        prisma,

      program,
      referee,
      riderId,
      overallStats
    });

    const responseData = removeEmptyValues({
      riderId: referee.id,
      riderName: referee.profile?.fullName || "",
      riderPartnerId: referee.partnerId || "",
      usedReferralCode: referee.referredByPartnerId,

      referredAt: referee.createdAt,
      referredDate: referee.createdAt.toISOString().split("T")[0],
      referredAtIST: referee.createdAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata"
      }),

      ...ruleBasedData
    });

    return res.status(200).json({
      success: true,
      message: "Individual referee progress fetched successfully",

      program: removeEmptyValues({
        programId: program.id,
        programName: program.name,
        trackingType: program.trackingType,
        ruleType: program.ruleType,
        validFrom: program.validFrom,
        validTill: program.validTill,
        weekStartDay: program.weekStartDay
      }),

      data: responseData
    });
  } catch (error) {
    console.error("Get individual referee progress error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
exports.getReferrerSummary = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const referrer = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        profile: true,
      },
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    if (!referrer.partnerId) {
      return res.status(400).json({
        success: false,
        message: "Rider does not have referral code",
      });
    }

    const now = new Date();

    const program = await prisma.program.findFirst({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: { lte: now },
        validTill: { gte: now },
      },
      include: {
        referralConfig: true,
        tasks: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "No active referral program found",
      });
    }

    const refereeTask = program.tasks.find((task) => task.role === "REFEREE");
    const referrerTask = program.tasks.find((task) => task.role === "REFERRER");

    const targetOrders =
      refereeTask?.targetOrders ||
      refereeTask?.maxOrders ||
      refereeTask?.minOrders ||
      0;

    const referrerRewardAmount =
      referrerTask?.rewardAmount ||
      referrerTask?.fixedReward ||
      referrerTask?.rewardPerOrder ||
      0;

    const referredRiders = await prisma.rider.findMany({
      where: {
        referredByPartnerId: referrer.partnerId,
      },
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const referrals = await Promise.all(
      referredRiders.map(async (referee) => {
        const completedOrders = await prisma.order.count({
          where: {
            riderId: referee.id,
            orderStatus: "DELIVERED",
            createdAt: {
              gte: program.validFrom,
              lte: program.validTill,
            },
          },
        });

        const isCompleted =
          targetOrders > 0 && completedOrders >= targetOrders;

        return {
          riderId: referee.id,
          name: referee.profile?.fullName || null,
          phoneNumber: referee.phoneNumber,

          targetOrders,
          completedOrders,
          remainingOrders: Math.max(targetOrders - completedOrders, 0),

          status: isCompleted ? "COMPLETED" : "PENDING",

          referrerReward: {
            eligible: isCompleted,
            amount: isCompleted ? referrerRewardAmount : 0,
          },
        };
      })
    );

    const completedReferrals = referrals.filter(
      (item) => item.status === "COMPLETED"
    ).length;

    const pendingReferrals = referrals.filter(
      (item) => item.status === "PENDING"
    ).length;

    const totalEarnings = referrals.reduce(
      (sum, item) => sum + item.referrerReward.amount,
      0
    );

    return res.status(200).json({
      success: true,
      message: "Referrer summary fetched successfully",
      data: {
        referrer: {
          riderId: referrer.id,
          name: referrer.profile?.fullName || null,
          referralCode: referrer.partnerId,
        },

        program: {
          programId: program.id,
          programName: program.name,
          ruleType: program.ruleType,
          trackingType: program.trackingType,
        },

        summary: {
          totalReferredRiders: referredRiders.length,
          completedReferrals,
          pendingReferrals,
          rewardPerSuccessfulReferral: referrerRewardAmount,
          totalEarnings,
        },

        referrals,
      },
    });
  } catch (error) {
    console.error("Get referrer summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.getReferralEarnings = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        profile: true,
      },
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    const now = new Date();

    const program = await prisma.program.findFirst({
      where: {
        programType: "REFERRAL",
        isActive: true,
        validFrom: { lte: now },
        validTill: { gte: now },
      },
      include: {
        referralConfig: true,
        tasks: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "No active referral program found",
      });
    }

    const refereeTask = program.tasks.find((task) => task.role === "REFEREE");
    const referrerTask = program.tasks.find((task) => task.role === "REFERRER");

    const targetOrders =
      refereeTask?.targetOrders ||
      refereeTask?.maxOrders ||
      refereeTask?.minOrders ||
      0;

    const completedOrders = await prisma.order.count({
      where: {
        riderId,
        orderStatus: "DELIVERED",
        createdAt: {
          gte: program.validFrom,
          lte: program.validTill,
        },
      },
    });

    const refereeCompleted =
      targetOrders > 0 && completedOrders >= targetOrders;

    const refereeEarning = refereeCompleted
      ? refereeTask?.rewardAmount || refereeTask?.fixedReward || 0
      : 0;

    let referredRiders = [];

    if (rider.partnerId) {
      referredRiders = await prisma.rider.findMany({
        where: {
          referredByPartnerId: rider.partnerId,
        },
      });
    }

    const referrerRewardAmount =
      referrerTask?.rewardAmount ||
      referrerTask?.fixedReward ||
      referrerTask?.rewardPerOrder ||
      0;

    let completedReferralCount = 0;

    for (const referredRider of referredRiders) {
      const referredCompletedOrders = await prisma.order.count({
        where: {
          riderId: referredRider.id,
          orderStatus: "DELIVERED",
          createdAt: {
            gte: program.validFrom,
            lte: program.validTill,
          },
        },
      });

      if (targetOrders > 0 && referredCompletedOrders >= targetOrders) {
        completedReferralCount++;
      }
    }

    const referrerEarning = completedReferralCount * referrerRewardAmount;

    return res.status(200).json({
      success: true,
      message: "Referral earnings fetched successfully",
      data: {
        riderId: rider.id,
        riderName: rider.profile?.fullName || null,

        refereeProgress: {
          targetOrders,
          completedOrders,
          remainingOrders: Math.max(targetOrders - completedOrders, 0),
          isCompleted: refereeCompleted,
          earning: refereeEarning,
        },

        referrerProgress: {
          referralCode: rider.partnerId,
          totalReferredRiders: referredRiders.length,
          completedReferralCount,
          rewardPerReferral: referrerRewardAmount,
          earning: referrerEarning,
        },

        totalReferralEarnings: refereeEarning + referrerEarning,
      },
    });
  } catch (error) {
    console.error("Get referral earnings error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};