const prisma = require("../config/prisma");

function getWeekKey() {

  const now = new Date();

  const istNow = new Date(
    now.toLocaleString(
      "en-US",
      { timeZone: "Asia/Kolkata" }
    )
  );

  const year =
    istNow.getFullYear();

  const oneJan =
    new Date(year, 0, 1);

  const week = Math.ceil(
    (
      (
        (istNow - oneJan) /
        86400000
      ) +
      oneJan.getDay() +
      1
    ) / 7
  );

  return `${year}-W${week}`;
}
const dayMap = {
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
  7: "SUN"
};
exports.getWeeklyIncentives = async (req, res) => {
  try {

    const riderId =
      req.rider?.id || req.rider?.riderId;

    //////////////////////////////////////////////////
    // RIDER LOCATION
    //////////////////////////////////////////////////

    const riderLocation =
      await prisma.riderLocation.findUnique({
        where: { riderId }
      });

    if (!riderLocation?.pincode) {
      return res.json({
        success: true,
        data: []
      });
    }

    //////////////////////////////////////////////////
    // ACTIVE PROGRAMS
    //////////////////////////////////////////////////

    const now = new Date();

    const programs =
      await prisma.program.findMany({
        where: {
          programType: "WEEKLY_TARGET",
          trackingType: "WEEKLY",
          isActive: true,

          pincodeIds: {
            has: riderLocation.pincode
          },

          validFrom: {
            lte: now
          },

          validTill: {
            gte: now
          }
        },

        include: {
          slabs: true,
          tasks: true
        },

        orderBy: {
          createdAt: "desc"
        }
      });

    if (!programs.length) {
      return res.json({
        success: true,
        data: []
      });
    }

    //////////////////////////////////////////////////
    // WEEK KEY
    //////////////////////////////////////////////////

    const week = getWeekKey();

    //////////////////////////////////////////////////
    // TASK PROGRESSES
    //////////////////////////////////////////////////

    const taskProgresses =
      await prisma.programTaskProgress.findMany({
        where: {
          riderId,
          programId: {
            in: programs.map((p) => p.id)
          }
        }
      });

    //////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////

    const response = [];

    for (const program of programs) {

      //////////////////////////////////////////////////
      // NORMAL PROGRAMS
      //////////////////////////////////////////////////

      if (program.ruleType !== "TASK") {

        const progProgress =
          await prisma.programProgress.findFirst({
            where: {
              riderId,
              programId: program.id,
              week
            }
          });

        response.push({
          programId: program.id,

          name: program.name,

          type: "WEEKLY",

          ruleType: program.ruleType,

          ordersCompleted:
            progProgress?.totalOrders || 0,

          rewardEarned:
            progProgress?.rewardAmount || 0,

          status:
            progProgress?.achieved
              ? "ACHIEVED"
              : (
                  (progProgress?.totalOrders || 0) > 0
                )
              ? "IN_PROGRESS"
              : "NOT_STARTED"
        });

        continue;
      }

      //////////////////////////////////////////////////
      // TASK PROGRAMS
      //////////////////////////////////////////////////

      let totalRewardEarned = 0;

      let completedDays = 0;

      const totalDays =
        program.tasks.length;

      const sortedTasks =
        [...program.tasks].sort(
          (a, b) =>
            a.dayNumber - b.dayNumber
        );

      const tasks = await Promise.all(

        sortedTasks.map(
          async (task, index) => {

const currentDayNumber = (() => {

  const istNow = new Date(
    new Date().toLocaleString(
      "en-US",
      { timeZone: "Asia/Kolkata" }
    )
  );

  const jsDay = istNow.getDay();

  if (jsDay === 0) return 7;

  return jsDay;

})();
            let progress =
              taskProgresses.find(
                (p) => p.taskId === task.id
              );

            //////////////////////////////////////////////////
            // CREATE INITIAL ROW
            //////////////////////////////////////////////////
if (
  !progress &&
  task.dayNumber <= currentDayNumber
) {

  progress =
    await prisma.programTaskProgress.create({

      data: {

        riderId,

        programId: program.id,

        taskId: task.id,

        dayNumber: task.dayNumber,

        date: new Date(),

        progressValue: 0,

        isCompleted: false
      }
    });
}

            //////////////////////////////////////////////////
            // VALUES
            //////////////////////////////////////////////////

const progressValue =
  progress?.progressValue || 0;

const isCompleted =
  progress?.isCompleted || false;

          const completedAt =
  progress?.updatedAt || null;

            let rewardEarned = 0;

            //////////////////////////////////////////////////
            // TASK STATUS
            //////////////////////////////////////////////////

//////////////////////////////////////////////////
// TASK STATUS
//////////////////////////////////////////////////

let taskStatus = "PENDING";

//////////////////////////////////////////////////
// LOCK FUTURE DAYS
//////////////////////////////////////////////////

if (task.dayNumber > currentDayNumber) {

  taskStatus = "LOCKED";
}

const isLocked =
  taskStatus === "LOCKED";

const safeProgressValue =
  isLocked ? 0 : progressValue;

const safeCompleted =
  isLocked ? false : isCompleted;

//////////////////////////////////////////////////
// FINAL STATUS LOGIC
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// FINAL STATUS LOGIC
//////////////////////////////////////////////////

if (isLocked) {

  taskStatus = "LOCKED";

} else if (safeCompleted) {

  taskStatus = "COMPLETED";

} else if (
  task.dayNumber === currentDayNumber
) {

  // Current active day
  taskStatus = "RUNNING";

} else {

  // Previous incomplete days
  taskStatus = "PENDING";
}

            //////////////////////////////////////////////////
            // TASK RESPONSE
            //////////////////////////////////////////////////

          const taskResponse = {

  dayNumber:
    task.dayNumber,

dayName:
  dayMap[task.dayNumber],
  taskRuleType:
    task.taskRuleType,

  progress: {}
};

            //////////////////////////////////////////////////
            // FIXED TARGET
            //////////////////////////////////////////////////

            if (
              task.taskRuleType ===
              "FIXED_TARGET"
            ) {

              rewardEarned =
  safeCompleted
                  ? task.fixedReward || 0
                  : 0;

              taskResponse.progress = {

                completedOrders:
  safeProgressValue,

                targetOrders:
                  task.targetOrders,

                remainingOrders:
                  Math.max(
                    (task.targetOrders || 0)
                    - safeProgressValue,
                    0
                  ),

                earnedAmount:
                  rewardEarned,

                status:
                  taskStatus,

isCompleted:
  safeCompleted,
                completedAt
              };
            }

            //////////////////////////////////////////////////
            // PER ORDER
            //////////////////////////////////////////////////

            else if (
              task.taskRuleType ===
              "PER_ORDER"
            ) {

              rewardEarned =
  Math.min(
    safeProgressValue,
    task.maxOrders || 0
  ) *
                (task.rewardPerOrder || 0);

              taskResponse.progress = {

              completedOrders:
  safeProgressValue,

                earnedAmount:
                  rewardEarned,

                remainingOrders:
                  Math.max(
                    (task.maxOrders || 0)
                    - safeProgressValue,
                    0
                  ),

                remainingAmount:
                  Math.max(
                    (task.maxEarning || 0)
                    - rewardEarned,
                    0
                  ),

                status:
                  taskStatus,

isCompleted:
  safeCompleted,
                progressPercentage:
                  task.maxOrders
                    ? Math.min(
                        Math.round(
                          (
                            safeProgressValue
                            / task.maxOrders
                          ) * 100
                        ),
                        100
                      )
                    : 0
              };
            }

            //////////////////////////////////////////////////
            // HYBRID
            //////////////////////////////////////////////////

            else if (
              task.taskRuleType ===
              "HYBRID"
            ) {

              rewardEarned =
  safeCompleted
                  ? task.rewardAmount || 0
                  : 0;

              const currentAcceptanceRate =
  progress?.acceptanceRate || 0;

             const currentEarnings =
  progress?.earnings || 0;
taskResponse.progress = {

  completedOrders:
    safeProgressValue,

  currentAcceptanceRate,

  currentEarnings,

  remainingOrders:
    Math.max(
      (task.minOrders || 0)
      - safeProgressValue,
      0
    ),

  remainingEarnings:
    Math.max(
      (task.minEarnings || 0)
      - currentEarnings,
      0
    ),

  progressPercentage:
    task.minOrders
      ? Math.min(
          Math.round(
            (
              safeProgressValue /
              task.minOrders
            ) * 100
          ),
          100
        )
      : 0,

  status:
    taskStatus,

  isCompleted:
    safeCompleted
};      }

            //////////////////////////////////////////////////
            // SLAB
            //////////////////////////////////////////////////

            else if (
              task.taskRuleType ===
              "SLAB"
            ) {

              const slabs =
                program.slabs
                  .sort(
                    (a, b) =>
                      a.minValue - b.minValue
                  )
                  .map((s) => ({
                    minOrders:
                      s.minValue,

                    maxOrders:
                      s.maxValue,

                    rewardAmount:
                      s.rewardAmount
                  }));

              const matchedSlab =
                program.slabs.find(
                  (s) =>
                    safeProgressValue >= s.minValue &&
safeProgressValue <= s.maxValue
                );

              rewardEarned =
                matchedSlab?.rewardAmount || 0;

             taskResponse.progress = {

  completedOrders:
    safeProgressValue,

  currentSlabReward:
    rewardEarned,

  remainingOrders:
    Math.max(
      (
        Math.max(
          ...program.slabs.map(
            s => s.maxValue
          )
        )
      ) - safeProgressValue,
      0
    ),

  progressPercentage:
    program.slabs?.length
      ? Math.min(
          Math.round(
            (
              safeProgressValue /
              Math.max(
                ...program.slabs.map(
                  s => s.maxValue
                )
              )
            ) * 100
          ),
          100
        )
      : 0,

  status:
    taskStatus,

  isCompleted:
    safeCompleted,

  completedAt
};

            }

            //////////////////////////////////////////////////
            // TOTALS
            //////////////////////////////////////////////////

            totalRewardEarned += rewardEarned;

if (safeCompleted) {
                completedDays++;
            }

            return taskResponse;
          }
        )
      );

      //////////////////////////////////////////////////
      // OVERALL STATUS
      //////////////////////////////////////////////////

      const overallStatus =

        completedDays === totalDays
          ? "COMPLETED"

          : completedDays > 0
          ? "RUNNING"

          : "NOT_STARTED";

      //////////////////////////////////////////////////
      // MAX REWARD
      //////////////////////////////////////////////////

const maxReward =
  program.maxPayoutPerWeek ||

  sortedTasks.reduce((sum, task) => {

    //////////////////////////////////////////////////
    // FIXED_TARGET
    //////////////////////////////////////////////////

    if (
      task.taskRuleType ===
      "FIXED_TARGET"
    ) {
      return sum + (task.fixedReward || 0);
    }

    //////////////////////////////////////////////////
    // HYBRID
    //////////////////////////////////////////////////

    if (
      task.taskRuleType ===
      "HYBRID"
    ) {
      return sum + (task.rewardAmount || 0);
    }

    //////////////////////////////////////////////////
    // PER_ORDER
    //////////////////////////////////////////////////

    if (
      task.taskRuleType ===
      "PER_ORDER"
    ) {
      return sum + (task.maxEarning || 0);
    }

    //////////////////////////////////////////////////
    // SLAB
    //////////////////////////////////////////////////

    if (
      task.taskRuleType ===
      "SLAB"
    ) {

      const highest =
        program.slabs?.length
          ? Math.max(
              ...program.slabs.map(
                (s) => s.rewardAmount
              )
            )
          : 0;

      return sum + highest;
    }

    return sum;

  }, 0);

      //////////////////////////////////////////////////
      // FINAL PUSH
      //////////////////////////////////////////////////

      response.push({

        programId:
          program.id,

        name:
          program.name,

        type:
          "WEEKLY",

        ruleType:
          "TASK",

        status:
          overallStatus,

        validFrom:
          program.validFrom,

        validTill:
          program.validTill,

        weekStartDay:
          program.weekStartDay,

        maxReward,

        overallProgress: {

          completedDays,

          totalDays,

          earnedAmount:
            totalRewardEarned,

          remainingAmount:
            Math.max(
              maxReward
              - totalRewardEarned,
              0
            )
        },

        tasks
      });
    }

    //////////////////////////////////////////////////
    // FINAL RESPONSE
    //////////////////////////////////////////////////

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {

    console.error(
      "Weekly progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch weekly progress"
    });
  }
};
exports.getRiderWeeklyPrograms = async (req, res) => {
  try {
    const riderId = req.rider.id;

    //  Rider pincode
    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId }
    });

    if (!riderLocation?.pincode) {
      return res.json({ success: true, data: [] });
    }

