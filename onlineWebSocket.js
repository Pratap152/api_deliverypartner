const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
let wss;

const clients = {
  admins: new Set(),
  riders: new Map(),
};

function onlineWebSocket(server) {
  wss = new WebSocket.Server({
    server,
    path: "/ws/online",
  });

  console.log("✅ WebSocket initialized on /ws/online");

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("connection", async (ws, req) => {
    let riderId = null;

    console.log("\n========== NEW WS CONNECTION ==========");
    console.log("REQ URL:", req.url);

    ws.on("error", (err) => {
      console.error("❌ WS ERROR:", err);
    });

    ws.on("pong", () => {
      console.log("🏓 Pong received");
    });

    ws.on("close", (code, reason) => {
      console.log("\n========== WS CLOSED ==========");
      console.log("Rider ID:", riderId);
      console.log("Code:", code);
      console.log("Reason:", reason?.toString());

      if (riderId) {
        clients.riders.delete(String(riderId));
        console.log("Removed rider from active connections");
      }
    });

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      console.log("TOKEN RECEIVED:", !!token);

      if (!token) {
        ws.send(
          JSON.stringify({
            type: "AUTH_ERROR",
            message: "Token missing",
          })
        );

        ws.close();
        return;
      }

      console.log("RAW TOKEN:", jwt.decode(token));

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      console.log("VERIFIED TOKEN:", decoded);

      riderId =
        decoded.id ||
        decoded.riderId ||
        decoded.userId ||
        decoded?.rider?.id ||
        decoded?.user?.id;

      console.log("RIDER ID:", riderId);

      if (!riderId) {
        ws.send(
          JSON.stringify({
            type: "AUTH_ERROR",
            message: "Rider ID missing in token",
          })
        );

        ws.close();
        return;
      }

      const rider = await prisma.rider.findUnique({
        where: {
          id: riderId,
        },
        select: {
          id: true,
          isOnline: true,
          isPartnerActive: true,
        },
      });

      console.log("RIDER FOUND:", rider);

      if (!rider) {
        ws.send(
          JSON.stringify({
            type: "AUTH_ERROR",
            message: "Rider not found",
          })
        );

        ws.close();
        return;
      }

      clients.riders.set(String(riderId), ws);

      console.log("✅ Rider connected:", riderId);

      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          message: "Rider verified successfully",
          riderId,
        })
      );

      ws.on("message", async (data) => {
        try {
          console.log("\nWS MESSAGE:", data.toString());

          const msg = JSON.parse(data.toString());

          if (msg.type === "GO_ONLINE") {
            const updatedRider = await prisma.rider.update({
              where: {
                id: riderId,
              },
              data: {
                isOnline: true,
                isPartnerActive: true,
              },
              select: {
                id: true,
                isOnline: true,
                isPartnerActive: true,
              },
            });

            ws.send(
              JSON.stringify({
                type: "RIDER_ONLINE_SUCCESS",
                rider: updatedRider,
              })
            );

            sendToAdmins({
              type: "RIDER_ONLINE",
              rider: updatedRider,
            });

            console.log("🟢 Rider Online:", riderId);
          }

          else if (msg.type === "GO_OFFLINE") {
            const updatedRider = await prisma.rider.update({
              where: {
                id: riderId,
              },
              data: {
                isOnline: false,
                isPartnerActive: false,
              },
              select: {
                id: true,
                isOnline: true,
                isPartnerActive: true,
              },
            });

            ws.send(
              JSON.stringify({
                type: "RIDER_OFFLINE_SUCCESS",
                rider: updatedRider,
              })
            );

            sendToAdmins({
              type: "RIDER_OFFLINE",
              rider: updatedRider,
            });

            console.log("🔴 Rider Offline:", riderId);
          }
        } catch (err) {
          console.error("MESSAGE ERROR:", err);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: err.message,
              })
            );
          }
        }
      });
    } catch (error) {
      console.error("\n========== AUTH ERROR ==========");
      console.error(error);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "AUTH_ERROR",
            message: error.message,
          })
        );
      }

      ws.close();
    }
  });
}

function sendToAdmins(payload) {
  const message = JSON.stringify(payload);

  console.log("📤 Sending to admins:", payload.type);

  clients.admins.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function sendToRider(riderId, payload) {
  const ws = clients.riders.get(String(riderId));

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

module.exports = {
  onlineWebSocket,
  sendToAdmins,
  sendToRider,
};