import { Router } from "express";
import { getEvents, createEvent } from "../controllers/events.controller.js";
import { verifyToken } from "../utils/security.js";

const router = Router();

router.get("/", (req, res, next) => {
  // If admin is authenticated, return full events; otherwise return empty list safely
  let token = req.cookies?.token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.role === "admin") {
      req.admin = decoded;
      return getEvents(req, res);
    }
  }

  return res.json({ ok: true, data: [] });
});

router.post("/", createEvent);

export default router;
