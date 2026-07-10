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
