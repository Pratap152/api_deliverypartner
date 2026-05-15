const prisma = require("../config/prisma");
const { TrackingType, RuleType, ProgramType } = require("@prisma/client");

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}


const createPeakSlot = async (req, res) => {
  try {
    const body = req.body;

    if (!body.ruleType) {
      return res.status(400).json({
        success: false,
        message: "ruleType is required (SLAB | PER_ORDER)"
      });
    }

    if (body.ruleType === "PER_ORDER") {
      return await createPerOrderPeakSlot(req, res);
    }

    if (body.ruleType === "SLAB") {
      return await createSlabPeakSlot(req, res);
    }

    if (body.ruleType === "FIXED_TARGET") {
  return await createFixedTargetIncentive(req, res);
}

if (body.ruleType === "HYBRID") {
  return await createHybridDailyIncentive(req, res);
}

    return res.status(400).json({
      success: false,
      message: "Invalid ruleType"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


const createPerOrderPeakSlot = async (req, res) => {
  try {
    const body = req.body;

    if (!body.cityName) {
      return res.status(400).json({
        success: false,
        message: "cityName is required",
      });
    }

    const city = await prisma.city.findFirst({
      where: {
        name: {
          equals: body.cityName,
          mode: "insensitive",
        },
      },
    });

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityName",
      });
    }

    if (!body.name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!body.dateRange?.startDate || !body.dateRange?.endDate) {
      return res.status(400).json({
        success: false,
        message: "dateRange is required",
      });
    }

    if (!Array.isArray(body.slots) || body.slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Slots are required",
      });
    }

    for (const slot of body.slots) {
      const startMin = toMinutes(slot.startTime);
      const endMin = toMinutes(slot.endTime);

      if (startMin >= endMin) {
        return res.status(400).json({
          success: false,
          message: "Invalid slot time (start must be before end)",
        });
      }

      if (!slot.reward?.amount) {
        return res.status(400).json({
          success: false,
          message: "Reward amount is required",
        });
      }
    }

    const start = new Date(body.dateRange.startDate);
    const end = new Date(body.dateRange.endDate);

    const pincodeIds = Array.isArray(body.pincodeIds)
      ? body.pincodeIds.map(String)
      : [String(body.pincodeIds)];

   const existingPrograms =
  await prisma.program.findMany({

    where: {

      programType: "PEAK_SLOT",

      isActive: true,

      pincodeIds: {
        hasSome: pincodeIds
      },

      validFrom: {
        lte: end
      },

      validTill: {
        gte: start
      }
    },

    include: {
      slots: true
    }
  });

    const conflict = existingPrograms.some(program => {

  // DATE OVERLAP

  const dateOverlap =
    start <= program.validTill &&
    end >= program.validFrom;

  if (!dateOverlap) {
    return false;
  }

  return program.slots.some(existingSlot =>

    body.slots.some(newSlot => {

      const newStart =
        toMinutes(newSlot.startTime);

      const newEnd =
        toMinutes(newSlot.endTime);

      const existingStart =
        existingSlot.startMinutes;

      const existingEnd =
        existingSlot.endMinutes;

      // TIME OVERLAP

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      );
    })
  );
});

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Slot already exists for this time range and pincode",
      });
    }

    const program = await prisma.program.create({
      data: {
        name: body.name,
        programType: "PEAK_SLOT",
        trackingType: "DAILY",
        ruleType: "PER_ORDER",

        validFrom: start,
        validTill: end,

        // FIXED
        cityId: [String(city.id)],
        pincodeIds,

        isActive: body.isActive ?? true,

        weekStartDay: body.weekStartDay || "MON",
        daysOfWeek: body.daysOfWeek
      }
    });

    for (const slot of body.slots) {
      await prisma.programSlot.create({
        data: {
          programId: program.id,
          startMinutes: toMinutes(slot.startTime),
          endMinutes: toMinutes(slot.endTime),
          daysOfWeek:
  body.slots?.[0]?.daysOfWeek || [],
          ruleType: "PER_ORDER",
          rewardPerOrder: slot.reward.amount
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Peak slot incentive created successfully",
      data: {
        id: program.id,
        name: program.name,
        totalSlots: body.slots.length
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// SLAB 
const createSlabPeakSlot = async (req, res) => {
  try {
    const body = req.body;
 
 
 
    //  Basic validations
    if (!body.name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
 
    if (!body.dateRange?.startDate || !body.dateRange?.endDate) {
      return res.status(400).json({ success: false, message: "dateRange is required" });
    }
 
    if (!Array.isArray(body.slots) || body.slots.length === 0) {
      return res.status(400).json({ success: false, message: "Slots required" });
    }
 
    if (!body.cityName) {
      return res.status(400).json({ success: false, message: "cityName is required" });
    }
 
    //  City mapping
    const city = await prisma.city.findFirst({
      where: {
        name: {
          equals: body.cityName,
          mode: "insensitive"
        }
      }
    });
 
    if (!city) {
      return res.status(400).json({ success: false, message: "Invalid cityName" });
    }
 
    //  Normalize pincodeIds
  console.log("BODY:", body);
console.log("BODY PINCODES:", body.pincodeIds);
 
const pincodeIds = Array.isArray(body.pincodeIds)
  ? body.pincodeIds.map(String)
  : body.pincodeIds
    ? [String(body.pincodeIds)]
    : [];
 
console.log("NORMALIZED PINCODES:", pincodeIds);
 
    //  Validate slots BEFORE DB
    for (const slot of body.slots) {
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({ success: false, message: "Slot time missing" });
      }
 
      const startMin = toMinutes(slot.startTime);
      const endMin = toMinutes(slot.endTime);
 
      if (startMin >= endMin) {
        return res.status(400).json({ success: false, message: "Invalid slot time" });
      }
 
      if (!Array.isArray(slot.slabs) || slot.slabs.length === 0) {
        return res.status(400).json({ success: false, message: "Slabs required" });
      }
 
      for (const s of slot.slabs) {
        if (s.minOrders > s.maxOrders) {
          return res.status(400).json({ success: false, message: "Invalid slab range" });
        }
      }
    }
 
 
 
    const start = new Date(body.dateRange.startDate);
    const end = new Date(body.dateRange.endDate);
 
    const existingPrograms = await prisma.program.findMany({
  where: {
    programType: "PEAK_SLOT",
 
    isActive: true,
 
    ...(pincodeIds.length > 0 && {
  pincodeIds: {
    hasSome: pincodeIds
  }
}),
 
    validFrom: {
      lte: end
    },
 
    validTill: {
      gte: start
    }
  },
 
  include: {
    slots: true
  }
});
 
    // CONFLICT CHECK
const conflict = existingPrograms.some(program => {
 
  const dateOverlap =
    start <= program.validTill &&
    end >= program.validFrom;
 
  if (!dateOverlap) {
    return false;
  }
 
  return program.slots.some(existingSlot =>
 
    body.slots.some(newSlot => {
 
      const newStart =
        toMinutes(newSlot.startTime);
 
      const newEnd =
        toMinutes(newSlot.endTime);
 
      const existingStart =
        existingSlot.startMinutes;
 
      const existingEnd =
        existingSlot.endMinutes;
 
      // OVERLAP CHECK
      const timeOverlap =
 
        newStart < existingEnd &&
        newEnd > existingStart;
 
      const existingDays =
        existingSlot.daysOfWeek?.length
          ? existingSlot.daysOfWeek
          : program.daysOfWeek || [];
 
      const newDays =
        newSlot.daysOfWeek?.length
          ? newSlot.daysOfWeek
          : body.daysOfWeek || [];
 
      const dayOverlap =
        existingDays.some(day =>
          newDays.includes(day)
        );
 
      return timeOverlap && dayOverlap;
    })
  );
});
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Slot already exists for this time range and pincode",
      });
    }
 
    //  Create program
   const program = await prisma.program.create({
  data: {
    name: body.name,
    programType: "PEAK_SLOT",
    trackingType: "DAILY",
    ruleType: "SLAB",
 
    validFrom: new Date(body.dateRange.startDate),
    validTill: new Date(body.dateRange.endDate),
 
    // ✅ FIX
    cityId: [String(city.id)],
 
    // ✅ store correctly
    pincodeIds: pincodeIds,
 
    weekStartDay: body.weekStartDay || "MON",
    daysOfWeek: body.daysOfWeek || [],
    isActive: body.isActive ?? true
  }
});
    //  Create slots + slabs
    for (const slot of body.slots) {
      const createdSlot = await prisma.programSlot.create({
        data: {
          programId: program.id,
          startMinutes: toMinutes(slot.startTime),
          endMinutes: toMinutes(slot.endTime),
          ruleType: "SLAB",
          daysOfWeek:
  body.slots?.[0]?.daysOfWeek || []
        }
      });
 
      await prisma.programSlotSlab.createMany({
        data: slot.slabs.map((s) => ({
          slotId: createdSlot.id,
          minOrders: s.minOrders,
          maxOrders: s.maxOrders,
          rewardAmount: s.rewardAmount
        }))
      });
    }
 
    return res.status(201).json({
      success: true,
      message: "Peak slot slab incentive created",
      data: {
        id: program.id
      }
    });
 
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

//FIXED
const createFixedTargetIncentive = async (req, res) => {
  try {

    const body = req.body;

    // CITY VALIDATION

    if (!body.cityName) {
      return res.status(400).json({
        success: false,
        message: "cityName is required",
      });
    }

    // FIND CITY

    const city = await prisma.city.findFirst({
      where: {
        name: {
          equals: body.cityName,
          mode: "insensitive",
        },
      },
    });

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityName",
      });
    }

    // NAME VALIDATION

    if (!body.name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    // DATE VALIDATION

    if (
      !body.dateRange?.startDate ||
      !body.dateRange?.endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "dateRange is required",
      });
    }

    const start = new Date(body.dateRange.startDate);

    const end = new Date(body.dateRange.endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    // PINCODES

    const pincodeIds = Array.isArray(body.pincodeIds)
      ? body.pincodeIds.map(String)
      : [String(body.pincodeIds)];

    // SLOT VALIDATION

    if (!Array.isArray(body.slots) || !body.slots.length) {
      return res.status(400).json({
        success: false,
        message: "slots are required",
      });
    }

    // TEMP RESTRICTION

    if (body.slots.length > 1) {
      return res.status(400).json({
        success: false,
        message:
          "Only one slot allowed for FIXED_TARGET",
      });
    }

    for (const slot of body.slots) {

      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({
          success: false,
          message: "slot time is required",
        });
      }

      const startMin = toMinutes(slot.startTime);

      const endMin = toMinutes(slot.endTime);

      if (startMin >= endMin) {
        return res.status(400).json({
          success: false,
          message: "Invalid slot timing",
        });
      }

      if (!slot.target?.orders) {
        return res.status(400).json({
          success: false,
          message:
            "slot.target.orders is required",
        });
      }

      if (!slot.reward?.amount) {
        return res.status(400).json({
          success: false,
          message:
            "slot.reward.amount is required",
        });
      }
    }

    // FETCH EXISTING PROGRAMS

   const existingPrograms =
  await prisma.program.findMany({

    where: {

      programType: "PEAK_SLOT",

      isActive: true,

      pincodeIds: {
        hasSome: pincodeIds
      },

      validFrom: {
        lte: end
      },

      validTill: {
        gte: start
      }
    },

    include: {
      slots: true
    }
  });
    // SLOT OVERLAP CHECK

    const conflict = existingPrograms.some(program => {

  // DATE OVERLAP

  const dateOverlap =
    start <= program.validTill &&
    end >= program.validFrom;

  if (!dateOverlap) {
    return false;
  }

  return program.slots.some(existingSlot =>

    body.slots.some(newSlot => {

      const newStart =
        toMinutes(newSlot.startTime);

      const newEnd =
        toMinutes(newSlot.endTime);

      const existingStart =
        existingSlot.startMinutes;

      const existingEnd =
        existingSlot.endMinutes;

      // TIME OVERLAP

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      );
    })
  );
});

    if (conflict) {
      return res.status(400).json({
        success: false,
        message:
          "Fixed target slot already exists for this time range and pincode",
      });
    }

    // CREATE PROGRAM

    const program =
  await prisma.program.create({
    data: {

      name: body.name,

      programType: "PEAK_SLOT",

      trackingType: "DAILY",

      ruleType: "FIXED_TARGET",

      validFrom: start,

      validTill: end,

      cityId: [String(city.id)],

      pincodeIds,

      
        daysOfWeek:
  body.slots?.[0]?.daysOfWeek || [],

      weekStartDay:
        body.weekStartDay || "MON",

      isActive:
        body.isActive ?? true
    }
  });

    // CREATE SLOT + TARGET

    for (const slot of body.slots) {

      await prisma.programSlot.create({

        data: {

          programId: program.id,

          startMinutes:
            toMinutes(slot.startTime),

          endMinutes:
            toMinutes(slot.endTime),

          daysOfWeek:
            slot.daysOfWeek || [],

          ruleType: "FIXED_TARGET"
        }
      });

      await prisma.programTarget.create({

        data: {

          programId: program.id,

          targetOrders:
            slot.target.orders,

          rewardAmount:
            slot.reward.amount
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Peak fixed target created",

      data: {
        id: program.id,
      },
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//HYBRID
const createHybridDailyIncentive = async (req, res) => {
  try {

    const body = req.body;

    // CITY VALIDATION

    if (!body.cityName) {
      return res.status(400).json({
        success: false,
        message: "cityName is required"
      });
    }

    // FIND CITY

    const city = await prisma.city.findFirst({
      where: {
        name: {
          equals: body.cityName,
          mode: "insensitive"
        }
      }
    });

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityName"
      });
    }

    // NAME VALIDATION

    if (!body.name) {
      return res.status(400).json({
        success: false,
        message: "name is required"
      });
    }

    // DATE VALIDATION

    if (
      !body.dateRange?.startDate ||
      !body.dateRange?.endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "dateRange is required"
      });
    }

    const start =
      new Date(body.dateRange.startDate);

    const end =
      new Date(body.dateRange.endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range"
      });
    }

    // PINCODES

    const pincodeIds = Array.isArray(body.pincodeIds)
      ? body.pincodeIds.map(String)
      : [String(body.pincodeIds)];

    // SLOT VALIDATION

    if (
      !Array.isArray(body.slots) ||
      !body.slots.length
    ) {
      return res.status(400).json({
        success: false,
        message: "slots are required"
      });
    }

    // TEMP LIMIT

    if (body.slots.length > 1) {
      return res.status(400).json({
        success: false,
        message:
          "Only one slot allowed for HYBRID"
      });
    }

    for (const slot of body.slots) {

      if (
        !slot.startTime ||
        !slot.endTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            "slot time is required"
        });
      }

      const startMin =
        toMinutes(slot.startTime);

      const endMin =
        toMinutes(slot.endTime);

      if (startMin >= endMin) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid slot timing"
        });
      }

      if (!slot.conditions) {
        return res.status(400).json({
          success: false,
          message:
            "slot.conditions are required"
        });
      }

      if (!slot.reward?.amount) {
        return res.status(400).json({
          success: false,
          message:
            "slot.reward.amount is required"
        });
      }
    }

    // EXISTING PROGRAM CHECK

    const existingPrograms =
  await prisma.program.findMany({

    where: {

      programType: "PEAK_SLOT",

      isActive: true,

      pincodeIds: {
        hasSome: pincodeIds
      },

      validFrom: {
        lte: end
      },

      validTill: {
        gte: start
      }
    },

    include: {
      slots: true
    }
  });
    // SLOT OVERLAP CHECK

    const conflict = existingPrograms.some(program => {

  // DATE OVERLAP

  const dateOverlap =
    start <= program.validTill &&
    end >= program.validFrom;

  if (!dateOverlap) {
    return false;
  }

  return program.slots.some(existingSlot =>

    body.slots.some(newSlot => {

      const newStart =
        toMinutes(newSlot.startTime);

      const newEnd =
        toMinutes(newSlot.endTime);

      const existingStart =
        existingSlot.startMinutes;

      const existingEnd =
        existingSlot.endMinutes;

      // TIME OVERLAP

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      );
    })
  );
});

    if (conflict) {
      return res.status(400).json({
        success: false,
        message:
          "Hybrid incentive already exists for this slot and pincode"
      });
    }

    // CREATE PROGRAM

    const program =
      await prisma.program.create({

        data: {

          name: body.name,

          programType: "PEAK_SLOT",

          trackingType: "DAILY",

          ruleType: "HYBRID",

          validFrom: start,

          validTill: end,

          cityId: [String(city.id)],

          pincodeIds,

          daysOfWeek:
            body.slots[0].daysOfWeek || [],

          weekStartDay:
            body.weekStartDay || "MON",

          minAcceptanceRate:
            body.slots[0].conditions
              ?.minAcceptanceRate || null,

          minCompletionRate:
            body.slots[0].conditions
              ?.minCompletionRate || null,

          maxPayoutPerDay:
            body.slots[0]
              ?.maxPayoutPerDay || null,

          isActive:
            body.isActive ?? true
        }
      });

    // CREATE SLOT

    for (const slot of body.slots) {

      await prisma.programSlot.create({

        data: {

          programId: program.id,

          startMinutes:
            toMinutes(slot.startTime),

          endMinutes:
            toMinutes(slot.endTime),

          daysOfWeek:
            slot.daysOfWeek || [],

          ruleType: "HYBRID"
        }
      });

      // CREATE TARGET

      await prisma.programTarget.create({

        data: {

          programId: program.id,

          targetOrders:
            slot.conditions
              ?.minOrders || 0,

          targetEarnings:
            slot.conditions
              ?.minEarnings || 0,

          rewardAmount:
            slot.reward
              ?.amount || 0
        }
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Hybrid daily incentive created",

      data: {
        id: program.id
      }
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const getAllPeakSlots = async (req, res) => {
  try {

    const minutesToTime = (mins) => {
      const hrs = Math.floor(mins / 60)
        .toString()
        .padStart(2, "0");

      const min = (mins % 60)
        .toString()
        .padStart(2, "0");

      return `${hrs}:${min}`;
    };

    const programs = await prisma.program.findMany({
      where: {
        programType: "PEAK_SLOT"
      },

      include: {
  slots: {
    include: {
      slabs: true
    }
  },

  targets: true
},

      orderBy: {
        createdAt: "desc"
      }
    });

    const result = programs.map((p) => {

      const base = {
        id: p.id,

        name: p.name,

        ruleType: p.ruleType,

        isActive: p.isActive,

        pincodeIds: p.pincodeIds || []
      };

      // =========================
      // PER_ORDER + SLAB
      // =========================

      if (
        p.ruleType === "PER_ORDER" ||
        p.ruleType === "SLAB"
      ) {

        return {
          ...base,

          slots: (p.slots || []).map((s) => {

  const slotData = {

    slotId: s.id,

    slotTiming:
      `${minutesToTime(s.startMinutes)} - ${minutesToTime(s.endMinutes)}`
  };

  // PER ORDER

  if (p.ruleType === "PER_ORDER") {

    slotData.rewardAmount =
      s.rewardPerOrder || 0;
  }

  // SLAB

  if (p.ruleType === "SLAB") {

    slotData.slabs =
      (s.slabs || []).map((slab) => ({

        minOrders:
          slab.minOrders,

        maxOrders:
          slab.maxOrders,

        rewardAmount:
          slab.rewardAmount
      }));
  }

  return slotData;
})
        };
      }

      // =========================
      // FIXED TARGET
      // =========================

      if (p.ruleType === "FIXED_TARGET") {

        const target = p.targets?.[0];

        const slot = p.slots?.[0];

        return {
          ...base,

          slotId: slot?.id || null,

         

          slotTiming: slot
            ? `${minutesToTime(slot.startMinutes)} - ${minutesToTime(slot.endMinutes)}`
            : null,

          

          target: {
            orders:
              target?.targetOrders || 0
          },

          rewardAmount:
  target?.rewardAmount || 0,
        };
      }

      // =========================
      // HYBRID
      // =========================

      if (p.ruleType === "HYBRID") {

        const target = p.targets?.[0];

        const slot = p.slots?.[0];

        return {
          ...base,

          slotId: slot?.id || null,

          

          slotTiming: slot
            ? `${minutesToTime(slot.startMinutes)} - ${minutesToTime(slot.endMinutes)}`
            : null,

         

          conditions: {

            minOrders:
              target?.targetOrders || 0,

            minEarnings:
              target?.targetEarnings || 0,

            minAcceptanceRate:
              p.minAcceptanceRate || 0,

            minCompletionRate:
              p.minCompletionRate || 0
          },

          rewardAmount:
  target?.rewardAmount || 0,

          maxPayoutPerDay:
            p.maxPayoutPerDay || 0
        };
      }

      return base;
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


const getPeakSlotById = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
  slots: {
    include: {
      slabs: true
    }
  },
  targets: true
}
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Peak slot not found"
      });
    }

    let cityName = [];

    if (program.cityId?.length) {
      const cities = await prisma.city.findMany({
        where: {
          id: { in: program.cityId }
        }
      });

      cityName = cities.map(c => c.name);
    }

    //  RESULT
   let result = {
  id: program.id,
  name: program.name,
  cityName,
  ruleType: program.ruleType,
  isActive: program.isActive
};

// PER ORDER

if (program.ruleType === "PER_ORDER") {

  result.slots = (program.slots || []).map((s) => ({
    startTime: `${String(
      Math.floor(s.startMinutes / 60)
    ).padStart(2, "0")}:${String(
      s.startMinutes % 60
    ).padStart(2, "0")}`,

    endTime: `${String(
      Math.floor(s.endMinutes / 60)
    ).padStart(2, "0")}:${String(
      s.endMinutes % 60
    ).padStart(2, "0")}`,

    daysOfWeek: s.daysOfWeek || [],

    ruleType: s.ruleType,

    reward: {
      amount: s.rewardPerOrder || 0
    }
  }));
}

// SLAB

if (program.ruleType === "SLAB") {

  result.slots = (program.slots || []).map((s) => ({
    startTime: `${String(
      Math.floor(s.startMinutes / 60)
    ).padStart(2, "0")}:${String(
      s.startMinutes % 60
    ).padStart(2, "0")}`,

    endTime: `${String(
      Math.floor(s.endMinutes / 60)
    ).padStart(2, "0")}:${String(
      s.endMinutes % 60
    ).padStart(2, "0")}`,

    daysOfWeek: s.daysOfWeek || [],

    ruleType: s.ruleType,

    slabs: (s.slabs || []).map((slab) => ({
      minOrders: slab.minOrders,
      maxOrders: slab.maxOrders,
      rewardAmount: slab.rewardAmount
    }))
  }));
}

// FIXED TARGET

if (program.ruleType === "FIXED_TARGET") {

  const target = program.targets?.[0];

  result.target = {
    orders: target?.targetOrders || 0
  };

  result.reward = {
    amount: target?.rewardAmount || 0
  };
}

// HYBRID

if (program.ruleType === "HYBRID") {

  const target = program.targets?.[0];

  result.conditions = {
    minOrders: target?.targetOrders || 0,

    minEarnings:
      target?.targetEarnings || 0,

    minAcceptanceRate:
      program.minAcceptanceRate || 0,

    minCompletionRate:
      program.minCompletionRate || 0
  };

  result.reward = {
    amount: target?.rewardAmount || 0
  };

  result.maxPayoutPerDay =
    program.maxPayoutPerDay || 0;
}

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const updatePeakSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        slots: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Peak slot not found"
      });
    }

    const now = new Date();

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const currentDay = now
      .toLocaleString("en-US", { weekday: "short" })
      .toUpperCase(); 

    // check if any slot is active right now
    const isSlotActive = program.slots?.some(slot => {
      const days = slot.daysOfWeek.map(d => d.toUpperCase());

      return (
        days.includes(currentDay) &&
        currentMinutes >= slot.startMinutes &&
        currentMinutes <= slot.endMinutes
      );
    });

    //  BLOCK RULE
    if (isActive === false && isSlotActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate peak slot while it is active"
      });
    }

    const updatedProgram = await prisma.program.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(typeof isActive === "boolean" && { isActive })
      }
    });

    return res.status(200).json({
      success: true,
      message: "Peak slot updated successfully",
      data: updatedProgram
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


const deletePeakSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        slots: true   
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Peak slot not found"
      });
    }

    const now = new Date();

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const currentDay = now
      .toLocaleString("en-US", { weekday: "short" })
      .toUpperCase();

    // check if any slot is active right now
    const isSlotActive = program.slots?.some(slot => {
      const days = slot.daysOfWeek.map(d => d.toUpperCase());

      return (
        days.includes(currentDay) &&
        currentMinutes >= slot.startMinutes &&
        currentMinutes <= slot.endMinutes
      );
    });

    // BLOCK DELETE IF ACTIVE
    if (isSlotActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete peak slot while it is active"
      });
    }

    // SAFE DELETE
    await prisma.program.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: "Peak slot deleted successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

module.exports = {
  createPerOrderPeakSlot,
  createSlabPeakSlot,
  getAllPeakSlots,
  updatePeakSlot,
  getPeakSlotById,
  deletePeakSlot,
  createPeakSlot
};
