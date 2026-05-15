const prisma = require("../config/prisma");

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
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
const getPeakSlotProgress = async (req, res) => {
  try {
    const riderId = req.rider.id;

    // GET RIDER PINCODE

    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId },
      select: { pincode: true },
    });

    if (!riderLocation?.pincode) {
      return res.status(400).json({
        success: false,
        message: "Rider pincode not found",
      });
    }

    const riderPincode = riderLocation.pincode;

const { start, end } = getISTDayRange();

// GET ACTIVE PROGRAMS
const now = new Date(
  new Date().toLocaleString(
    "en-US",
    { timeZone: "Asia/Kolkata" }
  )
);
const programs = await prisma.program.findMany({
  where: {
    isActive: true,

    validFrom: {
      lte: now
    },

    validTill: {
      gte: now
    },

    programType: "PEAK_SLOT",

    trackingType: "DAILY",

        pincodeIds: {
          has: riderPincode,
        },

      },

      select: {
        id: true,

        ruleType: true,

        minAcceptanceRate: true,

        minCompletionRate: true,

        maxPayoutPerDay: true,

        slots: {
          include: {
            slabs: true,
          },
        },

        targets: true,
      },
    });

    if (!programs.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }


    // BUILD RESPONSE

    const incentives = await Promise.all(
  programs.flatMap(async (p) => {

const now = new Date(
  new Date().toLocaleString(
    "en-US",
    { timeZone: "Asia/Kolkata" }
  )
);
const currentMinutes =
  now.getHours() * 60 +
  now.getMinutes();

const validSlots =
  p.slots.filter(slot =>

    slot.endMinutes >
    currentMinutes
  );

if (!validSlots.length) {
  return [];
}

const activeSlot =
  validSlots.find(slot =>

    currentMinutes >=
      slot.startMinutes &&

    currentMinutes <
      slot.endMinutes
  );

const finalSlots =
  activeSlot
    ? [activeSlot]
    : [

        validSlots.sort(
          (a, b) =>
            a.startMinutes -
            b.startMinutes
        )[0]
      ];
if (
  p.ruleType === "PER_ORDER" ||
  p.ruleType === "SLAB"
) {

  return await Promise.all(

    finalSlots.map(async (slot) => {

      const slotProgress =
        await prisma.programProgress.findFirst({

          where: {

            riderId,

            programId: p.id,

            slotId: slot.id,

           date: {
  gte: start,
  lt: end
}
          }
        });

      const orders =
        slotProgress?.totalOrders || 0;

return {
  ruleType: p.ruleType,

  slotId: slot.id,

  pincode: riderPincode,

  startMinutes: slot.startMinutes,

  endMinutes: slot.endMinutes,

  slotTiming:
    `${minutesToTime(slot.startMinutes)} - ${minutesToTime(slot.endMinutes)}`,
        ordersCompleted: orders,

        rewardAmount:
          orders > 0
            ? orders *
              (slot.rewardPerOrder || 0)
            : 0,

        status:
          slotProgress?.achieved
            ? "ACHIEVED"
            : orders > 0
            ? "IN_PROGRESS"
            : "NOT_STARTED"
      };
    })
  );
}

      // FIXED TARGET

      if (p.ruleType === "FIXED_TARGET") {
const slot = finalSlots[0];

const slotProgress =
  await prisma.programProgress.findFirst({

    where: {

      riderId,

      programId: p.id,

      slotId: slot?.id,

      date: {
  gte: start,
  lt: end
}
    }
  });

const orders =
  slotProgress?.totalOrders || 0;

const earnings =
  slotProgress?.totalEarnings || 0;
  const target = p.targets?.[0];

  const targetOrders =
    target?.targetOrders || 0;

  const singleReward =
    target?.rewardAmount || 0;

  const completedCycles =
    targetOrders > 0
      ? Math.floor(
          orders / targetOrders
        )
      : 0;

  // SLOT

  return [{
    ruleType: "FIXED_TARGET",

    slotId: slot?.id || null,

    pincode: riderPincode,
startMinutes: slot?.startMinutes,
endMinutes: slot?.endMinutes,
    slotTiming:
      slot
        ? `${minutesToTime(slot.startMinutes)} - ${minutesToTime(slot.endMinutes)}`
        : null,

    ordersCompleted: orders,

    completedCycles,

    rewardAmount:
      completedCycles *
      singleReward,

    status:
      completedCycles > 0
        ? "ACHIEVED"
        : orders > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED"
  }];
}

      // HYBRID
if (p.ruleType === "HYBRID") {
const slot = finalSlots[0];
const slotProgress =
  await prisma.programProgress.findFirst({

    where: {

      riderId,

      programId: p.id,

      slotId: slot?.id,

     date: {
  gte: start,
  lt: end
}
    }
  });

const orders =
  slotProgress?.totalOrders || 0;

const earnings =
  slotProgress?.totalEarnings || 0;
  const target = p.targets?.[0];

  const targetOrders =
    target?.targetOrders || 0;

  const targetEarnings =
    target?.targetEarnings || 0;

const acceptanceRate =
  slotProgress?.acceptanceRate || 0;

const completionRate =
  slotProgress?.completionRate || 0;

  // ALL CONDITIONS CHECK

  const achieved =
    orders >= targetOrders &&
    earnings >= targetEarnings &&
    acceptanceRate >= (p.minAcceptanceRate || 0) &&
    completionRate >= (p.minCompletionRate || 0);

  return [{
    ruleType: "HYBRID",

    slotId: slot?.id || null,

    pincode: riderPincode,
startMinutes: slot?.startMinutes,
endMinutes: slot?.endMinutes,
    slotTiming:
      slot
        ? `${minutesToTime(slot.startMinutes)} - ${minutesToTime(slot.endMinutes)}`
        : null,

    ordersCompleted: orders,

   

    rewardAmount:
      achieved
        ? target?.rewardAmount || 0
        : 0,

    status:
      achieved
        ? "ACHIEVED"
        : orders > 0 || earnings > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED"
  }];
}
      return [];
    }));
