const prisma = require("../config/prisma");

exports.getRiderZonePoints = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const rider = await prisma.rider.findUnique({
      where: {
        id: riderId
      },
      select: {
        location: {
          select: {
            pincode: true
          }
        }
      }
    });

    if (!rider || !rider.location?.pincode) {
      return res.status(404).json({
        success: false,
        message: "Rider pincode not found"
      });
    }

    const pincode = rider.location.pincode;

    // SAME LOGIC AS getZonePoints
    const zonePoints = await prisma.zonePoint.findMany({
      where: {
        isActive: true,
        pincode
      },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        zone: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: zonePoints.length,
      data: zonePoints
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};