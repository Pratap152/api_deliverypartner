const { getProximityScore } = require("./proximityScore");

const { getAvailabilityScore } = require("./availabilityScore");

const { getPerformanceScore } = require("./performanceScore");

const { getOrderFitScore } = require("./orderFitScore");

const { getExternalScore } = require("./externalScore");
 
function calculateTotalScore(rider, order, routeInfo) {

  const w1 = 0.4;

  const w2 = 0.2;

  const w3 = 0.2;

  const w4 = 0.1;

  const w5 = 0.1;
 
  return (

    w1 * getProximityScore(rider, order, routeInfo) +

    w2 * getAvailabilityScore(rider) +

    w3 * getPerformanceScore(rider) +

    w4 * getOrderFitScore(rider, order) +

    w5 * getExternalScore(rider)

  );

}
 
module.exports = { calculateTotalScore };

 