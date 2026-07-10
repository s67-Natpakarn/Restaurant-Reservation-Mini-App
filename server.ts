import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Reservation {
  id: string;
  guests: number;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  specialRequest: string;
  createdAt: string;
  status: "pending" | "confirmed";
}

// In-memory data store for reservations
const reservations: Reservation[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // CORS Middleware
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // REST API: GET all reservations (helpful for debug & displaying booking list)
  app.get("/api/reservations", (req, res) => {
    res.json({
      success: true,
      reservations: reservations.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    });
  });

  // REST API: POST a new reservation
  app.post("/api/reservations", (req, res) => {
    try {
      const { guests, date, time, customerName, customerPhone, specialRequest = "" } = req.body;

      // Validation
      if (!guests || typeof guests !== "number" || guests < 1 || guests > 10) {
        return res.status(400).json({
          success: false,
          error: "Invalid guests count. Must be between 1 and 10."
        });
      }

      if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format. Expected YYYY-MM-DD."
        });
      }

      if (!time || typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({
          success: false,
          error: "Invalid time format. Expected HH:mm."
        });
      }

      if (!customerName || typeof customerName !== "string" || customerName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Customer name is required."
        });
      }

      if (!customerPhone || typeof customerPhone !== "string" || customerPhone.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Customer phone is required."
        });
      }

      // Generate server-side unique ID and createdAt timestamp
      const uniqueId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const createdAt = new Date().toISOString();

      const newReservation: Reservation = {
        id: uniqueId,
        guests,
        date,
        time,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        specialRequest: (specialRequest || "").trim(),
        createdAt,
        status: "pending",
      };

      reservations.push(newReservation);

      // Check if LINE credentials and LIFF Access Token are available
      const liffAccessToken = req.headers["x-liff-access-token"] as string | undefined;
      const channelId = process.env.LINE_CHANNEL_ID || process.env.CHANNEL_ID;
      const channelSecret = process.env.LINE_CHANNEL_SECRET || process.env.CHANNEL_SECRET;

      if (liffAccessToken && channelId && channelSecret) {
        // Trigger LINE Service Message asynchronously so it doesn't block the user's booking response
        (async () => {
          try {
            console.log("Initiating LINE Service Message flow...");
            // Step A: Issue Stateless Channel Access Token
            const tokenParams = new URLSearchParams();
            tokenParams.append("grant_type", "client_credentials");
            tokenParams.append("client_id", channelId);
            tokenParams.append("client_secret", channelSecret);

            const tokenRes = await fetch("https://api.line.me/oauth2/v3/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: tokenParams.toString(),
            });

            if (!tokenRes.ok) {
              const errText = await tokenRes.text();
              throw new Error(`Failed to get stateless channel access token: ${errText}`);
            }

            const tokenData = (await tokenRes.json()) as { access_token: string };
            const statelessAccessToken = tokenData.access_token;

            // Step B: Issue Service Notification Token
            const notifierRes = await fetch("https://api.line.me/message/v3/notifier/token", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${statelessAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                liffAccessToken,
              }),
            });

            if (!notifierRes.ok) {
              const errText = await notifierRes.text();
              throw new Error(`Failed to get notification token: ${errText}`);
            }

            const notifierData = (await notifierRes.json()) as { notificationToken: string };
            const notificationToken = notifierData.notificationToken;

            // Step C: Send the Service Message
            const liffId = process.env.VITE_LIFF_ID || "2010663880-QqBFRfDu";
            const liffUrl = `https://miniapp.line.me/${liffId}`;

            const sendRes = await fetch("https://api.line.me/message/v3/notifier/send?target=service", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${statelessAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                templateName: "book_request_s_b_th",
                params: {
                  number: uniqueId,
                  btn1_url: liffUrl,
                  btn2_url: liffUrl,
                  btn3_url: liffUrl,
                  btn4_url: liffUrl,
                },
                notificationToken,
              }),
            });

            if (!sendRes.ok) {
              const errText = await sendRes.text();
              throw new Error(`Failed to send service message: ${errText}`);
            }

            console.log(`LINE Service Message sent successfully for reservation: ${uniqueId}`);
          } catch (lineErr: any) {
            console.error("Error in LINE Service Message flow:", lineErr.message || lineErr);
          }
        })();
      } else {
        console.log("Skipping LINE Service Message flow. Missing header or channel credentials.");
      }

      return res.status(201).json({
        success: true,
        reservation: newReservation
      });
    } catch (err) {
      console.error("Error creating reservation:", err);
      return res.status(500).json({
        success: false,
        error: "An unexpected error occurred on the server."
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", time: new Date().toISOString() });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[The Green Table Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
