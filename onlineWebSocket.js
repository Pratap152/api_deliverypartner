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

  console.log("✅ onlineWebSocket function called");
 
  wss = new WebSocket.Server({

    server,

    path: "/ws/online",

  });
 
  console.log("✅ WebSocket initialized on /ws/online");
 
  wss.on("connection", async (ws, req) => {

    let riderId = null;
 
    try {

      console.log("========== ONLINE SOCKET HIT ==========");

      console.log("REQ URL:", req.url);

      console.log("HOST:", req.headers.host);

      console.log(

        "JWT_ACCESS_SECRET EXISTS:",

        !!process.env.JWT_ACCESS_SECRET

      );
 
      const query = req.url.split("?")[1];
 
      if (!query) {

        console.log("❌ Query params missing");

        ws.close(4001, "Query params required");

        return;

      }
 
      const params = new URLSearchParams(query);

      const token = params.get("token");
 
      console.log("TOKEN RECEIVED:", token ? "YES" : "NO");
 
      if (!token) {

        console.log("❌ Token missing");

        ws.close(4002, "JWT token required");

        return;

      }
 
      let decoded;
 
      try {

        decoded = jwt.verify(

          token,

          process.env.JWT_ACCESS_SECRET

        );
 
        console.log("✅ VERIFIED TOKEN:", decoded);

      } catch (err) {

        console.log("❌ JWT ERROR:", err.message);
 
        ws.close(4010, "Invalid or expired token");

        return;

      }
 
      if (decoded.type !== "access") {

        console.log("❌ Not access token:", decoded.type);

        ws.close(4012, "Access token required");

        return;

      }
 
      riderId = decoded.riderId;
 
      console.log("RIDER ID:", riderId);
 
      if (!riderId) {

        console.log("❌ riderId missing in token");

        ws.close(4011, "riderId missing in token");

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

          isFullyRegistered: true,

          orderState: true,

        },

      });
 
      console.log("RIDER FOUND:", rider);
 
      if (!rider) {

        console.log("❌ Rider not found");

        ws.close(4040, "Rider not found");

        return;

      }
 
      clients.riders.set(String(riderId), ws);
 
      ws.riderId = riderId;

      ws.socketType = "RIDER_ONLINE_STATUS";
 
      console.log("✅ Rider online-status WS connected:", riderId);
 
      ws.send(

        JSON.stringify({

          type: "CONNECTED",

          socketType: "RIDER_ONLINE_STATUS",

          message: "Rider verified successfully",

          riderId,

          isOnline: rider.isOnline,

          isPartnerActive: rider.isPartnerActive,

        })

      );
 
      ws.on("message", async (data) => {

        try {

          console.log("📩 ONLINE WS RAW:", data.toString());
 
          let msg;
 
          try {

            msg = JSON.parse(data.toString());

          } catch {

            console.log("❌ Invalid JSON");

            ws.send(

              JSON.stringify({

                type: "ERROR",

                message: "Invalid JSON",

              })

            );

            return;

          }
 
          console.log("📩 ONLINE WS PARSED:", msg);
 
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
 
            console.log("✅ RIDER UPDATED ONLINE:", updatedRider);
 
            const payload = {

              type: "RIDER_ONLINE_SUCCESS",

              message: "Rider is now online",

              rider: updatedRider,

            };
 
            ws.send(JSON.stringify(payload));
 
            sendToAdmins({

              type: "RIDER_ONLINE",

              rider: updatedRider,

            });
 
            return;

          }
 
          if (msg.type === "GO_OFFLINE") {

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
 
            console.log("✅ RIDER UPDATED OFFLINE:", updatedRider);
 
            const payload = {

              type: "RIDER_OFFLINE_SUCCESS",

              message: "Rider is now offline",

              rider: updatedRider,

            };
 
            ws.send(JSON.stringify(payload));
 
            sendToAdmins({

              type: "RIDER_OFFLINE",

              rider: updatedRider,

            });
 
            return;

          }
 
          console.log("❌ Unknown message type:", msg.type);
 
          ws.send(

            JSON.stringify({

              type: "ERROR",

              message: "Unknown message type",

            })

          );

        } catch (err) {

          console.log("❌ ONLINE WS MESSAGE ERROR:", err.message);

          console.log("STACK:", err.stack);
 
          ws.send(

            JSON.stringify({

              type: "ERROR",

              message: err.message,

            })

          );

        }

      });
 
      ws.on("close", (code, reason) => {

        clients.riders.delete(String(riderId));
 
        console.log("❌ Rider online-status WS disconnected:", riderId);

        console.log("❌ Close Code:", code);

        console.log("❌ Close Reason:", reason?.toString());

      });
 
      ws.on("error", (err) => {

        console.log("❌ Online WS socket error:", err.message);

      });

    } catch (error) {

      console.log("========== ONLINE WS ERROR ==========");

      console.log("MESSAGE:", error.message);

      console.log("STACK:", error.stack);
 
      try {

        ws.close(4000, error.message);

      } catch {}

    }

  });

}
 
function sendToAdmins(payload) {

  const message = JSON.stringify(payload);
 
  console.log("📡 SENDING TO ADMINS:", message);

  console.log("👥 TOTAL ADMINS:", clients.admins.size);
 
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

  } else {

    console.log("❌ Rider socket not available:", riderId);

  }

}
 
module.exports = {

  onlineWebSocket,

  sendToAdmins,

  sendToRider,

};
 