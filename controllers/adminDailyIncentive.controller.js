// controllers/adminDailyIncentive.controller.js

const prisma = require("../config/prisma");


function isValidDateString(dateStr) {
  if (!dateStr) return false;

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return false;

  const [year, month, day] =
    dateStr.split("-").map(Number);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

exports.createDailyIncentive = async (req, res) => {
  try {
    const {
      name,
      cityId,
      pincodeIds = [],
      dateRange,
      daysOfWeek = [],
      ruleType,

      slabs,
      target,
      reward,
      conditions,
      constraints,
      tasks,

      maxPayoutPerDay,

      isActive = true
    } = req.body;

    if (!name || !ruleType || !dateRange) {
      return res.status(400).json({
        success: false,
        message:
          "name, ruleType and dateRange are required"
      });
    }

    if (
      (!pincodeIds || pincodeIds.length === 0)
      && !cityId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Either pincodeIds or cityId is required"
      });
    }


    const { startDate, endDate } = dateRange;

    if (
      !isValidDateString(startDate)
      || !isValidDateString(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid date format or invalid calendar date"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message:
          "startDate cannot be greater than endDate"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message:
          "startDate cannot be in the past"
      });
    }

    if (
      ![
        "SLAB",
        "FIXED_TARGET",
        "HYBRID",
        "PER_ORDER",
        "TASK"
      ].includes(ruleType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ruleType"
      });
    }

    if (ruleType === "SLAB") {

      if (!slabs || slabs.length === 0) {
        return res.status(400).json({
          success: false,
          message: "slabs are required"
        });
      }

      for (const slab of slabs) {

        if (
          slab.minOrders <= 0
          || slab.maxOrders <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Orders must be greater than 0"
          });
        }

        if (slab.minOrders > slab.maxOrders) {
          return res.status(400).json({
            success: false,
            message:
              "minOrders cannot be greater than maxOrders"
          });
        }
      }
    }

    /**
     * IMPORTANT:
     * Same city can have multiple incentives
     * BUT same pincode + overlapping dates
     * should not have duplicate incentives
     */

    if (
      pincodeIds &&
      pincodeIds.length > 0
    ) {

      const existingProgram =
        await prisma.program.findFirst({
          where: {
            programType: "DAILY_TARGET",
            trackingType: "DAILY",
            isActive: true,

            AND: [
              {
                validFrom: {
                  lte: end
                }
              },
              {
                validTill: {
                  gte: start
                }
              }
            ],

            pincodeIds: {
              hasSome: pincodeIds
            }
          }
        });

      if (existingProgram) {
        return res.status(400).json({
          success: false,
          message:
            "Incentive already exists for this pincode and date range"
        });
      }
    }
    const weekStartDay =
      daysOfWeek?.[0] || "MON";

    const programData = {
      name,

      programType: "DAILY_TARGET",

      trackingType: "DAILY",

      ruleType,

      cityId: cityId ? [cityId] : [],

      pincodeIds,

      validFrom: start,

      validTill: end,

      daysOfWeek,

      weekStartDay,

      minAcceptanceRate:
        constraints?.minAcceptanceRate
        || conditions?.minAcceptanceRate,

      minCompletionRate:
        constraints?.minCompletionRate
        || conditions?.minCompletionRate,

      maxPayoutPerDay,

      isActive
    };

    if (ruleType === "SLAB") {

      programData.slabs = {
        create: slabs.map((s) => ({
          minValue: s.minOrders,
          maxValue: s.maxOrders,
          rewardAmount: s.rewardAmount
        }))
      };
    }

    if (ruleType === "FIXED_TARGET") {

      programData.targets = {
        create: {
          targetOrders:
            target?.orders,

          rewardAmount:
            reward?.amount
        }
      };
    }

    if (ruleType === "PER_ORDER") {

      if (
        !reward?.perOrderAmount
        || reward.perOrderAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid perOrderAmount is required"
        });
      }

      programData.rules = {
        create: {
          perOrderAmount:
            reward.perOrderAmount
        }
      };
    }

 
    if (ruleType === "HYBRID") {

      programData.rules = {
        create: {
          minOrders:
            conditions?.minOrders,

          minEarnings:
            conditions?.minEarnings
        }
      };

      programData.targets = {
        create: {
          rewardAmount:
            reward?.amount
        }
      };
    }

    if (ruleType === "TASK") {

      if (!tasks || tasks.length === 0) {
        return res.status(400).json({
          success: false,
          message: "tasks are required"
        });
      }

      programData.tasks = {
        create: tasks.map((t) => ({
          dayNumber:
            t.dayNumber,

          taskRuleType:
            t.taskRuleType,

          targetOrders:
            t.target?.orders || null,

          fixedReward:
            t.reward?.amount || null,

          

          rewardPerOrder:
            t.rewardPerOrder || null,

          maxOrders:
            t.maxOrders || null,

          maxEarning:
            t.maxEarning || null,

          minOrders:
            t.conditions?.minOrders || null,

          minAcceptanceRate:
            t.conditions?.minAcceptanceRate || null,

          minEarnings:
            t.conditions?.minEarnings || null,

          rewardAmount:
            t.reward?.amount || 0
        }))
      };

      const slabTasks =
        tasks.filter(
          (t) =>
            t.taskRuleType === "SLAB"
        );

      if (slabTasks.length > 0) {

        programData.slabs = {
          create: slabTasks.flatMap((t) =>
            t.slabs.map((s) => ({
              minValue:
                s.minOrders,

              maxValue:
                s.maxOrders,

              rewardAmount:
                s.rewardAmount
            }))
          )
        };
      }
    }

    const program =
      await prisma.program.create({
        data: programData
      });


    return res.status(201).json({
      success: true,
      message:
        "Daily incentive created successfully",

      data: {
        id: program.id,
        name: program.name
      }
    });

  } catch (error) {

    console.error(
      "CREATE DAILY INCENTIVE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message || "Server error"
    });
  }
};

