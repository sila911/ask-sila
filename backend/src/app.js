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
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://asksila.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

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
