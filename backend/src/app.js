import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import questionRoutes from "./routes/questions.routes.js";
import commentRoutes from "./routes/comments.routes.js";
import designRoutes from "./routes/designs.routes.js";
import eventRoutes from "./routes/events.routes.js";
import telegramRoutes from "./routes/telegram.routes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();

// Security Headers
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow server-to-server, curl, mobile apps, or local health checks
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, "");

    // 2. Allow explicitly configured CLIENT_URL(s) (supports comma-separated list and trims trailing slashes)
    const configuredOrigins = (process.env.CLIENT_URL || "")
      .split(",")
      .map((url) => url.trim().replace(/\/+$/, ""))
      .filter(Boolean);

    if (configuredOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // 3. Allow Vercel deployments (production domain & branch previews)
    if (cleanOrigin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // 4. Allow local development ports
    if (process.env.NODE_ENV !== "production") {
      if (
        cleanOrigin.startsWith("http://localhost:") ||
        cleanOrigin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body Parsing & Cookies
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Global API Rate Limiter
app.use("/api", apiLimiter);

// Health Check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Ask Sila Anything API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/telegram", telegramRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server unhandled error:", err);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal server error",
  });
});

export default app;