// UPDATE DAILY INCENTIVE
exports.updateDailyIncentive = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.program.update({
      where: { id },
      data: req.body
    });

    return res.json({
      success: true,
      message: "Daily incentive updated",
      data: updated
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL DAILY INCENTIVES

exports.getAllDailyIncentives = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: {
        programType: "DAILY_TARGET",
        trackingType: "DAILY",

        //  EXCLUDE PEAK SLOT PROGRAMS
        slots: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        ruleType: true,
        isActive: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      data: programs
    });

  } catch (error) {
    console.error("GET ALL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
// GET DAILY INCENTIVE DETAILS
exports.getDailyIncentiveById = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findFirst({
      where: {
        id,
        programType: "DAILY_TARGET",
        trackingType: "DAILY",

        //exclude peak slots
        slots: { none: {} }
      },
      include: {
        slabs: true,
        rules: true,
        targets: true,
        tasks: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Daily incentive not found"
      });
    }
    const formatDate = (date) =>
      date ? date.toISOString().split("T")[0] : null;
    // FORMAT RESPONSE


    const response = {
      id: program.id,
      name: program.name,
      type: "DAILY",
      cityId: program.cityId?.[0] || null,
      pincodeIds: program.pincodeIds || [],

      dateRange: {
        startDate: formatDate(program.validFrom),
        endDate: formatDate(program.validTill)
      },

      ruleType: program.ruleType,
      isActive: program.isActive
    };
    if (program.maxPayoutPerDay != null) {
      response.maxPayoutPerDay = program.maxPayoutPerDay;
    }

    // SLAB

    if (program.ruleType === "SLAB") {
      response.slabs = program.slabs.map(s => ({
        minOrders: s.minValue,
        maxOrders: s.maxValue,
        rewardAmount: s.rewardAmount
      }));
    }

    // FIXED TARGET

    if (program.ruleType === "FIXED_TARGET") {
      response.target = {
        orders: program.targets?.[0]?.targetOrders || null
      };

      response.reward = {
        amount: program.targets?.[0]?.rewardAmount || null
      };
    }

    // HYBRID

    if (program.ruleType === "HYBRID") {
      response.conditions = {
        minOrders: program.rules?.[0]?.minOrders || null,
        minEarnings: program.rules?.[0]?.minEarnings || null,
        minAcceptanceRate: program.minAcceptanceRate || null,
        minCompletionRate: program.minCompletionRate || null
      };

      response.reward = {
        amount: program.targets?.[0]?.rewardAmount || null
      };
    }
    // TASK

    if (program.ruleType === "TASK") {

      response.tasks = program.tasks.map((t) => {

        const task = {
          dayNumber: t.dayNumber,
          taskRuleType: t.taskRuleType
        };

        // FIXED_TARGET
        if (t.taskRuleType === "FIXED_TARGET") {

          task.target = {
            orders: t.targetOrders
          };

          task.reward = {
            amount: t.fixedReward
          };
        }

        // PER_ORDER
        else if (t.taskRuleType === "PER_ORDER") {

          task.rewardPerOrder = t.rewardPerOrder;
          task.maxOrders = t.maxOrders;
          task.maxEarning = t.maxEarning;
        }

        // HYBRID
        else if (t.taskRuleType === "HYBRID") {

          task.conditions = {
            minOrders: t.minOrders,
            minAcceptanceRate: t.minAcceptanceRate,
            minEarnings: t.minEarnings
          };

          task.reward = {
            amount: t.rewardAmount
          };
        }

        // SLAB
        else if (t.taskRuleType === "SLAB") {

          task.slabs = program.slabs.map((s) => ({
            minOrders: s.minValue,
            maxOrders: s.maxValue,
            rewardAmount: s.rewardAmount
          }));
        }

        return task;
      });
    }
    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("GET ONE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.deleteDailyIncentive = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch program
    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    const now = new Date();

    // Start of today (00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Start of tomorrow (00:00)
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    /**
     * RULE:
     * Allow delete ONLY if program is for future (>= tomorrow)
     */
    if (program.validFrom < startOfTomorrow) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete today's or past incentives"
      });
    }

    //  Delete
    await prisma.program.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: "Daily incentive deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete daily incentive"
    });
  }
};