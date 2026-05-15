const prisma = require("../config/prisma");

//HELPERS 

const isValidDate = (date) => !isNaN(new Date(date).getTime());

function getProgramStatus(program) {
  const now = new Date();

  if (!program.isActive) return "DISABLED";
  if (now < program.validFrom) return "UPCOMING";
  if (now > program.validTill) return "EXPIRED";
  return "RUNNING";
}

// VALIDATION 

const validateRequest = (body) => {
  const {
    name,
    ruleType,
    dateRange,
    weekConfig,
    slabs,
    target,
    reward,
    pincodeIds
  } = body;

  if (!name) return "name is required";

  if (!ruleType) return "ruleType is required";

  if (!weekConfig?.weekStartDay)
    return "weekStartDay is required";

  if (!dateRange?.startDate || !dateRange?.endDate)
    return "dateRange is required";

  if (!isValidDate(dateRange.startDate) || !isValidDate(dateRange.endDate))
    return "Invalid date format";

  // PINCODE REQUIRED
  if (!pincodeIds || !Array.isArray(pincodeIds) || pincodeIds.length === 0) {
    return "pincodeIds is required and must be a non-empty array";
  }

  if (ruleType === "SLAB") {
    if (!slabs || slabs.length === 0) {
      return "slabs required for SLAB";
    }
  }

  if (ruleType === "FIXED_TARGET" && !target)
    return "target required for FIXED_TARGET";

if (
  ruleType === "FIXED_TARGET" &&
  reward?.amount == null
)
  return "reward.amount required";
  if (ruleType === "HYBRID" && !body.conditions) {
  return "conditions required for HYBRID";
}

if (
  ruleType === "HYBRID" &&
  body.reward?.amount == null
) {
  return "reward.amount required for HYBRID";
}
if (ruleType === "TASK") {

  if (
    !body.tasks ||
    !Array.isArray(body.tasks) ||
    body.tasks.length === 0
  ) {
    return "tasks required for TASK";
  }

  const allowedTaskRuleTypes = [
    "FIXED_TARGET",
    "PER_ORDER",
    "HYBRID",
    "SLAB"
  ];

  for (const task of body.tasks) {

    if (!task.taskRuleType) {
      return "taskRuleType required";
    }

    if (
      !allowedTaskRuleTypes.includes(task.taskRuleType)
    ) {
      return `Invalid taskRuleType: ${task.taskRuleType}`;
    }
  }

  const slabTasks = body.tasks.filter(
    t => t.taskRuleType === "SLAB"
  );

  if (slabTasks.length > 1) {
    return "Only one SLAB task supported currently";
  }
}
  return null;
};

//  CREATE

