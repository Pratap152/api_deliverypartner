const dotenv = require("dotenv");
dotenv.config();
const cron = require("node-cron");
// const swaggerSetup = require("./config/swagger");


const http = require("http");

const app = require("./app");
const { initWebSocket } = require("./webSocket");
const {initWebSocketForCall}=require('./webcall')
// swaggerSetup(app);
//connectDB();

// ONE HTTP SERVER
const server = http.createServer(app);

// Attach WebSocket to SAME server
initWebSocket(server);
initWebSocketForCall(server)

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("PostgreSQL connected");
});
