const prisma = require("../config/prisma");

const createPayoutConfig = async (req, res) => {
  try {
    const {
      name,
      scenarioType,
      cityId,
      pincodeIds,
      vehicleType,
      basePay,
      perKmRate,
      surgeConfig,
      peakConfig,
      weatherConfig,
      notes,
      applicableFrom,
      applicableTill
    } = req.body;

    //  VALIDATION 
    if (!scenarioType || !name) {
      return res.status(400).json({
        success: false,
        message: "scenarioType and name are required"
      });
    }

    if (!basePay || basePay <= 0) {
      return res.status(400).json({
        success: false,
        message: "Base pay must be greater than 0"
      });
    }

    if (perKmRate < 0) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be >= 0"
      });
    }

    if (!surgeConfig) {
      return res.status(400).json({
        success: false,
        message: "surgeConfig is required"
      });
    }
    if (applicableFrom && applicableTill) {
      if (new Date(applicableFrom) > new Date(applicableTill)) {
        return res.status(400).json({
          success: false,
          message: "applicableFrom cannot be greater than applicableTill"
        });
      }
    }

    //  CHECK EXISTING 
    const existingConfig = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        scenarioType,
        vehicleType,
        isActive: true,
        pincodeIds: {
          hasSome: pincodeIds
        }
      }
    });

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message:
          "Config already exists for this segment. Delete or deactivate it before creating a new one.",
        data: {
          existingConfigId: existingConfig.id
        }
      });
    }

    //  CREATE NEW CONFIG 
    const newConfig = await prisma.payoutConfig.create({
      data: {
        name,
        scenarioType,
        cityId,
        pincodeIds,
        vehicleType,
        basePay,
        perKmRate,
        surgeConfig,
        peakConfig,
        weatherConfig,
        version: 1, 
        isActive: true,
        notes,
        createdBy: "admin",
        applicableFrom: applicableFrom ? new Date(applicableFrom) : null,
        applicableTill: applicableTill ? new Date(applicableTill) : null
      }
    });

    //  RESPONSE
    return res.status(201).json({
      success: true,
      message: "Payout config created successfully",
      data: {
        configId: newConfig.id,
        version: newConfig.version,
        isActive: newConfig.isActive,
        scenarioType: newConfig.scenarioType,
        cityId: newConfig.cityId,
        createdAt: newConfig.createdAt,
        applicableFrom: newConfig.applicableFrom,
        applicableTill: newConfig.applicableTill
      }
    });

  } catch (error) {
    console.error("Create Payout Config Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
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
        message: "cityId is required"
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
            OR: [
              { applicableFrom: null },
              { applicableFrom: { lte: now } }
            ]
          },
          {
            OR: [
              { applicableTill: null },
              { applicableTill: { gte: now } }
            ]
          }
        ]
      },
      orderBy: {
        createdAt: "desc" 
      }
    });

    // NOT FOUND 
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No active config found for this city"
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
        createdAt: config.createdAt
      }
    });

  } catch (error) {
    console.error("Get Active Config Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getPayoutConfigHistory = async (req, res) => {
  try {
    const { cityId, scenarioType } = req.query;

    //  VALIDATION
    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "cityId is required"
      });
    }

    //  FETCH HISTORY
    const configs = await prisma.payoutConfig.findMany({
      where: {
        cityId,
        ...(scenarioType && { scenarioType })
      },
      orderBy: [
        { createdAt: "desc" } 
      ],
      select: {
        id: true,
        version: true,
        scenarioType: true,
        isActive: true,
        createdAt: true
      }
    });

    //  NO DATA 
    if (!configs || configs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No config history found for this city"
      });
    }

    // FORMAT RESPONSE 
    const formatted = configs.map((cfg) => ({
      configId: cfg.id,
      version: cfg.version,
      scenarioType: cfg.scenarioType,
      isActive: cfg.isActive,
      createdAt: cfg.createdAt
    }));

    // SUCCESS 
    return res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error("Get Config History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


const updateBasePay = async (req, res) => {
  try {
    const id = req.body.id || req.body.configId;
    const basePay = req.body.basePay;
    const reason = req.body.reason;

    if (!id || basePay === undefined) {
      return res.status(400).json({
        success: false,
        message: "id and basePay are required",
      });
    }

    const newBasePay = Number(basePay);

    if (isNaN(newBasePay)) {
      return res.status(400).json({
        success: false,
        message: "basePay must be a valid number",
      });
    }

    //check existing config
    const existingConfig = await prisma.payoutConfig.findUnique({
      where: { id },
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found",
      });
    }

    if (!existingConfig.isActive) {
      return res.status(403).json({
        success: false,
        message: "Cannot update inactive payout config",
      });
    }

    const oldValue = existingConfig.basePay;

    //  update ONLY basePay
    const updatedConfig = await prisma.payoutConfig.update({
      where: { id },
      data: {
        basePay: newBasePay,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Base pay updated successfully",
      data: {
        id: updatedConfig.id,
        updatedField: "basePay",
        oldValue,
        newValue: updatedConfig.basePay,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error("Prisma Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDistancePay = async (req, res) => {
  try {
    const cityId = req.body.cityId;
    const perKmRate = req.body.perKmRate;

    //  Validation
    if (!cityId || perKmRate === undefined) {
      return res.status(400).json({
        success: false,
        message: "cityId and perKmRate are required",
      });
    }

    const newRate = Number(perKmRate);

    if (isNaN(newRate)) {
      return res.status(400).json({
        success: false,
        message: "perKmRate must be a valid number",
      });
    }

    // Find config by cityId
    const existingConfig = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        isActive: true
      },
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found for this city",
      });
    }

    const oldValue = existingConfig.perKmRate;

    // Update ONLY perKmRate
    const updatedConfig = await prisma.payoutConfig.update({
      where: { id: existingConfig.id },
      data: {
        perKmRate: newRate,
        version: existingConfig.version + 1,
      },
    });

    // Response
    return res.status(200).json({
      success: true,
      message: "Distance pay updated",
      data: {
        cityId: updatedConfig.id,
        version: updatedConfig.version,
        updatedField: "perKmRate",
        oldValue,
        newValue: updatedConfig.perKmRate,
      },
    });
  } catch (error) {
    console.error("Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSurgeConfig = async (req, res) => {
  try {
    const cityId = req.body.cityId;
    const surgeConfig = req.body.surgeConfig;
    //Validation
    if (!cityId || !surgeConfig) {
      return res.status(400).json({
        success: false,
        message: "cityId and surgeConfig are required",
      });
    }

    // Find active config for city
    const existingConfig = await prisma.payoutConfig.findFirst({
      where: {
        cityId,
        isActive: true,
      },
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Payout config not found for this city",
      });
    }

    const oldValue = existingConfig.surgeConfig;

    //Update only surgeConfig
    const updatedConfig = await prisma.payoutConfig.update({
      where: { id: existingConfig.id },
      data: {
        surgeConfig,
        version: existingConfig.version + 1,
      },
    });

    //Response
    return res.status(200).json({
      success: true,
      message: "Surge config updated",
      data: {
        configId: updatedConfig.id,
        version: updatedConfig.version,
        updatedField: "surgeConfig",
        oldValue,
        newValue: updatedConfig.surgeConfig,
      },
    });

  } catch (error) {
    console.error("Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const rollbackPayoutConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      //  Find target config
      const target = await tx.payoutConfig.findUnique({
        where: { id }
      });

      if (!target) {
        throw new Error("NOT_FOUND");
      }

      // If already active → no rollback needed
      if (target.isActive) {
        throw new Error("ALREADY_ACTIVE");
      }

      // Deactivate current active configs for same city
      await tx.payoutConfig.updateMany({
        where: {
          cityId: target.cityId,
          isActive: true
        },
        data: { isActive: false }
      });

      //Activate this config
      const updated = await tx.payoutConfig.update({
        where: { id },
        data: { isActive: true }
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Rollback successful",
      data: {
        configId: result.id,
        version: result.version,
        isActive: result.isActive,
        rolledBackAt: new Date()
      },
      meta: {}
    });

  } catch (err) {
    console.error(err);

    if (err.message === "NOT_FOUND" || err.message === "ALREADY_ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Config not found or already active"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Rollback failed"
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
        message: "isActive must be boolean"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const config = await tx.payoutConfig.findUnique({
        where: { id }
      });

      if (!config) {
        throw new Error("NOT_FOUND");
      }

      // Prevent disabling last active config
      if (config.isActive && isActive === false) {
        const activeCount = await tx.payoutConfig.count({
          where: {
            AND: [
              { cityId: config.cityId },
              { isActive: true }
            ]
          }
        });

        if (activeCount <= 1) {
          throw new Error("ONLY_ACTIVE");
        }
      }

      // If activating → deactivate others
      if (isActive === true) {
        await tx.payoutConfig.updateMany({
          where: {
            AND: [
              { cityId: config.cityId },
              { isActive: true }
            ]
          },
          data: { isActive: false }
        });
      }

      // Update this config
      const updated = await tx.payoutConfig.update({
        where: { id },
        data: { isActive }
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Config status updated",
      data: {
        configId: result.id,
        isActive: result.isActive,
        updatedAt: result.updatedAt
      },
      meta: {}
    });

  } catch (err) {
    console.error("TOGGLE ERROR:", err);

    if (err.message === "ONLY_ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate the only active config"
      });
    }

    if (err.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Config not found"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update config status"
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
      !config.pincodeIds?.length ||
      config.pincodeIds.includes(pincode);

    //  surge status
    const isSurgeActive =
      surge.enabled === true &&
      isPincodeAllowed;

    return res.status(200).json({
      success: true,
      data: {
        isSurgeActive,
        scenarioType: config.scenarioType,
        multiplier: isSurgeActive
          ? surge.multiplier
          : 1,
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

module.exports = {
  createPayoutConfig,
  getActivePayoutConfig,
  getPayoutConfigHistory,
  updateBasePay,
  updateSurgeConfig,
  updateDistancePay,
  rollbackPayoutConfig,
  togglePayoutConfigStatus,
  getSurgeStatus
};