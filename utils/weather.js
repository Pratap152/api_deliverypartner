const axios = require("axios");

async function getWeather(lat, lng) {
  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon: lng,
          appid: process.env.WEATHER_API_KEY
        }
      }
    );

    const weatherMain = response.data.weather[0].main;

    return {
      isRaining: weatherMain === "Rain"
    };

  } catch (err) {
    console.error("Weather API error:", err.message);
    return { isRaining: false }; // fallback
  }
}

module.exports = getWeather;