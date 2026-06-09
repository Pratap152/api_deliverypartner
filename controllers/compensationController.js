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
 
    const config = 
      await prisma.employeeCompensationConfig.update({ 
        where: { id }, 
        data: req.body 
      }); 
 
    return res.status(200).json({ 
      success: true, 
      message: "Compensation config updated successfully", 
      data: config 
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
      cityTier,
      cityId,
      pincodeIds,
      riderType,
      monthlySalary
    } = req.body;

    if (!monthlySalary || monthlySalary <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly salary is required"
      });
    }

    const compensationConfig =
      await prisma.employeeCompensationConfig.findFirst({
        where: {
          riderType,
          compensationType: "SALARY",

          ...(cityTier && { cityTier }),
          ...(cityId && { cityId }),
          ...(pincodeIds?.length && {
            pincodeIds: {
              hasSome: pincodeIds
            }
          })
        }
      });

    if (!compensationConfig) {
      return res.status(404).json({
        success: false,
        message: "Compensation config not found"
      });
    }

    const salaryConfig = await prisma.salaryConfig.upsert({
      where: {
        configId: compensationConfig.id
      },
      update: {
        monthlySalary
      },
      create: {
        configId: compensationConfig.id,
        monthlySalary
      }
    });

    return res.status(200).json({
      success: true,
      message: "Salary config saved successfully",
      data: {
        configId: compensationConfig.id,
        monthlySalary: salaryConfig.monthlySalary
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};