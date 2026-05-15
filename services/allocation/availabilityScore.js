function getAvailabilityScore(rider) {

  if (!rider.isOnline) return 0;
 
  const maxOrders = 3;
 
  return 1 - (rider.currentOrders / maxOrders);

}
 
module.exports = { getAvailabilityScore };

 