const flatIncentives =
  incentives.flat();

//////////////////////////////////////////////////
// CURRENT TIME
//////////////////////////////////////////////////


const currentMinutes =
  now.getHours() * 60 +
  now.getMinutes();

//////////////////////////////////////////////////
// ACTIVE SLOT
//////////////////////////////////////////////////

const activeSlots =
  flatIncentives.filter(item => {
return (
  currentMinutes >= item.startMinutes &&
  currentMinutes < item.endMinutes
);
  });

//////////////////////////////////////////////////
// IF ACTIVE EXISTS
//////////////////////////////////////////////////

if (activeSlots.length > 0) {

  return res.status(200).json({

    success: true,

    data: [activeSlots[0]]
  });
}

//////////////////////////////////////////////////
// UPCOMING SLOTS
//////////////////////////////////////////////////

const upcomingSlots =
  flatIncentives
    .map(item => {

return {
  item,
  startMinutes: item.startMinutes
};
    })
    
    .filter(
      item =>
        item.startMinutes >
        currentMinutes
    )

    .sort(
      (a, b) =>
        a.startMinutes -
        b.startMinutes
    );
//////////////////////////////////////////////////
// NEAREST UPCOMING
//////////////////////////////////////////////////

if (upcomingSlots.length > 0) {

  return res.status(200).json({

    success: true,

    data: [upcomingSlots[0].item] 
 });
}

//////////////////////////////////////////////////
// EMPTY
//////////////////////////////////////////////////

