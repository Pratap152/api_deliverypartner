const prisma = require("../config/prisma");

const getWeather = require("../utils/weather");

const createCityPayoutConfig = async (req, res) => {
  try {
    const {
      name,
      scenarioType,
      cityId,
      
      vehicleType,
      basePay,
      perKmRate,
      surgeConfig,
      peakConfig,
      weatherConfig,
      notes,
      latitude,
      longitude,
    } = req.body;

    if (!name || !scenarioType) {
      return res.status(400).json({
        success: false,
        message: "name and scenarioType are required",
      });
    }

  if (!cityId) {
  return res.status(400).json({
    success: false,
    message: "cityId is required",
  });
}

// Check whether city exists
const cityExists = await prisma.city.findUnique({
  where: {
    id: cityId
  }
});
console.log("cityExists:", cityExists);

if (!cityExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid cityId. City does not exist"
  });
}
if (!cityExists.tier) {
  return res.status(400).json({
    success: false,
    message: "Selected city does not have tier configured",
  });
}


const normalizedTier = cityExists.tier;
if (!normalizedTier) {
  return res.status(400).json({
    success: false,
    message: "tier must be one of tier1, tier2, tier3",
  });
}


    if (!basePay || basePay <= 0) {
      return res.status(400).json({
        success: false,
        message: "basePay must be greater than 0",
      });
    }

    if (perKmRate < 0) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be >= 0",
      });
    }

    let weatherResult = {
      isRaining: false,
    };

    if (weatherConfig?.enabled && latitude && longitude) {
      weatherResult = await getWeather(latitude, longitude);
    }

    const isWeatherEnabled = weatherConfig?.enabled && weatherResult.isRaining;

    const finalWeatherConfig = {
      enabled: isWeatherEnabled || false,
      isRaining: weatherResult.isRaining,
      rainExtraPay: isWeatherEnabled ? weatherConfig?.rainExtraPay || 0 : 0,
      multiplier: isWeatherEnabled ? weatherConfig?.multiplier || 1 : 1,
    };

    const lastConfig = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        scenarioType,
        vehicleType,
        pincodeIds: { isEmpty: true },
      },
      orderBy: { version: "desc" },
    });

    const newVersion = (lastConfig?.version || 0) + 1;

    await prisma.payoutConfig.updateMany({
      where: {
        cityId,
        scenarioType,
        vehicleType,
        isActive: true,
        pincodeIds: { isEmpty: true },
      },
      data: {
        isActive: false,
      },
    });

    const newConfig = await prisma.payoutConfig.create({
      data: {
        name,
        scenarioType,
        cityId,
          cityTier: normalizedTier,
        pincodeIds: [],
        vehicleType,
        basePay,
        perKmRate,
        surgeConfig,
        peakConfig,
        weatherConfig: finalWeatherConfig,
        notes,
        version: newVersion,
        isActive: true,
        createdBy: "admin",
      },
    });

    return res.status(201).json({
      success: true,
      data: req.body,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//PINCODE LEVEL API

const createPincodePayoutConfig = async (req, res) => {
  try {
    const {
      name,
      scenarioType,
      cityId,
      
      pincodeIds = [],
      vehicleType,
      basePay,
      perKmRate,
      surgeConfig,
      peakConfig,
      weatherConfig,
      notes,
      latitude,
      longitude,
    } = req.body;
   const cityExists = await prisma.city.findUnique({
  where: {
    id: cityId,
  },
  include: {
    pincodes: true,
  },
});

if (!cityExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid cityId. City does not exist",
  });
}
if (!cityExists.tier) {
  return res.status(400).json({
    success: false,
    message: "Selected city does not have tier configured",
  });
}
const cityPincodeValues = cityExists.pincodes.map((p) =>
  String(p.code).trim()
);

console.log("DB pincodes:", cityPincodeValues);
console.log("Request pincodes:", pincodeIds);

const normalizedRequestPincodes = pincodeIds.map((p) =>
  String(p).trim()
);

const invalidPincodes = normalizedRequestPincodes.filter(
  (pincode) => !cityPincodeValues.includes(pincode)
);

if (invalidPincodes.length > 0) {
  return res.status(400).json({
    success: false,
    message: `These pincodes do not belong to selected city: ${invalidPincodes.join(", ")}`,
  });
}

const normalizedTier = cityExists.tier;
    if (!cityId || !scenarioType || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "cityId, scenarioType, vehicleType are required",
      });
    }

    if (!pincodeIds.length) {
      return res.status(400).json({
        success: false,
        message: "pincodeIds are required",
      });
    }

    if (!basePay || basePay <= 0) {
      return res.status(400).json({
        success: false,
        message: "basePay must be greater than 0",
      });
    }

    if (perKmRate < 0) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be >= 0",
      });
    }

    const finalWeatherConfig = {
      enabled: weatherConfig?.enabled || false,
      multiplier: weatherConfig?.multiplier || 1,
      rainExtraPay: weatherConfig?.rainExtraPay || 0,
    };

    const createdConfigs = [];

    for (const pincodeId of pincodeIds) {
      const lastConfig = await prisma.payoutConfig.findFirst({
        where: {
          cityId,
          scenarioType,
          vehicleType,
          pincodeIds: {
            has: String(pincodeId),
          },
        },
        orderBy: {
          version: "desc",
        },
      });

      const newVersion = (lastConfig?.version || 0) + 1;

      await prisma.payoutConfig.updateMany({
        where: {
          cityId,
          scenarioType,
          vehicleType,
          isActive: true,
          pincodeIds: {
            has: String(pincodeId),
          },
        },
        data: {
          isActive: false,
        },
      });

      const newConfig = await prisma.payoutConfig.create({
        data: {
          name,
          scenarioType,
          cityTier: normalizedTier,
          cityId,
          pincodeIds: [String(pincodeId)],
          vehicleType,
          basePay,
          perKmRate,
          surgeConfig,
          peakConfig,
          weatherConfig: finalWeatherConfig,
          notes,
          version: newVersion,
          isActive: true,
          createdBy: "admin",
        },
      });

      createdConfigs.push(newConfig);
    }
