import { verifyToken } from "../utils/security.js";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "semsila.dev@gmail.com";

export function requireAdminAuth(req, res, next) {
  // 1. Try cookie first
  let token = req.cookies?.token;

  // 2. Try Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: "Authentication required. No session token provided.",
    });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "admin" || decoded.email !== ADMIN_EMAIL) {
    return res.status(401).json({
      ok: false,
      message: "Invalid or expired admin session token.",
    });
  }

  req.admin = decoded;
  next();
}
