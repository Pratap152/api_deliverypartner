const prisma = require("../../config/prisma");

// function getPerformanceScore({
//   averageRating = 0,
//   totalRatings = 0,
//   totalOrdersAssigned = 0,
//   totalOrdersAccepted = 0,
//   totalOrdersRejected = 0
// }) {
//   if (totalRatings === 0 && totalOrdersAssigned === 0) {
//     return {
//       performanceScore: 0.7,
//       reason: "New rider default score"
//     };
//   }

//   const acceptanceRate =
//     totalOrdersAssigned > 0
//       ? (totalOrdersAccepted / totalOrdersAssigned) * 100
//       : 0;

//   const reliabilityFactor = acceptanceRate / 100;

//   const ratingNormalized =
//     totalRatings === 0 && totalOrdersAccepted > 0
//       ? 0.85
//       : averageRating / 5;

//   const extraRejections = Math.max(totalOrdersRejected - 3, 0);
//   const rejectionPenalty = extraRejections * 0.05;

//   let performanceScore =
//     0.6 * ratingNormalized +
//     0.4 * reliabilityFactor -
//     rejectionPenalty;

//   performanceScore = Math.max(0, Math.min(1, performanceScore));

//   return {
//     performanceScore: Number(performanceScore.toFixed(2)),
//     acceptanceRate: Number(acceptanceRate.toFixed(2)),
//     rejectionPenalty: Number(rejectionPenalty.toFixed(2)),
//     reason: getScenarioReason(performanceScore)
//   };
// }
function getPerformanceScore(rider) {
  const latestPerformance = rider.performance?.[0];

  const totalRatings = rider.ratings?.length || 0;

  const averageRating =
    totalRatings > 0
      ? rider.ratings.reduce(
          (sum, item) => sum + item.rating,
          0
        ) / totalRatings
      : 0;

  const totalOrdersAssigned =
    latestPerformance?.totalOrdersAssigned || 0;

  const totalOrdersAccepted =
    latestPerformance?.totalOrdersAccepted || 0;

  const totalOrdersRejected =
    latestPerformance?.totalOrdersRejected || 0;

  if (
    totalRatings === 0 &&
    totalOrdersAssigned === 0
  ) {
    return {
      performanceScore: 0.7,
      reason: "New rider default score"
    };
  }

  const acceptanceRate =
    totalOrdersAssigned > 0
      ? (totalOrdersAccepted /
          totalOrdersAssigned) *
        100
      : 0;

  const reliabilityFactor =
    acceptanceRate / 100;

  const ratingNormalized =
    totalRatings === 0 &&
    totalOrdersAccepted > 0
      ? 0.85
      : averageRating / 5;

  const extraRejections = Math.max(
    totalOrdersRejected - 3,
    0
  );

  const rejectionPenalty =
    extraRejections * 0.05;

  let performanceScore =
    0.6 * ratingNormalized +
    0.4 * reliabilityFactor -
    rejectionPenalty;

  performanceScore = Math.max(
    0,
    Math.min(1, performanceScore)
  );

  return {
    performanceScore: Number(
      performanceScore.toFixed(2)
    ),
    acceptanceRate: Number(
      acceptanceRate.toFixed(2)
    ),
    rejectionPenalty: Number(
      rejectionPenalty.toFixed(2)
    ),
    averageRating: Number(
      averageRating.toFixed(2)
    ),
    totalRatings,
    totalOrdersAssigned,
    totalOrdersAccepted,
    totalOrdersRejected,
    reason: getScenarioReason(
      performanceScore
    )
  };
}
function getScenarioReason(score) {
  if (score >= 0.9) return "Excellent rider";
  if (score >= 0.6) return "Average / Good rider";
  if (score < 0.5) return "Poor rider";
  return "Below average rider";
}

async function getPopupRidersWithScore() {
  try {
    const riders = await prisma.rider.findMany({
      where: {
        status: {
          isOnline: true
        }
      },
      include: {
        status: true,
        ratings: true,
        performance: {
          where: {
            totalOrdersAssigned: {
              gt: 0
            }
          },
          orderBy: {
            periodEnd: "desc"
          },
          take: 1
        }
      }
    });

    const popupRiders = riders.map((rider) => {
      const latestPerformance = rider.performance[0];

      const totalRatings = rider.ratings.length;

      const averageRating =
        totalRatings > 0
          ? rider.ratings.reduce((sum, item) => sum + item.rating, 0) /
            totalRatings
          : 0;

      const totalOrdersAssigned =
        latestPerformance?.totalOrdersAssigned || 0;

      const totalOrdersAccepted =
        latestPerformance?.totalOrdersAccepted || 0;

      const totalOrdersRejected =
        latestPerformance?.totalOrdersRejected || 0;

      const result = getPerformanceScore({
        averageRating,
        totalRatings,
        totalOrdersAssigned,
        totalOrdersAccepted,
        totalOrdersRejected
      });

      return {
        riderId: rider.id,
        phoneNumber: rider.phoneNumber,
        averageRating: Number(averageRating.toFixed(2)),
        totalRatings,
        totalOrdersAssigned,
        totalOrdersAccepted,
        totalOrdersRejected,
        performanceScore: result.performanceScore,
        acceptanceRate: result.acceptanceRate || 0,
        rejectionPenalty: result.rejectionPenalty || 0,
        availabilityScore: rider.status?.availabilityScore || 0,
        tripsToday: rider.status?.tripsToday || 0,
        reason: result.reason
      };
    });

    popupRiders.sort((a, b) => {
      if (b.performanceScore !== a.performanceScore) {
        return b.performanceScore - a.performanceScore;
      }

      if (b.availabilityScore !== a.availabilityScore) {
        return b.availabilityScore - a.availabilityScore;
      }

      return a.tripsToday - b.tripsToday;
    });

    console.log("========== ONLINE POPUP RIDERS ==========");

    popupRiders.forEach((rider, index) => {
      console.log(`
Rank ${index + 1}
Rider ID: ${rider.riderId}
Phone: ${rider.phoneNumber}
Average Rating: ${rider.averageRating}
Total Ratings: ${rider.totalRatings}
Assigned: ${rider.totalOrdersAssigned}
Accepted: ${rider.totalOrdersAccepted}
Rejected: ${rider.totalOrdersRejected}
Acceptance Rate: ${rider.acceptanceRate}%
Penalty: ${rider.rejectionPenalty}
Performance Score: ${rider.performanceScore}
Availability Score: ${rider.availabilityScore}
Trips Today: ${rider.tripsToday}
Reason: ${rider.reason}
-----------------------------------
`);
    });

    console.log("FIRST POPUP GOES TO:", popupRiders[0]);

  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

getPopupRidersWithScore();
module.exports = {
  getPerformanceScore,
  getPopupRidersWithScore
};