return res.status(201).json({
  success: true,
  message: "Pincode configs created successfully",
  data: {
    cityId,
    cityTier: normalizedTier,
    scenarioType,
    vehicleType,
    pincodeIds,
    basePay,
    perKmRate,
    surgeConfig,
    peakConfig,
    weatherConfig: finalWeatherConfig,
    notes,
    createdCount: createdConfigs.length,
  },
});
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getActivePayoutConfig = async (req, res) => {
  try {
    const { cityId } = req.query;

    //  VALIDATION
    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    const now = new Date();

    // FETCH ACTIVE CONFIG
    const config = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        isActive: true,

        // DATE FILTER
        AND: [
          {
            OR: [{ applicableFrom: null }, { applicableFrom: { lte: now } }],
          },
          {
            OR: [{ applicableTill: null }, { applicableTill: { gte: now } }],
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // NOT FOUND
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No active config found for this city",
      });
    }

    //  SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      data: {
        configId: config.id,
        scenarioType: config.scenarioType,
        name: config.name,

        cityId: config.cityId,
        pincodeIds: config.pincodeIds,

        vehicleType: config.vehicleType,

        basePay: config.basePay,
        perKmRate: config.perKmRate,

        surgeConfig: config.surgeConfig,
        peakConfig: config.peakConfig,
        weatherConfig: config.weatherConfig,

        version: config.version,
        isActive: config.isActive,
        createdAt: config.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Active Config Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getPayoutConfigHistory = async (req, res) => {
  try {
    const { cityId, scenarioType, type, pincode } = req.query;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    let configs = await prisma.payoutConfig.findMany({
      where: {
        cityId,
        ...(scenarioType && { scenarioType }),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        version: true,
        scenarioType: true,
        cityId: true,
        pincodeIds: true,
        vehicleType: true,
        basePay: true,
        perKmRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (type === "CITY") {
      configs = configs.filter(
        (cfg) => !cfg.pincodeIds || cfg.pincodeIds.length === 0,
      );
    }

    if (type === "PINCODE") {
      configs = configs.filter(
        (cfg) => cfg.pincodeIds && cfg.pincodeIds.length > 0,
      );

      if (pincode) {
        configs = configs.filter((cfg) => cfg.pincodeIds.includes(pincode));
      }
    }

    if (!configs.length) {
      return res.status(404).json({
        success: false,
        message: "No payout config history found",
      });
    }

    return res.status(200).json({
      success: true,
      total: configs.length,
      data: configs.map((cfg) => ({
        configId: cfg.id,

        type: cfg.pincodeIds?.length > 0 ? "PINCODE" : "CITY",

        name: cfg.name,

        version: cfg.version,

        scenarioType: cfg.scenarioType,

        cityId: cfg.cityId,

        pincodeIds: cfg.pincodeIds,

        vehicleType: cfg.vehicleType,

        basePay: cfg.basePay,

        perKmRate: cfg.perKmRate,

        isActive: cfg.isActive,

        createdAt: cfg.createdAt,

        updatedAt: cfg.updatedAt,
      })),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const updateBasePay = async (req, res) => {
  try {
    const { cityId, pincodeId } = req.query;
    const { basePay } = req.body;

    // VALIDATION
    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    if (!basePay || Number(basePay) <= 0) {
      return res.status(400).json({
        success: false,
        message: "basePay must be greater than 0",
      });
    }

    let whereCondition = {
      cityId,
      isActive: true,
    };

    // PINCODE LEVEL
    if (pincodeId) {
      whereCondition.pincodeIds = {
        has: String(pincodeId),
      };
    } else {
      // CITY LEVEL ONLY
      whereCondition.pincodeIds = {
        isEmpty: true,
      };
    }

    const existingConfig = await prisma.payoutConfig.findFirst({
      where: whereCondition,
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found",
      });
    }

    const updated = await prisma.payoutConfig.update({
      where: {
        id: existingConfig.id,
      },
      data: {
        basePay: Number(basePay),
      },
    });
let responseData;

// IF PINCODE PASSED
if (pincodeId) {

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: [String(pincodeId)],
    basePay: updated.basePay,
  };

} else {

  // GET ALL PINCODES OF CITY
  const pincodeList = await prisma.payoutConfig.findMany({
    where: {
      cityId: String(cityId),
      isActive: true,
      NOT: {
        pincodeIds: {
          equals: [],
        },
      },
    },
    select: {
      pincodeIds: true,
    },
  });

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: pincodeList.flatMap(item => item.pincodeIds),
    basePay: updated.basePay,
  };
}    
return res.status(200).json({
  success: true,
  message: "Base pay updated successfully",
  data: responseData,
});
  } catch (error) {
    console.log("UPDATE BASE PAY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const updateDistancePay = async (req, res) => {
  try {
    const { cityId, pincodeId } = req.query;
    const { perKmRate } = req.body;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    if (perKmRate === undefined || Number(perKmRate) < 0) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be greater than or equal to 0",
      });
    }

    let whereCondition = {
      cityId,
      isActive: true,
    };

    // PINCODE LEVEL
    if (pincodeId) {
      whereCondition.pincodeIds = {
        has: String(pincodeId),
      };
    } else {
      // CITY LEVEL ONLY
      whereCondition.pincodeIds = {
        isEmpty: true,
      };
    }

    const existingConfig = await prisma.payoutConfig.findFirst({
      where: whereCondition,
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found",
      });
    }
    const updated = await prisma.payoutConfig.update({
      where: {
        id: existingConfig.id,
      },
      data: {
        perKmRate: Number(perKmRate),
      },
    });
    let responseData;

// IF PINCODE PASSED
if (pincodeId) {

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: [String(pincodeId)],
    perKmRate: updated.perKmRate,
  };

} else {

  // GET ALL PINCODES OF CITY
  const pincodeList = await prisma.payoutConfig.findMany({
    where: {
      cityId: String(cityId),
      isActive: true,
      NOT: {
        pincodeIds: {
          equals: [],
        },
      },
    },
    select: {
      pincodeIds: true,
    },
  });

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: pincodeList.flatMap(item => item.pincodeIds),
    perKmRate: updated.perKmRate,
  };
}
return res.status(200).json({
  success: true,
  message: "Distance pay Per KM rate updated successfully",
  data: responseData,
});
  } catch (error) {
    console.log("UPDATE PER KM RATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const updateSurgeConfig = async (req, res) => {
  try {
    const { cityId, pincodeId } = req.query;
    const { surgeConfig } = req.body;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    if (!surgeConfig) {
      return res.status(400).json({
        success: false,
        message: "surgeConfig is required",
      });
    }
    let whereCondition = {
      cityId,
      isActive: true,
    };

    // PINCODE LEVEL
    if (pincodeId) {
      whereCondition.pincodeIds = {
        has: String(pincodeId),
      };
    } else {
      // CITY LEVEL ONLY
      whereCondition.pincodeIds = {
        isEmpty: true,
      };
    }

    const existingConfig = await prisma.payoutConfig.findFirst({
      where: whereCondition,
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found",
      });
    }
    const oldSurgeConfig = existingConfig.surgeConfig || {};

    if (
      surgeConfig.multiplier !== undefined &&
      Number(surgeConfig.multiplier) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "multiplier must be > 0",
      });
    }

    if (
      surgeConfig.minLiveOrders !== undefined &&
      Number(surgeConfig.minLiveOrders) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "minLiveOrders must be >= 0",
      });
    }

    if (
      surgeConfig.extraPay !== undefined &&
      Number(surgeConfig.extraPay) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "extraPay must be >= 0",
      });
    }

