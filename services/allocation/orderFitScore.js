function getOrderFitScore(rider, order) {

  if (order.type === "HEAVY" && rider.vehicle !== "BIKE") {

    return 0;

  }
 
  return 1; // default fit

}
 
module.exports = { getOrderFitScore };

 