exports.createWeeklyIncentive = async (req, res) => {
  try {
    const error = validateRequest(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const {
      name,
      cityId,
      pincodeIds,
      weekConfig,
      dateRange,
      ruleType,
      slabs,
      target,
      reward,
      conditions,
      consistencyRule,
      constraints,
      maxPayoutPerWeek,
      isActive,
      tasks
    } = req.body;

    const newStart = new Date(dateRange.startDate);
    const newEnd = new Date(dateRange.endDate);

    // CONFLICT CHECK 

   const existingPrograms = await prisma.program.findMany({
  where: {
    programType: "WEEKLY_TARGET",
    trackingType: "WEEKLY",
    isActive: true,
    validTill: { gte: new Date() }, 
    pincodeIds: {
      hasSome: pincodeIds
    }
  }
});

    for (const prog of existingPrograms) {
      const oldStart = new Date(prog.validFrom);
      const oldEnd = new Date(prog.validTill);

      const overlap =
        newStart <= oldEnd && newEnd >= oldStart;

      if (overlap) {
        return res.status(400).json({
          success: false,
          message:
            "Active weekly incentive already exists for this pincode in this date range"
        });
      }
    }

    //  OPTIONAL CONSTRAINTS 

    const minAcceptanceRate =
      constraints?.minAcceptanceRate ??
      conditions?.minAcceptanceRate ??
      null;

    const minCompletionRate =
      constraints?.minCompletionRate ??
      conditions?.minCompletionRate ??
      null;

    // CREATE 

    const program = await prisma.program.create({
      data: {
        tasks: tasks?.length
  ? {
create: tasks.map((task) => ({

  dayNumber: task.dayNumber,

  taskType: "ORDERS",

  taskRuleType: task.taskRuleType,

  //////////////////////////////////////////////////
  // FIXED TARGET
  //////////////////////////////////////////////////

  targetOrders:
    task.target?.orders || null,

  fixedReward:
    task.reward?.amount || null,

  //////////////////////////////////////////////////
  // PER ORDER
  //////////////////////////////////////////////////

  rewardPerOrder:
    task.rewardPerOrder || null,

  maxOrders:
    task.maxOrders || null,

  maxEarning:
    task.maxEarning || null,

  //////////////////////////////////////////////////
  // HYBRID
  //////////////////////////////////////////////////

  minOrders:
    task.conditions?.minOrders || null,

  minAcceptanceRate:
    task.conditions?.minAcceptanceRate || null,

  minEarnings:
    task.conditions?.minEarnings || null,

  rewardAmount:
    task.taskRuleType === "HYBRID"
      ? task.reward?.amount || 0
      : 0
}))
    }
  : undefined,
        name,
        programType: "WEEKLY_TARGET",
        trackingType: "WEEKLY",
        ruleType,

        cityId: cityId ? [cityId] : [],
        pincodeIds,

        weekStartDay: weekConfig.weekStartDay,
        daysOfWeek: ["MON","TUE","WED","THU","FRI","SAT","SUN"],

        validFrom: newStart,
        validTill: newEnd,

        minAcceptanceRate,
        minCompletionRate,

        maxPayoutPerWeek,
        isActive: isActive ?? true,
        //  FIXED TARGET 
        slabs:
  ruleType === "SLAB" && slabs?.length
    ? {
        create: slabs.map((s) => ({
          minValue: s.minOrders,
          maxValue: s.maxOrders,
          rewardAmount: s.rewardAmount
        }))
      }

    : ruleType === "TASK" &&
      tasks?.[0]?.slabs?.length

    ? {
        create: tasks[0].slabs.map((s) => ({
          minValue: s.minOrders,
          maxValue: s.maxOrders,
          rewardAmount: s.rewardAmount
        }))
      }

    : undefined,
        targets: target
          ? {
              create: {
                targetOrders: target.orders,
                rewardAmount: reward?.amount || 0
              }
            }
          : undefined,

        // HYBRID 
        rules: conditions
          ? {
              create: {
                minOrders: conditions.minOrders,
                minEarnings: conditions.minEarnings
              }
            }
          : undefined,

        //  CONSISTENCY 
        consistency: consistencyRule
          ? {
              create: {
                minActiveDays: consistencyRule.minActiveDays,
                minOrdersPerDay: consistencyRule.minOrdersPerDay
              }
            }
          : undefined
      }
    });

    return res.json({
      success: true,
      message: "Weekly incentive created successfully",
      data: {
        id: program.id,
        name: program.name
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
};
exports.updateWeeklyIncentive = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    // SLAB VALIDATION
    if (req.body.slabs) {
      if (!Array.isArray(req.body.slabs) || req.body.slabs.length === 0) {
        return res.status(400).json({
          success: false,
          message: "slabs must be a non-empty array"
        });
      }
    }

    // TARGET VALIDATION
    if (
  req.body.target &&
  req.body.reward?.amount == null
) {
      return res.status(400).json({
        success: false,
        message: "reward.amount required with target"
      });
    }

    //  STATUS CHECK 
    const now = new Date();

    let status;
    if (!program.isActive) status = "DISABLED";
    else if (now < program.validFrom) status = "UPCOMING";
    else if (now > program.validTill) status = "EXPIRED";
    else status = "RUNNING";

    if (status !== "UPCOMING") {
      return res.status(400).json({
        success: false,
        message: `Cannot update program. Status is ${status}`
      });
    }

    const {
      name,
      dateRange,
      isActive,
      slabs,
      target,
      reward,
      conditions,
      consistencyRule
    } = req.body;

    const updatedProgram = await prisma.$transaction(async (tx) => {

      //  MAIN UPDATE 
     const updated = await tx.program.update({
  where: { id },
  data: {
    name,
    validFrom: dateRange?.startDate
      ? new Date(dateRange.startDate)
      : undefined,
    validTill: dateRange?.endDate
      ? new Date(dateRange.endDate)
      : undefined,
    isActive
  },
  include: {
    slabs: true   
  }
});

//  SLABS
if (slabs) {

  const normalizedSlabs = slabs.map((s, index) => {

    //  require ALL fields
    if (
      s.minOrders == null ||
      s.maxOrders == null ||
      s.rewardAmount == null
    ) {
      throw new Error(
        `Invalid slab at index ${index}. minOrders, maxOrders, rewardAmount are required`
      );
    }

    // invalid range
    if (s.minOrders > s.maxOrders) {
      throw new Error(
        `Invalid slab at index ${index}. minOrders cannot be greater than maxOrders`
      );
    }

    return {
      programId: id,
      minValue: s.minOrders,
      maxValue: s.maxOrders,
      rewardAmount: s.rewardAmount
    };
  });

  await tx.programSlab.deleteMany({
    where: { programId: id }
  });

  await tx.programSlab.createMany({
    data: normalizedSlabs
  });
}

      //  TARGET 
      if (target) {
        await tx.programTarget.deleteMany({
          where: { programId: id }
        });

        await tx.programTarget.create({
          data: {
            programId: id,
            targetOrders: target.orders,
            rewardAmount: reward?.amount || 0
          }
        });
      }

      //  HYBRID 
      if (conditions) {
        await tx.programRule.deleteMany({
          where: { programId: id }
        });

        await tx.programRule.create({
          data: {
            programId: id,
            minOrders: conditions.minOrders,
            minEarnings: conditions.minEarnings
          }
        });
      }

      // CONSISTENCY
      if (consistencyRule) {
        await tx.programConsistency.deleteMany({
          where: { programId: id }
        });

        await tx.programConsistency.create({
          data: {
            programId: id,
            minActiveDays: consistencyRule.minActiveDays,
            minOrdersPerDay: consistencyRule.minOrdersPerDay
          }
        });
      }

      return updated;
    });

    return res.json({
      success: true,
      message: "Program updated successfully",
      data: updatedProgram
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update program"
    });
  }
};
//GET ALL 

exports.getAllWeeklyIncentives = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: {
        programType: "WEEKLY_TARGET",
        trackingType: "WEEKLY"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const response = programs.map(p => ({
      id: p.id,
      name: p.name,
      ruleType: p.ruleType,
      isActive: p.isActive,
      status: getProgramStatus(p) 
    }));

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

//  GET BY ID 

exports.getWeeklyIncentiveById = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        slabs: true,
        targets: true,
        rules: true,
        consistency: true,
        tasks: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    const response = {
      id: program.id,
      name: program.name,
      ruleType: program.ruleType,
      status: getProgramStatus(program) 
    };

    if (program.ruleType === "SLAB" && program.slabs?.length) {
      response.slabs = program.slabs.map(s => ({
        minOrders: s.minValue,
        maxOrders: s.maxValue,
        rewardAmount: s.rewardAmount
      }));
    }

    if (program.ruleType === "FIXED_TARGET" && program.targets?.[0]) {
      response.target = {
        orders: program.targets[0].targetOrders
      };
      response.reward = {
        amount: program.targets[0].rewardAmount
      };
    }

    if (program.ruleType === "HYBRID" && program.rules?.[0]) {
      response.conditions = {
        minOrders: program.rules[0].minOrders,
        minEarnings: program.rules[0].minEarnings
      };
    }
////////////////////////////////////////////////////
// TASK
////////////////////////////////////////////////////

if (program.ruleType === "TASK") {

  response.tasks = program.tasks.map((task) => {

    const result = {
      dayNumber: task.dayNumber
    };

    ////////////////////////////////////////////////
    // FIXED TARGET
    ////////////////////////////////////////////////

switch (task.taskRuleType) {

  case "FIXED_TARGET":

    result.taskRuleType = "FIXED_TARGET";

    result.target = {
      orders: task.targetOrders
    };

    result.reward = {
      amount: task.fixedReward
    };

    break;

  case "PER_ORDER":

    result.taskRuleType = "PER_ORDER";

    result.rewardPerOrder =
      task.rewardPerOrder;

    result.maxOrders =
      task.maxOrders;

    result.maxEarning =
      task.maxEarning;

    break;

  case "HYBRID":

    result.taskRuleType = "HYBRID";

    result.conditions = {
      minOrders: task.minOrders,
      minAcceptanceRate: task.minAcceptanceRate,
      minEarnings: task.minEarnings
    };

    result.reward = {
      amount: task.rewardAmount
    };

    break;

  case "SLAB":

    result.taskRuleType = "SLAB";

    result.slabs =
      program.slabs.map((s) => ({
        minOrders: s.minValue,
        maxOrders: s.maxValue,
        rewardAmount: s.rewardAmount
      }));

    break;
}
    return result;
  });
}
    if (program.consistency) {
      response.consistencyRule = {
        minActiveDays: program.consistency.minActiveDays,
        minOrdersPerDay: program.consistency.minOrdersPerDay
      };
    }

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch details" });
  }
};
exports.deleteWeeklyIncentive = async (req, res) => {
  try {
    const { id } = req.params;

    //  Fetch program
    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    //  Get status
    const now = new Date();

    let status;
    if (!program.isActive) status = "DISABLED";
    else if (now < program.validFrom) status = "UPCOMING";
    else if (now > program.validTill) status = "EXPIRED";
    else status = "RUNNING";

    //  Restrict delete
    if (status !== "UPCOMING") {
      return res.status(400).json({
        success: false,
        message: `Cannot delete program. Status is ${status}`
      });
    }

    //  Delete
    await prisma.program.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: "Program deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete program"
    });
  }
};