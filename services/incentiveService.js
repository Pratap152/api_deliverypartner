const prisma =
require("../config/prisma");

const {
  notifyRiderIncentive
} = require("../webSocket");

////////////////////////////////////////////////////////
// WEEK KEY
////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////
// MAIN SERVICE
////////////////////////////////////////////////////////

exports.processOrderIncentive =
async ({
  riderId,
  orderId
}) => {

  //////////////////////////////////////////////////////
  // DUPLICATE CHECK
  //////////////////////////////////////////////////////

  const existingProcessed =
    await prisma.processedOrder
      .findUnique({
        where: { orderId }
      });

  if (existingProcessed) {

    return {
      success: true,
      message:
        "Already processed"
    };
  }

  //////////////////////////////////////////////////////
  // ORDER
  //////////////////////////////////////////////////////

  const order =
    await prisma.order.findUnique({
      where: { orderId },

      include: {
        OrderPricing: true,
        OrderPickupAddress: true
      }
    });

  if (!order) {
    throw new Error(
      "Order not found"
    );
  }

  if (
    order.orderStatus !==
    "DELIVERED"
  ) {

    throw new Error(
      "Order not delivered"
    );
  }

  //////////////////////////////////////////////////////
  // RIDER LOCATION
  //////////////////////////////////////////////////////

  const riderLocation =
    await prisma.riderLocation
      .findUnique({
        where: { riderId }
      });

  if (
    !riderLocation?.pincode
  ) {

    return {
      success: true,
      message:
        "Rider pincode missing"
    };
  }

  //////////////////////////////////////////////////////
  // DATE
  //////////////////////////////////////////////////////

  const now = new Date();

  const currentDay = now
    .toLocaleDateString(
      "en-US",
      {
        weekday: "short"
      }
    )
    .toUpperCase()
    .slice(0, 3);

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const tomorrow =
    new Date(
      today.getTime() +
      86400000
    );

  const weekKey =
    getWeekKey(today);

  //////////////////////////////////////////////////////
  // ORDER AMOUNT
  //////////////////////////////////////////////////////

  const orderAmount =
    order.OrderPricing
      ?.totalAmount || 0;

  //////////////////////////////////////////////////////
  // ACTIVE PROGRAMS
  //////////////////////////////////////////////////////

  const programs =
    await prisma.program.findMany({
      where: {

        isActive: true,

        validFrom: {
          lte: now
        },

        validTill: {
          gte: now
        },

        OR: [
          {
            pincodeIds: {
              has:
                riderLocation.pincode
            }
          },

          {
            pincodeIds: {
              isEmpty: true
            }
          }
        ]
      },

include: {

  slabs: true,

  targets: true,

  rules: true,

  tasks: true,

  consistency: true,

  referralConfig: true,

  slots: {
    include: {
      slabs: true
    }
  }
}
    });

  //////////////////////////////////////////////////////
  // LOOP PROGRAMS
  //////////////////////////////////////////////////////

  for (const program of programs) {

    ////////////////////////////////////////////////////
    // DAY FILTER
    ////////////////////////////////////////////////////

    if (
      program.daysOfWeek
        ?.length > 0 &&

      !program.daysOfWeek
        .includes(currentDay)
    ) {

      continue;
    }

    ////////////////////////////////////////////////////
    // DAILY + WEEKLY
    ////////////////////////////////////////////////////

if (

  (
    program.programType ===
    "DAILY_TARGET"
    &&

    program.trackingType ===
    "DAILY"
  )

  ||

  (
    program.programType ==="WEEKLY_TARGET"

    &&

    program.trackingType ===
    "WEEKLY"
  )
) {

      //////////////////////////////////////////////////
      // FIND PROGRESS
      //////////////////////////////////////////////////

      const progressWhere = {

        riderId,

        programId:
          program.id
      };

      if (
        program.trackingType ===
        "DAILY"
      ) {

        progressWhere.date = {
          gte: today,
          lt: tomorrow
        };
      }

      if (
        program.trackingType ===
        "WEEKLY"
      ) {

        progressWhere.week =
          weekKey;
      }

      let progress =
        await prisma.programProgress
          .findFirst({
            where:
              progressWhere
          });

      //////////////////////////////////////////////////
      // CREATE PROGRESS
      //////////////////////////////////////////////////

      if (!progress) {

        progress =
          await prisma.programProgress
            .create({
              data: {

                riderId,

                programId:
                  program.id,

                date:
                  program
                    .trackingType ===
                  "DAILY"
                    ? today
                    : null,

                week:
                  program
                    .trackingType ===
                  "WEEKLY"
                    ? weekKey
                    : null,

                totalOrders: 0,

                totalEarnings: 0,

                rewardAmount: 0,

                achieved: false
              }
            });
      }

      //////////////////////////////////////////////////
      // UPDATE PROGRESS
      //////////////////////////////////////////////////

      await prisma.programProgress
        .update({
          where: {
            id: progress.id
          },

          data: {

            totalOrders: {
              increment: 1
            },

            totalEarnings: {
              increment:
                orderAmount
            }
          }
        });

      //////////////////////////////////////////////////
      // FETCH UPDATED
      //////////////////////////////////////////////////

      progress =
        await prisma.programProgress
          .findUnique({
            where: {
              id: progress.id
            }
          });

      //////////////////////////////////////////////////
      // REWARD CALCULATION
      //////////////////////////////////////////////////

      let reward = 0;

      /////////////////////////////////////////////////
      // FIXED TARGET
      /////////////////////////////////////////////////

      if (
        program.ruleType ===
        "FIXED_TARGET"
      ) {

        const target =
          program.targets?.[0];

        if (
          target &&
          progress.totalOrders >=
            target.targetOrders
        ) {

          reward =
            target.rewardAmount;
        }
      }

      /////////////////////////////////////////////////
      // SLAB
      /////////////////////////////////////////////////

      if (
        program.ruleType ===
        "SLAB"
      ) {

        const slab =
          program.slabs?.find(
            s =>

              progress.totalOrders >=
                s.minValue &&

              (
                s.maxValue ===
                  null ||

                progress.totalOrders <=
                  s.maxValue
              )
          );

        if (slab) {

          reward =
            slab.rewardAmount;
        }
      }

      /////////////////////////////////////////////////
      // HYBRID
      /////////////////////////////////////////////////

      if (
        program.ruleType ===
        "HYBRID"
      ) {

        const rule =
          program.rules?.[0];

        if (
          rule &&
          progress.totalOrders >=
            rule.minOrders &&

          progress.totalEarnings >=
            rule.minEarnings
        ) {

          reward =
            program
              .maxPayoutPerWeek || 0;
        }
      }

//////////////////////////////////////////////////
// UPDATE PROGRESS REWARD
//////////////////////////////////////////////////

if (
  reward >
  progress.rewardAmount
) {

  await prisma.programProgress
    .update({
      where: {
        id: progress.id
      },

      data: {

        rewardAmount:
          reward,

        achieved: false
      }
    });

}

      //////////////////////////////////////////////////
      // WEBSOCKET
      //////////////////////////////////////////////////

      await notifyRiderIncentive(
        riderId,
        {

          type:
            program
              .trackingType ===
            "DAILY"

              ?

            "DAILY_INCENTIVE_UPDATED"

              :

            "WEEKLY_INCENTIVE_UPDATED",

          data: {

            riderId,

            programId:
              program.id,

            totalOrders:
              progress.totalOrders,

            totalEarnings:
              progress.totalEarnings,

            rewardAmount:
              reward,

            achieved:
  reward > 0
          }
        }
      );
    }

if (

  (
    program.programType ===
    "WEEKLY_TARGET"

    &&

    program.ruleType ===
    "TASK"
  )

  ||

  (
    program.programType ===
    "REFERRAL"

    &&

    program.ruleType ===
    "TASK"
  )
){

let currentDayNumber;

if (
  program.programType ===
  "REFERRAL"
) {

  const enrollment =
    await prisma.programEnrollment.findFirst({

      where: {
        riderId,
        programId: program.id
      }
    });

  if (!enrollment) {

    console.log(
      `No enrollment found for rider ${riderId}, program ${program.id}`
    );

    continue;   // <-- ADD THIS
  }

  currentDayNumber =
    Math.floor(

      (
        new Date() -
        new Date(
          enrollment.enrolledAt
        )
      )

      /

      (1000 * 60 * 60 * 24)

    ) + 1;

} else {

  const jsDay =
    new Date().getDay();

  currentDayNumber =
    jsDay === 0 ? 7 : jsDay;
}

  //////////////////////////////////////////////////
  // FIND TODAY TASK
  //////////////////////////////////////////////////

  const todayTask =
    await prisma.programTask.findFirst({

      where: {

        programId: program.id,

        dayNumber: currentDayNumber
      }
    });

  if (!todayTask) {
    continue;
  }

   //////////////////////////////////////////////////
  // FIND TASK PROGRESS
  //////////////////////////////////////////////////

let taskProgress =
  await prisma.programTaskProgress.findFirst({

    where: {

      riderId,

      programId: program.id,

      taskId: todayTask.id,

      week: weekKey
    }
  });

  //////////////////////////////////////////////////
  // CREATE IF NOT EXISTS
  //////////////////////////////////////////////////

  if (!taskProgress) {

taskProgress =
  await prisma.programTaskProgress.create({

    data: {

      riderId,

      programId: program.id,

      taskId: todayTask.id,

      week: weekKey,

      dayNumber: currentDayNumber,

      progressValue: 0,

      isCompleted: false,

      date: today
    }
  });
  }

 const updatedProgress =
  await prisma.programTaskProgress.update({

    where: {
      id: taskProgress.id
    },

    data: {

      progressValue: {
        increment: 1
      }
    }
  });

//////////////////////////////////////////////////
// UPDATE REFERRAL LIVE ORDERS
//////////////////////////////////////////////////

if (
  program.programType ===
  "REFERRAL"
) {

  await prisma.referral.updateMany({

    where: {

      refereeId: riderId,

      programId: program.id

    },

    data: {

      totalOrders: {
        increment: 1
      }

    }

  });

}

//////////////////////////////////////////////////
// COMPLETION CHECK
//////////////////////////////////////////////////

let isCompleted = false;

  //////////////////////////////////////////////////
  // FIXED TARGET
  //////////////////////////////////////////////////

  if (
    todayTask.taskRuleType ===
    "FIXED_TARGET"
  ) {

    isCompleted =
      updatedProgress.progressValue >=
      (todayTask.targetOrders || 0);
  }

  //////////////////////////////////////////////////
  // PER ORDER
  //////////////////////////////////////////////////

  if (
    todayTask.taskRuleType ===
    "PER_ORDER"
  ) {

    isCompleted =
      updatedProgress.progressValue >=
      (todayTask.maxOrders || 0);
  }

  //////////////////////////////////////////////////
  // SLAB
  //////////////////////////////////////////////////

  if (
    todayTask.taskRuleType ===
    "SLAB"
  ) {

  isCompleted =
  updatedProgress.progressValue >=
  (todayTask.maxOrders || 0);

    
  }

if (
  todayTask.taskRuleType ===
  "HYBRID"
) {

  isCompleted =
    updatedProgress.progressValue >=
    (todayTask.minOrders || 0);
}

  //////////////////////////////////////////////////
  // UPDATE COMPLETED
  //////////////////////////////////////////////////

if (isCompleted) {

  await prisma.programTaskProgress.update({
    where: {
      id: taskProgress.id
    },

    data: {
      isCompleted: true
    }
  });

  //////////////////////////////////////////////////
  // SOCKET
  //////////////////////////////////////////////////

  await notifyRiderIncentive(
    riderId,
    {

      type:
        "WEEKLY_TASK_UPDATED",

      data: {

        riderId,

        programId:
          program.id,

        taskId:
          todayTask.id,

        dayNumber:
          currentDayNumber,

        progressValue:
          updatedProgress.progressValue,

        isCompleted
      }
    }
  );
}
}
    ////////////////////////////////////////////////////
    // PEAK SLOT
    ////////////////////////////////////////////////////

    if (
      program.programType ===
      "PEAK_SLOT"
    ) {

      for (
        const slot
        of program.slots
      ) {

        ////////////////////////////////////////////////
        // SLOT DAY FILTER
        ////////////////////////////////////////////////

        if (
          slot.daysOfWeek
            ?.length > 0 &&

          !slot.daysOfWeek
            .includes(currentDay)
        ) {

          continue;
        }

        ////////////////////////////////////////////////
        // TIME FILTER
        ////////////////////////////////////////////////

// TIME FILTER

const istNow = new Date(
  new Date().toLocaleString(
    "en-US",
    { timeZone: "Asia/Kolkata" }
  )
);

const orderMinutes =
  istNow.getHours() * 60 +
  istNow.getMinutes();

if (
  orderMinutes < slot.startMinutes ||
  orderMinutes >= slot.endMinutes
) {
  continue;
}

        ////////////////////////////////////////////////
        // FIND SLOT PROGRESS
        ////////////////////////////////////////////////

        let slotProgress =

          await prisma.programProgress
            .findFirst({

              where: {

                riderId,

                slotId:
                  slot.id,

                programId:
                  program.id,

                date: {
                  gte: today,
                  lt: tomorrow
                }
              }
            });

        ////////////////////////////////////////////////
        // CREATE SLOT PROGRESS
        ////////////////////////////////////////////////

        if (!slotProgress) {

          slotProgress =

            await prisma.programProgress
              .create({

                data: {

                  riderId,

                  programId:
                    program.id,

                  slotId:
                    slot.id,

                  date:
                    today,

                  totalOrders: 0,

                  totalEarnings: 0,

                  rewardAmount: 0,

                  achieved: false
                }
              });
        }

await prisma.programProgress
  .update({

    where: {
      id:
        slotProgress.id
    },

    data: {

      totalOrders: {
        increment: 1
      },

      totalEarnings: {
        increment:
          orderAmount
      }
    }
  });

        slotProgress =

          await prisma.programProgress
            .findUnique({

              where: {
                id:
                  slotProgress.id
              }
            });

        ////////////////////////////////////////////////
        // REWARD
        ////////////////////////////////////////////////

        let peakReward = 0;

        ////////////////////////////////////////////////
        // PER ORDER
        ////////////////////////////////////////////////

        if (
          slot.ruleType ===
          "PER_ORDER"
        ) {

         peakReward =
  slotProgress.totalOrders *
  (slot.rewardPerOrder || 0);
        }

        ////////////////////////////////////////////////
        // SLAB
        ////////////////////////////////////////////////

        if (
          slot.ruleType ===
          "SLAB"
        ) {

          const slab =
            slot.slabs.find(
              s =>

                slotProgress.totalOrders >=
                  s.minOrders &&

                (
                  s.maxOrders ===
                    null ||

                  slotProgress.totalOrders <=
                    s.maxOrders
                )
            );

          if (slab) {

            peakReward =
              slab.rewardAmount;
          }
        }

        ////////////////////////////////////////////////
        // PAYOUT
        ////////////////////////////////////////////////

        if (
          peakReward >
          slotProgress.rewardAmount
        ) {

await prisma.programProgress
  .update({

    where: {
      id:
        slotProgress.id
    },

    data: {

      rewardAmount:
        peakReward,

      achieved: false
    }
  });

        }

        ////////////////////////////////////////////////
        // SOCKET
        ////////////////////////////////////////////////

        await notifyRiderIncentive(
          riderId,
          {

            type:
              "PEAK_INCENTIVE_UPDATED",

            data: {

              riderId,

              slotId:
                slot.id,

              totalOrders:
                slotProgress.totalOrders,

              rewardAmount:
                peakReward
            }
          }
        );
      }
    }

    ////////////////////////////////////////////////////
    // REFERRAL
    ////////////////////////////////////////////////////

    if (
  program.programType ===
  "REFERRAL"
  &&
  program.ruleType !== "TASK"
) {

      const referral =
        await prisma.referral
          .findFirst({

            where: {

              refereeId:
                riderId,

              programId:
                program.id
            }
          });

      if (!referral) {
        continue;
      }

      //////////////////////////////////////////////////
      // UPDATE REFERRAL ORDERS
      //////////////////////////////////////////////////

      const updatedReferral =

        await prisma.referral
          .update({

            where: {
              id:
                referral.id
            },

            data: {

              totalOrders: {
                increment: 1
              }
            }
          });

      //////////////////////////////////////////////////
      // TARGET COMPLETED
      //////////////////////////////////////////////////

      if (

        updatedReferral.totalOrders >=
          updatedReferral.targetOrders &&

        !updatedReferral.rewardGiven
      ) {

        const slab =
          program.slabs?.[0];

        const reward =
          slab?.rewardAmount || 0;

        //////////////////////////////////////////////////
        // DUPLICATE PAYOUT CHECK
        //////////////////////////////////////////////////

        const existingPayout =

          await prisma.programPayout
            .findFirst({

              where: {

                riderId:
                  updatedReferral
                    .referrerId,

                programId:
                  program.id,

                triggerType:
                  "PROGRAM_COMPLETION"
              }
            });

        if (existingPayout) {
          continue;
        }

        //////////////////////////////////////////////////
        // WALLET
        //////////////////////////////////////////////////

        await prisma.riderWallet
          .upsert({

            where: {

              riderId:
                updatedReferral
                  .referrerId
            },

            update: {

              balance: {
                increment:
                  reward
              },

              totalEarned: {
                increment:
                  reward
              }
            },

            create: {

              riderId:
                updatedReferral
                  .referrerId,

              balance:
                reward,

              totalEarned:
                reward
            }
          });
//////////////////////////////////////////////////
// WALLET TRANSACTION
//////////////////////////////////////////////////

await prisma.riderWalletTransaction.create({

  data: {

    riderId:
      updatedReferral.referrerId,

    type:
      "REFERRAL_BONUS",

    amount:
      reward,

    description:
      "Referral bonus credited",

    referenceId:
      referral.id
  }
});
        //////////////////////////////////////////////////
        // PAYOUT
        //////////////////////////////////////////////////

        await prisma.programPayout
          .create({

            data: {

              riderId:
                updatedReferral
                  .referrerId,

              programId:
                program.id,

              amount:
                reward,

              triggerType:
                "PROGRAM_COMPLETION"
            }
          });

        //////////////////////////////////////////////////
        // REFERRAL COMPLETE
        //////////////////////////////////////////////////

        await prisma.referral
          .update({

            where: {
              id:
                referral.id
            },

            data: {

              rewardGiven:
                true,

              rewardGivenAt:
                new Date(),

              isCompleted:
                true,

              completedAt:
                new Date()
            }
          });

        //////////////////////////////////////////////////
        // SOCKET
        //////////////////////////////////////////////////

        await notifyRiderIncentive(
          updatedReferral
            .referrerId,

          {

            type:
              "REFERRAL_REWARD_EARNED",

            data: {

              refereeId:
                riderId,

              rewardAmount:
                reward
            }
          }
        );
      }
    }
  }

  //////////////////////////////////////////////////////
  // MARK ORDER PROCESSED
  //////////////////////////////////////////////////////

  await prisma.processedOrder
    .create({
      data: {
        orderId
      }
    });

  //////////////////////////////////////////////////////
  // RETURN
  //////////////////////////////////////////////////////

  return {

    success: true,

    message:
      "Incentive processed successfully"
  };
};