const today = new Date(
  new Date().toLocaleString(
    "en-US",
    { timeZone: "Asia/Kolkata" }
  )
);
    //  Fetch programs WITH FULL DETAILS
    const programs = await prisma.program.findMany({
      where: {
        programType: "WEEKLY_TARGET",
        trackingType: "WEEKLY",
        isActive: true,
        pincodeIds: {
          has: riderLocation.pincode
        },
        validFrom: { lte: today },
        validTill: { gte: today }
      },
      include: {
        slabs: true,
        targets: true,
        rules: true,
        consistency: true,
        tasks: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    //  Format response
    const response = programs.map((p) => {

      //  STATUS CALCULATION
      const status =
        today < p.validFrom ? "UPCOMING" :
        today > p.validTill ? "EXPIRED" :
        "RUNNING";

//  MAX REWARD FIRST
let maxReward = null;

//  SLAB
if (p.ruleType === "SLAB" && p.slabs?.length) {
  maxReward = Math.max(...p.slabs.map(s => s.rewardAmount));
}

//  FIXED TARGET
else if (p.ruleType === "FIXED_TARGET" && p.targets?.[0]) {
  maxReward = p.targets[0].rewardAmount;
}

//  HYBRID
else if (p.ruleType === "HYBRID" && p.targets?.[0]) {
  maxReward = p.targets[0].rewardAmount;
}
//////////////////////////////////////////////////
// TASK
//////////////////////////////////////////////////

else if (
  p.ruleType === "TASK"
  && p.tasks?.length
) {

  const taskRewards = p.tasks.map((t) => {

    ////////////////////////////////////////////////
    // FIXED_TARGET
    ////////////////////////////////////////////////

    if (t.taskRuleType === "FIXED_TARGET") {
      return t.fixedReward || 0;
    }

    ////////////////////////////////////////////////
    // HYBRID
    ////////////////////////////////////////////////

    if (t.taskRuleType === "HYBRID") {
      return t.rewardAmount || 0;
    }

    ////////////////////////////////////////////////
    // PER_ORDER
    ////////////////////////////////////////////////

    if (t.taskRuleType === "PER_ORDER") {
      return t.maxEarning || 0;
    }

    ////////////////////////////////////////////////
    // SLAB
    ////////////////////////////////////////////////

    if (
      t.taskRuleType === "SLAB"
      && p.slabs?.length
    ) {
      return Math.max(
        ...p.slabs.map((s) => s.rewardAmount)
      );
    }

    return 0;
  });

maxReward = taskRewards.reduce(
  (sum, reward) => sum + reward,
  0
);
}
//  fallback
if (maxReward === null) {
  maxReward = p.maxPayoutPerWeek ?? null;
}

const result = {
  programId: p.id,
  name: p.name,
  type: "WEEKLY",
  ruleType: p.ruleType,
  status,
  validFrom: p.validFrom,
  validTill: p.validTill,
  weekStartDay: p.weekStartDay,
  maxReward
};

      //SLAB
      if (p.ruleType === "SLAB" && p.slabs?.length) {
        result.slabs = p.slabs
          .sort((a, b) => a.minValue - b.minValue) 
          .map(s => ({
            minOrders: s.minValue,
            maxOrders: s.maxValue,
            rewardAmount: s.rewardAmount
          }));
      }

      //  FIXED TARGET
      if (p.ruleType === "FIXED_TARGET" && p.targets?.[0]) {
        result.target = {
          orders: p.targets[0].targetOrders
        };
        result.reward = {
          amount: p.targets[0].rewardAmount
        };
      }

      //  HYBRID
      if (p.ruleType === "HYBRID" && p.rules?.[0]) {
        result.conditions = {
          minOrders: p.rules[0].minOrders,
          minEarnings: p.rules[0].minEarnings
        };
      }
// TASK
if (p.ruleType === "TASK" && p.tasks?.length) {

  result.tasks = p.tasks.map((t) => {

    const task = {
      dayNumber: t.dayNumber,
      taskRuleType: t.taskRuleType
    };

    //////////////////////////////////////////////////
    // FIXED TARGET
    //////////////////////////////////////////////////

    if (t.taskRuleType === "FIXED_TARGET") {

      task.target = {
        orders: t.targetOrders
      };

      task.reward = {
        amount: t.fixedReward
      };
    }

    //////////////////////////////////////////////////
    // PER ORDER
    //////////////////////////////////////////////////

    else if (t.taskRuleType === "PER_ORDER") {

      task.rewardPerOrder = t.rewardPerOrder;

      task.maxOrders = t.maxOrders;

      task.maxEarning = t.maxEarning;
    }

    //////////////////////////////////////////////////
    // HYBRID
    //////////////////////////////////////////////////

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

    //////////////////////////////////////////////////
    // SLAB
    //////////////////////////////////////////////////

else if (t.taskRuleType === "SLAB") {

  task.slabs = p.slabs
    .sort((a, b) => a.minValue - b.minValue)
    .map((s) => ({
      minOrders: s.minValue,
      maxOrders: s.maxValue,
      rewardAmount: s.rewardAmount
    }));
}

    return task;
  });
}
      // CONSISTENCY
      if (p.consistency) {
        result.consistencyRule = {
          minActiveDays: p.consistency.minActiveDays,
          minOrdersPerDay: p.consistency.minOrdersPerDay
        };
      }

      return result;
    });

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Weekly programs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly programs"
    });
  }
};