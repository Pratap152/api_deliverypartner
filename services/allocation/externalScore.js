function getExternalScore(rider) {

  let score = 1;
 
  if (rider.isRainingZone) score -= 0.2;

  if (rider.trafficLevel === "HIGH") score -= 0.2;
 
  return Math.max(0, score);

}
 
module.exports = { getExternalScore };

 