const finalSurgeConfig = {
  enabled:
    surgeConfig.enabled !== undefined
      ? surgeConfig.enabled
      : oldSurgeConfig.enabled,

  multiplier:
    surgeConfig.multiplier !== undefined
      ? Number(surgeConfig.multiplier)
      : oldSurgeConfig.multiplier,

  minLiveOrders:
    surgeConfig.minLiveOrders !== undefined
      ? Number(surgeConfig.minLiveOrders)
      : oldSurgeConfig.minLiveOrders,

  extraPay:
    surgeConfig.extraPay !== undefined
      ? Number(surgeConfig.extraPay)
      : oldSurgeConfig.extraPay,
};


/**
 * UPDATE QUERY
 */

const updated = await prisma.payoutConfig.update({
  where: {
    id: existingConfig.id,
  },
  data: {
    surgeConfig: finalSurgeConfig,
  },
});


let responseData;

// IF PINCODE PASSED
if (pincodeId) {

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: [String(pincodeId)],
    surgeConfig: updated.surgeConfig,
  };

} else {

  // GET ALL PINCODES OF CITY
  const pincodeList = await prisma.payoutConfig.findMany({
    where: {
      cityId: String(cityId),
      isActive: true,
      NOT: {
        pincodeIds: {
          equals: [],
        },
      },
    },
    select: {
      pincodeIds: true,
    },
  });

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: pincodeList.flatMap(item => item.pincodeIds),
    surgeConfig: updated.surgeConfig,
  };
}
   return res.status(200).json({
  success: true,
  message: "Surge config updated successfully",
  data: responseData,
});
  } catch (error) {
    console.log("UPDATE SURGE CONFIG ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// const rollbackPayoutConfig = async (req, res) => {
//   try {
//     const { cityId } = req.query;

//     if (!cityId) {
//       return res.status(400).json({
//         success: false,
//         message: "cityId is required",
//       });
//     }

//     /**
//      * STEP 1: GET CURRENT ACTIVE CONFIG
//      */
//     const currentConfig = await prisma.payoutConfig.findFirst({
//       where: {
//         cityId,
//         isActive: true,
//       },
//     });

//     if (!currentConfig) {
//       return res.status(400).json({
//         success: false,
//         message: "No active config found",
//       });
//     }

//     /**
//      * STEP 2: GET PREVIOUS VERSION (IMPORTANT FIX)
//      */
//     const previousConfig = await prisma.payoutConfig.findFirst({
//   where: {
//     cityId,

//     version: { lt: currentConfig.version }
//   },
//   orderBy: {
//     version: "desc"
//   }
// });

//     if (!previousConfig) {
//       return res.status(400).json({
//         success: false,
//         message: "No previous version found to rollback",
//       });
//     }

//     /**
//      * STEP 3: TRANSACTION ROLLBACK
//      */
//     const result = await prisma.$transaction(async (tx) => {
//       // deactivate current
//       await tx.payoutConfig.update({
//         where: { id: currentConfig.id },
//         data: { isActive: false },
//       });

//       // activate previous
//       return await tx.payoutConfig.update({
//         where: { id: previousConfig.id },
//         data: { isActive: true },
//       });
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Rollback successful",
//       data: result,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
const rollbackPayoutConfig = async (req, res) => {
  try {
    const { cityId, pincodeId } = req.query;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    let whereCondition = {
      cityId,
      isActive: true,
    };

    // OPTIONAL PINCODE FILTER
    if (pincodeId) {
      whereCondition.pincodeIds = {
        has: String(pincodeId),
      };
    } else {
      // CITY LEVEL ONLY
      whereCondition.pincodeIds = {
        isEmpty: true,
      };
    }

    console.log("CITY ID:", cityId);
    console.log("PINCODE ID:", pincodeId);
    console.log("WHERE:", whereCondition);

    const currentConfig = await prisma.payoutConfig.findFirst({
      where: whereCondition,
      orderBy: {
        version: "desc",
      },
    });

    if (!currentConfig) {
      return res.status(400).json({
        success: false,
        message: "No active config found",
      });
    }

    let previousWhereCondition = {
      cityId,
      version: {
        lt: currentConfig.version,
      },
    };

    // PINCODE LEVEL
    if (pincodeId) {
      previousWhereCondition.pincodeIds = {
        has: String(pincodeId),
      };
    } else {
      // CITY LEVEL
      previousWhereCondition.pincodeIds = {
        isEmpty: true,
      };
    }

    const previousConfig = await prisma.payoutConfig.findFirst({
      where: previousWhereCondition,
      orderBy: {
        version: "desc",
      },
    });

    if (!previousConfig) {
      return res.status(400).json({
        success: false,
        message: "No previous version found to rollback",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // DEACTIVATE CURRENT
      await tx.payoutConfig.update({
        where: {
          id: currentConfig.id,
        },
        data: {
          isActive: false,
        },
      });

      // ACTIVATE PREVIOUS
      return await tx.payoutConfig.update({
        where: {
          id: previousConfig.id,
        },
        data: {
          isActive: true,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Rollback successful",
      data: result,
    });
  } catch (error) {
    console.log("ROLLBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const togglePayoutConfigStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // validation
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const config = await tx.payoutConfig.findUnique({
        where: { id },
      });

      if (!config) {
        throw new Error("NOT_FOUND");
      }

      // Prevent disabling last active config
      if (config.isActive && isActive === false) {
        const activeCount = await tx.payoutConfig.count({
          where: {
            AND: [{ cityId: config.cityId }, { isActive: true }],
          },
        });

        if (activeCount <= 1) {
          throw new Error("ONLY_ACTIVE");
        }
      }

      // If activating → deactivate others
      if (isActive === true) {
        await prisma.payoutConfig.updateMany({
          where: {
            cityId,
            scenarioType,
            vehicleType,
            isActive: true,
            pincodeIds: { isEmpty: true },
          },
          data: {
            isActive: false,
          },
        });
      }

      // Update this config
      const updated = await tx.payoutConfig.update({
        where: { id },
        data: { isActive },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Config status updated",
      data: {
        configId: result.id,
        isActive: result.isActive,
        updatedAt: result.updatedAt,
      },
      meta: {},
    });
  } catch (err) {
    console.error("TOGGLE ERROR:", err);

    if (err.message === "ONLY_ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate the only active config",
      });
    }

    if (err.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Config not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update config status",
    });
  }
};
const updateWeatherConfig = async (req, res) => {
  try {
    const { cityId, pincodeId } = req.query;
    const { weatherConfig } = req.body;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    if (!weatherConfig) {
      return res.status(400).json({
        success: false,
        message: "weatherConfig is required",
      });
    }

    let whereCondition = {
      cityId,
      isActive: true,
    };

    // PINCODE LEVEL
    if (pincodeId) {
      whereCondition.pincodeIds = {
        has: String(pincodeId),
      };
    } else {
      // CITY LEVEL ONLY
      whereCondition.pincodeIds = {
        isEmpty: true,
      };
    }

    const existingConfig = await prisma.payoutConfig.findFirst({
      where: whereCondition,
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found",
      });
    }

    const oldWeatherConfig = existingConfig.weatherConfig || {};

    if (
      weatherConfig.rainExtraPay !== undefined &&
      Number(weatherConfig.rainExtraPay) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "rainExtraPay must be >= 0",
      });
    }

    if (
      weatherConfig.multiplier !== undefined &&
      Number(weatherConfig.multiplier) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "multiplier must be > 0",
      });
    }

const finalWeatherConfig = {
  enabled:
    weatherConfig.enabled !== undefined
      ? weatherConfig.enabled
      : oldWeatherConfig.enabled,

  multiplier:
    weatherConfig.multiplier !== undefined
      ? Number(weatherConfig.multiplier)
      : oldWeatherConfig.multiplier,

  rainExtraPay:
    weatherConfig.rainExtraPay !== undefined
      ? Number(weatherConfig.rainExtraPay)
      : oldWeatherConfig.rainExtraPay,
};
    await prisma.payoutConfig.updateMany({
  where: {
    cityId: String(cityId),
    isActive: true,
  },
  data: {
    weatherConfig: finalWeatherConfig,
  },
});

const updated = await prisma.payoutConfig.findFirst({
  where: {
    cityId: String(cityId),
    isActive: true,
    pincodeIds: {
      isEmpty: true,
    },
  },
});
    let responseData;

// IF PINCODE PASSED
if (pincodeId) {

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: [String(pincodeId)],
    weatherConfig: updated.weatherConfig,
  };

} else {

  // GET ALL PINCODES OF CITY
  const pincodeList = await prisma.payoutConfig.findMany({
    where: {
      cityId: String(cityId),
      isActive: true,
      NOT: {
        pincodeIds: {
          equals: [],
        },
      },
    },
    select: {
      pincodeIds: true,
    },
  });

  responseData = {
    id: updated.id,
    cityId: updated.cityId,
    pincodeIds: pincodeList.flatMap(item => item.pincodeIds),
    weatherConfig: updated.weatherConfig,
  };
}
    return res.status(200).json({
  success: true,
  message: "Weather config updated successfully",
  data: responseData,
});
  } catch (error) {
    console.log("UPDATE WEATHER CONFIG ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//rider getsurgestatus
const getSurgeStatus = async (req, res) => {
  try {
    //  rider auth
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    //  fetch rider location
    const rider = await prisma.rider.findUnique({
      where: {
        id: riderId,
      },
      select: {
        location: {
          select: {
            city: true,
            pincode: true,
          },
        },
      },
    });

    if (!rider || !rider.location) {
      return res.status(404).json({
        success: false,
        message: "Rider location not found",
      });
    }

    //  location values
    const cityId = rider.location.city;
    const pincode = rider.location.pincode;

    //  active config
    const config = await prisma.payoutConfig.findFirst({
      where: {
        isActive: true,
        pincodeIds: {
          has: pincode,
        },
      },
      orderBy: {
        version: "desc",
      },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No active config found",
      });
    }

    const surge = config.surgeConfig || {};

    // pincode validation
    const isPincodeAllowed =
      !config.pincodeIds?.length || config.pincodeIds.includes(pincode);

    //  surge status
    const isSurgeActive = surge.enabled === true && isPincodeAllowed;

    return res.status(200).json({
      success: true,
      data: {
        isSurgeActive,
        scenarioType: config.scenarioType,
        multiplier: isSurgeActive ? surge.multiplier : 1,
        minDemand: surge.minDemand || null,
      },
    });
  } catch (err) {
    console.error(" Surge Status Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updatePincodePayoutConfig = async (req, res) => {
  try {
    const { cityId, pincodeId } = req.query;

    const {
      name,
      scenarioType,
      vehicleType,
      basePay,
      perKmRate,
      surgeConfig,
      peakConfig,
      weatherConfig,
      notes,
    } = req.body;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    if (!pincodeId) {
      return res.status(400).json({
        success: false,
        message: "pincodeId is required",
      });
    }

    if (!name || !scenarioType || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "name, scenarioType and vehicleType are required",
      });
    }

    if (basePay === undefined || Number(basePay) <= 0) {
      return res.status(400).json({
        success: false,
        message: "basePay must be greater than 0",
      });
    }

    if (perKmRate === undefined || Number(perKmRate) < 0) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be >= 0",
      });
    }

    const existingConfig = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        isActive: true,
        pincodeIds: {
          has: String(pincodeId),
        },
      },
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found",
      });
    }

    const finalWeatherConfig = {
      enabled: weatherConfig?.enabled || false,
      multiplier: weatherConfig?.multiplier || 1,
      rainExtraPay: weatherConfig?.rainExtraPay || 0,
    };

    const updatedConfig = await prisma.payoutConfig.update({
      where: {
        id: existingConfig.id,
      },
      data: {
        name,
        scenarioType,
        cityId,
        pincodeIds: [String(pincodeId)],
        vehicleType,
        basePay: Number(basePay),
        perKmRate: Number(perKmRate),
        surgeConfig,
        peakConfig,
        weatherConfig: finalWeatherConfig,
        notes,
        version: existingConfig.version + 1,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Pincode payout config updated successfully",
      data: updatedConfig,
    });
  } catch (error) {
    console.error("UPDATE PINCODE CONFIG ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const updateCityPayoutConfig = async (req, res) => {
  try {
    const { cityId } = req.query;

    const {
      name,
      scenarioType,
      vehicleType,
      basePay,
      perKmRate,
      surgeConfig,
      peakConfig,
      weatherConfig,
      notes,
    } = req.body;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required",
      });
    }

    if (!name || !scenarioType) {
      return res.status(400).json({
        success: false,
        message: "name and scenarioType are required",
      });
    }

    if (!vehicleType) {
      return res.status(400).json({
        success: false,
        message: "vehicleType is required",
      });
    }

    if (basePay === undefined || Number(basePay) <= 0) {
      return res.status(400).json({
        success: false,
        message: "basePay must be greater than 0",
      });
    }

    if (perKmRate === undefined || Number(perKmRate) < 0) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be >= 0",
      });
    }

    const existingConfig = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        isActive: true,
        pincodeIds: {
          isEmpty: true,
        },
      },
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "City payout config not found",
      });
    }

    const finalWeatherConfig = {
      enabled: weatherConfig?.enabled || false,
      multiplier: weatherConfig?.multiplier || 1,
      rainExtraPay: weatherConfig?.rainExtraPay || 0,
    };

    const updatedConfig = await prisma.payoutConfig.update({
      where: {
        id: existingConfig.id,
      },
      data: {
        name,
        scenarioType,
        cityId,
        pincodeIds: [],
        vehicleType,
        basePay: Number(basePay),
        perKmRate: Number(perKmRate),
        surgeConfig,
        peakConfig,
        weatherConfig: finalWeatherConfig,
        notes,
        version: existingConfig.version + 1,
      },
    });

    return res.status(200).json({
      success: true,
      message: "City payout config updated successfully",
      data: updatedConfig,
    });
  } catch (error) {
    console.error("UPDATE CITY CONFIG ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPayoutConfigs = async (req, res) => {
  try {
    const { cityId } = req.query;
    let whereCondition = {};
    if (cityId) {
      whereCondition.cityId = cityId;
    }

    const configs = await prisma.payoutConfig.findMany({
      where: whereCondition,

      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedData = configs.map((config) => ({
      configId: config.id,

      scenarioType: config.scenarioType,

      name: config.name,

      cityId: config.cityId,

      pincodeIds: config.pincodeIds,

      vehicleType: config.vehicleType,

      basePay: config.basePay,

      perKmRate: config.perKmRate,

      surgeConfig: config.surgeConfig,

      peakConfig: config.peakConfig,

      weatherConfig: config.weatherConfig,

      version: config.version,

      isActive: config.isActive,

      createdAt: config.createdAt,
    }));

    return res.status(200).json({
      success: true,

      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
const updatePayoutConfig = async (req, res) => {
  try {
    const { tier, cityId, pincodeIds, configType } = req.query;

    const {
      basePay,
      perKmRate,
      surgeConfig,
      peakConfig,
      weatherConfig,
    } = req.body;

   

    if (!tier && !cityId && !pincodeIds) {
      return res.status(400).json({
        success: false,
        message: "Please provide tier or cityId or pincodeIds in query",
      });
    }

    const updateData = {};

    if (basePay !== undefined) updateData.basePay = basePay;
    if (perKmRate !== undefined) updateData.perKmRate = perKmRate;
    if (surgeConfig !== undefined) updateData.surgeConfig = surgeConfig;
    if (peakConfig !== undefined) updateData.peakConfig = peakConfig;
    if (weatherConfig !== undefined) updateData.weatherConfig = weatherConfig;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({
        success: false,
        message: "No update fields provided",
      });
    }


const where = {
  isActive: true,
};
    if (tier) {
      where.cityTier = tier;
    }

    if (cityId) {
      where.cityId = cityId;
    }

    if (pincodeIds) {
      const parsed = pincodeIds.split(",").map((p) => p.trim());
      where.pincodeIds = { hasSome: parsed };
    }

    if (configType === "city") {
      where.pincodeIds = { isEmpty: true };
    }

    if (configType === "pincode") {
      where.NOT = { pincodeIds: { isEmpty: true } };
    }
    console.log("WHERE:", where);

const matchingConfigs = await prisma.payoutConfig.findMany({
  where,
  select: {
    id: true,
    version: true,
    basePay: true,
    perKmRate: true,
    isActive: true,
    cityId: true,
    pincodeIds: true,
  },
});

console.log(
  "MATCHING CONFIGS:",
  JSON.stringify(matchingConfigs, null, 2)
);
    
    const result = await prisma.payoutConfig.updateMany({
      where,
      data: updateData,
    });

   
    const updatedData = await prisma.payoutConfig.findMany({
      where,
      select: {
        id: true,
        cityId: true,
        cityTier: true,
        pincodeIds: true,
      },
    });


    let responseData = {};

    // PINCODE LEVEL
    if (pincodeIds) {
      responseData = {
        updatedPincodes: pincodeIds.split(",").map((p) => p.trim()),
      };
    }

    // CITY LEVEL
    else if (cityId) {
      const uniquePincodes = [
        ...new Set(updatedData.flatMap((i) => i.pincodeIds)),
      ];

      responseData = {
        cityId,
        pincodeIds: uniquePincodes,
      };
    }

    // TIER LEVEL
    else if (tier) {
      const uniqueCityIds = [
        ...new Set(updatedData.map((i) => i.cityId)),
      ];

      responseData = {
        tier,
        cityIds: uniqueCityIds,
      };
    }

    return res.status(200).json({
      success: true,
      message: "Payout configs updated successfully",
      updatedCount: result.count,
      updatedFields: updateData,
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPincodePayoutConfig,
  createCityPayoutConfig,
  getActivePayoutConfig,
  getPayoutConfigHistory,
  updateBasePay,
  updateSurgeConfig,
  updateDistancePay,
  rollbackPayoutConfig,
  togglePayoutConfigStatus,
  getSurgeStatus,
  updateCityPayoutConfig,
  updatePincodePayoutConfig,
  updateWeatherConfig,
  getPayoutConfigs,
  updatePayoutConfig
};