return res.status(200).json({

  success: true,

  data: []
});

  } catch (error) {
    console.error("Peak slot progress error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getRiderPeakSlotPrograms = async (req, res) => {
  try {

    const riderId = req.rider.id;

    // GET RIDER LOCATION

    const riderLocation =
      await prisma.riderLocation.findUnique({
        where: { riderId }
      });

    if (!riderLocation) {
      return res.json({
        success: true,
        data: []
      });
    }

    const riderPincode =
      riderLocation.pincode?.trim();

    const riderCityId =
      riderLocation.cityId || null;

const now = new Date(
  new Date().toLocaleString(
    "en-US",
    { timeZone: "Asia/Kolkata" }
  )
);
   const today = now
  .toLocaleDateString("en-US", {
    weekday: "short"
  })
  .slice(0, 3)
  .toUpperCase();

    const currentMinutes =
      now.getHours() * 60 +
      now.getMinutes();

    // FETCH PROGRAMS

    let programs = [];

    const baseQuery = {

      programType: "PEAK_SLOT",

      isActive: true,

      validFrom: {
        lte: now
      },

      validTill: {
        gte: now
      }
    };

    // FETCH BY PINCODE

    if (riderPincode) {

      programs =
        await prisma.program.findMany({

          where: {
            ...baseQuery,

            pincodeIds: {
              has: riderPincode
            }
          },

          include: {

            slots: {

              orderBy: {
                startMinutes: "asc"
              },

              include: {
                slabs: true
              }
            },

            targets: true
          }
        });
    }

    // FALLBACK TO CITY

    if (
      !programs.length &&
      riderCityId
    ) {

      programs =
        await prisma.program.findMany({

          where: {
            ...baseQuery,

            cityId: {
              has: riderCityId
            }
          },

          include: {

            slots: {

              orderBy: {
                startMinutes: "asc"
              },

              include: {
                slabs: true
              }
            },

            targets: true
          }
        });
    }

    // REMOVE DUPLICATES

    const uniquePrograms =
      Array.from(
        new Map(
          programs.map(p => [p.id, p])
        ).values()
      );

    // FETCH CITY NAMES

    const allCityIds = [

      ...new Set(
        uniquePrograms.flatMap(
          p => p.cityId || []
        )
      )
    ];

    const cities =
      await prisma.city.findMany({

        where: {
          id: {
            in: allCityIds
          }
        },

        select: {
          id: true,
          name: true
        }
      });

    const cityMap = {};

    cities.forEach(city => {
      cityMap[city.id] = city.name;
    });

    // FETCH PINCODE -> CITY

    const allPincodes = [

      ...new Set(
        uniquePrograms.flatMap(
          p => p.pincodeIds || []
        )
      )
    ];

    const pincodes =
      await prisma.pincode.findMany({

        where: {

          code: {
            in: allPincodes
          },

          ...(riderCityId && {
            cityId: riderCityId
          })
        },

        include: {
          city: true
        }
      });

    const pincodeCityMap = {};

    for (const p of pincodes) {

      if (!pincodeCityMap[p.code]) {

        pincodeCityMap[p.code] =
          p.city?.name || null;
      }
    }

    // FORMAT RESPONSE

    const response =
      uniquePrograms
        .map(program => {

          // CITY NAME

          let cityName = null;

          if (program.cityId?.length) {

            cityName =
              cityMap[
                program.cityId[0]
              ] || null;

          } else if (
            program.pincodeIds?.length
          ) {

            cityName =
              pincodeCityMap[
                program.pincodeIds[0]
              ] || null;
          }

          const base = {

            name: program.name,

            cityName,

            ruleType:
              program.ruleType,

            isActive:
              program.isActive
          };

          // COMMON SLOT FILTERING

          const filteredSlots =
            program.slots

              // DAY FILTER
              .filter(slot => {

                const slotDays =
                  slot.daysOfWeek?.length
                    ? slot.daysOfWeek
                    : program.daysOfWeek || [];

                return slotDays.includes(
                  today
                );
              })

           .filter(slot => {

  return (
    slot.endMinutes >
    currentMinutes
  );
})

              // FORMAT SLOT
              .map(slot => {

                const isActive =

                  currentMinutes >=
                    slot.startMinutes &&

                  currentMinutes <
                    slot.endMinutes;

                const isUpcoming =
                  currentMinutes <
                  slot.startMinutes;

                const commonSlot = {
startMinutes: slot.startMinutes,
endMinutes: slot.endMinutes,
                  startTime:
                    minutesToTime(
                      slot.startMinutes
                    ),

                  endTime:
                    minutesToTime(
                      slot.endMinutes
                    ),

                  ruleType:
                    slot.ruleType,

                  

                  isActive,

                  isUpcoming
                };

                // PER ORDER

                if (
                  program.ruleType ===
                  "PER_ORDER"
                ) {

                  return {

                    ...commonSlot,

                    reward: {

                      amount:
                        slot.rewardPerOrder || 0
                    }
                  };
                }

                // SLAB

                if (
                  program.ruleType ===
                  "SLAB"
                ) {

                  return {

                    ...commonSlot,

                    slabs:
                      slot.slabs.map(s => ({

                        minOrders:
                          s.minOrders,

                        maxOrders:
                          s.maxOrders,

                        rewardAmount:
                          s.rewardAmount
                      }))
                  };
                }

                // FIXED TARGET

                if (
                  program.ruleType ===
                  "FIXED_TARGET"
                ) {

                  const target =
                    program.targets?.[0];

                  return {

                    ...commonSlot,

                    target: {

                      orders:
                        target?.targetOrders || 0
                    },

                    reward: {

                      amount:
                        target?.rewardAmount || 0
                    }
                  };
                }

                // HYBRID

                if (
                  program.ruleType ===
                  "HYBRID"
                ) {

                  const target =
                    program.targets?.[0];

                  return {

                    ...commonSlot,

                    conditions: {

                      minOrders:
                        target?.targetOrders || 0,

                      minEarnings:
                        target?.targetEarnings || 0,

                      minAcceptanceRate:
                        program.minAcceptanceRate || 0,

                      minCompletionRate:
                        program.minCompletionRate || 0
                    },

                    reward: {

                      amount:
                        target?.rewardAmount || 0
                    },

                    maxPayoutPerDay:
                      program.maxPayoutPerDay || 0
                  };
                }

                return commonSlot;
              });

          return {

            ...base,

            slots: filteredSlots
          };
        })

        // REMOVE NULL PROGRAMS
        .filter(program => program);

    // GLOBAL ACTIVE SLOT CHECK

   // GLOBAL ACTIVE SLOT CHECK

const hasAnyActiveSlot =

  response.some(program =>

    program.slots?.some(slot =>
      slot.isActive
    )
  );

let filteredResponse = [];

if (hasAnyActiveSlot) {

  // SHOW ONLY ACTIVE SLOTS

  filteredResponse =

    response

      .map(program => {

        const activeSlots =

          program.slots.filter(
            slot => slot.isActive
          );

        return {
          ...program,
          slots: activeSlots
        };
      })

      .filter(program =>
        program.slots.length > 0
      );

} else {

  // GET ALL UPCOMING PROGRAMS

  const upcomingPrograms =

    response

      .map(program => {

        const upcomingSlots =

          program.slots.filter(
            slot => slot.isUpcoming
          );

        return {
          ...program,
          slots: upcomingSlots
        };
      })

      .filter(program =>
        program.slots.length > 0
      );

  // FIND NEAREST UPCOMING SLOT

  let nearestProgram = null;

  let nearestSlot = null;

  let nearestStart = Infinity;

  for (const program of upcomingPrograms) {

    for (const slot of program.slots) {

const slotStart =
  slot.startMinutes;

      if (slotStart < nearestStart) {

        nearestStart = slotStart;

        nearestProgram = program;

        nearestSlot = slot;
      }
    }
  }

  // RETURN ONLY NEAREST SLOT

  if (
    nearestProgram &&
    nearestSlot
  ) {

    filteredResponse = [{

      ...nearestProgram,

      slots: [nearestSlot]
    }];
  }
}
    // RESPONSE

    return res.json({

      success: true,

      data: filteredResponse
    });

  } catch (error) {

    console.error(
      "Peak slot programs error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Failed to fetch peak slot programs"
    });
  }
};

module.exports = { getPeakSlotProgress, getRiderPeakSlotPrograms };