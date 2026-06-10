const prisma = require("../config/prisma");

exports.createCompensationConfig = async (req, res) => {
  try {
    const {
      name,
      cityId,
      cityTier,
      pincodeIds,
      riderType,
      compensationType
    } = req.body;

    // Required validations
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!riderType) {
      return res.status(400).json({
        success: false,
        message: "Rider type is required"
      });
    }

    if (!compensationType) {
      return res.status(400).json({
        success: false,
        message: "Compensation type is required"
      });
    }

    // Only one location scope allowed
    const locationCount = [
      cityTier,
      cityId,
      pincodeIds?.length ? true : false
    ].filter(Boolean).length;

    if (locationCount !== 1) {
      return res.status(400).json({
        success: false,
        message:
          "Provide exactly one of cityTier, cityId or pincodeIds"
      });
    }

    // Duplicate validation
    const existingConfig =
      await prisma.employeeCompensationConfig.findFirst({
        where: {
          riderType,
          compensationType,

          ...(cityTier && { cityTier }),
          ...(cityId && { cityId }),
          ...(pincodeIds?.length && {
            pincodeIds: {
              hasSome: pincodeIds
            }
          })
        }
      });

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message:
          "Compensation configuration already exists"
      });
    }

const config = await prisma.employeeCompensationConfig.create({
  data: {
    name,
    cityId: cityId || null,
    cityTier: cityTier || null,
    pincodeIds: pincodeIds || [],
    riderType,
    compensationType
  }
});

let responseData = {
  id: config.id,
  name: config.name,
  riderType: config.riderType,
  compensationType: config.compensationType
};

// Tier Based
if (cityTier) {
  const cities = await prisma.city.findMany({
    where: {
      tier: cityTier
    },
    select: {
      id: true
    }
  });

  responseData = {
    ...responseData,
    tier: cityTier,
    cityIds: cities.map(city => city.id)
  };
}

// City Based
if (cityId) {
  const pincodes = await prisma.pincode.findMany({
    where: {
      cityId
    },
    select: {
      code: true
    }
  });

  responseData = {
    ...responseData,
    cityId,
    pincodeIds: pincodes.map(pin => pin.code)
  };
}

// Pincode Based
if (pincodeIds?.length) {
  responseData = {
    ...responseData,
    pincodeIds
  };
}

