const prisma = require("../config/prisma");
const removeEmptyValues = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeEmptyValues(item))
      .filter((item) => {
        if (item === null || item === undefined || item === "") return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (
          typeof item === "object" &&
          !(item instanceof Date) &&
          Object.keys(item).length === 0
        ) {
          return false;
        }
        return true;
      });
  }

  const cleaned = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return;
    }

    if (
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      const nested = removeEmptyValues(value);

      if (
        nested &&
        !(
          typeof nested === "object" &&
          !Array.isArray(nested) &&
          Object.keys(nested).length === 0
        )
      ) {
        cleaned[key] = nested;
      }

      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
};
const buildReferralProgramResponse = (program) => {
  const baseResponse = {
    id: program.id,
    name: program.name,
    description: program.description,
    programType: program.programType,
    cityId: program.cityId,
    pincodeIds: program.pincodeIds,
    applicableWhen: program.applicableWhen,
    trackingType: program.trackingType,
    ruleType: program.ruleType,
    validFrom: program.validFrom,
    validTill: program.validTill,
    daysOfWeek: program.daysOfWeek,
    weekStartDay: program.weekStartDay,
    isActive: program.isActive,
    priority: program.priority,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,

    referralConfig: {
      rewardFlow: program.referralConfig?.rewardFlow,
      maxReferralsPerUser: program.referralConfig?.maxReferralsPerUser,
      maxEarningPerUser: program.referralConfig?.maxEarningPerUser,
    },
  };

  if (program.ruleType === "FIXED_TARGET") {
    const target = program.targets?.[0];
    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    return removeEmptyValues({
      ...baseResponse,

      refereeRules: {
        target: {
          orders: target?.targetOrders,
        },
        reward: {
          amount: target?.rewardAmount,
        },
      },

      referrerReward: {
        amount: referrerTask?.rewardAmount,
      },
    });
  }

  if (program.ruleType === "SLAB") {
    const refereeSlabs =
      program.slabs
        ?.filter((slab) => slab.role === "REFEREE")
        .map((slab) => ({
          minOrders: slab.minValue,
          maxOrders: slab.maxValue,
          rewardAmount: slab.rewardAmount,
        })) || [];

    const referrerSlabs =
      program.slabs
        ?.filter((slab) => slab.role === "REFERRER")
        .map((slab) => ({
          minOrders: slab.minValue,
          maxOrders: slab.maxValue,
          rewardAmount: slab.rewardAmount,
        })) || [];

    return removeEmptyValues({
      ...baseResponse,

      refereeRules: {
        slabs: refereeSlabs,
      },

      referrerReward: {
        slabs: referrerSlabs,
      },
    });
  }

  if (program.ruleType === "PER_ORDER") {
    const refereeTask = program.tasks?.find(
      (task) => task.role === "REFEREE"
    );

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    return removeEmptyValues({
      ...baseResponse,

      refereeRules: {
        rewardPerOrder: refereeTask?.rewardPerOrder,
        maxOrders: refereeTask?.maxOrders,
        maxEarning: refereeTask?.maxEarning,
      },

      referrerReward: {
        rewardPerOrder: referrerTask?.rewardPerOrder,
        maxOrders: referrerTask?.maxOrders,
        maxEarning: referrerTask?.maxEarning,
      },
    });
  }

  if (program.ruleType === "HYBRID") {
    const refereeTask = program.tasks?.find(
      (task) => task.role === "REFEREE"
    );

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    return removeEmptyValues({
      ...baseResponse,

      refereeRules: {
        conditions: {
          minOrders: refereeTask?.minOrders,
          minEarnings: refereeTask?.minEarnings,
          minAcceptanceRate: refereeTask?.minAcceptanceRate,
          minCompletionRate: refereeTask?.minCompletionRate,
        },
        reward: {
          amount: refereeTask?.rewardAmount,
        },
      },

      referrerReward: {
        amount: referrerTask?.rewardAmount,
      },
    });
  }

  if (program.ruleType === "TASK") {
    const refereeTasks = program.tasks?.filter(
      (task) => task.role === "REFEREE"
    );

    const referrerTask = program.tasks?.find(
      (task) => task.role === "REFERRER"
    );

    const groupedTasks = [];

    refereeTasks.forEach((task) => {
      let existingDay = groupedTasks.find(
        (item) => item.dayNumber === task.dayNumber
      );

      if (!existingDay) {
        existingDay = {
          dayNumber: task.dayNumber,
          slabs: [],
        };

        groupedTasks.push(existingDay);
      }

      existingDay.slabs.push({
        minOrders: task.minOrders,
        maxOrders: task.maxOrders,
        rewardAmount: task.rewardAmount,
      });
    });

    return removeEmptyValues({
      ...baseResponse,

      taskRuleType: refereeTasks?.[0]?.taskRuleType,

      refereeRules: {
        tasks: groupedTasks,
      },

      referrerReward: {
        amount: referrerTask?.rewardAmount,
      },
    });
  }

  return removeEmptyValues(baseResponse);
};
exports.createReferralConfig = async (req, res) => {
  try {
    const {
      name,
      description,
      programType = "REFERRAL",
      trackingType,
      ruleType,
      taskRuleType,
      referralConfig,
      refereeRules,
      referrerReward,
      validFrom,
      validTill,
      daysOfWeek,
      weekStartDay,
       cityId ,
     pincodeIds,
      isActive,
      priority,
    } = req.body;

    if (
      !name ||
      !trackingType ||
      !ruleType ||
      !referralConfig ||
      !refereeRules ||
      !referrerReward
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, trackingType, ruleType, referralConfig, refereeRules and referrerReward are required",
      });
    }

    if (!validFrom || !validTill) {
      return res.status(400).json({
        success: false,
        message: "validFrom and validTill are required",
      });
    }

    const targetsCreate = [];
    const slabsCreate = [];
    const tasksCreate = [];

    // FIXED_TARGET
    if (ruleType === "FIXED_TARGET") {
      if (
        refereeRules?.target?.orders == null ||
        refereeRules?.reward?.amount == null ||
        referrerReward?.amount == null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "refereeRules.target.orders, refereeRules.reward.amount and referrerReward.amount are required",
        });
      }

      targetsCreate.push({
        targetOrders: refereeRules.target.orders,
        rewardAmount: refereeRules.reward.amount,
      });

      tasksCreate.push({
        role: "REFERRER",
        taskRuleType: "FIXED_TARGET",
        targetOrders: refereeRules.target.orders,
        rewardAmount: referrerReward.amount,
        taskType: "ORDERS",
      });
    }

    // SLAB
    if (ruleType === "SLAB") {
      if (
        !Array.isArray(refereeRules.slabs) ||
        refereeRules.slabs.length === 0 ||
        !Array.isArray(referrerReward.slabs) ||
        referrerReward.slabs.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "refereeRules.slabs and referrerReward.slabs are required",
        });
      }

      refereeRules.slabs.forEach((slab) => {
        slabsCreate.push({
          role: "REFEREE",
          minValue: slab.minOrders,
          maxValue: slab.maxOrders,
          rewardAmount: slab.rewardAmount,
        });
      });

      referrerReward.slabs.forEach((slab) => {
        slabsCreate.push({
          role: "REFERRER",
          minValue: slab.minOrders,
          maxValue: slab.maxOrders,
          rewardAmount: slab.rewardAmount,
        });
      });
    }

    // PER_ORDER
    if (ruleType === "PER_ORDER") {
      tasksCreate.push({
        role: "REFEREE",
        taskRuleType: "PER_ORDER",
        rewardPerOrder: refereeRules.rewardPerOrder,
        maxOrders: refereeRules.maxOrders,
        maxEarning: refereeRules.maxEarning,
        taskType: "ORDERS",
      });

      tasksCreate.push({
        role: "REFERRER",
        taskRuleType: "PER_ORDER",
        rewardPerOrder: referrerReward.rewardPerOrder,
        maxOrders: referrerReward.maxOrders,
        maxEarning: referrerReward.maxEarning,
        taskType: "ORDERS",
      });
    }

    // HYBRID
    if (ruleType === "HYBRID") {
      tasksCreate.push({
        role: "REFEREE",
        taskRuleType: "HYBRID",
        minOrders: refereeRules.conditions?.minOrders,
        minEarnings: refereeRules.conditions?.minEarnings,
        minAcceptanceRate: refereeRules.conditions?.minAcceptanceRate,
        minCompletionRate: refereeRules.conditions?.minCompletionRate,
        rewardAmount: refereeRules.reward?.amount || 0,
        taskType: "ORDERS",
      });

      tasksCreate.push({
        role: "REFERRER",
        taskRuleType: "HYBRID",
        rewardAmount: referrerReward.amount,
        taskType: "ORDERS",
      });
    }

    // TASK
    if (ruleType === "TASK") {
      if (!taskRuleType) {
        return res.status(400).json({
          success: false,
          message: "taskRuleType is required when ruleType is TASK",
        });
      }

      if (!Array.isArray(refereeRules.tasks)) {
        return res.status(400).json({
          success: false,
          message: "refereeRules.tasks is required",
        });
      }

      refereeRules.tasks.forEach((task) => {
        task.slabs.forEach((slab) => {
          tasksCreate.push({
            role: "REFEREE",
            taskRuleType,
            dayNumber: task.dayNumber,
            minOrders: slab.minOrders,
            maxOrders: slab.maxOrders,
            rewardAmount: slab.rewardAmount,
            taskType: "ORDERS",
          });
        });
      });

      tasksCreate.push({
        role: "REFERRER",
        taskRuleType,
        rewardAmount: referrerReward.amount,
        taskType: "ORDERS",
      });
    }

    const program = await prisma.program.create({
      data: {
        name,
        description: description || null,
        programType,
        cityId: Array.isArray(cityId) ? cityId : [],
        pincodeIds: Array.isArray(pincodeIds) ? pincodeIds : [],
        trackingType,
        ruleType,
        applicableWhen: "WITH_REFERRAL",

        referralConfig: {
          create: {
            rewardFlow: referralConfig.rewardFlow,
            maxReferralsPerUser: referralConfig.maxReferralsPerUser || null,
            maxEarningPerUser: referralConfig.maxEarningPerUser || null,
          },
        },

        targets: targetsCreate.length ? { create: targetsCreate } : undefined,
        slabs: slabsCreate.length ? { create: slabsCreate } : undefined,
        tasks: tasksCreate.length ? { create: tasksCreate } : undefined,

        validFrom: new Date(validFrom),
        validTill: new Date(validTill),
        isActive: isActive ?? true,
        priority: priority || 1,
        weekStartDay: weekStartDay || "MON",
        daysOfWeek:
          daysOfWeek || ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      },
      include: {
        referralConfig: true,
        targets: true,
        slabs: true,
        tasks: true,
      },
    });
   const formattedProgram = buildReferralProgramResponse(program);

    return res.status(201).json({
      success: true,
      message: "Referral program created successfully",
      data: formattedProgram,
    });
  } catch (error) {
    console.error("Create referral program error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.updateReferralConfig = async (req, res) => {
  try {
    const { programId } = req.params;

    const {
      name,
      description,
      trackingType,
      ruleType,
      validFrom,
      validTill,
      isActive,
      weekStartDay,

      cityId,
      pincodeIds,

      referralConfig,
      targetOrders,
      slabs,
      tasks
    } = req.body;

    const existingProgram = await prisma.program.findUnique({
      where: { id: programId }
    });

    if (!existingProgram) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    const today = new Date();

    if (
      existingProgram.validFrom &&
      existingProgram.validTill &&
      today < existingProgram.validFrom
    ) {
      return res.status(400).json({
        success: false,
        message: "You can update only within the active program period"
      });
    }

    if (
      existingProgram.validFrom &&
      existingProgram.validTill &&
      today > existingProgram.validTill
    ) {
      return res.status(400).json({
        success: false,
        message: "Program period expired. You cannot update this program"
      });
    }

    await prisma.program.update({
      where: { id: programId },
      data: {
        name: name || existingProgram.name,
        description: description ?? existingProgram.description,

        trackingType: trackingType || existingProgram.trackingType,
        ruleType: ruleType || existingProgram.ruleType,

        validFrom: validFrom ? new Date(validFrom) : existingProgram.validFrom,
        validTill: validTill ? new Date(validTill) : existingProgram.validTill,

        isActive: isActive ?? existingProgram.isActive,
        weekStartDay: weekStartDay || existingProgram.weekStartDay,

        cityId: Array.isArray(cityId) ? cityId : existingProgram.cityId,
        pincodeIds: Array.isArray(pincodeIds)
          ? pincodeIds
          : existingProgram.pincodeIds,

        referralConfig: referralConfig
          ? {
              update: {
                rewardFlow:
                  referralConfig.rewardFlow ||
                  existingProgram.rewardFlow,

                maxReferralsPerUser:
                  referralConfig.maxReferralsPerUser !== undefined
                    ? Number(referralConfig.maxReferralsPerUser)
                    : undefined,

                maxEarningPerUser:
                  referralConfig.maxEarningPerUser !== undefined
                    ? Number(referralConfig.maxEarningPerUser)
                    : undefined
              }
            }
          : undefined
      }
    });

    if (targetOrders !== undefined) {
      await prisma.programTarget.updateMany({
        where: { programId },
        data: {
          targetOrders: Number(targetOrders)
        }
      });
    }

    if (Array.isArray(slabs)) {
      await prisma.programSlab.deleteMany({
        where: { programId }
      });

      await prisma.programSlab.createMany({
        data: slabs.map((slab) => ({
          programId,
          role: slab.role,
          minValue: Number(slab.minValue),
          maxValue:
            slab.maxValue !== undefined && slab.maxValue !== null
              ? Number(slab.maxValue)
              : null,
          rewardAmount: Number(slab.rewardAmount)
        }))
      });
    }

    if (Array.isArray(tasks)) {
      await prisma.programTask.deleteMany({
        where: { programId }
      });

      await prisma.programTask.createMany({
        data: tasks.map((task) => ({
          programId,
          role: task.role || "REFEREE",
          dayNumber:
            task.dayNumber !== undefined && task.dayNumber !== null
              ? Number(task.dayNumber)
              : null,
          minOrders: Number(task.minOrders),
          rewardAmount: Number(task.rewardAmount)
        }))
      });
    }

    const finalProgram = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        referralConfig: true,
        targets: true,
        slabs: true,
        tasks: true
      }
    });

    return res.status(200).json({
      success: true,
      message: "Referral config updated successfully",
      data: finalProgram
    });
  } catch (error) {
    console.error("Update referral config error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
exports.getAllReferralConfigs = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: {
        programType: "REFERRAL"
      },
      include: {
        referralConfig: true,
        targets: true,
        tasks: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      data: programs.map((program) => ({
        id: program.referralConfig?.id,
        programId: program.id,
        title: program.name,
        description: program.description,
        targetOrderCount: program.targets[0]?.targetOrders || 0,
        referralRewardAmount: program.targets[0]?.rewardAmount || 0,
        joiningBonusAmount: program.tasks[0]?.rewardAmount || 0,
        rewardFlow: program.referralConfig?.rewardFlow,
        validFrom: program.validFrom,
        validTill: program.validTill,
        isActive: program.isActive
      }))
    });
  } catch (error) {
    console.error("Get referral configs error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateReferralConfigStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false"
      });
    }

    const existingConfig = await prisma.referralConfig.findUnique({
      where: { id },
      include: {
        program: true
      }
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Referral config not found"
      });
    }

    await prisma.program.update({
      where: {
        id: existingConfig.programId
      },
      data: {
        isActive: isActive
      }
    });

    return res.status(200).json({
      success: true,
      message: "Referral config status updated successfully"
    });
  } catch (error) {
    console.error("Update referral config status error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllReferrals = async (req, res) => {
  try {
    const { status } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const referrals = await prisma.referral.findMany({
      skip,
      take: limit,
      include: {
        program: {
          include: {
            targets: true,
            tasks: true
          }
        },
        referrer: {
          select: {
            id: true,
            partnerId: true,
            phoneNumber: true
          }
        },
        referee: {
          select: {
            id: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedData = referrals.map((referral) => {
      let referralStatus = "TARGET_IN_PROGRESS";

      if (referral.isCompleted && !referral.rewardGiven) {
        referralStatus = "TARGET_ACHIEVED";
      }

      if (referral.rewardGiven) {
        referralStatus = "REWARD_CREDITED";
      }

      return {
        id: referral.id,
        referrerRiderId: referral.referrerId,
        referredRiderId: referral.refereeId,
        referralCode: referral.referralCode,

        completedOrderCount: referral.totalOrders,
        targetOrderCount: referral.targetOrders,

        referralRewardAmount: referral.program.targets[0]?.rewardAmount || 0,
        joiningBonusAmount: referral.program.tasks[0]?.rewardAmount || 0,

        status: referralStatus
      };
    });

    const filteredData = status
      ? formattedData.filter((item) => item.status === status)
      : formattedData;

    const totalCount = filteredData.length;

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalCount,
      data: filteredData
    });
  } catch (error) {
    console.error("Get all referrals error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.creditReferralReward = async (req, res) => {
    
  try {
    const { id } = req.params;

    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        program: {
          include: {
            targets: true
          }
        }
      }
    });
    console.log(referral);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Referral record not found"
      });
    }

    if (referral.rewardGiven) {
      return res.status(400).json({
        success: false,
        message: "Referral reward already credited"
      });
    }

    const rewardAmount =
      referral.program.targets[0]?.rewardAmount || 0;

    if (rewardAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reward amount"
      });
    }

    await prisma.$transaction(async (tx) => {
      // wallet create if not exists
      const wallet = await tx.riderWallet.upsert({
        where: {
          riderId: referral.referrerId
        },
        update: {
          balance: { increment: rewardAmount },
          totalEarned: { increment: rewardAmount }
        },
        create: {
          riderId: referral.referrerId,
          balance: rewardAmount,
          totalEarned: rewardAmount,
          totalWithdrawn: 0
        }
      });

      // payout history
      await tx.programPayout.create({
        data: {
          riderId: referral.referrerId,
          programId: referral.programId,
          amount: rewardAmount,
          status: "CREDITED",
          creditedAt: new Date()
        }
      });

      // referral update
      await tx.referral.update({
        where: { id },
        data: {
          rewardGiven: true,
          rewardGivenAt: new Date(),
          isCompleted: true,
          completedAt: new Date()
        }
      });
    });

    return res.status(200).json({
      success: true,
      message: "Referral reward credited successfully",
      data: {
        creditedToRiderId: referral.referrerId,
        amount: rewardAmount,
        status: "REWARD_CREDITED"
      }
    });
  } catch (error) {
    console.error("Credit referral reward error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
exports.getReferralProgramByRiderPincode = async (req, res) => {
  try {
    const { riderId } = req.params;

    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId }
    });

    if (!riderLocation || !riderLocation.pincode) {
      return res.status(404).json({
        success: false,
        message: "Rider pincode not found"
      });
    }

    const riderPincode = String(riderLocation.pincode).trim();
    const today = new Date();

    const allPrograms = await prisma.program.findMany({
      where: {
        programType: "REFERRAL"
      },
      include: {
        referralConfig: true,
        targets: true,
        slabs: true,
        tasks: true
      }
    });

    const matchedPrograms = allPrograms.filter((program) => {
      const programPincodes = Array.isArray(program.pincodeIds)
        ? program.pincodeIds.map((pin) => String(pin).trim())
        : [];

      const isActiveMatched = program.isActive === true;

      const dateMatched =
        program.validFrom &&
        program.validTill &&
        program.validFrom <= today &&
        program.validTill >= today;

      const pincodeMatched = programPincodes.includes(riderPincode);

      return isActiveMatched && dateMatched && pincodeMatched;
    });

    return res.status(200).json({
      success: true,
      message: "Referral programs fetched successfully",
      riderPincode,
      today,
      totalPrograms: matchedPrograms.length,
      debug: allPrograms.map((program) => ({
        programId: program.id,
        name: program.name,
        isActive: program.isActive,
        validFrom: program.validFrom,
        validTill: program.validTill,
        pincodeIds: program.pincodeIds,
        pincodeMatched: program.pincodeIds
          ?.map((pin) => String(pin).trim())
          .includes(riderPincode),
        dateMatched:
          program.validFrom <= today && program.validTill >= today
      })),
      data: matchedPrograms
    });
  } catch (error) {
    console.error("Get referral program error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};