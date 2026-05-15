const prisma = require("../config/prisma");
exports.getRiderOnlineStatus = async (req, res) => {

  try {

    const riderId = req.rider.id;
 
    const rider = await prisma.rider.findUnique({

      where: { id: riderId },

      include: {

        status: true,

      },

    });
 
    if (!rider) {

      return res.status(404).json({

        success: false,

        message: "Rider not found",

      });

    }
 
    return res.status(200).json({

      success: true,

      message: "Rider online status fetched successfully",

      data: {

        isOnline: rider.isOnline,

        totalOnlineMinutesToday:

          rider.status?.totalOnlineMinutesToday ,

      },

    });

  } catch (error) {

    console.error("Get rider online status error:", error);
 
    return res.status(500).json({

      success: false,

      message: "Something went wrong",

    });

  }

};
  
 