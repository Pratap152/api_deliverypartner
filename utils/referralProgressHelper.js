// utils/referralProgressHelper.js


const calculatePercentage = (completed, target) => {
  if (!target || target <= 0) return 0;
  return Math.min(Math.round((completed / target) * 100), 100);
};

const removeEmptyValues = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeEmptyValues(item))
      .filter((item) => {
        if (item === null || item === undefined || item === "") return false;
        if (Array.isArray(item) && item.length === 0) return false;

        if (
          typeof item === "object" &&
          !(item instanceof Date) &&
          Object.keys(item).length === 0
        ) {
          return false;
        }

        return true;
      });
  }

  const cleaned = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return;
    }

    if (typeof value === "object" && !(value instanceof Date)) {
      const nested = removeEmptyValues(value);

      if (
        nested &&
        !(
          typeof nested === "object" &&
          !Array.isArray(nested) &&
          Object.keys(nested).length === 0
        )
      ) {
        cleaned[key] = nested;
      }

      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
};

const getReferralCurrentDayNumber = (referee) => {
  const start = new Date(referee.createdAt);
  const now = new Date();

  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays + 1;
};

const getDayRangeFromRefereeJoinedDate = (referee, dayNumber) => {
  const start = new Date(referee.createdAt);

  start.setDate(start.getDate() + Number(dayNumber || 1) - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getTaskStatus = ({ isCompleted, dayNumber, currentDayNumber }) => {
  if (isCompleted) return "COMPLETED";
  if (dayNumber < currentDayNumber) return "EXPIRED";
  if (dayNumber === currentDayNumber) return "RUNNING";
  return "LOCKED";
};

const getOrderStats = async ({ prisma, riderId, start, end }) => {
  const deliveredOrders = await prisma.order.findMany({
    where: {
      riderId,
      orderStatus: "DELIVERED",
      createdAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      OrderRiderEarning: true
    }
  });

  const completedOrders = deliveredOrders.length;

  const totalEarnings = deliveredOrders.reduce((sum, order) => {
    return sum + Number(order.OrderRiderEarning?.totalEarning || 0);
  }, 0);

  const totalAssignedOrders = await prisma.order.count({
    where: {
      riderId,
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });

  const acceptedOrders = await prisma.order.count({
    where: {
      riderId,
      createdAt: {
        gte: start,
        lte: end
      },
      orderStatus: {
        notIn: ["CANCELLED"]
      }
    }
  });

  const cancelledOrders = await prisma.order.count({
    where: {
      riderId,
      orderStatus: "CANCELLED",
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });

  const acceptanceRate =
    totalAssignedOrders > 0
      ? Number(((acceptedOrders / totalAssignedOrders) * 100).toFixed(2))
      : 0;

  const completionRate =
    acceptedOrders > 0
      ? Number(((completedOrders / acceptedOrders) * 100).toFixed(2))
      : 0;

  return {
    completedOrders,
    totalEarnings,
    totalAssignedOrders,
    acceptedOrders,
    cancelledOrders,
    acceptanceRate,
    completionRate
  };
};

module.exports = {
  calculatePercentage,
  removeEmptyValues,
  getReferralCurrentDayNumber,
  getDayRangeFromRefereeJoinedDate,
  getTaskStatus,
  getOrderStats
};