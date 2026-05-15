const prisma = require('../config/prisma');

const createCity = async (req, res) => {
  try {
    const { city } = req.body;

    if (!city || !city.name || !city.state) {
      return res.status(400).json({
        success: false,
        message: "City data is required"
      });
    }

    // Check city
    let existingCity = await prisma.city.findUnique({
      where: { name: city.name },
      include: {
        pincodes: {
          include: { areas: true }
        }
      }
    });

    // CREATE NEW CITY
    
    if (!existingCity) {
      const newCity = await prisma.city.create({
        data: {
          name: city.name,
          state: city.state,
          isActive: city.isActive ?? true,
          pincodes: {
            create: city.pincodes?.map(p => ({
              code: p.code,
              name: p.name,
              isActive: p.isActive ?? true,
              areas: {
                create: p.areas?.map(a => ({
                  name: a.name,
                  isActive: a.isActive ?? true
                }))
              }
            }))
          }
        },
        include: { pincodes: true }
      });

      return res.json({
        success: true,
        message: "City created successfully",
        data: {
          cityId: newCity.id,
          name: newCity.name,
          state: newCity.state,
          totalPincodes: newCity.pincodes.length,
          createdAt: newCity.createdAt
        }
      });
    }

    //  UPDATE EXISTING CITY


    let addedPincodes = 0;
    let addedAreas = 0;

    for (const p of city.pincodes || []) {

      //  Check existing pincode
      const existingPincode = existingCity.pincodes.find(
        ep => ep.code === p.code
      );

      if (!existingPincode) {
        //  Add new pincode
        await prisma.pincode.create({
          data: {
            code: p.code,
            name: p.name,
            isActive: p.isActive ?? true,
            cityId: existingCity.id,
            areas: {
              create: p.areas?.map(a => ({
                name: a.name,
                isActive: a.isActive ?? true
              }))
            }
          }
        });

        addedPincodes++;
      } else {
        // Pincode exists → check areas
        for (const a of p.areas || []) {

          const existingArea = existingPincode.areas.find(
            ea => ea.name === a.name
          );

          if (!existingArea) {
            await prisma.area.create({
              data: {
                name: a.name,
                isActive: a.isActive ?? true,
                pincodeId: existingPincode.id
              }
            });

            addedAreas++;
          } else {
            //  Duplicate area
            return res.status(400).json({
              success: false,
              message: `Area '${a.name}' already exists in pincode ${p.code}`
            });
          }
        }
      }
    }

    return res.json({
      success: true,
      message: "City updated successfully",
      data: {
        cityId: existingCity.id,
        addedPincodes,
        addedAreas
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


 const updatePincodeStatus = async (req, res) => {
  try {
    const { cityName, pincode, isActive } = req.body

    const pin = await prisma.pincode.findFirst({
      where: {
        code: pincode,
        city: {
          name: cityName
        }
      }
    })

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found"
      })
    }

    const updated = await prisma.pincode.update({
      where: { id: pin.id },
      data: { isActive }
    })

    return res.json({
      success: true,
      message: "Pincode status updated successfully",
      data: {
        pincode: updated.code,
        isActive: updated.isActive
      }
    })

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
}

 const updateAreaStatus = async (req, res) => {
  try {
    const { cityName, pincode, areaName, isActive } = req.body

    const area = await prisma.area.findFirst({
      where: {
        name: areaName,
        pincode: {
          code: pincode,
          city: {
            name: cityName
          }
        }
      }
    })

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found"
      })
    }

    const updated = await prisma.area.update({
      where: { id: area.id },
      data: { isActive }
    })

    return res.json({
      success: true,
      message: "Area status updated successfully",
      data: {
        areaName: updated.name,
        isActive: updated.isActive
      }
    })

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
}

 const getCityDetails = async (req, res) => {
  try {
    const { cityId } = req.params

    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: {
        pincodes: {
          include: {
            areas: true
          }
        }
      }
    })

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      })
    }

    return res.json({
      success: true,
      data: {
        cityId: city.id,
        name: city.name,
        state: city.state,
        isActive: city.isActive,
        pincodes: city.pincodes.map(p => ({
          code: p.code,
          name: p.name,
          isActive: p.isActive,
          areas: p.areas.map(a => ({
            name: a.name,
            isActive: a.isActive
          }))
        }))
      }
    })

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
}


module.exports = {
  createCity,
  updatePincodeStatus,
  updateAreaStatus,
  getCityDetails
}
