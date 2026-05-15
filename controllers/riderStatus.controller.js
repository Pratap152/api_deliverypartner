const prisma = require("../config/prisma");

exports.goOnline = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.$transaction(
      async (tx) => {
        const riderData = await tx.rider.findUnique({
          where: { id: riderId },
          select: {
            id: true,
            isOnline: true,
            status: {
              select: {
                totalOnlineMinutesToday: true,
                onlineMinutesDate: true,
              },
            },
          },
        });

        if (!riderData) {
          throw new Error("Rider not found");
        }

        if (riderData.isOnline) {
          throw new Error("Rider already online");
        }

        let totalOnlineMinutesToday =
          riderData?.status?.totalOnlineMinutesToday || 0;

        const savedDate = riderData?.status?.onlineMinutesDate
          ? new Date(riderData.status.onlineMinutesDate)
          : null;

        if (!savedDate || savedDate.getTime() !== today.getTime()) {
          totalOnlineMinutesToday = 0;
        }

        const updatedRider = await tx.rider.update({
          where: { id: riderId },
          data: {
            isOnline: true,
            isPartnerActive: true,
          },
          select: {
            id: true,
            isOnline: true,
            isPartnerActive: true,
          },
        });

        const updatedStatus = await tx.riderStatus.upsert({
          where: { riderId },
          update: {
            isOnline: true,
            lastLoginAt: now,
            lastLogoutAt: null,
            totalOnlineMinutesToday,
            onlineMinutesDate: today,
          },
          create: {
            rider: {
              connect: { id: riderId },
            },
            isOnline: true,
            lastLoginAt: now,
            lastLogoutAt: null,
            totalOnlineMinutesToday: 0,
            onlineMinutesDate: today,
          },
        });

        const deliveryStatus = await tx.riderDeliveryStatus.upsert({
          where: { riderId },
          update: {
            isActive: true,
            inactiveReason: "MANUAL_OFF",
            updatedAt: now,
          },
          create: {
            rider: {
              connect: { id: riderId },
            },
            isActive: true,
            inactiveReason: "MANUAL_OFF",
            updatedAt: now,
          },
        });

        return {
          updatedRider,
          updatedStatus,
          deliveryStatus,
        };
      },
      {
        timeout: 15000,
        maxWait: 10000,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Rider is now ONLINE",
      rider: result.updatedRider,
      riderStatus: result.updatedStatus,
      deliveryStatus: result.deliveryStatus,
    });
  } catch (error) {
    console.error("GO ONLINE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

exports.goOffline = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { reason = "MANUAL_OFF" } = req.body || {};

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const allowedReasons = [
      "MANUAL_OFF",
      "KYC_PENDING",
      "ACCOUNT_SUSPENDED",
      "OUT_OF_SERVICE_AREA",
      "COD_LIMIT_EXCEEDED",
    ];

    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inactive reason",
      });
    }

    const riderData = await prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        isOnline: true,
        status: {
          select: {
            lastLoginAt: true,
            totalOnlineMinutesToday: true,
            onlineMinutesDate: true,
          },
        },
      },
    });

    if (!riderData) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    if (!riderData.isOnline) {
      return res.status(400).json({
        success: false,
        message: "Rider already offline",
      });
    }

    const logoutTime = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let existingMinutes = riderData.status?.totalOnlineMinutesToday || 0;

    const savedDate = riderData.status?.onlineMinutesDate
      ? new Date(riderData.status.onlineMinutesDate)
      : null;

    if (!savedDate || savedDate.getTime() !== today.getTime()) {
      existingMinutes = 0;
    }

    const loginTime = riderData.status?.lastLoginAt;

    let sessionMinutes = 0;


let reminderMessage = null;


if (loginTime) {

  const login = new Date(loginTime);

  const loginDay = new Date(login);
  loginDay.setHours(0, 0, 0, 0);

  // Rider forgot logout yesterday
  if (loginDay.getTime() !== today.getTime()) {

    existingMinutes = 0;

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const diffMs = logoutTime - midnight;

    sessionMinutes = Math.floor(diffMs / 60000);

    reminderMessage =
      "Previous day session expired. Today's online timing calculated from 12:00 AM only.";

  } else {

    const diffMs = logoutTime - login;

    sessionMinutes = Math.floor(diffMs / 60000);
  }
}
   const updatedTotalMinutes = existingMinutes + sessionMinutes;

    const result = await prisma.$transaction(
      async (tx) => {
        const updatedRider = await tx.rider.update({
          where: { id: riderId },
          data: {
            isOnline: false,
            isPartnerActive: false,
          },
          select: {
            id: true,
            isOnline: true,
            isPartnerActive: true,
          },
        });

        const updatedStatus = await tx.riderStatus.upsert({
          where: { riderId },
          update: {
            isOnline: false,
            lastLogoutAt: logoutTime,
            totalOnlineMinutesToday: updatedTotalMinutes,
            onlineMinutesDate: today,
          },
          create: {
            rider: {
              connect: { id: riderId },
            },
            isOnline: false,
            lastLoginAt: null,
            lastLogoutAt: logoutTime,
            totalOnlineMinutesToday: updatedTotalMinutes,
            onlineMinutesDate: today,
          },
        });

        const updatedDelivery = await tx.riderDeliveryStatus.upsert({
          where: { riderId },
          update: {
            isActive: false,
            inactiveReason: reason,
            updatedAt: logoutTime,
          },
          create: {
            rider: {
              connect: { id: riderId },
            },
            isActive: false,
            inactiveReason: reason,
            updatedAt: logoutTime,
          },
        });

        return {
          updatedRider,
          updatedStatus,
          updatedDelivery,
        };
      },
      {
        timeout: 15000,
        maxWait: 10000,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Rider is now OFFLINE",
      reminder: reminderMessage,
      rider: result.updatedRider,
      riderStatus: {
        isOnline: result.updatedStatus.isOnline,
        lastLoginAt: result.updatedStatus.lastLoginAt,
        lastLogoutAt: result.updatedStatus.lastLogoutAt,
        totalOnlineMinutesToday:
          result.updatedStatus.totalOnlineMinutesToday,
        onlineMinutesDate: result.updatedStatus.onlineMinutesDate,
      },
      deliveryStatus: {
        isActive: result.updatedDelivery.isActive,
        inactiveReason: result.updatedDelivery.inactiveReason,
      },
    });
  } catch (error) {
    console.error("GO OFFLINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};