const axios = require("axios");
 const GOOGLE_KEY = process.env.GOOGLE_KEY;
exports.getBestRoute = async function getRouteEstimate(req, res) {
  try {
    const { originLat, originLng, destLat, destLng } = req.body;
 
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        success: false,
        message: "Missing coordinates"
      });
    }
 
    const url = "https://maps.googleapis.com/maps/api/directions/json";
 
    const response = await axios.get(url, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        alternatives: true, 
        mode: "driving",
        key: GOOGLE_KEY
      }
    });
 
    const routes = response.data.routes.map((route, index) => {
      const leg = route.legs[0];
 
      return {
        routeIndex: index + 1,
        distance: {
          text: leg.distance.text,
          value: leg.distance.value 
        },
        duration: {
          text: leg.duration.text,
          value: leg.duration.value 
        },
        estimatedArrivalTime: new Date(
          Date.now() + leg.duration.value * 1000
        ),
        polyline: route.overview_polyline.points,
        summary: route.summary
      };
    });
 
    return res.json({
      success: true,
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      totalRoutes: routes.length,
      routes
    });
 
  } catch (err) {
    console.error("Google Maps error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch route estimate"
    });
  }
}