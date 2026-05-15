const prisma = require("../config/prisma");

exports.getCities = async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      select: {
        name: true,
      }
    });
    const cityNames = cities.map((item) => item.name);
    res.json({
         success: true,
         cities: cityNames,
    });
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getAreas = async (req, res) => {
  try {
    const { city } = req.query;
    if (!city)
      return res.status(400).json({
        success: false,
        message: "City is required",
      });

    // 🔹 find city from DB
    const foundCity = await prisma.city.findFirst({
      where:
       {
         name: {
          equals: city,
          mode: "insensitive"
         } 
       },
      include: {
        pincodes: {
          include: {
            areas: true,
          },
        },
      },
    });

    if (!foundCity)
      return res.status(404).json({
        success: false,
        message: "City not found",
      });

    const pincodes = foundCity.pincodes.map((p) => ({
      code: p.code,
      name: p.name,
      areas: p.areas.map((a) => a.name),
    }));

    res.json({
      success: true,
      city: foundCity.name,
      pincodes: pincodes,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};