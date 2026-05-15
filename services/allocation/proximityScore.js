const prisma = require("../../config/prisma");
const axios = require("axios");

const GOOGLE_API_KEY = process.env.GOOGLE_KEY;

// ----------------------------------------
// GOOGLE ETA
// ----------------------------------------
async function getETA(origin, destination) {
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: origin,
          destinations: destination,
          key: GOOGLE_API_KEY
        }
      }
    );

    const element = res.data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      return null;
    }

    return Math.ceil(element.duration.value / 60);
  } catch {
    return null;
  }
}


async function getProximityScores(riderIds, orderId) {
  try {
    if (!Array.isArray(riderIds) || riderIds.length === 0) {
      throw new Error("riderIds must be non-empty array");
    }

    // -------------------------------
    // 1. GET ORDER DATA ONCE
    // -------------------------------
    const [pickup, drop] = await Promise.all([
      prisma.orderPickupAddress.findFirst({ where: { orderId } }),
      prisma.orderDeliveryAddress.findFirst({ where: { orderId } })
    ]);

    

    if (!pickup || !drop) {
      throw new Error("Order address missing");
    }

    const pickupCoords = `${pickup.latitude},${pickup.longitude}`;
    const dropCoords = `${drop.latitude},${drop.longitude}`;
    console.log("this is pickup and drop :  " + pickupCoords , dropCoords);

    // -------------------------------
    // 2. GET RIDERS DATA
    // -------------------------------
    const riders = await prisma.RiderGps.findMany({
      where: {
        riderId: { in: riderIds }
      }
    });

    console.log( "riders : " , riders)

    // -------------------------------
    // 3. PROCESS EACH RIDER
    // -------------------------------
    const results = await Promise.all(
      riders.map(async (rider) => {
        try {
          if (!rider.latitude || !rider.longitude) {
            return {
              riderId: rider.riderId,
              score: 0,
              rejected: true,
              reason: "NO_LOCATION"
            };
          }

          const riderCoords = `${rider.latitude},${rider.longitude}`;

          const etaToVendor = await getETA(riderCoords, pickupCoords);

          console.log("etaToVendor : " , etaToVendor)

          if (!etaToVendor) {
            return {
              riderId: rider.riderId,
              score: 0,
              rejected: true,
              reason: "ETA_FAIL"
            };
          }

          const etaToCustomer = await getETA(pickupCoords, dropCoords);

          // -------------------------------
          // SCORE CALCULATION
          // -------------------------------
          const MAX_PICKUP_ETA = 30;
          const MAX_DROP_ETA = 15;

          let pickupScore = 1 - (etaToVendor / MAX_PICKUP_ETA);
          let dropScore = 1 - (etaToCustomer / MAX_DROP_ETA);

          pickupScore = Math.max(0, Math.min(1, pickupScore));
          dropScore = Math.max(0, Math.min(1, dropScore));

          const directionBonus = rider.isTowardsVendor ? 0.1 : 0;

          console.log("directionBonus : " , directionBonus)

          const score =
            (0.6 * pickupScore) +
            (0.3 * dropScore) +
            directionBonus;

          return {
            riderId: rider.riderId,
            score: Number(score.toFixed(4)),
            etaToVendor,
            etaToCustomer
          };

        } catch (err) {
          return {
            riderId: rider.riderId,
            score: 0,
            rejected: true,
            reason: "ERROR"
          };
        }
      })
    );

    // -------------------------------
    // 4. SORT BEST RIDER FIRST
    // -------------------------------
    results.sort((a, b) => b.score - a.score);

    return results;

  } catch (err) {
    console.error("Multi Proximity Error:", err);

    return [];
  }
}

module.exports = { getProximityScores };