return res.status(201).json({
  success: true,
  message: "Compensation config created successfully",
  data: responseData
});}
 catch (error) {
    console.error("Create Compensation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
exports.getCompensationConfigs = async (req, res) => { 
  try { 
 
    const { 
      cityTier, 
      cityId, 
      riderType, 
      isActive 
    } = req.query; 
 
    const where = {}; 
 
    if (cityTier) where.cityTier = cityTier; 
    if (cityId) where.cityId = cityId; 
    if (riderType) where.riderType = riderType; 
 
    if (isActive !== undefined) { 
      where.isActive = isActive === "true"; 
    } 
 
    const configs = 
      await prisma.employeeCompensationConfig.findMany({ 
        where, 
        orderBy: { 
          createdAt: "desc" 
        } 
      }); 
 
    return res.status(200).json({ 
      success: true, 
      count: configs.length, 
      data: configs 
    }); 
 
  } catch (error) { 
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    }); 
  } 
}; 
exports.getCompensationConfigById = async (req, res) => { 
  try { 
 
    const { id } = req.params; 
 
    const config = 
      await prisma.employeeCompensationConfig.findUnique({ 
        where: { id } 
      }); 
 
    if (!config) { 
      return res.status(404).json({ 
        success: false, 
        message: "Compensation config not found" 
      }); 
    } 
 
    return res.status(200).json({ 
      success: true, 
      data: config 
    }); 
 
  } catch (error) { 
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    }); 
  } 
}; 
exports.updateCompensationConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const existingConfig =
      await prisma.employeeCompensationConfig.findUnique({
        where: { id }
      });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Compensation configuration not found"
      });
    }

    const {
      name,
      cityTier,
      cityId,
      pincodeIds,
      riderType,
      compensationType,
      monthlySalary,
      perOrderAmount,
      targetOrders,
      trackingType,
      isActive
    } = req.body;

    // Final values after update
    const finalCompensationType =
      compensationType || existingConfig.compensationType;

    const finalMonthlySalary =
      monthlySalary !== undefined
        ? monthlySalary
        : existingConfig.monthlySalary;

    const finalPerOrderAmount =
      perOrderAmount !== undefined
        ? perOrderAmount
        : existingConfig.perOrderAmount;

    const finalTargetOrders =
      targetOrders !== undefined
        ? targetOrders
        : existingConfig.targetOrders;

    const finalTrackingType =
      trackingType !== undefined
        ? trackingType
        : existingConfig.trackingType;

    // Compensation validation
    switch (finalCompensationType) {
      case "SALARY":
        if (!finalMonthlySalary || finalMonthlySalary <= 0) {
          return res.status(400).json({
            success: false,
            message: "monthlySalary is required for SALARY"
          });
        }
        break;

      case "PER_ORDER":
        if (!finalPerOrderAmount || finalPerOrderAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "perOrderAmount is required for PER_ORDER"
          });
        }
        break;

      case "HYBRID":
        if (!finalMonthlySalary || finalMonthlySalary <= 0) {
          return res.status(400).json({
            success: false,
            message: "monthlySalary is required for HYBRID"
          });
        }

        if (!finalPerOrderAmount || finalPerOrderAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "perOrderAmount is required for HYBRID"
          });
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid compensation type"
        });
    }

    // Target Orders Validation
    if (
      finalTargetOrders !== null &&
      finalTargetOrders !== undefined
    ) {
      if (finalTargetOrders <= 0) {
        return res.status(400).json({
          success: false,
          message: "targetOrders must be greater than 0"
        });
      }
    }

    // trackingType Validation (Optional)
    if (finalTrackingType) {
      const validTrackingTypes = [
        "DAILY",
        "WEEKLY",
        "MONTHLY"
      ];

      if (!validTrackingTypes.includes(finalTrackingType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trackingType"
        });
      }
    }

    // Run duplicate check only if location/config fields changed
    const locationFieldsChanged =
      cityId !== undefined ||
      cityTier !== undefined ||
      pincodeIds !== undefined ||
      riderType !== undefined ||
      compensationType !== undefined;

    if (locationFieldsChanged) {
      const finalCityId =
        cityId !== undefined
          ? cityId
          : existingConfig.cityId;

      const finalCityTier =
        cityTier !== undefined
          ? cityTier
          : existingConfig.cityTier;

      const finalPincodeIds =
        pincodeIds !== undefined
          ? pincodeIds
          : existingConfig.pincodeIds;

      const finalRiderType =
        riderType !== undefined
          ? riderType
          : existingConfig.riderType;

      const duplicateConfig =
        await prisma.employeeCompensationConfig.findFirst({
          where: {
            id: {
              not: id
            },

            riderType: finalRiderType,
            compensationType: finalCompensationType,

            ...(finalCityId && {
              cityId: finalCityId
            }),

            ...(finalCityTier &&
              !finalCityId && {
                cityTier: finalCityTier
              }),

            ...(finalPincodeIds?.length && {
              pincodeIds: {
                hasSome: finalPincodeIds
              }
            })
          }
        });

      if (duplicateConfig) {
        return res.status(409).json({
          success: false,
          message:
            "Compensation configuration already exists"
        });
      }
    }

    const updatedConfig =
      await prisma.employeeCompensationConfig.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(cityTier !== undefined && { cityTier }),
          ...(cityId !== undefined && { cityId }),
          ...(pincodeIds !== undefined && { pincodeIds }),
          ...(riderType !== undefined && { riderType }),
          ...(compensationType !== undefined && {
            compensationType
          }),
          ...(monthlySalary !== undefined && {
            monthlySalary
          }),
          ...(perOrderAmount !== undefined && {
            perOrderAmount
          }),
          ...(targetOrders !== undefined && {
            targetOrders
          }),
          ...(trackingType !== undefined && {
            trackingType
          }),
          ...(isActive !== undefined && {
            isActive
          })
        }
      });

    return res.status(200).json({
      success: true,
      message:
        "Compensation configuration updated successfully",
      data: updatedConfig
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
exports.updateCompensationStatus = async (req, res) => { 
  try { 
 
    const { id } = req.params; 
    const { isActive } = req.body; 
 
    const config = 
      await prisma.employeeCompensationConfig.update({ 
        where: { id }, 
        data: { 
          isActive 
        } 
      }); 
 
    return res.status(200).json({ 
      success: true, 
      message: "Status updated successfully", 
      data: config 
    }); 
 
  } catch (error) { 
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    }); 
  } 
}; 
exports.deleteCompensationConfig = async (req, res) => { 
  try { 
 
    const { id } = req.params; 
 
    await prisma.employeeCompensationConfig.delete({ 
      where: { id } 
    }); 
 
    return res.status(200).json({ 
      success: true, 
      message: "Compensation config deleted successfully" 
    }); 
 
  } catch (error) { 
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    }); 
  } 
}; 
exports.createSalaryConfig = async (req, res) => {
  try {
    const {
      name,
      cityTier,
      cityId,
      pincodeIds = [],
      riderType,
      compensationType,
      monthlySalary,
      perOrderAmount,
      targetOrders,
      trackingType
    } = req.body;

    // Basic validations
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!riderType) {
      return res.status(400).json({
        success: false,
        message: "Rider type is required"
      });
    }

    if (!compensationType) {
      return res.status(400).json({
        success: false,
        message: "Compensation type is required"
      });
    }

    if (!cityTier && !cityId) {
      return res.status(400).json({
        success: false,
        message: "Either cityTier or cityId is required"
      });
    }

    // Compensation validations
    switch (compensationType) {
      case "SALARY":
        if (!monthlySalary || monthlySalary <= 0) {
          return res.status(400).json({
            success: false,
            message: "monthlySalary is required for SALARY"
          });
        }
        break;

      case "PER_ORDER":
        if (!perOrderAmount || perOrderAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "perOrderAmount is required for PER_ORDER"
          });
        }
        break;

      case "HYBRID":
        if (!monthlySalary || monthlySalary <= 0) {
          return res.status(400).json({
            success: false,
            message: "monthlySalary is required for HYBRID"
          });
        }

        if (!perOrderAmount || perOrderAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "perOrderAmount is required for HYBRID"
          });
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid compensation type"
        });
    }

    // Target validations
    if (targetOrders) {
      if (targetOrders <= 0) {
        return res.status(400).json({
          success: false,
          message: "targetOrders must be greater than 0"
        });
      }

      if (!trackingType) {
        return res.status(400).json({
          success: false,
          message: "trackingType is required when targetOrders is provided"
        });
      }

      const validFrequencies = ["DAILY", "WEEKLY", "MONTHLY"];

      if (!validFrequencies.includes(trackingType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trackingType"
        });
      }
    }

    // Duplicate check
    const existingConfig =
      await prisma.employeeCompensationConfig.findFirst({
        where: {
          riderType,
          compensationType,

          ...(cityId && { cityId }),

          ...(cityTier && !cityId && {
            cityTier
          }),

          ...(pincodeIds.length > 0 && {
            pincodeIds: {
              hasSome: pincodeIds
            }
          })
        }
      });

    if (existingConfig) {
      return res.status(409).json({
        success: false,
        message: "Compensation configuration already exists"
      });
    }

    const config =
      await prisma.employeeCompensationConfig.create({
        data: {
          name,
          cityTier,
          cityId,
          pincodeIds,
          riderType,
          compensationType,
          monthlySalary,
          perOrderAmount,
          targetOrders,
          trackingType,
          isActive: true
        }
      });

    return res.status(201).json({
      success: true,
      message: "Compensation configuration created successfully",
      data: config
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};